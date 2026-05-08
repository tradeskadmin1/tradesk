
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits, erc20Abi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, bsc, arbitrum } from 'viem/chains'
import { loadPrivateKey } from './wallet'
import { getChainConfig, type SupportedChainId } from '@/config/chains'
import { TOKENS, NATIVE_TOKEN_ADDRESS } from '@/config/tokens'

const ZEROX_API_KEY = () => {
    const key = process.env.ZEROX_API_KEY
    if (!key) throw new Error('[dex] Missing ZEROX_API_KEY')
    return key
}

const ZEROX_BASE = 'https://api.0x.org'

const CHAIN_MAP = { 1: mainnet, 56: bsc, 42161: arbitrum } as const

// ── Types ──────────────────────────────────────────────────────────────────

export interface QuoteRequest {
    chainId: SupportedChainId
    sellToken: string   // symbol e.g. 'ETH'
    buyToken: string   // symbol e.g. 'USDC'
    sellAmount?: string   // human-readable e.g. '1.5' — provide sellAmount OR buyAmount
    buyAmount?: string
    takerAddress: `0x${string}`
    slippageBps?: number  // slippage in basis points, default 50 (0.5%)
}

export interface QuoteResponse {
    sellToken: string
    buyToken: string
    sellAmount: string   // in base units
    buyAmount: string   // in base units
    sellAmountHuman: string   // human-readable
    buyAmountHuman: string   // human-readable
    price: string   // buy per sell
    guaranteedPrice: string
    estimatedGas: string
    gasFeeUsd: string | null
    route: RouteStep[]
    transaction: {
        to: string
        data: string
        value: string
        gas: string
        gasPrice: string
    }
    permit2Signature?: string
}

export interface RouteStep {
    type: string
    from: string
    to: string
    proportion: string
}

export interface ExecuteTradeRequest {
    userId: string
    chainId: SupportedChainId
    sellToken: string
    buyToken: string
    sellAmount: string
    slippageBps?: number
}

export interface ExecuteTradeResult {
    txHash: string
    sellAmount: string
    buyAmount: string
    price: string
    gasUsed: string
    dexUsed: string
}

// ── 0x API helpers ─────────────────────────────────────────────────────────

function zeroxHeaders(chainId: SupportedChainId): HeadersInit {
    return {
        '0x-api-key': ZEROX_API_KEY(),
        '0x-chain-id': String(chainId),
        'Content-Type': 'application/json',
    }
}

function resolveTokenAddress(symbol: string, chainId: SupportedChainId): string {
    const token = TOKENS[symbol]
    if (!token) throw new Error(`[dex] Unknown token: ${symbol}`)

    const address = token.addresses[chainId]
    if (!address) throw new Error(`[dex] ${symbol} not available on chain ${chainId}`)

    return address
}



export async function getQuote(req: QuoteRequest): Promise<QuoteResponse> {
    const { chainId, sellToken, buyToken, takerAddress, slippageBps = 50 } = req

    const sellTokenAddress = resolveTokenAddress(sellToken, chainId)
    const buyTokenAddress = resolveTokenAddress(buyToken, chainId)

    const sellTokenInfo = TOKENS[sellToken]!
    const buyTokenInfo = TOKENS[buyToken]!

    let sellAmountRaw: string | undefined
    let buyAmountRaw: string | undefined

    if (req.sellAmount) {
        sellAmountRaw = parseUnits(req.sellAmount, sellTokenInfo.decimals).toString()
    } else if (req.buyAmount) {
        buyAmountRaw = parseUnits(req.buyAmount, buyTokenInfo.decimals).toString()
    } else {
        throw new Error('[dex] Provide either sellAmount or buyAmount')
    }

    const params = new URLSearchParams({
        chainId: String(chainId),
        sellToken: sellTokenAddress,
        buyToken: buyTokenAddress,
        taker: takerAddress,
        slippageBps: String(slippageBps),
        ...(sellAmountRaw ? { sellAmount: sellAmountRaw } : {}),
        ...(buyAmountRaw ? { buyAmount: buyAmountRaw } : {}),
    })

    const res = await fetch(`${ZEROX_BASE}/swap/permit2/quote?${params}`, {
        headers: zeroxHeaders(chainId),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`[dex] 0x quote failed (${res.status}): ${err}`)
    }

    const data: any = await res.json()

    const sellAmountFinal = data.sellAmount ?? sellAmountRaw ?? '0'
    const buyAmountFinal = data.buyAmount ?? buyAmountRaw ?? '0'

    return {
        sellToken,
        buyToken,
        sellAmount: sellAmountFinal,
        buyAmount: buyAmountFinal,
        sellAmountHuman: formatUnits(BigInt(sellAmountFinal), sellTokenInfo.decimals),
        buyAmountHuman: formatUnits(BigInt(buyAmountFinal), buyTokenInfo.decimals),
        price: data.price ?? '0',
        guaranteedPrice: data.guaranteedPrice ?? data.price ?? '0',
        estimatedGas: data.transaction?.gas ?? '200000',
        gasFeeUsd: null,
        route: parseRoute(data),
        transaction: data.transaction,
    }
}

function parseRoute(data: Record<string, unknown>): RouteStep[] {
    try {
        const fills = (data.route as any)?.fills ?? []
        return fills.map((f: any) => ({
            type: f.source ?? 'Unknown',
            from: f.from ?? '',
            to: f.to ?? '',
            proportion: f.proportionBps ?? '10000',
        }))
    } catch {
        return []
    }
}

// ── ERC-20 approval ────────────────────────────────────────────────────────

const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const

async function ensureERC20Approval(
    tokenAddress: `0x${string}`,
    ownerAddress: `0x${string}`,
    chainId: SupportedChainId,
    privateKey: string,
    amountNeeded: bigint,
): Promise<void> {
    const chain = CHAIN_MAP[chainId]
    const chainConfig = getChainConfig(chainId)
    const rpcUrl = process.env[chainConfig.rpcEnvKey] ?? chainConfig.publicRpcFallback
    const account = privateKeyToAccount(privateKey as `0x${string}`)

    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })

    const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [ownerAddress, PERMIT2_ADDRESS],
    }) as bigint

    if (allowance >= amountNeeded) return

    const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) })
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

    const approveTx = await walletClient.writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [PERMIT2_ADDRESS, MAX_UINT256],
    })

    await publicClient.waitForTransactionReceipt({ hash: approveTx, timeout: 60_000 })
}

// ── Trade execution ────────────────────────────────────────────────────────

export async function executeTrade(req: ExecuteTradeRequest): Promise<ExecuteTradeResult> {
    const { userId, chainId, sellToken, buyToken, sellAmount, slippageBps = 50 } = req

    const chain = CHAIN_MAP[chainId]
    const chainConfig = getChainConfig(chainId)
    const rpcUrl = process.env[chainConfig.rpcEnvKey] ?? chainConfig.publicRpcFallback
    let privateKey = await loadPrivateKey(userId, chainId)
    const account = privateKeyToAccount(privateKey as `0x${string}`)


    const quote = await getQuote({
        chainId,
        sellToken,
        buyToken,
        sellAmount,
        takerAddress: account.address,
        slippageBps,
    })

    const sellTokenAddress = resolveTokenAddress(sellToken, chainId)
    if (sellTokenAddress !== NATIVE_TOKEN_ADDRESS) {
        await ensureERC20Approval(
            sellTokenAddress as `0x${string}`,
            account.address,
            chainId,
            privateKey,
            BigInt(quote.sellAmount),
        )
    }

    const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) })
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })

    const txHash = await walletClient.sendTransaction({
        to: quote.transaction.to as `0x${string}`,
        data: quote.transaction.data as `0x${string}`,
        value: BigInt(quote.transaction.value ?? '0'),
        gas: BigInt(quote.transaction.gas),
        gasPrice: BigInt(quote.transaction.gasPrice),
    })
    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 120_000,
    })
    privateKey = '0'.repeat(privateKey.length)
    const dexUsed = quote.route[0]?.type ?? '0x'

    return {
        txHash,
        sellAmount: quote.sellAmountHuman,
        buyAmount: quote.buyAmountHuman,
        price: quote.price,
        gasUsed: receipt.gasUsed.toString(),
        dexUsed,
    }
}