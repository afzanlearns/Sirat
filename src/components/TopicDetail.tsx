interface TopicDetailData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: number;
  resource: { title: string; source: string; url: string };
}

interface TopicDetailProps {
  topicId: string;
  topicDetail: TopicDetailData | null;
  loading: boolean;
  nodeStatus: "locked" | "unlocked" | "completed";
  onMarkComplete: (topicId: string) => void;
  onBack: () => void;
}

export default function TopicDetail({
  topicId,
  topicDetail,
  loading,
  nodeStatus,
  onMarkComplete,
  onBack,
}: TopicDetailProps) {
  let buttonText = "MARK COMPLETE";
  let buttonBg = "var(--primary)";
  let buttonTextColor = "var(--text-primary)";
  let isButtonDisabled = false;

  if (nodeStatus === "completed") {
    buttonText = "COMPLETED";
    buttonBg = "var(--secondary)";
    buttonTextColor = "var(--bg)";
    isButtonDisabled = true;
  } else if (nodeStatus === "locked") {
    buttonText = "LOCKED — COMPLETE PREREQUISITES FIRST";
    buttonBg = "var(--muted)";
    buttonTextColor = "var(--text-muted)";
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
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "24px",
          display: "flex",
          alignItems: "center",
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
            transition: "color 150ms ease-out",
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
          padding: "48px 24px 140px",
          maxWidth: "600px",
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "40px",
        }}
      >
        {loading || !topicDetail ? (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "13px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            LOADING...
          </div>
        ) : (
          <>
            {/* Label + title */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.2em",
                  color: "var(--secondary)",
                  textTransform: "uppercase",
                  fontWeight: "bold",
                }}
              >
                {topicDetail.category} · LEVEL {topicDetail.difficulty}
              </span>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  letterSpacing: "0.05em",
                  lineHeight: "1.2",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                {topicDetail.title}
              </h2>
            </div>

            {/* Description */}
            <p
              style={{
                fontSize: "14px",
                lineHeight: "1.7",
                color: "var(--text-primary)",
                letterSpacing: "0.02em",
                margin: 0,
              }}
            >
              {topicDetail.description}
            </p>

            {/* Resource block */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <span
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.2em",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  fontWeight: "bold",
                }}
              >
                RECOMMENDED RESOURCE
              </span>
              <a
                href={topicDetail.resource.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  textDecoration: "none",
                  transition: "border-color 150ms ease-out",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--primary)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)")
                }
              >
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--text-primary)",
                  }}
                >
                  {topicDetail.resource.title}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    letterSpacing: "0.08em",
                    color: "var(--secondary)",
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
          padding: "24px",
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: "600px", width: "100%", margin: "0 auto" }}>
          <button
            onClick={() => !isButtonDisabled && onMarkComplete(topicId)}
            disabled={isButtonDisabled}
            style={{
              width: "100%",
              padding: "20px",
              backgroundColor: buttonBg,
              color: buttonTextColor,
              border: "1px solid var(--border)",
              fontSize: "14px",
              fontWeight: "bold",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: isButtonDisabled ? "not-allowed" : "pointer",
              transition: "opacity 150ms ease-out, border-color 150ms ease-out",
            }}
            onMouseEnter={(e) => {
              if (!isButtonDisabled) {
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.opacity = "0.9";
              }
            }}
            onMouseLeave={(e) => {
              if (!isButtonDisabled) {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.opacity = "1";
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
