import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Build a per-request Supabase client that acts AS the calling user, by
 * forwarding their anonymous-auth JWT. All queries are then bound by RLS to
 * that user's own rows — there is no service_role key anywhere.
 *
 * Returns null when Supabase isn't configured OR no Authorization header is
 * present, in which case callers fall back to the local JSON store.
 *
 * Env is read lazily (not at import time) so it works after dotenv.config().
 */
export function supabaseForRequest(authHeader?: string): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon || !authHeader) return null;

  return createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}
