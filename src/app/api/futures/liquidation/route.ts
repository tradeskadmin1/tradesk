import { NextResponse } from 'next/server'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { getGmxSdk } from '@/lib/gmx'
import { closePosition, isLiquidated } from '@/lib/futures'

const adminClient = (): any => _createSupabaseAdminClient()

export async function POST(req: Request) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        console.error('[liquidation] CRON_SECRET env var is not set — all calls rejected')
        return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (token !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = adminClient()
    const start = Date.now()

    try {
        const { data: positions, error } = await db
            .from('futures_positions')
            .select('id, user_id, side, pair, entry_price, collateral_usd, leverage, liquidation_price, mark_price')
            .eq('status', 'open')
            .not('liquidation_price', 'is', null)

        if (error) {
            console.error('[liquidation] DB fetch error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!positions || positions.length === 0) {
            return NextResponse.json({ checked: 0, liquidated: 0, durationMs: Date.now() - start })
        }

        let tickers: Record<string, any> = {}
        try {
            const sdk = await getGmxSdk()
            tickers = await sdk.oracle.getTickers()
        } catch (err) {
            console.error('[liquidation] Oracle fetch failed:', err)
            return NextResponse.json({ error: 'Oracle unavailable', durationMs: Date.now() - start }, { status: 503 })
        }

        const priceBySymbol = new Map<string, number>()
        for (const ticker of Object.values(tickers) as any[]) {
            if (ticker.tokenSymbol && ticker.minPrice && ticker.maxPrice) {
                const mid = Number((BigInt(ticker.minPrice) + BigInt(ticker.maxPrice)) / BigInt(2)) / 1e30
                priceBySymbol.set(ticker.tokenSymbol, mid)
            }
        }

        const toliquidate: Array<{ id: string; userId: string; markPrice: number }> = []

        for (const pos of positions) {
            const symbol = pos.pair.split('/')[0]
            const markPrice = priceBySymbol.get(symbol) ?? pos.mark_price
            if (!markPrice) continue

            const liqPrice = parseFloat(pos.liquidation_price)
            if (liqPrice && isLiquidated(pos.side, markPrice, liqPrice)) {
                toliquidate.push({ id: pos.id, userId: pos.user_id, markPrice })
            }
        }

        const results = await Promise.allSettled(
            toliquidate.map(({ id, userId, markPrice }) =>
                closePosition(id, userId, markPrice, 'liquidated'),
            ),
        )

        const succeeded = results.filter((r) => r.status === 'fulfilled').length
        const failed = results.filter((r) => r.status === 'rejected').length

        if (failed > 0) {
            results.forEach((r, i) => {
                if (r.status === 'rejected') {
                    console.error(`[liquidation] Failed to liquidate ${toliquidate[i]?.id}:`, r.reason)
                }
            })
        }

        console.info(
            `[liquidation] sweep done — checked: ${positions.length}, ` +
            `triggered: ${toliquidate.length}, ok: ${succeeded}, failed: ${failed}, ` +
            `duration: ${Date.now() - start}ms`,
        )

        return NextResponse.json({
            checked: positions.length,
            liquidated: succeeded,
            failed,
            durationMs: Date.now() - start,
        })
    } catch (err: any) {
        console.error('[POST /api/futures/liquidation]', err)
        return NextResponse.json({ error: err.message ?? 'Sweep failed' }, { status: 500 })
    }
}
