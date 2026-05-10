"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createChart, IChartApi, ISeriesApi, Time, CandlestickSeries } from "lightweight-charts"
import { supabase } from "@/lib/supabase"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"


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
}


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
            </div>

            <div className="bg-[#1a1210] rounded-md p-3 text-xs flex flex-col gap-1.5">
                <div className="flex justify-between">
                    <span className="text-[#7a6a5a]">Size</span>
                    <span className="text-white">${sizeUsd > 0 ? sizeUsd.toFixed(2) : '—'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[#7a6a5a]">Entry Price</span>
                    <span className="text-white">
                        {markPrice ? `$${markPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—'}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[#7a6a5a]">Liq. Price</span>
                    <span className="text-[#ef4444]">
                        {liqPrice ? `$${liqPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—'}
                    </span>
                </div>
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



function PositionsPanel({
    positions,
    loading,
    closingId,
    onClose,
}: {
    positions: Position[]
    loading: boolean
    closingId: string | null
    onClose: (id: string) => void
}) {
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
                        {['Pair', 'Side', 'Size', 'Collateral', 'Entry', 'Mark', 'Liq.', 'PnL', ''].map((h) => (
                            <th key={h} className={`pb-2 pr-4 font-medium ${h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {positions.map((p) => {
                        const up = p.unrealised_pnl >= 0
                        const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
                        return (
                            <tr key={p.id} className="border-b border-[#1a1210] hover:bg-[#120c0a]">
                                <td className="py-2 pr-4 text-white font-medium">{p.pair}</td>
                                <td className="py-2 pr-4">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.side === 'long' ? 'bg-[#166534] text-[#4ade80]' : 'bg-[#7f1d1d] text-[#f87171]'
                                        }`}>
                                        {p.side.toUpperCase()} {p.leverage}x
                                    </span>
                                </td>
                                <td className="py-2 pr-4 text-white">${fmt(p.size_usd)}</td>
                                <td className="py-2 pr-4 text-[#7a6a5a]">${fmt(p.collateral_usd)}</td>
                                <td className="py-2 pr-4 text-[#7a6a5a]">${fmt(p.entry_price)}</td>
                                <td className="py-2 pr-4 text-white">${fmt(p.mark_price)}</td>
                                <td className="py-2 pr-4 text-[#ef4444]">${fmt(p.liquidation_price)}</td>
                                <td className={`py-2 pr-4 font-semibold ${up ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                                    {up ? '+' : ''}${fmt(p.unrealised_pnl)}
                                    <span className="ml-1 text-[10px] opacity-70">
                                        ({up ? '+' : ''}{p.pnl_pct.toFixed(1)}%)
                                    </span>
                                </td>
                                <td className="py-2 text-right">
                                    <button
                                        onClick={() => onClose(p.id)}
                                        disabled={closingId === p.id}
                                        className="px-2.5 py-1 rounded text-[10px] font-semibold bg-[#2e2520] hover:bg-[#FF5733] hover:text-white text-[#7a6a5a] transition-colors disabled:opacity-40"
                                    >
                                        {closingId === p.id ? '…' : 'Close'}
                                    </button>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}



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
            if (data.markets) setMarkets(data.markets)
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

            <div className="flex flex-1 min-h-0" style={{ height: 'calc(100vh - 56px)' }}>
                <Sidebar />
                <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
                    <div className="flex items-center border-b border-[#2e2520] overflow-x-auto shrink-0 bg-[#0e0a08]">
                        {markets.length === 0 && (
                            <div className="px-4 py-3 text-xs text-[#4a3a2a]">Loading markets…</div>
                        )}
                        {markets.map((m) => (
                            <button
                                key={m.symbol}
                                onClick={() => setSelectedMkt(m.symbol)}
                                className={`flex flex-col items-start px-4 py-2.5 border-r border-[#2e2520] transition-colors shrink-0 ${selectedMkt === m.symbol
                                    ? 'bg-[#1a1210] border-b-2 border-b-[#FF5733]'
                                    : 'hover:bg-[#1a1210]'
                                    }`}
                            >
                                <span className={`text-sm font-bold ${selectedMkt === m.symbol ? 'text-white' : 'text-[#7a6a5a]'}`}>
                                    {m.pair}
                                </span>
                                <span className="text-xs text-[#7a6a5a]">
                                    {m.priceUsd
                                        ? `$${parseFloat(m.priceUsd).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                                        : '—'}
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-1 min-h-0">

                        <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#2e2520] shrink-0 bg-[#0e0a08]">
                                {PERIODS.map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={`px-2.5 py-0.5 rounded text-xs transition-colors ${period === p
                                            ? 'bg-[#2e2520] text-white'
                                            : 'text-[#7a6a5a] hover:text-white'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 min-h-0">
                                <CandleChart symbol={selectedMkt} period={period} />
                            </div>
                        </div>

                        <div className="w-64 shrink-0 border-l border-[#2e2520] p-4 bg-[#0e0a08] flex flex-col overflow-hidden">
                            <OrderForm
                                symbol={selectedMkt}
                                markPrice={markPrice}
                                onOrderPlaced={fetchPositions}
                            />
                        </div>
                    </div>

                    <div className="shrink-0 border-t border-[#2e2520] bg-[#0e0a08]" style={{ maxHeight: '240px', overflowY: 'auto' }}>
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
                        <div className="px-4 pb-4">
                            <PositionsPanel
                                positions={positions}
                                loading={posLoading}
                                closingId={closingId}
                                onClose={handleClose}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
