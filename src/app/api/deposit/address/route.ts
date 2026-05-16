import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserWalletAddress } from '@/lib/wallet'
import { isSupportedChain } from '@/config/chains'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'
import { getOrCreateBtcWallet, getOrCreateTrxWallet } from '@/lib/wallet-btc-trx'


export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rl = await checkRateLimit(`deposit:address:${user.id}`, LIMITS.MODERATE)
        if (!rl.success) return rlResponse(rl.resetAt)

        const { searchParams } = new URL(req.url)
        const chain = searchParams.get('chain')        // 'btc' | 'trx'
        const chainIdParam = searchParams.get('chainId') // EVM numeric ID

        // ── BTC ──────────────────────────────────────────────────────────────
        if (chain === 'btc') {
            const address = await getOrCreateBtcWallet(user.id)
            return NextResponse.json({ chain: 'btc', address })
        }

        // ── TRX ──────────────────────────────────────────────────────────────
        if (chain === 'trx') {
            const address = await getOrCreateTrxWallet(user.id)
            return NextResponse.json({ chain: 'trx', address })
        }

        // ── EVM chains ───────────────────────────────────────────────────────
        if (!chainIdParam) {
            return NextResponse.json({ error: 'chainId or chain is required' }, { status: 400 })
        }

        const chainId = parseInt(chainIdParam, 10)

        if (!isSupportedChain(chainId)) {
            return NextResponse.json({ error: `Unsupported chain: ${chainId}` }, { status: 400 })
        }

        const address = await getUserWalletAddress(user.id, chainId)

        if (!address) {
            return NextResponse.json(
                { error: 'Wallet not found — complete onboarding first' },
                { status: 404 },
            )
        }

        return NextResponse.json({ chainId, address })
    } catch (err) {
        console.error('[GET /api/deposit/address]', err)
        return NextResponse.json({ error: 'Failed to get deposit address' }, { status: 500 })
    }
}