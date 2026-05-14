import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET() {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        console.error('[cron/liquidation] CRON_SECRET env var not set — request rejected')
        return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }


    const headersList = await headers()
    const authHeader = headersList.get('authorization') ?? ''
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }


    let baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    if (!baseUrl && process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`
    }
    if (!baseUrl) {
        console.error('[cron/liquidation] No base URL available (set NEXT_PUBLIC_APP_URL)')
        return NextResponse.json({ error: 'Base URL not configured' }, { status: 500 })
    }

    try {
        const res = await fetch(`${baseUrl}/api/futures/liquidation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${cronSecret}`,
            },
        })

        const body = await res.json()

        if (!res.ok) {
            console.error('[cron/liquidation] liquidation API error:', res.status, body)
            return NextResponse.json(body, { status: res.status })
        }

        console.info('[cron/liquidation] sweep completed:', body)
        return NextResponse.json(body)
    } catch (err) {
        console.error('[cron/liquidation] fetch failed:', err)
        return NextResponse.json({ error: 'Sweep failed' }, { status: 500 })
    }
}
