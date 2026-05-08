"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Topbar from "../components/topbar"
import Sidebar from "../components/sidebar"
import MetricCard from "../components/metrics"
import Chart from "../components/chart"
import TopOpportunities from "../components/opportunities"
import SpreadDistribution from "../components/distribution"
import RecentActivity from "../components/activity"
import LiveAlerts from "../components/alerts"
import TradeModal from "../components/trade-modal"

interface DashboardMetrics {
  opportunities:  number
  activeTrades:   number
  totalBalanceUsd: string
  kycStatus:      string
}

export default function DashboardPage() {
  const router = useRouter()

  const [userName,    setUserName]    = useState("")
  const [showTrade,   setShowTrade]   = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [metrics,     setMetrics]     = useState<DashboardMetrics>({
    opportunities:   0,
    activeTrades:    0,
    totalBalanceUsd: "0.00",
    kycStatus:       "none",
  })

  // ── Auth + data load ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/auth")
        return
      }

      // Check onboarded flag — only redirect if the row exists and is
      // explicitly false. If the row is missing (null) the user may have
      // just completed onboarding and the DB write is still propagating,
      // so we allow them through rather than creating a redirect loop.
      const { data: userData, error: userErr } = await supabase
        .from("users")
        .select("onboarded, kyc_status")
        .eq("id", user.id)
        .maybeSingle()

      console.log("[dashboard] userData:", userData, "error:", userErr)

      // Only redirect if the row exists AND onboarded is explicitly false.
      // null means the row doesn't exist yet — allow through.
      if (userData?.onboarded === false) {
        router.replace("/onboarding")
        return
      }

      // Fetch full_name separately — column may be missing in older DB schemas
      try {
        const { data: nameRow } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle()
        if ((nameRow as any)?.full_name) {
          setUserName((nameRow as any).full_name.split(" ")[0])
        }
      } catch { /* column doesn't exist yet — name stays empty */ }

      // Fetch metrics in parallel
      const [oppsRes, historyRes, balancesRes] = await Promise.allSettled([
        fetch("/api/arbitrage/opportunities?limit=1"),
        fetch("/api/trade/history?status=pending&limit=1"),
        fetch("/api/balances"),
      ])

      let opportunities  = 0
      let activeTrades   = 0
      let totalBalanceUsd = "0.00"

      if (oppsRes.status === "fulfilled" && oppsRes.value.ok) {
        const d = await oppsRes.value.json()
        opportunities = d.total ?? 0
      }

      if (historyRes.status === "fulfilled" && historyRes.value.ok) {
        const d = await historyRes.value.json()
        activeTrades = d.total ?? 0
      }

      if (balancesRes.status === "fulfilled" && balancesRes.value.ok) {
        // Balances are token amounts — we show the raw count for now
        const d = await balancesRes.value.json()
        const allBalances: Array<{ balance: string }> = Object.values(d.balances ?? {}).flat() as any
        const nonZero = allBalances.filter((b) => parseFloat(b.balance) > 0).length
        totalBalanceUsd = nonZero > 0 ? `${nonZero} asset${nonZero !== 1 ? "s" : ""}` : "0"
      }

      setMetrics({
        opportunities,
        activeTrades,
        totalBalanceUsd,
        kycStatus: userData?.kyc_status ?? "none",
      })

      setLoading(false)
    }

    init()
  }, [router])

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return "Good Morning"
    if (h < 17) return "Good Afternoon"
    if (h < 21) return "Good Evening"
    return "Hey, Night Owl"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0a07] flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0,1,2].map((i) => (
            <span key={i} className="w-2 h-2 rounded-full bg-[#FF5733] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0a07]">
      <Topbar />

      <div className="flex">
        <Sidebar />

        <div className="flex-1 p-5 space-y-5 overflow-auto">

          {/* KYC banner */}
          {metrics.kycStatus === "none" && (
            <div
              onClick={() => router.push("/kyc")}
              className="flex items-center gap-3 bg-[#1e1208] border border-[#FF5733]/20 rounded-xl px-4 py-3 cursor-pointer hover:border-[#FF5733]/40 transition-all"
            >
              <span className="text-lg">🪪</span>
              <div className="flex-1">
                <span className="font-mono text-[12px] text-white">Complete Identity Verification</span>
                <span className="font-mono text-[11px] text-[#7a6a5a] block">Unlock full trading limits — takes ~2 min</span>
              </div>
              <span className="font-mono text-[11px] text-[#FF5733]">Verify →</span>
            </div>
          )}

          {/* Heading */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-mono text-white">Dashboard</h1>
              <p className="text-xs sm:text-sm text-[#7a6a5a] font-mono">
                {getGreeting()}{userName ? `, ${userName}` : ""}
                {metrics.opportunities > 0
                  ? ` · ${metrics.opportunities} live opportunit${metrics.opportunities === 1 ? "y" : "ies"}`
                  : ""}
              </p>
            </div>
            <button
              onClick={() => metrics.kycStatus === "approved" ? setShowTrade(true) : router.push("/kyc")}
              className="bg-[#FF5733] hover:bg-[#ff6a4d] text-white cursor-pointer px-4 py-2 rounded-xl font-mono text-sm font-bold transition-all hover:-translate-y-0.5 w-full sm:w-auto flex items-center gap-2"
            >
              {metrics.kycStatus !== "approved" && <span>🔒</span>}
              + New Trade
            </button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Total Balance"
              value={metrics.totalBalanceUsd}
              change="Across all chains"
            />
            <MetricCard
              label="Live Opportunities"
              value={String(metrics.opportunities)}
              change="Scan for more"
              positive={metrics.opportunities > 0}
            />
            <MetricCard
              label="Active Trades"
              value={String(metrics.activeTrades)}
              change="Pending settlement"
            />
            <MetricCard
              label="KYC Status"
              value={metrics.kycStatus === "approved" ? "Verified" : metrics.kycStatus === "pending" ? "Under Review" : "Not Submitted"}
              change={metrics.kycStatus === "none" ? "Click to verify →" : ""}
              positive={metrics.kycStatus === "approved"}
            />
          </div>

          {/* Chart */}
          <div className="bg-[#201710] border border-[#2e2520] p-4 rounded-lg">
            <div className="mb-3 text-sm text-[#c8b8a8] font-mono">Portfolio Value</div>
            <Chart />
          </div>

          {/* Lower grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <TopOpportunities kycStatus={metrics.kycStatus} />
              <SpreadDistribution />
            </div>
            <div className="space-y-4">
              <RecentActivity />
              <LiveAlerts />
            </div>
          </div>
        </div>
      </div>

      {showTrade && <TradeModal onClose={() => setShowTrade(false)} kycStatus={metrics.kycStatus} />}
    </div>
  )
}
