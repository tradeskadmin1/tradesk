import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { createWalletsForUser } from '@/lib/wallet'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rl = checkRateLimit(`wallets:create:${user.id}`, LIMITS.STRICT)
        if (!rl.success) return rlResponse(rl.resetAt)

        let fullName: string | undefined
        let email: string | undefined
        try {
            const body = await req.json()
            fullName = body.fullName
            email = body.email
        } catch {
        }

        const adminClient = createSupabaseAdminClient()
        const { error: rpcErr } = await adminClient.rpc('mark_user_onboarded', {
            p_user_id: user.id,
            p_email: email ?? user.email ?? null,
            p_full_name: fullName ?? null,
        })

        if (rpcErr) {
            console.error('[POST /api/wallets/create] mark_user_onboarded RPC failed:', rpcErr)
        } else {
            console.log('[POST /api/wallets/create] User marked as onboarded:', user.id)
        }

        let wallets: { chainId: number; address: string }[] = []
        try {
            const created = await createWalletsForUser(user.id)
            wallets = created.map((w) => ({ chainId: w.chainId, address: w.address }))
        } catch (walletErr) {
            console.error('[POST /api/wallets/create] Wallet creation error:', walletErr)
        }

        return NextResponse.json({ success: true, wallets })
    } catch (err) {
        console.error('[POST /api/wallets/create]', err)
        return NextResponse.json(
            { error: 'Failed to create wallets' },
            { status: 500 },
        )
    }
}