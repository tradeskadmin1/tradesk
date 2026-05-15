"use client"

import { useEffect } from "react"

export default function TawkChat() {
    useEffect(() => {
        const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID
        const widgetId   = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID

        if (!propertyId || !widgetId) return

        const s1 = document.createElement("script")
        s1.async = true
        s1.src   = `https://embed.tawk.to/${propertyId}/${widgetId}`
        s1.charset = "UTF-8"
        s1.setAttribute("crossorigin", "*")
        document.head.appendChild(s1)

        return () => {
            document.head.removeChild(s1)
        }
    }, [])

    return null
}
