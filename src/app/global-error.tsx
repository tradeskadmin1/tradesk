"use client"



export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-[#0d0a07] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="text-[#FF5733] text-5xl font-mono font-bold">!</div>
                    <h1 className="text-white text-xl font-mono font-bold">Something went wrong</h1>
                    <p className="text-[#7a6a5a] text-sm font-mono">
                        An unexpected error occurred. Our team has been notified.
                    </p>
                    {error.digest && (
                        <p className="text-[#4a3a2a] text-xs font-mono">Error ID: {error.digest}</p>
                    )}
                    <button
                        onClick={reset}
                        className="px-5 py-2.5 rounded-lg bg-[#FF5733] hover:bg-[#e04a2a] text-white text-sm font-mono font-bold transition-colors"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
