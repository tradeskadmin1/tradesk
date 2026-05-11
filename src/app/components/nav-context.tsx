"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"

interface NavContextType {
    isOpen: boolean
    open:   () => void
    close:  () => void
    toggle: () => void
}

const NavContext = createContext<NavContextType>({
    isOpen: false,
    open:   () => {},
    close:  () => {},
    toggle: () => {},
})

export function NavProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)

    const open   = useCallback(() => setIsOpen(true),  [])
    const close  = useCallback(() => setIsOpen(false), [])
    const toggle = useCallback(() => setIsOpen((p) => !p), [])

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [close])

    // Lock body scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : ""
        return () => { document.body.style.overflow = "" }
    }, [isOpen])

    return (
        <NavContext.Provider value={{ isOpen, open, close, toggle }}>
            {children}
        </NavContext.Provider>
    )
}

export const useNav = () => useContext(NavContext)
