"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RootError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const router = useRouter()

    useEffect(() => {
        console.error("[RootError]", error)
    }, [error])

    return (
        <div className="min-h-screen bg-[#0d0a07] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-[#201710] border border-[#2e2520] rounded-2xl p-8 text-center space-y-5">
                <div className="w-14 h-14 rounded-full bg-[#3a1a10] border border-[#FF5733]/30 flex items-center justify-center mx-auto">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF5733" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>

                <div>
                    <h1 className="text-white text-lg font-mono font-bold mb-1">Something went wrong</h1>
                    <p className="text-[#7a6a5a] text-xs font-mono">
                        {error.message || "An unexpected error occurred."}
                    </p>
                    {error.digest && (
                        <p className="text-[#4a3a2a] text-[10px] font-mono mt-2">ref: {error.digest}</p>
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
                        onClick={() => router.push("/")}
                        className="px-4 py-2 rounded-lg border border-[#2e2520] bg-[#2a1a14] text-[#7a6a5a] hover:text-white text-xs font-mono transition-colors"
                    >
                        Go home
                    </button>
                </div>
            </div>
        </div>
    )
}
