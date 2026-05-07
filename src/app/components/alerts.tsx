"use client"

const alerts = [
    { msg: "BTC spread above 2.5%", type: "warning" },
    { msg: "ETH liquidity spike", type: "info" },
    { msg: "SOL arbitrage detected", type: "success" },
]

export default function LiveAlerts() {
    return (
        <div className="bg-[#201710] border border-[#2e2520] p-4 rounded-lg">
            <h3 className="text-sm text-[#c8b8a8] mb-3">Live Alerts</h3>
            <div className="space-y-2">
                {alerts.map((a, i) => (
                    <div
                        key={i}
                        className="text-sm px-3 py-2 rounded bg-[#2a1a14] text-[#FF5733]"
                    >
                        {a.msg}
                    </div>
                ))}
            </div>
        </div>
    )
}