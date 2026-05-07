import { createBrowserClient } from '@supabase/ssr'


let _client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabase() {
    if (_client) return _client

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        throw new Error(
            '[supabase] Missing env vars.\n' +
            'NEXT_PUBLIC_SUPABASE_URL: ' + (url ? '(present)' : '(missing)') + '\n' +
            'NEXT_PUBLIC_SUPABASE_ANON_KEY: ' + (key ? '(present)' : '(missing)')
        )
    }

    _client = createBrowserClient(url, key)
    return _client
}


export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
    get(_target, prop) {
        return getSupabase()[prop as keyof ReturnType<typeof createBrowserClient>]
    }
})