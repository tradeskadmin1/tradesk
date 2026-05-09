import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getQuote } from '@/lib/dex'
import { isSupportedChain, type SupportedChainId } from '@/config/chains'
import { TOKENS } from '@/config/tokens'
import { getPair } from '@/config/pairs'


export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const chainIdParam = searchParams.get('chainId')
        const pairId = searchParams.get('pairId')
        const side = searchParams.get('side')
        const amount = searchParams.get('amount')

        if (!chainIdParam || !pairId || !side || !amount) {
            return NextResponse.json(
                { error: 'chainId, pairId, side and amount are required' },
                { status: 400 },
            )
        }

        const chainId = parseInt(chainIdParam, 10) as SupportedChainId
        if (!isSupportedChain(chainId)) {
            return NextResponse.json({ error: `Unsupported chain: ${chainId}` }, { status: 400 })
        }

        if (side !== 'buy' && side !== 'sell') {
            return NextResponse.json({ error: 'side must be buy or sell' }, { status: 400 })
        }

        const pair = getPair(pairId)
        if (!pair) {
            return NextResponse.json({ error: `Unknown pair: ${pairId}` }, { status: 400 })
        }

        if (!pair.supportedChains.includes(chainId)) {
            return NextResponse.json(
                { error: `${pairId} is not available on chain ${chainId}` },
                { status: 400 },
            )
        }

        if (!TOKENS[pair.base]?.addresses[chainId] || !TOKENS[pair.quote]?.addresses[chainId]) {
            return NextResponse.json(
                { error: 'One or more tokens not available on this chain' },
                { status: 400 },
            )
        }

        const adminClient = createSupabaseAdminClient() as any
        const { data: wallet } = await adminClient
            .from('custodial_wallets')
            .select('address')
            .eq('user_id', user.id)
            .eq('chain_id', chainId)
            .single()

        if (!wallet) {
            return NextResponse.json(
                { error: 'No wallet found for this chain — complete onboarding first' },
                { status: 404 },
            )
        }

        const sellToken = side === 'buy' ? pair.quote : pair.base
        const buyToken = side === 'buy' ? pair.base : pair.quote

        const quote = await getQuote({
            chainId,
            sellToken,
            buyToken,
            sellAmount: amount,
            takerAddress: wallet.address as `0x${string}`,
            slippageBps: Math.round(pair.defaultSlippage * 10000),
        })

        return NextResponse.json({
            pairId,
            side,
            chainId,
            ...quote,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to get quote'
        console.error('[GET /api/trade/quote]', err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
