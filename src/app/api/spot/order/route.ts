import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { creditBalance, debitBalance, recordPlatformRevenue } from '@/lib/ledger'
import { checkRateLimit, LIMITS, rlResponse } from '@/lib/rate-limit'
import {
    getPairBySymbol,
    getSpotTokenAddress,
    SPOT_CHAIN_ID,
    SPOT_FEE_RATE,
} from '@/config/spot'

async function getLivePrice(binanceSymbol: string, coingeckoId: string, quote: string): Promise<number> {
    try {
        const res = await fetch(
            `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`,
            { cache: 'no-store' },
        )
        if (res.ok) {
            const d = await res.json()
            return parseFloat(d.price)
        }
    } catch { /* fall through */ }

    const vs = quote === 'BTC' ? 'btc' : 'usd'
    const cgRes = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=${vs}`,
        { next: { revalidate: 30 } },
    )
    if (!cgRes.ok) throw new Error('Price feed unavailable')
    const cgData = await cgRes.json()
    const price = cgData[coingeckoId]?.[vs]
    if (!price) throw new Error('Price feed unavailable')
    return price
}

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rl = await checkRateLimit(`spot:order:${user.id}`, LIMITS.MODERATE)
        if (!rl.success) return rlResponse(rl.resetAt)

        const body = await req.json()
        const { pair: pairSymbol, side, type: orderType, amount, price: limitPrice } = body

        const pair = getPairBySymbol(pairSymbol)
        if (!pair) return NextResponse.json({ error: `Unknown pair: ${pairSymbol}` }, { status: 400 })

        if (!['buy', 'sell'].includes(side))
            return NextResponse.json({ error: 'side must be buy or sell' }, { status: 400 })

        if (!['market', 'limit'].includes(orderType))
            return NextResponse.json({ error: 'type must be market or limit' }, { status: 400 })

        const amountNum = parseFloat(amount)
        if (isNaN(amountNum) || amountNum < pair.minOrderSize)
            return NextResponse.json(
                { error: `Minimum order size is ${pair.minOrderSize} ${pair.base}` },
                { status: 400 },
            )

        if (orderType === 'limit') {
            const limitPriceNum = parseFloat(limitPrice)
            if (isNaN(limitPriceNum) || limitPriceNum <= 0)
                return NextResponse.json({ error: 'Invalid limit price' }, { status: 400 })

            const total = amountNum * limitPriceNum
            const db = createSupabaseAdminClient() as any

            const holdToken = side === 'buy' ? pair.quote : pair.base
            const holdAmount = side === 'buy' ? total : amountNum
            const holdAddress = getSpotTokenAddress(holdToken)

            await debitBalance({
                userId: user.id, chainId: SPOT_CHAIN_ID,
                tokenSymbol: holdToken, tokenAddress: holdAddress,
                amount: holdAmount.toFixed(8),
                type: 'trade_buy', note: `Limit order hold — ${side} ${amountNum} ${pair.base} @ ${limitPriceNum} ${pair.quote}`,
            })

            const { data: order, error: orderErr } = await db
                .from('spot_orders')
                .insert({
                    user_id: user.id, pair: pairSymbol,
                    base: pair.base, quote: pair.quote,
                    side, type: 'limit',
                    amount: amountNum.toFixed(8),
                    price: limitPriceNum.toFixed(pair.pricePrecision),
                    status: 'open',
                })
                .select()
                .single()

            if (orderErr) {
                await creditBalance({
                    userId: user.id, chainId: SPOT_CHAIN_ID,
                    tokenSymbol: holdToken, tokenAddress: holdAddress,
                    amount: holdAmount.toFixed(8),
                    type: 'adjustment', note: 'Limit order creation failed — reversal',
                }).catch(() => { })
                return NextResponse.json({ error: 'Failed to place limit order' }, { status: 500 })
            }

            return NextResponse.json({ success: true, status: 'open', order })
        }


        const fillPrice = await getLivePrice(pair.binanceSymbol, pair.coingeckoId, pair.quote)
        const total = amountNum * fillPrice
        const fee = total * SPOT_FEE_RATE
        const db = createSupabaseAdminClient() as any

        if (side === 'buy') {
            const totalWithFee = total + fee
            const quoteAddress = getSpotTokenAddress(pair.quote)
            const baseAddress = getSpotTokenAddress(pair.base)

            await debitBalance({
                userId: user.id, chainId: SPOT_CHAIN_ID,
                tokenSymbol: pair.quote, tokenAddress: quoteAddress,
                amount: totalWithFee.toFixed(6),
                type: 'trade_buy',
                note: `Spot buy ${amountNum} ${pair.base} @ ${fillPrice} ${pair.quote}`,
            })

            await creditBalance({
                userId: user.id, chainId: SPOT_CHAIN_ID,
                tokenSymbol: pair.base, tokenAddress: baseAddress,
                amount: amountNum.toFixed(pair.amountPrecision),
                type: 'trade_buy',
                note: `Spot buy ${amountNum} ${pair.base} @ ${fillPrice} ${pair.quote}`,
            })
        } else {
            const netQuote = total - fee
            const baseAddress = getSpotTokenAddress(pair.base)
            const quoteAddress = getSpotTokenAddress(pair.quote)

            await debitBalance({
                userId: user.id, chainId: SPOT_CHAIN_ID,
                tokenSymbol: pair.base, tokenAddress: baseAddress,
                amount: amountNum.toFixed(pair.amountPrecision),
                type: 'trade_sell',
                note: `Spot sell ${amountNum} ${pair.base} @ ${fillPrice} ${pair.quote}`,
            })

            await creditBalance({
                userId: user.id, chainId: SPOT_CHAIN_ID,
                tokenSymbol: pair.quote, tokenAddress: quoteAddress,
                amount: netQuote.toFixed(6),
                type: 'trade_sell',
                note: `Spot sell ${amountNum} ${pair.base} @ ${fillPrice} ${pair.quote}`,
            })
        }

        const { data: order } = await db
            .from('spot_orders')
            .insert({
                user_id: user.id, pair: pairSymbol,
                base: pair.base, quote: pair.quote,
                side, type: 'market',
                amount: amountNum.toFixed(pair.amountPrecision),
                price: fillPrice.toFixed(pair.pricePrecision),
                filled_amount: amountNum.toFixed(pair.amountPrecision),
                avg_fill_price: fillPrice.toFixed(pair.pricePrecision),
                total: total.toFixed(6),
                fee: fee.toFixed(6),
                fee_token: pair.quote,
                status: 'filled',
                filled_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (order) {
            await db.from('spot_trades').insert({
                order_id: order.id,
                user_id: user.id,
                pair: pairSymbol,
                side,
                amount: amountNum.toFixed(pair.amountPrecision),
                price: fillPrice.toFixed(pair.pricePrecision),
                total: total.toFixed(6),
                fee: fee.toFixed(6),
                fee_token: pair.quote,
            })
        }

        await recordPlatformRevenue({
            source: 'futures_open',
            userId: user.id,
            refId: order?.id,
            amount: fee,
            tokenSymbol: pair.quote === 'BTC' ? 'USDC' : 'USDT',
            chainId: SPOT_CHAIN_ID,
            note: `Spot ${side} ${pairSymbol} — 0.1% fee`,
        }).catch(() => { })

        return NextResponse.json({
            success: true,
            status: 'filled',
            fillPrice,
            amount: amountNum,
            total,
            fee,
            feeToken: pair.quote,
            order,
        })
    } catch (err: any) {
        console.error('[POST /api/spot/order]', err)
        return NextResponse.json({ error: err.message ?? 'Order failed' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status')
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)

        const db = createSupabaseAdminClient() as any
        let query = db
            .from('spot_orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (status) query = query.eq('status', status)

        const { data, error } = await query
        if (error) return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })

        return NextResponse.json({ orders: data ?? [] })
    } catch (err) {
        console.error('[GET /api/spot/order]', err)
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const orderId = searchParams.get('id')
        if (!orderId) return NextResponse.json({ error: 'id is required' }, { status: 400 })

        const db = createSupabaseAdminClient() as any

        const { data: order } = await db
            .from('spot_orders')
            .select('*')
            .eq('id', orderId)
            .eq('user_id', user.id)
            .eq('status', 'open')
            .single()

        if (!order) return NextResponse.json({ error: 'Open order not found' }, { status: 404 })

        const pair = getPairBySymbol(order.pair)
        if (pair) {
            const refundToken = order.side === 'buy' ? pair.quote : pair.base
            const refundAmount = order.side === 'buy'
                ? parseFloat(order.amount) * parseFloat(order.price)
                : parseFloat(order.amount)
            const refundAddress = getSpotTokenAddress(refundToken)

            await creditBalance({
                userId: user.id, chainId: SPOT_CHAIN_ID,
                tokenSymbol: refundToken, tokenAddress: refundAddress,
                amount: refundAmount.toFixed(8),
                type: 'adjustment',
                note: `Cancelled limit order ${orderId}`,
            }).catch(console.error)
        }

        await db
            .from('spot_orders')
            .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
            .eq('id', orderId)
            .eq('user_id', user.id)

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[DELETE /api/spot/order]', err)
        return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })
    }
}
