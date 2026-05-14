"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"

const NAV = [
    { label: "Overview", path: "/admin" },
    { label: "KYC Review", path: "/admin/kyc" },
    { label: "Withdrawals", path: "/admin/withdrawals" },
    { label: "Treasury", path: "/admin/treasury" },
    { label: "Hot Wallet", path: "/admin/hot-wallet" },
]


function HamburgerIcon({ open }: { open: boolean }) {
    return (
        <div className="w-5 h-3.5 flex flex-col justify-between">
            <span className={`block h-0.5 w-full bg-white rounded-full transition-all duration-300 origin-left ${open ? "rotate-45 translate-x-px" : ""}`} />
            <span className={`block h-0.5 w-full bg-white rounded-full transition-all duration-300 ${open ? "opacity-0 scale-x-0" : ""}`} />
            <span className={`block h-0.5 w-full bg-white rounded-full transition-all duration-300 origin-left ${open ? "-rotate-45 translate-x-px" : ""}`} />
        </div>
    )
}


function NavContent({ onNavigate }: { onNavigate?: () => void }) {
    const router = useRouter()
    const pathname = usePathname()

    return (
        <div className="flex flex-col h-full">
            <div
                onClick={() => { router.push("/admin"); onNavigate?.() }}
                className="flex items-center gap-2 mb-8 cursor-pointer"
            >
                <Image src="/logo.png" alt="Tradesk" width={26} height={26} />
                <div>
                    <div className="font-display text-[14px] font-bold text-white leading-none">
                        Trade<span className="text-[#FF5733]">sk</span>
                    </div>
                    <div className="font-mono text-[9px] text-[#FF5733] tracking-widest uppercase">Admin</div>
                </div>
            </div>

            <div className="flex flex-col gap-0.5 flex-1">
                {NAV.map((item) => {
                    const active = item.path === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.path)
                    return (
                        <div
                            key={item.path}
                            onClick={() => { router.push(item.path); onNavigate?.() }}
                            className={`px-3 py-2 rounded-md text-sm font-mono cursor-pointer transition-colors ${active
                                ? "bg-[#2a1a14] text-[#FF5733]"
                                : "text-[#7a6a5a] hover:text-white"
                                }`}
                        >
                            {item.label}
                        </div>
                    )
                })}
            </div>

            <div
                onClick={() => { router.push("/dashboard"); onNavigate?.() }}
                className="px-3 py-2 rounded-md text-xs font-mono text-[#4a3a2a] hover:text-[#7a6a5a] cursor-pointer transition-colors"
            >
                ← App
            </div>
        </div>
    )
}


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [checking, setChecking] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)

    const close = useCallback(() => setDrawerOpen(false), [])

    useEffect(() => {
        document.body.style.overflow = drawerOpen ? "hidden" : ""
        return () => { document.body.style.overflow = "" }
    }, [drawerOpen])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [close])

    useEffect(() => {
        fetch("/api/admin/stats")
            .then((res) => {
                if (res.status === 403) router.replace("/dashboard")
                else setChecking(false)
            })
            .catch(() => router.replace("/dashboard"))
    }, [router])

    if (checking) {
        return (
            <div className="min-h-screen bg-[#0d0a07] flex items-center justify-center">
                <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <span key={i} className="w-2 h-2 rounded-full bg-[#FF5733] animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0d0a07] flex flex-col md:flex-row">
            <div className="hidden md:flex w-48 border-r border-[#2e2520] p-4 flex-col min-h-screen shrink-0">
                <NavContent />
            </div>
            <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#2e2520] shrink-0">
                <div className="flex items-center gap-2">
                    <Image src="/logo.png" alt="Tradesk" width={24} height={24} />
                    <div className="font-display text-[14px] font-bold text-white">
                        Trade<span className="text-[#FF5733]">sk</span>
                        <span className="font-mono text-[9px] text-[#FF5733] ml-1.5 tracking-widest uppercase align-middle">Admin</span>
                    </div>
                </div>
                <button
                    onClick={() => setDrawerOpen((v) => !v)}
                    aria-label={drawerOpen ? "Close menu" : "Open menu"}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-white hover:bg-[#2a1a14] transition-colors"
                >
                    <HamburgerIcon open={drawerOpen} />
                </button>
            </div>

            <div
                aria-hidden="true"
                onClick={close}
                className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300
                    ${drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
            />

            <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0d0a07] border-r border-[#2e2520]
                p-4 flex flex-col md:hidden
                transform transition-transform duration-300 ease-in-out
                ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2e2520]">
                    <span className="font-mono text-sm font-bold text-white">
                        Trade<span className="text-[#FF5733]">sk</span>
                        <span className="font-mono text-[9px] text-[#FF5733] ml-1.5 tracking-widest uppercase align-middle">Admin</span>
                    </span>
                    <button
                        onClick={close}
                        aria-label="Close menu"
                        className="w-7 h-7 flex items-center justify-center rounded-md text-[#7a6a5a] hover:text-white hover:bg-[#2a1a14] transition-colors text-lg leading-none cursor-pointer"
                    >
                        ×
                    </button>
                </div>
                <NavContent onNavigate={close} />
            </div>

            <div className="flex-1 overflow-auto min-w-0">
                {children}
            </div>
        </div>
    )
}
