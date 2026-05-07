"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Topbar from "../components/topbar"
import Sidebar from "../components/sidebar"
import MetricCard from "../components/metrics"
import Chart from "../components/chart"
import TopOpportunities from "../components/opportunities"
import SpreadDistribution from "../components/distribution"
import RecentActivity from "../components/activity"
import LiveAlerts from "../components/alerts"

export default function Home() {
    const router = useRouter()
    const [userName, setUserName] = useState<string>("")

    useEffect(() => {
        const onboarding = localStorage.getItem("tradesk_onboarding")
        if (!onboarding) {
            router.replace("/onboarding")
        }
    }, [router])

    useEffect(() => {
        const loadUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from("users")
                .select("name")
                .eq("id", user.id)
                .single()
            if (data?.name) setUserName(data.name.split(" ")[0])
        }
        loadUser()
    }, [])

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return "Good Morning"
        if (hour < 17) return "Good Afternoon"
        if (hour < 21) return "Good Evening"
        return "Hey, Night Owl"
    }

    return (
        <div className="bg-[#1a1410] mt-8">
            <Topbar />
            <div className="flex">
                <Sidebar />
                <div className="flex-1 p-5 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h1 className="text-lg sm:text-xl text-white">
                                Dashboard
                            </h1>
                            <p className="text-xs sm:text-sm text-[#7a6a5a]">
                                {getGreeting()}{userName ? `, ${userName}` : ""}, 14 opportunities detected
                            </p>
                        </div>
                        <button className="bg-[#FF5733] text-white cursor-pointer px-3 py-2 sm:px-4 sm:py-2 rounded text-xs sm:text-sm w-full sm:w-auto">
                            + New Trade
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <MetricCard label="Today's P&L" value="+$842" change="+3.2%" positive />
                        <MetricCard label="Active Trades" value="7" change="3 pending" />
                        <MetricCard label="Best Spread" value="2.84%" change="BTC" />
                        <MetricCard label="Win Rate" value="91%" change="30 days" />
                    </div>
                    <div className="bg-[#201710] border border-[#2e2520] p-4 rounded-lg">
                        <div className="mb-3 text-sm text-[#c8b8a8]">Portfolio Value</div>
                        <Chart />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 space-y-4">
                            <TopOpportunities />
                            <SpreadDistribution />
                        </div>
                        <div className="space-y-4">
                            <RecentActivity />
                            <LiveAlerts />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}