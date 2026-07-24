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
  getUser,
} from "./db.js";
import { mapAnswersToKnownTopics } from "./groq.js";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load static data ──────────────────────────────────────────────────────────
const TOPICS: Topic[] = JSON.parse(
  readFileSync(join(__dirname, "../data/topics.json"), "utf-8")
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

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:4173"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, topics: TOPICS.length });
});

// ── Diagnostic ────────────────────────────────────────────────────────────────

// POST /api/diagnostic/start — returns first question
app.post("/api/diagnostic/start", (req, res) => {
  const { userId } = req.body as { userId: string };
  if (!userId) return res.status(400).json({ error: "userId required" });

  getOrCreateUser(userId);
  res.json({ question: DIAGNOSTIC_QUESTIONS[0], total: DIAGNOSTIC_QUESTIONS.length });
});

// POST /api/diagnostic/answer — saves answer, returns next or done
app.post("/api/diagnostic/answer", (req, res) => {
  const { userId, questionId, answer } = req.body as {
    userId: string;
    questionId: string;
    answer: string;
  };
  if (!userId || !questionId || !answer) {
    return res.status(400).json({ error: "userId, questionId, answer required" });
  }

  saveAnswer(userId, questionId, answer);

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
});

// POST /api/diagnostic/complete — Groq maps answers to known topics, seeds user
app.post("/api/diagnostic/complete", async (req, res) => {
  const { userId } = req.body as { userId: string };
  if (!userId) return res.status(400).json({ error: "userId required" });

  const user = getOrCreateUser(userId);
  const knownTopicIds = await mapAnswersToKnownTopics(user.diagnosticAnswers, TOPICS);

  // Seed the user's completed topics from Groq mapping
  const updatedUser = seedCompletedTopics(userId, knownTopicIds);

  const roadmap = buildRoadmapResponse(TOPICS, new Set(updatedUser.completedTopicIds));
  res.json({ done: true, seededTopicIds: knownTopicIds, roadmap });
});

// ── Roadmap ───────────────────────────────────────────────────────────────────

// GET /api/roadmap/:userId — return full annotated graph
app.get("/api/roadmap/:userId", (req, res) => {
  const { userId } = req.params;
  const user = getOrCreateUser(userId);
  const roadmap = buildRoadmapResponse(TOPICS, new Set(user.completedTopicIds));
  res.json(roadmap);
});

// ── Topics ────────────────────────────────────────────────────────────────────

// GET /api/topic/:topicId — return full topic detail
app.get("/api/topic/:topicId", (req, res) => {
  const topic = TOPICS.find((t) => t.id === req.params.topicId);
  if (!topic) return res.status(404).json({ error: "Topic not found" });
  res.json(topic);
});

// POST /api/topic/:topicId/complete — mark complete, return diff + new graph
app.post("/api/topic/:topicId/complete", (req, res) => {
  const { userId } = req.body as { userId: string };
  const { topicId } = req.params;

  if (!userId) return res.status(400).json({ error: "userId required" });

  const userBefore = getUser(userId);
  const prevCompleted = new Set(userBefore?.completedTopicIds ?? []);

  // Guard: verify topic exists
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) return res.status(404).json({ error: "Topic not found" });

  const updatedUser = completeTopic(userId, topicId);
  const newCompleted = new Set(updatedUser.completedTopicIds);

  const newlyUnlocked = computeNewlyUnlocked(TOPICS, prevCompleted, newCompleted);
  const roadmap = buildRoadmapResponse(TOPICS, newCompleted);

  res.json({ ...roadmap, newlyUnlocked });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`\n🕌  Sirat API running on http://localhost:${PORT}`);
  console.log(`   Topics loaded: ${TOPICS.length}`);
  console.log(`   Groq key: ${process.env.GROQ_API_KEY ? "✅ set" : "⚠️  not set (Groq fallback active)"}\n`);
});

export default app;
