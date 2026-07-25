# Sirat RAG service (Ask section)

Retrieval-Augmented Islamic Q&A that powers the app's **Ask** tab. A vector search over the
Qur'an (English) and authentic Hadith, with answers **generated from the retrieved
sources** (not invented) and cited to quran.com / sunnah.com.

## Run

```bash
cd rag
python3 -m venv venv
./venv/bin/pip install -r requirements.txt        # pulls torch — a few minutes
GROQ_API_KEY=your_groq_key ./venv/bin/uvicorn rag_api:app --host 0.0.0.0 --port 8000
```

First start downloads the `all-MiniLM-L6-v2` embedding model (~90 MB) and loads the
FAISS indices; `GET /health` reports `initialized` once ready.

## API

- `POST /query` — `{ query, source_type: "quran"|"hadith"|"both"|"auto", top_k? }`
  → `{ query, answer, source_type, processing_time, references_count, alternatives_used }`
- `GET /health` — readiness

Sirat's Express server proxies this at `POST /api/ask` (configurable via `RAG_URL`,
default `http://localhost:8000`).

## Env

| Var | Purpose |
|-----|---------|
| `GROQ_API_KEY` | Preferred generation LLM (Llama 3.3 70B via Groq) |
| `GROQ_MODEL` | Override Groq model (default `llama-3.3-70b-versatile`) |
| `GEMINI_API_KEY` | Optional — used only if Groq key absent |

> The index files (`*.index`, `processed_hadith/`) are large binaries from HidayahAI.
> Answers are AI-generated from retrieved scripture; the UI reminds users to verify
> rulings with a qualified scholar.
