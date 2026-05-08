import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { syncWalletBalances } from '@/lib/balance'
import { isSupportedChain, type SupportedChainId } from '@/config/chains'

export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const refresh = searchParams.get('refresh') === 'true'

        const adminClient = createSupabaseAdminClient() as any


        const { data: wallets, error: walletsError } = await adminClient
            .from('custodial_wallets')
            .select('id, chain_id, address')
            .eq('user_id', user.id)

        if (walletsError || !wallets?.length) {
            return NextResponse.json({ balances: [] })
        }

        if (refresh) {
            await Promise.allSettled(
                wallets.map((w: { id: string; chain_id: number; address: string }) => {
                    if (!isSupportedChain(w.chain_id)) return Promise.resolve()
                    return syncWalletBalances(
                        w.id,
                        w.address as `0x${string}`,
                        w.chain_id as SupportedChainId,
                    )
                }),
            )
        }

        const { data: balances, error: balancesError } = await adminClient
            .from('wallet_balances')
            .select(`
        id,
        token_symbol,
        token_address,
        chain_id,
        balance,
        updated_at,
        wallet_id
      `)
            .in('wallet_id', wallets.map((w: { id: string }) => w.id))
            .gt('balance', '0')
            .order('chain_id')
            .order('token_symbol')

        if (balancesError) {
            throw new Error(balancesError.message)
        }

        const grouped: Record<number, typeof balances> = {}
        for (const b of balances ?? []) {
            if (!grouped[b.chain_id]) grouped[b.chain_id] = []
            grouped[b.chain_id].push(b)
        }

        return NextResponse.json({
            balances: balances ?? [],
            byChain: grouped,
            wallets: wallets.map((w: { id: string; chain_id: number; address: string }) => ({
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