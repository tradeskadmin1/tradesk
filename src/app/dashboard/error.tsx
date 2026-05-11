"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Topbar from "../components/topbar"
import Sidebar from "../components/sidebar"

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const router = useRouter()

    useEffect(() => {
        console.error("[DashboardError]", error)
    }, [error])

    return (
        <div className="min-h-screen bg-[#0d0a07]">
            <Topbar />
            <div className="flex">
                <Sidebar />
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="max-w-sm w-full bg-[#201710] border border-[#2e2520] rounded-2xl p-8 text-center space-y-5">
                        <div className="w-12 h-12 rounded-full bg-[#3a1a10] border border-[#FF5733]/30 flex items-center justify-center mx-auto">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF5733" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>

                        <div>
                            <h2 className="text-white text-base font-mono font-bold mb-1">
                                Something went wrong
                            </h2>
                            <p className="text-[#7a6a5a] text-xs font-mono">
                                {error.message || "Failed to load this section."}
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
                                Try again
                            </button>
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="px-4 py-2 rounded-lg border border-[#2e2520] bg-[#2a1a14] text-[#7a6a5a] hover:text-white text-xs font-mono transition-colors"
                            >
                                Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
