"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import dynamic from "next/dynamic"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"
import type { ChartDataPoint } from "../../components/chart"

const Chart = dynamic(() => import("../../components/chart"), { ssr: false })

const CHAIN_LABEL: Record<number, { name: string; color: string }> = {
    1:     { name: "Ethereum", color: "#627eea" },
    56:    { name: "BNB Chain", color: "#F0B90B" },
    42161: { name: "Arbitrum",  color: "#28a0f0" },
}

interface PortfolioBalance {
    tokenSymbol: string
    chainId: number
    balance: string
    usdValue: number
}

interface Summary {
    totalUsd: number
    unrealisedPnl: number
    realisedPnl: number
    openPositions: number
    balances: PortfolioBalance[]
    chart: ChartDataPoint[]
    updatedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number, compact = false) {
    if (compact && Math.abs(n) >= 1_000) {
        return new Intl.NumberFormat("en-US", {
            style:    "currency",
            currency: "USD",
            notation: "compact",
            maximumFractionDigits: 1,
        }).format(n)
    }
    return new Intl.NumberFormat("en-US", {
        style:             "currency",
        currency:          "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n)
}

function PnlBadge({ value, label }: { value: number; label: string }) {
    const pos   = value >= 0
    const color = pos ? "text-emerald-400" : "text-red-400"
    const bg    = pos ? "bg-emerald-400/10 border-emerald-400/20" : "bg-red-400/10 border-red-400/20"
    return (
        <div className={`flex flex-col gap-1 px-4 py-3 rounded-xl border ${bg}`}>
            <span className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-widest">{label}</span>
            <span className={`font-mono text-[17px] font-bold ${color}`}>
                {value >= 0 ? "+" : ""}{fmtUsd(value)}
            </span>
        </div>
    )
}

function Skeleton({ className }: { className: string }) {
    return <div className={`animate-pulse rounded-xl bg-[#1a1410] ${className}`} />
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
    const router = useRouter()

    const [summary,    setSummary]    = useState<Summary | null>(null)
    const [loading,    setLoading]    = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error,      setError]      = useState<string | null>(null)

    const loadSummary = useCallback(async () => {
        try {
            const res = await fetch("/api/portfolio/summary")
            if (res.status === 401) { router.replace("/auth"); return }
            if (!res.ok) throw new Error("Failed to load portfolio data")
            const data: Summary = await res.json()
            setSummary(data)
            setError(null)
        } catch (e: any) {
            setError(e.message ?? "Unknown error")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [router])

    useEffect(() => {
        void (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.replace("/auth"); return }
            await loadSummary()
        })()
    }, [router, loadSummary])

    const handleRefresh = () => {
        setRefreshing(true)
        void loadSummary()
    }

    // ── Derived chart trend ───────────────────────────────────────────────────
    const chartTrend = (() => {
        const pts = summary?.chart ?? []
        if (pts.length < 2) return null
        const first = pts.find((p) => p.value > 0)
        const last  = pts[pts.length - 1]
        if (!first || first === last) return null
        const pct = ((last.value - first.value) / first.value) * 100
        return pct
    })()

    return (
        <div className="min-h-screen bg-[#0d0a07]">
            <Topbar />
            <div className="flex">
                <Sidebar />
                <div className="flex-1 p-5 space-y-5 overflow-auto max-w-4xl">

                    {/* ── Header ─────────────────────────────────────────────── */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-mono text-white">Portfolio</h1>
                            <p className="font-mono text-[12px] text-[#7a6a5a]">
                                Net worth across wallets & futures
                                {summary?.updatedAt && (
                                    <> · updated {new Date(summary.updatedAt).toLocaleTimeString()}</>
                                )}
                            </p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing || loading}
                            className="flex items-center justify-center gap-2 border border-[#2e2520] hover:border-[#FF5733]/40 text-white px-4 py-2.5 rounded-xl font-mono text-[13px] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
                        >
                            {refreshing ? (
                                <>
                                    <span className="flex gap-1">
                                        {[0, 1, 2].map((i) => (
                                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#FF5733] animate-bounce"
                                                style={{ animationDelay: `${i * 0.12}s` }} />
                                        ))}
                                    </span>
                                    Refreshing...
                                </>
                            ) : "↻ Refresh"}
                        </button>
                    </div>

                    {/* ── Error state ─────────────────────────────────────────── */}
                    {error && (
                        <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-5 py-4 font-mono text-[13px] text-red-400">
                            {error}
                        </div>
                    )}

                    {/* ── Hero card — total value + chart ──────────────────────── */}
                    {loading ? (
                        <Skeleton className="h-52" />
                    ) : summary && (
                        <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl overflow-hidden">
                            {/* Value header */}
                            <div className="flex items-start justify-between px-5 pt-5 pb-2">
                                <div>
                                    <div className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-widest mb-1">
                                        Total Portfolio Value
                                    </div>
                                    <div className="font-mono text-[32px] font-bold text-white leading-none">
                                        {fmtUsd(summary.totalUsd)}
                                    </div>
                                    {chartTrend !== null && (
                                        <div className={`font-mono text-[12px] mt-1.5 ${chartTrend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                            {chartTrend >= 0 ? "▲" : "▼"} {Math.abs(chartTrend).toFixed(2)}% (30 d)
                                        </div>
                                    )}
                                </div>
                                {summary.openPositions > 0 && (
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="font-mono text-[10px] text-[#7a6a5a]">Open positions</div>
                                        <div className="font-mono text-[22px] font-bold text-white">{summary.openPositions}</div>
                                    </div>
                                )}
                            </div>

                            {/* Chart */}
                            <div className="px-0 pb-0">
                                {summary.chart.length > 1 ? (
                                    <Chart data={summary.chart} height="h-36" showTimeScale />
                                ) : (
                                    <div className="h-36 flex items-center justify-center font-mono text-[12px] text-[#4a3a2a]">
                                        Chart available after first transaction
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── PnL row ──────────────────────────────────────────────── */}
                    {loading ? (
                        <div className="grid grid-cols-2 gap-3">
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                        </div>
                    ) : summary && (
                        <div className="grid grid-cols-2 gap-3">
                            <PnlBadge value={summary.unrealisedPnl} label="Unrealised PnL" />
                            <PnlBadge value={summary.realisedPnl}   label="Realised PnL (all-time)" />
                        </div>
                    )}

                    {/* ── Asset breakdown ───────────────────────────────────────── */}
                    <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-[#2e2520] font-mono text-[13px] text-white font-bold">
                            Assets
                        </div>

                        {loading ? (
                            <div className="divide-y divide-[#2e2520]">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center justify-between px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="w-7 h-7 rounded-full" />
                                            <Skeleton className="w-24 h-4" />
                                        </div>
                                        <Skeleton className="w-20 h-4" />
                                    </div>
                                ))}
                            </div>
                        ) : !summary || summary.balances.length === 0 ? (
                            <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
                                <div className="font-mono text-[13px] text-white">No assets yet</div>
                                <div className="font-mono text-[11px] text-[#7a6a5a]">
                                    Deposit funds to get started.
                                </div>
                                <button
                                    onClick={() => router.push("/dashboard/deposit")}
                                    className="font-mono text-[12px] text-[#FF5733] border border-[#FF5733]/30 px-4 py-2 rounded-xl hover:bg-[#FF5733]/5 transition-all cursor-pointer"
                                >
                                    Deposit →
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Sort by usdValue descending */}
                                {[...summary.balances]
                                    .sort((a, b) => b.usdValue - a.usdValue)
                                    .map((asset) => {
                                        const chain    = CHAIN_LABEL[asset.chainId]
                                        const portion  = summary.totalUsd > 0
                                            ? (asset.usdValue / summary.totalUsd) * 100
                                            : 0
                                        const balance  = parseFloat(asset.balance)

                                        return (
                                            <div key={`${asset.chainId}-${asset.tokenSymbol}`}
                                                className="px-5 py-3 border-b border-[#2e2520] last:border-0">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {/* Token avatar */}
                                                        <div className="w-8 h-8 rounded-full bg-[#2a1a14] flex items-center justify-center font-mono text-[10px] text-[#FF5733] font-bold shrink-0">
                                                            {asset.tokenSymbol.slice(0, 3)}
                                                        </div>
                                                        <div>
                                                            <div className="font-mono text-[13px] text-white">
                                                                {asset.tokenSymbol}
                                                            </div>
                                                            {chain && (
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <span className="w-1.5 h-1.5 rounded-full"
                                                                        style={{ background: chain.color }} />
                                                                    <span className="font-mono text-[10px] text-[#7a6a5a]">
                                                                        {chain.name}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Values */}
                                                    <div className="text-right">
                                                        <div className="font-mono text-[13px] text-white">
                                                            {fmtUsd(asset.usdValue)}
                                                        </div>
                                                        <div className="font-mono text-[10px] text-[#7a6a5a]">
                                                            {balance.toFixed(balance < 1 ? 6 : 4)} {asset.tokenSymbol}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Portfolio share bar */}
                                                {portion > 0 && (
                                                    <div className="mt-2 h-0.5 bg-[#2e2520] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[#FF5733] rounded-full transition-all duration-500"
                                                            style={{ width: `${portion.toFixed(1)}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                            </>
                        )}
                    </div>

                    {/* ── Futures shortcut (show when positions > 0) ──────────── */}
                    {summary && summary.openPositions > 0 && (
                        <div
                            onClick={() => router.push("/dashboard/futures")}
                            className="bg-[#1a1410] border border-[#2e2520] hover:border-[#FF5733]/30 rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer transition-colors group"
                        >
                            <div>
                                <div className="font-mono text-[13px] text-white">
                                    {summary.openPositions} open futures position{summary.openPositions !== 1 ? "s" : ""}
                                </div>
                                <div className="font-mono text-[11px] text-[#7a6a5a] mt-0.5">
                                    Unrealised PnL:{" "}
                                    <span className={summary.unrealisedPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                                        {summary.unrealisedPnl >= 0 ? "+" : ""}{fmtUsd(summary.unrealisedPnl)}
                                    </span>
                                </div>
                            </div>
                            <span className="font-mono text-[#FF5733] group-hover:translate-x-1 transition-transform">
                                →
                            </span>
                        </div>
                    )}

                    {/* ── Deposit / Withdraw CTA ───────────────────────────────── */}
                    <div className="bg-[#1e1208] border border-[#FF5733]/10 rounded-xl px-5 py-4 flex items-center justify-between">
                        <div>
                            <div className="font-mono text-[13px] text-white">Fund your portfolio</div>
                            <div className="font-mono text-[11px] text-[#7a6a5a] mt-0.5">
                                Deposit directly to your custodial wallets
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => router.push("/dashboard/deposit")}
                                className="font-mono text-[12px] bg-[#FF5733] hover:bg-[#ff6a4d] text-white px-4 py-2 rounded-xl transition-all cursor-pointer"
                            >
                                Deposit →
                            </button>
                            <button
                                onClick={() => router.push("/dashboard/withdraw")}
                                className="font-mono text-[12px] border border-[#2e2520] text-[#7a6a5a] hover:text-white hover:border-white/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
                            >
                                Withdraw
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
