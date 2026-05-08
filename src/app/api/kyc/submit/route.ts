import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()

const KYC_BUCKET = 'kyc-documents'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB


export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = createSupabaseAdminClient()

        // ── Check for existing pending/approved submission ──────────────────────
        const { data: existing } = await adminClient
            .from('kyc_submissions')
            .select('status')
            .eq('user_id', user.id)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .single()

        if (existing?.status === 'pending') {
            return NextResponse.json(
                { error: 'You already have a pending KYC submission' },
                { status: 409 },
            )
        }
        if (existing?.status === 'approved') {
            return NextResponse.json(
                { error: 'Your KYC has already been approved' },
                { status: 409 },
            )
        }

        // ── Parse form data ─────────────────────────────────────────────────────
        let formData: FormData
        try {
            formData = await req.formData()
        } catch {
            return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
        }

        const fullName = (formData.get('fullName') as string | null)?.trim()
        const dateOfBirth = (formData.get('dateOfBirth') as string | null)?.trim()
        const nationality = (formData.get('nationality') as string | null)?.trim()
        const idType = (formData.get('idType') as string | null)?.trim()
        const idFront = formData.get('idFront') as File | null
        const idBack = formData.get('idBack') as File | null
        const selfie = formData.get('selfie') as File | null

        // ── Validate required fields ─────────────────────────────────────────────
        if (!fullName || !dateOfBirth || !nationality || !idType || !idFront) {
            return NextResponse.json(
                { error: 'fullName, dateOfBirth, nationality, idType and idFront are required' },
                { status: 400 },
            )
        }

        if (!['passport', 'national_id', 'drivers_license'].includes(idType)) {
            return NextResponse.json({ error: 'Invalid idType' }, { status: 400 })
        }

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
            return NextResponse.json({ error: 'dateOfBirth must be YYYY-MM-DD' }, { status: 400 })
        }

        // ── Validate + upload files ──────────────────────────────────────────────
        async function uploadFile(
            file: File,
            label: string,
        ): Promise<string> {
            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                throw new Error(`${label}: unsupported file type ${file.type}`)
            }
            if (file.size > MAX_FILE_SIZE) {
                throw new Error(`${label}: file exceeds 10 MB limit`)
            }

            const ext = file.name.split('.').pop() ?? 'bin'
            const timestamp = Date.now()
            const path = `${user!.id}/${timestamp}_${label}.${ext}`

            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            const { error } = await adminClient
                .storage
                .from(KYC_BUCKET)
                .upload(path, buffer, {
                    contentType: file.type,
                    cacheControl: '3600',
                    upsert: false,
                })

            if (error) throw new Error(`Failed to upload ${label}: ${error.message}`)

            return path
        }

        let idFrontUrl: string
        let idBackUrl: string | null = null
        let selfieUrl: string | null = null

        try {
            idFrontUrl = await uploadFile(idFront, 'id_front')
            if (idBack instanceof File && idBack.size > 0) {
                idBackUrl = await uploadFile(idBack, 'id_back')
            }
            if (selfie instanceof File && selfie.size > 0) {
                selfieUrl = await uploadFile(selfie, 'selfie')
            }
        } catch (uploadErr) {
            const message = uploadErr instanceof Error ? uploadErr.message : 'Upload failed'
            return NextResponse.json({ error: message }, { status: 400 })
        }

        // ── Insert kyc_submissions row ───────────────────────────────────────────
        const { data: submission, error: insertError } = await adminClient
            .from('kyc_submissions')
            .insert({
                user_id: user.id,
                full_name: fullName,
                date_of_birth: dateOfBirth,
                nationality,
                id_type: idType,
                id_front_url: idFrontUrl,
                id_back_url: idBackUrl,
                selfie_url: selfieUrl,
                status: 'pending',
            })
            .select('id')
            .single()

        if (insertError || !submission) {
            return NextResponse.json(
                { error: 'Failed to record KYC submission' },
                { status: 500 },
            )
        }

        // ── Mark user as pending ─────────────────────────────────────────────────
        await adminClient
            .from('users')
            .update({
                kyc_status: 'pending',
                kyc_submitted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)

        return NextResponse.json({
            success: true,
            submissionId: submission.id,
            status: 'pending',
            message: 'KYC submitted successfully. Review typically takes 1–2 business days.',
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'KYC submission failed'
        console.error('[POST /api/kyc/submit]', err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
