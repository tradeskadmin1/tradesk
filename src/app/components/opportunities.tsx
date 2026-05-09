"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Opportunity {
  id:             string
  pair:           string
  buy_dex:        string
  sell_dex:       string
  buy_chain_id:   number
  sell_chain_id:  number
  profit_pct:     string
  net_profit_usd: string
  risk_score:     number
  expires_at:     string
}

const CHAIN_LABEL: Record<number, string> = { 1: "ETH", 56: "BSC", 42161: "ARB" }

function RiskBadge({ score }: { score: number }) {
  const color = score < 30 ? "#22c55e" : score < 60 ? "#f59e0b" : "#FF5733"
  const label = score < 30 ? "Low" : score < 60 ? "Med" : "High"
  return (
    <span
      className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  )
}

export default function TopOpportunities({ kycStatus }: { kycStatus?: string }) {
  const router = useRouter()
  const [opps,     setOpps]     = useState<Opportunity[]>([])
  const [loading,  setLoading]  = useState(true)
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [count,    setCount]    = useState(0)

  const kycApproved = kycStatus === "approved"

  const fetch5 = useCallback(async () => {
    try {
      const res = await fetch("/api/arbitrage/opportunities?limit=5")
      if (res.ok) {
        const data = await res.json()
        setOpps(data.opportunities ?? [])
        setCount(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const scan = async () => {
    if (!kycApproved) {
      router.push("/kyc")
      return
    }
    setScanning(true)
    try {
      await fetch("/api/arbitrage/scan", { method: "POST" })
      await fetch5()
      setLastScan(new Date().toLocaleTimeString())
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    fetch5()
    const id = setInterval(fetch5, 30_000)
    return () => clearInterval(id)
  }, [fetch5])

  return (
    <div className="bg-[#201710] border border-[#2e2520] p-4 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm text-[#c8b8a8]">Top Opportunities</h3>
          {lastScan && (
            <span className="font-mono text-[9px] text-[#4a3a2a]">Last scan: {lastScan}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="font-mono text-[10px] text-[#FF5733] bg-[#FF5733]/10 border border-[#FF5733]/20 px-2 py-0.5 rounded-full">
              {count} live
            </span>
          )}
          {kycApproved ? (
            <button
              onClick={scan}
              disabled={scanning}
              className="font-mono text-[10px] text-[#7a6a5a] hover:text-white border border-[#2e2520] hover:border-white/20 px-2.5 py-1 rounded transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {scanning ? (
                <span className="flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    {[0,1,2].map((i) => (
                      <span key={i} className="w-1 h-1 rounded-full bg-[#FF5733] animate-bounce" style={{ animationDelay: `${i*0.12}s` }} />
                    ))}
                  </span>
                  Scanning
                </span>
              ) : "↻ Scan"}
            </button>
          ) : (
            <button
              onClick={() => router.push("/kyc")}
              className="font-mono text-[10px] text-[#FF5733] border border-[#FF5733]/20 hover:border-[#FF5733]/50 bg-[#FF5733]/5 px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
            >
              🔒 Verify to Scan
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5 py-2">
          {[1,2,3].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-[#2a1a14] animate-pulse" />
          ))}
        </div>
      ) : opps.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-5 text-center">
          <span className="text-2xl opacity-40">⚡</span>
          <p className="font-mono text-[11px] text-[#4a3a2a]">No active opportunities. Click Scan to search.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {opps.map((o) => {
            const sameChain = o.buy_chain_id === o.sell_chain_id
            const spread    = (parseFloat(o.profit_pct) * 100).toFixed(2)
            const profit    = parseFloat(o.net_profit_usd).toFixed(2)
            return (
              <div key={o.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#2a1a14] border border-[#3a2520]/50 hover:border-[#FF5733]/20 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] text-white font-bold">{o.pair.replace("_", "/")}</span>
                    <RiskBadge score={o.risk_score} />
                  </div>
                  <div className="font-mono text-[10px] text-[#7a6a5a] mt-0.5 truncate">
                    Buy {o.buy_dex} ({CHAIN_LABEL[o.buy_chain_id] ?? o.buy_chain_id})
                    {" → "}
                    Sell {o.sell_dex} ({CHAIN_LABEL[o.sell_chain_id] ?? o.sell_chain_id})
                    {!sameChain && <span className="ml-1 text-[#f59e0b]">cross-chain</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-[12px] text-[#FF5733] font-bold">{spread}%</div>
                  <div className="font-mono text-[10px] text-emerald-400">+${profit}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
