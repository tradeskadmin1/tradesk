import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createWalletsForUser } from '@/lib/wallet'


export async function POST() {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const wallets = await createWalletsForUser(user.id)

        return NextResponse.json({
            success: true,
            wallets: wallets.map((w) => ({
                chainId: w.chainId,
                address: w.address,
            })),
        })
    } catch (err) {
        console.error('[POST /api/wallets/create]', err)
        return NextResponse.json(
            { error: 'Failed to create wallets' },
            { status: 500 },
        )
    }
}