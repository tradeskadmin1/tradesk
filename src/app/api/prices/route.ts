import { NextResponse } from 'next/server'
import { getAllPrices, get24hTicker, getKlines } from '@/lib/price'
import { ACTIVE_PAIRS } from '@/config/pairs'
import { checkRateLimit, LIMITS, rlResponse, clientIp } from '@/lib/rate-limit'


export async function GET(req: Request) {
    try {
        const rl = await checkRateLimit(`prices:${clientIp(req)}`, LIMITS.RELAXED)
        if (!rl.success) return rlResponse(rl.resetAt)

        const { searchParams } = new URL(req.url)
        const pairId = searchParams.get('pairId')
        const type = searchParams.get('type') ?? 'price'
        const interval = searchParams.get('interval') ?? '1h'
        const limit = parseInt(searchParams.get('limit') ?? '100', 10)

        if (pairId) {
            const pair = ACTIVE_PAIRS.find((p) => p.id === pairId)
            if (!pair) {
                return NextResponse.json({ error: `Unknown pair: ${pairId}` }, { status: 400 })
            }

            if (type === 'ticker') {
                const ticker = await get24hTicker(pair.base, pair.quote)
                return NextResponse.json(ticker)
            }

            if (type === 'klines') {
                const klines = await getKlines(pair.base, pair.quote, interval, limit)
                return NextResponse.json({ pairId, interval, klines })
            }
        }

        const prices = await getAllPrices(
            ACTIVE_PAIRS.map((p) => ({ base: p.base, quote: p.quote })),
        )

        const result: Record<string, string> = {}
        for (const pair of ACTIVE_PAIRS) {
            const symbol = pair.base === 'WBTC'
                ? `BTC${pair.quote}`
                : `${pair.base}${pair.quote}`
            if (prices[symbol]) {
                result[pair.id] = prices[symbol]
            }
        }

        return NextResponse.json({ prices: result, updatedAt: new Date().toISOString() })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch prices'
        console.error('[GET /api/prices]', err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
