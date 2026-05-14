"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

export default function Navbar() {
    const router = useRouter()
    const pathname = usePathname()

    const isDash = pathname === "/dashboard"
    const isOnboarding = pathname === "/onboarding"
    const isAuth = pathname === "/auth"

    if (isDash || isOnboarding) return null

    return (
        <nav className="flex w-full mt-7 max-w-6xl mx-auto font-mono bg-[linear-gradient(to_bottom_right,#2A2520,#3a2f2a,#c94a2a,#FF5733)] rounded-[20px] items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 cursor-pointer">
                <Image src="/logo.png" alt="logo" width={40} height={40} />
                <span className="text-white text-[20px] sm:text-[24px] font-bold">
                    Trade<span className="text-[#FF5733]">sk</span>
                </span>
            </Link>

            <div className="hidden md:flex items-center flex-1 gap-6 justify-center">
                <Link
                    href="/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[16px] text-white hover:text-[#FF5733] transition-colors"
                >
                    Docs
                </Link>
            </div>

            {!isAuth && (
                <button
                    onClick={() => router.push("/auth")}
                    className="flex items-center justify-center gap-2 w-40 sm:w-48 text-[14px] sm:text-[16px] rounded-[14px] px-4 py-3 text-white text-center transition-colors cursor-pointer bg-black hover:bg-[#2A2520]"
                >
                    Launch App
                </button>
            )}
        </nav>
    )
}