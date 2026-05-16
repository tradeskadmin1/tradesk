"use client"

import { useEffect, useState, useCallback } from "react"

const CHAIN_EXPLORER: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    56: 'https://bscscan.com/tx/',
    42161: 'https://arbiscan.io/tx/',
}

interface TokenBalance {
    symbol: string
    address: string
    decimals: number
    balance: number
}

interface WalletInfo {
    chainId: number
    chainName: string
    address: string
    nativeSymbol: string
    nativeBalance: number
    tokens: TokenBalance[]
}

interface CustodialToken {
    symbol: string
    balance: number
}

interface CustodialChain {
    chain: string
    chainName: string
    chainId: number
    tokens: CustodialToken[]
    pendingWithdrawals: number
}

function fmt(n: number, decimals = 4) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals })
}

function SendModal({
    wallet,
    token,
    onClose,
    onSent,
}: {
    wallet: WalletInfo
    token: TokenBalance | null
    onClose: () => void
    onSent: () => void
}) {
    const [amount, setAmount] = useState('')
    const [toAddr, setToAddr] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<{ txHash: string; status: string } | null>(null)

    const maxBalance = token ? token.balance : wallet.nativeBalance
    const symbol = token ? token.symbol : wallet.nativeSymbol
    const explorer = CHAIN_EXPLORER[wallet.chainId] ?? 'https://etherscan.io/tx/'

    const send = async () => {
        setError(null)
        const amt = parseFloat(amount)
        if (!isFinite(amt) || amt <= 0) { setError('Enter a valid amount'); return }
        if (amt > maxBalance) { setError(`Max available is ${fmt(maxBalance)} ${symbol}`); return }
        if (!toAddr.startsWith('0x') || toAddr.length !== 42) { setError('Invalid destination address'); return }

        setLoading(true)
        try {
            const res = await fetch('/api/admin/hot-wallet/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chainId: wallet.chainId,
                    tokenAddress: token?.address ?? null,
                    tokenSymbol: symbol,
                    decimals: token?.decimals ?? 18,
                    amount: amt,
                    toAddress: toAddr,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Transfer failed')
            setResult({ txHash: data.txHash, status: data.status })
            onSent()
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
                    <h2 className="text-white font-bold text-lg">Send {symbol}</h2>
                    <button onClick={onClose} className="text-[#7a6a5a] hover:text-white text-xl leading-none">×</button>
                </div>

                <div className="bg-[#1a1210] rounded-lg p-3 text-xs flex flex-col gap-1">
                    <div className="flex justify-between">
                        <span className="text-[#7a6a5a]">From</span>
                        <span className="text-white font-mono">{wallet.address.slice(0, 8)}…{wallet.address.slice(-6)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[#7a6a5a]">Network</span>
                        <span className="text-white">{wallet.chainName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[#7a6a5a]">Available</span>
                        <span className="text-white font-semibold">{fmt(maxBalance)} {symbol}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-[#7a6a5a] mb-1">Destination address</label>
                    <input
                        type="text"
                        placeholder="0x…"
                        value={toAddr}
                        onChange={(e) => setToAddr(e.target.value)}
                        className="w-full bg-[#1a1210] border border-[#2e2520] rounded-md px-3 py-2 text-sm text-white font-mono placeholder-[#4a3a2a] focus:outline-none focus:border-[#FF5733]"
                    />
                </div>

                <div>
                    <label className="block text-xs text-[#7a6a5a] mb-1">Amount</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="flex-1 bg-[#1a1210] border border-[#2e2520] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF5733]"
                        />
                        <button
                            onClick={() => setAmount(String(maxBalance))}
                            className="px-3 py-2 rounded-md bg-[#2e2520] text-xs text-[#7a6a5a] hover:text-white transition-colors"
                        >
                            Max
                        </button>
                    </div>
                </div>

                <div className="bg-[#1a0a00] border border-[#3e2010] rounded-lg p-3 text-xs text-[#f97316] leading-relaxed">
                    ⚠ This sends real on-chain funds from the platform hot wallet. This action cannot be undone.
                </div>

                {error && <p className="text-xs text-[#ef4444] bg-[#1c0a0a] rounded-md px-3 py-2">{error}</p>}

                {result ? (
                    <div className="bg-[#0a1c0a] rounded-md px-3 py-3 flex flex-col gap-1.5">
                        <p className="text-xs text-[#4ade80] font-semibold">
                            ✓ Transfer confirmed ({result.status})
                        </p>
                        <a
                            href={`${explorer}${result.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#7a6a5a] hover:text-white font-mono underline break-all"
                        >
                            {result.txHash}
                        </a>
                    </div>
                ) : (
                    <button
                        onClick={send}
                        disabled={loading}
                        className="py-2.5 rounded-md bg-[#FF5733] hover:bg-[#e04a2b] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Sending…' : `Send ${symbol}`}
                    </button>
                )}
            </div>
        </div>
    )
}


function WalletCard({
    wallet,
    onSend,
}: {
    wallet: WalletInfo
    onSend: (wallet: WalletInfo, token: TokenBalance | null) => void
}) {
    const explorer = CHAIN_EXPLORER[wallet.chainId] ?? 'https://etherscan.io/address/'

    return (
        <div className="bg-[#0e0a08] border border-[#2e2520] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2e2520] flex items-center justify-between">
                <div>
                    <h3 className="text-white font-semibold text-sm">{wallet.chainName}</h3>
                    <a
                        href={`${explorer.replace('/tx/', '/address/')}${wallet.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[#7a6a5a] font-mono hover:text-white transition-colors"
                    >
                        {wallet.address}
                    </a>
                </div>
                <span className="text-[10px] bg-[#1a2a1a] text-[#4ade80] px-2 py-0.5 rounded-full font-semibold">
                    HOT
                </span>
            </div>

            <div className="divide-y divide-[#1a1210]">
                <div className="flex items-center justify-between px-4 py-3">
                    <div>
                        <p className="text-sm text-white font-semibold">{wallet.nativeSymbol}</p>
                        <p className="text-[10px] text-[#4a3a2a]">Native</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-white font-mono">{fmt(wallet.nativeBalance, 6)}</span>
                        <button
                            onClick={() => onSend(wallet, null)}
                            disabled={wallet.nativeBalance <= 0}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-[#2e2520] hover:bg-[#FF5733] hover:text-white text-[#7a6a5a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Send
                        </button>
                    </div>
                </div>

                {wallet.tokens.map((t) => (
                    <div key={t.address} className="flex items-center justify-between px-4 py-3">
                        <div>
                            <p className="text-sm text-white font-semibold">{t.symbol}</p>
                            <p className="text-[10px] text-[#4a3a2a] font-mono">{t.address.slice(0, 8)}…</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-white font-mono">{fmt(t.balance)}</span>
                            <button
                                onClick={() => onSend(wallet, t)}
                                disabled={t.balance <= 0}
                                className="px-2.5 py-1 rounded text-xs font-semibold bg-[#2e2520] hover:bg-[#FF5733] hover:text-white text-[#7a6a5a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}


// ─── Custodial (BTC / TRX) card ───────────────────────────────────────────────
function CustodialCard({ chain }: { chain: CustodialChain }) {
    const CHAIN_ICON: Record<string, string> = {
        btc: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
        trx: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
    }

    return (
        <div className="bg-[#0e0a08] border border-[#2e2520] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2e2520] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={CHAIN_ICON[chain.chain]}
                        alt={chain.chainName}
                        width={20} height={20}
                        className="rounded-full object-cover"
                    />
                    <div>
                        <h3 className="text-white font-semibold text-sm">{chain.chainName}</h3>
                        <p className="text-[10px] text-[#4a3a2a]">HD-derived custodial wallets — manually signed</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {chain.pendingWithdrawals > 0 && (
                        <span className="text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full font-semibold">
                            {chain.pendingWithdrawals} pending
                        </span>
                    )}
                    <span className="text-[10px] bg-[#2a1a0a] text-[#f97316] px-2 py-0.5 rounded-full font-semibold">
                        CUSTODIAL
                    </span>
                </div>
            </div>

            <div className="divide-y divide-[#1a1210]">
                {chain.tokens.map((t) => (
                    <div key={t.symbol} className="flex items-center justify-between px-4 py-3">
                        <div>
                            <p className="text-sm text-white font-semibold">{t.symbol}</p>
                            <p className="text-[10px] text-[#4a3a2a]">Total user holdings (ledger)</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-white font-mono">{fmt(t.balance, 8)}</span>
                            <span
                                className="px-2.5 py-1 rounded text-xs font-semibold text-[#4a3a2a] bg-[#1a1210] border border-[#2e2520] cursor-not-allowed select-none"
                                title="BTC/TRX sends are processed manually via the Withdrawals panel"
                            >
                                Manual
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="px-4 py-2.5 border-t border-[#1a1210] bg-[#0a0806]">
                <p className="text-[10px] text-[#4a3a2a] leading-relaxed">
                    Withdrawals for this chain require manual signing. Review and action them in the{' '}
                    <a href="/admin/withdrawals" className="text-[#FF5733] hover:underline">Withdrawals</a> panel.
                </p>
            </div>
        </div>
    )
}


export default function HotWalletPage() {
    const [wallets, setWallets] = useState<WalletInfo[]>([])
    const [custodial, setCustodial] = useState<CustodialChain[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sending, setSending] = useState<{ wallet: WalletInfo; token: TokenBalance | null } | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [evmRes, custodialRes] = await Promise.all([
                fetch('/api/admin/hot-wallet'),
                fetch('/api/admin/hot-wallet/custodial'),
            ])

            if (!evmRes.ok) {
                const data = await evmRes.json()
                throw new Error(data.error ?? 'Failed to load EVM wallets')
            }

            const evmData = await evmRes.json()
            setWallets(evmData.wallets ?? [])

            if (custodialRes.ok) {
                const custodialData = await custodialRes.json()
                setCustodial(custodialData.custodial ?? [])
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const totalUsdc = wallets.reduce((sum, w) => {
        const usdc = w.tokens.find((t) => t.symbol === 'USDC')
        return sum + (usdc?.balance ?? 0)
    }, 0)

    const totalUsdt = wallets.reduce((sum, w) => {
        const usdt = w.tokens.find((t) => t.symbol === 'USDT')
        return sum + (usdt?.balance ?? 0)
    }, 0)

    const totalPending = custodial.reduce((sum, c) => sum + c.pendingWithdrawals, 0)

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-[#FF5733] animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
            </div>
        </div>
    )

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">Hot Wallet</h1>
                    <p className="text-xs text-[#7a6a5a] mt-0.5">On-chain balances across all platform wallets</p>
                </div>
                <div className="flex items-center gap-2">
                    {totalPending > 0 && (
                        <a
                            href="/admin/withdrawals"
                            className="text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2.5 py-1 rounded-full font-semibold hover:bg-amber-400/20 transition-colors"
                        >
                            {totalPending} pending withdrawal{totalPending !== 1 ? 's' : ''}
                        </a>
                    )}
                    <button
                        onClick={load}
                        className="px-3 py-1.5 rounded-md bg-[#1a1210] border border-[#2e2520] text-xs text-[#7a6a5a] hover:text-white transition-colors"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-[#1c0a0a] border border-[#3e1010] rounded-xl p-4 text-sm text-[#ef4444]">
                    {error}
                </div>
            )}

            {/* Summary cards */}
            {wallets.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0e0a08] border border-[#2e2520] rounded-xl p-4">
                        <p className="text-xs text-[#7a6a5a] mb-1">Total USDC</p>
                        <p className="text-2xl font-bold text-white">${fmt(totalUsdc)}</p>
                        <p className="text-[10px] text-[#4a3a2a] mt-0.5">across EVM chains</p>
                    </div>
                    <div className="bg-[#0e0a08] border border-[#2e2520] rounded-xl p-4">
                        <p className="text-xs text-[#7a6a5a] mb-1">Total USDT</p>
                        <p className="text-2xl font-bold text-white">${fmt(totalUsdt)}</p>
                        <p className="text-[10px] text-[#4a3a2a] mt-0.5">across EVM chains</p>
                    </div>
                </div>
            )}

            {wallets.length === 0 && !error ? (
                <div className="bg-[#0e0a08] border border-[#2e2520] rounded-xl p-8 text-center">
                    <p className="text-sm text-[#7a6a5a]">No EVM hot wallets initialized.</p>
                    <p className="text-xs text-[#4a3a2a] mt-1">
                        Call <code className="text-[#FF5733]">POST /api/admin/init-platform-wallets</code> first.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* EVM wallets */}
                    {wallets.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4a3a2a] px-1">
                                EVM — On-chain
                            </p>
                            {wallets.map((w) => (
                                <WalletCard
                                    key={w.chainId}
                                    wallet={w}
                                    onSend={(wallet, token) => setSending({ wallet, token })}
                                />
                            ))}
                        </div>
                    )}

                    {/* Custodial BTC / TRX wallets */}
                    {custodial.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4a3a2a] px-1">
                                Non-EVM — Custodial
                            </p>
                            {custodial.map((c) => (
                                <CustodialCard key={c.chain} chain={c} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {sending && (
                <SendModal
                    wallet={sending.wallet}
                    token={sending.token}
                    onClose={() => setSending(null)}
                    onSent={() => { setSending(null); load() }}
                />
            )}
        </div>
    )
}
