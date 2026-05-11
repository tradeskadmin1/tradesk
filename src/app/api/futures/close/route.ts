import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { closePosition } from '@/lib/futures'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = checkRateLimit(`futures:close:${user.id}`, LIMITS.STRICT)
        if (!rl.success) return rlResponse(rl.resetAt)

        const { positionId } = await req.json()
        if (!positionId) return NextResponse.json({ error: 'positionId required' }, { status: 400 })

        const result = await closePosition(positionId, user.id)

        return NextResponse.json({ success: true, ...result })
    } catch (err: any) {
        console.error('[POST /api/futures/close]', err)
        return NextResponse.json({ error: err.message ?? 'Failed to close position' }, { status: 500 })
    }
}
