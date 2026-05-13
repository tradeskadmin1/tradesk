import { NextResponse } from 'next/server'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'

const db = (): any => _createSupabaseAdminClient()
const TREASURY_ID = process.env.PLATFORM_TREASURY_USER_ID!

const CHAIN_NAMES: Record<number, string> = { 1: 'Ethereum', 56: 'BSC', 42161: 'Arbitrum' }

export async function POST(req: Request) {
    if (!await isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const { chainId, tokenSymbol, tokenAddress, amount, destinationAddress, note } = body

    if (!chainId || !tokenSymbol || !tokenAddress)
        return NextResponse.json({ error: 'chainId, tokenSymbol, tokenAddress are required' }, { status: 400 })

    const sweepAmount = parseFloat(amount)
    if (!isFinite(sweepAmount) || sweepAmount <= 0)
        return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })

    const supabase = db()

    // Check treasury has enough balance
    const { data: bal } = await supabase
        .from('ledger_balances')
        .select('balance')
        .eq('user_id', TREASURY_ID)
        .eq('chain_id', chainId)
        .eq('token_address', tokenAddress.toLowerCase())
        .maybeSingle()

    const available = parseFloat(bal?.balance ?? '0')
    if (available < sweepAmount)
        return NextResponse.json(
            { error: `Insufficient treasury balance. Available: $${available.toFixed(2)}, requested: $${sweepAmount.toFixed(2)}` },
            { status: 400 },
        )

    // Debit the treasury ledger
    const { error: debitErr } = await supabase.rpc('debit_balance', {
        p_user_id:       TREASURY_ID,
        p_chain_id:      chainId,
        p_token_symbol:  tokenSymbol,
        p_token_address: tokenAddress.toLowerCase(),
        p_amount:        sweepAmount.toFixed(6),
        p_type:          'withdrawal',
        p_ref_id:        null,
        p_note:          destinationAddress
            ? `Sweep to ${destinationAddress} on ${CHAIN_NAMES[chainId] ?? chainId}${note ? ` — ${note}` : ''}`
            : `Internal sweep on ${CHAIN_NAMES[chainId] ?? chainId}${note ? ` — ${note}` : ''}`,
    })

    if (debitErr)
        return NextResponse.json({ error: 'Failed to debit treasury: ' + debitErr.message }, { status: 500 })

    return NextResponse.json({
        success: true,
        swept: sweepAmount,
        tokenSymbol,
        chainId,
        destinationAddress: destinationAddress ?? null,
        remainingBalance: (available - sweepAmount).toFixed(2),
    })
}
