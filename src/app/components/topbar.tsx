"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useNav } from "./nav-context"

function HamburgerIcon({ open }: { open: boolean }) {
    return (
        <div className="w-5 h-[14px] flex flex-col justify-between">
            <span className={`block h-0.5 w-full bg-white rounded-full transition-all duration-300 origin-left
                ${open ? "rotate-45 translate-x-px" : ""}`}
            />
            <span className={`block h-0.5 w-full bg-white rounded-full transition-all duration-300
                ${open ? "opacity-0 scale-x-0" : ""}`}
            />
            <span className={`block h-0.5 w-full bg-white rounded-full transition-all duration-300 origin-left
                ${open ? "-rotate-45 translate-x-px" : ""}`}
            />
        </div>
    )
}

const POLL_INTERVAL = 60_000 // refresh live opps count every 60 s

export default function Topbar() {
    const router  = useRouter()
    const { isOpen, toggle } = useNav()
    const [userName,  setUserName]  = useState<string>("")
    const [loading,   setLoading]   = useState(true)
    const [liveOpps,  setLiveOpps]  = useState<number | null>(null)

    // ── User profile ──────────────────────────────────────────────────────
    useEffect(() => {
        void (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }

            const { data: userData } = await supabase
                .from("users")
                .select("full_name")
                .eq("id", user.id)
                .single()

            if (userData?.full_name) setUserName(userData.full_name)
            setLoading(false)
        })()
    }, [])

    // ── Live opps count ───────────────────────────────────────────────────
    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch("/api/arbitrage/count")
                if (!res.ok) return
                const data = await res.json()
                setLiveOpps(data.count ?? 0)
            } catch { /* fail silently — keep last value */ }
        }

        fetchCount()
        const timer = setInterval(fetchCount, POLL_INTERVAL)
        return () => clearInterval(timer)
    }, [])

    const initials = userName
        ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : "??"

    return (
        <div className="flex justify-between items-center px-5 py-3 border-b border-[#2e2520]">
            {/* Left — logo + hamburger on mobile */}
            <div className="flex items-center gap-3">
                {/* Hamburger — mobile only */}
                <button
                    onClick={toggle}
                    aria-label={isOpen ? "Close menu" : "Open menu"}
                    className="md:hidden flex items-center justify-center w-8 h-8 text-white rounded-md hover:bg-[#2a1a14] transition-colors"
                >
                    <HamburgerIcon open={isOpen} />
                </button>

                <div onClick={() => router.push("/")} className="flex flex-col cursor-pointer">
                    <div className="flex items-center gap-2">
                        <Image src="/logo.png" alt="Tradesk" width={34} height={34} />
                        <span className="font-display text-[17px] font-bold text-white">
                            Trade<span className="text-[#FF5733]">sk</span>
                        </span>
                    </div>
                    <span className="text-[#7a6a5a] text-[12px] font-mono mt-0.5 hidden sm:block">
                        Your desk, Your edge.
                    </span>
                </div>
            </div>

            {/* Right — status pills + avatar */}
            <div className="flex items-center gap-3">
                {liveOpps !== null && (
                    <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs transition-colors
                        ${liveOpps > 0
                            ? "bg-[#2a1f1a] text-[#FF5733]"
                            : "bg-[#1a1510] text-[#4a3a2a]"}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${liveOpps > 0 ? "bg-[#FF5733] animate-pulse" : "bg-[#4a3a2a]"}`} />
                        {liveOpps} live {liveOpps === 1 ? "opp" : "opps"}
                    </div>
                )}
                <div className="hidden sm:block text-xs text-[#7a6a5a]">Markets open</div>

                {!loading && (
                    <div className="w-8 h-8 bg-[#3a2518] rounded-full flex items-center justify-center text-[#FF5733] text-xs font-mono font-bold">
                        {initials}
                    </div>
                )}
            </div>
        </div>
    )
}
