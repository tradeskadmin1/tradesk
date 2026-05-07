import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (code) {
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    },
                },
            }
        )

        await supabase.auth.exchangeCodeForSession(code)

        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const { data: userData } = await supabase
                .from('users')
                .select('onboarded')
                .eq('id', user.id)
                .single()

            if (!userData) {
                await supabase.from('users').insert({
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name ?? '',
                    onboarded: false,
                })
                return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
            }

            return NextResponse.redirect(
                new URL(userData.onboarded ? '/dashboard' : '/onboarding', requestUrl.origin)
            )
        }
    }

    return NextResponse.redirect(new URL('/auth', requestUrl.origin))
}