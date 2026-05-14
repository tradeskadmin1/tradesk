import { timingSafeEqual } from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { checkRateLimit, clientIp, LIMITS } from '@/lib/rate-limit'


function safeCompare(a: string, b: string): boolean {
    const aBuf = Buffer.from(a)
    const bBuf = Buffer.from(b)
    const bPadded = Buffer.alloc(aBuf.length)
    bBuf.copy(bPadded)
    const equal = timingSafeEqual(aBuf, bPadded)
    return equal && a.length === b.length
}

export async function requireAdmin(req: Request): Promise<
    | { ok: true; adminId: string }
    | { ok: false; response: Response }
> {
    const { NextResponse } = await import('next/server')
    const deny = () => NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const ip = clientIp(req)
    const rl = await checkRateLimit(`admin:auth:${ip}`, { limit: 20, windowMs: 60_000 })
    if (!rl.success) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: { 'Retry-After': '60' } },
            ),
        }
    }

    const adminSecret = process.env.ADMIN_SECRET
    const headerSecret = req.headers.get('x-admin-secret') ?? ''
    if (adminSecret && safeCompare(headerSecret, adminSecret)) {
        return { ok: true, adminId: 'api-key' }
    }

    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user?.email) {
            const adminEmails = (process.env.ADMIN_EMAILS ?? '')
                .split(',')
                .map((e) => e.trim().toLowerCase())
                .filter(Boolean)

            if (adminEmails.includes(user.email.toLowerCase())) {
                return { ok: true, adminId: user.id }
            }
        }
    } catch { /* ignore session errors */ }

    return { ok: false, response: deny() }
}
