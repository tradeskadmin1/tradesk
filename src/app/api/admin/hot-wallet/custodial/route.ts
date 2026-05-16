import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'

const db = (): any => _createSupabaseAdminClient()

const BTC_CHAIN_ID = 0
const TRX_CHAIN_ID = 728_126_428
const ZERO_ADDR    = '0x0000000000000000000000000000000000000000'
const USDT_TRC20   = 'tr7nhqjekqxgtci8q8zy4pl8otszzgjlj6t'

async function sumLedger(
    supabase: any,
    chainId: number,
    tokenAddress: string,
): Promise<number> {
    const { data } = await supabase
        .from('ledger_balances')
        .select('balance')
        .eq('chain_id', chainId)
        .eq('token_address', tokenAddress)

    if (!data?.length) return 0
    return data.reduce((acc: number, row: { balance: string }) => acc + parseFloat(row.balance ?? '0'), 0)
}

async function pendingCount(supabase: any, chainId: number): Promise<number> {
    const { count } = await supabase
        .from('withdrawals')
        .select('id', { count: 'exact', head: true })
        .eq('chain_id', chainId)
        .eq('status', 'pending')

    return count ?? 0
}

export async function GET(req: Request) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const supabase = db()

    const [
        btcBalance,
        trxBalance,
        usdtTrc20Balance,
        btcPending,
        trxPending,
    ] = await Promise.all([
        sumLedger(supabase, BTC_CHAIN_ID, ZERO_ADDR),
        sumLedger(supabase, TRX_CHAIN_ID, ZERO_ADDR),
        sumLedger(supabase, TRX_CHAIN_ID, USDT_TRC20),
        pendingCount(supabase, BTC_CHAIN_ID),
        pendingCount(supabase, TRX_CHAIN_ID),
    ])

    return NextResponse.json({
        custodial: [
            {
                chain: 'btc',
                chainName: 'Bitcoin',
                chainId: BTC_CHAIN_ID,
                tokens: [
                    { symbol: 'BTC', balance: btcBalance },
                ],
                pendingWithdrawals: btcPending,
            },
            {
                chain: 'trx',
                chainName: 'Tron',
                chainId: TRX_CHAIN_ID,
                tokens: [
                    { symbol: 'TRX',  balance: trxBalance },
                    { symbol: 'USDT', balance: usdtTrc20Balance },
                ],
                pendingWithdrawals: trxPending,
            },
        ],
    })
}
