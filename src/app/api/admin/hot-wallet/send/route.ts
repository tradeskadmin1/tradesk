import { NextResponse } from 'next/server'
import { parseUnits, isAddress } from 'viem'
import { requireAdmin } from '@/lib/admin-auth'
import { getPlatformWalletClient } from '@/lib/platform-wallet'
import type { SupportedChainId } from '@/config/chains'

const ERC20_ABI = [
    {
        name: 'transfer', type: 'function', stateMutability: 'nonpayable',
        inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
        outputs: [{ name: '', type: 'bool' }]
    },
] as const

export async function POST(req: Request) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const body = await req.json().catch(() => ({}))
    const { chainId, tokenAddress, tokenSymbol, decimals, amount, toAddress } = body

    if (!chainId || !amount || !toAddress)
        return NextResponse.json({ error: 'chainId, amount and toAddress are required' }, { status: 400 })

    if (!isAddress(toAddress))
        return NextResponse.json({ error: 'Invalid destination address' }, { status: 400 })

    const parsedAmount = parseFloat(amount)
    if (!isFinite(parsedAmount) || parsedAmount <= 0)
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

    try {
        const { walletClient, publicClient, account } =
            await getPlatformWalletClient(chainId as SupportedChainId)

        let txHash: string

        if (!tokenAddress) {
            txHash = await walletClient.sendTransaction({
                account,
                to: toAddress as `0x${string}`,
                value: parseUnits(String(parsedAmount), 18),
            })
        } else {
            const dec = decimals ?? 18
            txHash = await walletClient.writeContract({
                address: tokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'transfer',
                args: [toAddress as `0x${string}`, parseUnits(String(parsedAmount), dec)],
                account,
            })
        }

        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash as `0x${string}`,
            timeout: 60_000,
        })

        return NextResponse.json({
            success: true,
            txHash,
            status: receipt.status,
            from: account.address,
            to: toAddress,
            amount: parsedAmount,
            token: tokenSymbol ?? 'native',
            chainId,
        })
    } catch (err: any) {
        console.error('[hot-wallet/send]', err)
        return NextResponse.json({ error: err.message ?? 'Transfer failed' }, { status: 500 })
    }
}
