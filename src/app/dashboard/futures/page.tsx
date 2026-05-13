"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createChart, IChartApi, ISeriesApi, Time, CandlestickSeries } from "lightweight-charts"
import { supabase } from "@/lib/supabase"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"


// ─── Token icons ─────────────────────────────────────────────────────────────
// CoinGecko small images (32×32). Falls back to a coloured letter badge.
const TOKEN_ICON_URL: Record<string, string> = {
    BTC:  'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    ETH:  'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    SOL:  'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    BNB:  'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
    DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
    LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
    UNI:  'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
    AAVE: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
    CRV:  'https://assets.coingecko.com/coins/images/12124/small/Curve.png',
    LDO:  'https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png',
    ARB:  'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
    OP:   'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
    MATIC:'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
    ATOM: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
    NEAR: 'https://assets.coingecko.com/coins/images/10365/small/near_icon.png',
    APT:  'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
    SUI:  'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
    INJ:  'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png',
    TRX:  'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
    GMX:  'https://assets.coingecko.com/coins/images/18323/small/arbit.png',
    PEPE: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
    SHIB: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
    WIF:  'https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg',
    ORDI: 'https://assets.coingecko.com/coins/images/28451/small/ordi.png',
}

// Consistent hue per symbol for the letter-fallback badge
const SYMBOL_HUE: Record<string, number> = {
    BTC:20, ETH:220, SOL:260, BNB:45, AVAX:5, DOGE:45, LINK:200, UNI:300,
    AAVE:130, CRV:240, LDO:10, ARB:150, OP:5, MATIC:270, ATOM:200, NEAR:5,
    APT:260, SUI:210, INJ:200, TRX:10, GMX:160, PEPE:120, SHIB:30, WIF:30, ORDI:30,
}

function TokenIcon({ symbol, size = 28 }: { symbol: string; size?: number }) {
    const [err, setErr] = useState(false)
    const url = TOKEN_ICON_URL[symbol]
    const hue = SYMBOL_HUE[symbol] ?? 200
    const px = `${size}px`

    if (!url || err) {
        return (
            <span
                style={{
                    width: px, height: px, minWidth: px,
                    background: `hsl(${hue} 60% 28%)`,
                    color: `hsl(${hue} 80% 75%)`,
                    fontSize: size < 24 ? 9 : 11,
                }}
                className="rounded-full flex items-center justify-center font-bold select-none"
            >
                {symbol.slice(0, 3)}
            </span>
        )
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={url}
            alt={symbol}
            width={size}
            height={size}
            style={{ width: px, height: px, minWidth: px }}
            className="rounded-full object-cover"
            onError={() => setErr(true)}
        />
    )
}


// ─── Types ────────────────────────────────────────────────────────────────────
interface Market {
    symbol: string
    pair: string
    priceUsd: string | null
}

interface Position {
    id: string
    pair: string
    side: 'long' | 'short'
    size_usd: number
    collateral_usd: number
    leverage: number
    entry_price: number
    mark_price: number
    liquidation_price: number
    unrealised_pnl: number
    pnl_pct: number
    created_at: string
    stop_loss: number | null
    take_profit: number | null
    sl_order_id: string | null
    tp_order_id: string | null
}


// ─── Market Picker ────────────────────────────────────────────────────────────
const MARKET_GROUPS = [
    { label: 'Major',      symbols: ['BTC','ETH','SOL','BNB','AVAX','DOGE'] },
    { label: 'DeFi',       symbols: ['LINK','UNI','AAVE','CRV','LDO'] },
    { label: 'L1 / L2',   symbols: ['ARB','OP','MATIC','ATOM','NEAR','APT','SUI','INJ','TRX'] },
    { label: 'Arb-native', symbols: ['GMX'] },
    { label: 'Meme',       symbols: ['PEPE','SHIB','WIF','ORDI'] },
]

function MarketPicker({
    markets,
    selected,
    onSelect,
}: {
    markets: Market[]
    selected: string
    onSelect: (symbol: string) => void
}) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const current = markets.find((m) => m.symbol === selected)
    const markPrice = current?.priceUsd
        ? parseFloat(current.priceUsd).toLocaleString('en-US', { maximumFractionDigits: 2 })
        : null

    // Focus search when opened
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50)
        else setSearch('')
    }, [open])

    // Close on Escape
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open])

    const q = search.toLowerCase()
    const filtered = q
        ? markets.filter((m) => m.symbol.toLowerCase().includes(q) || m.pair.toLowerCase().includes(q))
        : null // null = show grouped

    return (
        <>
            {/* ── Trigger button ── */}
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1210] hover:bg-[#2e2520] border border-[#2e2520] transition-colors"
            >
                <TokenIcon symbol={selected} size={24} />
                <div className="flex flex-col items-start leading-tight">
                    <span className="text-sm font-bold text-white">{current?.pair ?? `${selected}/USD`}</span>
                    {markPrice && (
                        <span className="text-[11px] text-[#7a6a5a]">${markPrice}</span>
                    )}
                </div>
                {/* chevron */}
                <svg className="w-3.5 h-3.5 text-[#7a6a5a] ml-1 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </button>

            {/* ── Drawer / panel ── */}
            {open && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-start md:items-start">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setOpen(false)}
                    />

                    {/* Panel — bottom sheet on mobile, top-left panel on desktop */}
                    <div className="relative w-full md:w-80 md:max-w-sm bg-[#0e0a08] border-t border-[#2e2520] md:border md:rounded-xl md:mt-16 md:ml-4 md:shadow-2xl flex flex-col max-h-[80vh] md:max-h-[calc(100vh-5rem)] rounded-t-2xl md:rounded-t-xl overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2e2520] shrink-0">
                            <svg className="w-4 h-4 text-[#7a6a5a] shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                            </svg>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search markets…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-white placeholder-[#4a3a2a] focus:outline-none"
                            />
                            <button
                                onClick={() => setOpen(false)}
                                className="text-[#7a6a5a] hover:text-white transition-colors p-1"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                            </button>
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto flex-1 py-2">
                            {filtered ? (
                                // Search results — flat list
                                filtered.length === 0 ? (
                                    <p className="text-center text-sm text-[#4a3a2a] py-8">No results</p>
                                ) : (
                                    filtered.map((m) => (
                                        <MarketRow
                                            key={m.symbol}
                                            market={m}
                                            selected={selected}
                                            onSelect={() => { onSelect(m.symbol); setOpen(false) }}
                                        />
                                    ))
                                )
                            ) : (
                                // Grouped view
                                MARKET_GROUPS.map((g) => {
                                    const rows = g.symbols
                                        .map((s) => markets.find((m) => m.symbol === s))
                                        .filter(Boolean) as Market[]
                                    if (!rows.length) return null
                                    return (
                                        <div key={g.label}>
                                            <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#4a3a2a]">
                                                {g.label}
                                            </p>
                                            {rows.map((m) => (
                                                <MarketRow
                                                    key={m.symbol}
                                                    market={m}
                                                    selected={selected}
                                                    onSelect={() => { onSelect(m.symbol); setOpen(false) }}
                                                />
                                            ))}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

function MarketRow({
    market,
    selected,
    onSelect,
}: {
    market: Market
    selected: string
    onSelect: () => void
}) {
    const isSelected = market.symbol === selected
    const price = market.priceUsd
        ? parseFloat(market.priceUsd).toLocaleString('en-US', { maximumFractionDigits: 4 })
        : null

    return (
        <button
            onClick={onSelect}
            className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#1a1210] ${isSelected ? 'bg-[#1a1210]' : ''}`}
        >
            <TokenIcon symbol={market.symbol} size={32} />
            <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white">{market.symbol}</span>
                    <span className="text-[10px] text-[#4a3a2a]">/ USD</span>
                </div>
                <div className="text-xs text-[#7a6a5a] truncate">
                    {price ? `$${price}` : 'No price data'}
                </div>
            </div>
            {isSelected && (
                <svg className="w-4 h-4 text-[#FF5733] shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
            )}
        </button>
    )
}


// ─── Candlestick chart ────────────────────────────────────────────────────────
function CandleChart({ symbol, period }: { symbol: string; period: string }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
    const [error, setError] = useState<string | null>(null)

    const loadCandles = useCallback(async () => {
        setError(null)
        try {
            const res = await fetch(`/api/futures/candles?symbol=${symbol}&period=${period}&limit=300`)
            const data = await res.json()
            if (!data.candles?.length) return
            if (seriesRef.current) {
                seriesRef.current.setData(
                    data.candles.map((c: any) => ({ ...c, time: c.time as Time })),
                )
            }
        } catch {
            setError('Failed to load chart data')
        }
    }, [symbol, period])

    useEffect(() => {
        if (!containerRef.current) return

        const chart = createChart(containerRef.current, {
            layout: {
                background: { color: '#0e0a08' },
                textColor: '#7a6a5a',
                attributionLogo: false,
            },
            grid: {
                vertLines: { color: '#1a1210' },
                horzLines: { color: '#1a1210' },
            },
            crosshair: {
                vertLine: { color: '#FF5733', width: 1, style: 3 },
                horzLine: { color: '#FF5733', width: 1, style: 3 },
            },
            rightPriceScale: { borderColor: '#2e2520' },
            timeScale: { borderColor: '#2e2520', timeVisible: true },
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
        })

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        })

        chartRef.current = chart
        seriesRef.current = series

        const ro = new ResizeObserver(() => {
            if (containerRef.current) {
                chart.resize(containerRef.current.clientWidth, containerRef.current.clientHeight)
            }
        })
        ro.observe(containerRef.current)

        loadCandles()

        return () => {
            ro.disconnect()
            chart.remove()
            chartRef.current = null
            seriesRef.current = null
        }
    }, [])

    useEffect(() => { loadCandles() }, [loadCandles])

    return (
        <div className="relative w-full h-full">
            <div ref={containerRef} className="w-full h-full" />
            {error && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-[#7a6a5a]">
                    {error}
                </div>
            )}
        </div>
    )
}


// ─── Leverage breakdown ───────────────────────────────────────────────────────
/**
 * Shows users exactly what leverage means for THEIR numbers:
 * - How much they actually control
 * - What happens at +5% / +10% / +20% / liq scenarios
 */
function LeverageBreakdown({
    col,
    sizeUsd,
    leverage,
    side,
    liqPrice,
    markPrice,
}: {
    col: number
    sizeUsd: number
    leverage: number
    side: 'long' | 'short'
    liqPrice: number | null
    markPrice: number | null
}) {
    // Price move scenarios to show
    const scenarios = [5, 10, 20] as const

    // PnL for a given % price move (positive = price went in your favour)
    const pnl = (movePct: number) => (sizeUsd * movePct) / 100
    const returnPct = (movePct: number) => (pnl(movePct) / col) * 100

    // Distance to liquidation as a % of current price
    const liqPct = liqPrice && markPrice
        ? (Math.abs(markPrice - liqPrice) / markPrice) * 100
        : null

    const isLong = side === 'long'

    return (
        <div className="mt-2 rounded-lg border border-[#2e2520] overflow-hidden text-[11px]">
            {/* Header — what you actually control */}
            <div className="px-3 py-2 bg-[#1a1210] border-b border-[#2e2520] flex items-center justify-between">
                <span className="text-[#7a6a5a]">Your <span className="text-white font-semibold">${col.toFixed(0)}</span> controls</span>
                <span className="text-white font-bold">${sizeUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} position</span>
            </div>

            {/* Scenario table */}
            <div className="divide-y divide-[#1a1210]">
                {/* Column headers */}
                <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] text-[#4a3a2a] font-medium">
                    <span>Price move</span>
                    <span className="text-center">Profit / Loss</span>
                    <span className="text-right">Return on $</span>
                </div>

                {/* Winning scenarios */}
                {scenarios.map((pct) => {
                    const gain = pnl(pct)
                    const ret = returnPct(pct)
                    return (
                        <div key={pct} className="grid grid-cols-3 px-3 py-1.5 items-center">
                            <span className="text-[#4ade80]">
                                {isLong ? '▲' : '▼'} {pct}%
                            </span>
                            <span className="text-center text-[#4ade80] font-semibold">
                                +${gain.toFixed(2)}
                            </span>
                            <span className="text-right text-[#4ade80]">
                                +{ret.toFixed(0)}%
                            </span>
                        </div>
                    )
                })}

                {/* Losing scenarios (same % moves, but against you) */}
                {scenarios.map((pct) => {
                    const loss = pnl(pct)
                    const ret = returnPct(pct)
                    return (
                        <div key={`loss-${pct}`} className="grid grid-cols-3 px-3 py-1.5 items-center">
                            <span className="text-[#f87171]">
                                {isLong ? '▼' : '▲'} {pct}%
                            </span>
                            <span className="text-center text-[#f87171] font-semibold">
                                −${loss.toFixed(2)}
                            </span>
                            <span className="text-right text-[#f87171]">
                                −{ret.toFixed(0)}%
                            </span>
                        </div>
                    )
                })}

                {/* Liquidation row */}
                <div className="grid grid-cols-3 px-3 py-1.5 items-center bg-[#1c0a0a]">
                    <span className="text-[#ef4444] font-semibold">☠ Liq.</span>
                    <span className="text-center text-[#ef4444] font-semibold">
                        −${col.toFixed(2)}
                    </span>
                    <span className="text-right text-[#ef4444]">
                        {liqPct != null
                            ? `${isLong ? '▼' : '▲'} ${liqPct.toFixed(2)}% move`
                            : `▼ ${(90 / leverage).toFixed(2)}% move`}
                    </span>
                </div>
            </div>

            {/* Plain-English summary */}
            <div className="px-3 py-2 bg-[#0e0a08] border-t border-[#2e2520] text-[10px] text-[#4a3a2a] leading-relaxed">
                {leverage === 1
                    ? 'At 1× you own the position outright — profits and losses match the price move directly.'
                    : <>At <span className="text-white">{leverage}×</span>, every 1% price move = <span className="text-white">{leverage}%</span> gain or loss on your collateral. You get liquidated after a{' '}
                      <span className="text-[#ef4444]">{liqPct != null ? liqPct.toFixed(2) : (90 / leverage).toFixed(2)}% adverse move</span>.
                    </>
                }
            </div>
        </div>
    )
}


// ─── Order form ───────────────────────────────────────────────────────────────
function OrderForm({
    symbol,
    markPrice,
    onOrderPlaced,
}: {
    symbol: string
    markPrice: number | null
    onOrderPlaced: () => void
}) {
    const [side, setSide] = useState<'long' | 'short'>('long')
    const [collateralUsd, setCollateralUsd] = useState('')
    const [leverage, setLeverage] = useState(5)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const FEE_BPS = 10
    const col = parseFloat(collateralUsd) || 0
    const sizeUsd = col * leverage
    const feeUsd = (sizeUsd * FEE_BPS) / 10_000
    const liqPrice = markPrice
        ? side === 'long'
            ? markPrice * (1 - 1 / leverage * 0.9)
            : markPrice * (1 + 1 / leverage * 0.9)
        : null

    const handleSubmit = async () => {
        setError(null)
        setSuccess(null)
        if (!col || col < 10) { setError('Minimum collateral is $10'); return }
        setLoading(true)
        try {
            const res = await fetch('/api/futures/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, side, collateralUsd: col, leverage }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Order failed')
            setSuccess(`${side.toUpperCase()} ${symbol}/USD ${leverage}x opened`)
            setCollateralUsd('')
            onOrderPlaced()
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-3 h-full overflow-y-auto">
            <div className="text-xs text-[#7a6a5a] uppercase tracking-wide font-semibold">Place Order</div>

            <div className="flex rounded-md overflow-hidden border border-[#2e2520]">
                <button
                    onClick={() => setSide('long')}
                    className={`flex-1 py-2 text-sm font-semibold transition-colors ${side === 'long'
                        ? 'bg-[#166534] text-[#4ade80]'
                        : 'text-[#7a6a5a] hover:text-white'
                        }`}
                >
                    Long
                </button>
                <button
                    onClick={() => setSide('short')}
                    className={`flex-1 py-2 text-sm font-semibold transition-colors ${side === 'short'
                        ? 'bg-[#7f1d1d] text-[#f87171]'
                        : 'text-[#7a6a5a] hover:text-white'
                        }`}
                >
                    Short
                </button>
            </div>

            <div>
                <label className="block text-xs text-[#7a6a5a] mb-1">Collateral (USDC)</label>
                <div className="relative">
                    <input
                        type="number"
                        placeholder="0.00"
                        value={collateralUsd}
                        onChange={(e) => setCollateralUsd(e.target.value)}
                        className="w-full bg-[#1a1210] border border-[#2e2520] rounded-md px-3 py-2 text-sm text-white placeholder-[#4a3a2a] focus:outline-none focus:border-[#FF5733]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7a6a5a]">USDC</span>
                </div>
            </div>

            <div>
                <div className="flex justify-between text-xs text-[#7a6a5a] mb-1">
                    <span>Leverage</span>
                    <span className="text-white font-bold">{leverage}x</span>
                </div>
                <input
                    type="range"
                    min={1}
                    max={50}
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="w-full accent-[#FF5733]"
                />
                <div className="flex justify-between text-[10px] text-[#4a3a2a] mt-0.5">
                    <span>1x</span><span>10x</span><span>25x</span><span>50x</span>
                </div>
                {/* Leverage explainer */}
                {col > 0 ? (
                    <LeverageBreakdown col={col} sizeUsd={sizeUsd} leverage={leverage} side={side} liqPrice={liqPrice} markPrice={markPrice} />
                ) : (
                    <p className="text-[10px] text-[#4a3a2a] mt-1.5 leading-relaxed">
                        Enter a collateral amount to see what leverage means for your trade.
                    </p>
                )}
            </div>

            <div className="bg-[#1a1210] rounded-md p-3 text-xs flex flex-col gap-1.5">
                <div className="flex justify-between">
                    <span className="text-[#7a6a5a]">Position Size</span>
                    <span className="text-white">${sizeUsd > 0 ? sizeUsd.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[#7a6a5a]">Entry Price</span>
                    <span className="text-white">
                        {markPrice ? `$${markPrice.toLocaleString('en-US', { maximumFractionDigits: 4 })}` : '—'}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[#ef4444]">Liq. Price</span>
                    <span className="text-[#ef4444]">
                        {liqPrice ? `$${liqPrice.toLocaleString('en-US', { maximumFractionDigits: 4 })}` : '—'}
                    </span>
                </div>
                {/* Distance to liquidation as a % — useful at a glance */}
                {liqPrice && markPrice && (
                    <div className="flex justify-between">
                        <span className="text-[#7a6a5a]">Liq. Distance</span>
                        <span className="text-[#f97316]">
                            {(Math.abs(markPrice - liqPrice) / markPrice * 100).toFixed(2)}% move
                        </span>
                    </div>
                )}
                <div className="border-t border-[#2e2520] my-0.5" />
                <div className="flex justify-between">
                    <span className="text-[#7a6a5a]">Open Fee (0.1%)</span>
                    <span className="text-[#f97316]">
                        {sizeUsd > 0 ? `−$${feeUsd.toFixed(2)}` : '—'}
                    </span>
                </div>
                <div className="flex justify-between font-semibold">
                    <span className="text-[#7a6a5a]">You Pay</span>
                    <span className="text-white">
                        {col > 0 ? `$${(col + feeUsd).toFixed(2)}` : '—'}
                    </span>
                </div>
            </div>

            {error && <div className="text-xs text-[#ef4444] bg-[#1c0a0a] rounded-md px-3 py-2">{error}</div>}
            {success && <div className="text-xs text-[#4ade80] bg-[#0a1c0a] rounded-md px-3 py-2">{success}</div>}

            <button
                onClick={handleSubmit}
                disabled={loading}
                className={`py-2.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 ${side === 'long'
                    ? 'bg-[#166534] hover:bg-[#15803d] text-[#4ade80]'
                    : 'bg-[#7f1d1d] hover:bg-[#991b1b] text-[#f87171]'
                    }`}
            >
                {loading ? 'Opening…' : `${side === 'long' ? 'Buy / Long' : 'Sell / Short'} ${symbol}`}
            </button>
        </div>
    )
}


// ─── SL/TP editor ─────────────────────────────────────────────────────────────
function SltpEditor({
    position,
    onSaved,
}: {
    position: Position
    onSaved: () => void
}) {
    const [slInput, setSlInput] = useState(position.stop_loss ? String(position.stop_loss) : '')
    const [tpInput, setTpInput] = useState(position.take_profit ? String(position.take_profit) : '')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const save = async (type: 'stop_loss' | 'take_profit') => {
        const raw = type === 'stop_loss' ? slInput : tpInput
        const price = parseFloat(raw)
        if (!raw) {
            const orderId = type === 'stop_loss' ? position.sl_order_id : position.tp_order_id
            if (!orderId) return
            setSaving(true)
            await fetch(`/api/futures/orders?id=${orderId}`, { method: 'DELETE' })
            setSaving(false)
            onSaved()
            return
        }
        if (isNaN(price) || price <= 0) { setError('Invalid price'); return }
        setSaving(true)
        setError(null)
        const res = await fetch('/api/futures/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ positionId: position.id, type, triggerPrice: price }),
        })
        const data = await res.json()
        setSaving(false)
        if (!res.ok) { setError(data.error ?? 'Failed'); return }
        onSaved()
    }

    return (
        <div className="flex flex-col gap-2">
            {error && <p className="text-[10px] text-[#ef4444]">{error}</p>}
            <div className="flex items-center gap-2">
                <span className="w-6 text-[10px] text-[#ef4444] font-bold">SL</span>
                <input
                    type="number"
                    placeholder={position.stop_loss ? `$${position.stop_loss}` : 'Not set'}
                    value={slInput}
                    onChange={(e) => setSlInput(e.target.value)}
                    className="w-28 bg-[#0e0a08] border border-[#2e2520] rounded px-2 py-1 text-[11px] text-white placeholder-[#4a3a2a] focus:outline-none focus:border-[#ef4444]"
                />
                <button
                    onClick={() => save('stop_loss')}
                    disabled={saving}
                    className="px-2 py-1 rounded text-[10px] bg-[#2e2520] hover:bg-[#3e3020] text-[#7a6a5a] hover:text-white transition-colors disabled:opacity-40"
                >
                    {saving ? '…' : slInput === '' && position.sl_order_id ? 'Clear' : 'Set'}
                </button>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-6 text-[10px] text-[#4ade80] font-bold">TP</span>
                <input
                    type="number"
                    placeholder={position.take_profit ? `$${position.take_profit}` : 'Not set'}
                    value={tpInput}
                    onChange={(e) => setTpInput(e.target.value)}
                    className="w-28 bg-[#0e0a08] border border-[#2e2520] rounded px-2 py-1 text-[11px] text-white placeholder-[#4a3a2a] focus:outline-none focus:border-[#4ade80]"
                />
                <button
                    onClick={() => save('take_profit')}
                    disabled={saving}
                    className="px-2 py-1 rounded text-[10px] bg-[#2e2520] hover:bg-[#3e3020] text-[#7a6a5a] hover:text-white transition-colors disabled:opacity-40"
                >
                    {saving ? '…' : tpInput === '' && position.tp_order_id ? 'Clear' : 'Set'}
                </button>
            </div>
        </div>
    )
}


// ─── Positions panel ──────────────────────────────────────────────────────────
function PositionsPanel({
    positions,
    loading,
    closingId,
    onClose,
    onOrderSaved,
}: {
    positions: Position[]
    loading: boolean
    closingId: string | null
    onClose: (id: string) => void
    onOrderSaved: () => void
}) {
    const [expandedId, setExpandedId] = useState<string | null>(null)

    if (loading) {
        return (
            <div className="flex items-center justify-center py-6 text-sm text-[#7a6a5a]">
                Loading positions…
            </div>
        )
    }
    if (!positions.length) {
        return (
            <div className="flex items-center justify-center py-6 text-sm text-[#7a6a5a]">
                No open positions
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-175">
                <thead>
                    <tr className="text-[#7a6a5a] border-b border-[#2e2520]">
                        {['Pair', 'Side', 'Size', 'Entry', 'Mark', 'Liq.', 'PnL', 'SL / TP', ''].map((h) => (
                            <th key={h} className={`pb-2 pr-4 font-medium ${h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {positions.map((p) => {
                        const up = p.unrealised_pnl >= 0
                        const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
                        const expanded = expandedId === p.id
                        return (
                            <>
                                <tr key={p.id} className="border-b border-[#1a1210] hover:bg-[#120c0a]">
                                    <td className="py-2 pr-4 text-white font-medium">{p.pair}</td>
                                    <td className="py-2 pr-4">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.side === 'long' ? 'bg-[#166534] text-[#4ade80]' : 'bg-[#7f1d1d] text-[#f87171]'}`}>
                                            {p.side.toUpperCase()} {p.leverage}x
                                        </span>
                                    </td>
                                    <td className="py-2 pr-4 text-white">${fmt(p.size_usd)}</td>
                                    <td className="py-2 pr-4 text-[#7a6a5a]">${fmt(p.entry_price)}</td>
                                    <td className="py-2 pr-4 text-white">${fmt(p.mark_price)}</td>
                                    <td className="py-2 pr-4 text-[#ef4444]">${fmt(p.liquidation_price)}</td>
                                    <td className={`py-2 pr-4 font-semibold ${up ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                                        {up ? '+' : ''}${fmt(p.unrealised_pnl)}
                                        <span className="ml-1 text-[10px] opacity-70">
                                            ({up ? '+' : ''}{p.pnl_pct.toFixed(1)}%)
                                        </span>
                                    </td>
                                    <td className="py-2 pr-4">
                                        <div className="flex gap-1.5">
                                            {p.stop_loss && <span className="text-[10px] text-[#ef4444]">SL ${fmt(p.stop_loss)}</span>}
                                            {p.take_profit && <span className="text-[10px] text-[#4ade80]">TP ${fmt(p.take_profit)}</span>}
                                            {!p.stop_loss && !p.take_profit && <span className="text-[10px] text-[#4a3a2a]">—</span>}
                                        </div>
                                    </td>
                                    <td className="py-2 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => setExpandedId(expanded ? null : p.id)}
                                                className="px-2 py-1 rounded text-[10px] font-semibold bg-[#2e2520] hover:bg-[#3e3020] text-[#7a6a5a] hover:text-white transition-colors"
                                            >
                                                SL/TP
                                            </button>
                                            <button
                                                onClick={() => onClose(p.id)}
                                                disabled={closingId === p.id}
                                                className="px-2.5 py-1 rounded text-[10px] font-semibold bg-[#2e2520] hover:bg-[#FF5733] hover:text-white text-[#7a6a5a] transition-colors disabled:opacity-40"
                                            >
                                                {closingId === p.id ? '…' : 'Close'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {expanded && (
                                    <tr key={`${p.id}-sltp`} className="border-b border-[#1a1210] bg-[#0e0a08]">
                                        <td colSpan={9} className="px-4 py-3">
                                            <SltpEditor
                                                position={p}
                                                onSaved={() => { setExpandedId(null); onOrderSaved() }}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}


// ─── Page ─────────────────────────────────────────────────────────────────────
const PERIODS = ['1m', '5m', '15m', '1h', '4h', '1d']

export default function FuturesPage() {
    const router = useRouter()

    const [markets, setMarkets] = useState<Market[]>([])
    const [selectedMkt, setSelectedMkt] = useState('ETH')
    const [period, setPeriod] = useState('1h')
    const [positions, setPositions] = useState<Position[]>([])
    const [posLoading, setPosLoading] = useState(true)
    const [closingId, setClosingId] = useState<string | null>(null)
    const [closeError, setCloseError] = useState<string | null>(null)

    const currentMarket = markets.find((m) => m.symbol === selectedMkt)
    const markPrice = currentMarket?.priceUsd ? parseFloat(currentMarket.priceUsd) : null

    useEffect(() => {
        void (async () => {
            const { data } = await supabase.auth.getUser()
            if (!data.user) router.replace('/auth')
        })()
    }, [router])

    const fetchMarkets = useCallback(async () => {
        try {
            const res = await fetch('/api/futures/markets')
            const data = await res.json()
            if (data.markets) {
                const active: Market[] = data.markets.filter((m: Market) => m.priceUsd !== null)
                setMarkets(active)
                // If the selected market was dropped, switch to the first available
                setSelectedMkt((prev) => active.find((m) => m.symbol === prev) ? prev : (active[0]?.symbol ?? prev))
            }
        } catch { /* ignore */ }
    }, [])

    const fetchPositions = useCallback(async () => {
        setPosLoading(true)
        try {
            const res = await fetch('/api/futures/positions')
            const data = await res.json()
            if (data.positions) setPositions(data.positions)
        } catch { /* ignore */ }
        finally { setPosLoading(false) }
    }, [])

    useEffect(() => {
        fetchMarkets()
        fetchPositions()
        const mktTimer = setInterval(fetchMarkets, 10_000)
        const posTimer = setInterval(fetchPositions, 15_000)
        return () => { clearInterval(mktTimer); clearInterval(posTimer) }
    }, [fetchMarkets, fetchPositions])

    const handleClose = async (positionId: string) => {
        setCloseError(null)
        setClosingId(positionId)
        try {
            const res = await fetch('/api/futures/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ positionId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Close failed')
            await fetchPositions()
        } catch (e: any) {
            setCloseError(e.message)
        } finally {
            setClosingId(null)
        }
    }

    return (
        <div className="min-h-screen bg-[#0d0a07] flex flex-col">
            <Topbar />
            <div className="flex flex-1 md:overflow-hidden md:h-[calc(100vh-56px)]">
                <Sidebar />

                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto md:overflow-hidden">

                    {/* ── Chart header bar ── */}
                    <div className="flex items-center gap-3 px-3 py-2 border-b border-[#2e2520] shrink-0 bg-[#0e0a08] flex-wrap gap-y-2">
                        {/* Market picker trigger */}
                        <MarketPicker
                            markets={markets}
                            selected={selectedMkt}
                            onSelect={setSelectedMkt}
                        />

                        {/* Divider */}
                        <div className="hidden md:block w-px h-8 bg-[#2e2520]" />

                        {/* Mark price (desktop) */}
                        {markPrice && (
                            <div className="hidden md:flex flex-col leading-tight">
                                <span className="text-base font-bold text-white">
                                    ${markPrice.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                                </span>
                                <span className="text-[10px] text-[#7a6a5a]">Mark Price</span>
                            </div>
                        )}

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Period buttons */}
                        <div className="flex items-center gap-1">
                            {PERIODS.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-2.5 py-1 rounded text-xs transition-colors ${period === p
                                        ? 'bg-[#2e2520] text-white'
                                        : 'text-[#7a6a5a] hover:text-white'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Chart + Order form ── */}
                    <div className="flex flex-col md:flex-row md:flex-1 md:min-h-0">

                        <div className="flex flex-col min-w-0 md:flex-1 md:min-h-0">
                            <div className="h-75 md:h-auto md:flex-1 md:min-h-0">
                                <CandleChart symbol={selectedMkt} period={period} />
                            </div>
                        </div>

                        <div className="w-full md:w-64 md:shrink-0 border-t md:border-t-0 md:border-l border-[#2e2520] p-4 bg-[#0e0a08] flex flex-col">
                            <OrderForm
                                symbol={selectedMkt}
                                markPrice={markPrice}
                                onOrderPlaced={fetchPositions}
                            />
                        </div>
                    </div>

                    {/* ── Positions ── */}
                    <div className="shrink-0 border-t border-[#2e2520] bg-[#0e0a08] md:max-h-60 md:overflow-y-auto">
                        <div className="px-4 pt-3 pb-1 flex items-center justify-between sticky top-0 bg-[#0e0a08] z-10">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-[#7a6a5a] uppercase tracking-wide font-semibold">
                                    Open Positions
                                </span>
                                {positions.length > 0 && (
                                    <span className="bg-[#FF5733] text-white text-[10px] rounded-full px-1.5 py-0.5">
                                        {positions.length}
                                    </span>
                                )}
                            </div>
                            {closeError && (
                                <span className="text-xs text-[#ef4444]">{closeError}</span>
                            )}
                        </div>
                        <div className="px-4 pb-4 overflow-x-auto">
                            <PositionsPanel
                                positions={positions}
                                loading={posLoading}
                                closingId={closingId}
                                onClose={handleClose}
                                onOrderSaved={fetchPositions}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
