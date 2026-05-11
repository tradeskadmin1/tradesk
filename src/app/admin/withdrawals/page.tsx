"use client"

import { useState, useEffect, useCallback } from "react"

interface Withdrawal {
    id: string
    status: "pending" | "approved" | "rejected" | "failed" | "completed"
    amount: string
    token_symbol: string
    chain_id: number
    to_address: string
    tx_hash: string | null
    auto_approved: boolean
    rejection_reason: string | null
    created_at: string
    approved_at: string | null
    rejected_at: string | null
    users: { id: string; full_name: string; email: string }
}

type StatusFilter = "pending" | "all"

const CHAIN_NAME: Record<number, string> = {
    1: "Ethereum",
    56: "BNB Chain",
    42161: "Arbitrum",
}

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    approved: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    completed: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    rejected: "bg-red-400/10 text-red-400 border-red-400/20",
    failed: "bg-red-400/10 text-red-400 border-red-400/20",
}


function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

function shortAddr(addr: string) {
    return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—"
}

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse rounded-xl bg-[#1a1410] ${className}`} />
}


export default function AdminWithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending")
    const [actionState, setActionState] = useState<Record<string, "approving" | "rejecting" | null>>({})
    const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
    const [rejectReason, setRejectReason] = useState("")
    const [rejectError, setRejectError] = useState("")
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

    const load = useCallback(async (filter: StatusFilter = statusFilter) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/withdrawals?status=${filter}&limit=100`)
            if (res.ok) {
                const data = await res.json()
                setWithdrawals(data.withdrawals ?? [])
            }
        } finally {
            setLoading(false)
        }
    }, [statusFilter])

    useEffect(() => { void load() }, [load])

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok })
        setTimeout(() => setToast(null), 4000)
    }

    const handleApprove = async (id: string) => {
        setActionState((s) => ({ ...s, [id]: "approving" }))
        try {
            const res = await fetch(`/api/admin/withdrawals/${id}/approve`, { method: "POST" })
            const data = await res.json()
            if (!res.ok) {
                showToast(data.error ?? "Approval failed", false)
            } else {
                showToast(`Approved — tx: ${data.txHash ? shortAddr(data.txHash) : "queued"}`, true)
                setWithdrawals((prev) =>
                    statusFilter === "pending"
                        ? prev.filter((w) => w.id !== id)
                        : prev.map((w) => w.id === id ? { ...w, status: "approved" } : w),
                )
            }
        } catch {
            showToast("Network error", false)
        } finally {
            setActionState((s) => ({ ...s, [id]: null }))
        }
    }

    const confirmReject = (w: Withdrawal) => {
        setRejectReason("")
        setRejectError("")
        setRejectModal({ id: w.id, name: w.users?.full_name ?? w.users?.email ?? w.id })
    }

    const handleReject = async () => {
        if (!rejectModal) return
        if (!rejectReason.trim()) { setRejectError("Please enter a reason."); return }
        const { id } = rejectModal
        setActionState((s) => ({ ...s, [id]: "rejecting" }))
        setRejectModal(null)
        try {
            const res = await fetch(`/api/admin/withdrawals/${id}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: rejectReason.trim() }),
            })
            const data = await res.json()
            if (!res.ok) {
                showToast(data.error ?? "Rejection failed", false)
            } else {
                showToast("Withdrawal rejected — funds returned to user", true)
                setWithdrawals((prev) =>
                    statusFilter === "pending"
                        ? prev.filter((w) => w.id !== id)
                        : prev.map((w) => w.id === id ? { ...w, status: "rejected" } : w),
                )
            }
        } catch {
            showToast("Network error", false)
        } finally {
            setActionState((s) => ({ ...s, [id]: null }))
            setRejectReason("")
        }
    }

    const pendingCount = withdrawals.filter((w) => w.status === "pending").length

    return (
        <div className="p-6 space-y-5 max-w-5xl">

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-mono text-white font-bold">Withdrawals</h1>
                    <p className="font-mono text-[11px] text-[#4a3a2a] mt-0.5">
                        Review and action pending withdrawal requests
                    </p>
                </div>
                <button
                    onClick={() => void load()}
                    disabled={loading}
                    className="font-mono text-[12px] border border-[#2e2520] hover:border-[#FF5733]/30 text-[#7a6a5a] hover:text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                >
                    ↻ Refresh
                </button>
            </div>

            <div className="flex gap-2">
                {(["pending", "all"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => {
                            setStatusFilter(f)
                            void load(f)
                        }}
                        className={`font-mono text-[12px] px-4 py-1.5 rounded-lg border transition-colors cursor-pointer capitalize ${statusFilter === f
                            ? "bg-[#FF5733]/10 border-[#FF5733]/30 text-[#FF5733]"
                            : "border-[#2e2520] text-[#7a6a5a] hover:text-white"
                            }`}
                    >
                        {f === "pending" && pendingCount > 0
                            ? `Pending (${pendingCount})`
                            : f === "pending" ? "Pending" : "All"}
                    </button>
                ))}
            </div>

            <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl overflow-hidden">
                <div className="hidden lg:grid grid-cols-[1fr_110px_140px_100px_120px_120px] gap-4 px-5 py-2.5 border-b border-[#2e2520] font-mono text-[10px] text-[#4a3a2a] uppercase tracking-widest">
                    <span>User</span>
                    <span>Amount</span>
                    <span>Address</span>
                    <span>Chain</span>
                    <span>Date</span>
                    <span>Actions</span>
                </div>

                {loading ? (
                    <div className="p-4 space-y-2">
                        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}
                    </div>
                ) : withdrawals.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                        <p className="font-mono text-[13px] text-white">
                            {statusFilter === "pending" ? "No pending withdrawals" : "No withdrawals found"}
                        </p>
                        <p className="font-mono text-[11px] text-[#4a3a2a] mt-1">
                            {statusFilter === "pending" ? "All caught up." : "Try switching the filter."}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#2e2520]">
                        {withdrawals.map((w) => {
                            const busy = actionState[w.id]
                            return (
                                <div
                                    key={w.id}
                                    className="lg:grid lg:grid-cols-[1fr_110px_140px_100px_120px_120px] gap-4 px-5 py-3.5 flex flex-col gap-2 items-start"
                                >
                                    <div className="min-w-0">
                                        <div className="font-mono text-[12px] text-white truncate">
                                            {w.users?.full_name ?? "—"}
                                        </div>
                                        <div className="font-mono text-[10px] text-[#7a6a5a] truncate">
                                            {w.users?.email ?? "—"}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[w.status] ?? ""}`}>
                                                {w.status}
                                            </span>
                                            {w.auto_approved && (
                                                <span className="font-mono text-[9px] text-[#4a3a2a]">auto-approved</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="font-mono text-[13px] text-white">
                                        {parseFloat(w.amount).toFixed(2)}
                                        <span className="text-[10px] text-[#7a6a5a] ml-1">{w.token_symbol}</span>
                                    </div>

                                    <div className="font-mono text-[11px] text-[#7a6a5a]" title={w.to_address}>
                                        {shortAddr(w.to_address)}
                                    </div>

                                    <div className="font-mono text-[11px] text-[#7a6a5a]">
                                        {CHAIN_NAME[w.chain_id] ?? `Chain ${w.chain_id}`}
                                    </div>

                                    <div className="font-mono text-[10px] text-[#7a6a5a]">
                                        {fmtDate(w.created_at)}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {w.status === "pending" ? (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(w.id)}
                                                    disabled={!!busy}
                                                    className="font-mono text-[11px] bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                                >
                                                    {busy === "approving" ? "…" : "Approve"}
                                                </button>
                                                <button
                                                    onClick={() => confirmReject(w)}
                                                    disabled={!!busy}
                                                    className="font-mono text-[11px] bg-red-400/10 hover:bg-red-400/20 border border-red-400/30 text-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                                >
                                                    {busy === "rejecting" ? "…" : "Reject"}
                                                </button>
                                            </>
                                        ) : w.status === "rejected" && w.rejection_reason ? (
                                            <span className="font-mono text-[10px] text-[#4a3a2a] italic truncate max-w-[110px]" title={w.rejection_reason}>
                                                {w.rejection_reason}
                                            </span>
                                        ) : w.tx_hash ? (
                                            <span className="font-mono text-[10px] text-emerald-400/60" title={w.tx_hash}>
                                                tx: {shortAddr(w.tx_hash)}
                                            </span>
                                        ) : (
                                            <span className="font-mono text-[10px] text-[#4a3a2a]">—</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {rejectModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}
                >
                    <div className="bg-[#1a1410] border border-[#2e2520] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
                        <div>
                            <div className="font-mono text-[14px] text-white font-bold">Reject Withdrawal</div>
                            <div className="font-mono text-[11px] text-[#7a6a5a] mt-0.5">
                                For: {rejectModal.name} — funds will be returned immediately.
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-widest">
                                Reason (shown to user)
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={3}
                                placeholder="e.g. Suspicious destination address"
                                className="w-full bg-[#0d0a07] border border-[#2e2520] focus:border-[#FF5733]/50 text-white font-mono text-[12px] px-3 py-2 rounded-lg focus:outline-none resize-none placeholder-[#4a3a2a]"
                            />
                            {rejectError && (
                                <div className="font-mono text-[11px] text-red-400">{rejectError}</div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setRejectModal(null)}
                                className="flex-1 font-mono text-[12px] border border-[#2e2520] text-[#7a6a5a] hover:text-white py-2 rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                className="flex-1 font-mono text-[12px] bg-red-400/10 hover:bg-red-400/20 border border-red-400/30 text-red-400 py-2 rounded-xl transition-colors cursor-pointer"
                            >
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 font-mono text-[12px] px-4 py-3 rounded-xl border shadow-xl transition-all ${toast.ok
                    ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400"
                    : "bg-red-400/10 border-red-400/30 text-red-400"
                    }`}>
                    {toast.ok ? "✓ " : "✗ "}{toast.msg}
                </div>
            )}

        </div>
    )
}
