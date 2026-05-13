import { NextResponse } from 'next/server'
import { getGmxSdk, FUTURES_MARKETS, GMX_ORACLE_URL } from '@/lib/gmx'
import { checkRateLimit, LIMITS, rlResponse, clientIp } from '@/lib/rate-limit'

export async function GET(req: Request) {
    try {
        const rl = checkRateLimit(`markets:${clientIp(req)}`, LIMITS.RELAXED)
        if (!rl.success) return rlResponse(rl.resetAt)

        const sdk = await getGmxSdk()

        const tickers = await sdk.oracle.getTickers()

        const markets = FUTURES_MARKETS.map((m) => {
            const ticker = Object.values(tickers).find(
                (t: any) => t.tokenSymbol === m.symbol,
            ) as any

            const midPrice = ticker
                ? ((BigInt(ticker.minPrice) + BigInt(ticker.maxPrice)) / BigInt(2)).toString()
                : null

            const priceUsd = midPrice
                ? (Number(midPrice) / 1e30).toFixed(2)
                : null

            return {
                symbol: m.symbol,
                pair: m.pair,
                priceUsd,
                minPrice: ticker?.minPrice ?? null,
                maxPrice: ticker?.maxPrice ?? null,
                tokenAddress: ticker?.tokenAddress ?? null,
            }
        })

        // Only return markets the oracle actually has price data for
        const activeMarkets = markets.filter((m) => m.priceUsd !== null)

        return NextResponse.json({ markets: activeMarkets })
    } catch (err) {
        console.error('[GET /api/futures/markets]', err)
        return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 })
    }
}
