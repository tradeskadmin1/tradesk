import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'


export async function GET(req: Request) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return NextResponse.json({ isAdmin: false }, { status: 403 })
    return NextResponse.json({ isAdmin: true })
}
