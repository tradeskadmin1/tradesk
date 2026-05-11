"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Topbar from "../../../components/topbar"
import Sidebar from "../../../components/sidebar"

interface ClosedPosition {
    id: string
    pair: string
    side: 'long' | 'short'
    size_usd: number
    collateral_usd: number
    leverage: number
    entry_price: number
    mark_price: number
    realised_pnl: number | null
    status: 'closed' | 'liquidated'
    opened_at: string
    closed_at: string
    created_at: string
}

function fmt(n: number, decimals = 2) {
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function duration(openedAt: string, closedAt: string) {
    const ms = new Date(closedAt).getTime() - new Date(openedAt).getTime()
    const mins = Math.floor(ms / 60_000)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ${mins % 60}m`
    return `${Math.floor(hrs / 24)}d ${hrs % 24}h`
}

export default function FuturesHistoryPage() {
    const router = useRouter()

    const [positions, setPositions] = useState<ClosedPosition[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const LIMIT = 20

    useEffect(() => {
        void (async () => {
            const { data } = await supabase.auth.getUser()
            if (!data.user) router.replace('/auth')
        })()
    }, [router])

    const fetchHistory = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/futures/history?limit=${LIMIT}&offset=${page * LIMIT}`)
            const data = await res.json()
            if (data.positions) {
                setPositions(data.positions)
                setTotal(data.total ?? 0)
            }
        } catch { /* ignore */ }
        finally { setLoading(false) }
    }, [page])

    useEffect(() => { fetchHistory() }, [fetchHistory])


    const totalPnl = positions.reduce((s, p) => s + (p.realised_pnl ?? 0), 0)
    const wins = positions.filter((p) => (p.realised_pnl ?? 0) > 0).length
    const winRate = positions.length ? ((wins / positions.length) * 100).toFixed(0) : '—'
    const totalPages = Math.ceil(total / LIMIT)

    return (
        <div className="min-h-screen bg-[#0d0a07]">
            <Topbar />
            <div className="flex">
                <Sidebar />
                <div className="flex-1 p-5 overflow-auto">

                    <div className="mb-5">
                        <h1 className="text-lg font-mono text-white">Trade History</h1>
                        <p className="text-xs text-[#7a6a5a] font-mono mt-0.5">Closed futures positions</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        {[
                            { label: 'Total Trades', value: String(total) },
                            {
                                label: 'Realised PnL',
                                value: `${totalPnl >= 0 ? '+' : ''}$${fmt(totalPnl)}`,
                                color: totalPnl >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]',
                            },
                            {
                                label: 'Win Rate',
                                value: positions.length ? `${winRate}%` : '—',
                                color: parseInt(winRate) >= 50 ? 'text-[#4ade80]' : 'text-[#ef4444]',
                            },
                            { label: 'Showing', value: `${positions.length} of ${total}` },
                        ].map((c) => (
                            <div key={c.label} className="bg-[#201710] border border-[#2e2520] rounded-lg p-4">
                                <div className="text-xs text-[#7a6a5a] mb-1">{c.label}</div>
                                <div className={`text-lg font-mono font-bold ${c.color ?? 'text-white'}`}>{c.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-[#201710] border border-[#2e2520] rounded-lg overflow-x-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-16 text-sm text-[#7a6a5a]">
                                Loading…
                            </div>
                        ) : positions.length === 0 ? (
                            <div className="flex items-center justify-center py-16 text-sm text-[#7a6a5a]">
                                No closed positions yet
                            </div>
                        ) : (
                            <table className="w-full text-xs min-w-200">
                                <thead>
                                    <tr className="text-[#7a6a5a] border-b border-[#2e2520]">
                                        {['Pair', 'Side', 'Size', 'Entry', 'Exit', 'PnL', 'Duration', 'Status', 'Closed'].map((h) => (
                                            <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map((p) => {
                                        const pnl = p.realised_pnl ?? 0
                                        const pnlPos = pnl >= 0
                                        return (
                                            <tr key={p.id} className="border-b border-[#1a1210] hover:bg-[#251810]">
                                                <td className="px-4 py-3 text-white font-medium">{p.pair}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.side === 'long'
                                                        ? 'bg-[#166534] text-[#4ade80]'
                                                        : 'bg-[#7f1d1d] text-[#f87171]'
                                                        }`}>
                                                        {p.side.toUpperCase()} {p.leverage}x
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-white">${fmt(p.size_usd)}</td>
                                                <td className="px-4 py-3 text-[#7a6a5a]">${fmt(p.entry_price)}</td>
                                                <td className="px-4 py-3 text-[#7a6a5a]">${fmt(p.mark_price)}</td>
                                                <td className={`px-4 py-3 font-semibold ${pnlPos ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                                                    {pnlPos ? '+' : ''}${fmt(pnl)}
                                                </td>
                                                <td className="px-4 py-3 text-[#7a6a5a]">
                                                    {p.closed_at ? duration(p.opened_at ?? p.created_at, p.closed_at) : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${p.status === 'liquidated'
                                                        ? 'bg-[#7f1d1d] text-[#f87171]'
                                                        : 'bg-[#1a2e1a] text-[#7a6a5a]'
                                                        }`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-[#7a6a5a]">
                                                    {p.closed_at
                                                        ? new Date(p.closed_at).toLocaleDateString('en-US', {
                                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                                        })
                                                        : '—'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-3 py-1.5 rounded text-xs bg-[#2e2520] text-[#7a6a5a] hover:text-white disabled:opacity-40 transition-colors"
                            >
                                ← Prev
                            </button>
                            <span className="text-xs text-[#7a6a5a]">
                                Page {page + 1} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="px-3 py-1.5 rounded text-xs bg-[#2e2520] text-[#7a6a5a] hover:text-white disabled:opacity-40 transition-colors"
                            >
                                Next →
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
