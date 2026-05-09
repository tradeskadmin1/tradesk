"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"

interface BalanceRow {
  id: string
  token_symbol: string
  balance: string
  chain_id: number
  updated_at: string
}

interface BalancesByChain {
  [chainId: string]: BalanceRow[]
}

const CHAIN_LABEL: Record<number, { name: string; color: string; symbol: string }> = {
  1: { name: "Ethereum", color: "#627eea", symbol: "ETH" },
  56: { name: "BNB Chain", color: "#F0B90B", symbol: "BNB" },
  42161: { name: "Arbitrum", color: "#28a0f0", symbol: "ARB" },
}

export default function PortfolioPage() {
  const router = useRouter()

  const [balances, setBalances] = useState<BalancesByChain>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const loadBalances = useCallback(async (refresh = false) => {
    const url = refresh ? "/api/balances?refresh=true" : "/api/balances"
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setBalances(data.balances ?? {})
      setUpdatedAt(data.updatedAt ?? null)
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/auth"); return }
      await loadBalances()
    }
    init()
  }, [router, loadBalances])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadBalances(true)
  }

  const chainIds = Object.keys(balances).map(Number)
  const hasAnyBalance = chainIds.some((cid) =>
    balances[cid]?.some((b) => parseFloat(b.balance) > 0)
  )

  return (
    <div className="min-h-screen bg-[#0d0a07]">
      <Topbar />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-5 space-y-5 overflow-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-mono text-white">Portfolio</h1>
              <p className="font-mono text-[12px] text-[#7a6a5a]">
                Custodial wallet balances across all chains
                {updatedAt && ` · updated ${new Date(updatedAt).toLocaleTimeString()}`}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 border border-[#2e2520] hover:border-[#FF5733]/40 text-white px-4 py-2.5 rounded-xl font-mono text-[13px] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {refreshing ? (
                <>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#FF5733] animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </span>
                  Syncing...
                </>
              ) : "↻ Sync Balances"}
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-[#1a1410] animate-pulse" />
              ))}
            </div>
          ) : !hasAnyBalance && chainIds.length === 0 ? (
            <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl p-10 flex flex-col items-center gap-4 text-center">
              <span className="text-4xl opacity-20">💼</span>
              <p className="font-mono text-[13px] text-white">No wallets found</p>
              <p className="font-mono text-[11px] text-[#7a6a5a]">
                Complete onboarding to create your custodial wallets.
              </p>
              <button
                onClick={() => router.push("/onboarding")}
                className="font-mono text-[12px] text-[#FF5733] border border-[#FF5733]/30 px-4 py-2 rounded-xl hover:bg-[#FF5733]/5 transition-all cursor-pointer"
              >
                Go to Onboarding →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {chainIds.map((cid) => {
                const chainInfo = CHAIN_LABEL[cid]
                const rows = balances[cid] ?? []
                const nonZero = rows.filter((b) => parseFloat(b.balance) > 0)

                return (
                  <div key={cid} className="bg-[#1a1410] border border-[#2e2520] rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-[#2e2520]">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: `${chainInfo?.color ?? "#7a6a5a"}20`, border: `1px solid ${chainInfo?.color ?? "#7a6a5a"}40` }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: chainInfo?.color ?? "#7a6a5a" }} />
                      </div>
                      <div>
                        <div className="font-mono text-[14px] text-white font-bold">{chainInfo?.name ?? `Chain ${cid}`}</div>
                        <div className="font-mono text-[10px] text-[#7a6a5a]">{nonZero.length} token{nonZero.length !== 1 ? "s" : ""} with balance</div>
                      </div>
                    </div>

                    {rows.length === 0 ? (
                      <div className="px-5 py-4 font-mono text-[12px] text-[#4a3a2a]">No balances found</div>
                    ) : (
                      <div className="divide-y divide-[#2e2520]">
                        {rows.map((b) => {
                          const bal = parseFloat(b.balance)
                          const hasValue = bal > 0
                          return (
                            <div key={b.id} className={`flex items-center justify-between px-5 py-3 ${!hasValue ? "opacity-30" : ""}`}>
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-[#2a1a14] flex items-center justify-center font-mono text-[10px] text-[#FF5733] font-bold">
                                  {b.token_symbol.slice(0, 2)}
                                </div>
                                <span className="font-mono text-[13px] text-white">{b.token_symbol}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-[13px] text-white">
                                  {hasValue ? bal.toFixed(6) : "0.000000"}
                                </div>
                                <div className="font-mono text-[10px] text-[#7a6a5a]">{b.token_symbol}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="bg-[#1e1208] border border-[#FF5733]/10 rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-[13px] text-white">Fund your portfolio</div>
              <div className="font-mono text-[11px] text-[#7a6a5a] mt-0.5">Deposit directly to your custodial wallets</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/dashboard/deposit")}
                className="font-mono text-[12px] bg-[#FF5733] hover:bg-[#ff6a4d] text-white px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Deposit →
              </button>
              <button
                onClick={() => router.push("/dashboard/withdraw")}
                className="font-mono text-[12px] border border-[#2e2520] text-[#7a6a5a] hover:text-white hover:border-white/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Withdraw
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
