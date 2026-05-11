import { NavProvider } from "../components/nav-context"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <NavProvider>{children}</NavProvider>
}
