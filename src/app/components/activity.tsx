"use client"

const activity = [
    { action: "Bought BTC", time: "2m ago", status: "success" },
    { action: "Sold ETH", time: "10m ago", status: "success" },
    { action: "Order Failed", time: "15m ago", status: "error" },
]

export default function RecentActivity() {
    return (
        <div className="bg-[#201710] border border-[#2e2520] p-4 rounded-lg">
            <h3 className="text-sm text-[#c8b8a8] mb-3">Recent Activity</h3>
            <div className="space-y-2">
                {activity.map((a, i) => (
                    <div key={i} className="flex justify-between text-sm">
                        <span className="text-white">{a.action}</span>
                        <span className="text-[#7a6a5a]">{a.time}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}