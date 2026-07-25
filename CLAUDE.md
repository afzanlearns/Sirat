# CLAUDE.md

Guidance for Claude (and any AI assistant) working in the **Sirat** repository.

---

## ⚠️ Working agreement — read first

**Suggest, then ask. Do not change without confirmation.**

- When you see something worth improving, **propose it as a suggestion first** — explain what and why. Do **not** silently edit.
- **Ask for explicit approval before changing existing files**, especially anything touching Islamic content, the DAG, or the design system.
- Adding *new* things (a new Clarity Card, a new topic, a new component) is welcome — but still **describe what you intend to add and ask before writing it**, unless the user has already asked for exactly that.
- Prefer small, reviewable changes. One concern at a time.
- Never fabricate Islamic rulings, source URLs, hadith references, masjid details, or data. If unsure, say so and defer to a human.
- All Islamic content must be reviewed by a knowledgeable person before it ships. Flag anything you author for that review.

---

## What Sirat is

**Sirat** (صِرَاط — "the path") is a calm, guided learning companion for **new Muslims (reverts) and beginners**. It is built for the **Algorism Build Hackathon — Community (Ummah) track**.

The guiding principle: a revert is not "a smaller practising Muslim" — they are a person mid-upheaval facing four wounds — **overwhelm, isolation, fear-of-error, and distrust**. Every feature maps to closing one of those wounds, and the app is designed to eventually make itself unnecessary (hand the user to real teachers and community, then step back).

### Core stance: Sirat is NOT an LLM wrapper

This is a deliberate architectural commitment, and it's a selling point:

- **Sequencing is pure deterministic code** — the roadmap is computed from a real DAG, never by an LLM.
- **Ask is retrieval-grounded, not free generation** — answers are composed **only from
  authentic Qur'an + Hadith retrieved from FAISS** (HidayahAI), cited, with a "verify with a
  scholar" reminder. This is the deliberate difference from raw ChatGPT: the model is bound
  to real sources, and the sources are the value.
- **The Masjid Bridge is real-world data + human connection** — a curated directory, deterministic etiquette, and persisted human-triaged requests.
- **Prayer times are real API data** (Aladhan), and community state is real DB rows (Supabase).

When adding features, preserve this. If a feature could be "just ask ChatGPT," ground it in
real data/retrieval or reconsider it. Keep religious output cited and scholar-deferring.

---

## Architecture

**Three processes:** frontend (Vite :5173), API (Express :3001), RAG (FastAPI :8000).

```
Sirat/
├── src/                    Frontend — React 19 + TypeScript + Vite 8 (PWA)
│   ├── App.tsx             Tab/shell router, API calls, userId + anon-auth
│   ├── main.tsx            Entry + service-worker registration (prod only)
│   ├── types.ts            Screen/Tab union type
│   ├── data.ts             LEGACY mock data — unused (lint warnings; leave it)
│   ├── ui/Shell.tsx        Persistent bottom-tab nav (Path·Ask·Pray·People·You)
│   ├── screens/
│   │   ├── Home.tsx          Path tab — focal "next step" + the path (NEW design)
│   │   └── Profile.tsx       You tab — progress + account
│   ├── lib/
│   │   ├── supabase.ts       Client (nullable), anon sign-in, authHeaders()
│   │   ├── community.ts      Directory + connect + realtime (Supabase ⇄ API fallback)
│   │   └── prayer.ts         Aladhan fetch + timezone-correct next-prayer hook
│   └── components/
│       ├── Onboarding.tsx     Landing screen (pre-shell)
│       ├── Diagnostic.tsx     Single-question diagnostic (pre-shell)
│       ├── TopicDetail.tsx    Topic detail — pushes over the shell
│       ├── Complete.tsx       Congratulations screen
│       ├── ClarityCards.tsx   ASK tab — HidayahAI RAG (calls POST /api/ask)
│       ├── MasjidBridge.tsx   People tab — directory + etiquette + LIVE connect
│       ├── PrayerTimes.tsx    Pray tab — live prayer-times + countdown
│       ├── Roadmap.tsx        LEGACY — replaced by screens/Home (unused)
│       └── PrayerBanner.tsx   LEGACY — Home has its own prayer strip (unused)
│
├── server/                 API — Node.js + Express + TypeScript (tsx), :3001
│   ├── data/
│   │   ├── topics.json           41 curated topics with prerequisite edges
│   │   ├── clarity-cards.json    LEGACY — Ask now uses RAG, not these cards
│   │   ├── masjids.json          Sample directory — FALLBACK (Supabase is primary)
│   │   ├── masjid-etiquette.json 8-section "before you go" guide
│   │   └── db.json / connect-requests.json  Generated FALLBACK stores (gitignored)
│   ├── scripts/validate-dag.ts   `npm run validate`
│   └── src/
│       ├── frontier.ts     Core DAG algorithm (computeFrontier, newlyUnlocked diff)
│       ├── progress.ts     Progress data layer — dispatches Supabase ⇄ db.ts
│       ├── supabase.ts     Per-request client acting AS the user via their JWT
│       ├── groq.ts         Groq/Llama diagnostic seeding
│       ├── clarity.ts      LEGACY clarity-card routing (kept; Ask uses RAG now)
│       ├── masjid.ts       Directory, etiquette, connect-request store (fallback)
│       ├── prayer.ts       Aladhan prayer-times proxy (cached per city/day)
│       └── index.ts        Express app — routes incl. POST /api/ask (RAG proxy)
│
├── rag/                    ASK RAG service — Python + FastAPI (HidayahAI), :8000
│   ├── rag_api.py          FAISS retrieval + Groq generation → POST /query
│   ├── *.index             Qur'an + Hadith FAISS (verbatim from HidayahAI)
│   ├── processed_hadith/hadith_chunks.json  6,832 authentic hadith chunks
│   ├── requirements.txt · README.md
│   └── venv/               Python venv (gitignored)
│
├── public/                 PWA assets: manifest.webmanifest, sw.js, icons
├── specs/                  Research/strategy notes (02 = realtime-data plan)
└── .env / server/.env      Env (gitignored); *.example committed
```

### Identity
Two modes. **Without Supabase:** `App.tsx` generates a random `userId` in `localStorage`. **With Supabase (preferred):** the browser signs in **anonymously** (`ensureAnonUser()`), and that stable `auth.uid()` becomes the `userId`, forwarded to the API as a JWT. Reset = clear localStorage / sign out.

---

## Commands

```bash
# Frontend (repo root) — dev on :5173
npm install
npm run dev
npm run build         # tsc -b && vite build  (must pass — noUnusedLocals is ON)
npm run preview       # serve dist/ — REQUIRED to test the PWA/service worker
npm run lint          # oxlint
npx tsc -b --noEmit   # typecheck only

# Backend (server/) — API on :3001
cd server
npm install
npm run dev           # tsx watch src/index.ts
npm run validate      # validate the topic DAG (no cycles, valid prerequisites)
npx tsc --noEmit      # typecheck only

# RAG service (rag/) — Ask section, Python/FastAPI on :8000
cd rag
python3 -m venv venv
./venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu   # CPU torch first (avoids ~2.5GB CUDA)
./venv/bin/pip install -r requirements.txt
GROQ_API_KEY=<key> ./venv/bin/uvicorn rag_api:app --host 0.0.0.0 --port 8000     # first run downloads ~90MB model
```

**To run the full app:** three terminals — RAG (`:8000`, start first, wait for `API initialized successfully`), server (`:3001`), frontend (`npm run dev` :5173, or `npm run build && npm run preview` to exercise the PWA). Full team setup is in [README.md](README.md).

### Groq (required for full function)
Set `GROQ_API_KEY` in `server/.env` **and** pass it when launching the RAG service. It
powers two things: the onboarding diagnostic seeding, and the **Ask** RAG answer
generation (Llama 3.3 70B). Without it the app still runs — diagnostic seeds nothing, and
Ask returns raw retrieved sources instead of a composed answer.

### Optional: Supabase (real-time data)
Hosted project **`Sirat`** (ref `ofyeblxyqhfakjbimcgr`) is provisioned. To enable:
- **Frontend** `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable), `VITE_API_BASE`.
- **Server** `.env`: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable — **never** service_role).
- **One manual step:** enable **Authentication → Anonymous sign-ins** in the Supabase dashboard. Until then, anon sign-in fails and everything falls back to the JSON stores automatically.

Without these vars the app runs fully on the JSON file stores (zero-config). There is **no `service_role` key** anywhere — the server acts as the user via their forwarded anon-auth JWT, and Postgres RLS scopes every row.

---

## Features & how they work

### 1. The roadmap (DAG frontier) — deterministic
Each topic in `topics.json` has a `prerequisites` array. `frontier.ts` marks every topic `locked` / `unlocked` / `completed` by checking whether all prerequisites are in the user's completed set. On completion it runs the frontier before/after and diffs to return `newlyUnlocked[]` for precise animation. **No LLM touches sequencing.**

Add a topic → edit `topics.json` → `npm run validate` in `server/` → restart server.

### 2. Ask — HidayahAI RAG (Qur'an + authentic Hadith)
The **Ask** tab (`ClarityCards.tsx`) posts to `POST /api/ask`, which the Express server
proxies to the Python RAG service (`rag/rag_api.py`, port 8000). The RAG does FAISS vector
search over the **authentic** Qur'an (1,248 vectors) and Hadith (6,832 chunks) indices —
data copied **verbatim** from [HidayahAI](https://github.com/WasifSohail5/HidayahAI), never
edited — and has **Groq (Llama 3.3 70B)** compose a cited answer *from the retrieved
sources only*. The UI shows the source badge + reference count and a "verify with a
scholar" note.

- Our only change to the upstream code: generation runs on Groq (removed the leaked Gemini
  key; Gemini optional via `GEMINI_API_KEY`). **Do not modify the index files or retrieval
  logic** — that would break authenticity/consistency (index vectors must equal chunk count).
- **Legacy:** `clarity-cards.json` + `clarity.ts` (the old vetted-card router) are no longer
  used by the Ask UI. Left in place; safe to remove later.

### 3. Masjid Bridge (Ummah track) — real connection, not text
`MasjidBridge.tsx`, three tabs. Data goes through `src/lib/community.ts`, which prefers Supabase and falls back to the Express API.
- **Find a Masjid** — directory from the `masjids` table (public-read RLS), filters for revert-friendly / new-Muslim-class. Unverified rows are flagged `verified: false` and labelled in the UI.
- **Before You Go** — 8-section etiquette guide (`masjid-etiquette.json`), the "walk-in terror" fix, cached offline.
- **Find Your People** — buddy/mentor/visit request inserted into `connect_requests`, then a **live status list** (`AWAITING MATCH → MATCHED → MET`) via a Supabase realtime subscription on the user's own rows. This is the marquee "not a chatbot" moment: an admin flips `status` in Studio → the user's screen updates with no refresh.

### 4. Prayer times (real data) — daily-return hook
`prayer.ts` (server) proxies the **Aladhan API** (free, no key), cached per city/day. `src/lib/prayer.ts` computes the next prayer in the *timings' own timezone* (via `Intl`, correct even when travelling) and ticks a live countdown. Surfaced as a strip on the **Home** screen and the full **Pray** tab (`PrayerTimes`). Cached offline by the SW.

### 5. Data layer & realtime (Supabase) — secret-free
- **Progress** (`progress.ts`): the Express server builds a **per-request Supabase client carrying the user's anon-auth JWT** (`supabase.ts`), so RLS scopes every read/write. Frontier logic is unchanged; only persistence moved. Falls back to `db.ts` (JSON) when no token.
- **RLS everywhere; no `service_role` key exists.** Publishable key + `auth.uid()` policies only. `security advisor` returns zero findings.
- **Realtime** is enabled on `connect_requests` only. Schema/migrations live in Supabase (see `specs/02-realtime-data.md`).

### 6. PWA
`manifest.webmanifest` + `sw.js` (network-first app shell, network-first Clarity + prayer-times for offline, stale-while-revalidate for assets). Privacy-first fits reverts who hide their conversion. SW registers prod-only. Bump `CACHE` in `sw.js` when changing cached routes.

---

## API reference (all under `/api`, port 3001)

Progress routes read the `Authorization: Bearer <jwt>` header when present (Supabase path) and fall back to the JSON store otherwise.

| Method | Route | Purpose |
|--------|-------|---------|
| GET  | `/health` | `{ ok, topics }` |
| POST | `/diagnostic/start` · `/answer` · `/complete` | 6-question onboarding + Groq seed |
| GET  | `/roadmap/:userId` | Annotated DAG graph |
| GET  | `/topic/:topicId` | Full topic detail |
| POST | `/topic/:topicId/complete` | Mark done, return `newlyUnlocked[]` |
| POST | `/ask` | **Ask** — proxies the RAG `/query` (`RAG_URL`, default `:8000`) |
| GET  | `/clarity/*` · POST `/clarity/ask` | LEGACY vetted-card routes (Ask uses `/ask` now) |
| GET  | `/masjid/directory?city=&revertFriendly=&newMuslimClass=` | Filtered directory (fallback path) |
| GET  | `/masjid/etiquette` | Etiquette sections |
| POST | `/masjid/connect` | Persist a connection request (fallback path) |
| GET  | `/prayer-times?city=&country=&method=` | Real prayer times via Aladhan (cached) |

> Note: with Supabase enabled, the browser talks to `masjids` / `connect_requests` **directly** (RLS-scoped); the `/masjid/*` routes are the no-Supabase fallback.

---

## Design system — "Calm warm companion" (migrating from brutalist)

The app is **mid-redesign**. `src/index.css` now defines the new system; the shell +
`Home` + `Profile` + `Ask` use it. Several older screens (`Diagnostic`, `TopicDetail`,
`MasjidBridge`, `PrayerTimes`, `Onboarding`, `Complete`) are still the old brutalist inline
styles, re-skinned warmer by the token swap but not yet fully migrated. **When you touch an
old screen, migrate it to the new system.**

**New system (target):**
- **Type hierarchy:** `Fraunces` (serif) for headings via `.h1/.h2/.display`/`.serif`;
  `Instrument Sans` for body (the default); `Geist Mono` **only** for numbers/labels (`.num`, `.label`).
- **One accent:** lamp-gold `--accent #E4BC7C`, used sparingly (focal step, primary CTAs).
  Green `--green` for growth/completion. Most of the screen is neutral surface.
- **Depth:** warm dark surfaces + low-opacity borders (`--border` is rgba). Radius scale
  `--r-sm/md/lg/xl/pill`. Subtle only — no harsh lines, no heavy shadows.
- **One focal point per screen**; demote everything else (size + weight + color, not just size).
- **Motion:** `--dur` (200ms) with `--ease-out`; press feedback `scale(0.97)`. Respect
  `prefers-reduced-motion`.
- Styling is still **inline styles + CSS custom properties** (+ a few helper classes in
  `index.css`). No CSS framework, no styled-components.

Key tokens (see `src/index.css`): `--bg #0C1A15`, `--surface/-2/-3`, `--accent #E4BC7C`,
`--green #57A88E`, four text levels `--text-primary/2/muted/faint`, `--font-serif/sans/mono`.
Legacy aliases (`--primary`, `--secondary`, `--muted`) remain so old screens still render.

---

## Conventions & gotchas

- **`noUnusedLocals` / `noUnusedParameters` are ON** — the build fails on unused vars/imports. Keep imports tight.
- TypeScript strict on both sides. Server uses ESM with `.js` import specifiers (e.g. `from "./types.js"`) even though sources are `.ts` — match this.
- API base is `import.meta.env.VITE_API_BASE` (falls back to `http://localhost:3001/api`). Don't reintroduce hardcoded URLs.
- **Supabase env is read lazily** on the server (inside `supabaseForRequest`), not at import time — imports run before `dotenv.config()`. Follow this (same reason `groq.ts` reads env lazily).
- **Publishable key only** in code/env, both client and server. The `service_role` secret must never appear anywhere.
- Every Supabase feature must **degrade gracefully** when unconfigured or when anon sign-ins are off (fall back to the Express API / JSON store). Test both paths.
- **RAG data is sacred:** the files in `rag/` (`*.index`, `processed_hadith/hadith_chunks.json`)
  are HidayahAI's authentic Qur'an/Hadith, copied verbatim. **Never edit them.** The FAISS
  index vector count must equal the chunk count (currently 6,832 hadith / 1,248 Qur'an).
  Only `rag_api.py` was changed (Groq generation); keep retrieval logic intact.
- `src/data.ts` is **legacy and unused**; its lint warnings are pre-existing — do not "fix" or delete it without asking.
- `.env`, `db.json`, `connect-requests.json`, `rag/venv/` are gitignored; never commit them. `.env.example` files are committed.
- Git commits/pushes: only when the user asks. If on `master`, branch first.

---

## Before you finish any change

1. `npx tsc -b --noEmit` (root) and `cd server && npx tsc --noEmit` — both clean.
2. `npm run build` (root) — passes.
3. `npm run validate` (server) — if you touched `topics.json`.
4. New/old screens you touched use (or were migrated to) the **calm warm** system, not brutalist defaults.
5. RAG index/chunk files untouched; Ask answers stay cited + scholar-deferring.
6. New Islamic content flagged for human review; sources real, not invented.
7. You **proposed the change and got approval** before editing existing files.
