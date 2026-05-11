import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: Request) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const db = createSupabaseAdminClient() as any
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
        usersRes,
        kycRes,
        pendingWithdrawalsRes,
        depositsRes,
        openPositionsRes,
        recentKycRes,
        recentWithdrawalsRes,
    ] = await Promise.all([
        // Total user count
        db.from('users').select('*', { count: 'exact', head: true }),

        // KYC breakdown
        db.from('users').select('kyc_status'),

        // Pending withdrawals: count + total amount
        db.from('withdrawals')
            .select('amount')
            .eq('status', 'pending'),

        // Deposits in last 7 days
        db.from('ledger_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'deposit')
            .eq('direction', 'credit')
            .gte('created_at', sevenDaysAgo),

        // Open futures positions
        db.from('futures_positions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open'),

        // Recent KYC submissions (pending review)
        db.from('users')
            .select('id, full_name, email, kyc_status, created_at')
            .eq('kyc_status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5),

        // Recent withdrawals (pending + last approved/rejected)
        db.from('withdrawals')
            .select(`
                id, status, amount, token_symbol, chain_id,
                auto_approved, created_at, approved_at, rejected_at,
                users!inner ( full_name, email )
            `)
            .in('status', ['pending', 'approved', 'rejected'])
            .order('created_at', { ascending: false })
            .limit(8),
    ])

    // KYC breakdown
    const kycRows: any[] = kycRes.data ?? []
    const kycBreakdown = kycRows.reduce(
        (acc: Record<string, number>, row: any) => {
            const s = row.kyc_status ?? 'none'
            acc[s] = (acc[s] ?? 0) + 1
            return acc
        },
        {},
    )

    // Pending withdrawals total
    const pendingRows: any[] = pendingWithdrawalsRes.data ?? []
    const pendingWithdrawalsTotal = pendingRows
        .reduce((sum: number, r: any) => sum + parseFloat(r.amount ?? 0), 0)

    return NextResponse.json({
        users: {
            total:    usersRes.count ?? 0,
            kyc:      kycBreakdown,
        },
        withdrawals: {
            pendingCount:  pendingRows.length,
            pendingUsd:    parseFloat(pendingWithdrawalsTotal.toFixed(2)),
        },
        deposits: {
            last7Days: depositsRes.count ?? 0,
        },
        futures: {
            openPositions: openPositionsRes.count ?? 0,
        },
        recentKyc:         recentKycRes.data   ?? [],
        recentWithdrawals: recentWithdrawalsRes.data ?? [],
        generatedAt:       new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } })
}
