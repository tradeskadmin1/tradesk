"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Alert {
    id: string
    label: string
    token: string
    condition: string
    threshold: number
    status: "active" | "triggered" | "dismissed"
    triggered_at: string | null
    created_at: string
}

const STATUS_STYLES: Record<string, string> = {
    triggered: "bg-[#FF5733]/10 border-[#FF5733]/30 text-[#FF5733]",
    active:    "bg-[#2a1a14] border-[#2e2520] text-[#c8b8a8]",
}

const DOT: Record<string, string> = {
    triggered: "bg-[#FF5733] animate-pulse",
    active:    "bg-[#4a3a2a]",
}

export default function LiveAlerts() {
    const router = useRouter()
    const [alerts,  setAlerts]  = useState<Alert[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await fetch("/api/alerts")
                if (!res.ok) return
                const data = await res.json()
                // Show max 5 most relevant: triggered first, then active — skip dismissed
                const visible = (data.alerts as Alert[])
                    .filter((a) => a.status !== "dismissed")
                    .sort((a, b) => {
                        if (a.status === "triggered" && b.status !== "triggered") return -1
                        if (b.status === "triggered" && a.status !== "triggered") return  1
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    })
                    .slice(0, 5)
                setAlerts(visible)
            } catch { /* fail silently */ }
            finally { setLoading(false) }
        }

        fetchAlerts()
        const t = setInterval(fetchAlerts, 60_000)
        return () => clearInterval(t)
    }, [])

    const dismiss = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setAlerts((prev) => prev.filter((a) => a.id !== id))
        await fetch(`/api/alerts?id=${id}`, { method: "DELETE" }).catch(() => {})
    }

    return (
        <div className="bg-[#201710] border border-[#2e2520] p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-[#c8b8a8] font-mono">Live Alerts</h3>
                <button
                    onClick={() => router.push("/dashboard/alerts")}
                    className="font-mono text-[10px] text-[#FF5733] hover:underline cursor-pointer"
                >
                    Manage →
                </button>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2].map((i) => (
                        <div key={i} className="h-9 rounded-lg bg-[#2a1a14] animate-pulse" />
                    ))}
                </div>
            ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <span className="text-2xl opacity-20">🔔</span>
                    <p className="font-mono text-[11px] text-[#4a3a2a]">No active alerts</p>
                    <button
                        onClick={() => router.push("/dashboard/alerts")}
                        className="font-mono text-[10px] text-[#FF5733] hover:underline cursor-pointer"
                    >
                        + Create one
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-opacity hover:opacity-80 ${STATUS_STYLES[alert.status] ?? STATUS_STYLES.active}`}
                            onClick={() => router.push("/dashboard/alerts")}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT[alert.status] ?? DOT.active}`} />
                            <span className="font-mono flex-1 truncate">{alert.label}</span>
                            {alert.status === "triggered" && (
                                <span className="font-mono text-[9px] shrink-0 opacity-70">HIT</span>
                            )}
                            <button
                                onClick={(e) => dismiss(alert.id, e)}
                                className="shrink-0 text-[#4a3a2a] hover:text-white transition-colors leading-none"
                                aria-label="Dismiss"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
