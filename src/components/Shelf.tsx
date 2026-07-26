import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Book {
  id: string;
  title: string;
  author: string;
  category: BookCategory;
  readingOrder: number;
  authenticated: boolean;
  description: string;
  externalLink: string;
}

type BookCategory =
  | "quran-tafsir"
  | "hadith-collection"
  | "seerah"
  | "aqeedah"
  | "fiqh";

interface ShelfProps {
  /** Topic categories (e.g. "Aqeedah", "Quran") the user has completed at least one topic in */
  completedTopicCategories: string[];
  onBack: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<BookCategory, string> = {
  "quran-tafsir": "Qur\u2019\u0101n & Tafs\u012br",
  "hadith-collection": "Hadith Collections",
  seerah: "S\u012brah (Prophet\u2019s Life)",
  aqeedah: "Aq\u012bdah (Belief)",
  fiqh: "Fiqh (Jurisprudence)",
};

const CATEGORY_ORDER: BookCategory[] = [
  "quran-tafsir",
  "hadith-collection",
  "seerah",
  "aqeedah",
  "fiqh",
];

/** Map a shelf category to the topic category string that marks it as "touched" */
const TOUCHED_MAP: Record<BookCategory, string[]> = {
  "quran-tafsir": ["Quran"],
  "hadith-collection": ["Aqeedah", "Fiqh", "Ibadah", "Seerah", "Akhlaq", "Quran"],
  seerah: ["Seerah"],
  aqeedah: ["Aqeedah"],
  fiqh: ["Fiqh", "Ibadah"],
};

// Spine colour palette — a set of warm, muted hues so spines look distinct
const SPINE_HUES = [
  "#2A3D32",
  "#2E3A2A",
  "#382E28",
  "#2C2E3A",
  "#312A38",
  "#283A38",
  "#3A332A",
  "#2A3838",
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Shelf({ completedTopicCategories, onBack }: ShelfProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null);

  const API = import.meta.env.VITE_API_BASE ?? "http://localhost:3001/api";

  useEffect(() => {
    fetch(`${API}/books`)
      .then((r) => r.json())
      .then((data: Book[]) => {
        setBooks(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [API]);

  const completedSet = new Set(completedTopicCategories);

  function isCategoryTouched(cat: BookCategory): boolean {
    return (TOUCHED_MAP[cat] ?? []).some((c) => completedSet.has(c));
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    books: books
      .filter((b) => b.category === cat)
      .sort((a, b) => a.readingOrder - b.readingOrder),
  })).filter((g) => g.books.length > 0);

  const hoveredBook = books.find((b) => b.id === hoveredBookId) ?? null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "var(--bg)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "var(--bg)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            fontSize: "12px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: "var(--font-mono)",
            transition: "color var(--dur) var(--ease-out)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <span style={{ fontSize: "16px", transform: "translateY(-1px)" }}>←</span>
          BACK
        </button>
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.4rem",
            fontWeight: 500,
            margin: 0,
            color: "var(--text-primary)",
          }}
        >
          Knowledge Shelf
        </h2>
      </div>

      {/* Content */}
      <div
        style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "36px 24px 48px",
          display: "flex",
          flexDirection: "column",
          gap: "48px",
        }}
      >
        {loading ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Loading library…
          </span>
        ) : (
          <>
            {/* Introductory note */}
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-muted)",
                lineHeight: 1.65,
                margin: 0,
                maxWidth: "520px",
              }}
            >
              A curated starting library of core Islamic reference texts. Numbers
              suggest a reading order for beginners — they are a guide, not a gate.
              Lit spines mark categories you have already touched on your path.
            </p>

            {grouped.map(({ cat, books: catBooks }) => {
              const touched = isCategoryTouched(cat);
              return (
                <section key={cat} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Category label */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: touched ? "var(--accent)" : "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        color: "var(--text-faint)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      · {catBooks.length}
                    </span>
                    {touched && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: "var(--font-mono)",
                          color: "var(--green)",
                          backgroundColor: "var(--green-soft)",
                          padding: "2px 7px",
                          borderRadius: "var(--r-pill)",
                          letterSpacing: "0.05em",
                        }}
                      >
                        on your path
                      </span>
                    )}
                  </div>

                  {/* Shelf ledge + spines */}
                  <div style={{ position: "relative" }}>
                    {/* Horizontal scroll row of spines */}
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        overflowX: "auto",
                        paddingBottom: "12px",
                        scrollbarWidth: "none",
                      }}
                    >
                      {catBooks.map((book, i) => {
                        const spineColor = touched
                          ? undefined
                          : SPINE_HUES[i % SPINE_HUES.length];
                        const isHovered = hoveredBookId === book.id;

                        return (
                          <div
                            key={book.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`${book.title} by ${book.author}`}
                            onMouseEnter={() => setHoveredBookId(book.id)}
                            onMouseLeave={() => setHoveredBookId(null)}
                            onFocus={() => setHoveredBookId(book.id)}
                            onBlur={() => setHoveredBookId(null)}
                            onClick={() => {
                              if (book.externalLink) {
                                window.open(book.externalLink, "_blank", "noopener,noreferrer");
                              }
                            }}
                            style={{
                              position: "relative",
                              flexShrink: 0,
                              width: "48px",
                              height: "160px",
                              borderRadius: "var(--r-sm)",
                              backgroundColor: touched
                                ? isHovered
                                  ? "var(--accent-soft)"
                                  : "rgba(228,188,124,0.1)"
                                : isHovered
                                ? "var(--surface-3)"
                                : spineColor ?? "var(--surface-2)",
                              border: isHovered
                                ? "1px solid var(--border-strong)"
                                : "1px solid var(--border)",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 4px",
                              transition: "background-color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out), transform var(--dur) var(--ease-out)",
                              transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                            }}
                          >
                            {/* Reading order badge */}
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "9px",
                                color: touched ? "var(--accent)" : "var(--text-faint)",
                                letterSpacing: "0.05em",
                                fontWeight: 600,
                              }}
                            >
                              {book.readingOrder}
                            </span>

                            {/* Vertical title */}
                            <span
                              style={{
                                writingMode: "vertical-rl",
                                textOrientation: "mixed",
                                transform: "rotate(180deg)",
                                fontSize: "10px",
                                fontWeight: 500,
                                color: touched ? "var(--text-primary)" : "var(--text-2)",
                                letterSpacing: "0.02em",
                                lineHeight: 1.3,
                                maxHeight: "120px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                width: "100%",
                                textAlign: "center",
                              }}
                            >
                              {book.title}
                            </span>

                            {/* Authenticated badge */}
                            {book.authenticated && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  color: touched ? "var(--green)" : "var(--text-faint)",
                                  lineHeight: 1,
                                }}
                                title="Authenticated reference work"
                              >
                                ✓
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Shelf ledge line */}
                    <div
                      style={{
                        height: "2px",
                        borderRadius: "var(--r-pill)",
                        backgroundColor: "var(--surface-2)",
                        marginTop: "-2px",
                      }}
                    />
                  </div>
                </section>
              );
            })}

            {/* Human review notice */}
            <p
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-faint)",
                lineHeight: 1.6,
                margin: 0,
                letterSpacing: "0.03em",
              }}
            >
              ⚠ This library list is curated but has not yet been reviewed by a
              qualified Islamic scholar. Verify recommendations with a teacher before
              studying.
            </p>
          </>
        )}
      </div>

      {/* Book detail card — shown when a spine is hovered/focused */}
      {hoveredBook && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 48px)",
            maxWidth: "560px",
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-lg)",
            padding: "20px",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-serif)",
                  lineHeight: 1.3,
                }}
              >
                {hoveredBook.title}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                  letterSpacing: "0.03em",
                }}
              >
                {hoveredBook.author}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                {CATEGORY_LABELS[hoveredBook.category]}
              </span>
              {hoveredBook.authenticated && (
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--green)",
                    backgroundColor: "var(--green-soft)",
                    padding: "2px 6px",
                    borderRadius: "var(--r-pill)",
                  }}
                >
                  ✓ Authenticated
                </span>
              )}
            </div>
          </div>

          <p
            style={{
              fontSize: "13px",
              color: "var(--text-2)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {hoveredBook.description}
          </p>

          {hoveredBook.externalLink && (
            <span
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                color: "var(--accent)",
                letterSpacing: "0.05em",
                borderBottom: "1px solid rgba(228,188,124,0.3)",
                paddingBottom: "1px",
                alignSelf: "flex-start",
              }}
            >
              Click spine to read online ↗
            </span>
          )}
        </div>
      )}
    </div>
  );
}
