import { NextResponse } from 'next/server'
import { parseUnits } from 'viem'
import { createSupabaseServerClient, createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { getBalance, debitBalance, creditBalance } from '@/lib/ledger'
import { getGmxSdk, USDC_ADDRESS, USDC_DECIMALS, toLeverageBigInt, FUTURES_MARKETS, FUTURES_FEE_BPS } from '@/lib/gmx'
import { calcLiquidationPrice } from '@/lib/futures'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()

const MAX_LEVERAGE = 50
const MIN_COLLATERAL_USD = 10

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = checkRateLimit(`futures:open:${user.id}`, LIMITS.STRICT)
        if (!rl.success) return rlResponse(rl.resetAt)

        const body = await req.json()
        const { symbol, side, collateralUsd, leverage } = body as {
            symbol: string
            side: 'long' | 'short'
            collateralUsd: number
            leverage: number
        }

        const market = FUTURES_MARKETS.find((m) => m.symbol === symbol)
        if (!market) return NextResponse.json({ error: `Unknown market: ${symbol}` }, { status: 400 })
        if (!['long', 'short'].includes(side)) return NextResponse.json({ error: 'side must be long or short' }, { status: 400 })
        if (!collateralUsd || collateralUsd < MIN_COLLATERAL_USD) return NextResponse.json({ error: `Minimum collateral is $${MIN_COLLATERAL_USD}` }, { status: 400 })
        if (!leverage || leverage < 1 || leverage > MAX_LEVERAGE) return NextResponse.json({ error: `Leverage must be 1–${MAX_LEVERAGE}x` }, { status: 400 })

        const ARBITRUM_CHAIN_ID = 42161
        const usdcLedgerAddress = USDC_ADDRESS.toLowerCase()

        const sizeUsd = collateralUsd * leverage
        const openFee = parseFloat(((sizeUsd * FUTURES_FEE_BPS) / 10_000).toFixed(6))
        const totalRequired = collateralUsd + openFee

        const ledgerBalance = await getBalance({
            userId: user.id,
            chainId: ARBITRUM_CHAIN_ID,
            tokenAddress: usdcLedgerAddress,
        })

        if (parseFloat(ledgerBalance) < totalRequired) {
            return NextResponse.json(
                { error: `Insufficient USDC balance. Need ${totalRequired.toFixed(2)} (collateral ${collateralUsd} + fee ${openFee.toFixed(2)}), have ${ledgerBalance}` },
                { status: 400 },
            )
        }

        const sdk = await getGmxSdk(true)
        const marketsInfo = await sdk.markets.getMarketsInfo()
        const gmxMarket = Object.values(marketsInfo.marketsInfoData ?? {}).find(
            (m: any) => m.indexToken?.symbol === symbol && !m.isDisabled,
        ) as any

        if (!gmxMarket) {
            return NextResponse.json({ error: `GMX market not found for ${symbol}` }, { status: 404 })
        }


        await debitBalance({
            userId: user.id,
            chainId: ARBITRUM_CHAIN_ID,
            tokenSymbol: 'USDC',
            tokenAddress: usdcLedgerAddress,
            amount: String(collateralUsd),
            type: 'trade_buy',
            note: `Futures collateral: ${side} ${symbol}/USD ${leverage}x`,
        })


        await debitBalance({
            userId: user.id,
            chainId: ARBITRUM_CHAIN_ID,
            tokenSymbol: 'USDC',
            tokenAddress: usdcLedgerAddress,
            amount: String(openFee),
            type: 'fee',
            note: `Futures open fee: ${side} ${symbol}/USD — $${openFee.toFixed(2)}`,
        })

        const collateralRaw = parseUnits(String(collateralUsd), USDC_DECIMALS)
        const leverageBig = toLeverageBigInt(leverage)

        try {
            if (side === 'long') {
                await sdk.orders.long({
                    payAmount: collateralRaw,
                    payTokenAddress: USDC_ADDRESS,
                    collateralTokenAddress: USDC_ADDRESS,
                    marketAddress: gmxMarket.marketTokenAddress,
                    leverage: leverageBig,
                    allowedSlippageBps: 50,
                })
            } else {
                await sdk.orders.short({
                    payAmount: collateralRaw,
                    payTokenAddress: USDC_ADDRESS,
                    collateralTokenAddress: USDC_ADDRESS,
                    marketAddress: gmxMarket.marketTokenAddress,
                    leverage: leverageBig,
                    allowedSlippageBps: 50,
                })
            }
        } catch (gmxErr) {
            await creditBalance({
                userId: user.id,
                chainId: ARBITRUM_CHAIN_ID,
                tokenSymbol: 'USDC',
                tokenAddress: usdcLedgerAddress,
                amount: String(collateralUsd + openFee),
                type: 'adjustment',
                note: 'GMX order failed — reversal',
            }).catch(() => { })
            throw gmxErr
        }
        const tickers = await sdk.oracle.getTickers()
        const ticker = Object.values(tickers).find((t: any) => t.tokenSymbol === symbol) as any
        const entryPrice = ticker
            ? (Number((BigInt(ticker.minPrice) + BigInt(ticker.maxPrice)) / BigInt(2)) / 1e30)
            : 0

        const liquidationPrice = calcLiquidationPrice(side, entryPrice, leverage)

        const adminClient = createSupabaseAdminClient()
        const { data: position, error: dbErr } = await adminClient
            .from('futures_positions')
            .insert({
                user_id: user.id,
                chain_id: ARBITRUM_CHAIN_ID,
                pair: `${symbol}/USD`,
                side,
                size_usd: sizeUsd,
                collateral_usd: collateralUsd,
                collateral_token: 'USDC',
                leverage,
                entry_price: entryPrice,
                mark_price: entryPrice,
                liquidation_price: liquidationPrice,
                status: 'open',
                gmx_market_address: gmxMarket.marketTokenAddress,
                collateral_address: usdcLedgerAddress,
            })
            .select('id')
            .single()

        if (dbErr) console.error('[futures/open] DB insert error:', dbErr)

        return NextResponse.json({
            success: true,
            positionId: position?.id ?? null,
            sizeUsd,
            entryPrice,
            liquidationPrice,
            feeUsd: openFee,
        })
    } catch (err: any) {
        console.error('[POST /api/futures/open]', err)
        return NextResponse.json({ error: err.message ?? 'Failed to open position' }, { status: 500 })
    }
}
