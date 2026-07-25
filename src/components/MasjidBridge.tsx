import { useState, useEffect, useCallback } from "react";
import {
  loadDirectory as fetchDirectory,
  submitConnect as sendConnect,
  loadMyRequests,
  subscribeMyRequests,
  type Masjid,
  type ConnectType,
  type ConnectRequest,
  type RequestStatus,
} from "../lib/community";
import { isSupabaseEnabled } from "../lib/supabase";

const API = (import.meta.env.VITE_API_BASE as string) ?? "http://localhost:3001/api";

interface EtiquetteSection {
  id: string;
  title: string;
  points: string[];
}
type Tab = "find" | "etiquette" | "connect";

interface MasjidBridgeProps {
  userId: string;
  onBack: () => void;
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.2em",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  fontWeight: "bold",
};

function Flag({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: "bold",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--bg)",
        backgroundColor: "var(--secondary)",
        padding: "3px 8px",
      }}
    >
      {label}
    </span>
  );
}

const STATUS_META: Record<RequestStatus, { label: string; bg: string; fg: string; border: string }> = {
  new: { label: "AWAITING MATCH", bg: "transparent", fg: "var(--secondary)", border: "var(--secondary)" },
  matched: { label: "MATCHED ✓", bg: "var(--primary)", fg: "var(--text-primary)", border: "var(--primary)" },
  met: { label: "MET", bg: "var(--secondary)", fg: "var(--bg)", border: "var(--secondary)" },
  closed: { label: "CLOSED", bg: "transparent", fg: "var(--text-muted)", border: "var(--border)" },
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.new;
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: "bold",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: m.fg,
        backgroundColor: m.bg,
        border: `1px solid ${m.border}`,
        padding: "5px 10px",
        whiteSpace: "nowrap",
        transition: "background-color 300ms ease-out, color 300ms ease-out",
      }}
    >
      {m.label}
    </span>
  );
}

export default function MasjidBridge({ userId, onBack }: MasjidBridgeProps) {
  const [tab, setTab] = useState<Tab>("find");

  // Directory
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState(false);
  const [city, setCity] = useState("");
  const [revertOnly, setRevertOnly] = useState(false);
  const [classOnly, setClassOnly] = useState(false);

  // Etiquette
  const [sections, setSections] = useState<EtiquetteSection[]>([]);
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Connect form
  const [type, setType] = useState<ConnectType>("buddy");
  const [name, setName] = useState("");
  const [connectCity, setConnectCity] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  // Live requests (Supabase realtime, when configured)
  const [myRequests, setMyRequests] = useState<ConnectRequest[]>([]);

  const loadDirectory = useCallback(() => {
    fetchDirectory({
      city: city || undefined,
      revertFriendly: revertOnly || undefined,
      newMuslimClass: classOnly || undefined,
    })
      .then((d) => {
        setMasjids(d.masjids ?? []);
        setCities(d.cities ?? []);
        setSampleData(d.sampleData ?? false);
      })
      .catch(() => setMasjids([]));
  }, [city, revertOnly, classOnly]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  useEffect(() => {
    fetch(`${API}/masjid/etiquette`)
      .then((r) => r.json())
      .then((d: { sections: EtiquetteSection[] }) => setSections(d.sections ?? []))
      .catch(() => setSections([]));
  }, []);

  // Load + live-subscribe to this user's own requests (RLS-scoped).
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    let unsub = () => {};
    loadMyRequests().then(setMyRequests);
    subscribeMyRequests((r) => {
      setMyRequests((prev) => {
        const exists = prev.some((x) => x.id === r.id);
        return exists ? prev.map((x) => (x.id === r.id ? r : x)) : [r, ...prev];
      });
    }).then((fn) => {
      unsub = fn;
    });
    return () => unsub();
  }, []);

  const submitConnect = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!contact.trim()) {
        setFormError("Please give us a way to reach you.");
        return;
      }
      setSubmitting(true);
      setFormError("");
      try {
        const result = await sendConnect({
          userId,
          name,
          city: connectCity,
          contactMethod: contact,
          type,
          message,
        });
        if (!result.ok) {
          setFormError(result.error ?? "Something went wrong. Please try again.");
        } else {
          setSubmitted(true);
          if (result.request) {
            const req = result.request;
            setMyRequests((prev) => [req, ...prev.filter((r) => r.id !== req.id)]);
          }
        }
      } catch {
        setFormError("Could not reach Sirat. Check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [userId, name, connectCity, contact, type, message]
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "find", label: "FIND A MASJID" },
    { key: "etiquette", label: "BEFORE YOU GO" },
    { key: "connect", label: "FIND YOUR PEOPLE" },
  ];

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
          justifyContent: "space-between",
          flexShrink: 0,
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
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <span style={{ fontSize: "16px", transform: "translateY(-1px)" }}>←</span>
          BACK TO PATH
        </button>
        <span
          style={{
            fontSize: "12px",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            fontWeight: "bold",
            color: "var(--secondary)",
          }}
        >
          COMMUNITY
        </span>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: "16px 8px",
              fontSize: "11px",
              fontWeight: "bold",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: tab === t.key ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom:
                tab === t.key ? "2px solid var(--secondary)" : "2px solid transparent",
              transition: "color 150ms ease-out, border-color 150ms ease-out",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "32px 24px 100px",
          maxWidth: "640px",
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Differentiator framing */}
        <p
          style={{
            fontSize: "12px",
            lineHeight: "1.7",
            color: "var(--text-muted)",
            margin: 0,
          }}
        >
          <strong style={{ color: "var(--secondary)" }}>This is real connection, not generated advice.</strong>{" "}
          Sirat links you to actual places and actual people — a chatbot can't walk you
          through a masjid door or introduce you to a mentor.
        </p>

        {/* ── FIND A MASJID ── */}
        {tab === "find" && (
          <>
            {sampleData && (
              <div
                style={{
                  ...LABEL_STYLE,
                  color: "var(--secondary)",
                  border: "1px solid var(--border)",
                  padding: "12px 14px",
                  lineHeight: "1.6",
                }}
              >
                SAMPLE LISTINGS — TO BE REPLACED WITH VERIFIED LOCAL DATA
              </div>
            )}

            {/* Filters */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  padding: "14px 16px",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  letterSpacing: "0.05em",
                  outline: "none",
                }}
              >
                <option value="">ALL CITIES</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: "10px" }}>
                {[
                  { on: revertOnly, set: setRevertOnly, label: "REVERT-FRIENDLY" },
                  { on: classOnly, set: setClassOnly, label: "NEW-MUSLIM CLASS" },
                ].map((f) => (
                  <button
                    key={f.label}
                    onClick={() => f.set(!f.on)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      fontSize: "10px",
                      fontWeight: "bold",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      border: `1px solid ${f.on ? "var(--primary)" : "var(--border)"}`,
                      backgroundColor: f.on ? "var(--primary)" : "transparent",
                      color: f.on ? "var(--text-primary)" : "var(--text-muted)",
                      transition: "all 150ms ease-out",
                    }}
                  >
                    {f.on ? "✓ " : ""}
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            {masjids.length === 0 ? (
              <div style={{ ...LABEL_STYLE }}>NO MASJIDS MATCH THESE FILTERS.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {masjids.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--surface)",
                      padding: "18px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "bold",
                          letterSpacing: "0.03em",
                          textTransform: "uppercase",
                        }}
                      >
                        {m.name}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                        {m.area} · {m.city}
                      </span>
                    </div>

                    {(m.revertFriendly || m.newMuslimClass || m.womensFacility) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {m.revertFriendly && <Flag label="Revert-friendly" />}
                        {m.newMuslimClass && <Flag label="New-Muslim class" />}
                        {m.womensFacility && <Flag label="Sisters' facility" />}
                      </div>
                    )}

                    <p style={{ fontSize: "12px", lineHeight: "1.65", color: "var(--text-primary)", margin: 0 }}>
                      {m.note}
                    </p>

                    {m.languages.length > 0 && (
                      <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                        LANGUAGES: {m.languages.join(", ").toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── BEFORE YOU GO (etiquette) ── */}
        {tab === "etiquette" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {sections.map((s) => {
              const open = openSection === s.id;
              return (
                <div key={s.id} style={{ border: "1px solid var(--border)" }}>
                  <button
                    onClick={() => setOpenSection(open ? null : s.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "16px 18px",
                      backgroundColor: open ? "var(--surface)" : "transparent",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      fontWeight: "bold",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {s.title}
                    <span style={{ color: "var(--secondary)", fontSize: "16px" }}>
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  {open && (
                    <ul
                      style={{
                        listStyle: "none",
                        padding: "4px 18px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        margin: 0,
                      }}
                    >
                      {s.points.map((p, i) => (
                        <li
                          key={i}
                          style={{
                            fontSize: "13px",
                            lineHeight: "1.7",
                            color: "var(--text-primary)",
                            paddingLeft: "16px",
                            borderLeft: "2px solid var(--border)",
                          }}
                        >
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── FIND YOUR PEOPLE (connect) ── */}
        {tab === "connect" && (
          <>
            {myRequests.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "8px" }}>
                <span style={{ ...LABEL_STYLE, color: "var(--secondary)" }}>YOUR REQUESTS · LIVE</span>
                {myRequests.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--surface)",
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {r.type}
                        {r.city ? ` · ${r.city}` : ""}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
                <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.05em", lineHeight: "1.6" }}>
                  Status updates here in real time as a human on the team responds — no refresh needed.
                </span>
              </div>
            )}

            {submitted ? (
              <div
                style={{
                  border: "1px solid var(--primary)",
                  backgroundColor: "var(--surface)",
                  padding: "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <span style={{ ...LABEL_STYLE, color: "var(--primary)" }}>REQUEST RECEIVED</span>
                <p style={{ fontSize: "14px", lineHeight: "1.7", margin: 0 }}>
                  Your request is saved and a real person will follow up — this is not an
                  automated reply. You are not walking this path alone, in shaa Allah.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setContact("");
                    setMessage("");
                    setName("");
                  }}
                  style={{
                    marginTop: "8px",
                    padding: "14px",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    fontWeight: "bold",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}
                >
                  SEND ANOTHER REQUEST
                </button>
              </div>
            ) : (
              <form onSubmit={submitConnect} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <p style={{ fontSize: "13px", lineHeight: "1.7", color: "var(--text-primary)", margin: 0 }}>
                  Tell us what you're looking for. A real person from the Sirat team reads
                  every request and helps connect you locally.
                </p>

                {/* Type selector */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={LABEL_STYLE}>I'M LOOKING FOR</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {(
                      [
                        { key: "buddy", label: "A BUDDY" },
                        { key: "mentor", label: "A MENTOR" },
                        { key: "visit", label: "A MASJID VISIT" },
                      ] as { key: ConnectType; label: string }[]
                    ).map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => setType(o.key)}
                        style={{
                          flex: 1,
                          padding: "12px 6px",
                          fontSize: "10px",
                          fontWeight: "bold",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          border: `1px solid ${type === o.key ? "var(--secondary)" : "var(--border)"}`,
                          backgroundColor: type === o.key ? "var(--secondary)" : "transparent",
                          color: type === o.key ? "var(--bg)" : "var(--text-muted)",
                          transition: "all 150ms ease-out",
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="YOUR NAME (OPTIONAL)">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First name or nickname"
                    style={inputStyle}
                  />
                </Field>

                <Field label="YOUR CITY">
                  <input
                    value={connectCity}
                    onChange={(e) => setConnectCity(e.target.value)}
                    placeholder="e.g. Manchester"
                    style={inputStyle}
                  />
                </Field>

                <Field label="HOW SHOULD WE REACH YOU?">
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Email or phone — kept private"
                    style={inputStyle}
                  />
                </Field>

                <Field label="ANYTHING YOU'D LIKE US TO KNOW (OPTIONAL)">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="e.g. I just took my shahada and don't know anyone local."
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </Field>

                {formError && (
                  <span style={{ ...LABEL_STYLE, color: "var(--secondary)" }}>{formError}</span>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "18px",
                    backgroundColor: "var(--primary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    fontSize: "13px",
                    fontWeight: "bold",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "SENDING..." : "SEND REQUEST"}
                </button>

                <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.06em", lineHeight: "1.6" }}>
                  Your details are stored only to connect you and are never shown publicly.
                </span>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  letterSpacing: "0.02em",
  outline: "none",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <span style={LABEL_STYLE}>{label}</span>
      {children}
    </div>
  );
}
