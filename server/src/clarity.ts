import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { ClarityCard, ClarityAskResponse } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load the human-authored corpus once at startup ─────────────────────────────
const CARDS: ClarityCard[] = JSON.parse(
  readFileSync(join(__dirname, "../data/clarity-cards.json"), "utf-8")
);
const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));

export function getAllCards(): ClarityCard[] {
  return CARDS;
}

export function getCard(id: string): ClarityCard | undefined {
  return CARD_BY_ID.get(id);
}

const MATCH_MESSAGE =
  "Here is what scholars broadly agree on — and where they differ. Sirat points you to human-vetted answers and never issues rulings itself.";
const DEFER_MESSAGE =
  "This looks like a question that depends on your personal situation, or one Sirat does not yet have a vetted answer for. Please ask a trusted local imam or scholar — that is the safest path, and part of belonging to a community.";

// ── Keyword fallback (used when Groq is unavailable or fails) ───────────────────
const STOP = new Set([
  "the", "a", "an", "to", "do", "i", "is", "it", "my", "of", "in", "and", "or",
  "for", "on", "how", "what", "when", "can", "should", "if", "are", "have", "am",
  "me", "you", "with", "about", "that", "this", "not", "no", "yet",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function keywordMatch(query: string): ClarityCard | null {
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) return null;

  let best: ClarityCard | null = null;
  let bestScore = 0;

  for (const card of CARDS) {
    const haystack = [card.question, ...card.aliases].join(" ");
    const cTokens = tokenize(haystack);
    let score = 0;
    for (const t of cTokens) if (qTokens.has(t)) score += 1;
    // Normalise slightly so long alias lists don't dominate purely by size.
    const normalised = score;
    if (normalised > bestScore) {
      bestScore = normalised;
      best = card;
    }
  }

  // Require at least two meaningful overlapping tokens to claim a confident match.
  return bestScore >= 2 ? best : null;
}

// ── Groq router: classify + route ONLY. Never generates religious content. ──────
async function groqRoute(
  query: string
): Promise<{ matchedCardId: string | null; isRulingSeeking: boolean } | null> {
  if (!process.env.GROQ_API_KEY) return null;

  const { default: Groq } = await import("groq-sdk");
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const cardList = CARDS.map((c) => ({ id: c.id, question: c.question }));

  const systemPrompt = [
    "You are a strict ROUTER for an Islamic learning app. You do NOT answer religious questions.",
    "You do NOT give rulings, opinions, or any Islamic content. You ONLY do two things:",
    "1. Select which pre-written card (from the provided list) best matches the user's question, or null if none fits well.",
    "2. Flag isRulingSeeking=true when the user is asking for a personal verdict about their own specific situation",
    "   (e.g. 'is X halal for me right now', 'should I divorce', medical/financial/legal specifics) — because those",
    "   must be referred to a human scholar.",
    "Respond with ONLY a valid JSON object of the exact form:",
    '{ "matchedCardId": string|null, "isRulingSeeking": boolean }',
    "No prose, no markdown, no explanation.",
  ].join("\n");

  const userPrompt = `Available cards:\n${JSON.stringify(
    cardList,
    null,
    2
  )}\n\nUser question: "${query}"\n\nReturn ONLY the JSON object.`;

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 128,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as {
      matchedCardId?: unknown;
      isRulingSeeking?: unknown;
    };

    const id =
      typeof parsed.matchedCardId === "string" && CARD_BY_ID.has(parsed.matchedCardId)
        ? parsed.matchedCardId
        : null;

    return { matchedCardId: id, isRulingSeeking: parsed.isRulingSeeking === true };
  } catch (err) {
    console.error("[clarity] Groq routing failed — falling back to keyword match:", err);
    return null;
  }
}

/**
 * Route a free-text question to a human-authored Clarity Card.
 *
 * Safety model: the AI (when present) only classifies and selects an ID from our
 * fixed list. All religious content shown to the user comes verbatim from the
 * vetted JSON corpus — the model never writes it.
 */
export async function askClarity(query: string): Promise<ClarityAskResponse> {
  const routed = await groqRoute(query);

  let cardId: string | null;
  if (routed) {
    cardId = routed.matchedCardId;
  } else {
    const kw = keywordMatch(query);
    cardId = kw ? kw.id : null;
  }

  const card = cardId ? getCard(cardId) ?? null : null;

  if (!card) {
    return { card: null, deferToScholar: true, message: DEFER_MESSAGE };
  }

  return { card, deferToScholar: false, message: MATCH_MESSAGE };
}
