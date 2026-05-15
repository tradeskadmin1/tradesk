"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"

// ─── Sidebar sections ────────────────────────────────────────────────────────

const SECTIONS = [
    {
        group: "Overview",
        items: [
            { id: "introduction",   label: "Introduction" },
            { id: "getting-started", label: "Getting Started" },
        ],
    },
    {
        group: "Trading",
        items: [
            { id: "spot-trading",   label: "Spot Trading" },
            { id: "futures",        label: "Futures & Perpetuals" },
            { id: "arbitrage",      label: "Arbitrage Scanner" },
        ],
    },
    {
        group: "Account",
        items: [
            { id: "deposits",       label: "Deposits" },
            { id: "withdrawals",    label: "Withdrawals" },
            { id: "kyc",            label: "KYC & Verification" },
        ],
    },
    {
        group: "Platform",
        items: [
            { id: "fees",           label: "Fees" },
            { id: "security",       label: "Security" },
            { id: "faq",            label: "FAQ" },
        ],
    },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Badge({ children, color = "orange" }: { children: React.ReactNode; color?: "orange" | "green" | "blue" | "red" }) {
    const colors = {
        orange: "bg-[#FF5733]/10 text-[#FF5733] border-[#FF5733]/20",
        green:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        blue:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
        red:    "bg-rose-500/10 text-rose-400 border-rose-500/20",
    }
    return (
        <span className={`inline-block border rounded-full px-2.5 py-0.5 text-[11px] font-mono font-semibold ${colors[color]}`}>
            {children}
        </span>
    )
}

function Callout({ icon, title, children, type = "info" }: { icon: string; title: string; children: React.ReactNode; type?: "info" | "warning" | "tip" | "danger" }) {
    const styles = {
        info:    "bg-blue-500/5 border-blue-500/20 text-blue-300",
        warning: "bg-amber-500/5 border-amber-500/20 text-amber-300",
        tip:     "bg-emerald-500/5 border-emerald-500/20 text-emerald-300",
        danger:  "bg-rose-500/5 border-rose-500/20 text-rose-300",
    }
    return (
        <div className={`flex gap-3 border rounded-xl p-4 my-5 ${styles[type]}`}>
            <span className="text-lg shrink-0 mt-0.5">{icon}</span>
            <div>
                <div className="font-mono font-semibold text-[13px] mb-1">{title}</div>
                <div className="text-[13px] leading-relaxed text-[#a8b8c8]">{children}</div>
            </div>
        </div>
    )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-4 mb-6">
            <div className="shrink-0 w-8 h-8 rounded-full bg-[#FF5733]/10 border border-[#FF5733]/30 flex items-center justify-center font-mono text-[13px] font-bold text-[#FF5733]">
                {n}
            </div>
            <div className="pt-1">
                <div className="font-mono font-semibold text-white text-[14px] mb-1">{title}</div>
                <div className="text-[13px] text-[#7a8a9a] leading-relaxed">{children}</div>
            </div>
        </div>
    )
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <h2 id={id} className="font-mono text-[22px] font-bold text-white mt-14 mb-5 scroll-mt-24 border-b border-[#2e2520] pb-3">
            {children}
        </h2>
    )
}

function SubHeading({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <h3 id={id} className="font-mono text-[16px] font-semibold text-white mt-8 mb-3 scroll-mt-24">
            {children}
        </h3>
    )
}

function P({ children }: { children: React.ReactNode }) {
    return <p className="text-[14px] text-[#8a9aaa] leading-[1.75] mb-4">{children}</p>
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState("introduction")
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)

    // Track active section on scroll
    useEffect(() => {
        const allIds = SECTIONS.flatMap(s => s.items.map(i => i.id))
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id)
                    }
                }
            },
            { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
        )
        allIds.forEach(id => {
            const el = document.getElementById(id)
            if (el) observer.observe(el)
        })
        return () => observer.disconnect()
    }, [])

    const scrollTo = (id: string) => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: "smooth" })
        setSidebarOpen(false)
    }

    return (
        <div className="min-h-screen bg-[#0d0a07] text-white">

            {/* ── Top navbar ───────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 bg-[#0d0a07]/95 backdrop-blur border-b border-[#2e2520]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
                    <div className="flex items-center gap-4">
                        {/* Mobile sidebar toggle */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden flex flex-col gap-1 w-5"
                            aria-label="Toggle sidebar"
                        >
                            <span className="block h-0.5 w-full bg-[#7a6a5a] rounded" />
                            <span className="block h-0.5 w-full bg-[#7a6a5a] rounded" />
                            <span className="block h-0.5 w-full bg-[#7a6a5a] rounded" />
                        </button>
                        <Link href="/" className="flex items-center gap-2">
                            <Image src="/logo.png" alt="Tradesk" width={26} height={26} />
                            <span className="font-mono font-bold text-[15px]">
                                Trade<span className="text-[#FF5733]">sk</span>
                                <span className="text-[#4a3a2a] ml-2 font-normal text-[12px]">/ Docs</span>
                            </span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:block text-[11px] font-mono text-[#4a3a2a] border border-[#2e2520] rounded-full px-3 py-1">
                            v1.0
                        </span>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto flex">

                {/* ── Sidebar ──────────────────────────────────────────────── */}
                <>
                    {/* Mobile backdrop */}
                    {sidebarOpen && (
                        <div
                            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}

                    <aside className={`
                        fixed top-14 bottom-0 left-0 z-40 w-64 bg-[#0d0a07] border-r border-[#2e2520]
                        overflow-y-auto px-4 py-6 transition-transform duration-300
                        lg:sticky lg:translate-x-0 lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-56 lg:shrink-0
                        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                    `}>
                        {SECTIONS.map((section) => (
                            <div key={section.group} className="mb-6">
                                <div className="text-[10px] uppercase tracking-widest text-[#4a3a2a] font-semibold font-mono mb-2 px-2">
                                    {section.group}
                                </div>
                                {section.items.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => scrollTo(item.id)}
                                        className={`w-full text-left px-2 py-2 rounded-md font-mono text-[13px] transition-colors block ${
                                            activeSection === item.id
                                                ? "text-[#FF5733] bg-[#2a1a14]"
                                                : "text-[#7a6a5a] hover:text-white"
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </aside>
                </>

                {/* ── Main content ─────────────────────────────────────────── */}
                <main ref={contentRef} className="flex-1 min-w-0 px-6 sm:px-10 py-10 max-w-3xl">

                    {/* ── Introduction ──────────────────────────────────────── */}
                    <div id="introduction" className="scroll-mt-24">
                        <Badge>v1.0 Docs</Badge>
                        <h1 className="font-mono text-[32px] sm:text-[40px] font-extrabold text-white mt-4 mb-3 leading-tight">
                            Tradesk Documentation
                        </h1>
                        <P>
                            Tradesk is a professional-grade decentralized trading platform. Trade spot and perpetual
                            markets, run arbitrage strategies, and manage your portfolio — all from a single non-custodial interface
                            across Ethereum, Arbitrum, and BNB Chain.
                        </P>

                        {/* Role cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 mb-10">
                            {[
                                { icon: "📈", role: "Spot Trader", desc: "Buy and sell tokens across chains using best-price DEX routing.", id: "spot-trading" },
                                { icon: "⚡", role: "Arbitrageur", desc: "Scan cross-exchange spreads and execute arb trades in one click.", id: "arbitrage" },
                                { icon: "📊", role: "Futures Trader", desc: "Long or short with up to 50× leverage on perpetual markets.", id: "futures" },
                            ].map((card) => (
                                <button
                                    key={card.role}
                                    onClick={() => scrollTo(card.id)}
                                    className="text-left p-4 rounded-xl bg-[#131008] border border-[#2e2520] hover:border-[#FF5733]/30 hover:bg-[#1a1208] transition-all group"
                                >
                                    <div className="text-2xl mb-2">{card.icon}</div>
                                    <div className="font-mono font-semibold text-[13px] text-white mb-1 group-hover:text-[#FF5733] transition-colors">
                                        {card.role}
                                    </div>
                                    <div className="text-[12px] text-[#6a7a8a] leading-relaxed">{card.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Getting Started ───────────────────────────────────── */}
                    <SectionHeading id="getting-started">Getting Started</SectionHeading>
                    <P>Follow these steps to go from sign-up to your first live trade in under five minutes.</P>

                    <Step n={1} title="Create an account">
                        Go to the <strong className="text-white">Launch App</strong> page and sign up with your email.
                        A magic link will be sent — click it to verify and you are in.
                    </Step>
                    <Step n={2} title="Complete onboarding">
                        On first login you will be guided through onboarding. Tradesk generates a custodial wallet for you
                        on each supported chain (Ethereum, Arbitrum, BNB Chain). Your private keys are encrypted and
                        stored with AWS KMS — only you can authorise transactions.
                    </Step>
                    <Step n={3} title="Verify your identity (KYC)">
                        Basic KYC unlocks full trading limits. Navigate to <strong className="text-white">Dashboard → Verify Identity</strong> and
                        submit a government-issued ID. Approval typically takes under 2 minutes.
                    </Step>
                    <Step n={4} title="Deposit funds">
                        Go to <strong className="text-white">Dashboard → Deposit</strong>. Send USDC or USDT to your
                        custodial wallet address on any supported chain. Funds are credited once the transaction confirms.
                    </Step>
                    <Step n={5} title="Place your first trade">
                        Click <strong className="text-white">+ New Trade</strong> from the dashboard. Select a pair,
                        choose buy or sell, enter an amount, and confirm. Your trade routes through 0x Protocol for
                        best-price execution.
                    </Step>

                    <Callout icon="💡" title="Tip" type="tip">
                        You can browse the Arbitrage Scanner without depositing funds — scan live opportunities before
                        committing any capital.
                    </Callout>

                    {/* ── Spot Trading ──────────────────────────────────────── */}
                    <SectionHeading id="spot-trading">Spot Trading</SectionHeading>
                    <P>
                        Spot trading lets you buy or sell tokens at the current market price. Tradesk routes your order
                        through <strong className="text-white">0x Protocol</strong>, which aggregates liquidity from
                        Uniswap, Curve, PancakeSwap, Camelot and 40+ other DEXes to guarantee best execution.
                    </P>

                    <SubHeading id="spot-how-it-works">How it works</SubHeading>
                    <P>
                        When you submit a trade, the platform fetches a live quote from the 0x API, which splits your
                        order across multiple pools if needed. The final swap executes on-chain from your custodial
                        wallet. You receive the bought token directly into the same wallet.
                    </P>

                    <SubHeading id="spot-supported-pairs">Supported pairs</SubHeading>
                    <div className="overflow-x-auto mb-6">
                        <table className="w-full text-[13px] font-mono border border-[#2e2520] rounded-xl overflow-hidden">
                            <thead>
                                <tr className="bg-[#131008] text-[#7a6a5a] text-[11px] uppercase tracking-wider">
                                    <th className="text-left px-4 py-2.5">Pair</th>
                                    <th className="text-left px-4 py-2.5">Base</th>
                                    <th className="text-left px-4 py-2.5">Quote</th>
                                    <th className="text-left px-4 py-2.5">Chains</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2e2520]">
                                {[
                                    ["ETH / USDC",  "ETH",  "USDC", "ETH, ARB"],
                                    ["WBTC / USDC", "WBTC", "USDC", "ETH, ARB"],
                                    ["LINK / USDC", "LINK", "USDC", "ETH, ARB, BSC"],
                                    ["UNI / USDC",  "UNI",  "USDC", "ETH"],
                                    ["AAVE / USDC", "AAVE", "USDC", "ETH, ARB"],
                                    ["BNB / USDT",  "BNB",  "USDT", "BSC"],
                                ].map(([pair, base, quote, chains]) => (
                                    <tr key={pair} className="hover:bg-[#131008] transition-colors">
                                        <td className="px-4 py-2.5 text-white font-semibold">{pair}</td>
                                        <td className="px-4 py-2.5 text-[#7a6a5a]">{base}</td>
                                        <td className="px-4 py-2.5 text-[#7a6a5a]">{quote}</td>
                                        <td className="px-4 py-2.5 text-[#7a6a5a]">{chains}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <SubHeading id="spot-slippage">Slippage</SubHeading>
                    <P>
                        Default slippage tolerance is <strong className="text-white">0.5%</strong>. You can adjust this
                        per-pair in the trade modal. For large orders or low-liquidity pairs, increase slippage to avoid
                        reverts — but be aware that higher slippage means your execution price may differ more from the
                        quoted price.
                    </P>

                    <Callout icon="⚠️" title="Note" type="warning">
                        Spot trades are final and on-chain. There is no cancel or undo once a transaction is broadcast
                        to the network. Always double-check the pair and amount before confirming.
                    </Callout>

                    {/* ── Futures ───────────────────────────────────────────── */}
                    <SectionHeading id="futures">Futures & Perpetuals</SectionHeading>
                    <P>
                        Perpetual contracts let you take leveraged long or short positions without expiry. Unlike dated
                        futures, perps use a <strong className="text-white">funding rate</strong> mechanism to keep the
                        contract price anchored to the underlying spot price.
                    </P>

                    <SubHeading id="futures-leverage">Leverage & Margin</SubHeading>
                    <P>
                        Tradesk supports up to <strong className="text-white">50× leverage</strong>. When you open a
                        position, a portion of your balance is locked as collateral (margin). Your PnL, funding fees,
                        and liquidation threshold are all calculated against this collateral.
                    </P>
                    <div className="bg-[#131008] border border-[#2e2520] rounded-xl p-4 mb-5 font-mono text-[13px]">
                        <div className="text-[#7a6a5a] text-[11px] uppercase tracking-wider mb-3">Example — 10× Long</div>
                        <div className="space-y-1.5 text-[#c8b8a8]">
                            <div className="flex justify-between"><span>Collateral</span><span className="text-white">$500</span></div>
                            <div className="flex justify-between"><span>Leverage</span><span className="text-white">10×</span></div>
                            <div className="flex justify-between"><span>Position size</span><span className="text-white">$5,000</span></div>
                            <div className="flex justify-between"><span>Liquidation price (approx.)</span><span className="text-rose-400">−10% from entry</span></div>
                        </div>
                    </div>

                    <SubHeading id="futures-funding">Funding Rates</SubHeading>
                    <P>
                        Funding is exchanged every <strong className="text-white">8 hours</strong> between longs and shorts.
                        When the perp price trades above spot, longs pay shorts. When below, shorts pay longs. The rate
                        is displayed on the futures page before you open a position.
                    </P>

                    <SubHeading id="futures-liquidation">Liquidations</SubHeading>
                    <P>
                        A position is liquidated when its margin falls below the <strong className="text-white">maintenance margin</strong> threshold
                        (1% of position size). The liquidation engine checks all open positions and closes underwater
                        ones automatically.
                    </P>

                    <Callout icon="🚨" title="Risk Warning" type="danger">
                        High leverage amplifies both gains and losses. You can lose your entire collateral. Only trade
                        with funds you can afford to lose. Set a stop-loss on every position.
                    </Callout>

                    {/* ── Arbitrage ─────────────────────────────────────────── */}
                    <SectionHeading id="arbitrage">Arbitrage Scanner</SectionHeading>
                    <P>
                        The Arbitrage Scanner continuously monitors price discrepancies for the same asset across
                        multiple DEXes and chains. When a profitable spread is detected, it appears as an opportunity
                        card you can execute with a single click.
                    </P>

                    <SubHeading id="arb-how-it-works">How it works</SubHeading>
                    <P>
                        The scanner fetches prices from Uniswap, PancakeSwap, Camelot, and SushiSwap every few seconds.
                        For each token pair it calculates the net profit after estimated gas costs. Only opportunities
                        with a net profit above <strong className="text-white">$0.10</strong> are shown.
                    </P>

                    <SubHeading id="arb-same-vs-cross">Same-chain vs cross-chain</SubHeading>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                        {[
                            {
                                type: "Same-chain",
                                badge: "On-chain" as const,
                                color: "green" as const,
                                desc: "Both legs execute as real on-chain swaps from your custodial wallet via 0x. Actual P&L is calculated from receipts.",
                            },
                            {
                                type: "Cross-chain",
                                badge: "Simulated" as const,
                                color: "orange" as const,
                                desc: "Requires bridging infrastructure (Stargate/LayerZero). Currently platform-mediated — your ledger is credited the estimated net profit.",
                            },
                        ].map((item) => (
                            <div key={item.type} className="p-4 bg-[#131008] border border-[#2e2520] rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-mono font-semibold text-white text-[13px]">{item.type}</span>
                                    <Badge color={item.color}>{item.badge}</Badge>
                                </div>
                                <p className="text-[12px] text-[#6a7a8a] leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    <SubHeading id="arb-limits">Daily limits</SubHeading>
                    <P>
                        Arbitrage profit is capped at <strong className="text-white">$500 per user per day</strong> to
                        ensure fair access. The cap resets at midnight UTC. Each opportunity can only be claimed by one
                        user — the system uses atomic database locks to prevent double-execution.
                    </P>

                    <Callout icon="📌" title="Tip" type="tip">
                        Opportunities expire quickly (typically 30–60 seconds). Use the <strong>Scan Now</strong> button
                        to refresh the list before executing. Stale opportunities will return an error and your balance
                        will not be debited.
                    </Callout>

                    {/* ── Deposits ──────────────────────────────────────────── */}
                    <SectionHeading id="deposits">Deposits</SectionHeading>
                    <P>
                        Deposit USDC or USDT to your custodial wallet address to fund your trading account.
                        Tradesk supports deposits on Ethereum, Arbitrum, and BNB Chain.
                    </P>

                    <SubHeading id="deposits-how">How to deposit</SubHeading>
                    <Step n={1} title="Go to Dashboard → Deposit">
                        Select the chain you want to deposit on (Ethereum, Arbitrum, or BNB Chain).
                    </Step>
                    <Step n={2} title="Copy your wallet address">
                        Each chain has a dedicated custodial wallet address. Copy the address for the chain you are
                        depositing on.
                    </Step>
                    <Step n={3} title="Send USDC or USDT">
                        From your external wallet (MetaMask, Coinbase Wallet, exchange, etc.), send USDC or USDT to
                        the copied address. Make sure you are sending on the correct network.
                    </Step>
                    <Step n={4} title="Wait for confirmation">
                        Your balance will be credited once the transaction is confirmed on-chain. ETH and ARB typically
                        confirm within 15 seconds. BSC within 5 seconds.
                    </Step>

                    <Callout icon="⚠️" title="Important" type="warning">
                        Only send USDC or USDT to your deposit address. Sending other tokens to this address may result
                        in permanent loss. Always verify you are on the correct network before sending.
                    </Callout>

                    {/* ── Withdrawals ───────────────────────────────────────── */}
                    <SectionHeading id="withdrawals">Withdrawals</SectionHeading>
                    <P>
                        Withdraw your funds back to any external wallet address at any time. Withdrawals are
                        reviewed and processed by the platform within 24 hours.
                    </P>

                    <SubHeading id="withdrawals-how">How to withdraw</SubHeading>
                    <Step n={1} title="Go to Dashboard → Withdraw">
                        Select the token and chain for your withdrawal.
                    </Step>
                    <Step n={2} title="Enter the destination address">
                        Paste the wallet address you want to withdraw to. Triple-check this address — withdrawals
                        to wrong addresses cannot be recovered.
                    </Step>
                    <Step n={3} title="Enter the amount">
                        Enter the amount you wish to withdraw. The minimum withdrawal is <strong className="text-white">$10</strong>.
                    </Step>
                    <Step n={4} title="Submit and wait for approval">
                        Withdrawal requests are reviewed for security and processed within 24 hours. You will receive
                        an email confirmation once processed.
                    </Step>

                    {/* ── KYC ───────────────────────────────────────────────── */}
                    <SectionHeading id="kyc">KYC & Verification</SectionHeading>
                    <P>
                        Tradesk requires identity verification to comply with anti-money-laundering regulations and to
                        protect the platform from fraud. KYC is a one-time process and typically completes in under
                        2 minutes.
                    </P>

                    <div className="overflow-x-auto mb-6">
                        <table className="w-full text-[13px] font-mono border border-[#2e2520] rounded-xl overflow-hidden">
                            <thead>
                                <tr className="bg-[#131008] text-[#7a6a5a] text-[11px] uppercase tracking-wider">
                                    <th className="text-left px-4 py-2.5">Level</th>
                                    <th className="text-left px-4 py-2.5">Requirements</th>
                                    <th className="text-left px-4 py-2.5">Daily Limit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2e2520]">
                                <tr className="hover:bg-[#131008]">
                                    <td className="px-4 py-3"><Badge color="red">Unverified</Badge></td>
                                    <td className="px-4 py-3 text-[#7a6a5a]">None</td>
                                    <td className="px-4 py-3 text-[#7a6a5a]">View only — no trading</td>
                                </tr>
                                <tr className="hover:bg-[#131008]">
                                    <td className="px-4 py-3"><Badge color="green">Verified</Badge></td>
                                    <td className="px-4 py-3 text-[#7a6a5a]">Gov. ID + selfie</td>
                                    <td className="px-4 py-3 text-white">$50,000</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <Callout icon="🔒" title="Privacy" type="info">
                        KYC documents are processed securely and are never stored on Tradesk servers after verification
                        is complete. Your data is handled in accordance with our Privacy Policy.
                    </Callout>

                    {/* ── Fees ──────────────────────────────────────────────── */}
                    <SectionHeading id="fees">Fees</SectionHeading>
                    <P>
                        Tradesk charges a flat platform fee on profitable trades. Gas costs are always separate and
                        paid to the network. There are no hidden fees.
                    </P>

                    <SubHeading id="fees-spot">Spot Trading Fees</SubHeading>
                    <P>
                        Spot trades execute through 0x Protocol. The 0x fee (typically 0.05–0.15% depending on the
                        route) is included in the quoted price — there is no additional Tradesk fee on spot trades.
                    </P>

                    <SubHeading id="fees-futures">Futures Fees</SubHeading>
                    <div className="overflow-x-auto mb-5">
                        <table className="w-full text-[13px] font-mono border border-[#2e2520] rounded-xl overflow-hidden">
                            <thead>
                                <tr className="bg-[#131008] text-[#7a6a5a] text-[11px] uppercase tracking-wider">
                                    <th className="text-left px-4 py-2.5">Type</th>
                                    <th className="text-left px-4 py-2.5">Fee</th>
                                    <th className="text-left px-4 py-2.5">Note</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2e2520]">
                                {[
                                    ["Open fee",      "0.10%", "Of position size"],
                                    ["Close fee",     "0.10%", "Of position size"],
                                    ["Funding fee",   "Variable", "Every 8 hours, long ↔ short"],
                                    ["Liquidation",   "1.00%", "Of remaining collateral"],
                                ].map(([type, fee, note]) => (
                                    <tr key={type} className="hover:bg-[#131008]">
                                        <td className="px-4 py-2.5 text-white">{type}</td>
                                        <td className="px-4 py-2.5 text-[#FF5733] font-semibold">{fee}</td>
                                        <td className="px-4 py-2.5 text-[#7a6a5a]">{note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <SubHeading id="fees-arbitrage">Arbitrage Fees</SubHeading>
                    <P>
                        Tradesk charges a <strong className="text-white">15% platform fee</strong> on the net profit
                        of each arbitrage trade. If a trade generates $10 profit after gas, Tradesk retains $1.50 and
                        you keep $8.50. Your original capital is always returned in full.
                    </P>

                    <SubHeading id="fees-withdrawal">Withdrawal Fees</SubHeading>
                    <P>
                        Withdrawals incur the on-chain gas cost of the transfer. This is deducted from the withdrawal
                        amount. There is no additional Tradesk fee on withdrawals.
                    </P>

                    {/* ── Security ──────────────────────────────────────────── */}
                    <SectionHeading id="security">Security</SectionHeading>

                    <SubHeading id="security-custody">Custody Model</SubHeading>
                    <P>
                        Tradesk uses a <strong className="text-white">custodial wallet model</strong>. When you complete
                        onboarding, the platform derives a unique HD wallet for you on each supported chain. Your
                        private key is encrypted with <strong className="text-white">AWS KMS</strong> — a hardware security
                        module service — and is never stored in plaintext anywhere. Keys are decrypted in-memory only
                        at the moment of signing and are immediately zeroed out after use.
                    </P>

                    <SubHeading id="security-rate-limits">Rate Limiting & Anti-Abuse</SubHeading>
                    <P>
                        All API endpoints are rate-limited using a Supabase-backed distributed rate limiter shared
                        across all server instances. This prevents brute-force attacks and ensures fair access under
                        high load. Arbitrage opportunities use atomic DB locks to prevent double-claiming.
                    </P>

                    <SubHeading id="security-best-practices">User security tips</SubHeading>
                    <div className="space-y-2 mb-6">
                        {[
                            "Never share your account credentials or session tokens with anyone.",
                            "Tradesk will never ask for your private keys or seed phrase.",
                            "Verify you are on the correct domain before logging in (tradesk-admin1.vercel.app).",
                            "Use a strong, unique password and enable 2FA on your email provider.",
                            "For large balances, withdraw to a hardware wallet when not actively trading.",
                            "Be alert to phishing — bookmark the official URL and always check the address bar.",
                        ].map((tip) => (
                            <div key={tip} className="flex gap-3 text-[13px] text-[#8a9aaa]">
                                <span className="text-[#FF5733] shrink-0 mt-0.5">→</span>
                                <span>{tip}</span>
                            </div>
                        ))}
                    </div>

                    <Callout icon="🐛" title="Bug Bounty" type="info">
                        Found a security vulnerability? Contact us at <strong className="text-white">security@tradesk.io</strong> before
                        public disclosure. Responsible disclosures are rewarded.
                    </Callout>

                    {/* ── FAQ ───────────────────────────────────────────────── */}
                    <SectionHeading id="faq">FAQ</SectionHeading>

                    {[
                        {
                            group: "Account & KYC",
                            qs: [
                                { q: "How long does KYC take?", a: "Usually under 2 minutes. In rare cases it can take up to 24 hours if manual review is required." },
                                { q: "What ID documents are accepted?", a: "Passport, national ID card, or driver's licence. The document must be valid and not expired." },
                                { q: "My KYC was rejected — what do I do?", a: "Check that your document photo is clear, unobstructed, and fully visible. Resubmit with better lighting or a different document." },
                            ],
                        },
                        {
                            group: "Deposits & Withdrawals",
                            qs: [
                                { q: "I sent funds but my balance is not updated.", a: "Deposits are credited on-chain confirmation. ETH/ARB confirm in ~15s; BSC in ~5s. If still missing after 10 minutes, contact support with your transaction hash." },
                                { q: "Can I deposit ETH or BNB instead of USDC/USDT?", a: "Currently only USDC and USDT are supported as deposit tokens. Native gas tokens (ETH, BNB) may be added in a future update." },
                                { q: "How long do withdrawals take?", a: "Withdrawal requests are reviewed and processed within 24 hours. You will receive an email once complete." },
                                { q: "What is the minimum withdrawal amount?", a: "The minimum withdrawal is $10." },
                            ],
                        },
                        {
                            group: "Trading",
                            qs: [
                                { q: "Why did my trade fail?", a: "The most common reasons are: insufficient balance, slippage exceeded, or the token pair is temporarily unavailable on the selected chain. Check your balance and try increasing slippage tolerance." },
                                { q: "Does Tradesk support limit orders?", a: "Not yet — only market orders are currently supported for spot trades. Limit orders are on the roadmap." },
                            ],
                        },
                        {
                            group: "Arbitrage",
                            qs: [
                                { q: "Why do opportunities disappear so fast?", a: "Price spreads close within seconds as bots and other traders act on them. Opportunities are valid for 30–60 seconds from the time they are scanned." },
                                { q: "What is the daily profit cap?", a: "$500 per user per day, resetting at midnight UTC. This ensures fair access across all users." },
                                { q: "Is cross-chain arbitrage real?", a: "Cross-chain opportunities are currently platform-mediated — your ledger is credited the estimated net profit. True on-chain cross-chain execution via Stargate/LayerZero bridge is on the roadmap." },
                            ],
                        },
                        {
                            group: "Futures",
                            qs: [
                                { q: "What is the maximum leverage?", a: "50× on all perpetual markets." },
                                { q: "When am I at risk of liquidation?", a: "When your position's remaining collateral falls below 1% of the position size. You will receive a warning before this threshold is reached." },
                                { q: "How are funding rates calculated?", a: "Funding is based on the premium between the perp price and the index price. Positive premium = longs pay shorts. Paid every 8 hours." },
                            ],
                        },
                    ].map((group) => (
                        <div key={group.group} className="mb-8">
                            <div className="text-[11px] uppercase tracking-widest text-[#FF5733] font-mono font-semibold mb-4">
                                {group.group}
                            </div>
                            <div className="space-y-3">
                                {group.qs.map((item) => (
                                    <FaqItem key={item.q} q={item.q} a={item.a} />
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Footer spacer */}
                    <div className="h-24 border-t border-[#2e2520] mt-10 pt-8 flex items-center">
                        <span className="text-[12px] text-[#4a3a2a] font-mono">Tradesk Docs · v1.0</span>
                    </div>

                </main>

                {/* ── Right anchor nav (desktop) ────────────────────────────── */}
                <aside className="hidden xl:block w-52 shrink-0 py-10 pl-4 pr-2">
                    <div className="sticky top-20">
                        <div className="text-[10px] uppercase tracking-widest text-[#4a3a2a] font-mono font-semibold mb-3">
                            On this page
                        </div>
                        <div className="space-y-1">
                            {SECTIONS.flatMap(s => s.items).map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollTo(item.id)}
                                    className={`w-full text-left text-[12px] font-mono py-1 px-2 rounded transition-colors block ${
                                        activeSection === item.id
                                            ? "text-[#FF5733]"
                                            : "text-[#4a3a2a] hover:text-[#7a6a5a]"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

            </div>
        </div>
    )
}

// ─── FAQ accordion item ───────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="border border-[#2e2520] rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#131008] transition-colors"
            >
                <span className="font-mono text-[13px] text-white pr-4">{q}</span>
                <span className={`text-[#FF5733] text-lg leading-none shrink-0 transition-transform duration-200 ${open ? "rotate-45" : ""}`}>
                    +
                </span>
            </button>
            {open && (
                <div className="px-4 pb-4 text-[13px] text-[#7a8a9a] leading-relaxed border-t border-[#2e2520] pt-3">
                    {a}
                </div>
            )}
        </div>
    )
}
