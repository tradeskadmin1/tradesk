import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'

const SUMSUB_BASE = 'https://api.sumsub.com'

function sumsubHeaders(method: string, path: string, body: string): Record<string, string> {
    const ts = Math.floor(Date.now() / 1000)
    const sig = createHmac('sha256', process.env.SUMSUB_SECRET_KEY!)
        .update(`${ts}${method}${path}${body}`)
        .digest('hex')

    return {
        'X-App-Token':      process.env.SUMSUB_APP_TOKEN!,
        'X-App-Access-Ts':  String(ts),
        'X-App-Access-Sig': sig,
        'Content-Type':     'application/json',
    }
}

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = await checkRateLimit(`kyc:sumsub:token:${user.id}`, LIMITS.STRICT)
        if (!rl.success) return rlResponse(rl.resetAt)

        const levelName = process.env.SUMSUB_LEVEL_NAME ?? 'basic-kyc-level'
        const path = `/resources/accessTokens?userId=${encodeURIComponent(user.id)}&levelName=${encodeURIComponent(levelName)}&ttlInSecs=600`

        const res = await fetch(`${SUMSUB_BASE}${path}`, {
            method:  'POST',
            headers: sumsubHeaders('POST', path, ''),
        })

        if (!res.ok) {
            const text = await res.text()
            console.error('[kyc/sumsub/token] Sumsub error:', res.status, text)
            return NextResponse.json({ error: 'Failed to create verification session' }, { status: 502 })
        }

        const data = await res.json() as { token: string }
        return NextResponse.json({ token: data.token })
    } catch (err) {
        console.error('[GET /api/kyc/sumsub/token]', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
