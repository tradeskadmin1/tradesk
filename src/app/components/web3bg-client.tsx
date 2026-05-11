"use client"

import dynamic from "next/dynamic"

const Web3bg = dynamic(() => import("./3bg"), { ssr: false, loading: () => null })

export default function Web3bgClient() {
    return <Web3bg />
}
