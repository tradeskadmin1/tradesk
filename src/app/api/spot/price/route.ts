import { NextResponse } from 'next/server'
import { getPairBySymbol, SPOT_PAIRS } from '@/config/spot'

interface PriceStats {
    pair: string
    price: number
    change24h: number
    high24h: number
    low24h: number
    volume24h: number
    source: 'binance' | 'coingecko'
}

async function fetchBinanceStats(binanceSymbol: string): Promise<PriceStats | null> {
    try {
        const res = await fetch(
            `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
            { cache: 'no-store' },
        )
        if (!res.ok) return null
        const d = await res.json()
        return {
            pair: binanceSymbol,
            price: parseFloat(d.lastPrice),
            change24h: parseFloat(d.priceChangePercent),
            high24h: parseFloat(d.highPrice),
            low24h: parseFloat(d.lowPrice),
            volume24h: parseFloat(d.quoteVolume),
            source: 'binance',
        }
    } catch { return null }
}

async function fetchCoinGeckoPrice(coingeckoId: string, quote: string): Promise<number | null> {
    try {
        const vs = quote === 'BTC' ? 'btc' : 'usd'
        const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=${vs}&include_24hr_change=true`,
            { next: { revalidate: 30 } },
        )
        if (!res.ok) return null
        const data = await res.json()
        return data[coingeckoId]?.[vs] ?? null
    } catch { return null }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const pairSymbol = searchParams.get('pair')

    if (pairSymbol) {
        const pair = getPairBySymbol(pairSymbol)
        if (!pair) return NextResponse.json({ error: 'Unknown pair' }, { status: 400 })

        const stats = await fetchBinanceStats(pair.binanceSymbol)
        if (stats) {
            return NextResponse.json({ ...stats, pair: pairSymbol }, {
                headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' },
            })
        }

        const price = await fetchCoinGeckoPrice(pair.coingeckoId, pair.quote)
        if (!price) return NextResponse.json({ error: 'Price unavailable' }, { status: 503 })

        return NextResponse.json({
            pair: pairSymbol, price, change24h: 0,
            high24h: price, low24h: price, volume24h: 0, source: 'coingecko',
        } satisfies PriceStats, {
            headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
        })
    }


    const results = await Promise.all(
        SPOT_PAIRS.map(async (p) => {
            const stats = await fetchBinanceStats(p.binanceSymbol)
            if (stats) return { ...stats, pair: p.symbol }
            const price = await fetchCoinGeckoPrice(p.coingeckoId, p.quote)
            return { pair: p.symbol, price: price ?? 0, change24h: 0, high24h: 0, low24h: 0, volume24h: 0, source: 'coingecko' as const }
        }),
    )

    return NextResponse.json({ prices: results }, {
        headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
    })
}
