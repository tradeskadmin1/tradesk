import { createWalletClient, createPublicClient, http, parseEther, formatUnits, parseUnits, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { decryptPrivateKey } from './kms'
import { getPlatformWalletClient } from './platform-wallet'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from './supabase-server'
import { maybeDrainToCold } from './cold-storage'
import { CHAIN_CONFIG, type SupportedChainId } from '@/config/chains'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()

const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const

const DUST_THRESHOLD_ETH = parseEther('0.0001')

async function getUserWalletClient(userId: string, chainId: SupportedChainId) {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
        .from('custodial_wallets')
        .select('address, encrypted_private_key, encrypted_dek')
        .eq('user_id', userId)
        .eq('chain_id', chainId)
        .single()

    if (error || !data) throw new Error(`[sweep] Wallet not found for user ${userId} chain ${chainId}`)

    const privateKey = await decryptPrivateKey(data.encrypted_private_key, data.encrypted_dek)
    const cfg = CHAIN_CONFIG[chainId]
    const rpcUrl = process.env[cfg.rpcEnvKey] ?? cfg.publicRpcFallback
    const account = privateKeyToAccount(privateKey as `0x${string}`)

    const walletClient = createWalletClient({ account, chain: cfg.chain, transport: http(rpcUrl) })
    const publicClient = createPublicClient({ chain: cfg.chain, transport: http(rpcUrl) })

    return { walletClient, publicClient, account, address: data.address as Address }
}


export async function sweepNative(params: {
    userId: string
    chainId: SupportedChainId
    txHash: string
}): Promise<string | null> {
    const { userId, chainId, txHash } = params

    try {
        const { walletClient, publicClient, address: userAddress } =
            await getUserWalletClient(userId, chainId)

        const { address: hotAddress } = await getPlatformWalletClient(chainId)
        const balance = await publicClient.getBalance({ address: userAddress })

        if (balance <= DUST_THRESHOLD_ETH) {
            console.log(`[sweep] Native balance too low to sweep on chain ${chainId} (${balance} wei)`)
            return null
        }

        const gasPrice = await publicClient.getGasPrice()
        const gasLimit = BigInt(21_000)
        const gasCost = gasPrice * gasLimit
        const sweepAmt = balance - gasCost

        if (sweepAmt <= BigInt(0)) {
            console.log(`[sweep] After gas, nothing to sweep (balance=${balance} gasCost=${gasCost})`)
            return null
        }

        const sweepTxHash = await walletClient.sendTransaction({
            to: hotAddress as Address,
            value: sweepAmt,
            gas: gasLimit,
            gasPrice,
        })

        console.log(`[sweep] Native sweep chain ${chainId}: ${userAddress} → ${hotAddress}  ${formatUnits(sweepAmt, 18)} | sweep tx: ${sweepTxHash}`)

        maybeDrainToCold({
            chainId,
            tokenAddress: '0x0000000000000000000000000000000000000000',
            tokenSymbol: chainId === 56 ? 'BNB' : 'ETH',
            decimals: 18,
        }).catch((err) => console.error('[sweep] cold drain failed:', err))

        return sweepTxHash
    } catch (err) {
        console.error(`[sweep] Native sweep failed (deposit ${txHash}):`, err)
        return null
    }
}

export async function sweepERC20(params: {
    userId: string
    chainId: SupportedChainId
    tokenAddress: string
    tokenSymbol: string
    decimals: number
    txHash: string
}): Promise<string | null> {
    const { userId, chainId, tokenAddress, txHash } = params

    try {
        const {
            walletClient: userWallet,
            publicClient,
            address: userAddress,
        } = await getUserWalletClient(userId, chainId)

        const {
            walletClient: hotWallet,
            publicClient: _hotPub,
            address: hotAddress,
        } = await getPlatformWalletClient(chainId)

        const tokenBalance = await publicClient.readContract({
            address: tokenAddress as Address,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress],
        }) as bigint

        if (tokenBalance === BigInt(0)) {
            console.log(`[sweep] Zero token balance for ${tokenAddress} on chain ${chainId}`)
            return null
        }

        const gasPrice = await publicClient.getGasPrice()
        const gasLimit = await publicClient.estimateGas({
            account: userAddress,
            to: tokenAddress as Address,
            data: encodeFunctionData(hotAddress as Address, tokenBalance),
        }).catch(() => BigInt(80_000))

        const gasCost = gasPrice * gasLimit

        const nativeBalance = await publicClient.getBalance({ address: userAddress })

        if (nativeBalance < gasCost) {
            const fundAmount = gasCost - nativeBalance + parseEther('0.0001') // small buffer
            console.log(`[sweep] Pre-funding ${userAddress} with ${formatUnits(fundAmount, 18)} native for gas`)

            const fundTxHash = await hotWallet.sendTransaction({
                to: userAddress,
                value: fundAmount,
            })

            await publicClient.waitForTransactionReceipt({ hash: fundTxHash })
        }

        const sweepTxHash = await userWallet.writeContract({
            address: tokenAddress as Address,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [hotAddress as Address, tokenBalance],
            gas: gasLimit,
            gasPrice,
        })

        console.log(`[sweep] ERC-20 sweep chain ${chainId}: ${params.tokenSymbol} ${userAddress} → ${hotAddress} | sweep tx: ${sweepTxHash}`)

        maybeDrainToCold({
            chainId,
            tokenAddress: tokenAddress.toLowerCase(),
            tokenSymbol: params.tokenSymbol,
            decimals: params.decimals,
        }).catch((err) => console.error('[sweep] cold drain failed:', err))

        return sweepTxHash
    } catch (err) {
        console.error(`[sweep] ERC-20 sweep failed (deposit ${txHash}):`, err)
        return null
    }
}


function encodeFunctionData(to: Address, amount: bigint): `0x${string}` {
    const selector = 'a9059cbb'
    const paddedTo = to.slice(2).toLowerCase().padStart(64, '0')
    const paddedAmt = amount.toString(16).padStart(64, '0')
    return `0x${selector}${paddedTo}${paddedAmt}`
}
