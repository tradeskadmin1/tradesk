"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
    users: {
        total: number
        kyc: Record<string, number>
    }
    withdrawals: {
        pendingCount: number
        pendingUsd:   number
    }
    deposits: {
        last7Days: number
    }
    futures: {
        openPositions: number
    }
    recentKyc: {
        id: string
        full_name: string
        email: string
        kyc_status: string
        created_at: string
    }[]
    recentWithdrawals: {
        id: string
        status: string
        amount: string
        token_symbol: string
        auto_approved: boolean
        created_at: string
        users: { full_name: string; email: string }
    }[]
    generatedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

function fmtUsd(n: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency", currency: "USD",
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(n)
}

function StatCard({
    label, value, sub, accent,
}: {
    label: string
    value: string | number
    sub?: string
    accent?: boolean
}) {
    return (
        <div className={`bg-[#1a1410] border rounded-xl px-4 py-3 sm:px-5 sm:py-4 ${
            accent ? "border-[#FF5733]/30" : "border-[#2e2520]"
        }`}>
            <div className="font-mono text-[9px] sm:text-[10px] text-[#7a6a5a] uppercase tracking-widest mb-1 leading-tight">{label}</div>
            <div className={`font-mono text-[22px] sm:text-[26px] font-bold leading-none ${accent ? "text-[#FF5733]" : "text-white"}`}>
                {value}
            </div>
            {sub && <div className="font-mono text-[10px] sm:text-[11px] text-[#4a3a2a] mt-1">{sub}</div>}
        </div>
    )
}

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse rounded-xl bg-[#1a1410] ${className}`} />
}

const KYC_COLOR: Record<string, string> = {
    approved: "text-emerald-400",
    pending:  "text-amber-400",
    none:     "text-[#4a3a2a]",
    rejected: "text-red-400",
}

const KYC_BAR: Record<string, string> = {
    approved: "bg-emerald-400",
    pending:  "bg-amber-400",
    rejected: "bg-red-400",
    none:     "bg-[#4a3a2a]",
}

const W_STATUS_STYLE: Record<string, string> = {
    pending:   "bg-amber-400/10 text-amber-400 border-amber-400/20",
    approved:  "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    completed: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    rejected:  "bg-red-400/10 text-red-400 border-red-400/20",
    failed:    "bg-red-400/10 text-red-400 border-red-400/20",
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
    const router = useRouter()
    const [stats,   setStats]   = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/stats")
            if (res.ok) setStats(await res.json())
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void load() }, [load])

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg sm:text-xl font-mono text-white font-bold">Overview</h1>
                    {stats?.generatedAt && (
                        <p className="font-mono text-[10px] sm:text-[11px] text-[#4a3a2a] mt-0.5">
                            Updated {fmtDate(stats.generatedAt)}
                        </p>
                    )}
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="font-mono text-[12px] border border-[#2e2520] hover:border-[#FF5733]/30 text-[#7a6a5a] hover:text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                >
                    ↻ Refresh
                </button>
            </div>

            {/* ── Stat cards ───────────────────────────────────────────── */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 sm:h-24" />)}
                </div>
            ) : stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    <StatCard
                        label="Total Users"
                        value={stats.users.total}
                        sub={`${stats.users.kyc.approved ?? 0} verified`}
                    />
                    <StatCard
                        label="Pending Withdrawals"
                        value={stats.withdrawals.pendingCount}
                        sub={fmtUsd(stats.withdrawals.pendingUsd)}
                        accent={stats.withdrawals.pendingCount > 0}
                    />
                    <StatCard
                        label="Deposits (7 d)"
                        value={stats.deposits.last7Days}
                        sub="transactions"
                    />
                    <StatCard
                        label="Open Positions"
                        value={stats.futures.openPositions}
                        sub="futures"
                    />
                </div>
            )}

            {/* ── KYC breakdown + queue ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

                {/* KYC breakdown */}
                <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 border-b border-[#2e2520] font-mono text-[13px] text-white font-bold">
                        KYC Breakdown
                    </div>
                    {loading ? (
                        <div className="p-4 space-y-2">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}
                        </div>
                    ) : stats && (
                        <div className="divide-y divide-[#2e2520]">
                            {(["approved", "pending", "none", "rejected"] as const).map((s) => {
                                const count = stats.users.kyc[s] ?? 0
                                const pct   = stats.users.total > 0
                                    ? Math.round((count / stats.users.total) * 100)
                                    : 0
                                return (
                                    <div key={s} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-mono text-[12px] capitalize ${KYC_COLOR[s]}`}>{s}</div>
                                            <div className="mt-1 h-1 bg-[#2e2520] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${KYC_BAR[s]}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="font-mono text-[13px] text-white w-7 text-right shrink-0">{count}</div>
                                        <div className="font-mono text-[10px] text-[#4a3a2a] w-8 text-right shrink-0">{pct}%</div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Pending KYC queue */}
                <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 border-b border-[#2e2520] flex items-center justify-between">
                        <span className="font-mono text-[13px] text-white font-bold">KYC Queue</span>
                        {stats && (stats.users.kyc.pending ?? 0) > 0 && (
                            <span className="font-mono text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                                {stats.users.kyc.pending} pending
                            </span>
                        )}
                    </div>
                    {loading ? (
                        <div className="p-4 space-y-2">
                            {[1, 2].map((i) => <Skeleton key={i} className="h-12" />)}
                        </div>
                    ) : !stats || stats.recentKyc.length === 0 ? (
                        <div className="px-5 py-8 text-center font-mono text-[12px] text-[#4a3a2a]">
                            No pending KYC submissions
                        </div>
                    ) : (
                        <div className="divide-y divide-[#2e2520]">
                            {stats.recentKyc.map((u) => (
                                <div
                                    key={u.id}
                                    onClick={() => router.push("/admin/kyc")}
                                    className="flex items-center gap-3 px-4 sm:px-5 py-3 cursor-pointer hover:bg-[#1e1612] transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-[#2a1a14] flex items-center justify-center font-mono text-[10px] text-[#FF5733] font-bold shrink-0">
                                        {(u.full_name ?? u.email ?? "?")[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-mono text-[12px] text-white truncate">
                                            {u.full_name ?? "—"}
                                        </div>
                                        <div className="font-mono text-[10px] text-[#7a6a5a] truncate">{u.email}</div>
                                    </div>
                                    <div className="font-mono text-[10px] text-[#7a6a5a] shrink-0 hidden sm:block">
                                        {fmtDate(u.created_at)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Recent withdrawals ───────────────────────────────────── */}
            <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-[#2e2520] flex items-center justify-between">
                    <span className="font-mono text-[13px] text-white font-bold">Recent Withdrawals</span>
                    <button
                        onClick={() => router.push("/admin/withdrawals")}
                        className="font-mono text-[10px] text-[#FF5733] hover:underline cursor-pointer"
                    >
                        View queue →
                    </button>
                </div>

                {loading ? (
                    <div className="p-4 space-y-2">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
                    </div>
                ) : !stats || stats.recentWithdrawals.length === 0 ? (
                    <div className="px-5 py-8 text-center font-mono text-[12px] text-[#4a3a2a]">
                        No recent withdrawals
                    </div>
                ) : (
                    <div className="divide-y divide-[#2e2520]">
                        {stats.recentWithdrawals.map((w) => (
                            <div key={w.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                                {/* User info */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-mono text-[12px] text-white truncate">
                                        {w.users?.full_name ?? w.users?.email ?? "Unknown"}
                                    </div>
                                    <div className="font-mono text-[10px] text-[#7a6a5a] flex items-center gap-1.5 flex-wrap">
                                        <span>{fmtDate(w.created_at)}</span>
                                        {w.auto_approved && (
                                            <span className="text-[#4a3a2a]">· auto</span>
                                        )}
                                    </div>
                                </div>

                                {/* Amount — hidden on very small screens */}
                                <div className="font-mono text-[12px] text-white shrink-0 hidden sm:block">
                                    {parseFloat(w.amount).toFixed(2)}{" "}
                                    <span className="text-[10px] text-[#7a6a5a]">{w.token_symbol}</span>
                                </div>

                                {/* Amount shown inline on xs */}
                                <div className="font-mono text-[11px] text-white shrink-0 sm:hidden">
                                    {parseFloat(w.amount).toFixed(2)}
                                </div>

                                {/* Status badge */}
                                <span className={`font-mono text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 ${W_STATUS_STYLE[w.status] ?? ""}`}>
                                    {w.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    )
}
