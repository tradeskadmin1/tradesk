import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = await checkRateLimit(`kyc:sumsub:${user.id}`, LIMITS.STRICT)
        if (!rl.success) return rlResponse(rl.resetAt)

        const body = await req.json()
        const { applicantId } = body as { applicantId: string }

        if (!applicantId || typeof applicantId !== 'string') {
            return NextResponse.json({ error: 'applicantId is required' }, { status: 400 })
        }

        const db = createSupabaseAdminClient()

        const { data: existing } = await db
            .from('kyc_submissions')
            .select('id, status')
            .eq('user_id', user.id)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (existing?.status === 'approved') {
            return NextResponse.json({ error: 'KYC already approved' }, { status: 409 })
        }

        const now = new Date().toISOString()

        if (existing?.status === 'pending') {
            await db
                .from('kyc_submissions')
                .update({ provider: 'sumsub', provider_inquiry_id: applicantId })
                .eq('id', existing.id)

            return NextResponse.json({ success: true, submissionId: existing.id })
        }

        const { data: submission, error: insertErr } = await db
            .from('kyc_submissions')
            .insert({
                user_id:             user.id,
                provider:            'sumsub',
                provider_inquiry_id: applicantId,
                full_name:           'Pending verification',
                status:              'pending',
                submitted_at:        now,
            })
            .select('id')
            .single()

        if (insertErr || !submission) {
            return NextResponse.json({ error: 'Failed to record KYC submission' }, { status: 500 })
        }

        await db
            .from('users')
            .update({ kyc_status: 'pending', kyc_submitted_at: now, updated_at: now })
            .eq('id', user.id)

        return NextResponse.json({ success: true, submissionId: submission.id })
    } catch (err) {
        console.error('[POST /api/kyc/sumsub]', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
