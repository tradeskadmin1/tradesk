

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: Request) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') ?? 'pending'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const db = createSupabaseAdminClient() as any

    let query = db
        .from('withdrawals')
        .select(`
            id, status, amount, token_symbol, chain_id, to_address,
            tx_hash, fee, auto_approved, rejection_reason,
            created_at, approved_at, rejected_at, completed_at,
            users!withdrawals_user_id_public_fkey ( id, email, full_name )
        `)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1)

    if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
    }

    const { data, error, count } = await query

    if (error) {
        console.error('[GET /api/admin/withdrawals]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ withdrawals: data ?? [], total: count ?? 0 })
}
