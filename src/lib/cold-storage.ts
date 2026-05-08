/**
 * Cold Storage Drain
 *
 * Called after every sweep into the hot wallet.
 * If the hot wallet holds more than HOT_WALLET_RETAIN_PCT of total user
 * balances for a given token, the excess is sent to the cold wallet.
 *
 * Config (add to .env.local):
 *   COLD_WALLET_ADDRESS_ETH   — Safe address on Ethereum
 *   COLD_WALLET_ADDRESS_BSC   — Safe address on BNB Chain
 *   COLD_WALLET_ADDRESS_ARB   — Safe address on Arbitrum
 *   HOT_WALLET_RETAIN_PCT     — fraction to keep hot  (default: 0.20)
 *   HOT_WALLET_GAS_BUFFER_ETH — min native kept for gas (default: 0.05)
 */

import { erc20Abi, formatUnits, parseUnits, type Address } from 'viem'
import { getPlatformWalletClient } from './platform-wallet'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from './supabase-server'
import type { SupportedChainId } from '@/config/chains'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()

// ── Config ────────────────────────────────────────────────────────────────────
const RETAIN_PCT = parseFloat(process.env.HOT_WALLET_RETAIN_PCT ?? '0.20')
const GAS_BUFFER = parseFloat(process.env.HOT_WALLET_GAS_BUFFER_ETH ?? '0.05')

const NATIVE_LEDGER_ADDRESS = '0x0000000000000000000000000000000000000000'

function getColdAddress(chainId: SupportedChainId): Address | null {
    const map: Partial<Record<SupportedChainId, string | undefined>> = {
        1:     process.env.COLD_WALLET_ADDRESS_ETH,
        56:    process.env.COLD_WALLET_ADDRESS_BSC,
        42161: process.env.COLD_WALLET_ADDRESS_ARB,
    }
    const addr = map[chainId]
    return addr ? addr as Address : null
}

// ── Sum of all user balances for a token/chain ────────────────────────────────
async function getTotalUserBalance(
    chainId:      SupportedChainId,
    tokenAddress: string,
): Promise<number> {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
        .from('ledger_balances')
        .select('balance')
        .eq('chain_id', chainId)
        .eq('token_address', tokenAddress)

    if (error || !data?.length) return 0
    return data.reduce(
        (sum: number, row: { balance: string }) => sum + parseFloat(row.balance),
        0,
    )
}

// ── Main drain function ───────────────────────────────────────────────────────
export async function maybeDrainToCold(params: {
    chainId:      SupportedChainId
    tokenAddress: string   // ledger format — '0x000...000' for native
    tokenSymbol:  string
    decimals:     number
}): Promise<string | null> {
    const { chainId, tokenAddress, tokenSymbol, decimals } = params

    const coldAddress = getColdAddress(chainId)
    if (!coldAddress) {
        // Cold wallet not configured for this chain — skip silently
        return null
    }

    const {
        walletClient: hotWallet,
        publicClient,
        address:      hotAddress,
    } = await getPlatformWalletClient(chainId)

    const isNative = tokenAddress === NATIVE_LEDGER_ADDRESS

    // ── 1. Get hot wallet on-chain balance for this token ─────────────────
    let hotBalance: bigint
    if (isNative) {
        hotBalance = await publicClient.getBalance({ address: hotAddress as Address })
    } else {
        hotBalance = await publicClient.readContract({
            address:      tokenAddress as Address,
            abi:          erc20Abi,
            functionName: 'balanceOf',
            args:         [hotAddress as Address],
        }) as bigint
    }

    if (hotBalance === BigInt(0)) return null

    // ── 2. Calculate how much to keep ─────────────────────────────────────
    const totalUserBalance = await getTotalUserBalance(chainId, tokenAddress)
    if (totalUserBalance === 0) return null

    const targetRetainFloat = totalUserBalance * RETAIN_PCT

    // Add gas buffer on top of the retain amount for native tokens
    const gasBufferFloat = isNative ? GAS_BUFFER : 0
    const totalRetainFloat = targetRetainFloat + gasBufferFloat

    const totalRetainRaw = parseUnits(
        totalRetainFloat.toFixed(decimals),
        decimals,
    )

    if (hotBalance <= totalRetainRaw) {
        console.log(
            `[cold-storage] Hot wallet within limit for ${tokenSymbol} on chain ${chainId} ` +
            `(${formatUnits(hotBalance, decimals)} / target ${totalRetainFloat.toFixed(6)})`,
        )
        return null
    }

    // ── 3. For ERC-20: check the hot wallet has enough native for gas ─────
    if (!isNative) {
        const nativeBal = await publicClient.getBalance({ address: hotAddress as Address })
        const minNative = parseUnits(String(GAS_BUFFER), 18)
        if (nativeBal < minNative) {
            console.warn(
                `[cold-storage] Skipping ERC-20 drain — hot wallet low on gas ` +
                `(${formatUnits(nativeBal, 18)} native < ${GAS_BUFFER} buffer)`,
            )
            return null
        }
    }

    const drainAmount = hotBalance - totalRetainRaw

    console.log(
        `[cold-storage] Draining ${formatUnits(drainAmount, decimals)} ${tokenSymbol} ` +
        `from hot wallet → cold wallet on chain ${chainId}`,
    )

    // ── 4. Send to cold wallet ─────────────────────────────────────────────
    let txHash: `0x${string}`

    if (isNative) {
        txHash = await hotWallet.sendTransaction({
            to:    coldAddress,
            value: drainAmount,
        })
    } else {
        txHash = await hotWallet.writeContract({
            address:      tokenAddress as Address,
            abi:          erc20Abi,
            functionName: 'transfer',
            args:         [coldAddress, drainAmount],
        })
    }

    console.log(
        `[cold-storage] Drain tx sent: ${txHash} ` +
        `(${formatUnits(drainAmount, decimals)} ${tokenSymbol} chain ${chainId})`,
    )

    return txHash
}
