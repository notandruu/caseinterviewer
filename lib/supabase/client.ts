import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    if (typeof window === 'undefined') {
      return { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), getUser: async () => ({ data: { user: null }, error: null }), signOut: async () => {}, signInWithOtp: async () => ({ error: null }) } } as any
    }
    throw new Error('Supabase URL and anon key are required')
  }

  return createBrowserClient(url, key)
}
