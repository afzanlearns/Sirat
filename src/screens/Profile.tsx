import { useEffect, useState } from "react";
import { isSupabaseEnabled, currentUser } from "../lib/supabase";

interface ProfileProps {
  userId: string;
  completed: number;
  total: number;
  onRefresh: () => void;
  onSignOut?: () => void;
}

export default function Profile({ completed, total, onRefresh, onSignOut }: ProfileProps) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseEnabled) currentUser().then((u) => setEmail(u?.email ?? null));
  }, []);

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
          <span className="h3" style={{ wordBreak: "break-word" }}>{email ?? "Local guest"}</span>
          <p style={{ fontSize: "0.9rem", color: "var(--text-2)", lineHeight: 1.6 }}>
            {email
              ? "You're signed in — your path is saved and syncs to this account on any device."
              : "Your progress is saved on this device."}
          </p>
        </div>
        {onSignOut && email && (
          <button
            onClick={onSignOut}
            style={{
              alignSelf: "flex-start",
              padding: "11px 18px",
              borderRadius: "var(--r-pill)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-2)",
              fontSize: "0.9rem",
              fontWeight: 500,
              transition: "border-color var(--dur), color var(--dur)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-soft)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-2)"; }}
          >
            Sign out
          </button>
        )}
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
