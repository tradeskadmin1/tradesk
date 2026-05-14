import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getUserBalances } from '@/lib/ledger'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'


export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rl = await checkRateLimit(`balances:${user.id}`, LIMITS.MODERATE)
        if (!rl.success) return rlResponse(rl.resetAt)

        const adminClient = createSupabaseAdminClient() as any

        const { data: wallets, error: walletsError } = await adminClient
            .from('custodial_wallets')
            .select('id, chain_id, address')
            .eq('user_id', user.id)

        if (walletsError) {
            throw new Error(walletsError.message)
        }

        const ledgerBalances = await getUserBalances(user.id)

        const balances = ledgerBalances.map((lb) => ({
            token_symbol: lb.tokenSymbol,
            token_address: lb.tokenAddress,
            chain_id: lb.chainId,
            balance: lb.balance,
            updated_at: new Date().toISOString(),
            wallet_id: wallets?.find(
                (w: { chain_id: number }) => w.chain_id === lb.chainId,
            )?.id ?? null,
        }))

        const byChain: Record<number, typeof balances> = {}
        for (const b of balances) {
            if (!byChain[b.chain_id]) byChain[b.chain_id] = []
            byChain[b.chain_id].push(b)
        }

        return NextResponse.json({
            balances,
            byChain,
            wallets: (wallets ?? []).map((w: { id: string; chain_id: number; address: string }) => ({
                walletId: w.id,
                chainId: w.chain_id,
                address: w.address,
            })),
        })
    } catch (err) {
        console.error('[GET /api/balances]', err)
        return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 })
    }
}
