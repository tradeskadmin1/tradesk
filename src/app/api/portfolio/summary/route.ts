import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { getUserBalances } from '@/lib/ledger'
import { getAllPrices } from '@/lib/price'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'

const adminClient = (): any => _createSupabaseAdminClient()

/** Stablecoins priced at $1 without a Binance call */
const STABLECOINS = new Set(['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDP', 'FRAX', 'LUSD'])

export interface PortfolioBalance {
    tokenSymbol: string
    chainId: number
    balance: string
    usdValue: number
}

export interface ChartPoint {
    time: string   // 'YYYY-MM-DD'
    value: number
}

export interface PortfolioSummary {
    totalUsd: number
    unrealisedPnl: number
    realisedPnl: number
    openPositions: number
    balances: PortfolioBalance[]
    chart: ChartPoint[]
    updatedAt: string
}

export async function GET(req: Request) {
    try {
        // ── Auth ──────────────────────────────────────────────────────────────
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rl = checkRateLimit(`portfolio:summary:${user.id}`, LIMITS.MODERATE)
        if (!rl.success) return rlResponse(rl.resetAt)

        const db = adminClient()

        // ── Run all data fetches in parallel ──────────────────────────────────
        const [
            ledgerBalances,
            openPositions,
            closedPositions,
            chartRows,
        ] = await Promise.all([
            // 1. Ledger balances (non-zero only)
            getUserBalances(user.id),

            // 2. Open futures positions
            db
                .from('futures_positions')
                .select('id, pair, side, size_usd, collateral_usd, entry_price, mark_price, leverage')
                .eq('user_id', user.id)
                .eq('status', 'open'),

            // 3. Closed / liquidated — sum realised_pnl
            db
                .from('futures_positions')
                .select('realised_pnl')
                .eq('user_id', user.id)
                .in('status', ['closed', 'liquidated']),

            // 4. Last 30 days of USDC ledger transactions for portfolio chart
            db
                .from('ledger_transactions')
                .select('balance_after, created_at')
                .eq('user_id', user.id)
                .eq('token_symbol', 'USDC')
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: true }),
        ])

        // ── 1. USD values for balances ────────────────────────────────────────
        const nonStableTokens = ledgerBalances
            .map((b) => b.tokenSymbol)
            .filter((sym) => !STABLECOINS.has(sym))

        // Batch Binance price fetch — deduplicate symbols
        const uniqueTokens = [...new Set(nonStableTokens)]
        let priceMap: Record<string, string> = {}
        if (uniqueTokens.length > 0) {
            try {
                priceMap = await getAllPrices(
                    uniqueTokens.map((base) => ({ base, quote: 'USDT' })),
                )
            } catch {
                // Fallback to zero for unknown pairs — better than crashing
            }
        }

        const getTokenUsdPrice = (symbol: string): number => {
            if (STABLECOINS.has(symbol)) return 1
            // getAllPrices uses normalizeSymbol which replaces WBTC → BTC
            const lookupSymbol = symbol === 'WBTC' ? 'BTCUSDT' : `${symbol}USDT`
            return parseFloat(priceMap[lookupSymbol] ?? '0')
        }

        const balancesWithUsd: PortfolioBalance[] = ledgerBalances.map((b) => {
            const price    = getTokenUsdPrice(b.tokenSymbol)
            const balance  = parseFloat(b.balance)
            return {
                tokenSymbol: b.tokenSymbol,
                chainId:     b.chainId,
                balance:     b.balance,
                usdValue:    parseFloat((balance * price).toFixed(2)),
            }
        })

        const totalUsd = balancesWithUsd.reduce((sum, b) => sum + b.usdValue, 0)

        // ── 2. Unrealised PnL from open positions ─────────────────────────────
        let unrealisedPnl = 0
        const openRows: any[] = openPositions.data ?? []

        for (const pos of openRows) {
            // Use stored mark_price as a proxy (refreshed on every positions poll)
            const markPrice  = parseFloat(pos.mark_price ?? pos.entry_price)
            const entryPrice = parseFloat(pos.entry_price)
            const sizeUsd    = parseFloat(pos.size_usd)
            const priceDiff  = pos.side === 'long'
                ? markPrice - entryPrice
                : entryPrice - markPrice
            const pnl = (priceDiff / entryPrice) * sizeUsd
            unrealisedPnl += pnl
        }

        // ── 3. Realised PnL from closed positions ─────────────────────────────
        const closedRows: any[] = closedPositions.data ?? []
        const realisedPnl = closedRows.reduce(
            (sum, row) => sum + parseFloat(row.realised_pnl ?? '0'),
            0,
        )

        // ── 4. Chart: daily last-known USDC balance for past 30 days ─────────
        // Strategy: group rows by calendar day, take the last balance_after per day.
        // Then fill any missing days by carrying forward the previous day's value.
        const rows: any[] = chartRows.data ?? []

        const dayMap: Record<string, number> = {}
        for (const row of rows) {
            const day = row.created_at.slice(0, 10) // 'YYYY-MM-DD'
            dayMap[day] = parseFloat(row.balance_after)
        }

        // Fill a contiguous 30-day window
        const chart: ChartPoint[] = []
        const today    = new Date()
        let prevValue  = 0

        for (let i = 29; i >= 0; i--) {
            const d   = new Date(today)
            d.setDate(today.getDate() - i)
            const key = d.toISOString().slice(0, 10)
            const val = dayMap[key] !== undefined ? dayMap[key] : prevValue
            prevValue = val
            // Only include days up to today; skip future (shouldn't happen but safe)
            if (d <= today) {
                chart.push({ time: key, value: parseFloat(val.toFixed(2)) })
            }
        }

        // ── Response ──────────────────────────────────────────────────────────
        const summary: PortfolioSummary = {
            totalUsd:      parseFloat(totalUsd.toFixed(2)),
            unrealisedPnl: parseFloat(unrealisedPnl.toFixed(2)),
            realisedPnl:   parseFloat(realisedPnl.toFixed(2)),
            openPositions: openRows.length,
            balances:      balancesWithUsd,
            chart,
            updatedAt:     new Date().toISOString(),
        }

        return NextResponse.json(summary, {
            headers: { 'Cache-Control': 'no-store' },
        })

    } catch (err) {
        console.error('[GET /api/portfolio/summary]', err)
        return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 })
    }
}
