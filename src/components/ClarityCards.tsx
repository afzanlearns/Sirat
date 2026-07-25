import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { API_BASE as API } from "../lib/api";

interface AskResponse {
  query: string;
  answer: string;
  source_type: string;
  processing_time: number;
  references_count: number;
  alternatives_used?: string[] | null;
}

interface ClarityCardsProps {
  onBack: () => void;
}

const EXAMPLES = [
  "What does the Qur'an say about patience?",
  "How should I treat my parents?",
  "What is the reward for praying Fajr?",
  "Is seeking knowledge encouraged in Islam?",
];

/** Render the answer as Markdown, styled to the app theme. */
function AnswerBody({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: 1.7, color: "var(--text-primary)" }}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p style={{ margin: 0, lineHeight: 1.7 }}>{children}</p>,
          strong: ({ children }) => <strong style={{ fontWeight: 600, color: "var(--text-primary)" }}>{children}</strong>,
          em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
          h1: ({ children }) => <h3 className="serif" style={{ fontSize: "1.2rem", margin: "8px 0 2px" }}>{children}</h3>,
          h2: ({ children }) => (
            <h3 className="label" style={{ color: "var(--accent)", margin: "10px 0 2px" }}>{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="label" style={{ color: "var(--accent)", margin: "8px 0 2px" }}>{children}</h4>
          ),
          ul: ({ children }) => <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>{children}</ol>,
          li: ({ children }) => <li style={{ lineHeight: 1.6 }}>{children}</li>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", wordBreak: "break-word" }}>
              {children}
            </a>
          ),
          hr: () => <div style={{ height: "1px", background: "var(--border)", margin: "6px 0" }} />,
          code: ({ children }) => <code className="mono" style={{ fontSize: "0.85em", background: "var(--surface-2)", padding: "1px 5px", borderRadius: "var(--r-sm)" }}>{children}</code>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default function ClarityCards(_props: ClarityCardsProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, source_type: "auto" }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "Something went wrong. Please try again.");
      } else {
        setResult((await res.json()) as AskResponse);
      }
    } catch {
      setError("Could not reach the knowledge service. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "28px 20px 48px", display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Header */}
      <header style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h1 className="h1">Ask</h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text-2)", lineHeight: 1.6 }}>
          Answers grounded in the Qur'an and authentic Hadith, retrieved and cited —
          then a reminder to verify with a scholar.
        </p>
      </header>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(query);
        }}
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(query);
            }
          }}
          rows={2}
          placeholder="Ask about the Qur'an, Hadith, worship, character…"
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: "var(--r-md)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
            fontSize: "1rem",
            lineHeight: 1.5,
            resize: "vertical",
            outline: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-soft)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "11px 22px",
            borderRadius: "var(--r-pill)",
            background: query.trim() ? "var(--accent)" : "var(--surface-2)",
            color: query.trim() ? "#20160A" : "var(--text-muted)",
            fontWeight: 600,
            fontSize: "0.95rem",
            cursor: query.trim() && !loading ? "pointer" : "not-allowed",
            transition: "background var(--dur)",
          }}
        >
          {loading ? "Seeking…" : "Ask"}
        </button>
      </form>

      {/* Examples (prompts only — not fixed answers) */}
      {!result && !loading && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQuery(ex);
                ask(ex);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "var(--r-pill)",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-2)",
                fontSize: "0.85rem",
                transition: "border-color var(--dur), color var(--dur)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          <span className="label" style={{ color: "var(--accent)" }}>Searching Qur'an & Hadith…</span>
        </div>
      )}

      {error && (
        <div style={{ padding: "16px 18px", borderRadius: "var(--r-md)", border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text-2)", fontSize: "0.9rem", lineHeight: 1.6 }}>
          {error}
        </div>
      )}

      {/* Answer */}
      {result && (
        <article style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span className="label" style={{ color: "var(--accent)" }}>Answer</span>
            <span className="mono" style={{ fontSize: "0.66rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "var(--r-pill)", padding: "3px 9px" }}>
              {result.source_type}
            </span>
            {result.references_count > 0 && (
              <span className="mono" style={{ fontSize: "0.66rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--green)" }}>
                {result.references_count} reference{result.references_count > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div style={{ padding: "20px 22px", borderRadius: "var(--r-lg)", background: "var(--surface)", border: "1px solid var(--border)" }}>
            <AnswerBody text={result.answer} />
          </div>

          {result.alternatives_used && result.alternatives_used.length > 0 && (
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              No direct match — searched related terms: {result.alternatives_used.join(", ")}.
            </p>
          )}

          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.7, fontStyle: "italic", borderLeft: "2px solid var(--border-strong)", paddingLeft: "14px" }}>
            Generated from retrieved Qur'an & Hadith. For a personal ruling on your
            situation, please ask a qualified scholar — Sirat points to knowledge, it
            does not issue fatwas.
          </p>

          <button
            onClick={() => { setResult(null); setQuery(""); }}
            style={{ alignSelf: "flex-start", fontSize: "0.85rem", color: "var(--text-muted)", textDecoration: "underline", textUnderlineOffset: "3px" }}
          >
            Ask another question
          </button>
        </article>
      )}
    </div>
  );
}
