

import { ACTIVE_PAIRS, type TradingPair } from '@/config/pairs'
import { TOKENS, NATIVE_TOKEN_ADDRESS } from '@/config/tokens'
import {
    SUPPORTED_CHAIN_IDS,
    getChainConfig,
    type SupportedChainId,
} from '@/config/chains'
import { getAllPrices } from './price'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from './supabase-server'
import { getPublicClient } from './rpc'


const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()



const DEXSCREENER_BASE = 'https://api.dexscreener.com'


const MIN_NET_PROFIT_USD        = 0.50    // minimum net profit to record
const OPPORTUNITY_TTL_MS        = 2 * 60 * 1000
const GAS_UNITS_PER_SWAP        = 280_000
const NOTIONAL_TRADE_USD        = 1_000   // hypothetical trade size for net profit estimate
const MIN_POOL_LIQUIDITY_USD    = 50_000  // only use pools with real depth
const MAX_SPREAD_SAME_CHAIN     = 0.05    // 5%  — same-chain spread cap
const MAX_SPREAD_CROSS_CHAIN    = 0.10    // 10% — cross-chain spread cap (bridge lag allows wider)
const MAX_PRICE_RATIO           = 2.0     // safety: ignore if prices differ >2x (bad data)

const DEXSCREENER_CHAIN: Record<SupportedChainId, string> = {
    1: 'ethereum',
    56: 'bsc',
    42161: 'arbitrum',
}


interface DexScreenerPair {
    chainId: string
    dexId: string
    pairAddress: string
    baseToken: { address: string; symbol: string }
    quoteToken: { address: string; symbol: string }
    priceUsd?: string
    priceNative?: string   // price of base token denominated in the quote token
    liquidity?: { usd: number }
    volume: { h24: number }
}

interface NormalisedPrice {
    dex: string
    chainId: SupportedChainId
    priceUsd: number
    liquidityUsd: number
    volume24h: number
    pairAddress: string
}

export interface ArbitrageOpportunity {
    pair: string
    buyDex: string
    sellDex: string
    buyChainId: SupportedChainId
    sellChainId: SupportedChainId
    buyPrice: number
    sellPrice: number
    profitPct: number
    estimatedProfitUsd: number
    estimatedGasUsd: number
    netProfitUsd: number
    riskScore: number
    routePath: object
}


function resolvePoolAddress(symbol: string, chainId: SupportedChainId): string | null {
    const token = TOKENS[symbol]
    if (!token) return null

    const addr = token.addresses[chainId]
    if (!addr) return null

    if (addr === NATIVE_TOKEN_ADDRESS) {
        return getChainConfig(chainId).wrappedNative
    }

    return addr
}


async function fetchDexPrices(
    pair: TradingPair,
    chainId: SupportedChainId,
): Promise<NormalisedPrice[]> {
    const baseAddr = resolvePoolAddress(pair.base, chainId)
    const quoteAddr = resolvePoolAddress(pair.quote, chainId)
    if (!baseAddr || !quoteAddr) return []

    const chainName = DEXSCREENER_CHAIN[chainId]
    const url = `${DEXSCREENER_BASE}/tokens/v1/${chainName}/${baseAddr.toLowerCase()},${quoteAddr.toLowerCase()}`

    let data: DexScreenerPair[]
    try {
        const res = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(8_000),
        })
        if (!res.ok) return []
        data = (await res.json()) as DexScreenerPair[]
    } catch {
        return []
    }

    if (!Array.isArray(data)) return []

    const results: NormalisedPrice[] = []
    const baseLower  = baseAddr.toLowerCase()
    const quoteLower = quoteAddr.toLowerCase()

    for (const p of data) {
        if ((p.liquidity?.usd ?? 0) < MIN_POOL_LIQUIDITY_USD) continue

        const pBase  = p.baseToken.address.toLowerCase()
        const pQuote = p.quoteToken.address.toLowerCase()

        let priceUsd: number

        if (pBase === baseLower && pQuote === quoteLower) {
            // Normal ordering: pool base = our desired base (e.g. WETH/USDC)
            // priceUsd is already the USD price of our base token
            if (!p.priceUsd) continue
            priceUsd = parseFloat(p.priceUsd)
        } else if (pBase === quoteLower && pQuote === baseLower) {
            // Inverted ordering: pool base = our quote token (e.g. USDC/WETH)
            // priceUsd = USD price of quote token (≈ $1 for stablecoins)
            // priceNative = price of quote token in terms of base token (e.g. 0.000333 WETH per USDC)
            // ∴ base token USD price = priceUsd / priceNative
            //   = $1.00 / 0.000333 = $3,000 per WETH  ✓
            if (!p.priceUsd || !p.priceNative) continue
            const pNative = parseFloat(p.priceNative)
            if (pNative <= 0) continue
            priceUsd = parseFloat(p.priceUsd) / pNative
        } else {
            continue // unrelated pool
        }

        if (!isFinite(priceUsd) || priceUsd <= 0) continue

        results.push({
            dex: p.dexId,
            chainId,
            priceUsd,
            liquidityUsd: p.liquidity?.usd ?? 0,
            volume24h: p.volume?.h24 ?? 0,
            pairAddress: p.pairAddress,
        })
    }

    return results
}


async function estimateSwapGasUsd(
    chainId: SupportedChainId,
    nativePriceUsd: number,
): Promise<number> {
    const fallbacks: Record<SupportedChainId, number> = { 1: 14, 56: 0.45, 42161: 0.70 }

    try {
        const gasPrice = await getPublicClient(chainId).getGasPrice()
        const gasCostWei = gasPrice * BigInt(GAS_UNITS_PER_SWAP)
        const gasCostNative = Number(gasCostWei) / 1e18
        const result = gasCostNative * nativePriceUsd
        return result > 0 && result < 1_000 ? result : fallbacks[chainId]
    } catch {
        return fallbacks[chainId]
    }
}


function calculateRiskScore(params: {
    spreadPct: number
    minLiquidityUsd: number
    sameChain: boolean
    netProfitUsd: number
}): number {
    let score = 50

    if (params.spreadPct > 0.05) score -= 20
    else if (params.spreadPct > 0.02) score -= 10
    else if (params.spreadPct < 0.005) score += 20

    if (params.minLiquidityUsd > 2_000_000) score -= 15
    else if (params.minLiquidityUsd > 500_000) score -= 7
    else if (params.minLiquidityUsd < 30_000) score += 20
    else if (params.minLiquidityUsd < 10_000) score += 35

    if (!params.sameChain) score += 25

    if (params.netProfitUsd > 200) score -= 10
    else if (params.netProfitUsd < 15) score += 12

    return Math.max(0, Math.min(100, score))
}


export interface PairDiagnostic {
    pair: string
    poolsFetched: number
    filtered: { spread_too_wide: number; ratio_bad: number; profit_too_low: number; no_pools: number }
    opportunitiesFound: number
}

async function scanPair(
    pair: TradingPair,
    gasCostByChain: Record<SupportedChainId, number>,
): Promise<{ opportunities: ArbitrageOpportunity[]; diagnostic: PairDiagnostic }> {
    const settled = await Promise.allSettled(
        pair.supportedChains.map((chainId) => fetchDexPrices(pair, chainId)),
    )

    const allPrices: NormalisedPrice[] = []
    for (const r of settled) {
        if (r.status === 'fulfilled') allPrices.push(...r.value)
    }

    const diagnostic: PairDiagnostic = {
        pair: pair.id,
        poolsFetched: allPrices.length,
        filtered: { spread_too_wide: 0, ratio_bad: 0, profit_too_low: 0, no_pools: 0 },
        opportunitiesFound: 0,
    }

    if (allPrices.length < 2) {
        diagnostic.filtered.no_pools++
        return { opportunities: [], diagnostic }
    }

    const candidates: ArbitrageOpportunity[] = []

    for (let i = 0; i < allPrices.length; i++) {
        for (let j = 0; j < allPrices.length; j++) {
            if (i === j) continue

            const buy      = allPrices[i]
            const sell     = allPrices[j]
            if (buy.priceUsd >= sell.priceUsd) continue

            const sameChain = buy.chainId === sell.chainId
            const spreadPct = (sell.priceUsd - buy.priceUsd) / buy.priceUsd
            const maxSpread = sameChain ? MAX_SPREAD_SAME_CHAIN : MAX_SPREAD_CROSS_CHAIN

            if (sell.priceUsd / buy.priceUsd > MAX_PRICE_RATIO) {
                diagnostic.filtered.ratio_bad++; continue
            }
            if (spreadPct > maxSpread) {
                diagnostic.filtered.spread_too_wide++; continue
            }

            const estimatedProfitUsd = NOTIONAL_TRADE_USD * spreadPct
            const buyGas             = gasCostByChain[buy.chainId] ?? 15
            const sellGas            = gasCostByChain[sell.chainId] ?? 15
            const estimatedGasUsd    = sameChain ? buyGas : buyGas + sellGas
            const netProfitUsd       = estimatedProfitUsd - estimatedGasUsd

            if (netProfitUsd < MIN_NET_PROFIT_USD) {
                diagnostic.filtered.profit_too_low++; continue
            }

            const minLiquidityUsd = Math.min(buy.liquidityUsd, sell.liquidityUsd)
            const riskScore = calculateRiskScore({ spreadPct, minLiquidityUsd, sameChain, netProfitUsd })

            candidates.push({
                pair: pair.id,
                buyDex: buy.dex, sellDex: sell.dex,
                buyChainId: buy.chainId, sellChainId: sell.chainId,
                buyPrice: buy.priceUsd, sellPrice: sell.priceUsd,
                profitPct: spreadPct, estimatedProfitUsd, estimatedGasUsd, netProfitUsd,
                riskScore,
                routePath: {
                    buy:  { dex: buy.dex,  chainId: buy.chainId,  pairAddress: buy.pairAddress,  liquidity: buy.liquidityUsd },
                    sell: { dex: sell.dex, chainId: sell.chainId, pairAddress: sell.pairAddress, liquidity: sell.liquidityUsd },
                },
            })
        }
    }

    // Keep only the best opportunity per buy→sell route
    const best = new Map<string, ArbitrageOpportunity>()
    for (const opp of candidates) {
        const key = `${opp.buyDex}:${opp.buyChainId}|${opp.sellDex}:${opp.sellChainId}`
        const existing = best.get(key)
        if (!existing || opp.netProfitUsd > existing.netProfitUsd) best.set(key, opp)
    }

    const opportunities = [...best.values()].sort((a, b) => b.netProfitUsd - a.netProfitUsd)
    diagnostic.opportunitiesFound = opportunities.length
    return { opportunities, diagnostic }
}


export async function scanAllPairs(): Promise<{
    scanned: number
    found: number
    saved: number
    opportunities: ArbitrageOpportunity[]
    diagnostics: PairDiagnostic[]
}> {
    const adminClient = createSupabaseAdminClient()

    const nativePricesRaw = await getAllPrices([
        { base: 'ETH', quote: 'USDT' },
        { base: 'BNB', quote: 'USDT' },
    ]).catch(() => ({} as Record<string, string>))

    const nativePriceUsd: Record<string, number> = {
        ETH: parseFloat(nativePricesRaw['ETHUSDT'] ?? '3000'),
        BNB: parseFloat(nativePricesRaw['BNBUSDT'] ?? '600'),
    }

    const gasCostByChain = {} as Record<SupportedChainId, number>
    await Promise.allSettled(
        SUPPORTED_CHAIN_IDS.map(async (chainId) => {
            const nativeSymbol = getChainConfig(chainId).nativeCurrency.symbol
            gasCostByChain[chainId] = await estimateSwapGasUsd(
                chainId,
                nativePriceUsd[nativeSymbol] ?? 0,
            )
        }),
    )

    const settled = await Promise.allSettled(
        ACTIVE_PAIRS.map((pair) => scanPair(pair, gasCostByChain)),
    )

    const allOpportunities: ArbitrageOpportunity[] = []
    const allDiagnostics: PairDiagnostic[] = []
    for (const r of settled) {
        if (r.status === 'fulfilled') {
            allOpportunities.push(...r.value.opportunities)
            allDiagnostics.push(r.value.diagnostic)
        }
    }

    let saved = 0
    const now = new Date()
    const expiresAt = new Date(now.getTime() + OPPORTUNITY_TTL_MS).toISOString()

    for (const opp of allOpportunities) {
        const { error } = await adminClient
            .from('arbitrage_opportunities')
            .insert({
                pair: opp.pair,
                buy_dex: opp.buyDex,
                sell_dex: opp.sellDex,
                buy_chain_id: opp.buyChainId,
                sell_chain_id: opp.sellChainId,
                buy_price: opp.buyPrice.toFixed(6),
                sell_price: opp.sellPrice.toFixed(6),
                profit_pct: opp.profitPct.toFixed(6),
                estimated_profit_usd: opp.estimatedProfitUsd.toFixed(2),
                estimated_gas_usd: opp.estimatedGasUsd.toFixed(2),
                net_profit_usd: opp.netProfitUsd.toFixed(2),
                risk_score: opp.riskScore,
                route_path: opp.routePath,
                expires_at: expiresAt,
            })

        if (!error) saved++
    }

    await adminClient
        .from('arbitrage_opportunities')
        .delete()
        .lt('expires_at', now.toISOString())

    return {
        scanned: ACTIVE_PAIRS.length,
        found: allOpportunities.length,
        saved,
        opportunities: allOpportunities,
        diagnostics: allDiagnostics,
    }
}

export async function getOpportunities(params: {
    pair?: string
    minNetProfit?: number
    maxRiskScore?: number
    limit?: number
    offset?: number
}): Promise<{ opportunities: unknown[]; total: number; hasMore: boolean }> {
    const adminClient = createSupabaseAdminClient()

    const limit = Math.min(params.limit ?? 20, 100)
    const offset = params.offset ?? 0
    const now = new Date().toISOString()

    let query = adminClient
        .from('arbitrage_opportunities')
        .select('*', { count: 'exact' })
        .gt('expires_at', now)
        .order('net_profit_usd', { ascending: false })
        .range(offset, offset + limit - 1)

    if (params.pair) query = query.eq('pair', params.pair)
    if (params.minNetProfit !== undefined) query = query.gte('net_profit_usd', params.minNetProfit.toString())
    if (params.maxRiskScore !== undefined) query = query.lte('risk_score', params.maxRiskScore)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const total = count ?? 0
    return {
        opportunities: data ?? [],
        total,
        hasMore: total > offset + limit,
    }
}
