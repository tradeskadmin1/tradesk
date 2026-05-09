import { createPublicClient, http, erc20Abi, parseUnits, formatUnits, encodeFunctionData } from 'viem'
import { getPublicClient } from './rpc'
import { createSupabaseAdminClient } from './supabase-server'
import { getPlatformWalletClient } from './platform-wallet'
import { debitBalance, creditBalance, getBalance } from './ledger'
import { TOKENS, NATIVE_TOKEN_ADDRESS } from '@/config/tokens'
import { getChainConfig, type SupportedChainId } from '@/config/chains'

const LEDGER_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000'

function toLedgerAddress(tokenAddress: string): string {
    return tokenAddress === NATIVE_TOKEN_ADDRESS ? LEDGER_NATIVE_ADDRESS : tokenAddress.toLowerCase()
}



export interface WithdrawalRequest {
    userId: string
    walletId: string
    withdrawalId: string
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
    const { userId, withdrawalId, chainId, tokenSymbol, amount, toAddress } = req
    const supabase = createSupabaseAdminClient() as any
    const token = TOKENS[tokenSymbol]

    if (!token) throw new Error(`[transfer] Unknown token: ${tokenSymbol}`)

    const tokenAddress = token.addresses[chainId]
    if (!tokenAddress) throw new Error(`[transfer] ${tokenSymbol} not available on chain ${chainId}`)

    const ledgerAddr = toLedgerAddress(tokenAddress)

    const ledgerBalance = await getBalance({ userId, chainId, tokenAddress: ledgerAddr })
    if (parseFloat(ledgerBalance) < parseFloat(amount)) {
        throw new Error(`[transfer] Insufficient ledger balance. Have ${ledgerBalance}, need ${amount}`)
    }

    await debitBalance({
        userId,
        chainId,
        tokenSymbol,
        tokenAddress: ledgerAddr,
        amount,
        type: 'withdrawal',
        refId: withdrawalId,
        note: `Withdrawal to ${toAddress}`,
    })

    const {
        walletClient: hotWallet,
        publicClient,
    } = await getPlatformWalletClient(chainId)

    const amountRaw = parseUnits(amount, token.decimals)
    let txHash: `0x${string}`

    try {
        if (tokenAddress === NATIVE_TOKEN_ADDRESS) {
            txHash = await hotWallet.sendTransaction({
                to: toAddress,
                value: amountRaw,
            })
        } else {
            txHash = await hotWallet.sendTransaction({
                to: tokenAddress as `0x${string}`,
                data: encodeFunctionData({
                    abi: erc20Abi,
                    functionName: 'transfer',
                    args: [toAddress, amountRaw],
                }),
            })
        }
    } catch (broadcastErr) {
        await creditBalance({
            userId,
            chainId,
            tokenSymbol,
            tokenAddress: ledgerAddr,
            amount,
            type: 'adjustment',
            refId: withdrawalId,
            note: `Withdrawal broadcast failed — reversal`,
        }).catch((e) => console.error('[transfer] Re-credit after failed broadcast:', e))

        await supabase
            .from('withdrawals')
            .update({ status: 'failed' })
            .eq('id', withdrawalId)

        throw broadcastErr
    }

    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 120_000,
    })

    const gasPrice = receipt.effectiveGasPrice ?? BigInt(0)
    const feeWei = receipt.gasUsed * gasPrice
    const fee = formatUnits(feeWei, 18)
    const gasUsed = receipt.gasUsed.toString()

    await supabase
        .from('withdrawals')
        .update({
            tx_hash: txHash,
            fee,
            status: 'completed',
            completed_at: new Date().toISOString(),
        })
        .eq('id', withdrawalId)

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