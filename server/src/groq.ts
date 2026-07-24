import type { Topic } from "./types.js";

/**
 * Given the user's diagnostic answers and the full topic list, ask Groq Llama
 * to return a JSON array of topic IDs the user likely already knows.
 *
 * Uses dynamic import so the Groq SDK is never loaded (and never validates the
 * missing API key) unless we actually have a key set and intend to call it.
 *
 * Robust fallback: if no API key, call fails, or output is invalid → return [].
 */
export async function mapAnswersToKnownTopics(
  answers: Record<string, string>,
  topics: Topic[]
): Promise<string[]> {
  if (!process.env.GROQ_API_KEY) {
    console.warn("[groq] No GROQ_API_KEY set — using empty seed (user starts from scratch).");
    return [];
  }

  // Dynamic import: SDK only loaded if we have a key
  const { default: Groq } = await import("groq-sdk");
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const topicSummaries = topics.map((t) => ({ id: t.id, title: t.title }));

  const systemPrompt =
    "You are an assistant that maps a new Muslim's diagnostic survey answers to a list of Islamic topic IDs they likely already know. Return ONLY a valid JSON array of topic id strings — no explanation, no markdown code fences, no commentary. If unsure, return an empty array [].";

  const userPrompt = `Available topic IDs and titles:\n${JSON.stringify(
    topicSummaries,
    null,
    2
  )}\n\nUser's diagnostic answers:\n${Object.entries(answers)
    .map(([qId, ans]) => `- ${qId}: "${ans}"`)
    .join("\n")}\n\nWhich topic IDs does this person likely already know? Return ONLY the JSON array.`;

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 512,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    // Strip markdown code fences if the model adds them
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn("[groq] Response was not a JSON array:", parsed);
      return [];
    }

    // Validate: drop any hallucinated IDs not in our topic list
    const validIds = new Set(topics.map((t) => t.id));
    const filtered = (parsed as unknown[])
      .filter((item): item is string => typeof item === "string")
      .filter((id) => {
        const ok = validIds.has(id);
        if (!ok) console.warn(`[groq] Dropping hallucinated id: "${id}"`);
        return ok;
      });

    console.log(`[groq] Seeding ${filtered.length} known topics from diagnostic answers.`);
    return filtered;
  } catch (err) {
    console.error("[groq] API call failed — falling back to empty seed:", err);
    return [];
  }
}
