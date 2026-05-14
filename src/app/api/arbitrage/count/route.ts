
import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'

const adminClient = (): any => _createSupabaseAdminClient()

export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = await checkRateLimit(`arbitrage:count:${user.id}`, LIMITS.MODERATE)
        if (!rl.success) return rlResponse(rl.resetAt)

        const { count, error } = await adminClient()
            .from('arbitrage_opportunities')
            .select('*', { count: 'exact', head: true })
            .gt('expires_at', new Date().toISOString())

        if (error) {
            console.error('[GET /api/arbitrage/count]', error)
            return NextResponse.json({ count: 0 })
        }

        return NextResponse.json(
            { count: count ?? 0 },
            { headers: { 'Cache-Control': 'no-store' } },
        )
    } catch (err) {
        console.error('[GET /api/arbitrage/count]', err)
        return NextResponse.json({ count: 0 })
    }
}
