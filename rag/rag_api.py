from fastapi import FastAPI, HTTPException, Query, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import faiss
import json
import numpy as np
try:
    import google.generativeai as genai
except Exception:  # optional — only needed if using Gemini instead of Groq
    genai = None
from sentence_transformers import SentenceTransformer
import re
import time
import logging
import os
from typing import Optional, List, Dict, Any
from enum import Enum

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("islamic_truth_verifier_api")


# =========== Configuration ===========
class Settings:
    def __init__(self):
        # API configuration
        self.api_version = "1.0.0"
        self.api_title = "Islamic Truth Verifier API"
        self.api_description = "RAG-based chatbot for Islamic queries using Quran and authentic Hadith"

        # Model paths
        self.quran_index_path = "quran_english.index"
        self.quran_metadata_path = "quran_english_metadata.json"
        self.hadith_index_path = "hadith.index"
        self.hadith_metadata_path = "processed_hadith/hadith_chunks.json"

        # Generation LLM. Sirat already uses Groq, so we prefer it; Gemini optional.
        # NOTE: upstream hardcoded a leaked Gemini key here — removed for safety.
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
        self.groq_api_key = os.environ.get("GROQ_API_KEY", "")
        # 8b-instant has a much higher free-tier daily token limit than 70b, so
        # the Ask section stays available. Override with GROQ_MODEL if desired.
        self.groq_model = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")

        # Embedding model
        self.embedding_model = "all-MiniLM-L6-v2";

        # Default parameters
        # Fewer chunks per query → smaller prompts → far fewer tokens/day used.
        self.default_top_k = 7
        self.default_relevance_threshold = 0.6

        # CORS settings - Frontend ke liye
        self.allowed_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "*"  # Development ke liye, production mein restrict karna
        ]


settings = Settings()

# =========== API Definition ===========
app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# =========== Data Models ===========
class QuerySource(str, Enum):
    QURAN = "quran"
    HADITH = "hadith"
    BOTH = "both"
    AUTO = "auto"  # Let the system detect based on query content


class QueryRequest(BaseModel):
    query: str
    source_type: QuerySource = QuerySource.AUTO
    language: Optional[str] = None  # For future multilingual support
    top_k: Optional[int] = None


class QueryResponse(BaseModel):
    query: str
    answer: str
    source_type: str
    processing_time: float
    references_count: int
    alternatives_used: Optional[List[str]] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    indices_loaded: bool
    embedding_model_loaded: bool


# =========== Resource Loading ===========
# Setup loading state tracking
resource_state = {
    "quran_index": False,
    "hadith_index": False,
    "embedding_model": False,
    "initialized": False
}

# Resources to be loaded
quran_index = None
quran_metadata = None
hadith_index = None
hadith_metadata = None
model = None
gemini = None

# ── Provider-agnostic generation layer ────────────────────────────────────────
# Sirat already ships a Groq key, so Groq is preferred; Gemini is used only if a
# real key is supplied. If neither is set, retrieval still works and the endpoint
# returns the raw sourced Quran/Hadith context.
_groq_client = None
_gemini_model = None


def _init_llm():
    global _groq_client, _gemini_model
    _groq_client = None
    _gemini_model = None
    if settings.groq_api_key:
        try:
            from groq import Groq
            _groq_client = Groq(api_key=settings.groq_api_key)
            logger.info(f"Generation LLM: Groq ({settings.groq_model})")
            return
        except Exception as e:
            logger.warning(f"Groq init failed: {e}")
    if settings.gemini_api_key and genai is not None:
        try:
            genai.configure(api_key=settings.gemini_api_key)
            _gemini_model = genai.GenerativeModel(model_name="gemini-1.5-flash")
            logger.info("Generation LLM: Gemini 1.5 Flash")
            return
        except Exception as e:
            logger.warning(f"Gemini init failed: {e}")
    logger.warning("No generation LLM configured — returning raw retrieved context.")


def llm_ready() -> bool:
    return _groq_client is not None or _gemini_model is not None


def llm_generate(prompt: str) -> str:
    """Generate text with whichever provider is configured."""
    if _groq_client is not None:
        completion = _groq_client.chat.completions.create(
            model=settings.groq_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1024,
        )
        return (completion.choices[0].message.content or "").strip()
    if _gemini_model is not None:
        return _gemini_model.generate_content(prompt).text.strip()
    raise RuntimeError("No LLM configured")


def load_resources():
    """Load all required resources for the API"""
    global quran_index, quran_metadata, hadith_index, hadith_metadata, model, gemini, resource_state

    try:
        # Configure the generation LLM (Groq preferred, Gemini optional)
        _init_llm()

        # Load embedding model
        logger.info("Loading embedding model...")
        model = SentenceTransformer(settings.embedding_model)
        resource_state["embedding_model"] = True

        # Try to load Quran resources (optional for demo)
        try:
            logger.info("Loading Quran index...")
            quran_index = faiss.read_index(settings.quran_index_path)
            with open(settings.quran_metadata_path, "r", encoding="utf-8") as f:
                quran_metadata = json.load(f)
            resource_state["quran_index"] = True
            logger.info("Quran resources loaded successfully")
        except Exception as e:
            logger.warning(f"Quran resources not found: {e}")
            resource_state["quran_index"] = False

        # Try to load Hadith resources (optional for demo)
        try:
            logger.info("Loading Hadith index...")
            hadith_index = faiss.read_index(settings.hadith_index_path)
            with open(settings.hadith_metadata_path, "r", encoding="utf-8") as f:
                hadith_metadata = json.load(f)
            resource_state["hadith_index"] = True
            logger.info("Hadith resources loaded successfully")
        except Exception as e:
            logger.warning(f"Hadith resources not found: {e}")
            resource_state["hadith_index"] = False

        resource_state["initialized"] = True
        logger.info("API initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Error loading resources: {e}")
        # For demo purposes, still mark as initialized
        resource_state["initialized"] = True
        return False


# Map for hadith collections as used by sunnah.com
HADITH_COLLECTION_MAP = {
    "sahih bukhari": "bukhari",
    "bukhari": "bukhari",
    "sahih muslim": "muslim",
    "muslim": "muslim",
    "sunan abu dawood": "abudawud",
    "abu dawood": "abudawud",
    "dawud": "abudawud",
    "abu dawud": "abudawud",
    "jami at-tirmidhi": "tirmidhi",
    "tirmidhi": "tirmidhi",
    "tirmizi": "tirmidhi",
    "sunan an-nasai": "nasai",
    "nasai": "nasai",
    "nasa'i": "nasai",
    "sunan ibn majah": "ibnmajah",
    "ibn majah": "ibnmajah"
}

# A simplified version of SURAH_MAP for common surahs
SURAH_MAP = {
    "Al-Fatihah": 1, "Al-Baqarah": 2, "Ali 'Imran": 3, "An-Nisa": 4, "Al-Ma'idah": 5,
    "Al-An'am": 6, "Al-A'raf": 7, "Al-Anfal": 8, "At-Tawbah": 9, "Yunus": 10,
    "Hud": 11, "Yusuf": 12, "Ar-Ra'd": 13, "Ibrahim": 14, "Al-Hijr": 15,
    "An-Nahl": 16, "Al-Isra": 17, "Al-Kahf": 18, "Maryam": 19, "Ta-Ha": 20,
    "Al-Anbiya": 21, "Al-Hajj": 22, "Al-Mu'minun": 23, "An-Nur": 24, "Al-Furqan": 25,
    "Ash-Shu'ara": 26, "An-Naml": 27, "Al-Qasas": 28, "Al-Ankabut": 29, "Ar-Rum": 30,
    "Luqman": 31, "As-Sajdah": 32, "Al-Ahzab": 33, "Saba": 34, "Fatir": 35,
    "Ya-Sin": 36, "As-Saffat": 37, "Sad": 38, "Az-Zumar": 39, "Ghafir": 40,
    "Fussilat": 41, "Ash-Shura": 42, "Az-Zukhruf": 43, "Ad-Dukhan": 44, "Al-Jathiyah": 45,
    "Al-Ahqaf": 46, "Muhammad": 47, "Al-Fath": 48, "Al-Hujurat": 49, "Qaf": 50,
    "Adh-Dhariyat": 51, "At-Tur": 52, "An-Najm": 53, "Al-Qamar": 54, "Ar-Rahman": 55,
    "Al-Waqi'ah": 56, "Al-Hadid": 57, "Al-Mujadilah": 58, "Al-Hashr": 59, "Al-Mumtahinah": 60,
    "As-Saff": 61, "Al-Jumu'ah": 62, "Al-Munafiqun": 63, "At-Taghabun": 64, "At-Talaq": 65,
    "At-Tahrim": 66, "Al-Mulk": 67, "Al-Qalam": 68, "Al-Haqqah": 69, "Al-Ma'arij": 70,
    "Nuh": 71, "Al-Jinn": 72, "Al-Muzzammil": 73, "Al-Muddathir": 74, "Al-Qiyamah": 75,
    "Al-Insan": 76, "Al-Mursalat": 77, "An-Naba": 78, "An-Nazi'at": 79, "Abasa": 80,
    "At-Takwir": 81, "Al-Infitar": 82, "Al-Mutaffifin": 83, "Al-Inshiqaq": 84, "Al-Buruj": 85,
    "At-Tariq": 86, "Al-A'la": 87, "Al-Ghashiyah": 88, "Al-Fajr": 89, "Al-Balad": 90,
    "Ash-Shams": 91, "Al-Lail": 92, "Ad-Duha": 93, "Ash-Sharh": 94, "At-Tin": 95,
    "Al-Alaq": 96, "Al-Qadr": 97, "Al-Bayyinah": 98, "Az-Zalzalah": 99, "Al-Adiyat": 100,
    "Al-Qari'ah": 101, "At-Takathur": 102, "Al-Asr": 103, "Al-Humazah": 104, "Al-Fil": 105,
    "Quraish": 106, "Al-Ma'un": 107, "Al-Kawthar": 108, "Al-Kafirun": 109, "An-Nasr": 110,
    "Al-Masad": 111, "Al-Ikhlas": 112, "Al-Falaq": 113, "An-Nas": 114
}


# =========== Core Functions ===========
def detect_source_type(query):
    """Determine if the query is likely about Quran, Hadith, or both."""
    hadith_keywords = ["hadith", "hadees", "bukhari", "muslim", "tirmidhi", "tirmizi", "sunan", "abu dawood", "nasai",
                       "ibn majah",
                       "sunnah", "prophet", "muhammad", "saying", "narration", "reported", "حدیث", "بخاری", "مسلم",
                       "ترمذی", "ابو داؤد", "نسائی", "ابن ماجہ"]

    quran_keywords = ["quran", "surah", "ayah", "verse", "quranic", "قرآن", "سورہ", "آیت", "ayat", "surah"]

    query_lower = query.lower()

    has_hadith = any(keyword in query_lower for keyword in hadith_keywords)
    has_quran = any(keyword in query_lower for keyword in quran_keywords)

    if has_hadith and not has_quran:
        return "hadith"
    elif has_quran and not has_hadith:
        return "quran"
    else:
        return "both"  # Default to checking both sources if unclear or if both are mentioned


# Maximum L2 distance to accept a chunk as relevant. Chunks further than this
# are considered low-signal and will trigger the hard short-circuit in code.
RELEVANCE_GATE = 1.25


def retrieve_context(query, source_type="both", top_k=6):
    """Retrieve relevant context from specified source(s).

    For source_type 'both', retrieves 5 candidates from each index, merges,
    and returns the top `top_k` results by distance.
    """
    if not resource_state["embedding_model"]:
        return generate_sample_context(query, source_type)

    try:
        query_embedding = model.encode([query]).astype("float32")
        results = []

        # How many candidates to pull per index — always at least top_k so we
        # have enough after gating; in 'both' mode we split the budget.
        per_index_k = max(top_k, 5) if source_type != "both" else 5

        if source_type in ["quran", "both"] and quran_index is not None and quran_metadata is not None:
            q_dist, q_idx = quran_index.search(query_embedding, per_index_k)
            for i, idx in enumerate(q_idx[0]):
                if idx < len(quran_metadata):
                    dist = float(q_dist[0][i])
                    results.append({"source": "quran", "text": quran_metadata[idx]["text"], "distance": dist})

        if source_type in ["hadith", "both"] and hadith_index is not None and hadith_metadata is not None:
            h_dist, h_idx = hadith_index.search(query_embedding, per_index_k)
            for i, idx in enumerate(h_idx[0]):
                if idx < len(hadith_metadata):
                    dist = float(h_dist[0][i])
                    results.append({"source": "hadith", "text": hadith_metadata[idx]["text"], "distance": dist})

        # Sort by relevance (smaller L2 distance = better match) and cut to top_k
        results.sort(key=lambda x: x["distance"])
        results = results[:top_k]

        return results if results else generate_sample_context(query, source_type)

    except Exception as e:
        logger.error(f"Error in retrieve_context: {e}")
        return generate_sample_context(query, source_type)


def generate_sample_context(query, source_type):
    """Generate sample context when indices are not available"""
    sample_responses = {
        "prayer": [
            {
                "source": "quran",
                "text": "And establish prayer and give zakah and bow with those who bow. (Surah Al-Baqarah, Ayah 43)",
                "distance": 0.3
            },
            {
                "source": "hadith", 
                "text": "The Prophet (peace be upon him) said: 'Prayer is the pillar of religion.' (Sahih Bukhari, Hadith 528)",
                "distance": 0.4
            }
        ],
        "dua": [
            {
                "source": "quran",
                "text": "And when My servants ask you concerning Me, indeed I am near. I respond to the invocation of the supplicant when he calls upon Me. (Surah Al-Baqarah, Ayah 186)",
                "distance": 0.2
            },
            {
                "source": "hadith",
                "text": "The Prophet (peace be upon him) said: 'Dua is worship.' (Jami at-Tirmidhi, Hadith 3372)",
                "distance": 0.3
            }
        ]
    }
    
    query_lower = query.lower()
    for keyword, responses in sample_responses.items():
        if keyword in query_lower:
            if source_type == "quran":
                return [r for r in responses if r["source"] == "quran"]
            elif source_type == "hadith":
                return [r for r in responses if r["source"] == "hadith"]
            else:
                return responses
    
    # Default response
    return [
        {
            "source": "quran",
            "text": "And whoever relies upon Allah - then He is sufficient for him. Indeed, Allah will accomplish His purpose. (Surah At-Talaq, Ayah 3)",
            "distance": 0.5
        }
    ]


def is_relevant_match(results, threshold=0.6):
    """Check if the search results are relevant based on distance scores."""
    if not results:
        return False
    # Lower distance means better match
    return any(r["distance"] < threshold for r in results)


def generate_alternatives(query):
    """Generate alternative words/phrases for the query using Gemini."""
    if not llm_ready():
        return ["prayer", "worship", "faith"]  # Fallback alternatives
        
    prompt = f"""
    I'm searching for information about this Islamic topic but can't find direct matches:
    "{query}"

    Please give me 3-5 alternative Islamic terms, concepts, or phrases that might be related to this query.
    Format: Just provide the alternative terms separated by commas, nothing else.
    """

    try:
        response = llm_generate(prompt)
        alternatives = [alt.strip() for alt in response.split(",")]
        return alternatives
    except Exception as e:
        logger.error(f"Error generating alternatives: {e}")
        return ["prayer", "worship", "faith"]  # Fallback


# ── Intent classifier ─────────────────────────────────────────────────────────
# Valid intent labels returned by classify_intent.
INTENT_LABELS = (
    "fiqh_ruling",           # What is the ruling on X? Is X halal/haram?
    "tafsir_explanation",    # What does verse X mean?
    "hadith_authenticity",   # Is this hadith authentic? What is its grading?
    "biography",             # Who was X? What did the Prophet do in situation Y?
    "comparative_opinions",  # How do scholars differ on X?
    "historical_context",    # What was happening when X was revealed?
    "definition",            # What is X in Islam?
    "practical_guidance",    # How do I perform X step by step?
    "general",               # Fallback for anything else
)

# Shown for questions we won't answer (invalid / off-topic / abusive).
REFUSAL_MESSAGE = (
    "That doesn't look like a genuine question I can answer from the Qur'an and "
    "Hadith. Please ask a clear, complete question about Islam — for example about "
    "worship, character, the Qur'an, or the life of the Prophet ﷺ."
)

_ABUSE_WORDS = {
    "fuck", "fucking", "shit", "bitch", "bastard", "asshole", "dick",
    "cunt", "slut", "whore", "nigger", "faggot", "retard",
}


def is_valid_query(query: str) -> bool:
    """Cheap pre-filter for empty, too-short, letterless, or abusive input —
    rejected before any LLM cost. Subtler cases (jokes, off-topic) are caught by
    the REFUSE guard in the prompt."""
    s = (query or "").strip()
    if len(s) < 5:
        return False
    if sum(c.isalpha() for c in s) < 3:
        return False
    if set(re.findall(r"[a-zA-Z']+", s.lower())) & _ABUSE_WORDS:
        return False
    return True


INTENT_PROMPT = """Classify this Islamic question into exactly one of these intent labels:

fiqh_ruling, tafsir_explanation, hadith_authenticity, biography,
comparative_opinions, historical_context, definition, practical_guidance, general

Question: {query}

Respond with ONLY the label, nothing else."""


def classify_intent(query: str) -> str:
    """Return one of INTENT_LABELS for the user's question."""
    if not llm_ready():
        return "general"
    try:
        label = llm_generate(INTENT_PROMPT.format(query=query)).strip().lower()
        label = label.strip(".,:;'\"")
        return label if label in INTENT_LABELS else "general"
    except Exception as e:
        logger.warning(f"Intent classification failed, using 'general': {e}")
        return "general"


async def process_islamic_query(query: str, source_type: str = "auto", top_k: int = 10):
    """Process an Islamic query and generate a response with references."""
    start_time = time.time()

    # Guard: refuse invalid/abusive input up front (no retrieval, no LLM cost).
    if not is_valid_query(query):
        return {
            "query": query,
            "answer": REFUSAL_MESSAGE,
            "source_type": "none",
            "processing_time": time.time() - start_time,
            "references_count": 0,
            "alternatives_used": None,
        }

    # Stage 1 — classify intent so synthesis knows what kind of answer to produce
    intent = classify_intent(query)
    logger.info(f"Query intent classified as: {intent}")

    # Detect source type if auto
    if source_type == "auto":
        source_type = detect_source_type(query)
    logger.info(f"Query detected as: {source_type.upper()} query")

    # Stage 2 — retrieval
    raw_results = retrieve_context(query, source_type=source_type, top_k=top_k)

    # Sourcing Guardrail: Filter raw results by distance. Hard short-circuit if no relevant match is found.
    # We check if the closest match is <= RELEVANCE_GATE.
    best_distance = min([r["distance"] for r in raw_results]) if raw_results else 2.0
    if best_distance > RELEVANCE_GATE:
        logger.info(f"Top match has distance {best_distance:.4f} > {RELEVANCE_GATE}. Hard short-circuiting.")
        end_time = time.time()
        return {
            "query": query,
            "answer": "No sources in our Qur'an/Hadith index directly address this query. Please consult a qualified scholar.",
            "source_type": source_type,
            "processing_time": end_time - start_time,
            "references_count": 0,
            "alternatives_used": None
        }

    # Filter to only keep context chunks that are <= RELEVANCE_GATE
    gated_results = [r for r in raw_results if r.get("distance", 0.0) <= RELEVANCE_GATE]

    # Build context string (Quran first, then Hadith).
    # Clip each chunk so a single long hadith can't blow up the prompt.
    def _clip(text, limit=550):
        t = (text or "").strip()
        if len(t) <= limit:
            return t
        return t[:limit].rsplit(" ", 1)[0] + "…"

    _HADITH_BOOKS = {
        "eng_bukhari": "Sahih Bukhari",
        "eng_muslim": "Sahih Muslim",
        "eng-ibnmajah": "Sunan Ibn Majah",
        "eng-tirmidhi": "Jami' at-Tirmidhi",
        "eng-nasai": "Sunan an-Nasa'i",
        "eng_dawood": "Sunan Abi Dawud",
    }

    def _clean_source(text):
        return re.sub(
            r"[A-Za-z]:[\\/].*?AHADEES[\\/]([A-Za-z_\-]+)",
            lambda m: _HADITH_BOOKS.get(m.group(1), m.group(1)),
            text or "",
        )

    quran_texts = [_clip(r["text"]) for r in gated_results if r.get("source") == "quran"]
    hadith_texts = [_clip(_clean_source(r["text"])) for r in gated_results if r.get("source") == "hadith"]
    context = ""
    if quran_texts:
        context += "QUR'AN REFERENCES:\n" + "\n\n".join(quran_texts) + "\n\n"
    if hadith_texts:
        context += "HADITH REFERENCES:\n" + "\n\n".join(hadith_texts)

    # Shown when the LLM is unavailable (e.g. the daily token limit is reached).
    UNAVAILABLE = (
        "The knowledge assistant is temporarily unavailable — the daily AI limit may "
        "have been reached. Please try again in a little while. For anything urgent, "
        "please consult a trusted local scholar or a reliable source such as "
        "quran.com or sunnah.com."
    )

    generated = False
    if llm_ready():
        prompt = f"""You are a knowledgeable, humble Islamic assistant. Answer using ONLY the provided sources.

INTENT: {intent}

First, judge the question. If it is NOT a genuine, answerable question about Islam — e.g. a joke, nonsense, an incomplete sentence, abusive/offensive, or unrelated to Islam — reply with EXACTLY the single word:
REFUSE
(and nothing else).

Otherwise, answer it. Format the whole answer in **Markdown**:
- Be concise: 2–4 short paragraphs (do not pad the length).
- Cite ONLY the references directly relevant to the question, inline, as "Surah [Name], Ayah [Number]" or "[Collection], Hadith [Number]". Ignore irrelevant sources.
- If the sources do not really address the question, say so briefly rather than forcing a connection.
- Do not issue rulings; where a personal ruling is needed, advise asking a qualified scholar.
- End with a section titled `## References` listing each source you actually used, one per bullet. Cite Hadith by collection name and number only (e.g. "Sahih Bukhari, Hadith 5972") — never include file paths.

Islamic sources:
{context}

Question: {query}

Answer:"""
        try:
            out = llm_generate(prompt)
            if out.strip().upper().startswith("REFUSE"):
                response = REFUSAL_MESSAGE
            else:
                response = out
                generated = True
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            response = UNAVAILABLE
    else:
        response = UNAVAILABLE

    end_time = time.time()
    processing_time = end_time - start_time
    references_count = (response.count("Surah") + response.count("Hadith")) if generated else 0

    return {
        "query": query,
        "answer": response,
        "source_type": source_type,
        "processing_time": processing_time,
        "references_count": references_count,
        "alternatives_used": None
    }


# =========== Dependency for checking if resources are loaded ===========
def get_resource_status():
    """Get the current status of loaded resources."""
    if not resource_state["initialized"]:
        # Try loading resources if they're not already loaded
        load_resources()
    return resource_state


def check_resources():
    """Check if necessary resources are loaded."""
    status = get_resource_status()
    if not status["initialized"]:
        raise HTTPException(
            status_code=503,
            detail="API resources are still initializing. Please try again shortly."
        )
    return status


# =========== API Endpoints ===========
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Islamic Truth Verifier API is running!",
        "status": "active",
        "docs": "/docs",
        "health": "/health",
        "version": settings.api_version,
        "endpoints": {
            "query": "POST /query",
            "health": "GET /health",
            "supported_references": "GET /supported-references"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check the health status of the API and its components."""
    status = get_resource_status()

    return {
        "status": "healthy" if status["initialized"] else "initializing",
        "version": settings.api_version,
        "indices_loaded": status["quran_index"] and status["hadith_index"],
        "embedding_model_loaded": status["embedding_model"]
    }


@app.post("/query", response_model=QueryResponse)
async def query_endpoint(
        request: QueryRequest,
        resource_status: Dict = Depends(check_resources)
):
    """
    Query the Islamic Truth Verifier with a question about Islam.

    The API will search both Quran and Hadith sources (unless specified otherwise)
    and generate a comprehensive answer with references and links.

    - For Quran references, links to quran.com will be provided
    - For Hadith references, links to sunnah.com will be provided
    """
    try:
        # Process the query based on parameters
        source_type = request.source_type.value if request.source_type != QuerySource.AUTO else "auto"
        top_k = request.top_k or settings.default_top_k

        result = await process_islamic_query(
            query=request.query,
            source_type=source_type,
            top_k=top_k
        )

        return result

    except Exception as e:
        logger.error(f"Error processing query: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing your query: {str(e)}"
        )


@app.get("/supported-references")
async def get_supported_references():
    """Get information about supported Quran surahs and Hadith collections"""
    return {
        "quran": {
            "surah_count": 114,
            "indexed": resource_state["quran_index"]
        },
        "hadith": {
            "collections": list(HADITH_COLLECTION_MAP.keys()),
            "indexed": resource_state["hadith_index"]
        },
        "status": "Demo mode - using sample data" if not (resource_state["quran_index"] and resource_state["hadith_index"]) else "Full database loaded"
    }


# =========== Application Startup ===========
@app.on_event("startup")
async def startup_event():
    """Load resources when the application starts."""
    logger.info("🚀 Starting Islamic Truth Verifier API...")
    logger.info("📍 Server will be available at: http://localhost:8000")
    logger.info("📖 API Documentation: http://localhost:8000/docs")
    logger.info("🏥 Health Check: http://localhost:8000/health")
    
    # Start resource loading
    load_resources()


# Run with: uvicorn islamic_truth_verifier_api:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
