import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { recordDeposit } from '@/lib/transfer'
import { getTokenByAddress, NATIVE_TOKEN_ADDRESS } from '@/config/tokens'
import { isSupportedChain, type SupportedChainId } from '@/config/chains'
import { formatUnits } from 'viem'



const WEBHOOK_SECRET = process.env.ALCHEMY_WEBHOOK_SECRET

function verifyAlchemySignature(body: string, signature: string): boolean {
    if (!WEBHOOK_SECRET) {
        console.warn('[webhook] ALCHEMY_WEBHOOK_SECRET not set — skipping signature verification')
        return true
    }
    const hmac = createHmac('sha256', WEBHOOK_SECRET)
    const computed = hmac.update(body).digest('hex')
    return computed === signature
}

export async function POST(req: Request) {
    try {
        const body = await req.text()
        const signature = req.headers.get('x-alchemy-signature') ?? ''

        if (!verifyAlchemySignature(body, signature)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }

        const payload = JSON.parse(body)
        const activities: AlchemyActivity[] = payload?.event?.activity ?? []

        const supabase = createSupabaseAdminClient() as any

        for (const activity of activities) {
            if (activity.category !== 'token' && activity.category !== 'internal') continue
            if (!activity.toAddress) continue

            const chainId = alchemyNetworkToChainId(payload.event?.network)
            if (!chainId || !isSupportedChain(chainId)) continue
            const { data: wallet } = await supabase
                .from('custodial_wallets')
                .select('id, user_id')
                .eq('address', activity.toAddress.toLowerCase())
                .eq('chain_id', chainId)
                .single()

            if (!wallet) continue

            let tokenSymbol: string
            let tokenAddress: string
            let decimals: number

            if (activity.asset === 'ETH' || activity.asset === 'BNB') {
                tokenSymbol = activity.asset
                tokenAddress = NATIVE_TOKEN_ADDRESS
                decimals = 18
            } else {
                const contractAddress = activity.rawContract?.address
                if (!contractAddress) continue

                const token = getTokenByAddress(contractAddress, chainId)
                if (!token) continue

                tokenSymbol = token.symbol
                tokenAddress = contractAddress
                decimals = token.decimals
            }

            const rawValue = BigInt(activity.rawContract?.rawValue ?? activity.value ?? '0')
            const amount = formatUnits(rawValue, decimals)

            await recordDeposit({
                userId: wallet.user_id,
                walletId: wallet.id,
                chainId,
                tokenSymbol,
                tokenAddress,
                amount,
                txHash: activity.hash,
                fromAddress: activity.fromAddress ?? 'unknown',
            })
        }

        return NextResponse.json({ received: true })
    } catch (err) {
        console.error('[POST /api/deposit/webhook]', err)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────

interface AlchemyActivity {
    category: string
    fromAddress: string
    toAddress: string
    asset: string
    value: string
    hash: string
    rawContract?: {
        address: string
        rawValue: string
        decimals: number
    }
}

function alchemyNetworkToChainId(network: string): SupportedChainId | null {
    const map: Record<string, SupportedChainId> = {
        'ETH_MAINNET': 1,
        'BNB_MAINNET': 56,
        'ARB_MAINNET': 42161,
    }
    return map[network] ?? null
}