import { supabase, isSupabaseEnabled, ensureAnonUser } from "./supabase";

const API = (import.meta.env.VITE_API_BASE as string) ?? "http://localhost:3001/api";

// ── Shared shapes (camelCase for the UI) ───────────────────────────────────────
export interface Masjid {
  id: string;
  name: string;
  city: string;
  area: string;
  revertFriendly: boolean;
  newMuslimClass: boolean;
  womensFacility: boolean;
  languages: string[];
  note: string;
  website: string;
  verified: boolean;
}

export type ConnectType = "buddy" | "mentor" | "visit";
export type RequestStatus = "new" | "matched" | "met" | "closed";

export interface ConnectRequest {
  id: string;
  type: ConnectType;
  city: string;
  contactMethod: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
}

export interface DirectoryFilter {
  city?: string;
  revertFriendly?: boolean;
  newMuslimClass?: boolean;
}

// ── Row mappers (snake_case DB → camelCase UI) ─────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
function mapMasjid(r: any): Masjid {
  return {
    id: r.id,
    name: r.name,
    city: r.city,
    area: r.area,
    revertFriendly: r.revert_friendly,
    newMuslimClass: r.new_muslim_class,
    womensFacility: r.womens_facility,
    languages: r.languages ?? [],
    note: r.note,
    website: r.website,
    verified: r.verified,
  };
}

function mapRequest(r: any): ConnectRequest {
  return {
    id: r.id,
    type: r.type,
    city: r.city,
    contactMethod: r.contact_method,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Directory ──────────────────────────────────────────────────────────────────
export async function loadDirectory(filter: DirectoryFilter): Promise<{
  masjids: Masjid[];
  cities: string[];
  sampleData: boolean;
  source: "supabase" | "api";
}> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.from("masjids").select("*");
    if (!error && data) {
      const all = data.map(mapMasjid);
      let list = all;
      if (filter.city) list = list.filter((m) => m.city.toLowerCase() === filter.city!.toLowerCase());
      if (filter.revertFriendly) list = list.filter((m) => m.revertFriendly);
      if (filter.newMuslimClass) list = list.filter((m) => m.newMuslimClass);
      list = [...list].sort(
        (a, b) => Number(b.revertFriendly) - Number(a.revertFriendly) || a.name.localeCompare(b.name)
      );
      const cities = Array.from(new Set(all.map((m) => m.city))).sort();
      return { masjids: list, cities, sampleData: all.every((m) => !m.verified), source: "supabase" };
    }
    // fall through to API on error
  }

  const params = new URLSearchParams();
  if (filter.city) params.set("city", filter.city);
  if (filter.revertFriendly) params.set("revertFriendly", "true");
  if (filter.newMuslimClass) params.set("newMuslimClass", "true");
  const res = await fetch(`${API}/masjid/directory?${params.toString()}`);
  const d = (await res.json()) as { masjids: Masjid[]; cities: string[]; sampleData: boolean };
  return { masjids: d.masjids, cities: d.cities, sampleData: d.sampleData, source: "api" };
}

// ── Submit a connection request ────────────────────────────────────────────────
export interface ConnectInput {
  userId: string; // localStorage id, used only for the API fallback
  name: string;
  city: string;
  contactMethod: string;
  type: ConnectType;
  message: string;
}

export async function submitConnect(
  input: ConnectInput
): Promise<{ ok: boolean; error?: string; request?: ConnectRequest }> {
  if (isSupabaseEnabled && supabase) {
    const uid = await ensureAnonUser();
    if (uid) {
      const { data, error } = await supabase
        .from("connect_requests")
        .insert({
          user_id: uid,
          name: input.name,
          city: input.city,
          contact_method: input.contactMethod,
          type: input.type,
          message: input.message,
        })
        .select()
        .single();
      if (!error && data) return { ok: true, request: mapRequest(data) };
      return { ok: false, error: error?.message ?? "Could not save your request." };
    }
    // uid null (anon sign-in disabled/failed) → fall through to API
  }

  const res = await fetch(`${API}/masjid/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: input.userId,
      name: input.name,
      city: input.city,
      contactMethod: input.contactMethod,
      type: input.type,
      message: input.message,
    }),
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: d.error ?? "Something went wrong. Please try again." };
  }
  return { ok: true };
}

// ── My requests + realtime (Supabase only) ─────────────────────────────────────
export async function loadMyRequests(): Promise<ConnectRequest[]> {
  if (!isSupabaseEnabled || !supabase) return [];
  const uid = await ensureAnonUser();
  if (!uid) return [];
  const { data } = await supabase
    .from("connect_requests")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapRequest);
}

/**
 * Subscribe to live changes on this user's own connect_requests (RLS-scoped).
 * Returns an unsubscribe function. No-op when Supabase isn't configured.
 */
export async function subscribeMyRequests(
  onChange: (r: ConnectRequest) => void
): Promise<() => void> {
  if (!isSupabaseEnabled || !supabase) return () => {};
  const uid = await ensureAnonUser();
  if (!uid) return () => {};
  const client = supabase;
  const channel = client
    .channel("my-connect-requests")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "connect_requests", filter: `user_id=eq.${uid}` },
      (payload) => {
        if (payload.new && Object.keys(payload.new).length) onChange(mapRequest(payload.new));
      }
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

export const communitySource: "supabase" | "api" = isSupabaseEnabled ? "supabase" : "api";
