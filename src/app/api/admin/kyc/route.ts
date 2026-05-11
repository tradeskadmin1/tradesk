import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'

const KYC_BUCKET = 'kyc-documents'
const SIGNED_URL_TTL = 60 * 60 // 1 hour

export async function GET(req: Request) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const db = createSupabaseAdminClient() as any
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'pending'
    const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50'), 200)
    const offset = parseInt(searchParams.get('offset') ?? '0')

    let query = db
        .from('kyc_submissions')
        .select(`
            id, full_name, date_of_birth, nationality, id_type,
            id_front_url, id_back_url, selfie_url,
            status, rejection_reason, submitted_at, reviewed_at,
            users!inner ( id, email, kyc_status )
        `)
        .order('submitted_at', { ascending: true })
        .range(offset, offset + limit - 1)

    if (status !== 'all') query = query.eq('status', status)

    const { data, error } = await query

    if (error) {
        console.error('[GET /api/admin/kyc]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows: any[] = data ?? []

    // Generate signed URLs for all document paths so the browser can display them
    const withUrls = await Promise.all(
        rows.map(async (row) => {
            const paths = [
                { key: 'id_front_url', path: row.id_front_url },
                { key: 'id_back_url',  path: row.id_back_url  },
                { key: 'selfie_url',   path: row.selfie_url   },
            ].filter((p) => !!p.path)

            const signed: Record<string, string> = {}

            await Promise.all(
                paths.map(async ({ key, path }) => {
                    const { data: urlData } = await db
                        .storage
                        .from(KYC_BUCKET)
                        .createSignedUrl(path, SIGNED_URL_TTL)
                    if (urlData?.signedUrl) signed[key] = urlData.signedUrl
                }),
            )

            return { ...row, signedUrls: signed }
        }),
    )

    return NextResponse.json(
        { submissions: withUrls, total: rows.length },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}
