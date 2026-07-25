import { useEffect, useState } from "react";
import { type Evidence } from "../App";

export interface BasicsItem {
  id: string;
  title: string;
  category: string;
  steps: string[];
  evidence: Evidence[];
}

interface BasicsListProps {
  onOpenItem: (item: BasicsItem) => void;
  onBack: () => void;
}

const CATEGORY_ORDER = ["Purification", "Prayer Basics", "Masjid Etiquette"];

export default function BasicsList({ onOpenItem, onBack }: BasicsListProps) {
  const [items, setItems] = useState<BasicsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const API = import.meta.env.VITE_API_BASE ?? "http://localhost:3001/api";

  useEffect(() => {
    fetch(`${API}/etiquette-basics`)
      .then((r) => r.json())
      .then((data: BasicsItem[]) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [API]);

  // Group by category, ordering them logically
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: items.filter((item) => item.category === cat),
  })).filter((g) => g.items.length > 0);

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
          Worship Basics
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
          gap: "40px",
          maxWidth: "560px",
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
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
            Loading worship guides…
          </span>
        ) : (
          <>
            {/* Intro */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                Practical step-by-step guides for everyday acts of worship and purification.
                Each guide is grounded in verified Quran and authentic Hadith references.
              </p>
            </div>

            {/* List */}
            {grouped.map(({ category, items: catItems }) => (
              <section key={category} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <h3
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  {category}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {catItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onOpenItem(item)}
                      style={{
                        borderRadius: "var(--r-lg)",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        padding: "18px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        cursor: "pointer",
                        transition: "border-color var(--dur) var(--ease-out), background-color var(--dur) var(--ease-out), transform var(--dur) var(--ease-out)",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-strong)";
                        e.currentTarget.style.backgroundColor = "var(--surface-2)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.backgroundColor = "var(--surface)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          {item.steps.length} steps · {item.evidence.length} sources
                        </span>
                      </div>
                      <span style={{ fontSize: "16px", color: "var(--accent)", transform: "translateX(2px)", transition: "transform var(--dur)" }} className="arrow">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
