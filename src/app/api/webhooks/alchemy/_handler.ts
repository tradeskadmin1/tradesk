import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { formatUnits } from 'viem'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { creditBalance } from '@/lib/ledger'
import { sweepNative, sweepERC20 } from '@/lib/sweep'
import type { SupportedChainId } from '@/config/chains'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()

const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'

// ── Payload types ─────────────────────────────────────────────────────────────
interface AlchemyActivity {
    category: 'external' | 'internal' | 'token'
    fromAddress: string
    toAddress: string
    value: number
    asset: string
    rawContract?: {
        address: string
        decimal: string   // hex e.g. "0x6"
        rawValue: string   // hex wei
    }
    hash: string
    blockNum: string
    typeTraceAddress?: string
}

interface AlchemyWebhookPayload {
    webhookId: string
    id: string
    createdAt: string
    type: string
    event: {
        network: string
        activity: AlchemyActivity[]
    }
}

// ── Signature verification ────────────────────────────────────────────────────
function verifySignature(
    rawBody: string,
    signature: string | null,
    secretEnvKey: string,
): boolean {
    const secret = process.env[secretEnvKey]
    if (!secret) {
        console.warn(`[webhook/alchemy] ${secretEnvKey} not set — skipping verification`)
        return true   // allow in local dev without secrets configured
    }
    if (!signature) return false

    const digest = createHmac('sha256', secret)
        .update(rawBody, 'utf8')
        .digest('hex')

    return digest === signature
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function findUserByDepositAddress(
    address: string,
    chainId: SupportedChainId,
): Promise<string | null> {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
        .from('custodial_wallets')
        .select('user_id')
        .eq('address', address.toLowerCase())
        .eq('chain_id', chainId)
        .maybeSingle()

    if (error) {
        console.error('[webhook/alchemy] findUserByDepositAddress error:', error)
        return null
    }
    return data?.user_id ?? null
}

async function depositAlreadyRecorded(txHash: string, tokenAddress: string): Promise<boolean> {
    const supabase = createSupabaseAdminClient()
    const { data } = await supabase
        .from('deposits')
        .select('id')
        .eq('tx_hash', txHash)
        .eq('token_address', tokenAddress)
        .maybeSingle()
    return !!data
}

async function getWalletId(userId: string, chainId: SupportedChainId): Promise<string | null> {
    const supabase = createSupabaseAdminClient()
    const { data } = await supabase
        .from('custodial_wallets')
        .select('id')
        .eq('user_id', userId)
        .eq('chain_id', chainId)
        .maybeSingle()
    return data?.id ?? null
}

async function recordDeposit(params: {
    userId: string
    chainId: SupportedChainId
    tokenSymbol: string
    tokenAddress: string
    amount: string
    txHash: string
    fromAddress: string
    walletId: string
}): Promise<void> {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from('deposits').insert({
        user_id: params.userId,
        wallet_id: params.walletId,
        chain_id: params.chainId,
        token_symbol: params.tokenSymbol,
        token_address: params.tokenAddress,
        amount: params.amount,
        tx_hash: params.txHash,
        from_address: params.fromAddress,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
    })
    if (error) console.error('[webhook/alchemy] recordDeposit error:', error)
}

// ── Process one activity entry ────────────────────────────────────────────────
async function processActivity(
    activity: AlchemyActivity,
    chainId: SupportedChainId,
): Promise<void> {
    const { toAddress, fromAddress, hash: txHash, category, asset, rawContract, value } = activity

    const recipient = toAddress?.toLowerCase()
    if (!recipient) return

    const userId = await findUserByDepositAddress(recipient, chainId)
    if (!userId) return  // not one of our deposit addresses

    const isNative = category === 'external' || category === 'internal'
    const tokenAddr = isNative
        ? NATIVE_TOKEN_ADDRESS
        : (rawContract?.address?.toLowerCase() ?? NATIVE_TOKEN_ADDRESS)

    if (await depositAlreadyRecorded(txHash, tokenAddr)) {
        console.log(`[webhook/alchemy] Already processed tx=${txHash} token=${tokenAddr}`)
        return
    }

    // Decode human-readable amount
    let amountDecimal: string
    if (isNative) {
        amountDecimal = String(value)
    } else if (rawContract?.rawValue && rawContract?.decimal) {
        amountDecimal = formatUnits(BigInt(rawContract.rawValue), parseInt(rawContract.decimal, 16))
    } else {
        amountDecimal = String(value)
    }

    const tokenSymbol = asset ?? (isNative ? 'ETH' : 'TOKEN')
    const tokenDecimals = rawContract?.decimal ? parseInt(rawContract.decimal, 16) : 18

    console.log(
        `[webhook/alchemy] Deposit: user=${userId} chain=${chainId} ` +
        `${amountDecimal} ${tokenSymbol} tx=${txHash}`,
    )

    const walletId = await getWalletId(userId, chainId)

    // 1. Credit ledger (atomic)
    await creditBalance({
        userId,
        chainId,
        tokenSymbol,
        tokenAddress: tokenAddr,
        amount: amountDecimal,
        type: 'deposit',
        refId: txHash,
        note: `Deposit from ${fromAddress}`,
    })

    // 2. Record deposit row
    if (walletId) {
        await recordDeposit({
            userId,
            chainId,
            tokenSymbol,
            tokenAddress: tokenAddr,
            amount: amountDecimal,
            txHash,
            fromAddress: fromAddress.toLowerCase(),
            walletId,
        })
    }

    // 3. Sweep (fire-and-forget)
    if (isNative) {
        sweepNative({ userId, chainId, txHash }).catch((err) =>
            console.error(`[webhook/alchemy] sweepNative failed tx=${txHash}:`, err),
        )
    } else {
        sweepERC20({
            userId,
            chainId,
            tokenAddress: tokenAddr,
            tokenSymbol,
            decimals: tokenDecimals,
            txHash,
        }).catch((err) =>
            console.error(`[webhook/alchemy] sweepERC20 failed tx=${txHash}:`, err),
        )
    }
}

// ── Main handler (called by each chain route) ─────────────────────────────────
export async function handleAlchemyWebhook(
    req: NextRequest,
    secretEnvKey: string,
    expectedChainId: SupportedChainId,
): Promise<NextResponse> {
    const rawBody = await req.text()
    const sig = req.headers.get('x-alchemy-signature')

    if (!verifySignature(rawBody, sig, secretEnvKey)) {
        console.warn(`[webhook/alchemy] Invalid signature on ${secretEnvKey} route — rejected`)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let payload: AlchemyWebhookPayload
    try {
        payload = JSON.parse(rawBody)
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (payload.type !== 'ADDRESS_ACTIVITY') {
        return NextResponse.json({ ok: true })
    }

    // Double-check the payload's network matches this route's chain
    // (guards against misconfigured webhooks sending to the wrong URL)
    const { activity } = payload.event

    await Promise.allSettled(
        activity.map((act) => processActivity(act, expectedChainId)),
    )

    return NextResponse.json({ ok: true })
}
