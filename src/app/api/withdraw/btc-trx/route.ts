import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'

const CHAIN_IDS: Record<string, number> = {
    btc: 0,
    trx: 728_126_428,
}

const SUPPORTED_TOKENS: Record<string, string[]> = {
    btc: ['BTC'],
    trx: ['TRX', 'USDT'],
}

const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'
const USDT_TRC20_ADDRESS = 'tr7nhqjekqxgtci8q8zy4pl8otszzgjlj6t'

function tokenAddress(chain: string, tokenSymbol: string): string {
    if (chain === 'trx' && tokenSymbol === 'USDT') return USDT_TRC20_ADDRESS
    return NATIVE_TOKEN_ADDRESS
}

function validateAddress(chain: string, address: string): boolean {
    if (chain === 'btc') return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address)
    if (chain === 'trx') return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)
    return false
}

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = await checkRateLimit(`withdraw:${user.id}`, LIMITS.STRICT)
        if (!rl.success) return rlResponse(rl.resetAt)

        const body = await req.json()
        const { chain, tokenSymbol, amount, toAddress } = body

        if (!chain || !['btc', 'trx'].includes(chain)) {
            return NextResponse.json({ error: 'Unsupported chain — use btc or trx' }, { status: 400 })
        }

        if (!tokenSymbol || !SUPPORTED_TOKENS[chain].includes(tokenSymbol)) {
            return NextResponse.json(
                { error: `Unsupported token ${tokenSymbol} on ${chain.toUpperCase()}` },
                { status: 400 },
            )
        }

        const amountNum = parseFloat(amount)
        if (!amount || isNaN(amountNum) || amountNum <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
        }

        if (!toAddress || !validateAddress(chain, toAddress)) {
            return NextResponse.json(
                { error: `Invalid ${chain.toUpperCase()} destination address` },
                { status: 400 },
            )
        }

        const chainId = CHAIN_IDS[chain]
        const tokenAddr = tokenAddress(chain, tokenSymbol)
        const db = createSupabaseAdminClient() as any

        const { data: wallet, error: walletError } = await db
            .from('custodial_wallets')
            .select('id, address')
            .eq('user_id', user.id)
            .eq('chain_id', chainId)
            .single()

        if (walletError || !wallet) {
            return NextResponse.json(
                { error: `No ${chain.toUpperCase()} wallet found. Complete onboarding first.` },
                { status: 404 },
            )
        }

        const { data: ledgerRow } = await db
            .from('ledger_balances')
            .select('balance')
            .eq('user_id', user.id)
            .eq('chain_id', chainId)
            .eq('token_address', tokenAddr)
            .maybeSingle()

        const currentBalance = parseFloat(ledgerRow?.balance ?? '0')
        if (currentBalance < amountNum) {
            return NextResponse.json(
                { error: `Insufficient balance. Available: ${currentBalance} ${tokenSymbol}` },
                { status: 400 },
            )
        }

        const newBalance = (currentBalance - amountNum).toFixed(8)

        if (ledgerRow) {
            await db
                .from('ledger_balances')
                .update({ balance: newBalance, updated_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('chain_id', chainId)
                .eq('token_address', tokenAddr)
        }

        const { data: withdrawal, error: insertError } = await db
            .from('withdrawals')
            .insert({
                user_id: user.id,
                wallet_id: wallet.id,
                chain_id: chainId,
                token_symbol: tokenSymbol,
                token_address: tokenAddr,
                amount: String(amountNum),
                fee: '0',
                to_address: toAddress,
                status: 'pending',
                auto_approved: false,
            })
            .select('id')
            .single()

        if (insertError || !withdrawal) {
            if (ledgerRow) {
                await db
                    .from('ledger_balances')
                    .update({ balance: String(currentBalance), updated_at: new Date().toISOString() })
                    .eq('user_id', user.id)
                    .eq('chain_id', chainId)
                    .eq('token_address', tokenAddr)
            }
            return NextResponse.json({ error: 'Failed to create withdrawal record' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            status: 'pending',
            autoApproved: false,
            withdrawalId: withdrawal.id,
            message: `Your withdrawal of ${amountNum} ${tokenSymbol} on ${chain.toUpperCase()} is pending admin review. Funds will be sent to your address once approved, typically within 24 hours.`,
        })
    } catch (err) {
        console.error('[POST /api/withdraw/btc-trx]', err)
        return NextResponse.json({ error: 'Withdrawal failed' }, { status: 500 })
    }
}
