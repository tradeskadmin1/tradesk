import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { getGmxSdk } from '@/lib/gmx'
import { closePosition, isLiquidated } from '@/lib/futures'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = checkRateLimit(`futures:positions:${user.id}`, LIMITS.MODERATE)
        if (!rl.success) return rlResponse(rl.resetAt)

        const db = createSupabaseAdminClient()

        // ── Fetch open positions ───────────────────────────────────────────
        const { data: positions, error: posErr } = await db
            .from('futures_positions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'open')
            .order('created_at', { ascending: false })

        if (posErr) {
            console.error('[futures/positions] DB error:', posErr)
            return NextResponse.json({ error: posErr.message ?? 'Failed to fetch positions' }, { status: 500 })
        }

        if (!positions || positions.length === 0) {
            return NextResponse.json({ positions: [] })
        }

        // ── Fetch live prices ──────────────────────────────────────────────
        let tickers: Record<string, any> = {}
        try {
            const sdk = await getGmxSdk()
            tickers = await sdk.oracle.getTickers()
        } catch { /* fall back to stored mark_price */ }

        // ── Fetch pending SL/TP orders for these positions ─────────────────
        const positionIds = positions.map((p: any) => p.id)
        const { data: orders } = await db
            .from('futures_orders')
            .select('id, position_id, order_type, trigger_price')
            .in('position_id', positionIds)
            .eq('status', 'pending')

        const ordersByPosition: Record<string, {
            stop_loss?: number; take_profit?: number
            sl_order_id?: string; tp_order_id?: string
        }> = {}
        for (const o of orders ?? []) {
            if (!ordersByPosition[o.position_id]) ordersByPosition[o.position_id] = {}
            if (o.order_type === 'stop_loss') {
                ordersByPosition[o.position_id].stop_loss   = parseFloat(o.trigger_price)
                ordersByPosition[o.position_id].sl_order_id = o.id
            }
            if (o.order_type === 'take_profit') {
                ordersByPosition[o.position_id].take_profit  = parseFloat(o.trigger_price)
                ordersByPosition[o.position_id].tp_order_id  = o.id
            }
        }

        // ── Enrich positions + collect triggers ────────────────────────────
        type Trigger = { positionId: string; userId: string; markPrice: number; reason: 'closed' | 'liquidated' }
        const triggered: Trigger[] = []

        const enriched = positions.map((pos: any) => {
            const symbol = pos.pair.split('/')[0]
            const ticker = Object.values(tickers).find((t: any) => t.tokenSymbol === symbol) as any

            const markPrice = ticker
                ? (Number((BigInt(ticker.minPrice) + BigInt(ticker.maxPrice)) / BigInt(2)) / 1e30)
                : pos.mark_price

            const priceDiff     = pos.side === 'long'
                ? markPrice - pos.entry_price
                : pos.entry_price - markPrice
            const unrealisedPnl = (priceDiff / pos.entry_price) * pos.size_usd
            const pnlPct        = (priceDiff / pos.entry_price) * pos.leverage * 100

            // ── Liquidation check (highest priority) ──────────────────────
            const liqPrice = pos.liquidation_price ?? 0
            if (liqPrice && isLiquidated(pos.side, markPrice, liqPrice)) {
                triggered.push({ positionId: pos.id, userId: pos.user_id, markPrice, reason: 'liquidated' })
                return null // exclude from response — will be gone after liquidation
            }

            // ── SL/TP checks ──────────────────────────────────────────────
            const sltp = ordersByPosition[pos.id] ?? {}
            const slTriggered =
                sltp.stop_loss !== undefined && (
                    (pos.side === 'long'  && markPrice <= sltp.stop_loss) ||
                    (pos.side === 'short' && markPrice >= sltp.stop_loss)
                )
            const tpTriggered =
                sltp.take_profit !== undefined && (
                    (pos.side === 'long'  && markPrice >= sltp.take_profit) ||
                    (pos.side === 'short' && markPrice <= sltp.take_profit)
                )

            if (slTriggered || tpTriggered) {
                triggered.push({ positionId: pos.id, userId: pos.user_id, markPrice, reason: 'closed' })
            }

            return {
                ...pos,
                mark_price:       markPrice,
                liquidation_price: liqPrice,
                unrealised_pnl:   parseFloat(unrealisedPnl.toFixed(2)),
                pnl_pct:          parseFloat(pnlPct.toFixed(2)),
                stop_loss:        sltp.stop_loss   ?? null,
                take_profit:      sltp.take_profit ?? null,
                sl_order_id:      sltp.sl_order_id ?? null,
                tp_order_id:      sltp.tp_order_id ?? null,
            }
        }).filter(Boolean)

        // ── Fire-and-forget triggers ───────────────────────────────────────
        for (const { positionId, userId, markPrice, reason } of triggered) {
            closePosition(positionId, userId, markPrice, reason).catch((err) =>
                console.error(`[futures/positions] ${reason} trigger failed for ${positionId}:`, err),
            )
        }

        return NextResponse.json({ positions: enriched })
    } catch (err: any) {
        console.error('[GET /api/futures/positions]', err)
        return NextResponse.json({ error: err.message ?? 'Failed to fetch positions' }, { status: 500 })
    }
}
