"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"

interface Alert {
    id: string
    label: string
    token: string
    condition: "above" | "below"
    threshold: number
    status: "active" | "triggered" | "dismissed"
    triggered_at: string | null
    created_at: string
}

const SUPPORTED_TOKENS = [
    "BTC", "ETH", "SOL", "BNB", "ARB", "MATIC", "AVAX",
    "LINK", "UNI", "AAVE", "OP", "INJ", "TIA",
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

function StatusBadge({ status }: { status: Alert["status"] }) {
    if (status === "triggered") {
        return (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#FF5733]/15 text-[#FF5733] border border-[#FF5733]/30">
                <span className="w-1 h-1 rounded-full bg-[#FF5733] animate-pulse" />
                Triggered
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            Active
        </span>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
    const router = useRouter()

    const [alerts,    setAlerts]    = useState<Alert[]>([])
    const [loading,   setLoading]   = useState(true)
    const [creating,  setCreating]  = useState(false)
    const [formOpen,  setFormOpen]  = useState(false)
    const [formError, setFormError] = useState("")

    // Form state
    const [token,     setToken]     = useState("BTC")
    const [condition, setCondition] = useState<"above" | "below">("above")
    const [threshold, setThreshold] = useState("")

    const loadAlerts = useCallback(async () => {
        try {
            const res = await fetch("/api/alerts")
            if (!res.ok) return
            const data = await res.json()
            setAlerts(
                (data.alerts as Alert[]).filter((a) => a.status !== "dismissed"),
            )
        } catch { /* ignore */ }
        finally { setLoading(false) }
    }, [])

    useEffect(() => {
        void (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.replace("/auth"); return }
            await loadAlerts()
        })()
    }, [router, loadAlerts])

    // ── Create ────────────────────────────────────────────────────────────────
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError("")
        const thresholdNum = parseFloat(threshold)
        if (!threshold || isNaN(thresholdNum) || thresholdNum <= 0) {
            setFormError("Enter a valid price threshold.")
            return
        }

        setCreating(true)
        try {
            const res = await fetch("/api/alerts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, condition, threshold: thresholdNum }),
            })
            const data = await res.json()
            if (!res.ok) { setFormError(data.error ?? "Failed to create alert"); return }

            setAlerts((prev) => [data.alert, ...prev])
            setThreshold("")
            setFormOpen(false)
        } catch {
            setFormError("Network error — try again.")
        } finally {
            setCreating(false)
        }
    }

    // ── Dismiss ───────────────────────────────────────────────────────────────
    const handleDismiss = async (id: string) => {
        setAlerts((prev) => prev.filter((a) => a.id !== id))
        await fetch(`/api/alerts?id=${id}`, { method: "DELETE" }).catch(() => {})
    }

    // ── Derived lists ──────────────────────────────────────────────────────────
    const triggered = alerts.filter((a) => a.status === "triggered")
    const active    = alerts.filter((a) => a.status === "active")

    return (
        <div className="min-h-screen bg-[#0d0a07]">
            <Topbar />
            <div className="flex">
                <Sidebar />
                <div className="flex-1 p-5 max-w-2xl space-y-5">

                    {/* ── Header ─────────────────────────────────────────────── */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-mono text-white">Alerts</h1>
                            <p className="font-mono text-[12px] text-[#7a6a5a]">
                                Price alerts — get notified when tokens hit your targets
                            </p>
                        </div>
                        <button
                            onClick={() => { setFormOpen((v) => !v); setFormError("") }}
                            className="flex items-center justify-center gap-2 bg-[#FF5733] hover:bg-[#ff6a4d] text-white px-4 py-2 rounded-xl font-mono text-[13px] transition-all cursor-pointer w-full sm:w-auto"
                        >
                            {formOpen ? "× Cancel" : "+ New Alert"}
                        </button>
                    </div>

                    {/* ── Create form ─────────────────────────────────────────── */}
                    {formOpen && (
                        <form
                            onSubmit={handleCreate}
                            className="bg-[#1a1410] border border-[#2e2520] rounded-xl p-5 space-y-4"
                        >
                            <div className="font-mono text-[13px] text-white font-bold">New Price Alert</div>

                            <div className="grid grid-cols-3 gap-3">
                                {/* Token */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-widest">Token</label>
                                    <select
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        className="bg-[#0d0a07] border border-[#2e2520] text-white font-mono text-[13px] px-3 py-2 rounded-lg focus:outline-none focus:border-[#FF5733]/50 cursor-pointer"
                                    >
                                        {SUPPORTED_TOKENS.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Condition */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-widest">Condition</label>
                                    <select
                                        value={condition}
                                        onChange={(e) => setCondition(e.target.value as "above" | "below")}
                                        className="bg-[#0d0a07] border border-[#2e2520] text-white font-mono text-[13px] px-3 py-2 rounded-lg focus:outline-none focus:border-[#FF5733]/50 cursor-pointer"
                                    >
                                        <option value="above">Above</option>
                                        <option value="below">Below</option>
                                    </select>
                                </div>

                                {/* Price */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-widest">Price (USD)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="e.g. 70000"
                                        value={threshold}
                                        onChange={(e) => setThreshold(e.target.value)}
                                        className="bg-[#0d0a07] border border-[#2e2520] text-white font-mono text-[13px] px-3 py-2 rounded-lg focus:outline-none focus:border-[#FF5733]/50 placeholder-[#4a3a2a]"
                                    />
                                </div>
                            </div>

                            {/* Preview label */}
                            {threshold && !isNaN(parseFloat(threshold)) && parseFloat(threshold) > 0 && (
                                <div className="font-mono text-[11px] text-[#7a6a5a]">
                                    Alert: <span className="text-white">
                                        {token} {condition} ${Number(parseFloat(threshold).toFixed(2)).toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {formError && (
                                <div className="font-mono text-[12px] text-red-400">{formError}</div>
                            )}

                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full bg-[#FF5733] hover:bg-[#ff6a4d] disabled:opacity-50 text-white font-mono text-[13px] py-2.5 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed"
                            >
                                {creating ? "Creating…" : "Create Alert"}
                            </button>
                        </form>
                    )}

                    {/* ── Triggered alerts ────────────────────────────────────── */}
                    {triggered.length > 0 && (
                        <div className="space-y-2">
                            <div className="font-mono text-[10px] uppercase tracking-widest text-[#FF5733] px-1">
                                🔔 Triggered ({triggered.length})
                            </div>
                            {triggered.map((alert) => (
                                <AlertRow key={alert.id} alert={alert} onDismiss={handleDismiss} />
                            ))}
                        </div>
                    )}

                    {/* ── Active alerts ────────────────────────────────────────── */}
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-14 rounded-xl bg-[#1a1410] animate-pulse" />
                            ))}
                        </div>
                    ) : active.length === 0 && triggered.length === 0 ? (
                        <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl p-10 flex flex-col items-center gap-4 text-center">
                            <span className="text-4xl opacity-20">🔔</span>
                            <p className="font-mono text-[13px] text-white">No alerts yet</p>
                            <p className="font-mono text-[11px] text-[#7a6a5a]">
                                Create a price alert above — you&apos;ll see it trigger in real time.
                            </p>
                        </div>
                    ) : active.length > 0 && (
                        <div className="space-y-2">
                            <div className="font-mono text-[10px] uppercase tracking-widest text-[#7a6a5a] px-1">
                                Watching ({active.length})
                            </div>
                            {active.map((alert) => (
                                <AlertRow key={alert.id} alert={alert} onDismiss={handleDismiss} />
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}

// ── Alert row ─────────────────────────────────────────────────────────────────

function AlertRow({
    alert,
    onDismiss,
}: {
    alert: Alert
    onDismiss: (id: string) => void
}) {
    return (
        <div className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors
            ${alert.status === "triggered"
                ? "bg-[#1e1208] border-[#FF5733]/30"
                : "bg-[#1a1410] border-[#2e2520]"}`}
        >
            {/* Token badge */}
            <div className="w-9 h-9 rounded-full bg-[#2a1a14] flex items-center justify-center font-mono text-[10px] text-[#FF5733] font-bold shrink-0">
                {alert.token.slice(0, 3)}
            </div>

            {/* Label + meta */}
            <div className="flex-1 min-w-0">
                <div className="font-mono text-[13px] text-white truncate">{alert.label}</div>
                <div className="font-mono text-[10px] text-[#7a6a5a] mt-0.5">
                    {alert.status === "triggered" && alert.triggered_at
                        ? `Triggered ${fmtDate(alert.triggered_at)}`
                        : `Created ${fmtDate(alert.created_at)}`}
                </div>
            </div>

            <StatusBadge status={alert.status} />

            {/* Dismiss */}
            <button
                onClick={() => onDismiss(alert.id)}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#4a3a2a] hover:text-white hover:bg-[#2a1a14] transition-colors font-mono text-base leading-none cursor-pointer"
                aria-label="Dismiss alert"
            >
                ×
            </button>
        </div>
    )
}
