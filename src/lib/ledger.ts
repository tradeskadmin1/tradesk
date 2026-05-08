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
