"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useConnect, useDisconnect, useAccount } from "wagmi"
import { supabase } from "@/lib/supabase"

function truncate(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const CONNECTOR_ICONS: Record<string, string> = {
    metaMaskSDK: "/metamask.png",
    coinbaseWalletSDK: "/coinbase.webp",
    walletConnect: "/Walletconnect.png",
    metaMask: "/metamask.png",
}

function ConnectModal({
    onClose,
    onConnected,
}: {
    onClose: () => void
    onConnected: (address: string) => void
}) {
    const overlayRef = useRef<HTMLDivElement>(null)
    const { connectors, connect, isPending, error } = useConnect()

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [onClose])

    const handleBackdrop = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose()
    }

    const handleConnect = (connector: (typeof connectors)[number]) => {
        connect(
            { connector },
            {
                onSuccess: async (data) => {
                    const address = data.accounts[0]
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                        await supabase
                            .from("users")
                            .update({ wallet_address: address })
                            .eq("id", user.id)
                    }
                    onConnected(address)
                    onClose()
                },
            }
        )
    }

    return (
        <div
            ref={overlayRef}
            onClick={handleBackdrop}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
            <div className="relative w-full max-w-sm mx-4 bg-[#1a1510] border border-[#3a2f2a] rounded-3xl p-6 shadow-2xl shadow-black/60">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-white font-mono text-[18px] font-bold">
                        Connect <span className="text-[#FF5733]">Wallet</span>
                    </h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-2xl leading-none cursor-pointer">×</button>
                </div>
                <p className="font-mono text-[12px] text-[#7a6a5a] mb-5">Choose a wallet to connect to Tradesk.</p>

                <div className="flex flex-col gap-2">
                    {connectors.filter(c => c.id !== "metaMask").map((connector) => {
                        const iconSrc = CONNECTOR_ICONS[connector.id]
                        return (
                            <button
                                key={connector.uid}
                                onClick={() => handleConnect(connector)}
                                disabled={isPending}
                                className="flex items-center gap-3 w-full bg-[#2A2520] border border-[#3a2f2a] hover:border-[#FF5733]/40 rounded-xl px-4 py-3.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {iconSrc ? (
                                    <Image
                                        src={iconSrc}
                                        alt={connector.name}
                                        width={28}
                                        height={28}
                                        className="rounded-md shrink-0"
                                    />
                                ) : (
                                    <span className="w-7 h-7 rounded-md bg-[#3a2f2a] flex items-center justify-center text-base shrink-0">🔌</span>
                                )}
                                <span className="font-mono text-[13px] text-white group-hover:text-[#FF5733] transition-colors">
                                    {connector.name}
                                </span>
                                {isPending && (
                                    <span className="ml-auto flex gap-1">
                                        {[0, 1, 2].map((i) => (
                                            <span key={i} className="w-1 h-1 rounded-full bg-[#FF5733] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                        ))}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {error && (
                    <p className="mt-4 font-mono text-[11px] text-rose-400 text-center">
                        {error.message}
                    </p>
                )}
            </div>
        </div>
    )
}

function DisconnectModal({
    address,
    onClose,
    onDisconnect,
}: {
    address: string
    onClose: () => void
    onDisconnect: () => void
}) {
    const overlayRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [onClose])

    const handleBackdrop = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose()
    }

    return (
        <div
            ref={overlayRef}
            onClick={handleBackdrop}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
            <div className="relative w-full max-w-sm mx-4 bg-[#1a1510] border border-[#3a2f2a] rounded-3xl p-6 shadow-2xl shadow-black/60">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-white font-mono text-[18px] font-bold">
                        Wallet <span className="text-[#FF5733]">Connected</span>
                    </h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-2xl leading-none cursor-pointer">×</button>
                </div>

                <div className="flex items-center gap-3 bg-[#2A2520] border border-[#3a2f2a] rounded-xl px-4 py-3 mb-5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]" />
                    <span className="font-mono text-white/80 text-[14px] flex-1 truncate">{address}</span>
                    <button
                        onClick={() => navigator.clipboard.writeText(address)}
                        className="text-white/30 hover:text-[#FF5733] transition-colors cursor-pointer"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                    </button>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[#3a2f2a] bg-[#2A2520] text-white font-mono text-[14px] hover:border-white/30 transition-colors cursor-pointer">
                        Cancel
                    </button>
                    <button onClick={onDisconnect} className="flex-1 py-3 rounded-xl bg-[#FF5733] hover:bg-[#e04a2a] text-white font-mono text-[14px] font-bold transition-colors cursor-pointer">
                        Disconnect
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function Topbar() {
    const router = useRouter()
    const [address, setAddress] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>("")
    const [showConnect, setShowConnect] = useState(false)
    const [showDisconnect, setShowDisconnect] = useState(false)
    const [loading, setLoading] = useState(true)

    const { disconnect } = useDisconnect()
    const { address: wagmiAddress } = useAccount()

    useEffect(() => {
        const loadUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setLoading(false)
                return
            }
            const { data: userData } = await supabase
                .from("users")
                .select("wallet_address, name")
                .eq("id", user.id)
                .single()

            if (userData?.wallet_address) setAddress(userData.wallet_address)
            if (userData?.name) setUserName(userData.name)
            setLoading(false)
        }
        loadUser()
    }, [])

    
    useEffect(() => {
        if (!wagmiAddress && address) {
            handleDisconnect()
        }
    }, [wagmiAddress])

    const handleDisconnect = async () => {
        disconnect()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            await supabase
                .from("users")
                .update({ wallet_address: null })
                .eq("id", user.id)
        }
        setAddress(null)
        setShowDisconnect(false)
    }

    const initials = userName
        ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : "??"

    return (
        <>
            <div className="flex justify-between items-center px-5 py-3 border-b border-[#2e2520]">
                <div onClick={() => router.push("/")} className="flex flex-col mb-4 cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Image src="/logo.png" alt="Tradesk" width={34} height={34} />
                        <span className="font-display text-[17px] font-bold text-white">
                            Trade<span className="text-[#FF5733]">sk</span>
                        </span>
                    </div>
                    <span className="text-[#7a6a5a] text-[12px] font-mono mt-1">Your desk, Your edge.</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#2a1f1a] px-3 py-1 rounded-full text-xs text-[#FF5733]">
                        <span className="w-2 h-2 bg-[#FF5733] rounded-full" />
                        14 live opps
                    </div>
                    <div className="text-xs text-[#7a6a5a]">Markets open</div>

                    {!loading && (
                        address ? (
                            <button
                                onClick={() => setShowDisconnect(true)}
                                className="flex items-center gap-2 bg-[#2a1f1a] border border-emerald-500/30 hover:border-emerald-400/60 px-3 py-1.5 rounded-full font-mono text-[12px] text-white transition-all cursor-pointer"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_2px_rgba(52,211,153,0.4)]" />
                                {truncate(address)}
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowConnect(true)}
                                    className="flex items-center gap-2 bg-[#2a1f1a] border border-[#FF5733]/30 hover:border-[#FF5733]/70 hover:bg-[#3a2010] px-3 py-1.5 rounded-full font-mono text-[12px] text-[#FF5733] transition-all cursor-pointer"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                                        <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
                                    </svg>
                                    Connect Wallet
                                </button>
                                <div className="w-8 h-8 bg-[#3a2518] rounded-full flex items-center justify-center text-[#FF5733] text-xs font-mono font-bold">
                                    {initials}
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>

            {showConnect && (
                <ConnectModal
                    onClose={() => setShowConnect(false)}
                    onConnected={(addr) => setAddress(addr)}
                />
            )}

            {showDisconnect && address && (
                <DisconnectModal
                    address={address}
                    onClose={() => setShowDisconnect(false)}
                    onDisconnect={handleDisconnect}
                />
            )}
        </>
    )
}