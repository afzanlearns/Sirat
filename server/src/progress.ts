import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProgress } from "./types.js";
import * as filedb from "./db.js";

/**
 * User-progress data layer with two backends behind one async interface:
 *  - Supabase Postgres (when `sb` is provided) — RLS-scoped to the caller.
 *  - Local JSON file (when `sb` is null) — the zero-config fallback (db.ts).
 *
 * The frontier/roadmap logic in index.ts is unchanged; only where progress is
 * read and written moves to Postgres.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(r: any): UserProgress {
  return {
    userId: r.user_id,
    completedTopicIds: r.completed_topic_ids ?? [],
    diagnosticAnswers: r.diagnostic_answers ?? {},
    startedAt: r.started_at,
    onboarded: r.onboarded ?? false,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const now = () => new Date().toISOString();

export async function getUser(
  sb: SupabaseClient | null,
  userId: string
): Promise<UserProgress | null> {
  if (!sb) return filedb.getUser(userId);
  const { data } = await sb.from("progress").select("*").eq("user_id", userId).maybeSingle();
  return data ? mapRow(data) : null;
}

export async function getOrCreateUser(
  sb: SupabaseClient | null,
  userId: string
): Promise<UserProgress> {
  if (!sb) return filedb.getOrCreateUser(userId);

  const existing = await sb.from("progress").select("*").eq("user_id", userId).maybeSingle();
  if (existing.data) return mapRow(existing.data);

  const inserted = await sb.from("progress").insert({ user_id: userId }).select().single();
  if (inserted.data) return mapRow(inserted.data);

  // Race or transient error — re-read before giving up.
  const again = await sb.from("progress").select("*").eq("user_id", userId).maybeSingle();
  if (again.data) return mapRow(again.data);
  throw new Error(`progress upsert failed: ${inserted.error?.message ?? "unknown"}`);
}

export async function saveAnswer(
  sb: SupabaseClient | null,
  userId: string,
  questionId: string,
  answer: string
): Promise<UserProgress> {
  if (!sb) return filedb.saveAnswer(userId, questionId, answer);
  const user = await getOrCreateUser(sb, userId);
  const diagnostic_answers = { ...user.diagnosticAnswers, [questionId]: answer };
  const { data, error } = await sb
    .from("progress")
    .update({ diagnostic_answers, updated_at: now() })
    .eq("user_id", userId)
    .select()
    .single();
  if (error || !data) throw new Error(`saveAnswer failed: ${error?.message ?? "unknown"}`);
  return mapRow(data);
}

export async function seedCompletedTopics(
  sb: SupabaseClient | null,
  userId: string,
  topicIds: string[]
): Promise<UserProgress> {
  if (!sb) return filedb.seedCompletedTopics(userId, topicIds);
  const user = await getOrCreateUser(sb, userId);
  const merged = Array.from(new Set([...user.completedTopicIds, ...topicIds]));
  const { data, error } = await sb
    .from("progress")
    .update({ completed_topic_ids: merged, updated_at: now() })
    .eq("user_id", userId)
    .select()
    .single();
  if (error || !data) throw new Error(`seedCompletedTopics failed: ${error?.message ?? "unknown"}`);
  return mapRow(data);
}

export async function completeTopic(
  sb: SupabaseClient | null,
  userId: string,
  topicId: string
): Promise<UserProgress> {
  if (!sb) return filedb.completeTopic(userId, topicId);
  const user = await getOrCreateUser(sb, userId);
  if (user.completedTopicIds.includes(topicId)) return user;
  const merged = [...user.completedTopicIds, topicId];
  const { data, error } = await sb
    .from("progress")
    .update({ completed_topic_ids: merged, updated_at: now() })
    .eq("user_id", userId)
    .select()
    .single();
  if (error || !data) throw new Error(`completeTopic failed: ${error?.message ?? "unknown"}`);
  return mapRow(data);
}

export async function setOnboarded(
  sb: SupabaseClient | null,
  userId: string
): Promise<UserProgress> {
  if (!sb) return filedb.setOnboarded(userId);
  await getOrCreateUser(sb, userId);
  const { data, error } = await sb
    .from("progress")
    .update({ onboarded: true, updated_at: now() })
    .eq("user_id", userId)
    .select()
    .single();
  if (error || !data) throw new Error(`setOnboarded failed: ${error?.message ?? "unknown"}`);
  return mapRow(data);
}
