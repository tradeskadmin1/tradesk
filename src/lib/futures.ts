/**
 * Shared futures position utilities.
 * Used by: manual close route, SL/TP monitor, liquidation engine.
 */

import { createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { creditBalance, debitBalance } from '@/lib/ledger'
import { getGmxSdk, USDC_ADDRESS, FUTURES_FEE_BPS } from '@/lib/gmx'

const adminClient = (): any => _createSupabaseAdminClient()

const ARBITRUM_CHAIN_ID = 42161
const USDC_ADDR = USDC_ADDRESS.toLowerCase()

// ─── Liquidation maths ────────────────────────────────────────────────────────
/** Fraction of collateral that must remain as maintenance margin (10 %). */
export const MAINTENANCE_MARGIN_RATE = 0.10

/**
 * Price at which a position will be liquidated.
 *   long:  entry * (1 − (1 − MM) / leverage)
 *   short: entry * (1 + (1 − MM) / leverage)
 */
export function calcLiquidationPrice(
    side:          'long' | 'short',
    entryPrice:    number,
    leverage:      number,
): number {
    const factor = (1 - MAINTENANCE_MARGIN_RATE) / leverage
    return side === 'long'
        ? entryPrice * (1 - factor)
        : entryPrice * (1 + factor)
}

/**
 * Returns true when the mark price has crossed the liquidation threshold.
 */
export function isLiquidated(
    side:             'long' | 'short',
    markPrice:        number,
    liquidationPrice: number,
): boolean {
    return side === 'long'
        ? markPrice <= liquidationPrice
        : markPrice >= liquidationPrice
}

// ─── Close / Liquidate ────────────────────────────────────────────────────────
export interface CloseResult {
    markPrice:  number
    pnl:        number
    feeUsd:     number
    returnUsd:  number
    reason:     'closed' | 'liquidated'
}

/**
 * Closes (or liquidates) an open futures position.
 *
 * @param positionId       UUID of the position
 * @param userId           Owner's Supabase UID
 * @param overrideMarkPrice  Pass the live price to skip an extra oracle call
 * @param reason           'closed' for manual / SL / TP; 'liquidated' for forced closes
 */
export async function closePosition(
    positionId:        string,
    userId:            string,
    overrideMarkPrice?: number,
    reason:            'closed' | 'liquidated' = 'closed',
): Promise<CloseResult> {
    const db = adminClient()

    const { data: pos, error } = await db
        .from('futures_positions')
        .select('*')
        .eq('id', positionId)
        .eq('user_id', userId)
        .eq('status', 'open')
        .single()

    if (error || !pos) throw new Error('Position not found or already closed')

    // ── Resolve mark price ─────────────────────────────────────────────────────
    let markPrice = overrideMarkPrice ?? 0
    if (!markPrice) {
        const sdk = await getGmxSdk()
        const tickers = await sdk.oracle.getTickers()
        const symbol  = pos.pair.split('/')[0]
        const ticker  = Object.values(tickers).find((t: any) => t.tokenSymbol === symbol) as any
        markPrice = ticker
            ? (Number((BigInt(ticker.minPrice) + BigInt(ticker.maxPrice)) / BigInt(2)) / 1e30)
            : pos.entry_price
    }

    // ── PnL ────────────────────────────────────────────────────────────────────
    const priceDiff = pos.side === 'long'
        ? markPrice - pos.entry_price
        : pos.entry_price - markPrice
    const pnl       = (priceDiff / pos.entry_price) * pos.size_usd
    const returnUsd = pos.collateral_usd + pnl
    const closeFee  = parseFloat(((pos.size_usd * FUTURES_FEE_BPS) / 10_000).toFixed(6))
    const netReturn = Math.max(returnUsd - closeFee, 0)

    // ── Ledger update ──────────────────────────────────────────────────────────
    if (reason === 'liquidated') {
        // Collateral is seized. The tiny maintenance margin reserve (if any) goes
        // to the platform insurance fund — we just don't credit it back.
        // No further ledger entry needed; collateral was already debited at open.
        console.info(
            `[liquidation] position ${positionId} liquidated at $${markPrice.toFixed(2)}` +
            ` | pnl: ${pnl.toFixed(2)} | collateral forfeited: ${pos.collateral_usd}`,
        )
    } else if (netReturn > 0) {
        await creditBalance({
            userId,
            chainId:      ARBITRUM_CHAIN_ID,
            tokenSymbol:  'USDC',
            tokenAddress: USDC_ADDR,
            amount:       netReturn.toFixed(6),
            type:         'trade_sell',
            refId:        positionId,
            note:         `Futures close ${pos.side} ${pos.pair} — PnL: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}, fee: $${closeFee.toFixed(2)}`,
        })
    } else if (returnUsd > 0 && closeFee >= returnUsd) {
        await debitBalance({
            userId,
            chainId:      ARBITRUM_CHAIN_ID,
            tokenSymbol:  'USDC',
            tokenAddress: USDC_ADDR,
            amount:       (closeFee - returnUsd).toFixed(6),
            type:         'fee',
            note:         `Futures close fee (exceeds return): ${pos.pair}`,
        }).catch(() => { })
    }

    // ── DB update ──────────────────────────────────────────────────────────────
    await db
        .from('futures_positions')
        .update({
            status:       reason,
            mark_price:   markPrice,
            realised_pnl: reason === 'liquidated' ? -pos.collateral_usd : pnl,
            closed_at:    new Date().toISOString(),
        })
        .eq('id', positionId)

    // Cancel any pending SL/TP orders
    await db
        .from('futures_orders')
        .update({ status: 'cancelled' })
        .eq('position_id', positionId)
        .eq('status', 'pending')

    return {
        markPrice,
        pnl:       reason === 'liquidated' ? -pos.collateral_usd : parseFloat(pnl.toFixed(2)),
        feeUsd:    closeFee,
        returnUsd: reason === 'liquidated' ? 0 : parseFloat(netReturn.toFixed(2)),
        reason,
    }
}
