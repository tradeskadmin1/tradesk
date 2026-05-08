"use client"

import { usePathname } from "next/navigation"
import Nav from "./nav"

// Routes where the top navbar should be hidden
const APP_ROUTES = ["/dashboard", "/auth", "/onboarding", "/kyc"]

export default function PublicNav() {
  const pathname = usePathname()
  const isAppRoute = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))

  if (isAppRoute) return null

  return <Nav />
}
