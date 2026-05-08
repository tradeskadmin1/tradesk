const BINANCE_BASE = 'https://api.binance.com/api/v3'

export interface TickerPrice {
    symbol: string
    price: string
}

export interface Ticker24h {
    symbol: string
    priceChange: string
    priceChangePercent: string
    lastPrice: string
    highPrice: string
    lowPrice: string
    volume: string
    quoteVolume: string
}

export interface Kline {
    openTime: number
    open: string
    high: string
    low: string
    close: string
    volume: string
    closeTime: number
}


export function pairIdToSymbol(pairId: string): string {
    return pairId.replace('_', '')
}

export function normalizeSymbol(base: string, quote: string): string {
    const b = base === 'WBTC' ? 'BTC' : base
    return `${b}${quote}`
}


export async function getPrice(base: string, quote: string): Promise<string> {
    const symbol = normalizeSymbol(base, quote)
    const res = await fetch(`${BINANCE_BASE}/ticker/price?symbol=${symbol}`, {
        next: { revalidate: 5 },
    })
    if (!res.ok) throw new Error(`[price] Failed to fetch ${symbol}: ${res.status}`)
    const data: TickerPrice = await res.json()
    return data.price
}


export async function get24hTicker(base: string, quote: string): Promise<Ticker24h> {
    const symbol = normalizeSymbol(base, quote)
    const res = await fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${symbol}`, {
        next: { revalidate: 30 },
    })

    if (!res.ok) throw new Error(`[price] Failed to fetch 24h ticker ${symbol}: ${res.status}`)

    return res.json()
}


export async function getAllPrices(
    pairs: { base: string; quote: string }[],
): Promise<Record<string, string>> {
    const symbols = pairs.map((p) => normalizeSymbol(p.base, p.quote))
    const query = JSON.stringify(symbols)

    const res = await fetch(
        `${BINANCE_BASE}/ticker/price?symbols=${encodeURIComponent(query)}`,
        { next: { revalidate: 5 } },
    )

    if (!res.ok) throw new Error(`[price] Failed to fetch batch prices: ${res.status}`)

    const data: TickerPrice[] = await res.json()
    const result: Record<string, string> = {}

    for (const item of data) {
        result[item.symbol] = item.price
    }

    return result
}


export async function getKlines(
    base: string,
    quote: string,
    interval: string = '1h',
    limit: number = 100,
): Promise<Kline[]> {
    const symbol = normalizeSymbol(base, quote)
    const res = await fetch(
        `${BINANCE_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
        { next: { revalidate: 60 } },
    )

    if (!res.ok) throw new Error(`[price] Failed to fetch klines ${symbol}: ${res.status}`)

    const raw: any[][] = await res.json()

    return raw.map((k) => ({
        openTime: k[0],
        open: k[1],
        high: k[2],
        low: k[3],
        close: k[4],
        volume: k[5],
        closeTime: k[6],
    }))
}