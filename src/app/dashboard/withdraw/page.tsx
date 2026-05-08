"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"

const CHAINS = [
  { id: 1,     name: "Ethereum",  color: "#627eea", tokens: ["ETH", "USDC", "USDT", "WBTC", "LINK", "UNI", "AAVE"] },
  { id: 56,    name: "BNB Chain", color: "#F0B90B", tokens: ["BNB", "USDT", "USDC"] },
  { id: 42161, name: "Arbitrum",  color: "#28a0f0", tokens: ["ETH", "USDC", "USDT", "WBTC", "ARB", "LINK", "UNI", "AAVE"] },
]

interface FeeEstimate {
  estimatedFee:     string
  estimatedFeeUsd:  string | null
  token:            string
  network:          string
}

export default function WithdrawPage() {
  const router = useRouter()

  const [chainId,    setChainId]    = useState(1)
  const [token,      setToken]      = useState("ETH")
  const [amount,     setAmount]     = useState("")
  const [toAddress,  setToAddress]  = useState("")
  const [feeData,    setFeeData]    = useState<FeeEstimate | null>(null)
  const [loadingFee, setLoadingFee] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState<{ txHash: string; amount: string; token: string } | null>(null)
  const [confirmed,  setConfirmed]  = useState(false)

  const chain  = CHAINS.find((c) => c.id === chainId)!
  const tokens = chain.tokens

  // Reset token when chain changes
  useEffect(() => {
    if (!tokens.includes(token)) setToken(tokens[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/auth"); return }
    }
    init()
  }, [router])

  // Estimate fee when inputs change
  useEffect(() => {
    if (!amount || !toAddress || parseFloat(amount) <= 0) { setFeeData(null); return }
    const timer = setTimeout(async () => {
      setLoadingFee(true)
      try {
        const params = new URLSearchParams({ chainId: String(chainId), token, amount, toAddress })
        const res  = await fetch(`/api/withdraw?${params}`)
        if (res.ok) setFeeData(await res.json())
        else setFeeData(null)
      } finally {
        setLoadingFee(false)
      }
    }, 700)
    return () => clearTimeout(timer)
  }, [chainId, token, amount, toAddress])

  const submit = async () => {
    if (!confirmed) { setError("Please confirm the withdrawal details."); return }
    setSubmitting(true)
    setError(null)

    try {
      const res  = await fetch("/api/withdraw", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ chainId, tokenSymbol: token, amount, toAddress }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Withdrawal failed")
      } else {
        setSuccess({ txHash: data.txHash, amount, token })
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setAmount("")
    setToAddress("")
    setFeeData(null)
    setError(null)
    setSuccess(null)
    setConfirmed(false)
  }

  const isValid = amount && toAddress && parseFloat(amount) > 0 && /^0x[0-9a-fA-F]{40}$/.test(toAddress)

  return (
    <div className="min-h-screen bg-[#0d0a07]">
      <Topbar />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-5 max-w-xl space-y-5 overflow-auto">

          <div>
            <h1 className="text-xl font-mono text-white">Withdraw</h1>
            <p className="font-mono text-[12px] text-[#7a6a5a]">Transfer tokens from your custodial wallet to any external address</p>
          </div>

          {/* ── Success ── */}
          {success && (
            <div className="bg-[#1a1410] border border-emerald-500/20 rounded-xl p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl">✓</div>
              <div>
                <div className="font-mono text-[16px] font-bold text-white">Withdrawal Sent</div>
                <div className="font-mono text-[12px] text-[#7a6a5a] mt-1">
                  {success.amount} {success.token} sent to your wallet
                </div>
              </div>
              <div className="w-full bg-[#120d08] border border-[#2e2520] rounded-xl px-4 py-3 font-mono text-[11px]">
                <div className="text-[#7a6a5a] mb-1">Transaction Hash</div>
                <div className="text-white break-all">{success.txHash}</div>
              </div>
              <div className="flex gap-2 w-full">
                <button onClick={reset} className="flex-1 py-2.5 rounded-xl border border-[#2e2520] font-mono text-[12px] text-[#7a6a5a] hover:text-white hover:border-white/20 transition-all cursor-pointer">
                  New Withdrawal
                </button>
                <button onClick={() => router.push("/dashboard/portfolio")} className="flex-1 py-2.5 rounded-xl bg-[#FF5733] hover:bg-[#ff6a4d] font-mono text-[12px] text-white font-bold transition-all cursor-pointer">
                  Portfolio →
                </button>
              </div>
            </div>
          )}

          {/* ── Form ── */}
          {!success && (
            <>
              {/* Network */}
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {CHAINS.map((c) => {
                    const active = chainId === c.id
                    return (
                      <button
                        key={c.id}
                        onClick={() => { setChainId(c.id); setFeeData(null); setError(null) }}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border font-mono text-[11px] transition-all cursor-pointer ${active ? "border-[#FF5733]/50 bg-[#FF5733]/5 text-white" : "border-[#2e2520] bg-[#1a1410] text-[#7a6a5a] hover:border-[#3a2520]"}`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                        {c.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Token */}
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">Token</label>
                <div className="flex flex-wrap gap-2">
                  {tokens.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setToken(t); setFeeData(null) }}
                      className={`px-3 py-1.5 rounded-lg border font-mono text-[12px] transition-all cursor-pointer ${token === t ? "border-[#FF5733]/50 bg-[#FF5733]/5 text-white" : "border-[#2e2520] bg-[#1a1410] text-[#7a6a5a] hover:border-[#3a2520]"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">Amount</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setConfirmed(false) }}
                  className="w-full bg-[#1a1410] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-xl px-4 py-3 font-mono text-[15px] text-white placeholder:text-[#4a3a2a] transition-colors"
                />
              </div>

              {/* Destination */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">Destination Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={toAddress}
                  onChange={(e) => { setToAddress(e.target.value); setConfirmed(false) }}
                  className="w-full bg-[#1a1410] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-xl px-4 py-3 font-mono text-[13px] text-white placeholder:text-[#4a3a2a] transition-colors"
                />
                {toAddress && !/^0x[0-9a-fA-F]{40}$/.test(toAddress) && (
                  <span className="font-mono text-[10px] text-[#FF5733]">Invalid Ethereum address</span>
                )}
              </div>

              {/* Fee estimate */}
              {(loadingFee || feeData) && (
                <div className="bg-[#120d08] border border-[#2e2520] rounded-xl overflow-hidden">
                  {loadingFee ? (
                    <div className="flex items-center gap-2 px-4 py-3 font-mono text-[11px] text-[#7a6a5a]">
                      <span className="flex gap-1">
                        {[0,1,2].map((i) => (
                          <span key={i} className="w-1 h-1 rounded-full bg-[#FF5733] animate-bounce" style={{ animationDelay: `${i*0.12}s` }} />
                        ))}
                      </span>
                      Estimating fee...
                    </div>
                  ) : feeData && (
                    <>
                      {[
                        { label: "Network fee",  value: `${feeData.estimatedFee} ${feeData.token}${feeData.estimatedFeeUsd ? ` (~$${parseFloat(feeData.estimatedFeeUsd).toFixed(2)})` : ""}` },
                        { label: "You receive",  value: `≈ ${(parseFloat(amount) - parseFloat(feeData.estimatedFee)).toFixed(6)} ${token}` },
                        { label: "Network",      value: feeData.network },
                      ].map((row, i, arr) => (
                        <div key={row.label} className={`flex justify-between px-4 py-2 font-mono text-[11px] ${i < arr.length - 1 ? "border-b border-[#2e2520]" : ""}`}>
                          <span className="text-[#7a6a5a]">{row.label}</span>
                          <span className="text-white">{row.value}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Confirm checkbox */}
              {isValid && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <div
                    onClick={() => setConfirmed(!confirmed)}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${confirmed ? "bg-[#FF5733] border-[#FF5733]" : "bg-transparent border-[#3a2520]"}`}
                  >
                    {confirmed && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-[#7a6a5a] leading-relaxed">
                    I confirm I am sending <span className="text-white">{amount} {token}</span> to <span className="text-white font-bold">{toAddress.slice(0, 8)}…{toAddress.slice(-6)}</span>. This action is irreversible.
                  </span>
                </label>
              )}

              {/* Error */}
              {error && (
                <div className="bg-[#FF5733]/5 border border-[#FF5733]/20 rounded-xl px-4 py-3 font-mono text-[12px] text-[#FF5733]">
                  ⚠ {error}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={submit}
                disabled={!isValid || !confirmed || submitting}
                className="w-full py-3.5 rounded-xl font-mono text-[13px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="flex gap-1">
                      {[0,1,2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                      ))}
                    </span>
                    Broadcasting Transaction...
                  </span>
                ) : "Confirm Withdrawal →"}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
