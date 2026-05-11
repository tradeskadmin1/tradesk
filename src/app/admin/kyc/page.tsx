"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"


interface Submission {
    id: string
    full_name: string
    date_of_birth: string
    nationality: string
    id_type: "passport" | "national_id" | "drivers_license"
    status: "pending" | "approved" | "rejected"
    rejection_reason: string | null
    submitted_at: string
    reviewed_at: string | null
    users: { id: string; email: string; kyc_status: string }
    signedUrls: {
        id_front_url?: string
        id_back_url?: string
        selfie_url?: string
    }
}

type StatusFilter = "pending" | "approved" | "rejected" | "all"


const ID_TYPE_LABEL: Record<string, string> = {
    passport: "Passport",
    national_id: "National ID",
    drivers_license: "Driver's License",
}

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    approved: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    rejected: "bg-red-400/10 text-red-400 border-red-400/20",
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse rounded-xl bg-[#1a1410] ${className}`} />
}


function DocViewer({
    url,
    label,
    onClose,
}: {
    url: string
    label: string
    onClose: () => void
}) {
    const isPdf = url.includes('.pdf') || url.includes('application%2Fpdf')

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full max-w-3xl bg-[#1a1410] border border-[#2e2520] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#2e2520] shrink-0">
                    <span className="font-mono text-[13px] text-white">{label}</span>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#7a6a5a] hover:text-white hover:bg-[#2a1a14] transition-colors text-lg leading-none cursor-pointer"
                    >
                        ×
                    </button>
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-0">
                    {isPdf ? (
                        <iframe
                            src={url}
                            className="w-full h-full min-h-125 rounded-lg"
                            title={label}
                        />
                    ) : (
                        <img
                            src={url}
                            alt={label}
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                    )}
                </div>
                <div className="px-5 py-3 border-t border-[#2e2520] shrink-0">
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] text-[#FF5733] hover:underline"
                    >
                        Open in new tab ↗
                    </a>
                </div>
            </div>
        </div>
    )
}

function DetailPanel({
    sub,
    onApprove,
    onReject,
    actionBusy,
}: {
    sub: Submission
    onApprove: (id: string) => void
    onReject: (sub: Submission) => void
    actionBusy: boolean
}) {
    const [viewDoc, setViewDoc] = useState<{ url: string; label: string } | null>(null)

    const docs = [
        { key: "id_front_url", label: "ID Front" },
        { key: "id_back_url", label: "ID Back" },
        { key: "selfie_url", label: "Selfie" },
    ] as const

    return (
        <div className="flex flex-col gap-5">
            <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#2e2520] font-mono text-[12px] text-white font-bold">
                    Identity Details
                </div>
                <div className="divide-y divide-[#2e2520]">
                    {[
                        { label: "Full Name", value: sub.full_name },
                        { label: "Date of Birth", value: sub.date_of_birth },
                        { label: "Nationality", value: sub.nationality },
                        { label: "ID Type", value: ID_TYPE_LABEL[sub.id_type] ?? sub.id_type },
                        { label: "Email", value: sub.users?.email },
                        { label: "Submitted", value: fmtDate(sub.submitted_at) },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between px-5 py-2.5">
                            <span className="font-mono text-[11px] text-[#7a6a5a]">{label}</span>
                            <span className="font-mono text-[12px] text-white text-right max-w-[60%] truncate">{value ?? "—"}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#2e2520] font-mono text-[12px] text-white font-bold">
                    Documents
                </div>
                <div className="p-4 grid grid-cols-3 gap-3">
                    {docs.map(({ key, label }) => {
                        const url = sub.signedUrls?.[key]
                        return (
                            <div key={key}>
                                {url ? (
                                    <button
                                        onClick={() => setViewDoc({ url, label })}
                                        className="w-full aspect-4/3 rounded-lg overflow-hidden border border-[#2e2520] hover:border-[#FF5733]/40 transition-colors cursor-pointer relative group bg-[#0d0a07]"
                                    >
                                        <img
                                            src={url}
                                            alt={label}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none'
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                            <span className="opacity-0 group-hover:opacity-100 font-mono text-[10px] text-white bg-black/60 px-2 py-1 rounded-md transition-opacity">
                                                View
                                            </span>
                                        </div>
                                        <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-black/60 font-mono text-[9px] text-[#c8b8a8]">
                                            {label}
                                        </div>
                                    </button>
                                ) : (
                                    <div className="w-full aspect-4/3 rounded-lg border border-[#2e2520] bg-[#0d0a07] flex flex-col items-center justify-center gap-1">
                                        <span className="font-mono text-[10px] text-[#4a3a2a]">{label}</span>
                                        <span className="font-mono text-[9px] text-[#2e2520]">Not provided</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {sub.status === "pending" && (
                <div className="flex gap-3">
                    <button
                        onClick={() => onApprove(sub.id)}
                        disabled={actionBusy}
                        className="flex-1 font-mono text-[13px] bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 text-emerald-400 py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                        {actionBusy ? "Processing…" : "✓ Approve"}
                    </button>
                    <button
                        onClick={() => onReject(sub)}
                        disabled={actionBusy}
                        className="flex-1 font-mono text-[13px] bg-red-400/10 hover:bg-red-400/20 border border-red-400/30 text-red-400 py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                        {actionBusy ? "Processing…" : "✗ Reject"}
                    </button>
                </div>
            )}

            {sub.status === "rejected" && sub.rejection_reason && (
                <div className="bg-red-400/5 border border-red-400/20 rounded-xl px-4 py-3">
                    <div className="font-mono text-[10px] text-red-400/60 uppercase tracking-widest mb-1">Rejection Reason</div>
                    <div className="font-mono text-[12px] text-red-400">{sub.rejection_reason}</div>
                </div>
            )}

            {viewDoc && (
                <DocViewer
                    url={viewDoc.url}
                    label={viewDoc.label}
                    onClose={() => setViewDoc(null)}
                />
            )}
        </div>
    )
}



export default function AdminKycPage() {
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending")
    const [selected, setSelected] = useState<Submission | null>(null)
    const [actionBusy, setActionBusy] = useState(false)
    const [rejectModal, setRejectModal] = useState<Submission | null>(null)
    const [rejectReason, setRejectReason] = useState("")
    const [rejectError, setRejectError] = useState("")
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok })
        setTimeout(() => setToast(null), 4000)
    }

    const load = useCallback(async (filter: StatusFilter = statusFilter) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/kyc?status=${filter}&limit=100`)
            if (res.ok) {
                const data = await res.json()
                const rows: Submission[] = data.submissions ?? []
                setSubmissions(rows)
                if (filter === "pending" && rows.length > 0 && !selected) {
                    setSelected(rows[0])
                }
            }
        } finally {
            setLoading(false)
        }
    }, [statusFilter])

    useEffect(() => { void load() }, [load])

    const handleApprove = async (id: string) => {
        setActionBusy(true)
        try {
            const res = await fetch(`/api/admin/kyc/${id}/approve`, { method: "POST" })
            const data = await res.json()
            if (!res.ok) {
                showToast(data.error ?? "Approval failed", false)
            } else {
                showToast("KYC approved — user notified", true)
                setSubmissions((prev) => prev.filter((s) => s.id !== id))
                setSelected(null)
            }
        } catch {
            showToast("Network error", false)
        } finally {
            setActionBusy(false)
        }
    }

    const openRejectModal = (sub: Submission) => {
        setRejectReason("")
        setRejectError("")
        setRejectModal(sub)
    }

    const handleReject = async () => {
        if (!rejectModal) return
        if (!rejectReason.trim()) { setRejectError("A reason is required."); return }
        const { id } = rejectModal
        setActionBusy(true)
        setRejectModal(null)
        try {
            const res = await fetch(`/api/admin/kyc/${id}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: rejectReason.trim() }),
            })
            const data = await res.json()
            if (!res.ok) {
                showToast(data.error ?? "Rejection failed", false)
            } else {
                showToast("KYC rejected — user can resubmit", true)
                setSubmissions((prev) => prev.filter((s) => s.id !== id))
                setSelected(null)
            }
        } catch {
            showToast("Network error", false)
        } finally {
            setActionBusy(false)
            setRejectReason("")
        }
    }

    const pendingCount = submissions.filter((s) => s.status === "pending").length

    return (
        <div className="p-6 h-full flex flex-col gap-5 max-w-6xl">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-mono text-white font-bold">KYC Review</h1>
                    <p className="font-mono text-[11px] text-[#4a3a2a] mt-0.5">
                        Verify identity documents and approve or reject submissions
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
            <div className="flex gap-2 shrink-0">
                {(["pending", "approved", "rejected", "all"] as StatusFilter[]).map((f) => (
                    <button
                        key={f}
                        onClick={() => {
                            setStatusFilter(f)
                            setSelected(null)
                            void load(f)
                        }}
                        className={`font-mono text-[12px] px-4 py-1.5 rounded-lg border transition-colors cursor-pointer capitalize ${statusFilter === f
                                ? "bg-[#FF5733]/10 border-[#FF5733]/30 text-[#FF5733]"
                                : "border-[#2e2520] text-[#7a6a5a] hover:text-white"
                            }`}
                    >
                        {f === "pending" && pendingCount > 0 ? `Pending (${pendingCount})` : f}
                    </button>
                ))}
            </div>
            <div className="flex gap-4 flex-1 min-h-0">
                <div className="w-72 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
                    {loading ? (
                        [1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)
                    ) : submissions.length === 0 ? (
                        <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl p-6 text-center">
                            <p className="font-mono text-[12px] text-white">
                                {statusFilter === "pending" ? "No pending submissions" : "Nothing here"}
                            </p>
                            <p className="font-mono text-[10px] text-[#4a3a2a] mt-1">All clear.</p>
                        </div>
                    ) : (
                        submissions.map((sub) => (
                            <button
                                key={sub.id}
                                onClick={() => setSelected(sub)}
                                className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${selected?.id === sub.id
                                        ? "bg-[#2a1a14] border-[#FF5733]/40"
                                        : "bg-[#1a1410] border-[#2e2520] hover:border-[#3e3028]"
                                    }`}
                            >
                                <div className="flex items-center gap-2.5 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-[#2a1a14] border border-[#3e2518] flex items-center justify-center font-mono text-[11px] text-[#FF5733] font-bold shrink-0">
                                        {sub.full_name?.[0]?.toUpperCase() ?? "?"}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-mono text-[12px] text-white truncate">{sub.full_name}</div>
                                        <div className="font-mono text-[10px] text-[#7a6a5a] truncate">{sub.users?.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border ${STATUS_STYLE[sub.status] ?? ""}`}>
                                        {sub.status}
                                    </span>
                                    <span className="font-mono text-[9px] text-[#4a3a2a]">
                                        {new Date(sub.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
                <div className="flex-1 overflow-y-auto min-w-0">
                    {selected ? (
                        <DetailPanel
                            sub={selected}
                            onApprove={handleApprove}
                            onReject={openRejectModal}
                            actionBusy={actionBusy}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-4xl opacity-10 mb-3">🪪</div>
                                <p className="font-mono text-[12px] text-[#4a3a2a]">
                                    Select a submission to review
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {rejectModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}
                >
                    <div className="bg-[#1a1410] border border-[#2e2520] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
                        <div>
                            <div className="font-mono text-[14px] text-white font-bold">Reject KYC Submission</div>
                            <div className="font-mono text-[11px] text-[#7a6a5a] mt-0.5">
                                For: {rejectModal.full_name} — they will be able to resubmit.
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
                                placeholder="e.g. Document image is blurry, please resubmit"
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
                <div className={`fixed bottom-6 right-6 z-50 font-mono text-[12px] px-4 py-3 rounded-xl border shadow-xl ${toast.ok
                        ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400"
                        : "bg-red-400/10 border-red-400/30 text-red-400"
                    }`}>
                    {toast.ok ? "✓ " : "✗ "}{toast.msg}
                </div>
            )}
        </div>
    )
}
