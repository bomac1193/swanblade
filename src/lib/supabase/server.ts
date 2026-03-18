/**
 * Supabase Server Client
 *
 * Use this in Server Components, Route Handlers, and Server Actions.
 * Uses lazy import of @supabase/ssr to avoid Turbopack compilation hangs.
 */

import { cookies } from "next/headers";

// Dummy client for when Supabase is not configured
const createDummyClient = () => ({
  auth: {
    signInWithPassword: async () => ({ data: null, error: { message: "Supabase not configured" } }),
    signUp: async () => ({ data: null, error: { message: "Supabase not configured" } }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    exchangeCodeForSession: async () => ({ data: null, error: { message: "Supabase not configured" } }),
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

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl === "your_supabase_project_url") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createDummyClient() as any;
  }

  const { createServerClient } = await import("@supabase/ssr");
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from Server Component - ignore
        }
      },
    },
  });
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getUserWithMembership() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("membership_tier, membership_status, invite_code")
    .eq("id", user.id)
    .single();

  return {
    ...user,
    membership_tier: profile?.membership_tier || "pending",
    membership_status: profile?.membership_status || "pending",
    invite_code: profile?.invite_code || null,
  };
}
