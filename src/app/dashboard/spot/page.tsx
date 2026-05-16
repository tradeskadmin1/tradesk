"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/supabase"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"
import { SPOT_PAIRS, SPOT_FEE_RATE, type SpotPair, type SpotInterval } from "@/config/spot"

const SpotChart = dynamic(() => import("./SpotChart"), { ssr: false })


// ─── Pair groups for the picker ───────────────────────────────────────────────
const PAIR_GROUPS = [
  { label: "Major",    symbols: ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT", "DOGE/USDT"] },
  { label: "Layer 1",  symbols: ["AVAX/USDT", "NEAR/USDT", "ADA/USDT", "ATOM/USDT", "XLM/USDT", "SUI/USDT"] },
  { label: "DeFi",     symbols: ["LINK/USDT", "ARB/USDT", "UNI/USDT"] },
  { label: "Meme",     symbols: ["PEPE/USDT", "SHIB/USDT", "TRUMP/USDT", "PENGU/USDT", "BONK/USDT", "WIF/USDT", "FLOKI/USDT", "MOODENG/USDT", "POPCAT/USDT", "MEW/USDT", "NEIRO/USDT", "MEME/USDT", "TURBO/USDT", "DOGS/USDT"] },
  { label: "Legacy",   symbols: ["LTC/USDT", "BCH/USDT", "MATIC/USDT"] },
  { label: "Cross",    symbols: ["ETH/BTC"] },
]


// ─── Token icon with letter fallback ─────────────────────────────────────────
function PairIcon({ pair, size = 28 }: { pair: SpotPair; size?: number }) {
  const [err, setErr] = useState(false)
  const px = `${size}px`
  if (!pair.logoUrl || err) {
    return (
      <span
        style={{ width: px, height: px, minWidth: px, fontSize: size < 24 ? 9 : 11 }}
        className="rounded-full flex items-center justify-center font-bold select-none bg-[#2e2520] text-[#FF5733]"
      >
        {pair.base.slice(0, 3)}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={pair.logoUrl} alt={pair.base}
      width={size} height={size}
      style={{ width: px, height: px, minWidth: px }}
      className="rounded-full object-cover"
      onError={() => setErr(true)}
    />
  )
}


// ─── Pair picker (same UX as futures MarketPicker) ────────────────────────────
function PairPicker({
  selected,
  price,
  onSelect,
}: {
  selected: string
  price: number | null
  onSelect: (symbol: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const currentPair = SPOT_PAIRS.find((p) => p.symbol === selected)!

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else setSearch("")
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const q = search.toLowerCase()
  const filtered = q
    ? SPOT_PAIRS.filter(
        (p) =>
          p.symbol.toLowerCase().includes(q) ||
          p.base.toLowerCase().includes(q) ||
          p.quote.toLowerCase().includes(q),
      )
    : null // null = show grouped

  return (
    <>
      {/* ── Trigger ── */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1210] hover:bg-[#2e2520] border border-[#2e2520] transition-colors cursor-pointer"
      >
        <PairIcon pair={currentPair} size={22} />
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[13px] font-bold text-white font-mono">{selected}</span>
          {price != null && (
            <span className="text-[10px] text-[#7a6a5a] font-mono">
              {price.toLocaleString("en-US", { maximumFractionDigits: currentPair.pricePrecision })}
            </span>
          )}
        </div>
        <svg className="w-3.5 h-3.5 text-[#7a6a5a] ml-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* ── Drawer ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-start md:items-start">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel — bottom sheet on mobile, top-left on desktop */}
          <div className="relative w-full md:w-80 bg-[#0e0a08] border-t border-[#2e2520] md:border md:rounded-xl md:mt-16 md:ml-4 md:shadow-2xl flex flex-col max-h-[80vh] md:max-h-[calc(100vh-5rem)] rounded-t-2xl md:rounded-t-xl overflow-hidden">

            {/* Search header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2e2520] shrink-0">
              <svg className="w-4 h-4 text-[#7a6a5a] shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search pairs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-[#4a3a2a] focus:outline-none font-mono"
              />
              <button
                onClick={() => setOpen(false)}
                className="text-[#7a6a5a] hover:text-white transition-colors p-1 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 py-2">
              {filtered ? (
                filtered.length === 0 ? (
                  <p className="text-center text-sm text-[#4a3a2a] py-8">No results</p>
                ) : (
                  filtered.map((p) => (
                    <PairRow
                      key={p.symbol}
                      pair={p}
                      selected={selected}
                      onSelect={() => { onSelect(p.symbol); setOpen(false) }}
                    />
                  ))
                )
              ) : (
                PAIR_GROUPS.map((g) => {
                  const rows = g.symbols
                    .map((s) => SPOT_PAIRS.find((p) => p.symbol === s))
                    .filter(Boolean) as SpotPair[]
                  if (!rows.length) return null
                  return (
                    <div key={g.label}>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#4a3a2a]">
                        {g.label}
                      </p>
                      {rows.map((p) => (
                        <PairRow
                          key={p.symbol}
                          pair={p}
                          selected={selected}
                          onSelect={() => { onSelect(p.symbol); setOpen(false) }}
                        />
                      ))}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PairRow({
  pair,
  selected,
  onSelect,
}: {
  pair: SpotPair
  selected: string
  onSelect: () => void
}) {
  const isSelected = pair.symbol === selected
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#1a1210] cursor-pointer ${isSelected ? "bg-[#1a1210]" : ""}`}
    >
      <PairIcon pair={pair} size={30} />
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white font-mono">{pair.base}</span>
          <span className="text-[10px] text-[#4a3a2a] font-mono">/ {pair.quote}</span>
        </div>
        <div className="text-[11px] text-[#7a6a5a] font-mono truncate">{pair.symbol}</div>
      </div>
      {isSelected && (
        <svg className="w-4 h-4 text-[#FF5733] shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  )
}


// ─── Types ────────────────────────────────────────────────────────────────────
interface PriceStats {
  price: number
  change24h: number
  high24h: number
  low24h: number
  volume24h: number
}

interface SpotOrder {
  id: string
  pair: string
  base: string
  quote: string
  side: "buy" | "sell"
  type: "market" | "limit"
  amount: string
  price: string | null
  avg_fill_price: string | null
  total: string | null
  fee: string | null
  fee_token: string | null
  status: "open" | "filled" | "cancelled" | "partial"
  created_at: string
  filled_at: string | null
}


function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtPrice(price: number, pairSymbol: string) {
  const p = SPOT_PAIRS.find((x) => x.symbol === pairSymbol)
  return price.toFixed(p?.pricePrecision ?? 2)
}


// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SpotPage() {
  const router = useRouter()

  const [selectedPair, setSelectedPair] = useState("BTC/USDT")
  const [chartInterval, setChartInterval] = useState<SpotInterval>("1h")
  const pair = SPOT_PAIRS.find((p) => p.symbol === selectedPair)!

  const [priceStats, setPriceStats] = useState<PriceStats | null>(null)
  const [priceLoading, setPriceLoading] = useState(true)

  const [side, setSide] = useState<"buy" | "sell">("buy")
  const [orderType, setOrderType] = useState<"market" | "limit">("market")
  const [amount, setAmount] = useState("")
  const [limitPrice, setLimitPrice] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [balances, setBalances] = useState<Record<string, string>>({})

  const [orders, setOrders] = useState<SpotOrder[]>([])
  const [historyTab, setHistoryTab] = useState<"open" | "filled">("filled")
  const [cancelling, setCancelling] = useState<string | null>(null)


  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.replace("/auth")
    })()
  }, [router])


  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(`/api/spot/price?pair=${encodeURIComponent(selectedPair)}`)
      if (!res.ok) return
      const data = await res.json()
      setPriceStats(data)
    } catch { /* silent */ } finally {
      setPriceLoading(false)
    }
  }, [selectedPair])

  useEffect(() => {
    setPriceLoading(true)
    setPriceStats(null)
    fetchPrice()
    const id = window.setInterval(fetchPrice, 5_000)
    return () => window.clearInterval(id)
  }, [fetchPrice])


  const fetchBalances = useCallback(async () => {
    try {
      const res = await fetch("/api/spot/balances")
      if (res.ok) {
        const data = await res.json()
        setBalances(data.balances ?? {})
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchBalances() }, [fetchBalances])

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/spot/order?status=${historyTab}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders ?? [])
      }
    } catch { /* silent */ }
  }, [historyTab])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    setAmount("")
    setLimitPrice("")
    setError(null)
    setSuccessMsg(null)
  }, [selectedPair, side, orderType])


  const effectivePrice = orderType === "limit" && limitPrice
    ? parseFloat(limitPrice)
    : priceStats?.price ?? 0

  const total = parseFloat(amount || "0") * effectivePrice
  const fee = total * SPOT_FEE_RATE

  const availableBalance = side === "buy"
    ? parseFloat(balances[pair.quote] ?? "0")
    : parseFloat(balances[pair.base] ?? "0")

  const fillPercent = (pct: number) => {
    if (!effectivePrice) return
    if (side === "buy") {
      const maxBase = (availableBalance * pct) / (effectivePrice * (1 + SPOT_FEE_RATE))
      setAmount(maxBase.toFixed(pair.amountPrecision))
    } else {
      setAmount((availableBalance * pct).toFixed(pair.amountPrecision))
    }
  }

  const submitOrder = async () => {
    setError(null)
    setSuccessMsg(null)

    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum < pair.minOrderSize) {
      setError(`Minimum order: ${pair.minOrderSize} ${pair.base}`)
      return
    }
    if (orderType === "limit" && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setError("Enter a valid limit price")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/spot/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: selectedPair, side, type: orderType,
          amount, price: limitPrice || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Order failed")
      } else {
        const verb = side === "buy" ? "Bought" : "Sold"
        if (orderType === "market") {
          setSuccessMsg(`✓ ${verb} ${amountNum} ${pair.base} @ ${fmtPrice(data.fillPrice, selectedPair)} ${pair.quote}`)
        } else {
          setSuccessMsg(`✓ Limit order placed — ${verb} ${amountNum} ${pair.base} @ ${limitPrice} ${pair.quote}`)
        }
        setAmount("")
        setLimitPrice("")
        fetchBalances()
        fetchOrders()
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const cancelOrder = async (id: string) => {
    setCancelling(id)
    try {
      await fetch(`/api/spot/order?id=${id}`, { method: "DELETE" })
      fetchOrders()
      fetchBalances()
    } finally {
      setCancelling(null)
    }
  }

  const priceColor = (priceStats?.change24h ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"

  return (
    <div className="min-h-screen bg-[#0d0a07] flex flex-col">
      <Topbar />

      <div className="flex flex-1 md:overflow-hidden md:h-[calc(100vh-56px)]">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto md:overflow-hidden">

          {/* ── Header bar: pair picker + price stats ── */}
          <div className="shrink-0 border-b border-[#2e2520] bg-[#0d0a07]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">

              {/* Pair picker trigger */}
              <PairPicker
                selected={selectedPair}
                price={priceStats?.price ?? null}
                onSelect={setSelectedPair}
              />

              {/* Divider */}
              <div className="hidden md:block w-px h-8 bg-[#2e2520]" />

              {/* Price stats */}
              {priceLoading ? (
                <div className="h-5 w-28 bg-[#1a1410] rounded animate-pulse" />
              ) : priceStats ? (
                <div className="flex items-center gap-4 flex-wrap">
                  <span className={`font-mono text-[18px] font-bold ${priceColor}`}>
                    {fmtPrice(priceStats.price, selectedPair)}
                  </span>
                  <span className={`font-mono text-[11px] font-bold ${priceColor}`}>
                    {priceStats.change24h >= 0 ? "+" : ""}{priceStats.change24h.toFixed(2)}%
                  </span>
                  <div className="hidden sm:flex items-center gap-4">
                    <Stat label="24h High" value={fmtPrice(priceStats.high24h, selectedPair)} />
                    <Stat label="24h Low"  value={fmtPrice(priceStats.low24h, selectedPair)} />
                    <Stat label="24h Vol"  value={`${fmt(priceStats.volume24h / 1_000_000, 2)}M ${pair.quote}`} />
                  </div>
                </div>
              ) : null}

            </div>
          </div>

          {/* ── Chart + Order form ── */}
          <div className="flex flex-col md:flex-row md:flex-1 md:min-h-0">

            {/* Chart */}
            <div className="flex flex-col min-w-0 md:flex-1 md:min-h-0">
              <div className="h-[300px] md:h-auto md:flex-1 md:min-h-0 border-b md:border-b-0 md:border-r border-[#2e2520]">
                <SpotChart
                  pair={selectedPair}
                  interval={chartInterval}
                  onIntervalChange={setChartInterval}
                />
              </div>
            </div>

            {/* Order form */}
            <div className="w-full md:w-72 shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-[#2e2520] bg-[#0d0a07]">
              {/* Buy / Sell toggle */}
              <div className="grid grid-cols-2 p-3 gap-2 border-b border-[#2e2520]">
                {(["buy", "sell"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSide(s)}
                    className={`py-2.5 rounded-lg font-mono text-[12px] font-bold transition-all cursor-pointer ${
                      side === s
                        ? s === "buy"
                          ? "bg-emerald-500 text-white"
                          : "bg-red-500 text-white"
                        : "bg-[#1a1410] text-[#7a6a5a] hover:text-white border border-[#2e2520]"
                    }`}
                  >
                    {s === "buy" ? "Buy" : "Sell"}
                  </button>
                ))}
              </div>

              <div className="p-3 flex flex-col gap-3">

                {/* Market / Limit */}
                <div className="flex gap-1">
                  {(["market", "limit"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setOrderType(t)}
                      className={`px-3 py-1 rounded font-mono text-[11px] font-bold transition-all cursor-pointer ${
                        orderType === t
                          ? "bg-[#FF5733]/10 text-[#FF5733]"
                          : "text-[#7a6a5a] hover:text-white"
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Available balance */}
                <div className="flex justify-between items-center font-mono text-[11px]">
                  <span className="text-[#7a6a5a]">Available</span>
                  <span className="text-white">
                    {parseFloat(availableBalance.toFixed(6))} {side === "buy" ? pair.quote : pair.base}
                  </span>
                </div>

                {/* Limit price input */}
                {orderType === "limit" && (
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-wider">
                      Price ({pair.quote})
                    </label>
                    <input
                      type="number"
                      placeholder={priceStats ? fmtPrice(priceStats.price, selectedPair) : "0.00"}
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      className="w-full bg-[#1a1410] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-lg px-3 py-2.5 font-mono text-[13px] text-white placeholder:text-[#4a3a2a] transition-colors"
                    />
                  </div>
                )}

                {/* Amount input */}
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-wider">
                    Amount ({pair.base})
                  </label>
                  <input
                    type="number"
                    placeholder={`Min ${pair.minOrderSize}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#1a1410] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-lg px-3 py-2.5 font-mono text-[13px] text-white placeholder:text-[#4a3a2a] transition-colors"
                  />
                  <div className="grid grid-cols-4 gap-1 mt-0.5">
                    {[0.25, 0.5, 0.75, 1].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => fillPercent(pct)}
                        className="py-1.5 rounded font-mono text-[10px] text-[#7a6a5a] bg-[#1a1410] border border-[#2e2520] hover:text-white hover:border-[#3a2520] transition-all cursor-pointer"
                      >
                        {pct * 100}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total / fee summary */}
                {total > 0 && (
                  <div className="bg-[#120d08] border border-[#2e2520] rounded-lg p-2.5 flex flex-col gap-1">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-[#7a6a5a]">Total</span>
                      <span className="text-white">{total.toFixed(pair.quote === "BTC" ? 8 : 2)} {pair.quote}</span>
                    </div>
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-[#7a6a5a]">Fee (0.1%)</span>
                      <span className="text-white">{fee.toFixed(pair.quote === "BTC" ? 8 : 4)} {pair.quote}</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="font-mono text-[11px] text-[#FF5733] bg-[#FF5733]/5 border border-[#FF5733]/20 rounded-lg px-3 py-2">
                    ⚠ {error}
                  </div>
                )}
                {successMsg && (
                  <div className="font-mono text-[11px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                    {successMsg}
                  </div>
                )}

                <button
                  onClick={submitOrder}
                  disabled={submitting || !amount || !priceStats}
                  className={`w-full py-3 rounded-xl font-mono text-[13px] font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    side === "buy"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                      : "bg-red-500 hover:bg-red-400 text-white"
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </span>
                      Placing Order…
                    </span>
                  ) : (
                    `${side === "buy" ? "Buy" : "Sell"} ${pair.base}`
                  )}
                </button>

              </div>
            </div>
          </div>

          {/* ── Order history ── */}
          <div className="border-t border-[#2e2520] bg-[#0d0a07] shrink-0">
            <div className="flex items-center gap-4 px-4 border-b border-[#1a1410]">
              {(["filled", "open"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setHistoryTab(tab)}
                  className={`py-2.5 font-mono text-[11px] font-bold border-b-2 transition-all cursor-pointer ${
                    historyTab === tab
                      ? "border-[#FF5733] text-[#FF5733]"
                      : "border-transparent text-[#7a6a5a] hover:text-white"
                  }`}
                >
                  {tab === "filled" ? "Trade History" : "Open Orders"}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              {orders.length === 0 ? (
                <div className="px-4 py-5 font-mono text-[11px] text-[#7a6a5a] text-center">
                  No {historyTab === "filled" ? "trade history" : "open orders"} yet
                </div>
              ) : (
                <table className="w-full font-mono text-[11px]">
                  <thead className="sticky top-0 bg-[#0d0a07]">
                    <tr className="text-[#7a6a5a]">
                      <th className="text-left px-3 py-2">Pair</th>
                      <th className="text-left px-3 py-2">Side</th>
                      <th className="hidden sm:table-cell text-left px-3 py-2">Type</th>
                      <th className="text-right px-3 py-2">Amount</th>
                      <th className="text-right px-3 py-2">Price</th>
                      <th className="hidden sm:table-cell text-right px-3 py-2">Total</th>
                      <th className="hidden sm:table-cell text-right px-3 py-2">Time</th>
                      {historyTab === "open" && <th className="text-right px-3 py-2">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t border-[#1a1410] hover:bg-[#1a1410]/50">
                        <td className="px-3 py-2 text-white">{order.pair}</td>
                        <td className={`px-3 py-2 font-bold ${order.side === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                          {order.side.toUpperCase()}
                        </td>
                        <td className="hidden sm:table-cell px-3 py-2 text-[#7a6a5a] capitalize">{order.type}</td>
                        <td className="px-3 py-2 text-right text-white">
                          {parseFloat(order.amount).toFixed(4)} {order.base}
                        </td>
                        <td className="px-3 py-2 text-right text-white">
                          {order.avg_fill_price
                            ? parseFloat(order.avg_fill_price).toFixed(2)
                            : order.price
                              ? parseFloat(order.price).toFixed(2)
                              : "—"}
                        </td>
                        <td className="hidden sm:table-cell px-3 py-2 text-right text-white">
                          {order.total ? parseFloat(order.total).toFixed(2) : "—"}
                        </td>
                        <td className="hidden sm:table-cell px-3 py-2 text-right text-[#7a6a5a]">
                          {new Date(order.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        {historyTab === "open" && (
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => cancelOrder(order.id)}
                              disabled={cancelling === order.id}
                              className="text-[#FF5733] hover:text-white font-mono text-[10px] cursor-pointer disabled:opacity-40"
                            >
                              {cancelling === order.id ? "…" : "Cancel"}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[10px] text-[#7a6a5a]">{label}</span>
      <span className="font-mono text-[12px] text-white">{value}</span>
    </div>
  )
}
