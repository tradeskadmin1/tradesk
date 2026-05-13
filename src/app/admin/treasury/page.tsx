"use client"

import { useEffect, useState, useCallback } from "react"

const CHAIN_NAMES: Record<number, string> = { 1: "Ethereum", 56: "BSC", 42161: "Arbitrum" }
const SOURCE_LABELS: Record<string, string> = {
    futures_open: "Futures open fee",
    futures_close: "Futures close fee",
    arbitrage: "Arbitrage fee",
}

interface Balance {
    chain_id: number
    token_symbol: string
    token_address: string
    balance: string
}

interface RevenueRow {
    id: string
    source: string
    amount: string
    token_symbol: string
    chain_id: number
    note: string | null
    created_at: string
    user_id: string
}

interface SweepRow {
    id: string
    amount: string
    note: string | null
    created_at: string
}

interface TreasuryData {
    balances: Balance[]
    sourceTotals: Record<string, number>
    recent: RevenueRow[]
    sweeps: SweepRow[]
}

function fmt(n: number | string) {
    return parseFloat(String(n)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
}

// ── Sweep modal ───────────────────────────────────────────────────────────────
function SweepModal({
    balance,
    onClose,
    onSwept,
}: {
    balance: Balance
    onClose: () => void
    onSwept: () => void
}) {
    const [amount, setAmount] = useState(balance.balance)
    const [dest, setDest] = useState("")
    const [note, setNote] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const max = parseFloat(balance.balance)

    const submit = async () => {
        setError(null)
        const amt = parseFloat(amount)
        if (!isFinite(amt) || amt <= 0) { setError("Enter a valid amount"); return }
        if (amt > max) { setError(`Max available is $${fmt(max)}`); return }

        setLoading(true)
        try {
            const res = await fetch("/api/admin/treasury/sweep", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chainId: balance.chain_id,
                    tokenSymbol: balance.token_symbol,
                    tokenAddress: balance.token_address,
                    amount: amt,
                    destinationAddress: dest || undefined,
                    note: note || undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Sweep failed")
            setSuccess(`Swept $${fmt(amt)} ${balance.token_symbol}. Remaining: $${fmt(data.remainingBalance)}`)
            onSwept()
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-[#0e0a08] border border-[#2e2520] rounded-xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg">Sweep Treasury</h2>
                    <button onClick={onClose} className="text-[#7a6a5a] hover:text-white text-xl leading-none">×</button>
                </div>

                <div className="bg-[#1a1210] rounded-lg p-3 text-sm flex justify-between">
                    <span className="text-[#7a6a5a]">Available</span>
                    <span className="text-white font-semibold">
                        ${fmt(balance.balance)} {balance.token_symbol} on {CHAIN_NAMES[balance.chain_id] ?? balance.chain_id}
                    </span>
                </div>

                <div>
                    <label className="block text-xs text-[#7a6a5a] mb-1">Amount to sweep</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="flex-1 bg-[#1a1210] border border-[#2e2520] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF5733]"
                        />
                        <button
                            onClick={() => setAmount(balance.balance)}
                            className="px-3 py-2 rounded-md bg-[#2e2520] text-xs text-[#7a6a5a] hover:text-white transition-colors"
                        >
                            Max
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-[#7a6a5a] mb-1">
                        Destination wallet address <span className="text-[#4a3a2a]">(optional — for your records)</span>
                    </label>
                    <input
                        type="text"
                        placeholder="0x…"
                        value={dest}
                        onChange={(e) => setDest(e.target.value)}
                        className="w-full bg-[#1a1210] border border-[#2e2520] rounded-md px-3 py-2 text-sm text-white font-mono placeholder-[#4a3a2a] focus:outline-none focus:border-[#FF5733]"
                    />
                </div>

                <div>
                    <label className="block text-xs text-[#7a6a5a] mb-1">Note <span className="text-[#4a3a2a]">(optional)</span></label>
                    <input
                        type="text"
                        placeholder="e.g. Monthly sweep to cold wallet"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full bg-[#1a1210] border border-[#2e2520] rounded-md px-3 py-2 text-sm text-white placeholder-[#4a3a2a] focus:outline-none focus:border-[#FF5733]"
                    />
                </div>

                <div className="bg-[#1a0a00] border border-[#3e2010] rounded-lg p-3 text-xs text-[#f97316] leading-relaxed">
                    ⚠ Sweeping debits the treasury ledger. You must manually transfer the equivalent amount
                    from your hot wallet to the destination address on-chain.
                </div>

                {error && <p className="text-xs text-[#ef4444] bg-[#1c0a0a] rounded-md px-3 py-2">{error}</p>}
                {success && <p className="text-xs text-[#4ade80] bg-[#0a1c0a] rounded-md px-3 py-2">{success}</p>}

                {!success && (
                    <button
                        onClick={submit}
                        disabled={loading}
                        className="py-2.5 rounded-md bg-[#FF5733] hover:bg-[#e04a2b] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        {loading ? "Processing…" : "Confirm Sweep"}
                    </button>
                )}
            </div>
        </div>
    )
}


// ── Page ──────────────────────────────────────────────────────────────────────
export default function TreasuryPage() {
    const [data, setData] = useState<TreasuryData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sweeping, setSweeping] = useState<Balance | null>(null)
    const [tab, setTab] = useState<"recent" | "sweeps">("recent")

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/treasury")
            if (!res.ok) throw new Error("Failed to load")
            setData(await res.json())
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const totalBalance = data?.balances.reduce((s, b) => s + parseFloat(b.balance), 0) ?? 0
    const totalEarned = Object.values(data?.sourceTotals ?? {}).reduce((s, v) => s + v, 0)

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <span key={i} className="w-2 h-2 rounded-full bg-[#FF5733] animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <p className="text-sm text-[#ef4444]">{error}</p>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-bold text-white">Platform Treasury</h1>
                <p className="text-xs text-[#7a6a5a] mt-0.5">Fee income accumulated from futures and arbitrage trades</p>
            </div>

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Current balance" value={`$${fmt(totalBalance)}`} sub="spendable" accent />
                <StatCard label="Total earned (all time)" value={`$${fmt(totalEarned)}`} sub="before sweeps" />
                <StatCard label="Total swept" value={`$${fmt(totalEarned - totalBalance)}`} sub="removed from ledger" />
            </div>

            {/* ── Revenue by source ── */}
            {data && Object.keys(data.sourceTotals).length > 0 && (
                <div className="bg-[#0e0a08] border border-[#2e2520] rounded-xl p-4">
                    <h2 className="text-sm font-semibold text-white mb-3">Earnings by source</h2>
                    <div className="flex flex-col gap-2">
                        {Object.entries(data.sourceTotals).map(([source, total]) => (
                            <div key={source} className="flex items-center justify-between text-sm">
                                <span className="text-[#7a6a5a]">{SOURCE_LABELS[source] ?? source}</span>
                                <span className="text-white font-semibold">${fmt(total)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Balances + sweep buttons ── */}
            <div className="bg-[#0e0a08] border border-[#2e2520] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2e2520]">
                    <h2 className="text-sm font-semibold text-white">Ledger balances</h2>
                    <p className="text-xs text-[#4a3a2a] mt-0.5">
                        These funds are held inside the platform ledger. Click Sweep to record a withdrawal
                        and then manually transfer the equivalent from your hot wallet on-chain.
                    </p>
                </div>

                {(!data?.balances.length) ? (
                    <p className="px-4 py-6 text-sm text-[#4a3a2a]">No balance yet — fees will appear here once trades are executed.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-[#7a6a5a] border-b border-[#2e2520] text-xs uppercase tracking-wide">
                                <th className="px-4 py-2 text-left font-medium">Chain</th>
                                <th className="px-4 py-2 text-left font-medium">Token</th>
                                <th className="px-4 py-2 text-right font-medium">Balance</th>
                                <th className="px-4 py-2 text-right font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.balances.map((b) => (
                                <tr key={`${b.chain_id}-${b.token_address}`} className="border-b border-[#1a1210] last:border-0">
                                    <td className="px-4 py-3 text-[#7a6a5a]">{CHAIN_NAMES[b.chain_id] ?? b.chain_id}</td>
                                    <td className="px-4 py-3 text-white font-semibold">{b.token_symbol}</td>
                                    <td className="px-4 py-3 text-right text-white font-mono">${fmt(b.balance)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => setSweeping(b)}
                                            className="px-3 py-1 rounded-md text-xs font-semibold bg-[#FF5733] hover:bg-[#e04a2b] text-white transition-colors"
                                        >
                                            Sweep
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Activity tabs ── */}
            <div className="bg-[#0e0a08] border border-[#2e2520] rounded-xl overflow-hidden">
                <div className="flex border-b border-[#2e2520]">
                    {(["recent", "sweeps"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? "text-white border-b-2 border-[#FF5733]" : "text-[#7a6a5a] hover:text-white"}`}
                        >
                            {t === "recent" ? "Fee income" : "Sweep history"}
                        </button>
                    ))}
                </div>

                {tab === "recent" && (
                    <div className="overflow-x-auto">
                        {!data?.recent.length ? (
                            <p className="px-4 py-6 text-sm text-[#4a3a2a]">No revenue recorded yet.</p>
                        ) : (
                            <table className="w-full text-xs min-w-150">
                                <thead>
                                    <tr className="text-[#7a6a5a] border-b border-[#2e2520]">
                                        {["Date", "Source", "Amount", "Chain", "Note"].map((h) => (
                                            <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.recent.map((r) => (
                                        <tr key={r.id} className="border-b border-[#1a1210] last:border-0 hover:bg-[#120c0a]">
                                            <td className="px-4 py-2.5 text-[#7a6a5a] whitespace-nowrap">{fmtDate(r.created_at)}</td>
                                            <td className="px-4 py-2.5 text-white">{SOURCE_LABELS[r.source] ?? r.source}</td>
                                            <td className="px-4 py-2.5 text-[#4ade80] font-semibold">+${fmt(r.amount)}</td>
                                            <td className="px-4 py-2.5 text-[#7a6a5a]">{CHAIN_NAMES[r.chain_id] ?? r.chain_id}</td>
                                            <td className="px-4 py-2.5 text-[#4a3a2a] max-w-xs truncate">{r.note ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {tab === "sweeps" && (
                    <div className="overflow-x-auto">
                        {!data?.sweeps.length ? (
                            <p className="px-4 py-6 text-sm text-[#4a3a2a]">No sweeps recorded yet.</p>
                        ) : (
                            <table className="w-full text-xs min-w-120">
                                <thead>
                                    <tr className="text-[#7a6a5a] border-b border-[#2e2520]">
                                        {["Date", "Amount swept", "Note"].map((h) => (
                                            <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.sweeps.map((s) => (
                                        <tr key={s.id} className="border-b border-[#1a1210] last:border-0 hover:bg-[#120c0a]">
                                            <td className="px-4 py-2.5 text-[#7a6a5a] whitespace-nowrap">{fmtDate(s.created_at)}</td>
                                            <td className="px-4 py-2.5 text-[#f97316] font-semibold">−${fmt(s.amount)}</td>
                                            <td className="px-4 py-2.5 text-[#4a3a2a]">{s.note ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Sweep modal */}
            {sweeping && (
                <SweepModal
                    balance={sweeping}
                    onClose={() => setSweeping(null)}
                    onSwept={() => { setSweeping(null); load() }}
                />
            )}
        </div>
    )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
    return (
        <div className={`rounded-xl border p-4 ${accent ? "border-[#FF5733]/30 bg-[#1a0a00]" : "border-[#2e2520] bg-[#0e0a08]"}`}>
            <p className="text-xs text-[#7a6a5a] mb-1">{label}</p>
            <p className={`text-2xl font-bold ${accent ? "text-[#FF5733]" : "text-white"}`}>{value}</p>
            <p className="text-[10px] text-[#4a3a2a] mt-0.5">{sub}</p>
        </div>
    )
}
