"use client"

const data = [
    { pair: "BTC/USDT", spread: "2.84%", profit: "+$120" },
    { pair: "ETH/USDC", spread: "1.92%", profit: "+$84" },
    { pair: "SOL/USDT", spread: "1.40%", profit: "+$52" },
]

export default function TopOpportunities() {
    return (
        <div className="bg-[#201710] border border-[#2e2520] p-4 rounded-lg">
            <h3 className="text-sm text-[#c8b8a8] mb-3">Top Opportunities</h3>
            <div className="space-y-3">
                {data.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                        <span className="text-white">{item.pair}</span>
                        <span className="text-[#FF5733]">{item.spread}</span>
                        <span className="text-emerald-400">{item.profit}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}