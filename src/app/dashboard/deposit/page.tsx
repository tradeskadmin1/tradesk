"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { supabase } from "@/lib/supabase"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"

const CHAINS = [
  { key: "1",      id: 1,      name: "Ethereum", color: "#627eea", symbol: "ETH", tokens: ["ETH", "USDC", "USDT", "WBTC", "LINK", "UNI", "AAVE"] },
  { key: "56",     id: 56,     name: "BNB Chain", color: "#F0B90B", symbol: "BNB", tokens: ["BNB", "USDT", "USDC"] },
  { key: "42161",  id: 42161,  name: "Arbitrum", color: "#28a0f0", symbol: "ARB", tokens: ["ETH", "USDC", "USDT", "WBTC", "ARB", "LINK", "UNI", "AAVE"] },
  { key: "btc",    id: null,   name: "Bitcoin", color: "#F7931A", symbol: "BTC", tokens: ["BTC"] },
  { key: "trx",    id: null,   name: "Tron", color: "#FF0013", symbol: "TRX", tokens: ["USDT (TRC-20)", "TRX"] },
]

export default function DepositPage() {
  const router = useRouter()

  const [kycStatus, setKycStatus] = useState<string | null>(null)
  const [selectedChain, setSelectedChain] = useState<string>("1")
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/auth"); return }

      const { data: userData } = await supabase
        .from("users")
        .select("kyc_status")
        .eq("id", user.id)
        .maybeSingle()
      const status = (userData as any)?.kyc_status ?? "none"
      setKycStatus(status)

      if (status === "approved") fetchAddress("1")
    }
    init()
  }, [router])

  const fetchAddress = async (chainKey: string) => {
    setLoading(true)
    setAddress(null)
    try {
      const url = (chainKey === "btc" || chainKey === "trx")
        ? `/api/deposit/address?chain=${chainKey}`
        : `/api/deposit/address?chainId=${chainKey}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setAddress(data.address)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChainSelect = (chainKey: string) => {
    setSelectedChain(chainKey)
    setCopied(false)
    setShowQr(false)
    fetchAddress(chainKey)
  }

  const copy = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const chain = CHAINS.find((c) => c.key === selectedChain)!

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

          {kycStatus !== null && kycStatus !== "approved" && (
            <div className="flex flex-col items-center gap-5 py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-[#FF5733]/10 border border-[#FF5733]/30 flex items-center justify-center text-3xl">🪪</div>
              <div>
                <div className="font-mono text-[16px] font-bold text-white mb-2">
                  {kycStatus === "pending" ? "Verification Under Review" : "Identity Verification Required"}
                </div>
                <div className="font-mono text-[12px] text-[#7a6a5a] max-w-xs mx-auto">
                  {kycStatus === "pending"
                    ? "Your documents are being reviewed. Deposits will be unlocked once approved."
                    : kycStatus === "rejected"
                      ? "Your verification was rejected. Resubmit your documents to unlock deposits."
                      : "You need to verify your identity before you can deposit funds. It only takes ~2 minutes."}
                </div>
              </div>
              {kycStatus !== "pending" && (
                <button
                  onClick={() => router.push("/kyc")}
                  className="px-6 py-3 rounded-xl font-mono text-[13px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  Verify Identity →
                </button>
              )}
            </div>
          )}

          {kycStatus === "approved" && (
            <>
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">Select Network</label>
                <div className="flex flex-col gap-2">
                  {CHAINS.map((c) => {
                    const active = selectedChain === c.key
                    return (
                      <button
                        key={c.key}
                        onClick={() => handleChainSelect(c.key)}
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
                    <div className="flex gap-2">
                      {(["address", "qr"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setShowQr(tab === "qr")}
                          className={`flex-1 py-2 rounded-lg font-mono text-[11px] font-bold border transition-all cursor-pointer ${(tab === "qr") === showQr
                              ? "border-[#FF5733]/50 bg-[#FF5733]/10 text-[#FF5733]"
                              : "border-[#2e2520] text-[#7a6a5a] hover:border-[#4a3a2a] hover:text-white"
                            }`}
                        >
                          {tab === "address" ? "📋 Address" : "⬛ QR Code"}
                        </button>
                      ))}
                    </div>

                    {!showQr && (
                      <>
                        <div className="bg-[#120d08] border border-[#2e2520] rounded-xl px-4 py-3.5 font-mono text-[13px] text-white break-all leading-relaxed">
                          {address}
                        </div>
                        <button
                          onClick={copy}
                          className={`w-full py-3 rounded-xl font-mono text-[13px] font-bold transition-all cursor-pointer ${copied
                              ? "bg-emerald-500 text-white"
                              : "bg-[#FF5733] hover:bg-[#ff6a4d] text-white hover:-translate-y-0.5"
                            }`}
                        >
                          {copied ? "✓ Copied!" : "Copy Address"}
                        </button>
                      </>
                    )}

                    {showQr && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-white rounded-2xl shadow-lg">
                          <QRCodeSVG
                            value={address}
                            size={200}
                            bgColor="#ffffff"
                            fgColor="#0d0a07"
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        <div className="w-full bg-[#120d08] border border-[#2e2520] rounded-xl px-4 py-3 text-center">
                          <p className="font-mono text-[10px] text-[#7a6a5a] mb-1">Scan with any wallet app</p>
                          <p className="font-mono text-[11px] text-white break-all">{address.slice(0, 18)}…{address.slice(-6)}</p>
                        </div>
                        <button
                          onClick={copy}
                          className={`w-full py-3 rounded-xl font-mono text-[13px] font-bold transition-all cursor-pointer ${copied
                              ? "bg-emerald-500 text-white"
                              : "border border-[#2e2520] text-[#7a6a5a] hover:text-white hover:border-white/20"
                            }`}
                        >
                          {copied ? "✓ Copied!" : "Copy Address"}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="font-mono text-[12px] text-[#FF5733] py-2">
                    Failed to load wallet address. Make sure you have completed onboarding.
                  </div>
                )}
              </div>

              <div className="bg-[#1e1208] border border-[#FF5733]/10 rounded-xl p-5 space-y-3">
                <div className="font-mono text-[11px] text-[#FF5733] uppercase tracking-widest">Important</div>
                <div className="flex flex-col gap-2.5">
                  {[
                    `Only send ${chain.tokens.join(", ")} to this address on ${chain.name}.`,
                    "Sending any other token or using the wrong network will result in permanent loss.",
                    chain.key === "btc"
                      ? "BTC deposits are credited after 3 network confirmations (~30 minutes)."
                      : chain.key === "trx"
                        ? "TRX/TRC-20 deposits are credited after 20 confirmations (~1 minute)."
                        : "Deposits are credited after blockchain confirmation (usually 1–3 minutes).",
                    chain.key === "btc" || chain.key === "trx"
                      ? "Minimum deposit is $10 equivalent."
                      : "Minimum deposit is determined by gas fees on the network.",
                  ].map((msg, i) => (
                    <div key={i} className="flex items-start gap-2.5 font-mono text-[11px] text-[#c8b8a8]">
                      <span className="text-[#FF5733] shrink-0 mt-0.5">→</span>
                      {msg}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => router.push("/dashboard/portfolio")}
                className="w-full py-3 rounded-xl border border-[#2e2520] font-mono text-[13px] text-[#7a6a5a] hover:text-white hover:border-white/20 transition-all cursor-pointer"
              >
                View Portfolio →
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
