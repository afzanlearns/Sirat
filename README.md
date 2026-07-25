# Sirat — a calm learning companion for new Muslims

> **Sirat** (صِرَاط) — Arabic for "the path." Sirat helps reverts and beginners walk
> their first steps in Islam: a personalised learning **Path**, an **Ask** section that
> answers from the Qur'an and authentic Hadith (RAG), live **Prayer** times, a
> **People** (community/masjid) bridge, and a private **You** profile. It's an
> installable PWA and works offline.

Built for the **Algorism Build Hackathon — Community (Ummah) track**.

---

## The three services

Sirat runs as **three local processes**. You need all three for the full app.

| # | Service | Folder | Port | What it does |
|---|---------|--------|------|--------------|
| 1 | **API** (Node/Express) | `server/` | `3001` | Roadmap/DAG, diagnostic, prayer proxy, masjid, and the `/api/ask` proxy |
| 2 | **RAG** (Python/FastAPI) | `rag/` | `8000` | HidayahAI retrieval over Qur'an + Hadith; powers the **Ask** section |
| 3 | **Frontend** (React/Vite) | `.` (root) | `5173` | The PWA the user sees |

---

## Prerequisites

- **Node.js 18+** and npm
- **Python 3.10+** (3.12 tested)
- A **free Groq API key** → https://console.groq.com — **required** (used for the Ask
  answers *and* the onboarding diagnostic). Without it the app still runs, but Ask
  returns only raw sources and the diagnostic seeds nothing.
- *(optional)* A **Supabase** project — enables real-time community + cross-device
  progress. Without it, everything falls back to local JSON files (zero-config).
- *(optional)* A **Gemini API key** — an alternative generation model for Ask. Not
  needed; Groq is the default.

---

## Step-by-step setup

Clone, then set up each service. **Do this once per machine.**

```bash
git clone <your-repo-url> Sirat
cd Sirat
```

### 1) API server (`server/`, port 3001)

```bash
cd server
npm install
cp .env.example .env        # then edit .env — see “Environment” below
npm run dev                 # → http://localhost:3001   (tsx watch, auto-reloads)
```

Minimum `server/.env`:
```bash
GROQ_API_KEY=gsk_your_groq_key_here
PORT=3001
RAG_URL=http://localhost:8000
# Supabase is optional — leave blank to use the local JSON store:
# SUPABASE_URL=https://<ref>.supabase.co
# SUPABASE_ANON_KEY=sb_publishable_xxx
```

### 2) RAG service (`rag/`, port 8000) — Python venv

This is the **Ask** brain: it searches the authentic Qur'an + Hadith FAISS indices and
has Groq compose a cited answer. First run downloads a ~90 MB embedding model.

**macOS / Linux:**
```bash
cd rag
python3 -m venv venv
./venv/bin/pip install --upgrade pip

# Install CPU-only PyTorch FIRST — this avoids a ~2.5 GB CUDA download:
./venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu

# Then the rest of the RAG dependencies:
./venv/bin/pip install -r requirements.txt

# Run it (retrieval is local; generation uses your Groq key):
GROQ_API_KEY=gsk_your_groq_key_here ./venv/bin/uvicorn rag_api:app --host 0.0.0.0 --port 8000
```

**Windows (PowerShell):**
```powershell
cd rag
python -m venv venv
venv\Scripts\python -m pip install --upgrade pip
venv\Scripts\pip install torch --index-url https://download.pytorch.org/whl/cpu
venv\Scripts\pip install -r requirements.txt
$env:GROQ_API_KEY="gsk_your_groq_key_here"
venv\Scripts\uvicorn rag_api:app --host 0.0.0.0 --port 8000
```

**Wait for it to finish loading** — the first start downloads the model and loads the
indices. It's ready when the log prints `API initialized successfully`, or when:
```bash
curl http://localhost:8000/health
# {"status":"healthy","indices_loaded":true,"embedding_model_loaded":true}
```

> To use **Gemini** instead of Groq, set `GEMINI_API_KEY=...` and leave `GROQ_API_KEY`
> unset — Groq takes priority whenever both are present. No code change needed.

### 3) Frontend (root, port 5173)

```bash
cd ..            # back to the Sirat root
npm install
cp .env.example .env        # edit if you use Supabase; defaults work otherwise
npm run dev                 # → http://localhost:5173
```

Root `.env`:
```bash
VITE_API_BASE=http://localhost:3001/api
# Supabase (optional — must match server/.env):
# VITE_SUPABASE_URL=https://<ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
```

> **PWA / offline:** the service worker only registers in a production build. To test
> installability and offline, run `npm run build && npm run preview` instead of `npm run dev`.

### Running order (each in its own terminal)

Start **RAG first** (it takes longest to warm up), then the API, then the frontend:

```
Terminal 1:  cd rag    && GROQ_API_KEY=... ./venv/bin/uvicorn rag_api:app --port 8000
Terminal 2:  cd server && npm run dev
Terminal 3:  (root)      npm run dev
```

Open **http://localhost:5173**.

---

## Environment variables (reference)

**`server/.env`**
| Var | Required | Purpose |
|-----|----------|---------|
| `GROQ_API_KEY` | yes | Diagnostic mapping + Ask generation |
| `PORT` | no (3001) | API port |
| `RAG_URL` | no | RAG service URL (default `http://localhost:8000`) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | no | Persist progress to Postgres (publishable key only) |

**root `.env`** (Vite — bundled into the client, safe to expose)
| Var | Purpose |
|-----|---------|
| `VITE_API_BASE` | API base URL (default `http://localhost:3001/api`) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Realtime + anonymous auth |

**`rag/` (env at launch)**
| Var | Purpose |
|-----|---------|
| `GROQ_API_KEY` | Preferred generation model (Llama 3.3 70B via Groq) |
| `GROQ_MODEL` | Override model (default `llama-3.3-70b-versatile`) |
| `GEMINI_API_KEY` | Optional — used only if Groq key is absent |

### Optional: enable Supabase realtime
If you configure Supabase, also do this **one manual step** so realtime + anonymous
sign-in work: **Supabase dashboard → Authentication → Sign In / Providers → enable
“Anonymous sign-ins” → Save.** Until then, the app falls back to local JSON automatically.

---

## What the app does (the five tabs)

- **Path** — your personalised learning journey. One focal *next step* on top, then the
  full path (done → ready → upcoming). Sequencing is a real **DAG** computed in code — no
  LLM decides your order.
- **Ask** — ask anything about Islam; answers are **retrieved from the Qur'an and
  authentic Hadith** (HidayahAI RAG) and composed with citations, plus a reminder to
  verify rulings with a scholar.
- **Pray** — live prayer times for your city (Aladhan API) with a countdown to the next prayer.
- **People** — find a revert-friendly masjid, a “before you go” etiquette guide, and
  request a buddy/mentor (a real human follows up; live status when Supabase is on).
- **You** — your progress and account.

---

## Architecture

```
Sirat/
├── src/                 Frontend — React 19 + TypeScript + Vite (PWA)
│   ├── ui/Shell.tsx     Persistent bottom-tab navigation
│   ├── screens/         Home (Path), Profile (You)
│   ├── components/      Diagnostic, TopicDetail, ClarityCards (Ask/RAG), MasjidBridge, PrayerTimes…
│   └── lib/             supabase, community, prayer helpers
├── server/              API — Node + Express + TypeScript (tsx)
│   ├── src/             frontier (DAG), progress (Supabase⇄JSON), clarity, masjid, prayer, index
│   └── data/            topics.json, masjids.json, etiquette, clarity-cards.json
├── rag/                 Ask RAG service — Python + FastAPI (HidayahAI, Groq generation)
│   ├── rag_api.py       FAISS retrieval + LLM answer  →  POST /query
│   ├── *.index          Qur'an + Hadith FAISS indices (authentic, verbatim from HidayahAI)
│   └── requirements.txt
└── public/              PWA manifest, service worker, icons
```

### The Ask RAG service (HidayahAI)
Adapted from [HidayahAI](https://github.com/WasifSohail5/HidayahAI): FAISS vector search
over the English Qur'an (1,248 vectors) and authentic Hadith (6,832 chunks — Bukhari,
Muslim, Abu Dawud, Ibn Majah, Nasa'i, Tirmidhi). The index files are the author's
**verbatim, unmodified** data. Our only change: generation runs on **Groq** (your key)
instead of Gemini, and the leaked key the repo hardcoded was removed. Sirat's API proxies
it at `POST /api/ask`. See `rag/README.md`.

---

## The topic graph

Topics live in [`server/data/topics.json`](server/data/topics.json). Each has a
`prerequisites` array; the frontier algorithm marks every topic `locked` / `unlocked` /
`completed`. After editing topics, validate the DAG:

```bash
cd server && npm run validate   # checks for cycles and bad prerequisite IDs
```

---

## API reference (server, `/api`, port 3001)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/health` | liveness |
| POST | `/diagnostic/start` · `/answer` · `/complete` | onboarding (+ Groq seeding) |
| GET | `/roadmap/:userId` · `/topic/:topicId` | the path + topic detail |
| POST | `/topic/:topicId/complete` | mark done → `newlyUnlocked[]` |
| POST | `/ask` | **Ask** — proxies the RAG `/query` |
| GET | `/prayer-times?city=&country=` | live prayer times (Aladhan) |
| GET | `/masjid/directory` · `/masjid/etiquette` | community |
| POST | `/masjid/connect` | mentor/buddy request |

Progress routes read an optional `Authorization: Bearer <jwt>` header (Supabase path) and
fall back to the JSON store otherwise.

---

## Verifying / typechecks

```bash
# Frontend
npm run build          # tsc -b && vite build  (noUnusedLocals is ON)
npm run lint           # oxlint

# Server
cd server && npx tsc --noEmit && npm run validate
```

---

## Credits

**Concept & build:** Afzan Khan · **Ask RAG:** [HidayahAI](https://github.com/WasifSohail5/HidayahAI)
by Wasif Sohail (Qur'an + Hadith retrieval) · **Generation:** Groq Llama 3.3 70B ·
**Prayer times:** Aladhan API · **Content:** Yaqeen Institute, SeekersGuidance,
IslamReligion.com, and primary Islamic sources.

> Answers in **Ask** are AI-generated from retrieved scripture. Sirat points to knowledge;
> for a personal ruling, consult a qualified scholar.
