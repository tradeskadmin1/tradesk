import { NextResponse } from 'next/server'
import { isAddress, getAddress } from 'viem'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'
import { executeWithdrawal, estimateWithdrawalFee } from '@/lib/transfer'
import { getPlatformAddress } from '@/lib/platform-wallet'
import { getBalance, debitBalance, creditBalance } from '@/lib/ledger'
import { isSupportedChain, getChainConfig, type SupportedChainId } from '@/config/chains'
import { TOKENS, NATIVE_TOKEN_ADDRESS } from '@/config/tokens'

const LEDGER_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000'

/**
 * Withdrawals below this USD-equivalent amount are auto-approved and executed
 * immediately. Above it, the request is queued for manual admin review.
 * Override with the WITHDRAWAL_AUTO_APPROVE_THRESHOLD env var.
 */
const AUTO_APPROVE_THRESHOLD = parseFloat(
    process.env.WITHDRAWAL_AUTO_APPROVE_THRESHOLD ?? '500',
)

// ── POST — submit a withdrawal request ────────────────────────────────────────
export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = checkRateLimit(`withdraw:${user.id}`, LIMITS.STRICT)
        if (!rl.success) return rlResponse(rl.resetAt)

        const body = await req.json()
        const { chainId: chainIdRaw, tokenSymbol, amount, toAddress } = body

        // ── Validate inputs ────────────────────────────────────────────────
        const chainId = parseInt(chainIdRaw, 10) as SupportedChainId
        if (!isSupportedChain(chainId))
            return NextResponse.json({ error: `Unsupported chain: ${chainIdRaw}` }, { status: 400 })

        if (!TOKENS[tokenSymbol])
            return NextResponse.json({ error: `Unknown token: ${tokenSymbol}` }, { status: 400 })

        const amountNum = parseFloat(amount)
        if (!amount || isNaN(amountNum) || amountNum <= 0)
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

        if (!toAddress || !isAddress(toAddress))
            return NextResponse.json({ error: 'Invalid destination address' }, { status: 400 })

        const checksummedAddress = getAddress(toAddress) as `0x${string}`
        const db = createSupabaseAdminClient() as any

        // ── Resolve custodial wallet ───────────────────────────────────────
        const { data: wallet, error: walletError } = await db
            .from('custodial_wallets')
            .select('id, address')
            .eq('user_id', user.id)
            .eq('chain_id', chainId)
            .single()

        if (walletError || !wallet)
            return NextResponse.json({ error: 'Wallet not found for this chain' }, { status: 404 })

        const rawTokenAddress  = TOKENS[tokenSymbol].addresses[chainId] ?? ''
        const ledgerTokenAddress = rawTokenAddress === NATIVE_TOKEN_ADDRESS
            ? LEDGER_NATIVE_ADDRESS
            : rawTokenAddress.toLowerCase()

        // ── Check ledger balance ───────────────────────────────────────────
        const ledgerBalance = await getBalance({ userId: user.id, chainId, tokenAddress: ledgerTokenAddress })
        if (parseFloat(ledgerBalance) < amountNum)
            return NextResponse.json(
                { error: `Insufficient balance. Available: ${ledgerBalance} ${tokenSymbol}` },
                { status: 400 },
            )

        // ── Estimate gas fee ───────────────────────────────────────────────
        const hotAddress = await getPlatformAddress(chainId)
        const { feeEth } = await estimateWithdrawalFee(
            chainId, tokenSymbol,
            hotAddress as `0x${string}`,
            checksummedAddress,
            amount,
        )

        // ── Debit ledger immediately (hold funds) ──────────────────────────
        // This prevents double-spend while the request awaits approval.
        await debitBalance({
            userId:       user.id,
            chainId,
            tokenSymbol,
            tokenAddress: ledgerTokenAddress,
            amount:       String(amountNum),
            type:         'withdrawal',
            note:         `Withdrawal hold — pending approval → ${checksummedAddress}`,
        })

        // ── Determine approval path ────────────────────────────────────────
        const autoApprove = amountNum <= AUTO_APPROVE_THRESHOLD

        const { data: withdrawal, error: insertError } = await db
            .from('withdrawals')
            .insert({
                user_id:       user.id,
                wallet_id:     wallet.id,
                chain_id:      chainId,
                token_symbol:  tokenSymbol,
                token_address: ledgerTokenAddress,
                amount,
                fee:           feeEth,
                to_address:    checksummedAddress,
                status:        autoApprove ? 'approved' : 'pending',
                auto_approved: autoApprove,
                ...(autoApprove ? { approved_at: new Date().toISOString() } : {}),
            })
            .select('id')
            .single()

        if (insertError || !withdrawal) {
            // Rollback the ledger hold
            await creditBalance({
                userId: user.id, chainId, tokenSymbol,
                tokenAddress: ledgerTokenAddress,
                amount: String(amountNum),
                type: 'adjustment',
                note: 'Withdrawal record creation failed — reversal',
            }).catch(() => {})
            return NextResponse.json({ error: 'Failed to create withdrawal record' }, { status: 500 })
        }

        // ── Auto-approve: execute immediately ──────────────────────────────
        if (autoApprove) {
            try {
                const result = await executeWithdrawal({
                    userId:          user.id,
                    walletId:        wallet.id,
                    withdrawalId:    withdrawal.id,
                    chainId,
                    tokenSymbol,
                    amount,
                    toAddress:       checksummedAddress,
                    skipLedgerDebit: true, // already debited above
                })

                return NextResponse.json({
                    success:      true,
                    status:       'completed',
                    autoApproved: true,
                    withdrawalId: withdrawal.id,
                    txHash:       result.txHash,
                    fee:          result.fee,
                })
            } catch (execErr: any) {
                // Execution failed — credit back
                await creditBalance({
                    userId: user.id, chainId, tokenSymbol,
                    tokenAddress: ledgerTokenAddress,
                    amount: String(amountNum),
                    type: 'adjustment',
                    note: `Auto-approved withdrawal execution failed — reversal`,
                }).catch(() => {})
                await db.from('withdrawals').update({ status: 'failed' }).eq('id', withdrawal.id)
                throw execErr
            }
        }

        // ── Manual approval required ───────────────────────────────────────
        return NextResponse.json({
            success:      true,
            status:       'pending',
            autoApproved: false,
            withdrawalId: withdrawal.id,
            message:      `Your withdrawal of ${amountNum} ${tokenSymbol} is pending admin approval. You will be notified once reviewed.`,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Withdrawal failed'
        console.error('[POST /api/withdraw]', err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// ── GET — status lookup or fee estimate ───────────────────────────────────────
export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        // ── Single withdrawal status ───────────────────────────────────────
        if (id) {
            const db = createSupabaseAdminClient() as any
            const { data, error } = await db
                .from('withdrawals')
                .select('id, status, amount, token_symbol, to_address, tx_hash, fee, auto_approved, rejection_reason, created_at, approved_at, rejected_at, completed_at')
                .eq('id', id)
                .eq('user_id', user.id)
                .single()

            if (error || !data) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
            return NextResponse.json(data)
        }

        // ── Withdrawal history ─────────────────────────────────────────────
        const historyParam = searchParams.get('history')
        if (historyParam === 'true') {
            const db = createSupabaseAdminClient() as any
            const { data, error } = await db
                .from('withdrawals')
                .select('id, status, amount, token_symbol, chain_id, to_address, tx_hash, fee, auto_approved, rejection_reason, created_at, completed_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
            return NextResponse.json({ withdrawals: data ?? [] })
        }

        // ── Fee estimate ───────────────────────────────────────────────────
        const chainIdParam = searchParams.get('chainId')
        const tokenSymbol  = searchParams.get('token')
        const amount       = searchParams.get('amount')
        const toAddress    = searchParams.get('toAddress')

        if (!chainIdParam || !tokenSymbol || !amount || !toAddress)
            return NextResponse.json(
                { error: 'Provide id, history=true, or chainId+token+amount+toAddress' },
                { status: 400 },
            )

        const chainId = parseInt(chainIdParam, 10) as SupportedChainId
        if (!isSupportedChain(chainId)) return NextResponse.json({ error: `Unsupported chain` }, { status: 400 })
        if (!TOKENS[tokenSymbol])        return NextResponse.json({ error: `Unknown token` }, { status: 400 })
        if (!isAddress(toAddress))       return NextResponse.json({ error: 'Invalid address' }, { status: 400 })

        const db = createSupabaseAdminClient() as any
        const { data: wallet } = await db
            .from('custodial_wallets').select('address')
            .eq('user_id', user.id).eq('chain_id', chainId).single()

        if (!wallet) return NextResponse.json({ error: 'No wallet found for this chain' }, { status: 404 })

        const hotAddress  = await getPlatformAddress(chainId)
        const chainCfg    = getChainConfig(chainId)
        const { feeEth, feeUsd } = await estimateWithdrawalFee(
            chainId, tokenSymbol,
            hotAddress as `0x${string}`,
            getAddress(toAddress) as `0x${string}`,
            amount,
        )

        const requiresApproval = parseFloat(amount) > AUTO_APPROVE_THRESHOLD

        return NextResponse.json({
            estimatedFee:      feeEth,
            estimatedFeeUsd:   feeUsd ?? null,
            token:             chainCfg.nativeCurrency.symbol,
            network:           chainCfg.name,
            requiresApproval,
            autoApproveLimit:  AUTO_APPROVE_THRESHOLD,
        })
    } catch (err) {
        console.error('[GET /api/withdraw]', err)
        return NextResponse.json({ error: 'Failed to fetch withdrawal info' }, { status: 500 })
    }
}
