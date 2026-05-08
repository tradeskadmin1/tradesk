"use client"

import { useEffect, useState } from "react"

interface Order {
  id:           string
  pair:         string
  side:         "buy" | "sell"
  amount:       string
  filled_amount: string
  status:       "pending" | "open" | "filled" | "cancelled" | "failed"
  tx_hash:      string | null
  chain_id:     number
  created_at:   string
}

const CHAIN_LABEL: Record<number, string> = { 1: "ETH", 56: "BSC", 42161: "ARB" }

const STATUS_COLOR: Record<Order["status"], string> = {
  filled:    "#22c55e",
  pending:   "#f59e0b",
  open:      "#f59e0b",
  cancelled: "#7a6a5a",
  failed:    "#FF5733",
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60_000)
  if (min < 1)  return "just now"
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function RecentActivity() {
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/trade/history?limit=6")
        if (res.ok) {
          const data = await res.json()
          setOrders(data.orders ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="bg-[#201710] border border-[#2e2520] p-4 rounded-lg">
      <h3 className="text-sm text-[#c8b8a8] mb-3">Recent Activity</h3>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1,2,3].map((i) => (
            <div key={i} className="h-9 rounded-lg bg-[#2a1a14] animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="font-mono text-[11px] text-[#4a3a2a] py-3 text-center">No trades yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((o) => {
            const color  = STATUS_COLOR[o.status] ?? "#7a6a5a"
            const sideColor = o.side === "buy" ? "#22c55e" : "#FF5733"
            return (
              <div key={o.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-[#2a1a14]">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: color, boxShadow: `0 0 6px 1px ${color}60` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[12px] text-white">{o.pair.replace("_", "/")}</span>
                    <span className="font-mono text-[9px] uppercase font-bold" style={{ color: sideColor }}>{o.side}</span>
                    <span className="font-mono text-[9px] text-[#4a3a2a]">{CHAIN_LABEL[o.chain_id] ?? ""}</span>
                  </div>
                  <div className="font-mono text-[10px] text-[#7a6a5a] mt-0.5">
                    {o.amount} · <span style={{ color }}>{o.status}</span>
                    {o.tx_hash && (
                      <span className="ml-1 text-[#FF5733] cursor-pointer hover:underline">
                        · txn
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-mono text-[9px] text-[#4a3a2a] shrink-0 mt-0.5">{timeAgo(o.created_at)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
