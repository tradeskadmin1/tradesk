import { NextResponse } from 'next/server'
import { checkRateLimit, LIMITS, rlResponse, clientIp } from '@/lib/rate-limit'

// Pairs shown in the homepage ticker — subset of supported pairs
// that have the highest name recognition for visitors
const TICKER_SYMBOLS = [
    { pair: 'ETH/USDC',  symbol: 'ETHUSDC'  },
    { pair: 'BTC/USDT',  symbol: 'BTCUSDT'  },
    { pair: 'BNB/USDT',  symbol: 'BNBUSDT'  },
    { pair: 'ARB/USDC',  symbol: 'ARBUSDC'  },
    { pair: 'LINK/USDC', symbol: 'LINKUSDC' },
    { pair: 'AAVE/USDC', symbol: 'AAVEUSDC' },
    { pair: 'MATIC/USDT',symbol: 'MATICUSDT'},
    { pair: 'UNI/USDT',  symbol: 'UNIUSDT'  },
]

export async function GET(req: Request) {
    const rl = await checkRateLimit(`public:ticker:${clientIp(req)}`, LIMITS.RELAXED)
    if (!rl.success) return rlResponse(rl.resetAt)

    try {
        const symbols = JSON.stringify(TICKER_SYMBOLS.map(t => t.symbol))
        const res = await fetch(
            `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`,
            { next: { revalidate: 30 } },
        )

        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 502 })
        }

        const data: Array<{
            symbol: string
            lastPrice: string
            priceChangePercent: string
        }> = await res.json()

        const tickers = TICKER_SYMBOLS.map(({ pair, symbol }) => {
            const row = data.find(d => d.symbol === symbol)
            if (!row) return null

            const price  = parseFloat(row.lastPrice)
            const change = parseFloat(row.priceChangePercent)

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
        console.error('[public/ticker]', err)
        return NextResponse.json({ error: 'Price fetch failed' }, { status: 500 })
    }
}

function formatPrice(price: number): string {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (price >= 1)    return `$${price.toFixed(4)}`
    return `$${price.toFixed(6)}`
}
