import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { creditBalance } from '@/lib/ledger'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' && body.reason.trim()
        ? body.reason.trim()
        : 'Rejected by admin'

    const db = createSupabaseAdminClient() as any

    const { data: withdrawal, error: fetchErr } = await db
        .from('withdrawals')
        .select('id, status, user_id, chain_id, token_symbol, token_address, amount')
        .eq('id', id)
        .single()

    if (fetchErr || !withdrawal)
        return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })

    if (withdrawal.status !== 'pending')
        return NextResponse.json(
            { error: `Cannot reject a withdrawal with status '${withdrawal.status}'` },
            { status: 400 },
        )

    await creditBalance({
        userId: withdrawal.user_id,
        chainId: withdrawal.chain_id,
        tokenSymbol: withdrawal.token_symbol,
        tokenAddress: withdrawal.token_address,
        amount: String(withdrawal.amount),
        type: 'adjustment',
        refId: id,
        note: `Withdrawal rejected — ${reason}`,
    })

    await db.from('withdrawals').update({
        status: 'rejected',
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
    }).eq('id', id)

    console.info(`[admin/reject] withdrawal ${id} rejected — reason: ${reason}`)

    return NextResponse.json({
        success: true,
        withdrawalId: id,
        reason,
    })
}
