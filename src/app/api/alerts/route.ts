import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient as _admin } from '@/lib/supabase-server'
import { getAllPrices } from '@/lib/price'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'

const adminClient = (): any => _admin()

// ── GET — list alerts + auto-trigger any that have been hit ───────────────────
export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = checkRateLimit(`alerts:get:${user.id}`, LIMITS.MODERATE)
        if (!rl.success) return rlResponse(rl.resetAt)

        const db = adminClient()

        // Fetch all alerts for this user
        const { data: alerts, error } = await db
            .from('user_alerts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw new Error(error.message)

        const rows: any[] = alerts ?? []

        // Auto-trigger: check live prices for active alerts
        const activeRows = rows.filter((a) => a.status === 'active')
        if (activeRows.length > 0) {
            const uniqueTokens = [...new Set(activeRows.map((a: any) => a.token as string))]
            let priceMap: Record<string, number> = {}

            try {
                const raw = await getAllPrices(uniqueTokens.map((t) => ({ base: t, quote: 'USDT' })))
                for (const [sym, price] of Object.entries(raw)) {
                    // sym = e.g. 'BTCUSDT' → strip USDT suffix
                    const token = sym.replace('USDT', '')
                    priceMap[token] = parseFloat(price)
                }
            } catch { /* leave priceMap empty — no trigger this round */ }

            const toTrigger: string[] = []

            for (const alert of activeRows) {
                const price = priceMap[alert.token]
                if (price === undefined) continue
                const hit =
                    alert.condition === 'above' ? price >= alert.threshold :
                    alert.condition === 'below' ? price <= alert.threshold :
                    false
                if (hit) toTrigger.push(alert.id)
            }

            if (toTrigger.length > 0) {
                await db
                    .from('user_alerts')
                    .update({ status: 'triggered', triggered_at: new Date().toISOString() })
                    .in('id', toTrigger)
                    .eq('user_id', user.id)  // safety

                // Patch the in-memory rows so the response is immediately correct
                for (const row of rows) {
                    if (toTrigger.includes(row.id)) {
                        row.status       = 'triggered'
                        row.triggered_at = new Date().toISOString()
                    }
                }
            }
        }

        return NextResponse.json({ alerts: rows }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (err) {
        console.error('[GET /api/alerts]', err)
        return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }
}

// ── POST — create a new alert ─────────────────────────────────────────────────
export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = checkRateLimit(`alerts:create:${user.id}`, LIMITS.STRICT)
        if (!rl.success) return rlResponse(rl.resetAt)

        const body = await req.json()
        const { token, condition, threshold } = body

        if (!token || !condition || threshold === undefined) {
            return NextResponse.json({ error: 'token, condition, and threshold are required' }, { status: 400 })
        }
        if (!['above', 'below'].includes(condition)) {
            return NextResponse.json({ error: 'condition must be "above" or "below"' }, { status: 400 })
        }
        const thresholdNum = parseFloat(threshold)
        if (isNaN(thresholdNum) || thresholdNum <= 0) {
            return NextResponse.json({ error: 'threshold must be a positive number' }, { status: 400 })
        }

        const db = adminClient()

        // Enforce a per-user limit (max 20 active alerts)
        const { count } = await db
            .from('user_alerts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'active')

        if ((count ?? 0) >= 20) {
            return NextResponse.json(
                { error: 'Maximum 20 active alerts. Dismiss some to create new ones.' },
                { status: 422 },
            )
        }

        const label = `${token.toUpperCase()} ${condition} $${Number(thresholdNum.toFixed(2)).toLocaleString()}`

        const { data: alert, error } = await db
            .from('user_alerts')
            .insert({
                user_id:   user.id,
                label,
                type:      'price',
                token:     token.toUpperCase(),
                condition,
                threshold: thresholdNum,
                status:    'active',
            })
            .select()
            .single()

        if (error) throw new Error(error.message)

        return NextResponse.json({ alert }, { status: 201 })
    } catch (err) {
        console.error('[POST /api/alerts]', err)
        return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
    }
}

// ── DELETE — dismiss a single alert ──────────────────────────────────────────
export async function DELETE(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = checkRateLimit(`alerts:delete:${user.id}`, LIMITS.STRICT)
        if (!rl.success) return rlResponse(rl.resetAt)

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

        const db = adminClient()

        const { error } = await db
            .from('user_alerts')
            .update({ status: 'dismissed' })
            .eq('id', id)
            .eq('user_id', user.id)  // ownership check

        if (error) throw new Error(error.message)

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('[DELETE /api/alerts]', err)
        return NextResponse.json({ error: 'Failed to dismiss alert' }, { status: 500 })
    }
}
