# Spec 02 — Real-time data with Supabase

Status: **provisioned; integrating** · Author: build session · Project ref: `ofyeblxyqhfakjbimcgr`

> **Revision (post-provisioning):** the Supabase MCP does not expose the `service_role`
> secret (by design). We therefore drop the "server holds service_role" model in favour of
> a **secret-free** one: **anonymous-auth JWT + RLS**. The browser signs in anonymously and
> either writes its own rows directly (governed by RLS), or forwards its JWT to Express which
> acts as that user. No god-key exists anywhere — strictly more secure. Sections below are
> annotated where this changes them.
>
> **Phased delivery:** Phase A (now) — `connect_requests` (realtime status) + `masjids`
> directory via browser-direct Supabase. Phase B (later) — migrate `progress`/frontier using
> server-side JWT-forwarding.

---

## 1. Goal

Replace the fragile, single-process JSON stores (`db.json`, `connect-requests.json`, `masjids.json`) with a real Postgres database, and add **real-time** updates that a chatbot fundamentally cannot provide. Concretely: when a human triages a mentor/buddy request, the revert's screen updates **live** — no refresh.

This deepens Sirat's core stance: the DAG is deterministic code, Clarity is human-vetted, prayer times are real API data, and now community state is **real, shared, live data**. The AI never touches any of it.

### In scope
- Move `progress`, `connect_requests`, and `masjids` into Supabase Postgres.
- Real-time subscription to a user's own `connect_requests.status`.
- Secure per-user access via **anonymous auth + Row Level Security (RLS)**.

### Out of scope (stays as static JSON, by design)
- `topics.json`, `clarity-cards.json`, `masjid-etiquette.json` — vetted content, not user state. Serving these from files is correct and auditable. No reason to move them.
- Prayer times — already real external data.

---

## 2. Architecture: who talks to Supabase  *(revised — secret-free)*

There is **no `service_role` key** in the system. Everything is governed by RLS keyed on
`auth.uid()` from an anonymous-auth JWT.

| Concern | Who | Key used |
|---|---|---|
| **connect_requests** insert + realtime status read (Phase A) | Browser (direct) | publishable key + anon-auth JWT, bound by RLS |
| **masjids** directory read (Phase A) | Browser (direct) | publishable key (public-read policy) |
| **progress** read/write + frontier (Phase B) | Express, acting **as the user** | publishable key + the user's forwarded JWT (`Authorization: Bearer …`), bound by RLS |

Every write is scoped to the caller's own rows by Postgres itself. The publishable key is safe
to ship to the browser; a leaked publishable key can do nothing a signed-in user couldn't
already do to their own data.

---

## 3. Identity: anonymous auth

Today identity is a random `localStorage` string with no auth, so RLS can't scope by user. We adopt **Supabase Anonymous Sign-in** — frictionless (no login UI), but gives each browser a stable `auth.uid()` (a real JWT) that RLS can key on.

```ts
// browser, once on load
const { data: { session } } = await supabase.auth.signInAnonymously()
const userId = session.user.id   // stable uuid, replaces the localStorage random id
```

- The server receives `userId` (the anon uuid) on API calls exactly as it does today — minimal change to existing routes.
- Existing `localStorage`-only users are ephemeral test data; **no migration of user rows needed** for the hackathon. `masjids` content **is** migrated (seeded).

> Trade-off: anonymous auth ties a user to a browser/session. A future magic-link upgrade (`supabase.auth.linkIdentity`) can promote an anon user to a permanent account without losing data. Documented as a later enhancement.

---

## 4. Schema

```sql
-- 4.1 progress: one row per user
create table public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_topic_ids text[] not null default '{}',
  diagnostic_answers jsonb not null default '{}',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.2 connect_requests: mentor / buddy / visit requests (the realtime driver)
create type public.connect_type as enum ('buddy', 'mentor', 'visit');
create type public.request_status as enum ('new', 'matched', 'met', 'closed');

create table public.connect_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  city text not null default '',
  contact_method text not null,
  type public.connect_type not null default 'buddy',
  message text not null default '',
  status public.request_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index connect_requests_user_idx on public.connect_requests(user_id);

-- 4.3 masjids: real, verified directory (replaces the sample JSON)
create table public.masjids (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  area text not null default '',
  revert_friendly boolean not null default false,
  new_muslim_class boolean not null default false,
  womens_facility boolean not null default false,
  languages text[] not null default '{}',
  note text not null default '',
  website text not null default '',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index masjids_city_idx on public.masjids(city);
```

---

## 5. Row Level Security

RLS is **on** for every table. The `service_role` key used by the server bypasses RLS; the browser (anon JWT) is bound by these policies.

```sql
alter table public.progress enable row level security;
alter table public.connect_requests enable row level security;
alter table public.masjids enable row level security;

-- progress: a user sees/updates only their own row
create policy "own progress read"   on public.progress
  for select using (auth.uid() = user_id);

-- connect_requests: a user reads only their own (enables secure realtime)
create policy "own requests read"    on public.connect_requests
  for select using (auth.uid() = user_id);

-- masjids: public read (directory is public content)
create policy "masjids public read"  on public.masjids
  for select using (true);
```

Writes are intentionally **not** granted to `anon`/`authenticated` — all mutations go through the Express server with the `service_role` key. This is the simplest secure posture.

---

## 6. Real-time

Enable Postgres change broadcasts and let the browser subscribe to its own request rows.

```sql
-- add the table to the realtime publication
alter publication supabase_realtime add table public.connect_requests;
```

```tsx
// browser — verified pattern from Supabase docs (Context7 /supabase/supabase)
useEffect(() => {
  const channel = supabase
    .channel('my-requests')
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'connect_requests',
        filter: `user_id=eq.${userId}` },
      (payload) => setStatus(payload.new.status))   // "A mentor has been assigned to you"
    .subscribe()
  return () => { channel.unsubscribe() }
}, [userId])
```

**Demo flow:** user submits a mentor request → an admin (Supabase Studio, or a tiny admin route) flips `status` to `matched` → the user's "Find Your People" tab updates instantly to *"A mentor has been assigned — they'll be in touch."*

---

## 7. Server changes

- Add `@supabase/supabase-js`; create `server/src/supabase.ts` exporting a client built from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
- Rewrite the data layer to use Supabase instead of file reads/writes:
  - `db.ts` → `progress` table (`getOrCreateUser`, `saveAnswer`, `seedCompletedTopics`, `completeTopic`). Same function signatures — routes in `index.ts` are largely untouched.
  - `masjid.ts` `getDirectory` → `select` from `masjids`; `saveConnectRequest` → `insert(...).select()`.
- Keep a **JSON fallback path** guarded by an env flag (`USE_SUPABASE`) so the app still runs with zero config for anyone cloning the repo (mirrors the existing Groq "safe fallback" philosophy).

Insert pattern (from Context7 docs — v2 requires `.select()` to return the row):
```ts
const { data, error } = await supabase
  .from('connect_requests')
  .insert({ user_id, name, city, contact_method, type, message, status: 'new' })
  .select()
  .single()
```

## 8. Client changes

- Add `@supabase/supabase-js`; `src/lib/supabase.ts` from `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- On load: `signInAnonymously()`; use the returned uuid as `userId` (replaces `getOrCreateUserId`).
- `MasjidBridge` "Find Your People" tab subscribes to the user's `connect_requests` and shows live status.
- **Also fix the hardcoded `const API = "http://localhost:3001/api"`** → `import.meta.env.VITE_API_BASE` (needed for any deploy; long-flagged).

---

## 9. Environment variables

```bash
# server/.env
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role>     # server only — NEVER shipped to the browser
USE_SUPABASE=true

# .env (frontend, Vite)
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable/anon>
VITE_API_BASE=http://localhost:3001/api
```

`.env.example` files updated for both. Service-role key is **server-side only**.

---

## 10. Rollout steps

1. Provision hosted Supabase project (via MCP). ← next action
2. Apply migration: types, tables, indexes, RLS policies, realtime publication (§4–6).
3. Seed `masjids` with verified real listings (replace the sample set).
4. Add server `supabase.ts` + rewrite data layer behind `USE_SUPABASE`; keep JSON fallback.
5. Add client `supabase.ts` + anonymous auth + realtime subscription in `MasjidBridge`.
6. Env vars + `.env.example` + `VITE_API_BASE` fix.
7. Verify: submit request → flip status in Studio → live update on screen.
8. Update `CLAUDE.md` (data layer, env vars, realtime).

## 11. Risks / open questions

- **Cost:** hosted Supabase free tier is sufficient for the hackathon; confirm org has capacity.
- **Anonymous-auth cleanup:** anon users accrue; fine for a demo, prune later.
- **Masjid data provenance:** verified listings must be real and checked (same review bar as Islamic content). Until then keep `verified=false` and the UI sample banner.
- **Offline writes:** connect-request submission requires network; acceptable (it's a human hand-off). Reads (directory, prayer, clarity) remain SW-cached.
