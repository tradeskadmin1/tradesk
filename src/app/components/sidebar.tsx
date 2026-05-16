"use client"

import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useNav } from "./nav-context"

const mainNav = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Deposit",   path: "/dashboard/deposit" },
    { label: "Withdraw",  path: "/dashboard/withdraw" },
    { label: "Scanner",   path: "/dashboard/scanner" },
    { label: "Portfolio", path: "/dashboard/portfolio" },
    { label: "Alerts",    path: "/dashboard/alerts" },
]

const tradeNav = [
    { label: "Spot",    path: "/dashboard/spot" },
    { label: "Futures", path: "/dashboard/futures" },
    { label: "History", path: "/dashboard/futures/history" },
]

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
    const router   = useRouter()
    const pathname = usePathname()
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        fetch("/api/admin/check")
            .then((r) => r.ok && setIsAdmin(true))
            .catch(() => {})
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/auth")
    }

    const NavItem = ({ path, label }: { path: string; label: string }) => {
        const isActive = pathname === path
        return (
            <div
                onClick={() => { router.push(path); onNavigate?.() }}
                className={`px-4 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                    isActive ? "text-[#FF5733] bg-[#2a1a14]" : "text-[#7a6a5a] hover:text-white"
                }`}
            >
                {label}
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col gap-1 pt-2">
                {mainNav.map((item) => (
                    <NavItem key={item.path} {...item} />
                ))}
                <div className="mt-4 mb-1 px-4 text-[10px] uppercase tracking-widest text-[#4a3a2a] font-semibold">
                    Trade
                </div>
                {tradeNav.map((item) => (
                    <NavItem key={item.path} {...item} />
                ))}

                {/* Admin link — only rendered when session is an admin */}
                {isAdmin && (
                    <>
                        <div className="mt-4 mb-1 px-4 text-[10px] uppercase tracking-widest text-[#4a3a2a] font-semibold">
                            Admin
                        </div>
                        <NavItem path="/admin" label="Admin Panel" />
                    </>
                )}
            </div>

            <div
                onClick={handleLogout}
                className="px-4 py-2 rounded-md text-sm cursor-pointer text-[#7a6a5a] hover:text-[#FF5733] transition-colors"
            >
                Logout
            </div>
        </div>
    )
}

export default function Sidebar() {
    const { isOpen, close } = useNav()

    return (
        <>
            {/* ── Desktop rail (unchanged) ──────────────────────────────── */}
            <div className="w-45 border-r border-[#2e2520] p-4 hidden md:flex md:flex-col min-h-screen">
                <NavContent />
            </div>

            {/* ── Mobile backdrop ───────────────────────────────────────── */}
            <div
                aria-hidden="true"
                onClick={close}
                className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden
                    transition-opacity duration-300
                    ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
            />

            {/* ── Mobile drawer ─────────────────────────────────────────── */}
            <div
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0d0a07] border-r border-[#2e2520]
                    p-4 flex flex-col md:hidden
                    transform transition-transform duration-300 ease-in-out
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2e2520]">
                    <span className="font-mono text-sm font-bold text-white">
                        Trade<span className="text-[#FF5733]">sk</span>
                    </span>
                    <button
                        onClick={close}
                        aria-label="Close menu"
                        className="w-7 h-7 flex items-center justify-center rounded-md text-[#7a6a5a] hover:text-white hover:bg-[#2a1a14] transition-colors text-lg leading-none"
                    >
                        ×
                    </button>
                </div>

                <NavContent onNavigate={close} />
            </div>
        </>
    )
}
