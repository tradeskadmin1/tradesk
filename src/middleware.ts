import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function middleware(req: NextRequest) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error(
            '[middleware] Missing Supabase env vars — skipping auth checks.\n' +
            'NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL,
            '\nNEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '(present)' : '(missing)'
        )
        return NextResponse.next()
    }

    const res = NextResponse.next()

    const supabase = createServerClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return req.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        req.cookies.set(name, value)
                        res.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    // ✅ getUser() verifies identity with Supabase Auth server — safe for production
    const { data: { user } } = await supabase.auth.getUser()
    const { pathname } = req.nextUrl

    const protectedRoutes = ['/dashboard', '/onboarding']
    const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))

    if (isProtected && !user) {
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/auth'
        redirectUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(redirectUrl)
    }

    if (user) {
        const { data: userData } = await supabase
            .from('users')
            .select('onboarded')
            .eq('id', user.id)  // ✅ was session.user.id
            .single()

        const onboarded = userData?.onboarded ?? false

        if (pathname.startsWith('/dashboard') && !onboarded) {
            const redirectUrl = req.nextUrl.clone()
            redirectUrl.pathname = '/onboarding'
            return NextResponse.redirect(redirectUrl)
        }

        if (pathname.startsWith('/onboarding') && onboarded) {
            const redirectUrl = req.nextUrl.clone()
            redirectUrl.pathname = '/dashboard'
            return NextResponse.redirect(redirectUrl)
        }

        if (pathname.startsWith('/auth')) {
            const redirectUrl = req.nextUrl.clone()
            redirectUrl.pathname = onboarded ? '/dashboard' : '/onboarding'
            return NextResponse.redirect(redirectUrl)
        }
    }

    return res
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/onboarding/:path*',
        '/auth',
        '/auth/:path*',
    ],
}