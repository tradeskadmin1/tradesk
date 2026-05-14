import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()


export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = await checkRateLimit(`futures:orders:${user.id}`, LIMITS.STRICT)
        if (!rl.success) return rlResponse(rl.resetAt)

        const { positionId, type, triggerPrice } = await req.json() as {
            positionId: string
            type: 'stop_loss' | 'take_profit'
            triggerPrice: number
        }

        if (!positionId) return NextResponse.json({ error: 'positionId required' }, { status: 400 })
        if (!['stop_loss', 'take_profit'].includes(type)) return NextResponse.json({ error: 'type must be stop_loss or take_profit' }, { status: 400 })
        if (!triggerPrice || triggerPrice <= 0) return NextResponse.json({ error: 'triggerPrice must be positive' }, { status: 400 })

        const db = createSupabaseAdminClient()

        const { data: pos, error: posErr } = await db
            .from('futures_positions')
            .select('id, side, entry_price, mark_price, pair, size_usd, chain_id')
            .eq('id', positionId)
            .eq('user_id', user.id)
            .eq('status', 'open')
            .single()

        if (posErr || !pos) return NextResponse.json({ error: 'Position not found' }, { status: 404 })

        const currentPrice = pos.mark_price ?? pos.entry_price
        if (type === 'stop_loss') {
            if (pos.side === 'long' && triggerPrice >= currentPrice)
                return NextResponse.json({ error: 'Stop loss must be below current price for longs' }, { status: 400 })
            if (pos.side === 'short' && triggerPrice <= currentPrice)
                return NextResponse.json({ error: 'Stop loss must be above current price for shorts' }, { status: 400 })
        }
        if (type === 'take_profit') {
            if (pos.side === 'long' && triggerPrice <= currentPrice)
                return NextResponse.json({ error: 'Take profit must be above current price for longs' }, { status: 400 })
            if (pos.side === 'short' && triggerPrice >= currentPrice)
                return NextResponse.json({ error: 'Take profit must be below current price for shorts' }, { status: 400 })
        }

        await db
            .from('futures_orders')
            .update({ status: 'cancelled' })
            .eq('position_id', positionId)
            .eq('order_type', type)
            .eq('status', 'pending')

        const { data: order, error: insertErr } = await db
            .from('futures_orders')
            .insert({
                user_id: user.id,
                position_id: positionId,
                chain_id: pos.chain_id,
                pair: pos.pair,
                side: pos.side,
                order_type: type,
                size_usd: pos.size_usd,
                trigger_price: triggerPrice,
                status: 'pending',
            })
            .select('id')
            .single()

        if (insertErr) {
            console.error('[futures/orders] insert error:', insertErr)
            return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
        }

        return NextResponse.json({ success: true, orderId: order.id })
    } catch (err: any) {
        console.error('[POST /api/futures/orders]', err)
        return NextResponse.json({ error: err.message ?? 'Failed to create order' }, { status: 500 })
    }
}


export async function DELETE(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl2 = await checkRateLimit(`futures:orders:${user.id}`, LIMITS.STRICT)
        if (!rl2.success) return rlResponse(rl2.resetAt)

        const { searchParams } = new URL(req.url)
        const orderId = searchParams.get('id')
        if (!orderId) return NextResponse.json({ error: 'id required' }, { status: 400 })

        const db = createSupabaseAdminClient()

        const { error } = await db
            .from('futures_orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId)
            .eq('user_id', user.id)
            .eq('status', 'pending')

        if (error) return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[DELETE /api/futures/orders]', err)
        return NextResponse.json({ error: err.message ?? 'Failed to cancel order' }, { status: 500 })
    }
}
