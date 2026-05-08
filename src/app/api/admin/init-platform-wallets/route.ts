import { NextResponse } from 'next/server'
import { initializePlatformWallets } from '@/lib/platform-wallet'


export async function POST(req: Request) {
    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret) {
        return NextResponse.json({ error: 'ADMIN_SECRET env var not set' }, { status: 500 })
    }

    const authHeader = req.headers.get('x-admin-secret')
    if (authHeader !== adminSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const wallets = await initializePlatformWallets()

        return NextResponse.json({
            success: true,
            wallets: wallets.map((w) => ({
                chainId: w.chainId,
                address: w.address,
                label: w.label,
            })),
        })
    } catch (err) {
        console.error('[POST /api/admin/init-platform-wallets]', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to initialize platform wallets' },
            { status: 500 },
        )
    }
}
