"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"

interface Opportunity {
  id: string
  pair: string
  buy_dex: string
  sell_dex: string
  buy_chain_id: number
  sell_chain_id: number
  buy_price: string
  sell_price: string
  profit_pct: string
  net_profit_usd: string
  estimated_gas_usd: string
  risk_score: number
  expires_at: string
  created_at: string
}

const CHAIN_LABEL: Record<number, { name: string; color: string }> = {
  1: { name: "Ethereum", color: "#627eea" },
  56: { name: "BNB Chain", color: "#F0B90B" },
  42161: { name: "Arbitrum", color: "#28a0f0" },
}

function RiskBar({ score }: { score: number }) {
  const color = score < 30 ? "#22c55e" : score < 60 ? "#f59e0b" : "#FF5733"
  const label = score < 30 ? "Low Risk" : score < 60 ? "Medium Risk" : "High Risk"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[#2e2520] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="font-mono text-[9px] uppercase" style={{ color }}>{label}</span>
    </div>
  )
}

export default function ScannerPage() {
  const router = useRouter()

  const [kycStatus, setKycStatus] = useState<string | null>(null)
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [total, setTotal] = useState(0)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [scanStats, setScanStats] = useState<{ scanned: number; found: number } | null>(null)

  const [minProfit, setMinProfit] = useState("")
  const [maxRisk, setMaxRisk] = useState("")
  const [filterPair, setFilterPair] = useState("")

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: "20" })
    if (minProfit) params.set("minNetProfit", minProfit)
    if (maxRisk) params.set("maxRiskScore", maxRisk)
    if (filterPair) params.set("pair", filterPair)

    const res = await fetch(`/api/arbitrage/opportunities?${params}`)
    if (res.ok) {
      const data = await res.json()
      setOpps(data.opportunities ?? [])
      setTotal(data.total ?? 0)
    }
    setLoading(false)
  }, [minProfit, maxRisk, filterPair])

  const scan = async () => {
    if (kycStatus !== "approved") { router.push("/kyc"); return }
    setScanning(true)
    try {
      const res = await fetch("/api/arbitrage/scan", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setScanStats({ scanned: data.scanned, found: data.found })
        setLastScan(new Date().toLocaleTimeString())
        await load()
      }
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/auth"); return }

      const { data: userData } = await supabase
        .from("users")
        .select("kyc_status")
        .eq("id", user.id)
        .maybeSingle()
      setKycStatus((userData as any)?.kyc_status ?? "none")

      await load()
    }
    init()
  }, [router, load])

  useEffect(() => {
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  return (
    <div className="min-h-screen bg-[#0d0a07]">
      <Topbar />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-5 space-y-5 overflow-auto">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-mono text-white">Arbitrage Scanner</h1>
              <p className="font-mono text-[12px] text-[#7a6a5a]">
                Live cross-DEX and cross-chain price discrepancies
                {lastScan && ` · last scan ${lastScan}`}
              </p>
            </div>
            {kycStatus === "approved" ? (
              <button
                onClick={scan}
                disabled={scanning}
                className="flex items-center justify-center gap-2 bg-[#FF5733] hover:bg-[#ff6a4d] text-white px-5 py-2.5 rounded-xl font-mono text-[13px] font-bold transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 w-full sm:w-auto"
              >
                {scanning ? (
                  <>
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
                      ))}
                    </span>
                    Scanning Markets...
                  </>
                ) : "⚡ Scan Now"}
              </button>
            ) : kycStatus !== null && (
              <button
                onClick={() => router.push("/kyc")}
                className="flex items-center justify-center gap-2 border border-[#FF5733]/30 bg-[#FF5733]/5 hover:bg-[#FF5733]/10 text-[#FF5733] px-5 py-2.5 rounded-xl font-mono text-[13px] font-bold transition-all cursor-pointer w-full sm:w-auto"
              >
                🔒 Verify Identity to Scan
              </button>
            )}
          </div>

          {kycStatus !== null && kycStatus !== "approved" && (
            <div
              onClick={() => router.push("/kyc")}
              className="flex items-center gap-3 bg-[#1e1208] border border-[#FF5733]/20 rounded-xl px-4 py-3 cursor-pointer hover:border-[#FF5733]/40 transition-all"
            >
              <span className="text-lg">🪪</span>
              <div className="flex-1">
                <span className="font-mono text-[12px] text-white">
                  {kycStatus === "pending" ? "Verification Under Review" : "Identity Verification Required"}
                </span>
                <span className="font-mono text-[11px] text-[#7a6a5a] block">
                  {kycStatus === "pending"
                    ? "Scanning will be unlocked once your identity is approved."
                    : "Complete KYC to unlock live arbitrage scanning."}
                </span>
              </div>
              {kycStatus !== "pending" && (
                <span className="font-mono text-[11px] text-[#FF5733]">Verify →</span>
              )}
            </div>
          )}

          {scanStats && (
            <div className="flex items-center gap-3 bg-[#1e1208] border border-[#FF5733]/15 rounded-xl px-4 py-3 font-mono text-[12px]">
              <span className="text-[#FF5733]">✓</span>
              <span className="text-white">Scanned {scanStats.scanned} pairs</span>
              <span className="text-[#7a6a5a]">·</span>
              <span className={scanStats.found > 0 ? "text-emerald-400" : "text-[#7a6a5a]"}>
                {scanStats.found} opportunit{scanStats.found === 1 ? "y" : "ies"} found
              </span>
            </div>
          )}

          <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl p-4">
            <div className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-wider mb-3">Filters</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-[#7a6a5a]">Min Net Profit ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 20"
                  value={minProfit}
                  onChange={(e) => setMinProfit(e.target.value)}
                  className="bg-[#120d08] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-lg px-3 py-2 font-mono text-[12px] text-white placeholder:text-[#4a3a2a] transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-[#7a6a5a]">Max Risk Score (0–100)</label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  min="0" max="100"
                  value={maxRisk}
                  onChange={(e) => setMaxRisk(e.target.value)}
                  className="bg-[#120d08] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-lg px-3 py-2 font-mono text-[12px] text-white placeholder:text-[#4a3a2a] transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-[#7a6a5a]">Pair</label>
                <input
                  type="text"
                  placeholder="e.g. ETH_USDC"
                  value={filterPair}
                  onChange={(e) => setFilterPair(e.target.value.toUpperCase())}
                  className="bg-[#120d08] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-lg px-3 py-2 font-mono text-[12px] text-white placeholder:text-[#4a3a2a] transition-colors"
                />
              </div>
            </div>
            <button
              onClick={load}
              className="mt-3 font-mono text-[11px] text-[#7a6a5a] hover:text-white border border-[#2e2520] hover:border-white/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Apply Filters
            </button>
          </div>

          <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#2e2520]">
              <span className="font-mono text-[13px] text-white">
                {total > 0 ? `${total} live opportunit${total === 1 ? "y" : "ies"}` : "No opportunities found"}
              </span>
              <span className="font-mono text-[10px] text-[#4a3a2a]">Auto-refreshes every 30s</span>
            </div>

            {loading ? (
              <div className="flex flex-col gap-3 p-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-[#201710] animate-pulse" />
                ))}
              </div>
            ) : opps.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 px-5 text-center">
                <span className="text-4xl opacity-20">⚡</span>
                <p className="font-mono text-[13px] text-white">No active opportunities</p>
                <p className="font-mono text-[11px] text-[#7a6a5a]">
                  Click "Scan Now" to search for arbitrage across all DEXes.
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[#2e2520]">
                {opps.map((o) => {
                  const buyChain = CHAIN_LABEL[o.buy_chain_id]
                  const sellChain = CHAIN_LABEL[o.sell_chain_id]
                  const spread = (parseFloat(o.profit_pct) * 100).toFixed(3)
                  const netProfit = parseFloat(o.net_profit_usd).toFixed(2)
                  const gas = parseFloat(o.estimated_gas_usd).toFixed(2)
                  const sameChain = o.buy_chain_id === o.sell_chain_id
                  const ttl = Math.max(0, Math.round((new Date(o.expires_at).getTime() - Date.now()) / 1000))

                  return (
                    <div key={o.id} className="px-5 py-4 hover:bg-[#201710] transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono text-[15px] text-white font-bold">{o.pair.replace("_", "/")}</span>
                            {!sameChain && (
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-1.5 py-0.5 rounded">
                                cross-chain
                              </span>
                            )}
                            <span className="font-mono text-[9px] text-[#4a3a2a]">expires in {ttl}s</span>
                          </div>

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-[#120d08] border border-[#2e2520] rounded-lg px-2 py-1">
                              <span className="font-mono text-[9px] text-emerald-400 uppercase">BUY</span>
                              <span className="font-mono text-[10px] text-white">{o.buy_dex}</span>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: buyChain?.color ?? "#7a6a5a" }} />
                              <span className="font-mono text-[9px] text-[#7a6a5a]">{buyChain?.name ?? o.buy_chain_id}</span>
                            </div>
                            <span className="text-[#4a3a2a] font-mono text-[11px]">→</span>
                            <div className="flex items-center gap-1.5 bg-[#120d08] border border-[#2e2520] rounded-lg px-2 py-1">
                              <span className="font-mono text-[9px] text-[#FF5733] uppercase">SELL</span>
                              <span className="font-mono text-[10px] text-white">{o.sell_dex}</span>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sellChain?.color ?? "#7a6a5a" }} />
                              <span className="font-mono text-[9px] text-[#7a6a5a]">{sellChain?.name ?? o.sell_chain_id}</span>
                            </div>
                          </div>

                          <div className="mt-2.5">
                            <RiskBar score={o.risk_score} />
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono text-[20px] text-[#FF5733] font-bold leading-none">{spread}%</div>
                          <div className="font-mono text-[11px] text-emerald-400 mt-1">+${netProfit} net</div>
                          <div className="font-mono text-[10px] text-[#4a3a2a] mt-0.5">gas ~${gas}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 font-mono text-[10px] text-[#7a6a5a]">
                        <span>Buy @ ${parseFloat(o.buy_price).toFixed(4)}</span>
                        <span>·</span>
                        <span>Sell @ ${parseFloat(o.sell_price).toFixed(4)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
