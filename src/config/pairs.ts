import type { SupportedChainId } from './chains'

export interface TradingPair {
  id: string
  base: string
  quote: string
  label: string
  supportedChains: SupportedChainId[]
  minTradeSize: number
  defaultSlippage: number
  active: boolean
}


export const TRADING_PAIRS: TradingPair[] = [
  // ── ETH pairs ──────────────────────────────────────────────────────────────
  {
    id: 'ETH_USDC',
    base: 'ETH', quote: 'USDC', label: 'ETH / USDC',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.005, active: true,
  },
  {
    id: 'ETH_USDT',
    base: 'ETH', quote: 'USDT', label: 'ETH / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.005, active: true,
  },

  // ── BTC pairs ──────────────────────────────────────────────────────────────
  {
    id: 'WBTC_USDC',
    base: 'WBTC', quote: 'USDC', label: 'WBTC / USDC',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.005, active: true,
  },
  {
    id: 'WBTC_USDT',
    base: 'WBTC', quote: 'USDT', label: 'WBTC / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.005, active: true,
  },

  // ── BNB pairs ──────────────────────────────────────────────────────────────
  {
    id: 'BNB_USDT',
    base: 'BNB', quote: 'USDT', label: 'BNB / USDT',
    supportedChains: [56],
    minTradeSize: 1, defaultSlippage: 0.005, active: true,
  },
  {
    id: 'BNB_USDC',
    base: 'BNB', quote: 'USDC', label: 'BNB / USDC',
    supportedChains: [56],
    minTradeSize: 1, defaultSlippage: 0.005, active: true,
  },

  // ── DeFi blue chips ────────────────────────────────────────────────────────
  {
    id: 'ARB_USDC',
    base: 'ARB', quote: 'USDC', label: 'ARB / USDC',
    supportedChains: [42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'LINK_USDT',
    base: 'LINK', quote: 'USDT', label: 'LINK / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.005, active: true,
  },
  {
    id: 'LINK_USDC',
    base: 'LINK', quote: 'USDC', label: 'LINK / USDC',
    supportedChains: [1, 56],
    minTradeSize: 1, defaultSlippage: 0.005, active: true,
  },
  {
    id: 'UNI_USDT',
    base: 'UNI', quote: 'USDT', label: 'UNI / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.005, active: true,
  },
  {
    id: 'AAVE_USDT',
    base: 'AAVE', quote: 'USDT', label: 'AAVE / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'AAVE_USDC',
    base: 'AAVE', quote: 'USDC', label: 'AAVE / USDC',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },

  // ── MATIC ──────────────────────────────────────────────────────────────────
  {
    id: 'MATIC_USDT',
    base: 'MATIC', quote: 'USDT', label: 'MATIC / USDT',
    supportedChains: [1, 56],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'MATIC_USDC',
    base: 'MATIC', quote: 'USDC', label: 'MATIC / USDC',
    supportedChains: [1],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },

  // ── Meme coins ─────────────────────────────────────────────────────────────
  {
    id: 'PEPE_USDC',
    base: 'PEPE', quote: 'USDC', label: 'PEPE / USDC',
    supportedChains: [1],
    minTradeSize: 1, defaultSlippage: 0.02, active: true,
  },
  {
    id: 'SHIB_USDT',
    base: 'SHIB', quote: 'USDT', label: 'SHIB / USDT',
    supportedChains: [1, 56],
    minTradeSize: 1, defaultSlippage: 0.02, active: true,
  },

  // ── Arbitrum-native ────────────────────────────────────────────────────────
  {
    id: 'GMX_USDC',
    base: 'GMX', quote: 'USDC', label: 'GMX / USDC',
    supportedChains: [42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'GMX_USDT',
    base: 'GMX', quote: 'USDT', label: 'GMX / USDT',
    supportedChains: [42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },

  // ── BSC-native ─────────────────────────────────────────────────────────────
  {
    id: 'CAKE_USDT',
    base: 'CAKE', quote: 'USDT', label: 'CAKE / USDT',
    supportedChains: [56],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'CAKE_USDC',
    base: 'CAKE', quote: 'USDC', label: 'CAKE / USDC',
    supportedChains: [56],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },

  // ── Curve / Lido / Maker / SNX ─────────────────────────────────────────────
  {
    id: 'CRV_USDT',
    base: 'CRV', quote: 'USDT', label: 'CRV / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'LDO_USDT',
    base: 'LDO', quote: 'USDT', label: 'LDO / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'MKR_USDC',
    base: 'MKR', quote: 'USDC', label: 'MKR / USDC',
    supportedChains: [1],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'SNX_USDT',
    base: 'SNX', quote: 'USDT', label: 'SNX / USDT',
    supportedChains: [1],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },

  // ── 1INCH / GRT ────────────────────────────────────────────────────────────
  {
    id: '1INCH_USDT',
    base: 'ONEINCH', quote: 'USDT', label: '1INCH / USDT',
    supportedChains: [1, 56],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'GRT_USDT',
    base: 'GRT', quote: 'USDT', label: 'GRT / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },

  // ── Bridge / cross-chain tokens (top arb targets) ──────────────────────────
  {
    id: 'STG_USDC',
    base: 'STG', quote: 'USDC', label: 'STG / USDC',
    supportedChains: [1, 56, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'STG_USDT',
    base: 'STG', quote: 'USDT', label: 'STG / USDT',
    supportedChains: [1, 56, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'WOO_USDT',
    base: 'WOO', quote: 'USDT', label: 'WOO / USDT',
    supportedChains: [1, 56, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'WOO_USDC',
    base: 'WOO', quote: 'USDC', label: 'WOO / USDC',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },

  // ── Yield / DeFi infrastructure ────────────────────────────────────────────
  {
    id: 'PENDLE_USDC',
    base: 'PENDLE', quote: 'USDC', label: 'PENDLE / USDC',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'PENDLE_USDT',
    base: 'PENDLE', quote: 'USDT', label: 'PENDLE / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'CVX_USDT',
    base: 'CVX', quote: 'USDT', label: 'CVX / USDT',
    supportedChains: [1],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'YFI_USDC',
    base: 'YFI', quote: 'USDC', label: 'YFI / USDC',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'FXS_USDC',
    base: 'FXS', quote: 'USDC', label: 'FXS / USDC',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },

  // ── DEX governance tokens ──────────────────────────────────────────────────
  {
    id: 'SUSHI_USDT',
    base: 'SUSHI', quote: 'USDT', label: 'SUSHI / USDT',
    supportedChains: [1, 56, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'SUSHI_USDC',
    base: 'SUSHI', quote: 'USDC', label: 'SUSHI / USDC',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'BAL_USDC',
    base: 'BAL', quote: 'USDC', label: 'BAL / USDC',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'BAL_USDT',
    base: 'BAL', quote: 'USDT', label: 'BAL / USDT',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'COMP_USDC',
    base: 'COMP', quote: 'USDC', label: 'COMP / USDC',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'JOE_USDC',
    base: 'JOE', quote: 'USDC', label: 'JOE / USDC',
    supportedChains: [42161],
    minTradeSize: 1, defaultSlippage: 0.015, active: true,
  },

  // ── Arbitrum-native ────────────────────────────────────────────────────────
  {
    id: 'RDNT_USDC',
    base: 'RDNT', quote: 'USDC', label: 'RDNT / USDC',
    supportedChains: [56, 42161],
    minTradeSize: 1, defaultSlippage: 0.015, active: true,
  },
  {
    id: 'RDNT_USDT',
    base: 'RDNT', quote: 'USDT', label: 'RDNT / USDT',
    supportedChains: [56, 42161],
    minTradeSize: 1, defaultSlippage: 0.015, active: true,
  },
  {
    id: 'MAGIC_USDC',
    base: 'MAGIC', quote: 'USDC', label: 'MAGIC / USDC',
    supportedChains: [1, 42161],
    minTradeSize: 1, defaultSlippage: 0.015, active: true,
  },

  // ── BSC high-volume wrapped assets ────────────────────────────────────────
  {
    id: 'XRP_USDT',
    base: 'XRP', quote: 'USDT', label: 'XRP / USDT',
    supportedChains: [56],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'ADA_USDT',
    base: 'ADA', quote: 'USDT', label: 'ADA / USDT',
    supportedChains: [56],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'DOT_USDT',
    base: 'DOT', quote: 'USDT', label: 'DOT / USDT',
    supportedChains: [56],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
  {
    id: 'DOGE_USDT',
    base: 'DOGE', quote: 'USDT', label: 'DOGE / USDT',
    supportedChains: [56],
    minTradeSize: 1, defaultSlippage: 0.01, active: true,
  },
]

export const ACTIVE_PAIRS = TRADING_PAIRS.filter((p) => p.active)

export function getPair(id: string): TradingPair | undefined {
  return TRADING_PAIRS.find((p) => p.id === id)
}

export function getPairsForChain(chainId: SupportedChainId): TradingPair[] {
  return ACTIVE_PAIRS.filter((p) => p.supportedChains.includes(chainId))
}
