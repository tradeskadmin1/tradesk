"use client"

import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

const mainNav = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Deposit", path: "/dashboard/deposit" },
    { label: "Withdraw", path: "/dashboard/withdraw" },
    { label: "Scanner", path: "/dashboard/scanner" },
    { label: "Portfolio", path: "/dashboard/portfolio" },
    { label: "Alerts", path: "/dashboard/alerts" },
]

const tradeNav = [
    { label: "Futures", path: "/dashboard/futures" },
]

export default function Sidebar() {
    const router = useRouter()
    const pathname = usePathname()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/auth")
    }

    const NavItem = ({ path, label }: { path: string; label: string }) => {
        const isActive = pathname === path || pathname.startsWith(path + '/')
        return (
            <div
                onClick={() => router.push(path)}
                className={`px-4 py-2 rounded-md text-sm cursor-pointer transition-colors ${isActive
                        ? "text-[#FF5733] bg-[#2a1a14]"
                        : "text-[#7a6a5a] hover:text-white"
                    }`}
            >
                {label}
            </div>
        )
    }

    return (
        <div className="w-45 border-r border-[#2e2520] p-4 hidden md:flex md:flex-col">
            <div className="flex-1 flex flex-col gap-1">
                {mainNav.map((item) => (
                    <NavItem key={item.path} {...item} />
                ))}
                <div className="mt-4 mb-1 px-4 text-[10px] uppercase tracking-widest text-[#4a3a2a] font-semibold">
                    Trade
                </div>
                {tradeNav.map((item) => (
                    <NavItem key={item.path} {...item} />
                ))}
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