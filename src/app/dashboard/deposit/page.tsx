"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"

const CHAINS = [
  { id: 1,     name: "Ethereum",  color: "#627eea", symbol: "ETH",  tokens: ["ETH", "USDC", "USDT", "WBTC", "LINK", "UNI", "AAVE"] },
  { id: 56,    name: "BNB Chain", color: "#F0B90B", symbol: "BNB",  tokens: ["BNB", "USDT", "USDC"] },
  { id: 42161, name: "Arbitrum",  color: "#28a0f0", symbol: "ARB",  tokens: ["ETH", "USDC", "USDT", "WBTC", "ARB", "LINK", "UNI", "AAVE"] },
] as const

export default function DepositPage() {
  const router = useRouter()

  const [selectedChain, setSelectedChain] = useState<number>(1)
  const [address,       setAddress]       = useState<string | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [copied,        setCopied]        = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/auth"); return }
      fetchAddress(selectedChain)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const fetchAddress = async (chainId: number) => {
    setLoading(true)
    setAddress(null)
    try {
      const res = await fetch(`/api/deposit/address?chainId=${chainId}`)
      if (res.ok) {
        const data = await res.json()
        setAddress(data.address)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChainSelect = (chainId: number) => {
    setSelectedChain(chainId)
    setCopied(false)
    fetchAddress(chainId)
  }

  const copy = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const chain = CHAINS.find((c) => c.id === selectedChain)!

  return (
    <div className="min-h-screen bg-[#0d0a07]">
      <Topbar />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-5 max-w-xl space-y-5 overflow-auto">

          <div>
            <h1 className="text-xl font-mono text-white">Deposit</h1>
            <p className="font-mono text-[12px] text-[#7a6a5a]">Send tokens to your custodial wallet address</p>
          </div>

          {/* Chain selector */}
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">Select Network</label>
            <div className="flex flex-col gap-2">
              {CHAINS.map((c) => {
                const active = selectedChain === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => handleChainSelect(c.id)}
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl border font-mono text-left transition-all cursor-pointer ${active ? "border-[#FF5733]/50 bg-[#FF5733]/5" : "border-[#2e2520] bg-[#1a1410] hover:border-[#3a2520]"}`}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${c.color}20`, border: `1px solid ${c.color}40` }}>
                      <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-[14px] font-bold">{c.name}</div>
                      <div className="text-[#7a6a5a] text-[10px] mt-0.5">Supports: {c.tokens.join(", ")}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${active ? "bg-[#FF5733] border-[#FF5733]" : "bg-transparent border-[#3a2520]"}`}>
                      {active && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Address card */}
          <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[12px] text-white font-bold">{chain.name} Deposit Address</span>
              <div className="flex items-center gap-1.5" style={{ color: chain.color }}>
                <div className="w-2 h-2 rounded-full" style={{ background: chain.color }} />
                <span className="font-mono text-[10px]">{chain.name}</span>
              </div>
            </div>

            {loading ? (
              <div className="h-12 rounded-lg bg-[#2a1a14] animate-pulse" />
            ) : address ? (
              <>
                <div className="bg-[#120d08] border border-[#2e2520] rounded-xl px-4 py-3.5 font-mono text-[13px] text-white break-all leading-relaxed">
                  {address}
                </div>
                <button
                  onClick={copy}
                  className={`w-full py-3 rounded-xl font-mono text-[13px] font-bold transition-all cursor-pointer ${copied ? "bg-emerald-500 text-white" : "bg-[#FF5733] hover:bg-[#ff6a4d] text-white hover:-translate-y-0.5"}`}
                >
                  {copied ? "✓ Copied!" : "Copy Address"}
                </button>
              </>
            ) : (
              <div className="font-mono text-[12px] text-[#FF5733] py-2">
                Failed to load wallet address. Make sure you have completed onboarding.
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-[#1e1208] border border-[#FF5733]/10 rounded-xl p-5 space-y-3">
            <div className="font-mono text-[11px] text-[#FF5733] uppercase tracking-widest">Important</div>
            <div className="flex flex-col gap-2.5">
              {[
                `Only send ${chain.tokens.join(", ")} tokens on ${chain.name}.`,
                "Sending the wrong token or using the wrong network will result in permanent loss.",
                "Deposits are credited after blockchain confirmation (usually 1–3 minutes).",
                "Minimum deposit is determined by gas fees on the network.",
              ].map((msg, i) => (
                <div key={i} className="flex items-start gap-2.5 font-mono text-[11px] text-[#c8b8a8]">
                  <span className="text-[#FF5733] shrink-0 mt-0.5">→</span>
                  {msg}
                </div>
              ))}
            </div>
          </div>

          {/* View history */}
          <button
            onClick={() => router.push("/dashboard/portfolio")}
            className="w-full py-3 rounded-xl border border-[#2e2520] font-mono text-[13px] text-[#7a6a5a] hover:text-white hover:border-white/20 transition-all cursor-pointer"
          >
            View Portfolio →
          </button>

        </div>
      </div>
    </div>
  )
}
