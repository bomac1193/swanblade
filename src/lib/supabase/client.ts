/**
 * Supabase Browser Client
 *
 * Use this in Client Components (use client).
 * Uses lazy require of @supabase/ssr to avoid Turbopack compilation hangs.
 */

// Dummy client for when Supabase is not configured
const createDummyClient = () => ({
  auth: {
    signInWithPassword: async () => ({ data: null, error: { message: "Supabase not configured" } }),
    signUp: async () => ({ data: null, error: { message: "Supabase not configured" } }),
    signOut: async () => ({ error: null }),
    signInWithOAuth: async () => ({ data: null, error: { message: "Supabase not configured" } }),
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: null }),
      }),
    }),
    upsert: async () => ({ data: null, error: null }),
  }),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _cachedClient: any = null;

export function createClient() {
  if (_cachedClient) return _cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl === "your_supabase_project_url") {
    _cachedClient = createDummyClient();
    return _cachedClient;
  }

  // Lazy require to avoid Turbopack bundling @supabase/ssr at compile time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createBrowserClient } = require("@supabase/ssr");
  _cachedClient = createBrowserClient(supabaseUrl, supabaseKey);
  return _cachedClient;
}
