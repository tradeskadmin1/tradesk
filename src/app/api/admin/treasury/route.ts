import { NextResponse } from 'next/server'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'

const db = (): any => _createSupabaseAdminClient()
const TREASURY_ID = process.env.PLATFORM_TREASURY_USER_ID!

export async function GET(req: Request) {
    if (!await isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = db()

    // Current treasury ledger balances
    const { data: balances } = await supabase
        .from('ledger_balances')
        .select('chain_id, token_symbol, token_address, balance')
        .eq('user_id', TREASURY_ID)
        .gt('balance', 0)
        .order('chain_id')

    // Total earned per source (all time)
    const { data: bySource } = await supabase
        .from('platform_revenue')
        .select('source, amount')

    const sourceTotals: Record<string, number> = {}
    for (const row of bySource ?? []) {
        sourceTotals[row.source] = (sourceTotals[row.source] ?? 0) + parseFloat(row.amount)
    }

    // Recent revenue rows
    const { data: recent } = await supabase
        .from('platform_revenue')
        .select('id, source, amount, token_symbol, chain_id, note, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(50)

    // Sweep history (fee debits from the treasury ledger)
    const { data: sweeps } = await supabase
        .from('ledger_transactions')
        .select('id, amount, note, created_at')
        .eq('user_id', TREASURY_ID)
        .eq('direction', 'debit')
        .order('created_at', { ascending: false })
        .limit(20)

    return NextResponse.json({
        balances: balances ?? [],
        sourceTotals,
        recent: recent ?? [],
        sweeps: sweeps ?? [],
    })
}
