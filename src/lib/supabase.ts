import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * The Supabase client, or `null` when env vars are absent. Keeping this nullable
 * preserves Sirat's "runs with zero config" property — every caller must handle
 * the null case and fall back to the plain Express API.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseEnabled = supabase !== null;

let anonUserId: string | null = null;
let anonInFlight: Promise<string | null> | null = null;

/**
 * Ensure an anonymous-auth session exists and return its stable user id.
 * Idempotent: reuses an existing session and de-duplicates concurrent calls.
 * Returns null when Supabase isn't configured or sign-in fails.
 */
export async function ensureAnonUser(): Promise<string | null> {
  if (!supabase) return null;
  if (anonUserId) return anonUserId;
  if (anonInFlight) return anonInFlight;

  anonInFlight = (async () => {
    const { data: existing } = await supabase.auth.getSession();
    if (existing.session?.user) {
      anonUserId = existing.session.user.id;
      return anonUserId;
    }
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      console.warn("[supabase] anonymous sign-in failed:", error?.message);
      return null;
    }
    anonUserId = data.user.id;
    return anonUserId;
  })();

  return anonInFlight;
}

/**
 * Authorization header carrying the user's anon-auth JWT, for the Express API to
 * act as the user under RLS. Empty object when Supabase/auth is unavailable, so
 * the server transparently falls back to its JSON store.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
