import { NextResponse } from 'next/server'

// CoinGecko coin IDs → display pair label
const COINS = [
    { id: 'ethereum',     pair: 'ETH/USDT'  },
    { id: 'bitcoin',      pair: 'BTC/USDT'  },
    { id: 'binancecoin',  pair: 'BNB/USDT'  },
    { id: 'arbitrum',     pair: 'ARB/USDT'  },
    { id: 'chainlink',    pair: 'LINK/USDT' },
    { id: 'aave',         pair: 'AAVE/USDT' },
    { id: 'uniswap',      pair: 'UNI/USDT'  },
    { id: 'polkadot',     pair: 'DOT/USDT'  },
]

export async function GET() {
    try {
        const ids = COINS.map(c => c.id).join(',')
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`

        const res = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 30 },
        })

        if (!res.ok) {
            const errText = await res.text()
            console.error('[public/ticker] CoinGecko error:', res.status, errText)
            return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 502 })
        }

        const data: Record<string, { usd: number; usd_24h_change: number }> = await res.json()

        const tickers = COINS.map(({ id, pair }) => {
            const row = data[id]
            if (!row) return null

            const price  = row.usd
            const change = row.usd_24h_change ?? 0

            return {
                pair,
                price:  formatPrice(price),
                change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
                up:     change >= 0,
            }
        }).filter(Boolean)

        return NextResponse.json({ tickers }, {
            headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
        })
    } catch (err) {
        console.error('[public/ticker] Unexpected error:', err)
        return NextResponse.json({ error: 'Price fetch failed' }, { status: 500 })
    }
}

function formatPrice(price: number): string {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (price >= 1)    return `$${price.toFixed(4)}`
    return `$${price.toFixed(6)}`
}
