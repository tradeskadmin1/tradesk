import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { getGmxSdk } from '@/lib/gmx'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const adminClient = createSupabaseAdminClient()
        const { data: positions, error: posErr } = await adminClient
            .from('futures_positions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'open')
            .order('created_at', { ascending: false })

        if (posErr) {
            return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
        }

        if (!positions || positions.length === 0) {
            return NextResponse.json({ positions: [] })
        }

        let tickers: Record<string, any> = {}
        try {
            const sdk = await getGmxSdk()
            tickers = await sdk.oracle.getTickers()
        } catch {
        }

        const enriched = positions.map((pos: any) => {
            const symbol = pos.pair.split('/')[0]
            const ticker = Object.values(tickers).find((t: any) => t.tokenSymbol === symbol) as any

            const markPrice = ticker
                ? (Number((BigInt(ticker.minPrice) + BigInt(ticker.maxPrice)) / BigInt(2)) / 1e30)
                : pos.mark_price

            const priceDiff = pos.side === 'long'
                ? markPrice - pos.entry_price
                : pos.entry_price - markPrice

            const unrealisedPnl = (priceDiff / pos.entry_price) * pos.size_usd
            const pnlPct = (priceDiff / pos.entry_price) * pos.leverage * 100

            return {
                ...pos,
                mark_price: markPrice,
                unrealised_pnl: parseFloat(unrealisedPnl.toFixed(2)),
                pnl_pct: parseFloat(pnlPct.toFixed(2)),
            }
        })

        return NextResponse.json({ positions: enriched })
    } catch (err: any) {
        console.error('[GET /api/futures/positions]', err)
        return NextResponse.json({ error: err.message ?? 'Failed to fetch positions' }, { status: 500 })
    }
}
