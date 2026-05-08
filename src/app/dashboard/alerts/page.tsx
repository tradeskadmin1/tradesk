"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"

export default function AlertsPage() {
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.replace("/auth")
    }
    init()
  }, [router])

  return (
    <div className="min-h-screen bg-[#0d0a07]">
      <Topbar />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-5 max-w-2xl space-y-5">
          <div>
            <h1 className="text-xl font-mono text-white">Alerts</h1>
            <p className="font-mono text-[12px] text-[#7a6a5a]">Price alerts and opportunity notifications</p>
          </div>

          <div className="bg-[#1a1410] border border-[#2e2520] rounded-xl p-10 flex flex-col items-center gap-4 text-center">
            <span className="text-4xl opacity-20">🔔</span>
            <p className="font-mono text-[13px] text-white">Alerts coming soon</p>
            <p className="font-mono text-[11px] text-[#7a6a5a]">
              Price alerts, spread notifications, and custom triggers will be available in the next release.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="font-mono text-[12px] text-[#FF5733] border border-[#FF5733]/30 px-4 py-2 rounded-xl hover:bg-[#FF5733]/5 transition-all cursor-pointer"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
