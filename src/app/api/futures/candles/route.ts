import { NextResponse } from 'next/server'
import { GMX_ORACLE_URL } from '@/lib/gmx'


export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const symbol = searchParams.get('symbol') ?? 'ETH'
        const period = searchParams.get('period') ?? '1h'
        const limit = searchParams.get('limit') ?? '200'

        const url = `${GMX_ORACLE_URL}/prices/candles?tokenSymbol=${symbol}&period=${period}&limit=${limit}`
        const res = await fetch(url, { next: { revalidate: 60 } })

        if (!res.ok) {
            throw new Error(`Oracle returned ${res.status}`)
        }

        const data = await res.json() as {
            candles: Array<[number, number, number, number, number]>
        }

        const candles = (data.candles ?? []).map(([t, o, h, l, c]) => ({
            time: t,
            open: o,
            high: h,
            low: l,
            close: c,
        }))

        return NextResponse.json({ candles })
    } catch (err) {
        console.error('[GET /api/futures/candles]', err)
        return NextResponse.json({ error: 'Failed to fetch candles' }, { status: 500 })
    }
}
