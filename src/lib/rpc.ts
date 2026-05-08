import { createPublicClient, http, fallback } from 'viem'
import { mainnet, bsc, arbitrum } from 'viem/chains'
import type { SupportedChainId } from '@/config/chains'

function alchemyUrl(network: string): string | null {
    const key = process.env.ALCHEMY_API_KEY
    if (!key) return null
    return `https://${network}.g.alchemy.com/v2/${key}`
}

export const publicClients = {
    1: createPublicClient({
        chain: mainnet,
        transport: fallback([
            http(alchemyUrl('eth-mainnet') ?? ''),
            http(process.env.RPC_ETH_MAINNET ?? ''),
            http('https://eth.llamarpc.com'),
        ]),
    }),

    56: createPublicClient({
        chain: bsc,
        transport: fallback([
            http(process.env.RPC_BSC ?? ''),
            http('https://bsc-dataseed1.binance.org'),
            http('https://bsc-dataseed2.binance.org'),
        ]),
    }),

    42161: createPublicClient({
        chain: arbitrum,
        transport: fallback([
            http(alchemyUrl('arb-mainnet') ?? ''),
            http(process.env.RPC_ARBITRUM ?? ''),
            http('https://arb1.arbitrum.io/rpc'),
        ]),
    }),
} as const

export function getPublicClient(chainId: SupportedChainId) {
    const client = publicClients[chainId]
    if (!client) throw new Error(`[rpc] No public client for chain ${chainId}`)
    return client
}