interface OnboardingProps {
  onBegin: () => void;
}

const FEATURES = [
  { label: "A personalised path" },
  { label: "Answers from Qur'an & Hadith" },
  { label: "Prayer times & community" },
];

export default function Onboarding({ onBegin }: OnboardingProps) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "40px",
        padding: "56px 24px calc(40px + env(safe-area-inset-bottom, 0px))",
        maxWidth: "480px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        <img
          src="/icon.svg"
          alt="Sirat"
          width={88}
          height={88}
          style={{ borderRadius: "22px", boxShadow: "0 12px 40px -12px rgba(228,188,124,0.35)" }}
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <h1 className="serif" style={{ fontSize: "2.75rem", lineHeight: 1, letterSpacing: "-0.02em" }}>
            Sirat
          </h1>
          <span className="serif" style={{ fontSize: "1.5rem", color: "var(--accent)", direction: "rtl" }}>
            صِرَاط
          </span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", letterSpacing: "0.02em" }}>
            the straight path
          </span>
        </div>
      </div>

      {/* Intro */}
      <p style={{ fontSize: "1.02rem", lineHeight: 1.7, color: "var(--text-2)", maxWidth: "380px" }}>
        A calm companion for new Muslims. Take a short diagnostic, uncover your own
        path, and walk it one step at a time.
      </p>

      {/* Feature hints */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "320px" }}>
        {FEATURES.map((f) => (
          <div
            key={f.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "var(--r-md)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              textAlign: "left",
            }}
          >
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{f.label}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <button
          onClick={onBegin}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "var(--r-pill)",
            background: "var(--accent)",
            color: "#20160A",
            fontWeight: 600,
            fontSize: "1.02rem",
            transition: "transform 120ms var(--ease-out), opacity var(--dur)",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          Begin
        </button>
        <span style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>
          Free · works offline · your progress is private
        </span>
      </div>
    </div>
  );
}
