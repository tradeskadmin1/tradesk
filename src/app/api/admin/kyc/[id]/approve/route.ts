import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendKycApprovedEmail } from '@/lib/email'

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const { id } = await params
    const db = createSupabaseAdminClient() as any

    const { data: sub, error: fetchErr } = await db
        .from('kyc_submissions')
        .select('id, status, user_id, full_name, users(email)')
        .eq('id', id)
        .single()

    if (fetchErr || !sub)
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

    if (sub.status !== 'pending')
        return NextResponse.json(
            { error: `Cannot approve a submission with status '${sub.status}'` },
            { status: 400 },
        )

    const now = new Date().toISOString()

    // Update submission
    await db
        .from('kyc_submissions')
        .update({ status: 'approved', reviewed_at: now, reviewed_by: auth.adminId })
        .eq('id', id)

    // Update user kyc_status
    await db
        .from('users')
        .update({ kyc_status: 'approved', updated_at: now })
        .eq('id', sub.user_id)

    // Send approval email (non-blocking — don't fail the request if email fails)
    const email = sub.users?.email
    if (email) {
        sendKycApprovedEmail(email, sub.full_name).catch((err: unknown) =>
            console.error('[admin/kyc/approve] email failed:', err)
        )
    }

    console.info(`[admin/kyc/approve] submission ${id} approved by ${auth.adminId}`)

    return NextResponse.json({ success: true, submissionId: id })
}
