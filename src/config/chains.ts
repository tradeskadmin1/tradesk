import { mainnet, bsc, arbitrum } from 'viem/chains'
import type { Chain } from 'viem'

export type SupportedChainId = 1 | 56 | 42161

export interface ChainConfig {
    chain: Chain
    id: SupportedChainId
    name: string
    shortName: string
    nativeCurrency: { symbol: string; decimals: number }
    rpcEnvKey: 'RPC_ETH_MAINNET' | 'RPC_BSC' | 'RPC_ARBITRUM'
    publicRpcFallback: string
    explorerUrl: string
    explorerApiUrl: string
    explorerApiKeyEnv: 'ETHERSCAN_API_KEY' | 'BSCSCAN_API_KEY' | 'ARBISCAN_API_KEY'
    oneInchChainId: number
    wrappedNative: `0x${string}`
    blockTime: number
}

export const CHAIN_CONFIG: Record<SupportedChainId, ChainConfig> = {
    1: {
        chain: mainnet,
        id: 1,
        name: 'Ethereum',
        shortName: 'ETH',
        nativeCurrency: { symbol: 'ETH', decimals: 18 },
        rpcEnvKey: 'RPC_ETH_MAINNET',
        publicRpcFallback: 'https://eth.llamarpc.com',
        explorerUrl: 'https://etherscan.io',
        explorerApiUrl: 'https://api.etherscan.io/api',
        explorerApiKeyEnv: 'ETHERSCAN_API_KEY',
        oneInchChainId: 1,
        wrappedNative: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        blockTime: 12,
    },
    56: {
        chain: bsc,
        id: 56,
        name: 'BNB Chain',
        shortName: 'BSC',
        nativeCurrency: { symbol: 'BNB', decimals: 18 },
        rpcEnvKey: 'RPC_BSC',
        publicRpcFallback: 'https://bsc-dataseed.binance.org',
        explorerUrl: 'https://bscscan.com',
        explorerApiUrl: 'https://api.bscscan.com/api',
        explorerApiKeyEnv: 'BSCSCAN_API_KEY',
        oneInchChainId: 56,
        wrappedNative: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        blockTime: 3,
    },
    42161: {
        chain: arbitrum,
        id: 42161,
        name: 'Arbitrum One',
        shortName: 'ARB',
        nativeCurrency: { symbol: 'ETH', decimals: 18 },
        rpcEnvKey: 'RPC_ARBITRUM',
        publicRpcFallback: 'https://arb1.arbitrum.io/rpc',
        explorerUrl: 'https://arbiscan.io',
        explorerApiUrl: 'https://api.arbiscan.io/api',
        explorerApiKeyEnv: 'ARBISCAN_API_KEY',
        oneInchChainId: 42161,
        wrappedNative: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        blockTime: 1,
    },
}

export const SUPPORTED_CHAIN_IDS: SupportedChainId[] = [1, 56, 42161]

export const SUPPORTED_CHAINS = SUPPORTED_CHAIN_IDS.map((id) => CHAIN_CONFIG[id].chain)

export function getChainConfig(chainId: number): ChainConfig {
    const config = CHAIN_CONFIG[chainId as SupportedChainId]
    if (!config) throw new Error(`Unsupported chain: ${chainId}`)
    return config
}

export function isSupportedChain(chainId: number): chainId is SupportedChainId {
    return chainId in CHAIN_CONFIG
}