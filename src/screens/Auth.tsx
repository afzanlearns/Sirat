import { useState, useCallback } from "react";
import { signInEmail, signUpEmail, signInWithGoogle } from "../lib/supabase";

interface AuthProps {
  /** Called once the user has an active session. */
  onAuthed: () => void;
}

type Mode = "signin" | "signup";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "var(--r-md)",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-sans)",
  fontSize: "1rem",
  outline: "none",
};

export default function Auth({ onAuthed }: AuthProps) {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const em = email.trim();
      if (!em || !password) {
        setError("Please enter your email and a password.");
        return;
      }
      if (mode === "signup" && password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      setBusy(true);
      setError("");
      const result =
        mode === "signup" ? await signUpEmail(em, password) : await signInEmail(em, password);
      setBusy(false);

      if (!result.ok) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (result.needsConfirmation) {
        setCheckEmail(true);
        return;
      }
      onAuthed();
    },
    [mode, email, password, onAuthed]
  );

  if (checkEmail) {
    return (
      <Frame>
        <span className="label" style={{ color: "var(--accent)" }}>Almost there</span>
        <h1 className="h1">Check your email</h1>
        <p style={{ color: "var(--text-2)", lineHeight: 1.7 }}>
          We sent a confirmation link to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
          Open it, then come back and sign in.
        </p>
        <button
          onClick={() => { setCheckEmail(false); setMode("signin"); setPassword(""); }}
          style={pillGhost}
        >
          Back to sign in
        </button>
      </Frame>
    );
  }

  return (
    <Frame>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <span className="label" style={{ color: "var(--accent)" }}>Sirat</span>
        <h1 className="h1">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6 }}>
          {mode === "signup"
            ? "Save your path and pick up where you left off, on any device."
            : "Sign in to continue your path."}
        </p>
      </div>

      {/* Google OAuth */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <button
          type="button"
          onClick={async () => {
            setError("");
            setBusy(true);
            const r = await signInWithGoogle();
            setBusy(false);
            if (!r.ok) setError(r.error ?? "Could not start Google sign-in.");
            // on success the browser redirects to Google
          }}
          disabled={busy}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "13px",
            borderRadius: "var(--r-pill)",
            background: "var(--text-primary)",
            color: "#1A1A1A",
            fontWeight: 600,
            fontSize: "0.95rem",
            cursor: busy ? "wait" : "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
          </svg>
          Continue with Google
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span className="label" style={{ color: "var(--text-faint)", fontSize: "0.62rem" }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-soft)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        <input
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "Choose a password (6+ characters)" : "Your password"}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-soft)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />

        {error && (
          <span style={{ fontSize: "0.85rem", color: "#E8A0A0", lineHeight: 1.5 }}>{error}</span>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            marginTop: "4px",
            padding: "14px",
            borderRadius: "var(--r-pill)",
            background: "var(--accent)",
            color: "#20160A",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: busy ? "wait" : "pointer",
            transition: "opacity var(--dur)",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <button
        onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}
        style={{ fontSize: "0.9rem", color: "var(--text-muted)", alignSelf: "center" }}
      >
        {mode === "signup" ? (
          <>Already have an account? <span style={{ color: "var(--accent)" }}>Sign in</span></>
        ) : (
          <>New here? <span style={{ color: "var(--accent)" }}>Create an account</span></>
        )}
      </button>
    </Frame>
  );
}

const pillGhost: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: "var(--r-pill)",
  border: "1px solid var(--border-strong)",
  color: "var(--text-2)",
  fontSize: "0.95rem",
  fontWeight: 500,
  alignSelf: "flex-start",
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ maxWidth: "420px", width: "100%", margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {children}
      </div>
    </div>
  );
}
