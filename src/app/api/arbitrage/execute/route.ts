import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'
import { recordPlatformRevenue } from '@/lib/ledger'

// Platform takes 15 % of the net arbitrage profit as a service fee
const PLATFORM_FEE_PCT = 0.15

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()


const FUNDING_TOKENS = [
    {
        symbol: 'USDC', addresses: {
            1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
            42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        }
    },
    {
        symbol: 'USDT', addresses: {
            1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            56: '0x55d398326f99059fF775485246999027B3197955',
            42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        }
    },
]

const CHAIN_PRIORITY = [1, 42161, 56] as const

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = checkRateLimit(`arbitrage:execute:${user.id}`, LIMITS.STRICT)
        if (!rl.success) return rlResponse(rl.resetAt)

        const body = await req.json().catch(() => ({}))
        const { opportunityId, tradeAmountUsd } = body

        if (!opportunityId || typeof opportunityId !== 'string')
            return NextResponse.json({ error: 'opportunityId is required' }, { status: 400 })

        const amount = parseFloat(tradeAmountUsd)
        if (!isFinite(amount) || amount < 10)
            return NextResponse.json({ error: 'Minimum trade amount is $10' }, { status: 400 })
        if (amount > 50_000)
            return NextResponse.json({ error: 'Maximum trade amount is $50,000' }, { status: 400 })

        const db = createSupabaseAdminClient()

        const { data: opp, error: oppErr } = await db
            .from('arbitrage_opportunities')
            .select('*')
            .eq('id', opportunityId)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (oppErr || !opp)
            return NextResponse.json({ error: 'Opportunity expired or not found' }, { status: 404 })
        const profitPct = parseFloat(opp.profit_pct)
        const gasUsd = parseFloat(opp.estimated_gas_usd)
        if (profitPct > 0.05)
            return NextResponse.json(
                { error: 'Opportunity data appears invalid — spread too high' },
                { status: 400 },
            )

        const grossProfit = amount * profitPct
        const preFeeProfitUsd = grossProfit - gasUsd   // profit after gas, before platform fee

        if (preFeeProfitUsd <= 0)
            return NextResponse.json(
                { error: 'Trade amount too small to cover gas costs' },
                { status: 400 },
            )

        const platformFeeUsd = preFeeProfitUsd * PLATFORM_FEE_PCT
        const netProfit = preFeeProfitUsd - platformFeeUsd

        const { data: balances } = await db
            .from('ledger_balances')
            .select('chain_id, token_symbol, token_address, balance')
            .eq('user_id', user.id)
            .gte('balance', amount.toString())

        const available: { chainId: number; tokenSymbol: string; tokenAddress: string }[] = []

        for (const chainId of CHAIN_PRIORITY) {
            for (const ft of FUNDING_TOKENS) {
                const addr = (ft.addresses as Record<number, string>)[chainId]
                if (!addr) continue
                const row = (balances ?? []).find(
                    (b: any) =>
                        b.chain_id === chainId &&
                        b.token_address.toLowerCase() === addr.toLowerCase() &&
                        parseFloat(b.balance) >= amount,
                )
                if (row) {
                    available.push({ chainId, tokenSymbol: ft.symbol, tokenAddress: addr })
                }
            }
        }

        if (available.length === 0)
            return NextResponse.json(
                { error: `Insufficient balance. You need at least $${amount.toFixed(2)} in USDC or USDT.` },
                { status: 400 },
            )

        const { chainId: fundChainId, tokenSymbol: fundSymbol, tokenAddress: fundAddress } = available[0]

        const { error: debitErr } = await db.rpc('debit_balance', {
            p_user_id: user.id,
            p_chain_id: fundChainId,
            p_token_symbol: fundSymbol,
            p_token_address: fundAddress,
            p_amount: amount.toFixed(6),
            p_type: 'trade_buy',
            p_ref_id: opportunityId,
            p_note: `Arb: ${opp.pair} ${opp.buy_dex}→${opp.sell_dex}`,
        })

        if (debitErr)
            return NextResponse.json({ error: 'Failed to debit balance' }, { status: 500 })

        const returnAmount = amount + netProfit
        await db.rpc('credit_balance', {
            p_user_id: user.id,
            p_chain_id: fundChainId,
            p_token_symbol: fundSymbol,
            p_token_address: fundAddress,
            p_amount: returnAmount.toFixed(6),
            p_type: 'trade_sell',
            p_ref_id: opportunityId,
            p_note: `Arb profit: ${opp.pair} +$${netProfit.toFixed(2)} (platform fee $${platformFeeUsd.toFixed(2)})`,
        })

        // Record platform revenue
        await recordPlatformRevenue({
            source: 'arbitrage',
            userId: user.id,
            refId: opportunityId,
            amount: platformFeeUsd,
            tokenSymbol: fundSymbol,
            chainId: fundChainId,
            note: `Arb fee (15%): ${opp.pair} ${opp.buy_dex}→${opp.sell_dex}`,
        })

        await db.from('arbitrage_trades').insert({
            user_id: user.id,
            opportunity_id: opportunityId,
            pair: opp.pair,
            buy_dex: opp.buy_dex,
            sell_dex: opp.sell_dex,
            buy_chain_id: opp.buy_chain_id,
            sell_chain_id: opp.sell_chain_id,
            buy_price: opp.buy_price,
            sell_price: opp.sell_price,
            trade_amount_usd: amount.toFixed(2),
            gross_profit_usd: grossProfit.toFixed(2),
            gas_cost_usd: gasUsd.toFixed(2),
            platform_fee_usd: platformFeeUsd.toFixed(2),
            net_profit_usd: netProfit.toFixed(2),
            status: 'completed',
        })

        return NextResponse.json({
            success: true,
            pair: opp.pair,
            tradeAmountUsd: amount,
            grossProfitUsd: parseFloat(grossProfit.toFixed(2)),
            gasCostUsd: parseFloat(gasUsd.toFixed(2)),
            platformFeeUsd: parseFloat(platformFeeUsd.toFixed(2)),
            netProfitUsd: parseFloat(netProfit.toFixed(2)),
            fundedWith: `${fundSymbol} on chain ${fundChainId}`,
        })
    } catch (err) {
        console.error('[POST /api/arbitrage/execute]', err)
        return NextResponse.json({ error: 'Execution failed' }, { status: 500 })
    }
}
