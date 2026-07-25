import { useState, useEffect } from "react";
import {
  fetchPrayerTimes,
  getStoredLocation,
  useNextPrayer,
  formatCountdown,
  type PrayerTimesData,
} from "../lib/prayer";

interface PrayerBannerProps {
  onOpen: () => void;
}

/** Thin, always-visible next-prayer bar — a calm daily-return hook. */
export default function PrayerBanner({ onOpen }: PrayerBannerProps) {
  const [data, setData] = useState<PrayerTimesData | null>(null);
  const [failed, setFailed] = useState(false);
  const next = useNextPrayer(data);

  useEffect(() => {
    const { city, country } = getStoredLocation();
    fetchPrayerTimes(city, country).then((d) => {
      if (d) setData(d);
      else setFailed(true);
    });
  }, []);

  // Degrade quietly — never block the roadmap on prayer data.
  if (failed && !data) return null;

  return (
    <button
      onClick={onOpen}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "10px 32px",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--surface)",
        color: "var(--text-primary)",
        flexShrink: 0,
        transition: "background-color 150ms ease-out",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--surface)")}
    >
      <span
        style={{
          fontSize: "10px",
          letterSpacing: "0.25em",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          fontWeight: "bold",
        }}
      >
        NEXT PRAYER
      </span>

      {next && data ? (
        <span
          style={{
            fontSize: "12px",
            letterSpacing: "0.12em",
            fontWeight: "bold",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ color: "var(--secondary)" }}>{next.name}</span>
          <span>{next.time}</span>
          <span style={{ color: "var(--text-muted)" }}>
            IN {formatCountdown(next.secondsUntil)}
          </span>
        </span>
      ) : (
        <span
          style={{
            fontSize: "11px",
            letterSpacing: "0.15em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          LOADING…
        </span>
      )}

      <span style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.15em" }}>
        {data ? data.city.toUpperCase() : ""} →
      </span>
    </button>
  );
}
