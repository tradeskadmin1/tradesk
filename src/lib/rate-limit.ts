import { NextResponse } from 'next/server'

type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()
let lastSweep = 0

function sweep() {
    const now = Date.now()
    if (now - lastSweep < 60_000) return
    lastSweep = now
    for (const [k, v] of store) if (v.resetAt < now) store.delete(k)
}

export const LIMITS = {
    STRICT: { limit: 10, windowMs: 60_000 },
    MODERATE: { limit: 30, windowMs: 60_000 },
    RELAXED: { limit: 120, windowMs: 60_000 },
} as const

type Config = { limit: number; windowMs: number }

export function checkRateLimit(
    key: string,
    cfg: Config,
): { success: boolean; remaining: number; resetAt: number; limit: number } {
    sweep()
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || entry.resetAt <= now) {
        const resetAt = now + cfg.windowMs
        store.set(key, { count: 1, resetAt })
        return { success: true, remaining: cfg.limit - 1, resetAt, limit: cfg.limit }
    }

    entry.count++
    const remaining = Math.max(0, cfg.limit - entry.count)
    return { success: entry.count <= cfg.limit, remaining, resetAt: entry.resetAt, limit: cfg.limit }
}

export function rlResponse(resetAt: number): NextResponse {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
    return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        {
            status: 429,
            headers: {
                'Retry-After': String(retryAfter),
                'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
            },
        },
    )
}


export function clientIp(req: Request): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-real-ip') ??
        'unknown'
    )
}
