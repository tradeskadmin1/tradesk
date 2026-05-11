import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function requireAdmin(req: Request): Promise<
    | { ok: true; adminId: string }
    | { ok: false; response: Response }
> {
    const adminSecret = process.env.ADMIN_SECRET

    const headerSecret = req.headers.get('x-admin-secret')
    if (adminSecret && headerSecret === adminSecret) {
        return { ok: true, adminId: 'admin' }
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

    const { NextResponse } = await import('next/server')
    return {
        ok: false,
        response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
    }
}
