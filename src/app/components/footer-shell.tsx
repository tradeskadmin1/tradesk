"use client"

import { usePathname } from "next/navigation"
import Footer from "./footer"

const HIDE_ON = ["/dashboard", "/auth", "/onboarding", "/kyc", "/admin"]

export default function FooterShell() {
    const pathname = usePathname()
    const hide = HIDE_ON.some((r) => pathname === r || pathname.startsWith(r + "/"))
    if (hide) return null
    return <Footer />
}
