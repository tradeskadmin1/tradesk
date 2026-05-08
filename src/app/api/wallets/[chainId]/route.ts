import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserWallets, getUserWalletAddress } from '@/lib/wallet'
import { isSupportedChain } from '@/config/chains'


export async function GET(
    _req: Request,
    { params }: { params: Promise<{ chainId: string }> },
) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { chainId: chainIdParam } = await params
        const chainId = parseInt(chainIdParam, 10)

        if (!isSupportedChain(chainId)) {
            return NextResponse.json(
                { error: `Unsupported chain: ${chainIdParam}` },
                { status: 400 },
            )
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
        console.error('[GET /api/wallets/[chainId]]', err)
        return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 })
    }
}