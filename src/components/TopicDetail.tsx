import { useState } from "react";

export interface Evidence {
  type: "quran" | "hadith" | "video";
  reference: string;
  summary?: string;
  grading?: string;
  url: string;
}

interface TopicDetailData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: number;
  resource: { title: string; source: string; url: string };
  evidence?: Evidence[];
}

interface TopicDetailProps {
  topicId: string;
  topicDetail: TopicDetailData | null;
  loading: boolean;
  nodeStatus: "locked" | "unlocked" | "completed";
  onMarkComplete: (topicId: string) => void;
  onBack: () => void;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
}

export default function TopicDetail({
  topicId,
  topicDetail,
  loading,
  nodeStatus,
  onMarkComplete,
  onBack,
}: TopicDetailProps) {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  let buttonText = "MARK COMPLETE";
  let buttonBg = "var(--accent)";
  let buttonTextColor = "var(--bg)";
  let isButtonDisabled = false;

  if (nodeStatus === "completed") {
    buttonText = "COMPLETED";
    buttonBg = "var(--green-soft)";
    buttonTextColor = "var(--green)";
    isButtonDisabled = true;
  } else if (nodeStatus === "locked") {
    buttonText = "LOCKED — COMPLETE PREREQUISITES FIRST";
    buttonBg = "var(--surface-2)";
    buttonTextColor = "var(--text-faint)";
    isButtonDisabled = true;
  }

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
          backgroundColor: "var(--bg)",
          position: "sticky",
          top: 0,
          zIndex: 10,
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
          BACK TO PATH
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "40px 24px 160px",
          maxWidth: "640px",
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "36px",
        }}
      >
        {loading || !topicDetail ? (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "12px",
              letterSpacing: "0.1em",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
            }}
          >
            LOADING...
          </div>
        ) : (
          <>
            {/* Category & Title */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <span
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.18em",
                  color: "var(--accent)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {topicDetail.category} · LEVEL {topicDetail.difficulty}
              </span>
              <h2
                style={{
                  fontSize: "32px",
                  fontWeight: 500,
                  fontFamily: "var(--font-serif)",
                  lineHeight: "1.2",
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                {topicDetail.title}
              </h2>
            </div>

            {/* Description */}
            <p
              style={{
                fontSize: "15px",
                lineHeight: "1.7",
                color: "var(--text-2)",
                margin: 0,
              }}
            >
              {topicDetail.description}
            </p>

            {/* Evidence Section */}
            {topicDetail.evidence && topicDetail.evidence.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.18em",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  EVIDENCE & CITATIONS
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {topicDetail.evidence.map((item, index) => {
                    const isVideo = item.type === "video";
                    const embedUrl = isVideo ? getYouTubeEmbedUrl(item.url) : null;
                    const cardId = `evidence-${index}`;
                    const isHovered = hoveredCardId === cardId;

                    if (isVideo && embedUrl) {
                      return (
                        <div
                          key={index}
                          style={{
                            backgroundColor: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--r-md)",
                            padding: "20px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "14px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                fontFamily: "var(--font-mono)",
                                color: "var(--text-muted)",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                              }}
                            >
                              VIDEO REFERENCE
                            </span>
                            <span
                              style={{
                                fontSize: "12px",
                                color: "var(--text-2)",
                                fontWeight: 500,
                              }}
                            >
                              {item.reference}
                            </span>
                          </div>
                          <div
                            style={{
                              position: "relative",
                              paddingBottom: "56.25%",
                              height: 0,
                              overflow: "hidden",
                              borderRadius: "var(--r-sm)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <iframe
                              src={embedUrl}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                              }}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title={item.reference}
                            />
                          </div>
                        </div>
                      );
                    }

                    // Render Quran/Hadith clickable card
                    return (
                      <a
                        key={index}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onMouseEnter={() => setHoveredCardId(cardId)}
                        onMouseLeave={() => setHoveredCardId(null)}
                        style={{
                          backgroundColor: isHovered ? "var(--surface-2)" : "var(--surface)",
                          border: isHovered ? "1px solid var(--border-strong)" : "1px solid var(--border)",
                          borderRadius: "var(--r-md)",
                          padding: "20px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          textDecoration: "none",
                          color: "inherit",
                          transition: "background-color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out), transform var(--dur) var(--ease-out)",
                          transform: isHovered ? "translateY(-1px)" : "translateY(0)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                fontFamily: "var(--font-mono)",
                                color: item.type === "quran" ? "var(--accent)" : "var(--green)",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                fontWeight: 600,
                              }}
                            >
                              {item.type === "quran" ? "QUR'AN" : "HADITH"}
                            </span>
                            {item.grading && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontFamily: "var(--font-mono)",
                                  color: "var(--green)",
                                  backgroundColor: "var(--green-soft)",
                                  padding: "2px 6px",
                                  borderRadius: "var(--r-pill)",
                                  fontWeight: 500,
                                }}
                              >
                                {item.grading}
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: "12px",
                              fontFamily: "var(--font-mono)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {item.reference} ↗
                          </span>
                        </div>
                        {item.summary && (
                          <p
                            style={{
                              fontSize: "14px",
                              lineHeight: "1.6",
                              color: "var(--text-2)",
                              margin: 0,
                            }}
                          >
                            {item.summary}
                          </p>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommended Resource Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <span
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.18em",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                RECOMMENDED RESOURCE
              </span>
              <a
                href={topicDetail.resource.url}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setHoveredCardId("resource")}
                onMouseLeave={() => setHoveredCardId(null)}
                style={{
                  backgroundColor: hoveredCardId === "resource" ? "var(--surface-2)" : "var(--surface)",
                  border: hoveredCardId === "resource" ? "1px solid var(--border-strong)" : "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  textDecoration: "none",
                  transition: "background-color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out), transform var(--dur) var(--ease-out)",
                  transform: hoveredCardId === "resource" ? "translateY(-1px)" : "translateY(0)",
                }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {topicDetail.resource.title}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--accent)",
                  }}
                >
                  {topicDetail.resource.source} ↗
                </span>
              </a>
            </div>
          </>
        )}
      </div>

      {/* Bottom sticky CTA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: "1px solid var(--border)",
          backgroundColor: "var(--bg)",
          padding: "20px 24px",
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: "640px", width: "100%", margin: "0 auto" }}>
          <button
            onClick={() => !isButtonDisabled && onMarkComplete(topicId)}
            disabled={isButtonDisabled}
            style={{
              width: "100%",
              padding: "16px",
              backgroundColor: buttonBg,
              color: buttonTextColor,
              borderRadius: "var(--r-md)",
              border: "1px solid var(--border)",
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: isButtonDisabled ? "not-allowed" : "pointer",
              fontFamily: "var(--font-mono)",
              transition: "border-color var(--dur) var(--ease-out), opacity var(--dur) var(--ease-out), transform 100ms ease-out",
            }}
            onMouseEnter={(e) => {
              if (!isButtonDisabled) {
                e.currentTarget.style.borderColor = "var(--border-strong)";
                e.currentTarget.style.opacity = "0.9";
              }
            }}
            onMouseLeave={(e) => {
              if (!isButtonDisabled) {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.opacity = "1";
              }
            }}
            onMouseDown={(e) => {
              if (!isButtonDisabled) {
                e.currentTarget.style.transform = "scale(0.98)";
              }
            }}
            onMouseUp={(e) => {
              if (!isButtonDisabled) {
                e.currentTarget.style.transform = "scale(1)";
              }
            }}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

