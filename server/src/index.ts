import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { Topic, DiagnosticQuestion } from "./types.js";
import { buildRoadmapResponse, computeNewlyUnlocked } from "./frontier.js";
import {
  getOrCreateUser,
  saveAnswer,
  seedCompletedTopics,
  completeTopic,
  setOnboarded,
  getUser,
} from "./progress.js";
import { supabaseForRequest } from "./supabase.js";
import { mapAnswersToKnownTopics } from "./groq.js";
import { getAllCards, getCard, askClarity } from "./clarity.js";
import { getDirectory, getEtiquette, saveConnectRequest } from "./masjid.js";
import { getPrayerTimes } from "./prayer.js";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load static data ──────────────────────────────────────────────────────────
const TOPICS: Topic[] = JSON.parse(
  readFileSync(join(__dirname, "../data/topics.json"), "utf-8")
);

const BOOKS: unknown[] = JSON.parse(
  readFileSync(join(__dirname, "../data/books.json"), "utf-8")
);

const ETIQUETTE_BASICS: unknown[] = JSON.parse(
  readFileSync(join(__dirname, "../data/etiquette-basics.json"), "utf-8")
);

const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: "q1",
    question: "What draws you to Islam?",
    options: [
      "I want to understand God and monotheism",
      "I'm inspired by the Quran and its message",
      "I know Muslims and admire their faith and character",
      "I'm exploring different spiritual paths",
    ],
  },
  {
    id: "q2",
    question: "Have you read any part of the Quran?",
    options: [
      "Yes, I've read significant portions",
      "Yes, a few chapters or verses",
      "I've seen translations but haven't studied it",
      "No, not yet",
    ],
  },
  {
    id: "q3",
    question: "How familiar are you with Islamic prayer (Salah)?",
    options: [
      "I already know how to pray",
      "I've watched or joined prayers before",
      "I know it exists but don't know the details",
      "It's completely new to me",
    ],
  },
  {
    id: "q4",
    question: "How much do you know about the Prophet Muhammad ﷺ?",
    options: [
      "I've studied his life in depth",
      "I know the broad outlines of his biography",
      "Only basic facts (born in Mecca, final prophet, etc.)",
      "Very little — this is new to me",
    ],
  },
  {
    id: "q5",
    question: "What area are you most eager to explore first?",
    options: [
      "Understanding God and Islamic belief (Aqeedah)",
      "Prayer, fasting and daily worship (Ibadah)",
      "The Quran — its meaning, recitation, and study",
      "Islamic history, the Prophet's life, and the companions",
    ],
  },
  {
    id: "q6",
    question: "Do you have any background in other Abrahamic faiths (Christianity, Judaism)?",
    options: [
      "Yes, I was raised in one and know it well",
      "I have some background but it's not deep",
      "I've studied comparative religion informally",
      "No religious background",
    ],
  },
];

// ── App setup ─────────────────────────────────────────────────────────────────
const app = express();

// Allow localhost and same-Wi-Fi LAN origins (private IP ranges) on the Vite
// dev/preview ports — so the app works when opened from a phone on the network.
const LAN_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):(5173|4173)$/;
app.use(
  cors({
    origin(origin, cb) {
      // Non-browser clients (curl, same-origin) send no Origin — allow them.
      if (!origin || LAN_ORIGIN.test(origin)) return cb(null, true);
      cb(new Error(`CORS: origin not allowed: ${origin}`));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, topics: TOPICS.length });
});

// ── Books (Knowledge Shelf) ────────────────────────────────────────────────────
// Returns the curated Islamic reference library — static seed data, not generated.
app.get("/api/books", (_req, res) => {
  res.json(BOOKS);
});

// ── Etiquette Basics (Worship Guides) ──────────────────────────────────────────
// Returns practical step-by-step guides (wudu, prayer, masjid etiquette) with sources.
app.get("/api/etiquette-basics", (_req, res) => {
  res.json(ETIQUETTE_BASICS);
});

// ── Me ──────────────────────────────────────────────────────────────────────────
// Stateful routing signal: has this (authenticated) user finished the diagnostic?
app.get("/api/me/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const sb = supabaseForRequest(req.headers.authorization);
    const user = await getUser(sb, userId);
    res.json({ onboarded: user?.onboarded ?? false });
  } catch (err) {
    console.error("[me]", err);
    res.status(500).json({ error: "Could not load your profile." });
  }
});

// ── Diagnostic ────────────────────────────────────────────────────────────────

// POST /api/diagnostic/start — returns first question
app.post("/api/diagnostic/start", async (req, res) => {
  const { userId } = req.body as { userId: string };
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const sb = supabaseForRequest(req.headers.authorization);
    await getOrCreateUser(sb, userId);
    res.json({ question: DIAGNOSTIC_QUESTIONS[0], total: DIAGNOSTIC_QUESTIONS.length });
  } catch (err) {
    console.error("[diagnostic/start]", err);
    res.status(500).json({ error: "Could not start the diagnostic." });
  }
});

// POST /api/diagnostic/answer — saves answer, returns next or done
app.post("/api/diagnostic/answer", async (req, res) => {
  const { userId, questionId, answer } = req.body as {
    userId: string;
    questionId: string;
    answer: string;
  };
  if (!userId || !questionId || !answer) {
    return res.status(400).json({ error: "userId, questionId, answer required" });
  }

  try {
    const sb = supabaseForRequest(req.headers.authorization);
    await saveAnswer(sb, userId, questionId, answer);

    const currentIndex = DIAGNOSTIC_QUESTIONS.findIndex((q) => q.id === questionId);
    const nextQuestion = DIAGNOSTIC_QUESTIONS[currentIndex + 1];

    if (nextQuestion) {
      res.json({
        done: false,
        question: nextQuestion,
        questionIndex: currentIndex + 1,
        total: DIAGNOSTIC_QUESTIONS.length,
      });
    } else {
      res.json({ done: true });
    }
  } catch (err) {
    console.error("[diagnostic/answer]", err);
    res.status(500).json({ error: "Could not save your answer." });
  }
});

// POST /api/diagnostic/complete — Groq maps answers to known topics, seeds user
app.post("/api/diagnostic/complete", async (req, res) => {
  const { userId } = req.body as { userId: string };
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const sb = supabaseForRequest(req.headers.authorization);
    const user = await getOrCreateUser(sb, userId);
    const knownTopicIds = await mapAnswersToKnownTopics(user.diagnosticAnswers, TOPICS);

    // Seed the user's completed topics from Groq mapping, then mark onboarded.
    const seededUser = await seedCompletedTopics(sb, userId, knownTopicIds);
    await setOnboarded(sb, userId);

    const roadmap = buildRoadmapResponse(TOPICS, new Set(seededUser.completedTopicIds));
    res.json({ done: true, seededTopicIds: knownTopicIds, roadmap });
  } catch (err) {
    console.error("[diagnostic/complete]", err);
    res.status(500).json({ error: "Could not complete the diagnostic." });
  }
});

// ── Roadmap ───────────────────────────────────────────────────────────────────

// GET /api/roadmap/:userId — return full annotated graph
app.get("/api/roadmap/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const sb = supabaseForRequest(req.headers.authorization);
    const user = await getOrCreateUser(sb, userId);
    const roadmap = buildRoadmapResponse(TOPICS, new Set(user.completedTopicIds));
    res.json(roadmap);
  } catch (err) {
    console.error("[roadmap]", err);
    res.status(500).json({ error: "Could not load the roadmap." });
  }
});

// ── Topics ────────────────────────────────────────────────────────────────────

// GET /api/topic/:topicId — return full topic detail
app.get("/api/topic/:topicId", (req, res) => {
  const topic = TOPICS.find((t) => t.id === req.params.topicId);
  if (!topic) return res.status(404).json({ error: "Topic not found" });
  res.json(topic);
});

// POST /api/topic/:topicId/complete — mark complete, return diff + new graph
app.post("/api/topic/:topicId/complete", async (req, res) => {
  const { userId } = req.body as { userId: string };
  const { topicId } = req.params;

  if (!userId) return res.status(400).json({ error: "userId required" });

  // Guard: verify topic exists
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) return res.status(404).json({ error: "Topic not found" });

  try {
    const sb = supabaseForRequest(req.headers.authorization);
    const userBefore = await getUser(sb, userId);
    const prevCompleted = new Set(userBefore?.completedTopicIds ?? []);

    const updatedUser = await completeTopic(sb, userId, topicId);
    const newCompleted = new Set(updatedUser.completedTopicIds);

    const newlyUnlocked = computeNewlyUnlocked(TOPICS, prevCompleted, newCompleted);
    const roadmap = buildRoadmapResponse(TOPICS, newCompleted);

    res.json({ ...roadmap, newlyUnlocked });
  } catch (err) {
    console.error("[topic/complete]", err);
    res.status(500).json({ error: "Could not mark the topic complete." });
  }
});

// ── Clarity Cards ───────────────────────────────────────────────────────────────

// GET /api/clarity/cards — list all vetted cards (also used for offline caching)
app.get("/api/clarity/cards", (_req, res) => {
  const cards = getAllCards();
  res.json({
    cards,
    // Lightweight index the frontend can show as "browse common questions".
    index: cards.map((c) => ({ id: c.id, question: c.question, category: c.category })),
  });
});

// GET /api/clarity/card/:id — a single vetted card
app.get("/api/clarity/card/:id", (req, res) => {
  const card = getCard(req.params.id);
  if (!card) return res.status(404).json({ error: "Card not found" });
  res.json(card);
});

// POST /api/clarity/ask — route a free-text question to a vetted card.
// The AI only classifies/selects; all shown content is human-authored.
app.post("/api/clarity/ask", async (req, res) => {
  const { query } = req.body as { query?: string };
  if (!query || !query.trim()) {
    return res.status(400).json({ error: "query required" });
  }
  const result = await askClarity(query.trim());
  res.json(result);
});

// ── Masjid Bridge ─────────────────────────────────────────────────────────────
// Real-world connection: curated directory, deterministic etiquette, and
// persisted human-triaged requests. Deliberately NOT generated by an LLM.

// GET /api/masjid/directory?city=&revertFriendly=&newMuslimClass=
app.get("/api/masjid/directory", (req, res) => {
  const { city, revertFriendly, newMuslimClass } = req.query;
  res.json(
    getDirectory({
      city: typeof city === "string" && city ? city : undefined,
      revertFriendly: revertFriendly === "true",
      newMuslimClass: newMuslimClass === "true",
    })
  );
});

// GET /api/masjid/etiquette — the "before you go" guide (cached offline)
app.get("/api/masjid/etiquette", (_req, res) => {
  res.json({ sections: getEtiquette() });
});

// POST /api/masjid/connect — a real request a human follows up on
app.post("/api/masjid/connect", (req, res) => {
  const result = saveConnectRequest(req.body ?? {});
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true, requestId: result.request.id });
});

// ── Ask (HidayahAI RAG proxy) ─────────────────────────────────────────────────
// Forwards to the Python RAG service (FAISS over Qur'an + authentic Hadith,
// generation via Groq). Answers are grounded in retrieved sources, not invented.
const RAG_URL = process.env.RAG_URL ?? "http://localhost:8000";

app.post("/api/ask", async (req, res) => {
  const { query, source_type } = req.body as { query?: string; source_type?: string };
  if (!query || !query.trim()) return res.status(400).json({ error: "query required" });

  try {
    const upstream = await fetch(`${RAG_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.trim(), source_type: source_type ?? "auto" }),
    });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error(`[ask] RAG ${upstream.status}: ${text.slice(0, 200)}`);
      return res.status(502).json({ error: "The knowledge service is still starting or unavailable." });
    }
    res.json(await upstream.json());
  } catch (err) {
    console.error("[ask] RAG unreachable:", err);
    res.status(502).json({ error: "Could not reach the knowledge service. Is the RAG server running on :8000?" });
  }
});

// GET /api/prayer-times?city=&country=&latitude=&longitude=&method=
app.get("/api/prayer-times", async (req, res) => {
  const latitude = req.query.latitude ? Number(req.query.latitude) : undefined;
  const longitude = req.query.longitude ? Number(req.query.longitude) : undefined;
  const method = Number(req.query.method) || 2;

  let data;
  if (typeof latitude === "number" && !isNaN(latitude) && typeof longitude === "number" && !isNaN(longitude)) {
    data = await getPrayerTimes(undefined, undefined, method, latitude, longitude);
  } else {
    const city = (typeof req.query.city === "string" && req.query.city) || "Mumbai";
    const country =
      (typeof req.query.country === "string" && req.query.country) || "India";
    data = await getPrayerTimes(city, country, method);
  }

  if (!data) {
    return res.status(502).json({ error: "Could not fetch prayer times right now." });
  }
  res.json(data);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`\n🕌  Sirat API running on http://localhost:${PORT}`);
  console.log(`   Topics loaded: ${TOPICS.length}`);
  console.log(`   Groq key: ${process.env.GROQ_API_KEY ? "✅ set" : "⚠️  not set (Groq fallback active)"}\n`);
});

export default app;
