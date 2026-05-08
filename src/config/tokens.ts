import type { SupportedChainId } from './chains'

export interface TokenConfig {
    symbol: string
    name: string
    decimals: number
    addresses: Partial<Record<SupportedChainId, `0x${string}`>>
    coingeckoId: string
    logoUrl?: string
}


export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const

export const TOKENS: Record<string, TokenConfig> = {
    ETH: {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        addresses: {
            1: NATIVE_TOKEN_ADDRESS,
            42161: NATIVE_TOKEN_ADDRESS,
        },
        coingeckoId: 'ethereum',
    },
    WETH: {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        addresses: {
            1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            56: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
            42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        },
        coingeckoId: 'weth',
    },
    WBTC: {
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        decimals: 8,
        addresses: {
            1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
            56: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
            42161: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
        },
        coingeckoId: 'wrapped-bitcoin',
    },
    BNB: {
        symbol: 'BNB',
        name: 'BNB',
        decimals: 18,
        addresses: {
            56: NATIVE_TOKEN_ADDRESS,
        },
        coingeckoId: 'binancecoin',
    },
    WBNB: {
        symbol: 'WBNB',
        name: 'Wrapped BNB',
        decimals: 18,
        addresses: {
            56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        },
        coingeckoId: 'wbnb',
    },
    USDC: {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        addresses: {
            1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
            42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        },
        coingeckoId: 'usd-coin',
    },
    USDT: {
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        addresses: {
            1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            56: '0x55d398326f99059fF775485246999027B3197955',
            42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        },
        coingeckoId: 'tether',
    },
    ARB: {
        symbol: 'ARB',
        name: 'Arbitrum',
        decimals: 18,
        addresses: {
            42161: '0x912CE59144191C1204E64559FE8253a0e49E6548',
        },
        coingeckoId: 'arbitrum',
    },
    LINK: {
        symbol: 'LINK',
        name: 'Chainlink',
        decimals: 18,
        addresses: {
            1: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
            56: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
            42161: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
        },
        coingeckoId: 'chainlink',
    },
    UNI: {
        symbol: 'UNI',
        name: 'Uniswap',
        decimals: 18,
        addresses: {
            1: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
            42161: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
        },
        coingeckoId: 'uniswap',
    },
    AAVE: {
        symbol: 'AAVE',
        name: 'Aave',
        decimals: 18,
        addresses: {
            1: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
            42161: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
        },
        coingeckoId: 'aave',
    },
}

export function getTokenAddress(
    symbol: string,
    chainId: SupportedChainId,
): `0x${string}` | undefined {
    return TOKENS[symbol]?.addresses[chainId]
}

export function getTokenByAddress(
    address: string,
    chainId: SupportedChainId,
): TokenConfig | undefined {
    const lower = address.toLowerCase()
    return Object.values(TOKENS).find(
        (t) => t.addresses[chainId]?.toLowerCase() === lower,
    )
}