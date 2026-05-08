
import { erc20Abi, formatUnits } from 'viem'
import { getPublicClient } from './rpc'
import { createSupabaseAdminClient } from './supabase-server'
import { TOKENS, NATIVE_TOKEN_ADDRESS } from '@/config/tokens'
import { SUPPORTED_CHAIN_IDS, type SupportedChainId } from '@/config/chains'
import type { Database } from './database.types'

type BalanceRow = Database['public']['Tables']['wallet_balances']['Row']

export interface TokenBalance {
    tokenSymbol: string
    tokenAddress: string
    chainId: SupportedChainId
    balance: string
    balanceRaw: bigint
}

// ── On-chain reads ─────────────────────────────────────────────────────────

export async function fetchNativeBalance(
    address: `0x${string}`,
    chainId: SupportedChainId,
): Promise<bigint> {
    const client = getPublicClient(chainId)
    return client.getBalance({ address })
}

export async function fetchERC20Balance(
    tokenAddress: `0x${string}`,
    walletAddress: `0x${string}`,
    chainId: SupportedChainId,
): Promise<bigint> {
    const client = getPublicClient(chainId)
    return client.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddress],
    }) as Promise<bigint>
}

// ── Full balance sync ──────────────────────────────────────────────────────


export async function syncWalletBalances(
    walletId: string,
    walletAddress: `0x${string}`,
    chainId: SupportedChainId,
): Promise<TokenBalance[]> {
    const supabase = createSupabaseAdminClient() as ReturnType<typeof createSupabaseAdminClient>
    const results: TokenBalance[] = []

    for (const [symbol, token] of Object.entries(TOKENS)) {
        const tokenAddress = token.addresses[chainId]
        if (!tokenAddress) continue   // token not available on this chain

        let balanceRaw: bigint

        try {
            if (tokenAddress === NATIVE_TOKEN_ADDRESS) {
                balanceRaw = await fetchNativeBalance(walletAddress, chainId)
            } else {
                balanceRaw = await fetchERC20Balance(
                    tokenAddress as `0x${string}`,
                    walletAddress,
                    chainId,
                )
            }
        } catch {
            // RPC error for this token — skip and continue
            continue
        }

        const balance = formatUnits(balanceRaw, token.decimals)

        results.push({ tokenSymbol: symbol, tokenAddress, chainId, balance, balanceRaw })
        await (supabase as any)
            .from('wallet_balances')
            .upsert(
                {
                    wallet_id: walletId,
                    token_symbol: symbol,
                    token_address: tokenAddress,
                    chain_id: chainId,
                    balance,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'wallet_id,token_address,chain_id' },
            )
    }

    return results
}


export async function syncAllWalletBalances(
    wallets: { walletId: string; address: string; chainId: SupportedChainId }[],
): Promise<void> {
    await Promise.allSettled(
        wallets.map((w) =>
            syncWalletBalances(w.walletId, w.address as `0x${string}`, w.chainId),
        ),
    )
}


export async function getCachedBalances(userId: string): Promise<BalanceRow[]> {
    const supabase = createSupabaseAdminClient() as any
    const { data, error } = await supabase
        .from('wallet_balances')
        .select(`
      *,
      custodial_wallets!inner ( user_id )
    `)
        .eq('custodial_wallets.user_id', userId)

    if (error) throw new Error(`[balance] Failed to fetch balances: ${error.message}`)
    return data ?? []
}