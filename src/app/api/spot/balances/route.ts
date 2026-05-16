import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { SPOT_CHAIN_ID, SPOT_TOKEN_ADDRESSES } from '@/config/spot'

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const db = createSupabaseAdminClient() as any
        const allAddresses = Object.values(SPOT_TOKEN_ADDRESSES).map((a) => a.toLowerCase())

        const { data, error } = await db
            .from('ledger_balances')
            .select('token_symbol, token_address, balance')
            .eq('user_id', user.id)
            .eq('chain_id', SPOT_CHAIN_ID)
            .in('token_address', allAddresses)

        if (error) {
            console.error('[spot/balances]', error)
            return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 })
        }

        const balances: Record<string, string> = {}

        for (const sym of Object.keys(SPOT_TOKEN_ADDRESSES)) {
            balances[sym] = '0'
        }

        for (const row of data ?? []) {
            const sym = Object.entries(SPOT_TOKEN_ADDRESSES).find(
                ([, addr]) => addr.toLowerCase() === row.token_address.toLowerCase(),
            )?.[0]
            if (sym) balances[sym] = String(row.balance)
        }

        return NextResponse.json({ balances })
    } catch (err) {
        console.error('[spot/balances]', err)
        return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 })
    }
}
