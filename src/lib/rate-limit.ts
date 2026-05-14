/**
 * Rate limiter backed by Supabase (shared across all serverless instances).
 *
 * Uses the `check_rate_limit` RPC (Postgres function) which does an atomic
 * INSERT … ON CONFLICT UPDATE, ensuring correctness even under concurrent
 * requests in a serverless / edge environment.
 *
 * Falls back to a local in-process store when the DB is unreachable so that a
 * transient Supabase outage does not take the whole API down. The fallback is
 * intentionally permissive — a short outage should not lock out users.
 */

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'

// ── In-process fallback (used only when Supabase is unreachable) ─────────────
type LocalEntry = { count: number; resetAt: number }
const localStore = new Map<string, LocalEntry>()
let lastSweep = 0

function localCheck(key: string, cfg: Config): RateLimitResult {
    const now = Date.now()
    if (now - lastSweep > 60_000) {
        lastSweep = now
        for (const [k, v] of localStore) if (v.resetAt < now) localStore.delete(k)
    }
    const entry = localStore.get(key)
    if (!entry || entry.resetAt <= now) {
        const resetAt = now + cfg.windowMs
        localStore.set(key, { count: 1, resetAt })
        return { success: true, remaining: cfg.limit - 1, resetAt, limit: cfg.limit }
    }
    entry.count++
    const remaining = Math.max(0, cfg.limit - entry.count)
    return { success: entry.count <= cfg.limit, remaining, resetAt: entry.resetAt, limit: cfg.limit }
}

// ── Public types & constants ─────────────────────────────────────────────────
export const LIMITS = {
    STRICT:   { limit: 10,  windowMs: 60_000 },
    MODERATE: { limit: 30,  windowMs: 60_000 },
    RELAXED:  { limit: 120, windowMs: 60_000 },
} as const

type Config = { limit: number; windowMs: number }

export interface RateLimitResult {
    success: boolean
    remaining: number
    resetAt: number
    limit: number
}

// ── Supabase-backed check (primary path) ─────────────────────────────────────
async function dbCheck(key: string, cfg: Config): Promise<RateLimitResult> {
    const supabase: any = _createSupabaseAdminClient()
    const { data, error } = await supabase.rpc('check_rate_limit', {
        p_key:       key,
        p_limit:     cfg.limit,
        p_window_ms: cfg.windowMs,
    })

    if (error || !data?.[0]) throw new Error(error?.message ?? 'rate-limit RPC failed')

    const row = data[0]
    return {
        success:   row.allowed,
        remaining: row.remaining,
        resetAt:   new Date(row.reset_at).getTime(),
        limit:     cfg.limit,
    }
}

/**
 * Check rate limit for `key` against `cfg`.
 *
 * This is ASYNC and must be awaited. Callers that previously used the sync
 * version must be updated accordingly.
 */
export async function checkRateLimit(
    key: string,
    cfg: Config,
): Promise<RateLimitResult> {
    try {
        return await dbCheck(key, cfg)
    } catch (err) {
        // DB unavailable — fall back to local store (permissive during outages)
        console.warn('[rate-limit] Supabase unreachable, using local fallback:', err)
        return localCheck(key, cfg)
    }
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
