import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const { id } = await params
    const body   = await req.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' && body.reason.trim()
        ? body.reason.trim()
        : 'Rejected by admin'

    const db = createSupabaseAdminClient() as any

    const { data: sub, error: fetchErr } = await db
        .from('kyc_submissions')
        .select('id, status, user_id')
        .eq('id', id)
        .single()

    if (fetchErr || !sub)
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

    if (sub.status !== 'pending')
        return NextResponse.json(
            { error: `Cannot reject a submission with status '${sub.status}'` },
            { status: 400 },
        )

    const now = new Date().toISOString()

    await db
        .from('kyc_submissions')
        .update({
            status:           'rejected',
            rejection_reason: reason,
            reviewed_at:      now,
            reviewed_by:      auth.adminId,
        })
        .eq('id', id)

    await db
        .from('users')
        .update({ kyc_status: 'rejected', updated_at: now })
        .eq('id', sub.user_id)

    console.info(`[admin/kyc/reject] submission ${id} rejected by ${auth.adminId} — reason: ${reason}`)

    return NextResponse.json({ success: true, submissionId: id, reason })
}
