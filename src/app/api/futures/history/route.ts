import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()

export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = checkRateLimit(`futures:history:${user.id}`, LIMITS.MODERATE)
        if (!rl.success) return rlResponse(rl.resetAt)

        const { searchParams } = new URL(req.url)
        const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50'), 200)
        const offset = parseInt(searchParams.get('offset') ?? '0')

        const db = createSupabaseAdminClient()

        const { data: positions, error, count } = await db
            .from('futures_positions')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .in('status', ['closed', 'liquidated'])
            .order('closed_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            console.error('[futures/history] DB error:', error)
            return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
        }

        return NextResponse.json({ positions: positions ?? [], total: count ?? 0 })
    } catch (err: any) {
        console.error('[GET /api/futures/history]', err)
        return NextResponse.json({ error: err.message ?? 'Failed to fetch history' }, { status: 500 })
    }
}
