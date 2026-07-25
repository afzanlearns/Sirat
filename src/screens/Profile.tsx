import { isSupabaseEnabled } from "../lib/supabase";

interface ProfileProps {
  userId: string;
  completed: number;
  total: number;
  onRefresh: () => void;
}

export default function Profile({ userId, completed, total, onRefresh }: ProfileProps) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const isAnon = userId.length > 20 && !userId.startsWith("user_");

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", padding: "28px 20px 40px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <h1 className="h1">You</h1>

      {/* Progress */}
      <section style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--border)", background: "var(--surface)", padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <span className="label">Your journey</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <span className="serif num" style={{ fontSize: "2.6rem", lineHeight: 1, color: "var(--accent)" }}>{completed}</span>
          <span className="num" style={{ fontSize: "1rem", color: "var(--text-muted)" }}>of {total} steps</span>
        </div>
        <div style={{ height: "6px", borderRadius: "var(--r-pill)", background: "var(--surface-2)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "var(--green)", borderRadius: "var(--r-pill)", transition: "width 400ms var(--ease-out)" }} />
        </div>
      </section>

      {/* Account */}
      <section style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--border)", background: "var(--surface)", padding: "22px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <span className="label">Account</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span className="h3">{isAnon ? "Guest (this device)" : "Local guest"}</span>
          <p style={{ fontSize: "0.9rem", color: "var(--text-2)", lineHeight: 1.6 }}>
            {isSupabaseEnabled
              ? "Your progress is saved privately. Sign in to keep it across devices — coming next: one-tap Google and passwordless email."
              : "Your progress is saved on this device."}
          </p>
        </div>
        <button
          disabled
          style={{
            alignSelf: "flex-start",
            padding: "11px 18px",
            borderRadius: "var(--r-pill)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            fontWeight: 500,
            cursor: "not-allowed",
          }}
        >
          Sign in · coming soon
        </button>
      </section>

      {/* Graduation ethos */}
      <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.7, fontStyle: "italic" }}>
        Sirat's aim is to become unnecessary — to hand you to a teacher and a
        community, then step aside. That is success, not churn.
      </p>

      <button
        onClick={onRefresh}
        style={{ alignSelf: "flex-start", fontSize: "0.8rem", color: "var(--text-muted)", textDecoration: "underline", textUnderlineOffset: "3px" }}
      >
        Refresh progress
      </button>
    </div>
  );
}
