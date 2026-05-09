import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { executeTrade } from '@/lib/dex'
import { isSupportedChain, type SupportedChainId } from '@/config/chains'
import { TOKENS } from '@/config/tokens'
import { getPair } from '@/config/pairs'


export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { chainId: chainIdRaw, pairId, side, amount, slippageBps } = body

        const chainId = parseInt(chainIdRaw, 10) as SupportedChainId
        if (!isSupportedChain(chainId)) {
            return NextResponse.json({ error: `Unsupported chain: ${chainIdRaw}` }, { status: 400 })
        }

        if (side !== 'buy' && side !== 'sell') {
            return NextResponse.json({ error: 'side must be buy or sell' }, { status: 400 })
        }

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
        }

        const pair = getPair(pairId)
        if (!pair || !pair.active) {
            return NextResponse.json({ error: `Unknown or inactive pair: ${pairId}` }, { status: 400 })
        }

        if (!pair.supportedChains.includes(chainId)) {
            return NextResponse.json(
                { error: `${pairId} not available on chain ${chainId}` },
                { status: 400 },
            )
        }

        if (parseFloat(amount) < pair.minTradeSize) {
            return NextResponse.json(
                { error: `Minimum trade size is ${pair.minTradeSize} ${pair.quote}` },
                { status: 400 },
            )
        }

        const sellToken = side === 'buy' ? pair.quote : pair.base
        const buyToken = side === 'buy' ? pair.base : pair.quote

        const adminClient = createSupabaseAdminClient() as any

        const { data: order, error: orderError } = await adminClient
            .from('orders')
            .insert({
                user_id: user.id,
                chain_id: chainId,
                pair: pairId,
                base_token: pair.base,
                quote_token: pair.quote,
                side,
                order_type: 'market',
                amount,
                status: 'pending',
                slippage_tolerance: slippageBps ? slippageBps / 10000 : pair.defaultSlippage,
            })
            .select('id')
            .single()

        if (orderError || !order) {
            return NextResponse.json({ error: 'Failed to create order record' }, { status: 500 })
        }

        let result
        try {
            result = await executeTrade({
                userId: user.id,
                chainId,
                sellToken,
                buyToken,
                sellAmount: amount,
                slippageBps: slippageBps ?? Math.round(pair.defaultSlippage * 10000),
            })
        } catch (err) {
            await adminClient
                .from('orders')
                .update({ status: 'failed', updated_at: new Date().toISOString() })
                .eq('id', order.id)

            throw err
        }

        await adminClient
            .from('orders')
            .update({
                status: 'filled',
                filled_amount: result.sellAmount,
                tx_hash: result.txHash,
                dex_used: result.dexUsed,
                gas_used: result.gasUsed,
                updated_at: new Date().toISOString(),
            })
            .eq('id', order.id)

        return NextResponse.json({
            success: true,
            orderId: order.id,
            txHash: result.txHash,
            sellToken,
            buyToken,
            sellAmount: result.sellAmount,
            buyAmount: result.buyAmount,
            price: result.price,
            dexUsed: result.dexUsed,
            gasUsed: result.gasUsed,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Trade execution failed'
        console.error('[POST /api/trade/execute]', err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
