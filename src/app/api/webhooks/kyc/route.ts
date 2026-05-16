import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendKycApprovedEmail } from '@/lib/email'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()


function verifySumsubSignature(rawBody: string, header: string | null): boolean {
    const secret = process.env.SUMSUB_WEBHOOK_SECRET
    if (!secret || !header) return false

    try {
        const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
        const received = header.toLowerCase()
        return timingSafeEqual(
            Buffer.from(received, 'hex'),
            Buffer.from(expected, 'hex'),
        )
    } catch {
        return false
    }
}


export async function POST(req: Request) {
    const rawBody = await req.text()
    const sigHeader = req.headers.get('x-payload-digest')

    if (!verifySumsubSignature(rawBody, sigHeader)) {
        console.warn('[webhooks/kyc] Invalid or missing Sumsub signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let payload: any
    try {
        payload = JSON.parse(rawBody)
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const eventType      = payload?.type as string | undefined
    const applicantId    = payload?.applicantId as string | undefined
    const externalUserId = payload?.externalUserId as string | undefined  // our user_id

    if (!applicantId) {
        return NextResponse.json({ received: true })
    }

    console.info(`[webhooks/kyc] type=${eventType} applicant=${applicantId} user=${externalUserId}`)

    const db  = createSupabaseAdminClient()
    const now = new Date().toISOString()

    // Prefer lookup by applicant ID (most reliable)
    const { data: byApplicant } = await db
        .from('kyc_submissions')
        .select('id, user_id, status, full_name, users(email)')
        .eq('provider_inquiry_id', applicantId)
        .maybeSingle()

    let sub = byApplicant

    // Fallback: look up by user_id
    if (!sub && externalUserId) {
        const { data: byUser } = await db
            .from('kyc_submissions')
            .select('id, user_id, status, full_name, users(email)')
            .eq('user_id', externalUserId)
            .eq('provider', 'sumsub')
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        sub = byUser
    }

    // Create stub if webhook fires before frontend recording
    if (!sub && externalUserId) {
        const { data: created } = await db
            .from('kyc_submissions')
            .insert({
                user_id:             externalUserId,
                provider:            'sumsub',
                provider_inquiry_id: applicantId,
                full_name:           'Pending verification',
                status:              'pending',
                submitted_at:        now,
            })
            .select('id, user_id, status, full_name, users(email)')
            .single()

        sub = created

        await db
            .from('users')
            .update({ kyc_status: 'pending', kyc_submitted_at: now, updated_at: now })
            .eq('id', externalUserId)
    }

    if (!sub) return NextResponse.json({ received: true })

    // Idempotency — skip if already resolved
    if (sub.status !== 'pending') return NextResponse.json({ received: true })

    if (eventType === 'applicantReviewed') {
        const reviewAnswer = payload?.reviewResult?.reviewAnswer as string | undefined

        if (reviewAnswer === 'GREEN') {
            await db
                .from('kyc_submissions')
                .update({ status: 'approved', reviewed_at: now })
                .eq('id', sub.id)

            await db
                .from('users')
                .update({ kyc_status: 'approved', updated_at: now })
                .eq('id', sub.user_id)

            const email = sub.users?.email
            if (email) {
                sendKycApprovedEmail(email, sub.full_name).catch((err: unknown) =>
                    console.error('[webhooks/kyc] approval email failed:', err),
                )
            }

            console.info(`[webhooks/kyc] ✓ auto-approved submission ${sub.id}`)

        } else if (reviewAnswer === 'RED') {
            const labels: string[] = payload?.reviewResult?.rejectLabels ?? []
            const declineReason = labels.join(', ') || 'Verification declined by automated checks'

            await db
                .from('kyc_submissions')
                .update({ status: 'rejected', rejection_reason: declineReason, reviewed_at: now })
                .eq('id', sub.id)

            await db
                .from('users')
                .update({ kyc_status: 'none', updated_at: now })
                .eq('id', sub.user_id)

            console.info(`[webhooks/kyc] ✗ auto-rejected submission ${sub.id}: ${declineReason}`)
        }

    } else if (eventType === 'applicantPending') {
        console.info(`[webhooks/kyc] ⏳ pending review for submission ${sub.id}`)
    }

    return NextResponse.json({ received: true })
}
