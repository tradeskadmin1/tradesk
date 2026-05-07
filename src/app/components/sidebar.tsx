"use client"

import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

const navItems = [
    { label: "Dashboard", path: "/dashboard" }, 
    { label: "Deposit", path: "/dashboard/deposit" },
    { label: "Withdraw", path: "/dashboard/withdraw" },
    { label: "Scanner", path: "/dashboard/scanner" },
    { label: "Portfolio", path: "/dashboard/portfolio" },
    { label: "Alerts", path: "/dashboard/alerts" },
]

export default function Sidebar() {
    const router = useRouter()
    const pathname = usePathname()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/auth")
    }

    return (
        <div className="w-45 border-r border-[#2e2520] p-4 hidden md:flex md:flex-col">
            <div className="flex-1 flex flex-col gap-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.path
                    return (
                        <div
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            className={`px-4 py-2 rounded-md text-sm cursor-pointer transition-colors ${isActive
                                    ? "text-[#FF5733] bg-[#2a1a14]"
                                    : "text-[#7a6a5a] hover:text-white"
                                }`}
                        >
                            {item.label}
                        </div>
                    )
                })}
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