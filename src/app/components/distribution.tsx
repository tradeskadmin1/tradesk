"use client"

const spreads = [30, 60, 45, 80, 55]

export default function SpreadDistribution() {
    return (
        <div className="bg-[#201710] border border-[#2e2520] p-4 rounded-lg">
            <h3 className="text-sm text-[#c8b8a8] mb-3">
                Exchange Spread Distribution
            </h3>
            <div className="flex items-end gap-2 h-24">
                {spreads.map((h, i) => (
                    <div
                        key={i}
                        className="flex-1 bg-[#FF5733]/70 rounded-t"
                        style={{ height: `${h}%` }}
                    />
                ))}
            </div>
        </div>
    )
}