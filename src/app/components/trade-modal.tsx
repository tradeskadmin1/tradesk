"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ACTIVE_PAIRS } from "@/config/pairs"
import { CHAIN_CONFIG, type SupportedChainId } from "@/config/chains"

interface Props {
  onClose:        () => void
  defaultPairId?: string
  kycStatus?:     string
}

interface QuoteData {
  sellToken:       string
  buyToken:        string
  sellAmountHuman: string
  buyAmountHuman:  string
  price:           string
  guaranteedPrice: string
  estimatedGas:    string
  gasFeeUsd:       string | null
}

interface TradeResult {
  txHash:     string
  sellToken:  string
  buyToken:   string
  sellAmount: string
  buyAmount:  string
  price:      string
  dexUsed:    string
}

export default function TradeModal({ onClose, defaultPairId, kycStatus }: Props) {
  const router     = useRouter()
  const overlayRef = useRef<HTMLDivElement>(null)
  const kycApproved = kycStatus === "approved"

  const [pairId,   setPairId]   = useState(defaultPairId ?? ACTIVE_PAIRS[0]?.id ?? "ETH_USDC")
  const [chainId,  setChainId]  = useState<SupportedChainId>(1)
  const [side,     setSide]     = useState<"buy" | "sell">("buy")
  const [amount,   setAmount]   = useState("")

  const [quote,        setQuote]        = useState<QuoteData | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [quoteError,   setQuoteError]   = useState<string | null>(null)

  const [executing, setExecuting] = useState(false)
  const [result,    setResult]    = useState<TradeResult | null>(null)
  const [execError, setExecError] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  // Keep chain in sync with pair's supported chains
  const pair = ACTIVE_PAIRS.find((p) => p.id === pairId)
  useEffect(() => {
    if (pair && !pair.supportedChains.includes(chainId)) {
      setChainId(pair.supportedChains[0] ?? 1)
    }
  }, [pairId, pair, chainId])

  // Debounced quote fetch
  const fetchQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !pair) {
      setQuote(null)
      return
    }

    setLoadingQuote(true)
    setQuoteError(null)

    try {
      const url = `/api/trade/quote?chainId=${chainId}&pairId=${pairId}&side=${side}&amount=${amount}`
      const res  = await fetch(url)
      const data = await res.json()

      if (!res.ok) {
        setQuoteError(data.error ?? "Failed to get quote")
        setQuote(null)
      } else {
        setQuote(data)
        setQuoteError(null)
      }
    } catch {
      setQuoteError("Network error")
    } finally {
      setLoadingQuote(false)
    }
  }, [amount, pairId, chainId, side, pair])

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null)
      setQuoteError(null)
      return
    }
    const timer = setTimeout(fetchQuote, 600)
    return () => clearTimeout(timer)
  }, [amount, pairId, chainId, side, fetchQuote])

  const execute = async () => {
    setExecuting(true)
    setExecError(null)

    try {
      const res  = await fetch("/api/trade/execute", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ chainId, pairId, side, amount }),
      })
      const data = await res.json()

      if (!res.ok) {
        setExecError(data.error ?? "Trade failed")
      } else {
        setResult(data)
      }
    } catch {
      setExecError("Network error")
    } finally {
      setExecuting(false)
    }
  }

  const reset = () => {
    setAmount("")
    setQuote(null)
    setResult(null)
    setExecError(null)
    setQuoteError(null)
  }

  const supportedChains = pair?.supportedChains ?? []

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-md bg-[#1a1510] border border-[#3a2f2a] rounded-3xl p-6 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-mono text-[18px] font-bold">
            New <span className="text-[#FF5733]">Trade</span>
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-2xl leading-none cursor-pointer">×</button>
        </div>

        {/* ── KYC gate ── */}
        {!kycApproved && (
          <div className="flex flex-col items-center gap-5 py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#FF5733]/10 border border-[#FF5733]/30 flex items-center justify-center text-2xl">🪪</div>
            <div>
              <div className="font-mono text-[15px] font-bold text-white mb-1">Identity Verification Required</div>
              <div className="font-mono text-[12px] text-[#7a6a5a] max-w-xs">
                {kycStatus === "pending"
                  ? "Your verification is under review. Trading will be unlocked once approved."
                  : kycStatus === "rejected"
                  ? "Your verification was rejected. Please resubmit your documents to trade."
                  : "Complete a quick identity check to unlock trading. It takes about 2 minutes."}
              </div>
            </div>
            {kycStatus !== "pending" && (
              <button
                onClick={() => { onClose(); router.push("/kyc") }}
                className="px-6 py-3 rounded-xl font-mono text-[13px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                Verify Identity →
              </button>
            )}
            <button onClick={onClose} className="font-mono text-[11px] text-[#4a3a2a] hover:text-[#7a6a5a] transition-colors cursor-pointer">
              Maybe later
            </button>
          </div>
        )}

        {/* ── Success state ── */}
        {kycApproved && result && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl">✓</div>
              <div>
                <div className="font-mono text-[16px] font-bold text-white">Trade Executed</div>
                <div className="font-mono text-[11px] text-[#7a6a5a] mt-1">via {result.dexUsed}</div>
              </div>
            </div>

            <div className="bg-[#120d08] border border-[#2e2520] rounded-xl overflow-hidden">
              {[
                { label: "Sold",    value: `${result.sellAmount} ${result.sellToken}` },
                { label: "Bought",  value: `${result.buyAmount} ${result.buyToken}` },
                { label: "Price",   value: result.price },
                { label: "Tx Hash", value: result.txHash.slice(0, 14) + "…" + result.txHash.slice(-6) },
              ].map((row, i, arr) => (
                <div key={row.label} className={`flex justify-between px-4 py-2.5 font-mono text-[12px] ${i < arr.length - 1 ? "border-b border-[#2e2520]" : ""}`}>
                  <span className="text-[#7a6a5a]">{row.label}</span>
                  <span className="text-white">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 py-2.5 rounded-xl border border-[#3a2f2a] text-white font-mono text-[13px] hover:border-white/20 transition-colors cursor-pointer">
                New Trade
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-[#FF5733] hover:bg-[#ff6a4d] text-white font-mono text-[13px] font-bold transition-colors cursor-pointer">
                Done
              </button>
            </div>
          </div>
        )}

        {/* ── Trade form ── */}
        {kycApproved && !result && (
          <div className="flex flex-col gap-4">
            {/* Pair selector */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-wider">Pair</label>
              <select
                value={pairId}
                onChange={(e) => { setPairId(e.target.value); reset() }}
                className="w-full bg-[#2A2520] border border-[#3a2f2a] focus:border-[#FF5733]/40 outline-none rounded-xl px-4 py-2.5 font-mono text-[13px] text-white transition-colors appearance-none cursor-pointer"
              >
                {ACTIVE_PAIRS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1a1510]">{p.label}</option>
                ))}
              </select>
            </div>

            {/* Chain selector */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-wider">Network</label>
              <div className="flex gap-2">
                {supportedChains.map((cid) => {
                  const cfg    = CHAIN_CONFIG[cid]
                  const active = chainId === cid
                  return (
                    <button
                      key={cid}
                      onClick={() => { setChainId(cid); reset() }}
                      className={`flex-1 py-2 rounded-xl border font-mono text-[12px] transition-all cursor-pointer ${active ? "border-[#FF5733]/50 bg-[#FF5733]/5 text-white" : "border-[#3a2f2a] bg-[#2A2520] text-[#7a6a5a] hover:border-[#4a3f3a]"}`}
                    >
                      {cfg?.shortName ?? cid}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Buy / Sell toggle */}
            <div className="flex gap-2">
              {(["buy", "sell"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSide(s); reset() }}
                  className={`flex-1 py-2.5 rounded-xl border font-mono text-[13px] font-bold transition-all cursor-pointer capitalize ${side === s
                    ? s === "buy"
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      : "border-[#FF5733]/50 bg-[#FF5733]/10 text-[#FF5733]"
                    : "border-[#3a2f2a] bg-[#2A2520] text-[#7a6a5a] hover:border-[#4a3f3a]"
                  }`}
                >
                  {s === "buy" ? `Buy ${pair?.base}` : `Sell ${pair?.base}`}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-wider">
                Amount ({side === "buy" ? pair?.quote : pair?.base})
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#2A2520] border border-[#3a2f2a] focus:border-[#FF5733]/40 outline-none rounded-xl px-4 py-3 font-mono text-[15px] text-white placeholder:text-[#4a3a2a] transition-colors"
              />
              {pair && (
                <div className="font-mono text-[10px] text-[#4a3a2a]">
                  Min: {pair.minTradeSize} {pair.quote} · Slippage: {(pair.defaultSlippage * 100).toFixed(1)}%
                </div>
              )}
            </div>

            {/* Quote */}
            {(loadingQuote || quote || quoteError) && (
              <div className="bg-[#120d08] border border-[#2e2520] rounded-xl overflow-hidden">
                {loadingQuote && (
                  <div className="flex items-center gap-2 px-4 py-3 font-mono text-[11px] text-[#7a6a5a]">
                    <span className="flex gap-1">
                      {[0,1,2].map((i) => (
                        <span key={i} className="w-1 h-1 rounded-full bg-[#FF5733] animate-bounce" style={{ animationDelay: `${i*0.12}s` }} />
                      ))}
                    </span>
                    Getting quote...
                  </div>
                )}
                {!loadingQuote && quoteError && (
                  <div className="px-4 py-3 font-mono text-[11px] text-[#FF5733]">⚠ {quoteError}</div>
                )}
                {!loadingQuote && quote && (
                  <>
                    {[
                      { label: "You receive", value: `${parseFloat(quote.buyAmountHuman).toFixed(6)} ${quote.buyToken}` },
                      { label: "Price",       value: quote.price },
                      { label: "Min received", value: `${parseFloat(quote.guaranteedPrice).toFixed(6)} ${quote.buyToken}` },
                      { label: "Est. gas",    value: quote.gasFeeUsd ? `~$${parseFloat(quote.gasFeeUsd).toFixed(2)}` : `~${quote.estimatedGas} gas` },
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

            {/* Execute error */}
            {execError && (
              <div className="bg-[#FF5733]/5 border border-[#FF5733]/20 rounded-xl px-4 py-2.5 font-mono text-[11px] text-[#FF5733]">
                ⚠ {execError}
              </div>
            )}

            {/* Execute button */}
            <button
              onClick={execute}
              disabled={!quote || !amount || loadingQuote || executing}
              className="w-full py-3.5 rounded-xl font-mono text-[13px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {executing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="flex gap-1">
                    {[0,1,2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                    ))}
                  </span>
                  Executing Trade...
                </span>
              ) : (
                `Confirm ${side === "buy" ? "Buy" : "Sell"} →`
              )}
            </button>

            <p className="font-mono text-[10px] text-[#4a3a2a] text-center">
              Trades execute via your custodial wallet. Irreversible once confirmed.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
