"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"

// ── Types ─────────────────────────────────────────────────────────────────────

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
  estimated_profit_usd: string
  estimated_gas_usd: string
  risk_score: number
  expires_at: string
  created_at: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CHAIN_LABEL: Record<number, { name: string; color: string; short: string }> = {
  1: { name: "Ethereum", color: "#627eea", short: "ETH" },
  56: { name: "BNB Chain", color: "#F0B90B", short: "BSC" },
  42161: { name: "Arbitrum", color: "#28a0f0", short: "ARB" },
}

const TOKEN_EMOJI: Record<string, string> = {
  ETH: "⟠", WBTC: "₿", BNB: "🔶", ARB: "🔵", LINK: "🔗",
  UNI: "🦄", AAVE: "👻", MATIC: "🟣", PEPE: "🐸", SHIB: "🐕",
  GMX: "🎯", CAKE: "🥞", CRV: "🌊", LDO: "🔑", MKR: "🏛️",
  SNX: "⚡", ONEINCH: "🔪", "1INCH": "🔪", GRT: "📊",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

function RiskBar({ score }: { score: number }) {
  const color = score < 30 ? "#22c55e" : score < 60 ? "#f59e0b" : "#FF5733"
  const label = score < 30 ? "Low" : score < 60 ? "Medium" : "High"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-[#2e2520] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="font-mono text-[9px]" style={{ color }}>{label} risk</span>
    </div>
  )
}

function TTLBadge({ expiresAt }: { expiresAt: string }) {
  const [ttl, setTtl] = useState(
    Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000))
  )
  useEffect(() => {
    const id = setInterval(() => {
      setTtl((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [])
  const pct = Math.min(100, (ttl / 120) * 100)
  return (
    <span className={`font-mono text-[9px] ${ttl < 20 ? "text-red-400" : "text-[#4a3a2a]"}`}>
      {ttl}s
    </span>
  )
}

// ── Trade Panel ───────────────────────────────────────────────────────────────

function TradePanel({
  opp,
  onClose,
  onSuccess,
}: {
  opp: Opportunity
  onClose: () => void
  onSuccess: (profit: number) => void
}) {
  const [amount, setAmount] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<{ netProfitUsd: number; tradeAmountUsd: number } | null>(null)

  const profitPct = parseFloat(opp.profit_pct)
  const gasUsd = parseFloat(opp.estimated_gas_usd)
  const buyChain = CHAIN_LABEL[opp.buy_chain_id]
  const sellChain = CHAIN_LABEL[opp.sell_chain_id]
  const sameChain = opp.buy_chain_id === opp.sell_chain_id
  const [base] = opp.pair.split("_")
  const emoji = TOKEN_EMOJI[base] ?? "●"

  const amountNum = parseFloat(amount)
  const grossPreview = isFinite(amountNum) && amountNum > 0 ? amountNum * profitPct : 0
  const netPreview = grossPreview - gasUsd
  const spread = (profitPct * 100).toFixed(3)

  const execute = async () => {
    setError("")
    const n = parseFloat(amount)
    if (!isFinite(n) || n < 10) { setError("Minimum trade amount is $10"); return }
    setBusy(true)
    try {
      const res = await fetch("/api/arbitrage/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opp.id, tradeAmountUsd: n }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Execution failed"); return }
      setResult({ netProfitUsd: data.netProfitUsd, tradeAmountUsd: data.tradeAmountUsd })
      onSuccess(data.netProfitUsd)
    } catch {
      setError("Network error — please try again")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-[#1a1410] border border-[#2e2520] rounded-2xl overflow-hidden shadow-2xl">

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2520]">
          <div className="flex items-center gap-3">
            <span className="text-xl">{emoji}</span>
            <div>
              <div className="font-mono text-[14px] text-white font-bold">{opp.pair.replace("_", "/")}</div>
              <div className="font-mono text-[10px] text-[#7a6a5a]">Arbitrage Trade</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#7a6a5a] hover:text-white hover:bg-[#2a1a14] transition-colors text-lg cursor-pointer"
          >
            ×
          </button>
        </div>

        {result ? (
          <div className="px-5 py-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-2xl">
              ✓
            </div>
            <div>
              <div className="font-mono text-[22px] text-emerald-400 font-bold">
                +{fmtUsd(result.netProfitUsd)}
              </div>
              <div className="font-mono text-[12px] text-[#7a6a5a] mt-1">
                Net profit on {fmtUsd(result.tradeAmountUsd)} trade
              </div>
            </div>
            <div className="font-mono text-[11px] text-[#4a3a2a]">
              Profit credited to your USDC balance
            </div>
            <button
              onClick={onClose}
              className="w-full font-mono text-[13px] bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 text-emerald-400 py-3 rounded-xl transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 space-y-3 border-b border-[#2e2520]">
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 bg-[#120d08] border border-[#2e2520] rounded-lg px-2.5 py-1.5 flex-1">
                  <span className="text-emerald-400 uppercase text-[9px]">BUY</span>
                  <span className="text-white">{opp.buy_dex}</span>
                  <span className="w-1.5 h-1.5 rounded-full ml-auto" style={{ background: buyChain?.color }} />
                  <span className="text-[#7a6a5a]">{buyChain?.short}</span>
                </div>
                <span className="text-[#4a3a2a] shrink-0">→</span>
                <div className="flex items-center gap-1.5 bg-[#120d08] border border-[#2e2520] rounded-lg px-2.5 py-1.5 flex-1">
                  <span className="text-[#FF5733] uppercase text-[9px]">SELL</span>
                  <span className="text-white">{opp.sell_dex}</span>
                  <span className="w-1.5 h-1.5 rounded-full ml-auto" style={{ background: sellChain?.color }} />
                  <span className="text-[#7a6a5a]">{sellChain?.short}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="bg-[#120d08] border border-[#2e2520] rounded-lg py-2">
                  <div className="text-[18px] text-[#FF5733] font-bold">{spread}%</div>
                  <div className="text-[9px] text-[#4a3a2a] uppercase mt-0.5">Spread</div>
                </div>
                <div className="bg-[#120d08] border border-[#2e2520] rounded-lg py-2">
                  <div className="text-[13px] text-white font-bold">{fmtUsd(gasUsd)}</div>
                  <div className="text-[9px] text-[#4a3a2a] uppercase mt-0.5">Gas est.</div>
                </div>
                <div className="bg-[#120d08] border border-[#2e2520] rounded-lg py-2">
                  <div className={`text-[12px] font-bold ${sameChain ? "text-emerald-400" : "text-amber-400"}`}>
                    {sameChain ? "Same" : "Cross"}
                  </div>
                  <div className="text-[9px] text-[#4a3a2a] uppercase mt-0.5">Chain</div>
                </div>
              </div>

              <div className="flex justify-between font-mono text-[10px] text-[#7a6a5a]">
                <span>Buy @ ${parseFloat(opp.buy_price).toFixed(4)}</span>
                <span>Sell @ ${parseFloat(opp.sell_price).toFixed(4)}</span>
                <TTLBadge expiresAt={opp.expires_at} />
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-widest block mb-1.5">
                  Trade Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-[#7a6a5a]">$</span>
                  <input
                    type="number"
                    min={10}
                    step={10}
                    placeholder="100"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setError("") }}
                    className="w-full bg-[#120d08] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-xl pl-7 pr-3 py-3 font-mono text-[14px] text-white placeholder-[#4a3a2a] transition-colors"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[100, 500, 1000, 5000].map((v) => (
                    <button
                      key={v}
                      onClick={() => { setAmount(String(v)); setError("") }}
                      className="flex-1 font-mono text-[10px] border border-[#2e2520] hover:border-[#FF5733]/30 text-[#7a6a5a] hover:text-white py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      ${v >= 1000 ? `${v / 1000}k` : v}
                    </button>
                  ))}
                </div>
              </div>

              {isFinite(amountNum) && amountNum >= 10 && (
                <div className="bg-[#120d08] border border-[#2e2520] rounded-xl px-4 py-3 space-y-2">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-[#7a6a5a]">Gross profit</span>
                    <span className="text-white">+{fmtUsd(grossPreview)}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-[#7a6a5a]">Gas cost</span>
                    <span className="text-[#4a3a2a]">−{fmtUsd(gasUsd)}</span>
                  </div>
                  <div className="border-t border-[#2e2520] pt-2 flex justify-between font-mono text-[13px]">
                    <span className="text-[#7a6a5a]">Net profit</span>
                    <span className={netPreview > 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {netPreview > 0 ? "+" : ""}{fmtUsd(netPreview)}
                    </span>
                  </div>
                  {netPreview <= 0 && (
                    <div className="font-mono text-[10px] text-red-400/70">
                      Increase trade size to cover gas costs
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="font-mono text-[11px] text-red-400 bg-red-400/5 border border-red-400/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                onClick={execute}
                disabled={busy || !isFinite(amountNum) || amountNum < 10 || netPreview <= 0}
                className="w-full font-mono text-[13px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] disabled:opacity-40 disabled:cursor-not-allowed text-white py-3.5 rounded-xl transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
                      ))}
                    </span>
                    Executing...
                  </>
                ) : (
                  `⚡ Execute Trade`
                )}
              </button>

              <p className="font-mono text-[9px] text-[#4a3a2a] text-center leading-relaxed">
                Trade is simulated at current DEX prices. Profit is credited to your USDC balance instantly.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Opportunity Card ──────────────────────────────────────────────────────────

function OppCard({ opp, onClick }: { opp: Opportunity; onClick: () => void }) {
  const buyChain = CHAIN_LABEL[opp.buy_chain_id]
  const sellChain = CHAIN_LABEL[opp.sell_chain_id]
  const spread = (parseFloat(opp.profit_pct) * 100).toFixed(3)
  const net = parseFloat(opp.net_profit_usd)
  const gas = parseFloat(opp.estimated_gas_usd)
  const sameChain = opp.buy_chain_id === opp.sell_chain_id
  const [base] = opp.pair.split("_")
  const emoji = TOKEN_EMOJI[base] ?? "●"

  return (
    <div
      onClick={onClick}
      className="bg-[#1a1410] border border-[#2e2520] hover:border-[#FF5733]/30 rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FF5733]/5 group"
    >

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <div>
            <div className="font-mono text-[14px] text-white font-bold group-hover:text-[#FF5733] transition-colors">
              {opp.pair.replace("_", "/")}
            </div>
            {!sameChain && (
              <span className="font-mono text-[8px] uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
                cross-chain
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[20px] text-[#FF5733] font-bold leading-none">{spread}%</div>
          <div className="font-mono text-[10px] text-emerald-400 mt-0.5">+{fmtUsd(net)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-mono mb-3">
        <div className="flex items-center gap-1 bg-[#120d08] border border-[#2e2520] rounded-md px-2 py-1 flex-1 min-w-0">
          <span className="text-emerald-400 text-[8px]">BUY</span>
          <span className="text-white truncate">{opp.buy_dex}</span>
          <span className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto" style={{ background: buyChain?.color }} />
        </div>
        <span className="text-[#4a3a2a] shrink-0">→</span>
        <div className="flex items-center gap-1 bg-[#120d08] border border-[#2e2520] rounded-md px-2 py-1 flex-1 min-w-0">
          <span className="text-[#FF5733] text-[8px]">SELL</span>
          <span className="text-white truncate">{opp.sell_dex}</span>
          <span className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto" style={{ background: sellChain?.color }} />
        </div>
      </div>

      <RiskBar score={opp.risk_score} />
      <div className="flex items-center justify-between mt-2 font-mono text-[9px] text-[#4a3a2a]">
        <span>gas ~{fmtUsd(gas)}</span>
        <TTLBadge expiresAt={opp.expires_at} />
      </div>

      <div className="mt-3 pt-3 border-t border-[#2e2520]">
        <div className="font-mono text-[11px] text-[#FF5733] group-hover:text-white transition-colors text-center">
          Click to trade →
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScannerPage() {
  const router = useRouter()

  const [kycStatus, setKycStatus] = useState<string | null>(null)
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [total, setTotal] = useState(0)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [scanStats, setScanStats] = useState<{ scanned: number; found: number } | null>(null)
  const [diagnostics, setDiagnostics] = useState<any[]>([])
  const [showDiag, setShowDiag] = useState(false)
  const [selected, setSelected] = useState<Opportunity | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [minProfit, setMinProfit] = useState("")
  const [maxRisk, setMaxRisk] = useState("")
  const [filterPair, setFilterPair] = useState("")

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 5000)
  }

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: "50" })
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
        setDiagnostics(data.diagnostics ?? [])
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
        <div className="flex-1 p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-auto">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-mono text-white font-bold">Arbitrage Scanner</h1>
              <p className="font-mono text-[12px] text-[#7a6a5a]">
                {total > 0
                  ? `${total} live opportunit${total === 1 ? "y" : "ies"} across ${new Set(opps.map(o => o.pair.split("_")[0])).size} tokens`
                  : "Cross-DEX & cross-chain price discrepancies"}
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
                    Scanning {scanStats ? `${scanStats.scanned} pairs…` : "Markets…"}
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

          {/* ── KYC banner ── */}
          {kycStatus !== null && kycStatus !== "approved" && (
            <div
              onClick={() => router.push("/kyc")}
              className="flex items-center gap-3 bg-[#1e1208] border border-[#FF5733]/20 rounded-xl px-4 py-3 cursor-pointer hover:border-[#FF5733]/40 transition-all"
            >
              <span className="text-lg">🪪</span>
              <div className="flex-1">
                <span className="font-mono text-[12px] text-white block">
                  {kycStatus === "pending" ? "Verification Under Review" : "Identity Verification Required"}
                </span>
                <span className="font-mono text-[11px] text-[#7a6a5a]">
                  {kycStatus === "pending"
                    ? "Scanning will be unlocked once your identity is approved."
                    : "Complete KYC to unlock live arbitrage scanning."}
                </span>
              </div>
              {kycStatus !== "pending" && <span className="font-mono text-[11px] text-[#FF5733]">Verify →</span>}
            </div>
          )}

          {/* ── Scan result banner + diagnostics ── */}
          {scanStats && (
            <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 font-mono text-[12px]">
                <div className="flex items-center gap-3">
                  <span className="text-[#FF5733]">✓</span>
                  <span className="text-white">Scanned {scanStats.scanned} pairs across 3 chains</span>
                  <span className="text-[#7a6a5a] hidden sm:inline">·</span>
                  <span className={`hidden sm:inline ${scanStats.found > 0 ? "text-emerald-400" : "text-[#7a6a5a]"}`}>
                    {scanStats.found} opportunit{scanStats.found === 1 ? "y" : "ies"} found
                  </span>
                </div>
                {diagnostics.length > 0 && (
                  <button
                    onClick={() => setShowDiag(v => !v)}
                    className="font-mono text-[10px] text-[#7a6a5a] hover:text-white border border-[#2e2520] hover:border-white/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {showDiag ? "Hide" : "Why no results?"} {showDiag ? "▲" : "▼"}
                  </button>
                )}
              </div>

              {showDiag && diagnostics.length > 0 && (
                <div className="border-t border-[#2e2520] px-4 py-3 space-y-1 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-5 gap-2 font-mono text-[9px] text-[#4a3a2a] uppercase tracking-wider mb-2">
                    <span className="col-span-2">Pair</span>
                    <span className="text-center">Pools</span>
                    <span className="text-center">Filtered</span>
                    <span className="text-center">Found</span>
                  </div>
                  {diagnostics.map((d: any) => {
                    const totalFiltered = (d.filtered?.spread_too_wide ?? 0) + (d.filtered?.ratio_bad ?? 0) + (d.filtered?.profit_too_low ?? 0) + (d.filtered?.no_pools ?? 0)
                    return (
                      <div key={d.pair} className="grid grid-cols-5 gap-2 font-mono text-[10px] py-0.5">
                        <span className="col-span-2 text-[#7a6a5a] truncate">{d.pair.replace("_", "/")}</span>
                        <span className="text-center text-white">{d.poolsFetched}</span>
                        <span className={`text-center ${totalFiltered > 0 ? "text-amber-400/70" : "text-[#4a3a2a]"}`}>{totalFiltered}</span>
                        <span className={`text-center font-bold ${d.opportunitiesFound > 0 ? "text-emerald-400" : "text-[#4a3a2a]"}`}>{d.opportunitiesFound}</span>
                      </div>
                    )
                  })}
                  <div className="pt-2 mt-1 border-t border-[#2e2520] font-mono text-[9px] text-[#4a3a2a] leading-relaxed">
                    Filtered = spread too wide · price ratio bad · profit below gas cost
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl p-4">
            <div className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-wider mb-3">Filters</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-[#7a6a5a]">Min Net Profit ($)</label>
                <input
                  type="number" placeholder="e.g. 20" value={minProfit}
                  onChange={(e) => setMinProfit(e.target.value)}
                  className="bg-[#120d08] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-lg px-3 py-2 font-mono text-[12px] text-white placeholder:text-[#4a3a2a] transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-[#7a6a5a]">Max Risk Score (0–100)</label>
                <input
                  type="number" placeholder="e.g. 50" min="0" max="100" value={maxRisk}
                  onChange={(e) => setMaxRisk(e.target.value)}
                  className="bg-[#120d08] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-lg px-3 py-2 font-mono text-[12px] text-white placeholder:text-[#4a3a2a] transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-[#7a6a5a]">Token / Pair</label>
                <input
                  type="text" placeholder="e.g. ETH or ETH_USDC" value={filterPair}
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

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[13px] text-white font-bold">
                {total > 0 ? `${total} Live Opportunit${total === 1 ? "y" : "ies"}` : "No opportunities found"}
              </span>
              <span className="font-mono text-[10px] text-[#4a3a2a]">Auto-refreshes every 30s</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-44 rounded-xl bg-[#1a1410] animate-pulse" />
                ))}
              </div>
            ) : opps.length === 0 ? (
              <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl flex flex-col items-center gap-3 py-16 px-5 text-center">
                <span className="text-4xl opacity-20">⚡</span>
                <p className="font-mono text-[13px] text-white">No active opportunities</p>
                <p className="font-mono text-[11px] text-[#7a6a5a] max-w-xs">
                  Click "Scan Now" to search {`>`}26 pairs across Uniswap, PancakeSwap, Camelot and more.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {opps.map((o) => (
                  <OppCard key={o.id} opp={o} onClick={() => setSelected(o)} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {selected && (
        <TradePanel
          opp={selected}
          onClose={() => setSelected(null)}
          onSuccess={(profit) => {
            setSelected(null)
            showToast(`⚡ Trade executed! +${fmtUsd(profit)} profit credited to your balance`)
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 font-mono text-[12px] px-5 py-3 rounded-xl shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
