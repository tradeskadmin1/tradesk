"use client"

import { useEffect } from "react"

export default function CrispChat() {
    useEffect(() => {
        const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID
        if (!websiteId) return

        // Dynamically import to avoid SSR issues
        import("crisp-sdk-web").then(({ Crisp }) => {
            Crisp.configure(websiteId, {
                autoload: true,
            })
        })
    }, [])

    return null
}
