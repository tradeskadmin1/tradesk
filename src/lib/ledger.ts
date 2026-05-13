import { createSupabaseAdminClient as _createSupabaseAdminClient } from './supabase-server'
import type { SupportedChainId } from '@/config/chains'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()

export type LedgerTxType =
    | 'deposit'
    | 'withdrawal'
    | 'sweep'
    | 'trade_buy'
    | 'trade_sell'
    | 'fee'
    | 'adjustment'

export interface LedgerBalance {
    chainId: number
    tokenSymbol: string
    tokenAddress: string
    balance: string
}

export interface LedgerTransaction {
    id: string
    chainId: number
    tokenSymbol: string
    tokenAddress: string
    amount: string
    direction: 'credit' | 'debit'
    type: LedgerTxType
    refId: string | null
    note: string | null
    balanceAfter: string
    createdAt: string
}


export async function creditBalance(params: {
    userId: string
    chainId: SupportedChainId
    tokenSymbol: string
    tokenAddress: string
    amount: string
    type?: LedgerTxType
    refId?: string
    note?: string
}): Promise<string> {
    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase.rpc('credit_balance', {
        p_user_id: params.userId,
        p_chain_id: params.chainId,
        p_token_symbol: params.tokenSymbol,
        p_token_address: params.tokenAddress,
        p_amount: params.amount,
        p_type: params.type ?? 'deposit',
        p_ref_id: params.refId ?? null,
        p_note: params.note ?? null,
    })

    if (error) {
        throw new Error(`[ledger] credit_balance failed: ${error.message}`)
    }

    return String(data)
}


export async function debitBalance(params: {
    userId: string
    chainId: SupportedChainId
    tokenSymbol: string
    tokenAddress: string
    amount: string
    type?: LedgerTxType
    refId?: string
    note?: string
}): Promise<string> {
    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase.rpc('debit_balance', {
        p_user_id: params.userId,
        p_chain_id: params.chainId,
        p_token_symbol: params.tokenSymbol,
        p_token_address: params.tokenAddress,
        p_amount: params.amount,
        p_type: params.type ?? 'withdrawal',
        p_ref_id: params.refId ?? null,
        p_note: params.note ?? null,
    })

    if (error) {
        throw new Error(`[ledger] debit_balance failed: ${error.message}`)
    }

    return String(data)
}


export async function getUserBalances(userId: string): Promise<LedgerBalance[]> {
    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase
        .from('ledger_balances')
        .select('chain_id, token_symbol, token_address, balance')
        .eq('user_id', userId)
        .gt('balance', 0)
        .order('chain_id')

    if (error) throw new Error(`[ledger] getUserBalances failed: ${error.message}`)

    return (data ?? []).map((row: any) => ({
        chainId: row.chain_id,
        tokenSymbol: row.token_symbol,
        tokenAddress: row.token_address,
        balance: String(row.balance),
    }))
}


export async function getBalance(params: {
    userId: string
    chainId: SupportedChainId
    tokenAddress: string
}): Promise<string> {
    const supabase = createSupabaseAdminClient()

    const { data } = await supabase
        .from('ledger_balances')
        .select('balance')
        .eq('user_id', params.userId)
        .eq('chain_id', params.chainId)
        .eq('token_address', params.tokenAddress)
        .maybeSingle()

    return data ? String(data.balance) : '0'
}


/**
 * Record fee income:
 *   1. Inserts a row in platform_revenue (audit log / reporting).
 *   2. Credits the platform treasury ledger account so the money is real
 *      and visible to the admin, not just a log entry.
 *
 * The treasury is an internal user with a fixed UUID stored in
 * PLATFORM_TREASURY_USER_ID.  Its ledger balance accumulates all fees
 * and can be swept to the hot wallet from the admin dashboard.
 */
export async function recordPlatformRevenue(params: {
    source: 'futures_open' | 'futures_close' | 'arbitrage'
    userId: string
    refId?: string
    amount: number
    tokenSymbol?: string
    chainId: number
    note?: string
}): Promise<void> {
    const supabase    = createSupabaseAdminClient()
    const tokenSymbol = params.tokenSymbol ?? 'USDC'
    const note        = params.note ?? null

    // ── 1. Audit log ──────────────────────────────────────────────────────────
    const { error: logErr } = await supabase.from('platform_revenue').insert({
        source:       params.source,
        user_id:      params.userId,
        ref_id:       params.refId ?? null,
        amount:       params.amount.toFixed(6),
        token_symbol: tokenSymbol,
        chain_id:     params.chainId,
        note,
    })
    if (logErr) {
        console.error('[ledger] platform_revenue insert failed:', logErr.message)
    }

    // ── 2. Credit treasury balance ────────────────────────────────────────────
    const treasuryId = process.env.PLATFORM_TREASURY_USER_ID
    if (!treasuryId) {
        console.error('[ledger] PLATFORM_TREASURY_USER_ID not set — fee not credited to treasury')
        return
    }

    // Derive token address from the token symbol + chain so the treasury
    // balance row uses the same address as the user side of the trade.
    const TOKEN_ADDRESSES: Record<string, Record<number, string>> = {
        USDC: {
            1:     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            56:    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
            42161: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
        },
        USDT: {
            1:     '0xdac17f958d2ee523a2206206994597c13d831ec7',
            56:    '0x55d398326f99059ff775485246999027b3197955',
            42161: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
        },
    }
    const tokenAddress =
        TOKEN_ADDRESSES[tokenSymbol]?.[params.chainId] ??
        TOKEN_ADDRESSES['USDC'][params.chainId] ??
        '0xaf88d065e77c8cc2239327c5edb3a432268e5831'

    const { error: creditErr } = await supabase.rpc('credit_balance', {
        p_user_id:      treasuryId,
        p_chain_id:     params.chainId,
        p_token_symbol: tokenSymbol,
        p_token_address: tokenAddress,
        p_amount:       params.amount.toFixed(6),
        p_type:         'fee',
        p_ref_id:       params.refId ?? null,
        p_note:         `[treasury] ${params.source} fee from user ${params.userId.slice(0, 8)}… — ${note}`,
    })
    if (creditErr) {
        console.error('[ledger] treasury credit_balance failed:', creditErr.message)
    }
}


export async function getLedgerHistory(
    userId: string,
    limit = 20,
    offset = 0,
): Promise<LedgerTransaction[]> {
    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase
        .from('ledger_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (error) throw new Error(`[ledger] getLedgerHistory failed: ${error.message}`)

    return (data ?? []).map((row: any) => ({
        id: row.id,
        chainId: row.chain_id,
        tokenSymbol: row.token_symbol,
        tokenAddress: row.token_address,
        amount: String(row.amount),
        direction: row.direction,
        type: row.type,
        refId: row.ref_id,
        note: row.note,
        balanceAfter: String(row.balance_after),
        createdAt: row.created_at,
    }))
}
