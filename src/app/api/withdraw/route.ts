import { NextResponse } from 'next/server'
import { isAddress, getAddress } from 'viem'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { executeWithdrawal, estimateWithdrawalFee } from '@/lib/transfer'
import { isSupportedChain, getChainConfig, type SupportedChainId } from '@/config/chains'
import { TOKENS } from '@/config/tokens'

/**
 * POST /api/withdraw
 *
 * Body: { chainId, tokenSymbol, amount, toAddress }
 *
 * Flow:
 *  1. Validate inputs
 *  2. Verify wallet belongs to user
 *  3. Create a 'pending' withdrawal record
 *  4. Execute on-chain transfer
 *  5. Update record to 'completed'
 */
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { chainId: chainIdRaw, tokenSymbol, amount, toAddress } = body

    // ── Input validation ───────────────────────────────────────────────────
    const chainId = parseInt(chainIdRaw, 10) as SupportedChainId
    if (!isSupportedChain(chainId)) {
      return NextResponse.json({ error: `Unsupported chain: ${chainIdRaw}` }, { status: 400 })
    }

    if (!TOKENS[tokenSymbol]) {
      return NextResponse.json({ error: `Unknown token: ${tokenSymbol}` }, { status: 400 })
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (!toAddress || !isAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid destination address' }, { status: 400 })
    }

    const checksummedAddress = getAddress(toAddress) as `0x${string}`

    // ── Verify wallet belongs to user ──────────────────────────────────────
    const adminClient = createSupabaseAdminClient() as any

    const { data: wallet, error: walletError } = await adminClient
      .from('custodial_wallets')
      .select('id, address')
      .eq('user_id', user.id)
      .eq('chain_id', chainId)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: 'Wallet not found for this chain' },
        { status: 404 },
      )
    }

    // ── Estimate fee ───────────────────────────────────────────────────────
    const { feeEth } = await estimateWithdrawalFee(
      chainId,
      tokenSymbol,
      wallet.address as `0x${string}`,
      checksummedAddress,
      amount,
    )

    // ── Create pending withdrawal record ───────────────────────────────────
    const { data: withdrawal, error: insertError } = await adminClient
      .from('withdrawals')
      .insert({
        user_id:       user.id,
        wallet_id:     wallet.id,
        chain_id:      chainId,
        token_symbol:  tokenSymbol,
        token_address: TOKENS[tokenSymbol].addresses[chainId] ?? '',
        amount,
        fee:           feeEth,
        to_address:    checksummedAddress,
        status:        'processing',
      })
      .select('id')
      .single()

    if (insertError || !withdrawal) {
      return NextResponse.json({ error: 'Failed to create withdrawal record' }, { status: 500 })
    }

    // ── Execute on-chain ───────────────────────────────────────────────────
    const result = await executeWithdrawal({
      userId:      user.id,
      walletId:    wallet.id,
      chainId,
      tokenSymbol,
      amount,
      toAddress:   checksummedAddress,
    })

    return NextResponse.json({
      success:      true,
      withdrawalId: withdrawal.id,
      txHash:       result.txHash,
      fee:          result.fee,
      gasUsed:      result.gasUsed,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Withdrawal failed'
    console.error('[POST /api/withdraw]', err)

    // Mark withdrawal as failed if it was created
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/withdraw?id=xxx
 *   Returns status of a specific withdrawal.
 *
 * GET /api/withdraw?chainId=1&token=ETH&amount=0.1&toAddress=0x...
 *   Returns a fee estimate (does NOT submit the withdrawal).
 */
export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    // ── Status lookup ──────────────────────────────────────────────────────
    if (id) {
      const adminClient = createSupabaseAdminClient() as any
      const { data, error } = await adminClient
        .from('withdrawals')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
      }

      return NextResponse.json(data)
    }

    // ── Fee estimation ─────────────────────────────────────────────────────
    const chainIdParam  = searchParams.get('chainId')
    const tokenSymbol   = searchParams.get('token')
    const amount        = searchParams.get('amount')
    const toAddress     = searchParams.get('toAddress')

    if (!chainIdParam || !tokenSymbol || !amount || !toAddress) {
      return NextResponse.json(
        { error: 'Provide either id (status) or chainId, token, amount, toAddress (fee estimate)' },
        { status: 400 },
      )
    }

    const chainId = parseInt(chainIdParam, 10) as SupportedChainId
    if (!isSupportedChain(chainId)) {
      return NextResponse.json({ error: `Unsupported chain: ${chainId}` }, { status: 400 })
    }
    if (!TOKENS[tokenSymbol]) {
      return NextResponse.json({ error: `Unknown token: ${tokenSymbol}` }, { status: 400 })
    }
    if (!isAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid destination address' }, { status: 400 })
    }

    const adminClient = createSupabaseAdminClient() as any
    const { data: wallet } = await adminClient
      .from('custodial_wallets')
      .select('address')
      .eq('user_id', user.id)
      .eq('chain_id', chainId)
      .single()

    if (!wallet) {
      return NextResponse.json({ error: 'No wallet found for this chain' }, { status: 404 })
    }

    const chainCfg = getChainConfig(chainId)

    const { feeEth, feeUsd } = await estimateWithdrawalFee(
      chainId,
      tokenSymbol,
      wallet.address as `0x${string}`,
      getAddress(toAddress) as `0x${string}`,
      amount,
    )

    return NextResponse.json({
      estimatedFee:    feeEth,
      estimatedFeeUsd: feeUsd ?? null,
      token:           chainCfg.nativeCurrency.symbol,
      network:         chainCfg.name,
    })
  } catch (err) {
    console.error('[GET /api/withdraw]', err)
    return NextResponse.json({ error: 'Failed to fetch withdrawal info' }, { status: 500 })
  }
}
