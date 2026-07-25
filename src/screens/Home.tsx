import { useState, useEffect } from "react";
import {
  fetchPrayerTimes,
  getStoredLocation,
  useNextPrayer,
  formatCountdown,
  type PrayerTimesData,
} from "../lib/prayer";

interface Node {
  topicId: string;
  status: "locked" | "unlocked" | "completed";
  title: string;
  category: string;
  difficulty: number;
}

interface HomeProps {
  nodes: Node[];
  onOpenTopic: (topicId: string) => void;
  onOpenPrayer: () => void;
}

const CATEGORY: Record<string, string> = {
  Aqeedah: "Belief",
  Ibadah: "Worship",
  Fiqh: "Practice",
  Quran: "Qur'an",
  Seerah: "History",
  Akhlaq: "Character",
};
const LEVEL = ["", "Foundational", "Intermediate", "Advanced"];

function PrayerStrip({ onOpen }: { onOpen: () => void }) {
  const [data, setData] = useState<PrayerTimesData | null>(null);
  const next = useNextPrayer(data);
  useEffect(() => {
    const { city, country } = getStoredLocation();
    fetchPrayerTimes(city, country).then(setData);
  }, []);
  if (!next || !data) return null;
  return (
    <button
      onClick={onOpen}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        transition: "border-color var(--dur) var(--ease-out)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <span className="label" style={{ color: "var(--text-muted)" }}>Next prayer</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
        <span className="serif" style={{ fontSize: "1rem", color: "var(--accent)" }}>{next.name}</span>
        <span className="num" style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>{next.time}</span>
        <span className="num" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          in {formatCountdown(next.secondsUntil)}
        </span>
      </span>
    </button>
  );
}

export default function Home({ nodes, onOpenTopic, onOpenPrayer }: HomeProps) {
  const completed = nodes.filter((n) => n.status === "completed").length;
  const total = nodes.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const next = nodes.find((n) => n.status === "unlocked");
  const allDone = total > 0 && completed === total;

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", padding: "28px 20px 40px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Greeting */}
      <header style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span className="serif" style={{ fontSize: "1.35rem", color: "var(--text-primary)" }}>
            Assalamu alaykum
          </span>
          <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            One step at a time. You're on the path.
          </span>
        </div>
        <PrayerStrip onOpen={onOpenPrayer} />
      </header>

      {/* Focal: your next step */}
      {next && !allDone && (
        <section
          style={{
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--accent-soft)",
            background: "linear-gradient(180deg, var(--accent-soft), transparent 70%), var(--surface)",
            padding: "22px 22px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <span className="label" style={{ color: "var(--accent)" }}>Your next step</span>
            <h2 className="serif" style={{ fontSize: "1.7rem", lineHeight: 1.15, color: "var(--text-primary)" }}>
              {next.title}
            </h2>
            <span className="mono" style={{ fontSize: "0.72rem", letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" }}>
              {CATEGORY[next.category] ?? next.category} · {LEVEL[next.difficulty]}
            </span>
          </div>
          <button
            onClick={() => onOpenTopic(next.topicId)}
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 20px",
              borderRadius: "var(--r-pill)",
              background: "var(--accent)",
              color: "#20160A",
              fontWeight: 600,
              fontSize: "0.95rem",
              transition: "transform 120ms var(--ease-out), background var(--dur)",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Continue <span style={{ fontSize: "1.1em" }}>→</span>
          </button>
        </section>
      )}

      {allDone && (
        <section style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--green-soft)", background: "var(--surface)", padding: "24px" }}>
          <span className="label" style={{ color: "var(--green)" }}>The path, walked</span>
          <h2 className="serif" style={{ fontSize: "1.5rem", marginTop: "8px" }}>You've completed every step.</h2>
          <p style={{ color: "var(--text-2)", marginTop: "8px", fontSize: "0.95rem" }}>
            May Allah keep you firm. Now find a teacher and a community to keep growing — Sirat's job was only to begin.
          </p>
        </section>
      )}

      {/* Progress */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span className="label">The path</span>
          <span className="num" style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>
            {completed} of {total}
          </span>
        </div>
        <div style={{ height: "6px", borderRadius: "var(--r-pill)", background: "var(--surface-2)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "var(--green)", borderRadius: "var(--r-pill)", transition: "width 400ms var(--ease-out)" }} />
        </div>
      </div>

      {/* The path list */}
      <ol style={{ listStyle: "none", display: "flex", flexDirection: "column" }}>
        {nodes.map((n, i) => {
          const isNext = next?.topicId === n.topicId;
          const done = n.status === "completed";
          const locked = n.status === "locked";
          const clickable = !locked;

          let dot = "var(--surface-3)";
          let dotBorder = "var(--border-strong)";
          if (done) { dot = "var(--green)"; dotBorder = "var(--green)"; }
          else if (isNext) { dot = "var(--accent)"; dotBorder = "var(--accent)"; }

          return (
            <li key={n.topicId} style={{ display: "flex", gap: "14px", alignItems: "stretch" }}>
              {/* spine */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "14px" }}>
                <div style={{ width: "1px", flex: 1, background: i === 0 ? "transparent" : "var(--border)" }} />
                <div style={{ width: isNext ? "12px" : "9px", height: isNext ? "12px" : "9px", borderRadius: "var(--r-pill)", background: dot, border: `1.5px solid ${dotBorder}`, flexShrink: 0, boxShadow: isNext ? "0 0 0 4px var(--accent-soft)" : "none" }} />
                <div style={{ width: "1px", flex: 1, background: i === nodes.length - 1 ? "transparent" : "var(--border)" }} />
              </div>

              <button
                onClick={() => clickable && onOpenTopic(n.topicId)}
                disabled={!clickable}
                style={{
                  flex: 1,
                  textAlign: "left",
                  padding: "12px 14px",
                  margin: "3px 0",
                  borderRadius: "var(--r-md)",
                  border: `1px solid ${isNext ? "var(--accent-soft)" : "transparent"}`,
                  background: isNext ? "var(--surface)" : "transparent",
                  cursor: clickable ? "pointer" : "default",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  transition: "background var(--dur), border-color var(--dur)",
                }}
                onMouseEnter={(e) => { if (clickable && !isNext) e.currentTarget.style.background = "var(--surface)"; }}
                onMouseLeave={(e) => { if (!isNext) e.currentTarget.style.background = "transparent"; }}
              >
                <span
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: isNext ? 600 : 500,
                    color: done ? "var(--text-muted)" : locked ? "var(--text-faint)" : "var(--text-primary)",
                    lineHeight: 1.35,
                  }}
                >
                  {n.title}
                </span>
                <span className="mono" style={{ fontSize: "0.66rem", letterSpacing: "0.06em", textTransform: "uppercase", color: done ? "var(--green)" : isNext ? "var(--accent)" : "var(--text-faint)" }}>
                  {done ? "Done" : isNext ? "Ready now" : CATEGORY[n.category] ?? n.category}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
