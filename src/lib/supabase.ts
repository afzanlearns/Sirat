import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * The Supabase client, or `null` when env vars are absent. When null, the app
 * runs with no auth (localStorage id + JSON store) — the zero-config fallback.
 * Sessions persist to localStorage by default, so the app is stateful across
 * reloads and restarts.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseEnabled = supabase !== null;

// ── Session helpers ────────────────────────────────────────────────────────────
export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function currentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

/** Subscribe to sign-in/out. Returns an unsubscribe fn. */
export function onAuthChange(cb: (userId: string | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user?.id ?? null);
  });
  return () => data.subscription.unsubscribe();
}

// ── Email + password auth ──────────────────────────────────────────────────────
export interface AuthResult {
  ok: boolean;
  /** True when signup succeeded but the user must confirm their email first. */
  needsConfirmation?: boolean;
  error?: string;
}

export async function signUpEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Auth is not configured." };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };
  // If the project requires email confirmation, there's no session yet.
  if (!data.session) return { ok: true, needsConfirmation: true };
  return { ok: true };
}

export async function signInEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Auth is not configured." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Start Google OAuth. On success the browser redirects to Google and back to the
 * app, where supabase-js picks up the session and the bootstrap routes the user.
 * Requires the Google provider to be enabled in the Supabase dashboard (with a
 * Google Cloud OAuth client) — until then this returns a clear error.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Auth is not configured." };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) {
    const notEnabled = /not enabled|unsupported provider/i.test(error.message);
    return {
      ok: false,
      error: notEnabled
        ? "Google sign-in isn't enabled yet. Enable it in Supabase → Authentication → Providers → Google."
        : error.message,
    };
  }
  return { ok: true };
}

// ── API auth header (server acts as the user under RLS) ─────────────────────────
export async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
