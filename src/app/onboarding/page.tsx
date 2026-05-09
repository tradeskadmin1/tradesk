"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"


type Chain = "ethereum" | "bsc" | "arbitrum"
type TradingStyle = "spot" | "arbitrage" | "both"
type RiskLevel = "conservative" | "moderate" | "aggressive"
type Token = "USDT" | "USDC" | "DAI" | "WBTC" | "ETH"

interface OnboardingData {
    name: string
    email: string
    country: string
    agreedToTerms: boolean
    chains: Chain[]
    tradingStyle: TradingStyle | null
    riskLevel: RiskLevel | null
    depositChain: Chain | null
    depositToken: Token | null
    depositAmount: string
}


const STEPS = ["Identity", "Chains", "Style", "Risk", "Deposit", "Done"]

const COUNTRIES = [
    "United States", "United Kingdom", "Germany", "France", "Canada",
    "Australia", "Singapore", "Japan", "Netherlands", "Switzerland",
    "Brazil", "India", "South Korea", "UAE", "Other",
]

const CHAINS: { id: Chain; name: string; color: string; symbol: string }[] = [
    { id: "ethereum", name: "Ethereum", color: "#627eea", symbol: "ETH" },
    { id: "bsc", name: "BNB Chain", color: "#F0B90B", symbol: "BNB" },
    { id: "arbitrum", name: "Arbitrum One", color: "#28a0f0", symbol: "ARB" },
]

const TOKENS: { symbol: Token; name: string; icon: string }[] = [
    { symbol: "USDT", name: "Tether USD", icon: "₮" },
    { symbol: "USDC", name: "USD Coin", icon: "$" },
    { symbol: "DAI", name: "Dai Stablecoin", icon: "◈" },
    { symbol: "WBTC", name: "Wrapped Bitcoin", icon: "₿" },
    { symbol: "ETH", name: "Ethereum", icon: "Ξ" },
]

const MOCK_BALANCES: Record<Token, string> = {
    USDT: "4,280.00",
    USDC: "2,150.50",
    DAI: "1,820.00",
    WBTC: "0.0412",
    ETH: "1.842",
}


function StepIdentity({
    data, onChange, onNext,
}: {
    data: Pick<OnboardingData, "name" | "email" | "country" | "agreedToTerms">
    onChange: (field: string, value: string | boolean) => void
    onNext: () => void
}) {
    const valid = data.name.trim() && data.email.trim() && data.country && data.agreedToTerms

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h2 className="font-mono text-[22px] font-bold text-white mb-1">Identity Verification</h2>
                <p className="text-[#7a6a5a] text-[13px] font-mono">Required for regulatory compliance. Your data is encrypted.</p>
            </div>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">Full Name</label>
                    <input
                        type="text"
                        placeholder="Alex Okonkwo"
                        value={data.name}
                        onChange={(e) => onChange("name", e.target.value)}
                        className="w-full bg-[#120d08] border border-[#2e2520] focus:border-[#FF5733]/50 outline-none rounded-xl px-4 py-3 font-mono text-[13px] text-white placeholder:text-[#4a3a2a] transition-colors"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">Email Address</label>
                    <input
                        type="email"
                        placeholder="you@example.com"
                        value={data.email}
                        onChange={(e) => onChange("email", e.target.value)}
                        className="w-full bg-[#120d08] border border-[#2e2520] focus:border-[#FF5733]/50 outline-none rounded-xl px-4 py-3 font-mono text-[13px] text-white placeholder:text-[#4a3a2a] transition-colors"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">Country of Residence</label>
                    <select
                        value={data.country}
                        onChange={(e) => onChange("country", e.target.value)}
                        className="w-full bg-[#120d08] border border-[#2e2520] focus:border-[#FF5733]/50 outline-none rounded-xl px-4 py-3 font-mono text-[13px] text-white transition-colors appearance-none cursor-pointer"
                    >
                        <option value="" disabled>Select your country</option>
                        {COUNTRIES.map((c) => (
                            <option key={c} value={c} className="bg-[#1a1410]">{c}</option>
                        ))}
                    </select>
                </div>
                <label className="flex items-start gap-3 cursor-pointer mt-1">
                    <div
                        onClick={() => onChange("agreedToTerms", !data.agreedToTerms)}
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${data.agreedToTerms ? "bg-[#FF5733] border-[#FF5733]" : "bg-transparent border-[#3a2520]"}`}
                    >
                        {data.agreedToTerms && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </div>
                    <span className="font-mono text-[11px] text-[#7a6a5a] leading-relaxed">
                        I confirm the information above is accurate and I agree to the{" "}
                        <span className="text-[#FF5733] cursor-pointer hover:underline">Terms of Service</span>,{" "}
                        <span className="text-[#FF5733] cursor-pointer hover:underline">Privacy Policy</span>, and{" "}
                        <span className="text-[#FF5733] cursor-pointer hover:underline">Risk Disclosure</span>.
                    </span>
                </label>
            </div>
            <div className="flex gap-3 mt-2">
                <button
                    onClick={onNext}
                    disabled={!valid}
                    className="w-full py-3 rounded-xl font-mono text-[13px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                    Continue →
                </button>
            </div>
        </div>
    )
}

function StepChains({
    selected, onChange, onNext, onBack,
}: {
    selected: Chain[]
    onChange: (chains: Chain[]) => void
    onNext: () => void
    onBack: () => void
}) {
    const toggle = (id: Chain) => {
        if (selected.includes(id)) {
            if (selected.length === 1) return
            onChange(selected.filter((c) => c !== id))
        } else {
            onChange([...selected, id])
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="font-mono text-[22px] font-bold text-white mb-1">Select Chains</h2>
                <p className="text-[#7a6a5a] text-[13px] font-mono">Choose which networks you want to trade on.</p>
            </div>
            <div className="flex flex-col gap-3">
                {CHAINS.map((chain) => {
                    const active = selected.includes(chain.id)
                    return (
                        <button
                            key={chain.id}
                            onClick={() => toggle(chain.id)}
                            className={`flex items-center gap-4 w-full px-5 py-4 rounded-xl border font-mono text-left transition-all duration-200 cursor-pointer ${active ? "border-[#FF5733]/50 bg-[#FF5733]/5" : "border-[#2e2520] bg-[#120d08] hover:border-[#3a2520]"}`}
                        >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${chain.color}20`, border: `1px solid ${chain.color}40` }}>
                                <div className="w-3 h-3 rounded-full" style={{ background: chain.color }} />
                            </div>
                            <div className="flex-1">
                                <div className="text-white text-[14px] font-bold">{chain.name}</div>
                                <div className="text-[#7a6a5a] text-[11px] mt-0.5">Native token: {chain.symbol}</div>
                            </div>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${active ? "bg-[#FF5733] border-[#FF5733]" : "bg-transparent border-[#3a2520]"}`}>
                                {active && (
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
            <div className="bg-[#1e1208] border border-[#FF5733]/10 rounded-xl px-4 py-3 font-mono text-[11px] text-[#7a6a5a]">
                💡 You can deposit and trade on all selected chains simultaneously from one dashboard.
            </div>
            <div className="flex gap-3">
                <button onClick={onBack} className="flex-1 py-3 rounded-xl font-mono text-[13px] border border-[#2e2520] text-[#7a6a5a] hover:text-white hover:border-white/20 transition-all cursor-pointer">← Back</button>
                <button onClick={onNext} className="flex-1 py-3 rounded-xl font-mono text-[13px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all hover:-translate-y-0.5 cursor-pointer">Continue →</button>
            </div>
        </div>
    )
}

function StepStyle({
    selected, onChange, onNext, onBack,
}: {
    selected: TradingStyle | null
    onChange: (style: TradingStyle) => void
    onNext: () => void
    onBack: () => void
}) {
    const options: { id: TradingStyle; label: string; icon: string; desc: string }[] = [
        { id: "spot", label: "Spot Trading", icon: "📈", desc: "Buy and sell assets at current market prices across multiple DEXs." },
        { id: "arbitrage", label: "Arbitrage", icon: "⚡", desc: "Exploit price differences across exchanges and chains for risk-adjusted profit." },
        { id: "both", label: "Both", icon: "🎯", desc: "Full access to spot markets and arbitrage scanner. Best for experienced traders." },
    ]

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="font-mono text-[22px] font-bold text-white mb-1">Trading Style</h2>
                <p className="text-[#7a6a5a] text-[13px] font-mono">This shapes your dashboard and opportunity alerts.</p>
            </div>
            <div className="flex flex-col gap-3">
                {options.map((opt) => {
                    const active = selected === opt.id
                    return (
                        <button
                            key={opt.id}
                            onClick={() => onChange(opt.id)}
                            className={`flex items-start gap-4 w-full px-5 py-4 rounded-xl border font-mono text-left transition-all duration-200 cursor-pointer ${active ? "border-[#FF5733]/50 bg-[#FF5733]/5" : "border-[#2e2520] bg-[#120d08] hover:border-[#3a2520]"}`}
                        >
                            <span className="text-2xl shrink-0 mt-0.5">{opt.icon}</span>
                            <div className="flex-1">
                                <div className="text-white text-[14px] font-bold mb-1">{opt.label}</div>
                                <div className="text-[#7a6a5a] text-[11px] leading-relaxed">{opt.desc}</div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${active ? "bg-[#FF5733] border-[#FF5733]" : "bg-transparent border-[#3a2520]"}`}>
                                {active && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                        </button>
                    )
                })}
            </div>
            <div className="flex gap-3">
                <button onClick={onBack} className="flex-1 py-3 rounded-xl font-mono text-[13px] border border-[#2e2520] text-[#7a6a5a] hover:text-white hover:border-white/20 transition-all cursor-pointer">← Back</button>
                <button onClick={onNext} disabled={!selected} className="flex-1 py-3 rounded-xl font-mono text-[13px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0">Continue →</button>
            </div>
        </div>
    )
}

function StepRisk({
    selected, onChange, onNext, onBack,
}: {
    selected: RiskLevel | null
    onChange: (level: RiskLevel) => void
    onNext: () => void
    onBack: () => void
}) {
    const options: { id: RiskLevel; label: string; icon: string; desc: string; color: string; tags: string[] }[] = [
        { id: "conservative", label: "Conservative", icon: "🛡", desc: "Low-risk opportunities only. Smaller spreads, higher certainty trades.", color: "#22c55e", tags: ["< 1% spread", "High liquidity", "Low volatility"] },
        { id: "moderate", label: "Moderate", icon: "⚖️", desc: "Balanced approach. Mix of safe and higher-yield opportunities.", color: "#f59e0b", tags: ["1–2.5% spread", "Mixed liquidity", "Medium volatility"] },
        { id: "aggressive", label: "Aggressive", icon: "🔥", desc: "Maximum yield focus. High spread trades, higher risk tolerance.", color: "#FF5733", tags: ["> 2.5% spread", "Any liquidity", "High volatility"] },
    ]

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="font-mono text-[22px] font-bold text-white mb-1">Risk Tolerance</h2>
                <p className="text-[#7a6a5a] text-[13px] font-mono">Sets the threshold for opportunities shown in your scanner.</p>
            </div>
            <div className="flex flex-col gap-3">
                {options.map((opt) => {
                    const active = selected === opt.id
                    return (
                        <button
                            key={opt.id}
                            onClick={() => onChange(opt.id)}
                            className={`flex items-start gap-4 w-full px-5 py-4 rounded-xl border font-mono text-left transition-all duration-200 cursor-pointer ${active ? "border-[#FF5733]/50 bg-[#FF5733]/5" : "border-[#2e2520] bg-[#120d08] hover:border-[#3a2520]"}`}
                        >
                            <span className="text-2xl shrink-0 mt-0.5">{opt.icon}</span>
                            <div className="flex-1">
                                <div className="text-white text-[14px] font-bold mb-1">{opt.label}</div>
                                <div className="text-[#7a6a5a] text-[11px] leading-relaxed mb-2">{opt.desc}</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {opt.tags.map((tag) => (
                                        <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: `${opt.color}15`, color: opt.color, border: `1px solid ${opt.color}30` }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${active ? "bg-[#FF5733] border-[#FF5733]" : "bg-transparent border-[#3a2520]"}`}>
                                {active && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                        </button>
                    )
                })}
            </div>
            <div className="flex gap-3">
                <button onClick={onBack} className="flex-1 py-3 rounded-xl font-mono text-[13px] border border-[#2e2520] text-[#7a6a5a] hover:text-white hover:border-white/20 transition-all cursor-pointer">← Back</button>
                <button onClick={onNext} disabled={!selected} className="flex-1 py-3 rounded-xl font-mono text-[13px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0">Continue →</button>
            </div>
        </div>
    )
}

function StepDeposit({
    data, onChange, onNext, onBack,
}: {
    data: Pick<OnboardingData, "depositChain" | "depositToken" | "depositAmount">
    onChange: (field: string, value: string) => void
    onNext: () => void
    onBack: () => void
}) {
    const [txState, setTxState] = useState<"idle" | "pending" | "success">("idle")
    const canDeposit = data.depositChain && data.depositToken && data.depositAmount && parseFloat(data.depositAmount) > 0

    const handleDeposit = async () => {
        if (!canDeposit) return
        setTxState("pending")
        await new Promise((r) => setTimeout(r, 2200))
        setTxState("success")
    }

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h2 className="font-mono text-[22px] font-bold text-white mb-1">Fund Your Wallet</h2>
                <p className="text-[#7a6a5a] text-[13px] font-mono">
                    Optional — you can deposit anytime from your dashboard.
                </p>
            </div>

            <div className="flex items-center gap-2 bg-[#1e1208] border border-[#FF5733]/10 rounded-xl px-4 py-3">
                <span className="font-mono text-[10px] text-[#FF5733] uppercase tracking-widest px-2 py-0.5 rounded bg-[#FF5733]/10 border border-[#FF5733]/20">
                    Optional
                </span>
                <span className="font-mono text-[11px] text-[#7a6a5a]">
                    Skip this step and deposit later — your account is fully functional without a balance.
                </span>
            </div>

            <div className="flex flex-col gap-2">
                <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">Deposit Network</label>
                <div className="grid grid-cols-2 gap-2">
                    {CHAINS.map((chain) => {
                        const active = data.depositChain === chain.id
                        return (
                            <button key={chain.id} onClick={() => onChange("depositChain", chain.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-mono text-[13px] transition-all cursor-pointer ${active ? "border-[#FF5733]/50 bg-[#FF5733]/5 text-white" : "border-[#2e2520] bg-[#120d08] text-[#7a6a5a] hover:border-[#3a2520]"}`}>
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: chain.color }} />
                                {chain.name}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">Select Token</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {TOKENS.map((token) => {
                        const active = data.depositToken === token.symbol
                        return (
                            <button key={token.symbol} onClick={() => onChange("depositToken", token.symbol)}
                                className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border font-mono text-[12px] transition-all cursor-pointer ${active ? "border-[#FF5733]/50 bg-[#FF5733]/5 text-white" : "border-[#2e2520] bg-[#120d08] text-[#7a6a5a] hover:border-[#3a2520]"}`}>
                                <span className="text-[18px]">{token.icon}</span>
                                <span className="font-bold">{token.symbol}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {data.depositToken && (
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">Amount</label>
                        <span className="font-mono text-[11px] text-[#7a6a5a]">
                            Balance: <span className="text-[#FF5733]">{MOCK_BALANCES[data.depositToken as Token]} {data.depositToken}</span>
                        </span>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            placeholder="0.00"
                            value={data.depositAmount}
                            onChange={(e) => onChange("depositAmount", e.target.value)}
                            className="w-full bg-[#120d08] border border-[#2e2520] focus:border-[#FF5733]/50 outline-none rounded-xl px-4 py-3 pr-20 font-mono text-[15px] text-white placeholder:text-[#4a3a2a] transition-colors"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <button onClick={() => onChange("depositAmount", MOCK_BALANCES[data.depositToken as Token].replace(/,/g, ""))}
                                className="font-mono text-[10px] text-[#FF5733] hover:text-[#ff6a4d] cursor-pointer uppercase tracking-wider">Max</button>
                            <span className="font-mono text-[12px] text-[#7a6a5a]">{data.depositToken}</span>
                        </div>
                    </div>
                </div>
            )}

            {txState === "pending" && (
                <div className="bg-[#1e1208] border border-[#FF5733]/20 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#FF5733] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                    <span className="font-mono text-[12px] text-[#FF5733]">Confirm transaction in your wallet...</span>
                </div>
            )}

            {txState === "success" && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-emerald-400">✓</span>
                    <span className="font-mono text-[12px] text-emerald-400">
                        Deposit confirmed! {data.depositAmount} {data.depositToken} added to your trading wallet.
                    </span>
                </div>
            )}

            <div className="flex gap-3 mt-1">
                <button onClick={onBack} className="flex-1 py-3 rounded-xl font-mono text-[13px] border border-[#2e2520] text-[#7a6a5a] hover:text-white hover:border-white/20 transition-all cursor-pointer">
                    ← Back
                </button>
                {canDeposit && txState !== "success" && (
                    <button
                        onClick={handleDeposit}
                        disabled={txState === "pending"}
                        className="flex-1 py-3 rounded-xl font-mono text-[13px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                        {txState === "pending" ? "Processing..." : "Deposit →"}
                    </button>
                )}
                <button
                    onClick={onNext}
                    className={`flex-1 py-3 rounded-xl font-mono text-[13px] font-bold transition-all cursor-pointer ${txState === "success"
                        ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                        : "border border-[#2e2520] text-[#7a6a5a] hover:text-white hover:border-white/20"
                        }`}
                >
                    {txState === "success" ? "Continue →" : "Skip for now →"}
                </button>
            </div>
        </div>
    )
}

function StepDone({ data, onFinish }: { data: OnboardingData; onFinish: () => void }) {
    const styleLabel: Record<TradingStyle, string> = { spot: "Spot Trading", arbitrage: "Arbitrage", both: "Spot + Arbitrage" }
    const riskLabel: Record<RiskLevel, string> = { conservative: "Conservative", moderate: "Moderate", aggressive: "Aggressive" }

    const summary = [
        { label: "Name", value: data.name },
        { label: "Chains", value: data.chains.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ") },
        { label: "Style", value: data.tradingStyle ? styleLabel[data.tradingStyle] : "—" },
        { label: "Risk", value: data.riskLevel ? riskLabel[data.riskLevel] : "—" },
        {
            label: "Deposited",
            value: data.depositAmount && data.depositToken
                ? `${data.depositAmount} ${data.depositToken}`
                : "None — deposit from dashboard",
        },
    ]

    return (
        <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">✓</div>
            <div>
                <h2 className="font-mono text-[24px] font-bold text-white mb-2">
                    You're all set, <span className="text-[#FF5733]">{data.name.split(" ")[0]}</span>
                </h2>
                <p className="text-[#7a6a5a] text-[13px] font-mono">Your trading desk is ready. Here's a summary of your setup.</p>
            </div>
            <div className="w-full bg-[#120d08] border border-[#2e2520] rounded-xl overflow-hidden">
                {summary.map((item, i) => (
                    <div key={i} className={`flex justify-between items-center px-5 py-3 font-mono text-[13px] ${i !== summary.length - 1 ? "border-b border-[#2e2520]" : ""}`}>
                        <span className="text-[#7a6a5a] text-[11px] uppercase tracking-wider">{item.label}</span>
                        <span className="text-white font-bold">{item.value}</span>
                    </div>
                ))}
            </div>
            <div className="w-full bg-[#1e1208] border border-[#FF5733]/15 rounded-xl px-5 py-4 text-left">
                <div className="font-mono text-[11px] text-[#FF5733] uppercase tracking-widest mb-2">What's next</div>
                <div className="flex flex-col gap-2">
                    {[
                        "Your scanner is now live with opportunities matching your profile",
                        "Connect your wallet from the dashboard to start trading",
                        "Deposit funds anytime from the dashboard",
                        "Set price alerts from the Alerts panel",
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2.5 font-mono text-[12px] text-[#c8b8a8]">
                            <span className="text-[#FF5733]">→</span>
                            {item}
                        </div>
                    ))}
                </div>
            </div>
            <button
                onClick={onFinish}
                className="w-full py-3.5 rounded-xl font-mono text-[14px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(255,87,51,0.3)] cursor-pointer"
            >
                Go to Dashboard →
            </button>
        </div>
    )
}


function ProgressBar({ step }: { step: number }) {
    return (
        <div className="flex items-center gap-2 mb-8">
            {STEPS.map((label, i) => {
                const idx = i + 1
                const done = step > idx
                const active = step === idx
                return (
                    <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1">
                            <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono text-[11px] font-bold transition-all ${done ? "bg-[#FF5733] border-[#FF5733] text-white" : active ? "bg-[#FF5733]/10 border-[#FF5733] text-[#FF5733]" : "bg-transparent border-[#2e2520] text-[#4a3a2a]"}`}>
                                {done ? "✓" : idx}
                            </div>
                            <span className={`font-mono text-[8px] uppercase tracking-wider hidden sm:block ${active ? "text-[#FF5733]" : done ? "text-[#7a6a5a]" : "text-[#3a2a20]"}`}>
                                {label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`flex-1 h-px mb-4 transition-all ${done ? "bg-[#FF5733]/50" : "bg-[#2e2520]"}`} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default function OnboardingPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [saving, setSaving] = useState(false)
    const [savingMsg, setSavingMsg] = useState("Setting up your trading desk...")
    const [data, setData] = useState<OnboardingData>({
        name: "",
        email: "",
        country: "",
        agreedToTerms: false,
        chains: ["ethereum", "bsc", "arbitrum"],
        tradingStyle: null,
        riskLevel: null,
        depositChain: null,
        depositToken: null,
        depositAmount: "",
    })


    useEffect(() => {
        const checkOnboarded = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userData } = await supabase
                .from("users")
                .select("onboarded, full_name, email")
                .eq("id", user.id)
                .maybeSingle()

            if (userData?.onboarded) {
                router.replace("/dashboard")
                return
            }
            setData((prev) => ({
                ...prev,
                name: userData?.full_name ?? "",
                email: userData?.email ?? user.email ?? "",
            }))
        }
        checkOnboarded()
    }, [router])

    const update = (field: string, value: unknown) =>
        setData((prev) => ({ ...prev, [field]: value }))

    const next = () => setStep((s) => s + 1)
    const back = () => setStep((s) => s - 1)

    const finish = async () => {
        setSaving(true)
        setSavingMsg("Creating your wallets on ETH, BSC & Arbitrum...")
        try {
            const { data: { user }, error: authErr } = await supabase.auth.getUser()
            if (authErr || !user) {
                console.error("[onboarding] No session:", authErr)
                window.location.href = "/auth"
                return
            }

            const res = await fetch("/api/wallets/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: data.name,
                    email: data.email || user.email,
                }),
            })

            const json = await res.json().catch(() => ({}))
            console.log("[onboarding] wallets/create →", res.status, json)

            if (!res.ok) {
                console.error("[onboarding] Wallet creation failed — proceeding anyway:", json)
            }

            setSavingMsg("All done! Redirecting...")
            window.location.href = "/dashboard"
        } catch (err) {
            console.error("[onboarding] finish error:", err)
            window.location.href = "/dashboard"
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg">

                <div className="flex items-center justify-between mb-6">
                    <div onClick={() => router.push("/")} className="font-mono text-[18px] font-bold text-white cursor-pointer">
                        Trade<span className="text-[#FF5733]">sk</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#4a3a2a] uppercase tracking-widest">
                        Step {step} / {STEPS.length}
                    </span>
                </div>

                <div className="bg-[#1a1410] border border-[#2e2520] rounded-2xl p-6 sm:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#2e2520]">
                        <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                        <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
                        <div className="w-2 h-2 rounded-full bg-[#28c840]" />
                        <span className="font-mono text-[10px] text-[#4a3a2a] ml-2 tracking-wider">tradesk://onboarding</span>
                    </div>

                    <ProgressBar step={step} />
                    {step === 1 && <StepIdentity data={data} onChange={update} onNext={next} />}
                    {step === 2 && <StepChains selected={data.chains} onChange={(chains) => update("chains", chains)} onNext={next} onBack={back} />}
                    {step === 3 && <StepStyle selected={data.tradingStyle} onChange={(style) => update("tradingStyle", style)} onNext={next} onBack={back} />}
                    {step === 4 && <StepRisk selected={data.riskLevel} onChange={(level) => update("riskLevel", level)} onNext={next} onBack={back} />}
                    {step === 5 && <StepDeposit data={data} onChange={update} onNext={next} onBack={back} />}
                    {step === 6 && <StepDone data={data} onFinish={finish} />}
                </div>
            </div>

            {saving && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1a1410] border border-[#2e2520] rounded-2xl px-8 py-6 flex flex-col items-center gap-4">
                        <div className="flex gap-1.5">
                            {[0, 1, 2].map((i) => (
                                <span key={i} className="w-2 h-2 rounded-full bg-[#FF5733] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                        <span className="font-mono text-[13px] text-[#c8b8a8]">{savingMsg}</span>
                    </div>
                </div>
            )}
        </div>
    )
}