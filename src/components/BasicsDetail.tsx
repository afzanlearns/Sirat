import { type BasicsItem } from "./BasicsList";

interface BasicsDetailProps {
  item: BasicsItem;
  onBack: () => void;
}

export default function BasicsDetail({ item, onBack }: BasicsDetailProps) {
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
      {/* Sticky Header */}
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
        <span
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            color: "var(--text-faint)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {item.category}
        </span>
      </div>

      {/* Content */}
      <div
        style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "36px 24px 64px",
          display: "flex",
          flexDirection: "column",
          gap: "36px",
          maxWidth: "560px",
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "2rem",
            fontWeight: 500,
            lineHeight: 1.25,
            margin: 0,
            color: "var(--text-primary)",
          }}
        >
          {item.title}
        </h1>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {item.steps.map((step, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: "18px",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "var(--surface-3)",
                  border: "1px solid var(--border)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  fontWeight: 600,
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}
              >
                {index + 1}
              </div>
              <p
                style={{
                  fontSize: "14px",
                  lineHeight: 1.6,
                  color: "var(--text-2)",
                  margin: 0,
                  paddingTop: "4px",
                }}
              >
                {step}
              </p>
            </div>
          ))}
        </div>

        {/* Evidence divider */}
        <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "12px 0" }} />

        {/* Evidence Section */}
        {item.evidence && item.evidence.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              Evidence & Citations
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {item.evidence.map((ev, i) => {
                const isHadith = ev.type === "hadith";
                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (ev.url) window.open(ev.url, "_blank", "noopener,noreferrer");
                    }}
                    style={{
                      borderRadius: "var(--r-lg)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      transition: "border-color var(--dur) var(--ease-out), transform var(--dur) var(--ease-out)",
                      cursor: ev.url ? "pointer" : "default",
                    }}
                    onMouseEnter={(e) => {
                      if (ev.url) {
                        e.currentTarget.style.borderColor = "var(--border-strong)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (ev.url) {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {/* Tag */}
                      <span
                        style={{
                          fontSize: "9px",
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          padding: "2px 7px",
                          borderRadius: "var(--r-pill)",
                          fontWeight: 600,
                          backgroundColor: isHadith ? "var(--green-soft)" : "rgba(228,188,124,0.15)",
                          color: isHadith ? "var(--green)" : "var(--accent)",
                        }}
                      >
                        {ev.type}
                      </span>
                      {/* Hadith Grading */}
                      {isHadith && ev.grading && (
                        <span
                          style={{
                            fontSize: "9px",
                            fontFamily: "var(--font-mono)",
                            backgroundColor: "var(--green-soft)",
                            color: "var(--green)",
                            padding: "2px 7px",
                            borderRadius: "var(--r-pill)",
                            fontWeight: 500,
                          }}
                        >
                          {ev.grading}
                        </span>
                      )}
                      {/* Reference Text */}
                      <span
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-muted)",
                          marginLeft: "auto",
                        }}
                      >
                        {ev.reference} {ev.url && "↗"}
                      </span>
                    </div>

                    {/* Summary */}
                    {ev.summary && (
                      <p
                        style={{
                          fontSize: "13px",
                          lineHeight: 1.55,
                          color: "var(--text-2)",
                          margin: 0,
                          fontStyle: "italic",
                        }}
                      >
                        "{ev.summary}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
