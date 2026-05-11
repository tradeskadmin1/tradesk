import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()


export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rl = checkRateLimit(`kyc:status:${user.id}`, LIMITS.MODERATE)
        if (!rl.success) return rlResponse(rl.resetAt)

        const adminClient = createSupabaseAdminClient()

        const { data: userData } = await adminClient
            .from('users')
            .select('kyc_status, kyc_submitted_at')
            .eq('id', user.id)
            .single()

        const { data: submission } = await adminClient
            .from('kyc_submissions')
            .select('id, status, full_name, nationality, id_type, submitted_at, reviewed_at')
            .eq('user_id', user.id)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .single()

        return NextResponse.json({
            kycStatus: userData?.kyc_status ?? 'none',
            kycSubmittedAt: userData?.kyc_submitted_at ?? null,
            submission: submission ?? null,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch KYC status'
        console.error('[GET /api/kyc/status]', err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
