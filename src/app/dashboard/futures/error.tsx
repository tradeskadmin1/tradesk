"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"

export default function FuturesError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const router = useRouter()

    useEffect(() => {
        console.error("[FuturesError]", error)
    }, [error])

    const isNetwork = error.message?.toLowerCase().includes("fetch") ||
        error.message?.toLowerCase().includes("network") ||
        error.message?.toLowerCase().includes("oracle")
    const isAuth = error.message?.toLowerCase().includes("unauthorized") ||
        error.message?.toLowerCase().includes("auth")

    const hint = isAuth
        ? "Your session may have expired. Please sign in again."
        : isNetwork
            ? "Unable to reach the price oracle. Check your connection and try again."
            : "The trading interface encountered an unexpected error."

    return (
        <div className="min-h-screen bg-[#0d0a07]">
            <Topbar />
            <div className="flex">
                <Sidebar />
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="max-w-sm w-full bg-[#201710] border border-[#2e2520] rounded-2xl p-8 text-center space-y-5">
                        <div className="w-12 h-12 rounded-full bg-[#3a1a10] border border-[#FF5733]/30 flex items-center justify-center mx-auto">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF5733" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                            </svg>
                        </div>

                        <div>
                            <h2 className="text-white text-base font-mono font-bold mb-1">
                                Trading unavailable
                            </h2>
                            <p className="text-[#7a6a5a] text-xs font-mono leading-relaxed">
                                {hint}
                            </p>
                            {error.digest && (
                                <p className="text-[#4a3a2a] text-[10px] font-mono mt-2">
                                    ref: {error.digest}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={reset}
                                className="px-4 py-2 rounded-lg bg-[#FF5733] hover:bg-[#e04a2a] text-white text-xs font-mono font-bold transition-colors"
                            >
                                Retry
                            </button>
                            {isAuth ? (
                                <button
                                    onClick={() => router.push("/auth")}
                                    className="px-4 py-2 rounded-lg border border-[#2e2520] bg-[#2a1a14] text-[#7a6a5a] hover:text-white text-xs font-mono transition-colors"
                                >
                                    Sign in
                                </button>
                            ) : (
                                <button
                                    onClick={() => router.push("/dashboard")}
                                    className="px-4 py-2 rounded-lg border border-[#2e2520] bg-[#2a1a14] text-[#7a6a5a] hover:text-white text-xs font-mono transition-colors"
                                >
                                    Dashboard
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
