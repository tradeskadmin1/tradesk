"use client"

import { usePathname } from "next/navigation"
import Nav from "./nav"


const APP_ROUTES = ["/dashboard", "/auth", "/onboarding", "/kyc", "/admin"]

export default function PublicNav() {
  const pathname = usePathname()
  const isAppRoute = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))

  if (isAppRoute) return null

  return <Nav />
}
