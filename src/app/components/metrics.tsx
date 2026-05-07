type Props = {
    label: string
    value: string
    change: string
    positive?: boolean
}

export default function MetricCard({ label, value, change, positive }: Props) {
    return (
        <div className="bg-[#201710] border border-[#2e2520] p-4 rounded-lg">
            <div className="text-xs text-[#7a6a5a] mb-2">{label}</div>
            <div className={`text-xl ${positive ? "text-green-400" : ""}`}>
                {value}
            </div>
            <div className="text-xs text-[#7a6a5a] mt-1">{change}</div>
        </div>
    )
}