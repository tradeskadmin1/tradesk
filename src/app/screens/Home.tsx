"use client"

import { useRouter } from "next/navigation";

export default function HomeScreen() {

    const router = useRouter();

    const tickers = [
        { pair: "ETH/USDC", price: "$3,241.80", change: "+2.14%", up: true },
        { pair: "BTC/USDT", price: "$67,420.00", change: "+0.87%", up: true },
        { pair: "SOL/USDC", price: "$182.40", change: "-1.23%", up: false },
        { pair: "ARB/ETH", price: "$1.087", change: "+3.50%", up: true },
        { pair: "OP/USDC", price: "$2.34", change: "-0.44%", up: false },
        { pair: "MATIC/USDC", price: "$0.884", change: "+1.76%", up: true },
        { pair: "LINK/ETH", price: "$14.22", change: "+4.02%", up: true },
        { pair: "AAVE/USDC", price: "$96.50", change: "-2.10%", up: false },
    ];
    const tabs = ["Spot", "Perps", "Options", "Yield"];
    const markets = [
        { name: "ETH/USDC", change: "+2.1%", up: true, active: true },
        { name: "BTC/USDT", change: "+0.9%", up: true, active: false },
        { name: "SOL/USDC", change: "−1.2%", up: false, active: false },
        { name: "ARB/ETH", change: "+3.5%", up: true, active: false },
        { name: "OP/USDC", change: "−0.4%", up: false, active: false },
        { name: "LINK/ETH", change: "+4.0%", up: true, active: false },
        { name: "AAVE/USDC", change: "−2.1%", up: false, active: false },
    ];
    const chartBars = [
        180, 210, 190, 240, 225, 260, 245, 280, 270, 300,
        285, 320, 305, 290, 315, 310, 325, 305, 340, 330,
        355, 345, 360, 330, 350, 368, 355, 380, 365, 390,
        370, 395, 380, 360, 385, 400, 385, 410, 395, 415,
    ];
    const chartMax = Math.max(...chartBars);
    const asks = [
        { price: "3,246.20", size: "4.82", width: "80%" },
        { price: "3,245.50", size: "2.10", width: "55%" },
        { price: "3,244.80", size: "8.40", width: "90%" },
        { price: "3,243.10", size: "1.35", width: "30%" },
        { price: "3,242.00", size: "6.67", width: "70%" },
    ];
    const bids = [
        { price: "3,241.40", size: "3.20", width: "45%" },
        { price: "3,240.90", size: "7.85", width: "85%" },
        { price: "3,240.00", size: "2.50", width: "40%" },
        { price: "3,238.50", size: "11.20", width: "100%" },
        { price: "3,237.20", size: "4.60", width: "60%" },
    ];

    const features = [
        {
            icon: "⚡",
            title: "Sub-second Execution",
            desc: "Smart order routing across 40+ liquidity sources. Trades settle in under 500ms with guaranteed MEV protection via private mempools.",
        },
        {
            icon: "🔐",
            title: "Non-Custodial Always",
            desc: "Your keys, your assets. Every trade executes via audited smart contracts. Zero counterparty risk — not your keys, not Tradesk's problem.",
        },
        {
            icon: "🌉",
            title: "Cross-Chain Native",
            desc: "Trade seamlessly across Ethereum, Arbitrum, Optimism, Base, Polygon, Solana and more without manually bridging assets.",
        },
        {
            icon: "📊",
            title: "Pro-Grade Analytics",
            desc: "On-chain analytics, portfolio tracking, PnL history, and fee analytics — all pulled directly from verified blockchain data.",
        },
        {
            icon: "🏛",
            title: "DAO Governance",
            desc: "TRSK token holders vote on protocol parameters, fee structures, and new chain deployments. Fully on-chain governance via Tally.",
        },
        {
            icon: "🤖",
            title: "Strategy Automation",
            desc: "Set limit orders, DCA strategies, stop-losses and take-profits that execute trustlessly via Chainlink Automation — no bots required.",
        },
    ];

    const chains = [
        { name: "Ethereum", color: "#627eea" },
        { name: "Arbitrum", color: "#28a0f0" },
        { name: "Optimism", color: "#ff0420" },
        { name: "Base", color: "#0052ff" },
        { name: "Solana", color: "#9945ff" },
        { name: "Polygon", color: "#8247e5" },
        { name: "Avalanche", color: "#e84142" },
        { name: "BNB Chain", color: "#f0b90b" },
    ];


    return (
        <div className="flex flex-col gap-8 pt-5 items-center justify-center px-3 sm:px-6">
            <div className="inline-flex items-center gap-2 mt-9 bg-[#1a1208] border border-[#FF5733]/20 rounded-full px-4 py-1.5 mb-9">
                <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5733] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF5733] shadow-[0_0_8px_#FF5733]" />
                </span>
                <span className="font-mono text-[11px] tracking-widest text-[#FF5733] uppercase">
                    Decentralized Trading Infrastructure v2.4
                </span>
            </div>

            <div className="flex flex-col items-center text-center">
                <h1 className="font-mono text-[32px] sm:text-[48px] lg:text-[72px] text-white font-extrabold leading-tight">
                    Trade Any Asset
                    <br />
                    <span className="text-[#FF5733]">On-Chain</span>
                    <span className="text-[#6b7a8d]"> Instantly.</span>
                </h1>
                <p className="text-[14px] font-display sm:text-[16px] mt-7 mb-12 text-[#6b7a8d] px-4 sm:px-0">
                    Tradesk is the professional-grade decentralized exchange built for serious traders. Deep liquidity, MEV protection, and cross-chain execution — all non-custodial.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                    <button 
                    onClick={() => router.push("/auth")}
                    className="px-8 py-3.5 rounded-[10px] text-[15px] font-semibold bg-[#FF5733] hover:text-white 
                    cursor-pointer text-black transition-all duration-200 hover:bg-[#ff6a4d] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(255,87,51,0.35)]">
                        Launch App →
                    </button>
                    <a
                        href="/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-3.5 rounded-[10px] cursor-pointer text-[15px] font-semibold bg-transparent border border-white/8 text-white transition-all duration-200 hover:border-white/25 hover:bg-white/4 hover:-translate-y-0.5 inline-block"
                    >
                        View Protocol Docs
                    </a>
                </div>
            </div>

            <div className="relative w-full mt-5 mb-5 border-t border-b border-white/8 bg-[#0d1117] py-3 overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-24 bg-linear-to-r from-[#0d1117] to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-linear-to-l from-[#0d1117] to-transparent z-10 pointer-events-none" />
                <div className="flex w-max animate-ticker">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex gap-14 pr-14">
                            {tickers.map((t) => (
                                <div key={t.pair} className="flex items-center gap-2.5 font-mono text-[13px]">
                                    <span className="text-white font-bold">{t.pair}</span>
                                    <span className="text-[#6b7a8d]">{t.price}</span>
                                    <span
                                        className={`px-2 py-0.5 rounded text-[11px] ${t.up
                                            ? "bg-emerald-500/10 text-emerald-400"
                                            : "bg-rose-500/10 text-rose-400"
                                            }`}
                                    >
                                        {t.change}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full bg-[#0d1117] border-t border-b border-white/8 py-24 px-[5%]">
                <div className="text-center max-w-xl mx-auto mb-14">
                    <div className="font-mono text-[18px] tracking-[0.15em] text-[#FF5733] uppercase mb-4">
                            // Interface Preview
                    </div>
                    <h2 className="font-display text-[clamp(32px,4vw,52px)] font-bold tracking-[-1.5px] leading-[1.1] text-white mb-4">
                        A terminal built for professionals
                    </h2>
                    <p className="text-[#6b7a8d] text-[15px] leading-[1.7]">
                        Real-time orderbook, sub-second execution, and advanced charting — all inside a non-custodial wallet-native UI.
                    </p>
                </div>
                <div className="max-w-5xl mx-auto bg-[#080b10] border border-white/8 rounded-2xl overflow-hidden">
                    <div className="bg-[#0d1117] border-b border-white/8 px-5 py-3.5 flex items-center gap-3">
                        <div className="flex gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                        </div>
                        <div className="flex gap-0.5 ml-5">
                            {tabs.map((tab, i) => (
                                <div
                                    key={tab}
                                    className={`font-mono text-[12px] px-3.5 py-1.5 rounded-md cursor-pointer transition-all ${i === 0
                                        ? "bg-white/4 text-[#FF5733]"
                                        : "text-[#6b7a8d] hover:text-white"
                                        }`}
                                >
                                    {tab}
                                </div>
                            ))}
                        </div>
                        <div className="ml-auto font-mono text-[11px] text-[#6b7a8d]">
                            Block #21,847,234 · Gas: 12 gwei
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] lg:grid-cols-[200px_1fr_180px]">
                        <div className="border-r border-white/8 p-4">
                            <div className="font-mono text-[10px] tracking-[0.08em] text-[#6b7a8d] uppercase mb-2">
                                Markets
                            </div>
                            {markets.map((m) => (
                                <div
                                    key={m.name}
                                    className={`flex justify-between items-center px-2 py-2 rounded-md font-mono text-[12px] cursor-pointer transition-all 
                                        ${m.active ? "bg-[#FF5733]/7" : "hover:bg-white/4"
                                        }`}
                                >
                                    <span className="text-white font-bold">{m.name}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${m.up
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "bg-rose-500/10 text-rose-400"
                                        }`}>
                                        {m.change}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="border-r border-white/8 p-5">
                            <div className="flex items-baseline gap-3 mb-1">
                                <span className="font-display text-[28px] font-bold tracking-tight text-white">
                                    $3,241<span className="text-[#6b7a8d] text-[18px]">.80</span>
                                </span>
                                <span className="font-mono text-[12px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                                    ▲ +2.14%
                                </span>
                            </div>
                            <div className="font-mono text-[11px] text-[#6b7a8d] mb-5">
                                ETH / USDC · 24h Vol: $842M
                            </div>
                            <div className="flex items-end gap-1 h-20 sm:h-28">
                                {chartBars.map((h, i) => {
                                    const up = (chartBars[i + 1] ?? h) >= h
                                    return (
                                        <div
                                            key={i}
                                            className={`flex-1 min-w-1 rounded-t-sm transition-opacity hover:opacity-70 ${up ? "bg-[#FF5733]/80" : "bg-rose-500/50"
                                                }`}
                                            style={{ height: `${(h / chartMax) * 100}%` }}
                                        />
                                    )
                                })}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md p-2.5">
                                    <div className="font-mono text-[10px] text-[#6b7a8d] mb-1">24h High</div>
                                    <div className="font-mono text-[13px] font-bold text-emerald-400">$3,290.00</div>
                                </div>
                                <div className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded-md p-2.5">
                                    <div className="font-mono text-[10px] text-[#6b7a8d] mb-1">24h Low</div>
                                    <div className="font-mono text-[13px] font-bold text-rose-400">$3,108.20</div>
                                </div>
                                <div className="flex-1 bg-white/4 border border-white/8 rounded-md p-2.5">
                                    <div className="font-mono text-[10px] text-[#6b7a8d] mb-1">Liquidity</div>
                                    <div className="font-mono text-[13px] font-bold text-white">$1.2B</div>
                                </div>
                            </div>
                        </div>
                        <div className="p-3">
                            <div className="font-mono text-[10px] tracking-[0.08em] text-[#6b7a8d] uppercase mb-2 px-1.5">
                                Orderbook
                            </div>
                            {asks.map((row) => (
                                <div key={row.price} className="relative flex justify-between font-mono text-[11px] text-rose-400 px-1.5 py-0.75 rounded mb-px overflow-hidden">
                                    <div className="absolute top-0 right-0 bottom-0 bg-rose-500/10 rounded" style={{ width: row.width }} />
                                    <span className="relative">{row.price}</span>
                                    <span className="relative">{row.size}</span>
                                </div>
                            ))}
                            <div className="text-center font-mono text-[13px] font-bold text-[#FF5733] py-1.5 border-t border-b border-white/8 my-1">
                                3,241.80
                            </div>
                            {bids.map((row) => (
                                <div key={row.price} className="relative flex justify-between font-mono text-[11px] text-emerald-400 px-1.5 py-0.75 rounded mb-px overflow-hidden">
                                    <div className="absolute top-0 right-0 bottom-0 bg-emerald-500/10 rounded" style={{ width: row.width }} />
                                    <span className="relative">{row.price}</span>
                                    <span className="relative">{row.size}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-6xl mx-auto px-[5%] py-24">
                <div className="mb-14">
                    <div className="font-mono text-[18px] tracking-[0.15em] text-[#FF5733] uppercase mb-4">
                             // Why Tradesk
                    </div>
                    <h2 className="font-display text-[clamp(32px,4vw,52px)] font-bold tracking-[-1.5px] leading-[1.1] text-white max-w-xl mb-5">
                        Infrastructure for the next trillion in on-chain volume
                    </h2>
                    <p className="text-[#6b7a8d] text-[17px] leading-[1.7] max-w-md">
                        Built for traders who don't compromise between performance and self-custody.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 cursor-none gap-0.5 bg-white/8 border border-white/8 rounded-2xl overflow-hidden">
                    {features.map((f) => (
                        <div
                            key={f.title}
                            className="bg-[#0d1117] hover:bg-[#111820] transition-colors duration-200 p-9"
                        >
                            <div className="w-11 h-11 rounded-[10px] bg-white/4 border border-white/8 flex items-center justify-center text-xl mb-5">
                                {f.icon}
                            </div>
                            <div className="font-display text-[17px] font-semibold text-white mb-2.5">
                                {f.title}
                            </div>
                            <p className="text-[14px] text-[#6b7a8d] leading-[1.65]">
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full max-w-6xl mx-auto px-[5%] py-24">
                <div className="mb-12">
                    <div className="font-mono text-[18px] tracking-[0.15em] text-[#FF5733] uppercase mb-4">
                        // Supported Networks
                    </div>
                    <h2 className="font-display text-[clamp(32px,4vw,52px)] font-bold tracking-[-1.5px] leading-[1.1] text-white max-w-xl mb-5">
                        Trade wherever the liquidity is
                    </h2>
                    <p className="text-[#6b7a8d] text-[17px] leading-[1.7] max-w-md">
                        Deploy capital across every major EVM and non-EVM chain from a single interface. More chains every quarter.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                    {chains.map((c) => (
                        <div
                            key={c.name}
                            className="flex items-center gap-2.5 bg-white/4 border border-white/8 rounded-full px-5 py-2.5 font-mono text-[13px] text-[#6b7a8d] cursor-pointer transition-all duration-200 hover:border-[#FF5733]/30 hover:text-white hover:bg-[#FF5733]/5"
                        >
                            <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: c.color }}
                            />
                            {c.name}
                        </div>
                    ))}
                    <div className="flex items-center gap-2.5 border border-dashed border-white/8 rounded-full px-5 py-2.5 font-mono text-[13px] text-[#6b7a8d]">
                        + More coming
                    </div>
                </div>
            </div>
        </div>
    );
}