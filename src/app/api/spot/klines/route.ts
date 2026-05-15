import { NextResponse } from 'next/server'
import { getPairBySymbol, SPOT_INTERVALS } from '@/config/spot'
import { GMX_ORACLE_URL } from '@/lib/gmx'


const INTERVAL_TO_CG_DAYS: Record<string, number> = {
    '1m': 1,
    '5m': 1,
    '15m': 2,
    '1h': 30,
    '4h': 90,
    '1d': 365,
}


async function fetchGmxCandles(gmxSymbol: string, interval: string, limit: number) {
    const url = `${GMX_ORACLE_URL}/prices/candles?tokenSymbol=${gmxSymbol}&period=${interval}&limit=${limit}`
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) throw new Error(`GMX oracle returned ${res.status}`)

    const data = await res.json() as { candles: Array<[number, number, number, number, number]> }
    if (!data.candles?.length) throw new Error('GMX oracle returned empty candles')


    return data.candles
        .slice()
        .reverse()
        .map(([t, o, h, l, c]) => ({ time: t, open: o, high: h, low: l, close: c, volume: 0 }))
}


async function fetchCoinGeckoOhlc(coingeckoId: string, quote: string, interval: string) {
    const vs = quote === 'BTC' ? 'btc' : 'usd'
    const days = INTERVAL_TO_CG_DAYS[interval] ?? 7

    const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coingeckoId}/ohlc?vs_currency=${vs}&days=${days}&precision=full`,
        { next: { revalidate: 60 } },
    )
    if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`)

    const raw: number[][] = await res.json()
    if (!raw?.length) throw new Error('CoinGecko returned empty data')

    return raw.map(([time, open, high, low, close]) => ({
        time: Math.floor(time / 1000),
        open,
        high,
        low,
        close,
        volume: 0,
    }))
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const pairSymbol = searchParams.get('pair')
    const interval = (searchParams.get('interval') ?? '1h') as string
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '200', 10), 500)

    if (!pairSymbol)
        return NextResponse.json({ error: 'pair is required' }, { status: 400 })

    const pair = getPairBySymbol(pairSymbol)
    if (!pair)
        return NextResponse.json({ error: 'Unknown pair' }, { status: 400 })

    if (!SPOT_INTERVALS.includes(interval as any))
        return NextResponse.json(
            { error: `Invalid interval. Use: ${SPOT_INTERVALS.join(', ')}` },
            { status: 400 },
        )

    if (pair.gmxSymbol) {
        try {
            const candles = await fetchGmxCandles(pair.gmxSymbol, interval, limit)
            return NextResponse.json({ pair: pairSymbol, interval, candles, source: 'gmx' }, {
                headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
            })
        } catch (gmxErr) {
            console.warn(`[spot/klines] GMX oracle failed for ${pair.gmxSymbol}, trying CoinGecko:`, gmxErr)
        }
    }

    try {
        const candles = await fetchCoinGeckoOhlc(pair.coingeckoId, pair.quote, interval)
        return NextResponse.json({ pair: pairSymbol, interval, candles, source: 'coingecko' }, {
            headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
        })
    } catch (cgErr) {
        console.error('[spot/klines] Both GMX and CoinGecko failed:', cgErr)
        return NextResponse.json({ error: 'Chart data unavailable' }, { status: 503 })
    }
}
