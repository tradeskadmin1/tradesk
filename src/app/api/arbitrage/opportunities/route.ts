import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getOpportunities } from '@/lib/arbitrage'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'


export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rl = await checkRateLimit(`arbitrage:opportunities:${user.id}`, LIMITS.MODERATE)
        if (!rl.success) return rlResponse(rl.resetAt)

        const { searchParams } = new URL(req.url)
        const pair = searchParams.get('pair') ?? undefined
        const minNetProfitP = searchParams.get('minNetProfit')
        const maxRiskScoreP = searchParams.get('maxRiskScore')
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
        const offset = parseInt(searchParams.get('offset') ?? '0', 10)

        const minNetProfit = minNetProfitP ? parseFloat(minNetProfitP) : undefined
        const maxRiskScore = maxRiskScoreP ? parseInt(maxRiskScoreP, 10) : undefined

        const result = await getOpportunities({
            pair,
            minNetProfit,
            maxRiskScore,
            limit,
            offset,
        })

        return NextResponse.json({
            opportunities: result.opportunities,
            total: result.total,
            limit,
            offset,
            hasMore: result.hasMore,
            fetchedAt: new Date().toISOString(),
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch opportunities'
        console.error('[GET /api/arbitrage/opportunities]', err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
