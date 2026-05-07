"use client"

import { Line } from "react-chartjs-2"
import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
} from "chart.js"

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement)

export default function Chart() {
    return (
        <div className="h-32">
            <Line
                data={{
                    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                    datasets: [
                        {
                            data: [26480, 26900, 27200, 27050, 27800, 28300, 28940],
                            borderColor: "#FF5733",
                            backgroundColor: "rgba(255,87,51,0.1)",
                            fill: true,
                            tension: 0.4,
                        },
                    ],
                }}
                options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { x: { display: false }, y: { display: false } },
                }}
            />
        </div>
    )
}