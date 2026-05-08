import { createWalletClient, createPublicClient, http, fallback, erc20Abi, parseUnits, formatUnits, encodeFunctionData, } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, bsc, arbitrum } from 'viem/chains'
import { loadPrivateKey } from './wallet'
import { getPublicClient } from './rpc'
import { fetchNativeBalance, fetchERC20Balance } from './balance'
import { createSupabaseAdminClient } from './supabase-server'
import { TOKENS, NATIVE_TOKEN_ADDRESS } from '@/config/tokens'
import { getChainConfig, type SupportedChainId } from '@/config/chains'

const CHAIN_MAP = { 1: mainnet, 56: bsc, 42161: arbitrum } as const

// ── Types ──────────────────────────────────────────────────────────────────

export interface WithdrawalRequest {
    userId: string
    walletId: string
    chainId: SupportedChainId
    tokenSymbol: string
    amount: string
    toAddress: `0x${string}`
}

export interface TransferResult {
    txHash: string
    gasUsed: string
    fee: string
}

// ── Gas estimation ─────────────────────────────────────────────────────────

export async function estimateWithdrawalFee(
    chainId: SupportedChainId,
    tokenSymbol: string,
    fromAddress: `0x${string}`,
    toAddress: `0x${string}`,
    amount: string,
): Promise<{ feeEth: string; feeUsd: string | null }> {
    const client = getPublicClient(chainId)
    const token = TOKENS[tokenSymbol]
    if (!token) throw new Error(`[transfer] Unknown token: ${tokenSymbol}`)

    const tokenAddress = token.addresses[chainId]
    if (!tokenAddress) throw new Error(`[transfer] ${tokenSymbol} not on chain ${chainId}`)

    const gasPrice = await client.getGasPrice()
    let gasEstimate: bigint

    if (tokenAddress === NATIVE_TOKEN_ADDRESS) {
        gasEstimate = await client.estimateGas({
            account: fromAddress,
            to: toAddress,
            value: parseUnits(amount, token.decimals),
        })
    } else {
        gasEstimate = await client.estimateContractGas({
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [toAddress, parseUnits(amount, token.decimals)],
            account: fromAddress,
        })
    }

    const feeWei = gasEstimate * gasPrice
    const feeEth = formatUnits(feeWei, 18)

    return { feeEth, feeUsd: null }
}


export async function executeWithdrawal(req: WithdrawalRequest): Promise<TransferResult> {
    const { userId, chainId, tokenSymbol, amount, toAddress } = req
    const supabase = createSupabaseAdminClient() as any
    const token = TOKENS[tokenSymbol]

    if (!token) throw new Error(`[transfer] Unknown token: ${tokenSymbol}`)

    const tokenAddress = token.addresses[chainId]
    if (!tokenAddress) throw new Error(`[transfer] ${tokenSymbol} not available on chain ${chainId}`)
    let privateKey: string
    try {
        privateKey = await loadPrivateKey(userId, chainId)
    } catch (err) {
        throw new Error(`[transfer] Could not load private key: ${err}`)
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`)
    const chain = CHAIN_MAP[chainId]
    const amountRaw = parseUnits(amount, token.decimals)
    let currentBalance: bigint

    if (tokenAddress === NATIVE_TOKEN_ADDRESS) {
        currentBalance = await fetchNativeBalance(account.address, chainId)
    } else {
        currentBalance = await fetchERC20Balance(
            tokenAddress as `0x${string}`,
            account.address,
            chainId,
        )
    }

    if (currentBalance < amountRaw) {
        throw new Error(
            `[transfer] Insufficient balance. Have ${formatUnits(currentBalance, token.decimals)}, need ${amount}`,
        )
    }

    const chainConfig = getChainConfig(chainId)
    const walletClient = createWalletClient({
        account,
        chain,
        transport: http(process.env[chainConfig.rpcEnvKey] ?? chainConfig.publicRpcFallback),
    })

    const publicClient = createPublicClient({
        chain,
        transport: http(process.env[chainConfig.rpcEnvKey] ?? chainConfig.publicRpcFallback),
    })

    let txHash: `0x${string}`

    if (tokenAddress === NATIVE_TOKEN_ADDRESS) {
        txHash = await walletClient.sendTransaction({
            to: toAddress,
            value: amountRaw,
        })
    } else {
        const data = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transfer',
            args: [toAddress, amountRaw],
        })
        txHash = await walletClient.sendTransaction({
            to: tokenAddress as `0x${string}`,
            data,
        })
    }

    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 120_000,
    })

    const gasUsed = receipt.gasUsed.toString()
    const gasPrice = receipt.effectiveGasPrice ?? BigInt(0)
    const feeWei = receipt.gasUsed * gasPrice
    const fee = formatUnits(feeWei, 18)
    privateKey = '0'.repeat(privateKey.length)
    await supabase
        .from('withdrawals')
        .update({
            tx_hash: txHash,
            fee,
            status: 'completed',
            completed_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('status', 'processing')

    return { txHash, gasUsed, fee }
}

export async function recordDeposit({
    userId,
    walletId,
    chainId,
    tokenSymbol,
    tokenAddress,
    amount,
    txHash,
    fromAddress,
}: {
    userId: string
    walletId: string
    chainId: SupportedChainId
    tokenSymbol: string
    tokenAddress: string
    amount: string
    txHash: string
    fromAddress: string
}): Promise<void> {
    const supabase = createSupabaseAdminClient() as any

    await supabase
        .from('deposits')
        .upsert(
            {
                user_id: userId,
                wallet_id: walletId,
                chain_id: chainId,
                token_symbol: tokenSymbol,
                token_address: tokenAddress,
                amount,
                tx_hash: txHash,
                from_address: fromAddress,
                status: 'confirmed',
                confirmed_at: new Date().toISOString(),
            },
            { onConflict: 'tx_hash' },
        )

    const token = TOKENS[tokenSymbol]
    const newBal = await (async () => {
        const client = getPublicClient(chainId)
        const walletRes = await (supabase as any)
            .from('custodial_wallets')
            .select('address')
            .eq('id', walletId)
            .single()

        if (!walletRes.data?.address) return null

        if (tokenAddress === NATIVE_TOKEN_ADDRESS) {
            return client.getBalance({ address: walletRes.data.address })
        }
        return client.readContract({
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [walletRes.data.address],
        }) as Promise<bigint>
    })()

    if (newBal !== null && token) {
        await (supabase as any)
            .from('wallet_balances')
            .upsert(
                {
                    wallet_id: walletId,
                    token_symbol: tokenSymbol,
                    token_address: tokenAddress,
                    chain_id: chainId,
                    balance: formatUnits(newBal, token.decimals),
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'wallet_id,token_address,chain_id' },
            )
    }
}