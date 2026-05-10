import { GmxSdk } from '@gmx-io/sdk'
import { getPlatformWalletClient } from './platform-wallet'
import { CHAIN_CONFIG } from '@/config/chains'

export const GMX_CHAIN_ID = 42161
export const GMX_ORACLE_URL = 'https://arbitrum-api.gmxinfra.io'
export const GMX_SUBSQUID_URL = 'https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql'


export const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
export const USDC_DECIMALS = 6


export const FUTURES_FEE_BPS = 10


export const FUTURES_MARKETS = [
    { symbol: 'BTC', pair: 'BTC/USD', coingeckoId: 'bitcoin' },
    { symbol: 'ETH', pair: 'ETH/USD', coingeckoId: 'ethereum' },
    { symbol: 'SOL', pair: 'SOL/USD', coingeckoId: 'solana' },
    { symbol: 'ARB', pair: 'ARB/USD', coingeckoId: 'arbitrum' },
    { symbol: 'LINK', pair: 'LINK/USD', coingeckoId: 'chainlink' },
] as const

export type FuturesSymbol = typeof FUTURES_MARKETS[number]['symbol']


const LEVERAGE_PRECISION = BigInt(10) ** BigInt(30)
export function toLeverageBigInt(multiplier: number): bigint {
    return BigInt(Math.round(multiplier)) * LEVERAGE_PRECISION
}

export async function getGmxSdk(withWallet = false): Promise<GmxSdk> {
    const cfg = CHAIN_CONFIG[GMX_CHAIN_ID]
    const rpcUrl = process.env[cfg.rpcEnvKey] ?? cfg.publicRpcFallback

    const base = {
        chainId: GMX_CHAIN_ID as 42161,
        rpcUrl,
        oracleUrl: GMX_ORACLE_URL,
        subsquidUrl: GMX_SUBSQUID_URL,
    }

    if (withWallet) {
        const { walletClient, publicClient, account } =
            await getPlatformWalletClient(GMX_CHAIN_ID)
        return new GmxSdk({
            ...base,
            walletClient,
            publicClient,
            account: account.address,
        })
    }

    return new GmxSdk(base)
}
