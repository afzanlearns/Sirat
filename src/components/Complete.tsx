interface CompleteProps {
  completedCount: number;
  totalCount: number;
  onRestart: () => void;
}

export default function Complete({ completedCount, totalCount, onRestart }: CompleteProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        width: "100%",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "64px 24px",
        backgroundColor: "var(--bg)",
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "40px",
        }}
      >
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
            PATH COMPLETE
          </span>
          <h1
            style={{
              fontSize: "36px",
              fontWeight: "bold",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: 0,
              lineHeight: "1.1",
            }}
          >
            ALHAMDULILLAH
          </h1>
        </div>

        <p
          style={{
            fontSize: "14px",
            lineHeight: "1.6",
            color: "var(--text-muted)",
            maxWidth: "460px",
            margin: 0,
          }}
        >
          You have completed all foundational modules on your learning path. May this
          knowledge bring certainty, comfort, and steady progression to your daily practice.
        </p>

        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
              MODULES COMPLETED
            </span>
            <span
              style={{
                fontSize: "12px",
                letterSpacing: "0.1em",
                fontWeight: "bold",
                color: "var(--secondary)",
              }}
            >
              {completedCount}/{totalCount}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid var(--border)",
              paddingTop: "16px",
            }}
          >
            <span style={{ fontSize: "12px", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
              JOURNEY PROGRESS
            </span>
            <span
              style={{
                fontSize: "12px",
                letterSpacing: "0.1em",
                fontWeight: "bold",
                color: "var(--primary)",
              }}
            >
              100% COMPLETE
            </span>
          </div>
        </div>
      </div>

      <div style={{ width: "100%" }}>
        <button
          onClick={onRestart}
          style={{
            width: "100%",
            padding: "20px",
            backgroundColor: "var(--primary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontSize: "14px",
            fontWeight: "bold",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            transition: "background-color 150ms ease-out, border-color 150ms ease-out",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--surface)";
            e.currentTarget.style.borderColor = "var(--primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--primary)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          BEGIN NEW PATH
        </button>
      </div>
    </div>
  );
}
