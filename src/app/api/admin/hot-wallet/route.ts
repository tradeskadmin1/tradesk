import { NextResponse } from 'next/server'
import { createPublicClient, http, formatUnits } from 'viem'
import { requireAdmin } from '@/lib/admin-auth'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from '@/lib/supabase-server'
import { CHAIN_CONFIG, SUPPORTED_CHAIN_IDS, type SupportedChainId } from '@/config/chains'

const db = (): any => _createSupabaseAdminClient()

const ERC20_ABI = [
    {
        name: 'balanceOf', type: 'function', stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
    },
    {
        name: 'decimals', type: 'function', stateMutability: 'view',
        inputs: [], outputs: [{ name: '', type: 'uint8' }]
    },
    {
        name: 'symbol', type: 'function', stateMutability: 'view',
        inputs: [], outputs: [{ name: '', type: 'string' }]
    },
] as const

const TOKENS: Record<SupportedChainId, { symbol: string; address: string; decimals: number }[]> = {
    1: [
        { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    ],
    56: [
        { symbol: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
        { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
    ],
    42161: [
        { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
        { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
    ],
}

export async function GET(req: Request) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const supabase = db()
    const { data: wallets } = await supabase
        .from('platform_wallets')
        .select('chain_id, address')
        .eq('label', 'hot')

    if (!wallets?.length) {
        return NextResponse.json({ error: 'Hot wallets not initialized. Run /api/admin/init-platform-wallets first.' }, { status: 404 })
    }

    const results = await Promise.all(
        wallets.map(async (w: { chain_id: SupportedChainId; address: string }) => {
            const chainId = w.chain_id as SupportedChainId
            const cfg = CHAIN_CONFIG[chainId]
            const rpcUrl = process.env[cfg.rpcEnvKey] ?? cfg.publicRpcFallback
            const address = w.address as `0x${string}`

            const publicClient = createPublicClient({
                chain: cfg.chain,
                transport: http(rpcUrl),
            })

            const nativeWei = await publicClient.getBalance({ address }).catch(() => 0n)
            const nativeBalance = parseFloat(formatUnits(nativeWei, 18))

            const tokenBalances = await Promise.all(
                (TOKENS[chainId] ?? []).map(async (token) => {
                    const raw = await publicClient.readContract({
                        address: token.address as `0x${string}`,
                        abi: ERC20_ABI,
                        functionName: 'balanceOf',
                        args: [address],
                    }).catch(() => 0n)
                    return {
                        symbol: token.symbol,
                        address: token.address,
                        decimals: token.decimals,
                        balance: parseFloat(formatUnits(raw as bigint, token.decimals)),
                    }
                })
            )

            return {
                chainId,
                chainName: cfg.chain.name,
                address: w.address,
                nativeSymbol: cfg.nativeCurrency.symbol,
                nativeBalance,
                tokens: tokenBalances,
            }
        })
    )

    return NextResponse.json({ wallets: results })
}
