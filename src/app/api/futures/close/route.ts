import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { creditBalance, debitBalance } from '@/lib/ledger'
import { getGmxSdk, USDC_ADDRESS, FUTURES_FEE_BPS } from '@/lib/gmx'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { positionId } = await req.json()
        if (!positionId) return NextResponse.json({ error: 'positionId required' }, { status: 400 })

        const adminClient = createSupabaseAdminClient()
        const ARBITRUM_CHAIN_ID = 42161
        const usdcAddress = USDC_ADDRESS.toLowerCase()


        const { data: pos, error: posErr } = await adminClient
            .from('futures_positions')
            .select('*')
            .eq('id', positionId)
            .eq('user_id', user.id)
            .eq('status', 'open')
            .single()

        if (posErr || !pos) {
            return NextResponse.json({ error: 'Position not found or already closed' }, { status: 404 })
        }


        const sdk = await getGmxSdk()
        const tickers = await sdk.oracle.getTickers()
        const symbol = pos.pair.split('/')[0]
        const ticker = Object.values(tickers).find((t: any) => t.tokenSymbol === symbol) as any

        const markPrice = ticker
            ? (Number((BigInt(ticker.minPrice) + BigInt(ticker.maxPrice)) / BigInt(2)) / 1e30)
            : pos.entry_price


        const priceDiff = pos.side === 'long'
            ? markPrice - pos.entry_price
            : pos.entry_price - markPrice
        const pnl = (priceDiff / pos.entry_price) * pos.size_usd
        const returnUsd = pos.collateral_usd + pnl

        const closeFee = parseFloat(((pos.size_usd * FUTURES_FEE_BPS) / 10_000).toFixed(6))
        const netReturn = Math.max(returnUsd - closeFee, 0)

        if (netReturn > 0) {
            await creditBalance({
                userId: user.id,
                chainId: ARBITRUM_CHAIN_ID,
                tokenSymbol: 'USDC',
                tokenAddress: usdcAddress,
                amount: netReturn.toFixed(6),
                type: 'trade_sell',
                refId: positionId,
                note: `Futures close ${pos.side} ${pos.pair} — PnL: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}, fee: $${closeFee.toFixed(2)}`,
            })
        } else if (returnUsd > 0 && closeFee >= returnUsd) {
            await debitBalance({
                userId: user.id,
                chainId: ARBITRUM_CHAIN_ID,
                tokenSymbol: 'USDC',
                tokenAddress: usdcAddress,
                amount: (closeFee - returnUsd).toFixed(6),
                type: 'fee',
                note: `Futures close fee (exceeds return): ${pos.pair}`,
            }).catch(() => { })
        }

        await adminClient
            .from('futures_positions')
            .update({
                status: 'closed',
                mark_price: markPrice,
                realised_pnl: pnl,
                closed_at: new Date().toISOString(),
            })
            .eq('id', positionId)

        return NextResponse.json({
            success: true,
            markPrice,
            pnl: parseFloat(pnl.toFixed(2)),
            feeUsd: closeFee,
            returnUsd: parseFloat(netReturn.toFixed(2)),
        })
    } catch (err: any) {
        console.error('[POST /api/futures/close]', err)
        return NextResponse.json({ error: err.message ?? 'Failed to close position' }, { status: 500 })
    }
}
