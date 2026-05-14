import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { isSupportedChain } from '@/config/chains'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'


export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rl = await checkRateLimit(`trade:history:${user.id}`, LIMITS.MODERATE)
        if (!rl.success) return rlResponse(rl.resetAt)

        const { searchParams } = new URL(req.url)
        const chainIdParam = searchParams.get('chainId')
        const pairId = searchParams.get('pairId')
        const status = searchParams.get('status')
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
        const offset = parseInt(searchParams.get('offset') ?? '0', 10)

        const adminClient = createSupabaseAdminClient() as any

        let query = adminClient
            .from('orders')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (chainIdParam) {
            const chainId = parseInt(chainIdParam, 10)
            if (isSupportedChain(chainId)) {
                query = query.eq('chain_id', chainId)
            }
        }

        if (pairId) {
            query = query.eq('pair', pairId)
        }

        if (status) {
            query = query.eq('status', status)
        }

        const { data: orders, error, count } = await query

        if (error) {
            throw new Error(error.message)
        }

        return NextResponse.json({
            orders: orders ?? [],
            total: count ?? 0,
            limit,
            offset,
            hasMore: (count ?? 0) > offset + limit,
        })
    } catch (err) {
        console.error('[GET /api/trade/history]', err)
        return NextResponse.json({ error: 'Failed to fetch trade history' }, { status: 500 })
    }
}
