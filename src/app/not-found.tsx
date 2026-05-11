import Link from "next/link"

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#0d0a07] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="font-mono font-bold text-[#FF5733]">
                    <span className="text-7xl">4</span>
                    <span className="text-7xl text-[#2e2520]">0</span>
                    <span className="text-7xl">4</span>
                </div>

                <div>
                    <h1 className="text-white text-xl font-mono font-bold mb-2">Page not found</h1>
                    <p className="text-[#7a6a5a] text-sm font-mono">
                        The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    </p>
                </div>

                <div className="flex gap-3 justify-center">
                    <Link
                        href="/dashboard"
                        className="px-5 py-2.5 rounded-lg bg-[#FF5733] hover:bg-[#e04a2a] text-white text-sm font-mono font-bold transition-colors"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/"
                        className="px-5 py-2.5 rounded-lg border border-[#2e2520] bg-[#201710] text-[#7a6a5a] hover:text-white text-sm font-mono transition-colors"
                    >
                        Home
                    </Link>
                </div>
            </div>
        </div>
    )
}
