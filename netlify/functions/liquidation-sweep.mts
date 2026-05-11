/**
 * Netlify Scheduled Function — liquidation sweep
 * Runs every minute. Calls the Next.js API route so all rate-limit,
 * auth, and business logic stays in one place.
 *
 * Required env vars (set in Netlify UI → Site configuration → Env variables):
 *   URL          — auto-set by Netlify (your site URL)
 *   CRON_SECRET  — shared secret, must match the one in your Next.js env
 */

import type { Config } from '@netlify/functions'

export default async () => {
    const siteUrl    = process.env.URL
    const cronSecret = process.env.CRON_SECRET

    if (!siteUrl) {
        console.error('[liquidation-sweep] URL env var not set')
        return
    }

    try {
        const res = await fetch(`${siteUrl}/api/futures/liquidation`, {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
            },
        })

        const body = await res.json()

        if (!res.ok) {
            console.error('[liquidation-sweep] API error:', res.status, body)
            return
        }

        console.info('[liquidation-sweep]', body)
    } catch (err) {
        console.error('[liquidation-sweep] fetch failed:', err)
    }
}

export const config: Config = {
    schedule: '* * * * *',   // every minute
}
