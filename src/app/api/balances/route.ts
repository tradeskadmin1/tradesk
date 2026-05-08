import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getUserBalances } from '@/lib/ledger'

/**
 * GET /api/balances
 *
 * Returns the user's balances from the ledger (source of truth).
 * No on-chain RPC calls — instant read from ledger_balances table.
 *
 * ?refresh=true is accepted but is now a no-op; balances are always
 * current because deposits credit the ledger via webhook and withdrawals
 * debit it atomically.
 */
export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = createSupabaseAdminClient() as any

        // Still need wallet addresses for the UI (deposit page, etc.)
        const { data: wallets, error: walletsError } = await adminClient
            .from('custodial_wallets')
            .select('id, chain_id, address')
            .eq('user_id', user.id)

        if (walletsError) {
            throw new Error(walletsError.message)
        }

        // Read balances from the ledger — no RPC, always consistent
        const ledgerBalances = await getUserBalances(user.id)

        // Shape to match the existing response format the UI expects
        const balances = ledgerBalances.map((lb) => ({
            token_symbol:  lb.tokenSymbol,
            token_address: lb.tokenAddress,
            chain_id:      lb.chainId,
            balance:       lb.balance,
            updated_at:    new Date().toISOString(),
            // wallet_id isn't in ledger_balances — look it up from the wallets list
            wallet_id: wallets?.find(
                (w: { chain_id: number }) => w.chain_id === lb.chainId,
            )?.id ?? null,
        }))

        // Group by chain for convenience
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
                chainId:  w.chain_id,
                address:  w.address,
            })),
        })
    } catch (err) {
        console.error('[GET /api/balances]', err)
        return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 })
    }
}
