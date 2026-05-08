import type { SupportedChainId } from './chains'

export interface TradingPair {
  id: string               // e.g. 'ETH_USDC'
  base: string             // base token symbol
  quote: string            // quote token symbol
  label: string            // display label e.g. 'ETH / USDC'
  supportedChains: SupportedChainId[]
  // Minimum trade size in quote token units (human-readable)
  minTradeSize: number
  // Default slippage tolerance (0.005 = 0.5%)
  defaultSlippage: number
  // Whether this pair is active — set false to delist without deleting config
  active: boolean
}

/**
 * Top 10 trading pairs for v1.
 * To add a new pair: append an entry here. No other code changes required.
 */
export const TRADING_PAIRS: TradingPair[] = [
  {
    id: 'ETH_USDC',
    base: 'ETH',
    quote: 'USDC',
    label: 'ETH / USDC',
    supportedChains: [1, 42161],
    minTradeSize: 1,
    defaultSlippage: 0.005,
    active: true,
  },
  {
    id: 'ETH_USDT',
    base: 'ETH',
    quote: 'USDT',
    label: 'ETH / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1,
    defaultSlippage: 0.005,
    active: true,
  },
  {
    id: 'WBTC_USDC',
    base: 'WBTC',
    quote: 'USDC',
    label: 'WBTC / USDC',
    supportedChains: [1, 42161],
    minTradeSize: 1,
    defaultSlippage: 0.005,
    active: true,
  },
  {
    id: 'WBTC_USDT',
    base: 'WBTC',
    quote: 'USDT',
    label: 'WBTC / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1,
    defaultSlippage: 0.005,
    active: true,
  },
  {
    id: 'BNB_USDT',
    base: 'BNB',
    quote: 'USDT',
    label: 'BNB / USDT',
    supportedChains: [56],
    minTradeSize: 1,
    defaultSlippage: 0.005,
    active: true,
  },
  {
    id: 'BNB_USDC',
    base: 'BNB',
    quote: 'USDC',
    label: 'BNB / USDC',
    supportedChains: [56],
    minTradeSize: 1,
    defaultSlippage: 0.005,
    active: true,
  },
  {
    id: 'ARB_USDC',
    base: 'ARB',
    quote: 'USDC',
    label: 'ARB / USDC',
    supportedChains: [42161],
    minTradeSize: 1,
    defaultSlippage: 0.01,
    active: true,
  },
  {
    id: 'LINK_USDT',
    base: 'LINK',
    quote: 'USDT',
    label: 'LINK / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1,
    defaultSlippage: 0.005,
    active: true,
  },
  {
    id: 'UNI_USDT',
    base: 'UNI',
    quote: 'USDT',
    label: 'UNI / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1,
    defaultSlippage: 0.005,
    active: true,
  },
  {
    id: 'AAVE_USDT',
    base: 'AAVE',
    quote: 'USDT',
    label: 'AAVE / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1,
    defaultSlippage: 0.01,
    active: true,
  },
]

export const ACTIVE_PAIRS = TRADING_PAIRS.filter((p) => p.active)

export function getPair(id: string): TradingPair | undefined {
  return TRADING_PAIRS.find((p) => p.id === id)
}

export function getPairsForChain(chainId: SupportedChainId): TradingPair[] {
  return ACTIVE_PAIRS.filter((p) => p.supportedChains.includes(chainId))
}