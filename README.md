# Sirat — Revert Learning Roadmap

A guided learning companion for new Muslims. Sirat asks you six diagnostic questions, then builds a personalised learning roadmap computed from a real directed acyclic graph (DAG) of topics. As you complete topics, the roadmap updates live, unlocking exactly the topics your completed prerequisites make available.

> **Sirat** (صِرَاط) — Arabic for "path" or "way." The opening chapter of the Quran asks God for guidance to *the straight path*.

---

## Quick Start

You need two terminals — one for the API server, one for the frontend.

```bash
# Terminal 1 — API (port 3001)
cd server
npm install
npm run dev

# Terminal 2 — Frontend (port 5173)
cd ..          # back to Sirat root
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

### Optional: Enable Groq AI diagnostic mapping

```bash
cp server/.env.example server/.env
# Edit server/.env and set GROQ_API_KEY=your_key_here
```

Without a key, the app is fully functional — users simply start with all prerequisite-free topics unlocked rather than having their prior knowledge pre-seeded by the AI.

---

## What the App Does

1. **Onboarding** — A quiet landing screen. One button: BEGIN.
2. **Diagnostic** — Six questions, one at a time, about the user's background and interests.
3. **Groq mapping** *(optional)* — After the diagnostic, Llama 3.3-70B maps the user's answers to a set of "already known" topic IDs from the topic list. These are pre-marked as completed so experienced users don't have to backfill basics.
4. **Roadmap** — A vertical scrolling path of 41 topic nodes. Each node is `locked`, `unlocked` (ready), or `completed`. The state is computed from a DAG — not a static order.
5. **Topic Detail** — Full description, category, difficulty, and a link to a real external resource.
6. **Mark Complete** — Clicking this marks the topic done, re-runs the frontier algorithm, and returns a `newlyUnlocked` diff that drives the animation on exactly the right nodes.

---

## Project Structure

```
Sirat/
│
├── src/                          ← Frontend (React 19 + TypeScript + Vite)
│   ├── App.tsx                   ← Screen router, API calls, userId management
│   ├── types.ts                  ← Shared frontend types (Screen, etc.)
│   ├── data.ts                   ← Legacy mock data (no longer used by the app)
│   └── components/
│       ├── Onboarding.tsx        ← Landing screen
│       ├── Diagnostic.tsx        ← Single-question diagnostic view
│       ├── Roadmap.tsx           ← The main path view (vertical spine layout)
│       ├── TopicDetail.tsx       ← Topic description + resource + complete button
│       └── Complete.tsx          ← Congratulations screen
│
├── server/                       ← Backend (Node.js + Express + TypeScript)
│   ├── data/
│   │   ├── topics.json           ← 41 curated topics with prerequisite edges
│   │   └── db.json               ← Auto-created; stores user progress (JSON)
│   ├── scripts/
│   │   └── validate-dag.ts       ← Run `npm run validate` to check for cycles
│   └── src/
│       ├── types.ts              ← Topic, UserProgress, RoadmapNode interfaces
│       ├── frontier.ts           ← Core DAG algorithm (computeFrontier, newlyUnlocked diff)
│       ├── db.ts                 ← Read/write db.json helpers
│       ├── groq.ts               ← Groq/Llama integration (dynamic import, safe fallback)
│       └── index.ts              ← Express app + all API routes
│
├── index.html
├── package.json                  ← Frontend deps
└── vite.config.ts
```

---

## Architecture

### The Core Idea: The Frontier Algorithm

The roadmap is **not** a static ordered list. It is computed from a graph.

Each topic has a `prerequisites` array of other topic IDs. The frontier algorithm checks, for every topic, whether all its prerequisites are in the user's `completedTopicIds` set:

```typescript
// server/src/frontier.ts
function computeFrontier(topics, completedIds) {
  for (const topic of topics) {
    if (completedIds.has(topic.id)) → "completed"
    else if (every prerequisite is in completedIds) → "unlocked"
    else → "locked"
  }
}
```

When a user completes a topic, we run the frontier twice — before and after — and diff the results to find exactly which nodes just transitioned from `locked` → `unlocked`. This diff (`newlyUnlocked: string[]`) is returned in the API response so the frontend can animate precisely those nodes.

This is deterministic code. No LLM is involved in sequencing. The graph is real.

### Data Flow

```
Browser                           Express API                    Data
──────                            ───────────                    ────
localStorage userId ──────────►  POST /diagnostic/start    ◄── topics.json
                                  POST /diagnostic/answer   ──► db.json
                                  POST /diagnostic/complete ──► Groq API (optional)
                                                            ──► db.json (seed completed)
                                  GET  /roadmap/:userId     ──► frontier algorithm
                                  GET  /topic/:topicId      ◄── topics.json
                                  POST /topic/:id/complete  ──► frontier diff
                                                            ──► newlyUnlocked[]
                                                            ──► animate those nodes
```

### User Identity

No login system. On first load, `App.tsx` generates a random `userId` and stores it in `localStorage`. The backend keys all user state against this ID. To reset your path, clear localStorage.

---

## API Reference

All endpoints are prefixed with `/api` and served on port `3001`.

| Method | Route | Body | Response |
|--------|-------|------|----------|
| `GET` | `/health` | — | `{ ok: true, topics: 41 }` |
| `POST` | `/diagnostic/start` | `{ userId }` | `{ question, total }` |
| `POST` | `/diagnostic/answer` | `{ userId, questionId, answer }` | `{ done, question?, questionIndex?, total? }` |
| `POST` | `/diagnostic/complete` | `{ userId }` | `{ done, seededTopicIds, roadmap }` |
| `GET` | `/roadmap/:userId` | — | `{ nodes[], connections[] }` |
| `GET` | `/topic/:topicId` | — | Full topic object |
| `POST` | `/topic/:topicId/complete` | `{ userId }` | `{ nodes[], connections[], newlyUnlocked[] }` |

### Response shapes

**Node object** (inside `nodes[]`):
```typescript
{
  topicId: string;
  status: "locked" | "unlocked" | "completed";
  title: string;
  category: "Aqeedah" | "Fiqh" | "Seerah" | "Ibadah" | "Quran" | "Akhlaq";
  difficulty: 1 | 2 | 3;   // 1=Foundational, 2=Intermediate, 3=Advanced
}
```

**Connections** — array of `[fromTopicId, toTopicId]` edges derived from prerequisites.

---

## The Topic Graph

Topics live in [`server/data/topics.json`](server/data/topics.json). Each entry:

```json
{
  "id": "tawhid-basics",
  "title": "The Concept of God in Islam (Tawhid)",
  "description": "...",
  "category": "Aqeedah",
  "difficulty": 1,
  "prerequisites": [],
  "resource": {
    "title": "Tawhid: The Concept of God in Islam",
    "source": "Yaqeen Institute",
    "url": "https://..."
  }
}
```

### Current topic map (41 nodes)

| Category | Count | Example Topics |
|----------|-------|----------------|
| **Aqeedah** (Belief) | 10 | Tawhid, Six Articles of Faith, Prophethood, Qadr, Tawbah |
| **Ibadah** (Worship) | 7 | Five Pillars, Salah, Wudu, Zakat, Sawm, Hajj, Dhikr |
| **Fiqh** (Law) | 5 | Shariah intro, Halal & Haram, Prayer times, Friday Prayer, Advanced Fiqh |
| **Quran** | 5 | Intro, Preservation, Arabic Script, Tajweed, Tafsir |
| **Seerah** (History) | 6 | Prophet overview, Meccan period, Madinan period, Companions, Islamic calendar, Civilisation |
| **Akhlaq** (Character) | 8 | Islamic character, Patience, Doubt, Community, Navigating identity, Spiritual excellence |

### Adding a topic

1. Open `server/data/topics.json`
2. Add your entry with a unique `id` and correct `prerequisites` (use IDs of existing topics)
3. Run `npm run validate` in the `server/` directory to verify no cycles were introduced
4. Restart the server — topics are loaded on startup

---

## Design System

Sirat follows a strict **Brutalist-minimal** aesthetic. These rules are non-negotiable:

| Rule | Detail |
|------|--------|
| **Zero border-radius** | No rounded corners anywhere |
| **No shadows or gradients** | Borders for separation only |
| **No decorative icons** | Line icons only if needed, monochrome |
| **Geist Mono everywhere** | Headers, body, labels, numbers — always monospace |
| **Uppercase tracking** | Section labels and headings use `text-transform: uppercase` + `letter-spacing` |
| **Generous whitespace** | Calm companion, not a data dashboard |

### Colour palette

| Token | Hex | Role |
|-------|-----|------|
| `--bg` | `#0A1F1A` | Base canvas — near-black, deep green |
| `--surface` | `#122B24` | Cards, panels |
| `--primary` | `#0B6E5A` | Buttons, unlocked nodes, CTAs |
| `--secondary` | `#D5B38E` | Body text on dark, completed nodes, warm accents |
| `--muted` | `#3D4A45` | Locked nodes, disabled states |
| `--border` | `#1E332C` | Hairline dividers, card edges |
| `--text-primary` | `#F2EDE6` | Main headings and body copy |
| `--text-muted` | `#8B9B94` | Secondary/meta text |

### Motion

- Standard transitions: `150ms linear` or `ease-out` — snappy, mechanical
- Roadmap re-sequencing: `400ms ease-out` — the one hero interaction, given time to breathe
- No spring/bounce curves anywhere

---

## Development Notes

### TypeScript

Both the frontend and server are fully typed. Run type checks with:

```bash
# Frontend
npx tsc --noEmit

# Server
cd server && npx tsc --noEmit
```

### Validate the topic DAG

Before adding topics in a hackathon context, always validate:

```bash
cd server
npm run validate
# ✅ DAG validation passed — 41 topics, no cycles, all prerequisites valid.
```

This catches both circular dependencies and references to non-existent topic IDs.

### Resetting a user

Delete the relevant entry from `server/data/db.json`, or clear `localStorage` in the browser (`localStorage.removeItem('sirat_user_id')`).

---

## Contributing

### What needs doing

- [ ] **Groq API key** — get a free key from [console.groq.com](https://console.groq.com) and add to `server/.env` for the AI diagnostic mapping to work
- [ ] **More topics** — the graph has 41 nodes; contributions of well-researched topics with accurate prerequisites and real resource URLs are the most valuable contribution
- [ ] **Mobile layout** — the current layout is designed desktop-first; a responsive pass on `Roadmap.tsx` would improve the experience on phones
- [ ] **Geist Mono font loading** — currently falls back to system monospace; add the Google Fonts import to `index.html` for the intended typeface

### Pull request checklist

- [ ] Run `npm run validate` in `server/` — zero errors
- [ ] Run `npx tsc --noEmit` in both root and `server/` — zero errors
- [ ] No `border-radius` introduced anywhere
- [ ] No gradients, shadows, or filled icons
- [ ] New topics have real external resource URLs (no placeholder links)

---

## Deployment

This is a hackathon project — not yet configured for production. For a quick demo deployment:

- **Backend**: Deploy `server/` to Railway, Render, or Fly.io — it's a plain Node process with no external DB dependency (just a JSON file)
- **Frontend**: `npm run build` produces `dist/` — deploy to Vercel or Netlify, updating the `API` constant in `App.tsx` to point to your deployed backend URL

---

## Credits

**Concept & build**: Afzan Khan  
**Stack**: React 19 + TypeScript + Vite (frontend) · Node.js + Express + TypeScript (backend)  
**AI**: Groq Llama 3.3-70B (diagnostic mapping only — all roadmap logic is deterministic)  
**Content**: Topics sourced from Yaqeen Institute, SeekersGuidance, IslamReligion.com, Bayyinah Institute, and primary Islamic texts
