interface OnboardingProps {
  onBegin: () => void;
}

export default function Onboarding({ onBegin }: OnboardingProps) {
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
      {/* Top Section */}
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h1
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: "0 0 24px 0",
            lineHeight: "1.1",
            color: "var(--text-primary)",
          }}
        >
          SIRAT
        </h1>
        <p
          style={{
            fontSize: "14px",
            lineHeight: "1.6",
            letterSpacing: "0.05em",
            color: "var(--text-muted)",
            maxWidth: "460px",
            margin: 0,
          }}
        >
          A guided learning companion for new Muslims. Complete a brief diagnostic,
          uncover your custom path, and track your progression live.
        </p>
      </div>

      {/* Bottom Section */}
      <div style={{ width: "100%" }}>
        <button
          onClick={onBegin}
          style={{
            width: "100%",
            padding: "20px",
            backgroundColor: "var(--primary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontSize: "16px",
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
          BEGIN
        </button>
      </div>
    </div>
  );
}