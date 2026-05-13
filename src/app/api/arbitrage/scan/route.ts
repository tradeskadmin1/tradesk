import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {scanAllPairs} from '@/lib/arbitrage'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'


export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rl = checkRateLimit(`arbitrage:scan:${user.id}`, LIMITS.MODERATE)
        if (!rl.success) return rlResponse(rl.resetAt)

        const result = await scanAllPairs()

        return NextResponse.json({
            success: true,
            scanned: result.scanned,
            found: result.found,
            saved: result.saved,
            opportunities: result.opportunities.map((o) => ({
                pair: o.pair,
                buyDex: o.buyDex,
                sellDex: o.sellDex,
                buyChainId: o.buyChainId,
                sellChainId: o.sellChainId,
                buyPrice: o.buyPrice,
                sellPrice: o.sellPrice,
                profitPct: parseFloat(o.profitPct.toFixed(4)),
                estimatedProfitUsd: parseFloat(o.estimatedProfitUsd.toFixed(2)),
                estimatedGasUsd: parseFloat(o.estimatedGasUsd.toFixed(2)),
                netProfitUsd: parseFloat(o.netProfitUsd.toFixed(2)),
                riskScore: o.riskScore,
            })),
            // Diagnostics: shows per-pair why pools were filtered out
            diagnostics: result.diagnostics,
            scannedAt: new Date().toISOString(),
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Scan failed'
        console.error('[POST /api/arbitrage/scan]', err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
