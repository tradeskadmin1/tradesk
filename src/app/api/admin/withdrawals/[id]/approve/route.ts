
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { executeWithdrawal } from '@/lib/transfer'
import { creditBalance } from '@/lib/ledger'
import { requireAdmin } from '@/lib/admin-auth'
import { isSupportedChain, type SupportedChainId } from '@/config/chains'

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const { id } = await params
    const db = createSupabaseAdminClient() as any

    const { data: withdrawal, error: fetchErr } = await db
        .from('withdrawals')
        .select('*')
        .eq('id', id)
        .single()

    if (fetchErr || !withdrawal)
        return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })

    if (withdrawal.status !== 'pending')
        return NextResponse.json(
            { error: `Cannot approve a withdrawal with status '${withdrawal.status}'` },
            { status: 400 },
        )

    if (!isSupportedChain(withdrawal.chain_id as SupportedChainId))
        return NextResponse.json({ error: 'Unsupported chain on this withdrawal' }, { status: 400 })

    const { data: wallet } = await db
        .from('custodial_wallets')
        .select('id')
        .eq('user_id', withdrawal.user_id)
        .eq('chain_id', withdrawal.chain_id)
        .single()

    if (!wallet)
        return NextResponse.json({ error: 'Custodial wallet not found' }, { status: 404 })

    await db.from('withdrawals').update({
        status: 'approved',
        approved_by: auth.adminId === 'admin' ? null : auth.adminId,
        approved_at: new Date().toISOString(),
    }).eq('id', id)

    try {
        const result = await executeWithdrawal({
            userId: withdrawal.user_id,
            walletId: wallet.id,
            withdrawalId: id,
            chainId: withdrawal.chain_id as SupportedChainId,
            tokenSymbol: withdrawal.token_symbol,
            amount: String(withdrawal.amount),
            toAddress: withdrawal.to_address as `0x${string}`,
            skipLedgerDebit: true,
        })

        console.info(`[admin/approve] withdrawal ${id} executed — txHash: ${result.txHash}`)

        return NextResponse.json({
            success: true,
            withdrawalId: id,
            txHash: result.txHash,
            fee: result.fee,
        })
    } catch (execErr: any) {
        await creditBalance({
            userId: withdrawal.user_id,
            chainId: withdrawal.chain_id,
            tokenSymbol: withdrawal.token_symbol,
            tokenAddress: withdrawal.token_address,
            amount: String(withdrawal.amount),
            type: 'adjustment',
            note: `Approved withdrawal execution failed — reversal (id: ${id})`,
        }).catch(() => { })

        await db.from('withdrawals').update({ status: 'failed' }).eq('id', id)

        console.error(`[admin/approve] withdrawal ${id} execution failed:`, execErr)
        return NextResponse.json(
            { error: execErr.message ?? 'Execution failed. Funds have been returned to user.' },
            { status: 500 },
        )
    }
}
