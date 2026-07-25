import { useState, useEffect, useCallback } from "react";
import {
  fetchPrayerTimes,
  getStoredLocation,
  storeLocation,
  useNextPrayer,
  formatCountdown,
  PRAYER_ORDER,
  type PrayerTimesData,
  type PrayerTimings,
} from "../lib/prayer";

interface PrayerTimesProps {
  onBack: () => void;
  onFindMasjid: () => void;
}

const ROW_LABELS: { key: keyof PrayerTimings; label: string; note?: string }[] = [
  { key: "Fajr", label: "Fajr", note: "Dawn" },
  { key: "Sunrise", label: "Sunrise", note: "Fajr ends" },
  { key: "Dhuhr", label: "Dhuhr", note: "Midday" },
  { key: "Asr", label: "Asr", note: "Afternoon" },
  { key: "Maghrib", label: "Maghrib", note: "Sunset" },
  { key: "Isha", label: "Isha", note: "Night" },
];

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.2em",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  fontWeight: "bold",
};

export default function PrayerTimes({ onBack, onFindMasjid }: PrayerTimesProps) {
  const [data, setData] = useState<PrayerTimesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const initial = getStoredLocation();
  const [editing, setEditing] = useState(false);
  const [city, setCity] = useState(initial.city);
  const [country, setCountry] = useState(initial.country);

  const next = useNextPrayer(data);

  const load = useCallback(async (c: string, ctry: string) => {
    setLoading(true);
    setError(false);
    const d = await fetchPrayerTimes(c, ctry);
    if (d) setData(d);
    else setError(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(initial.city, initial.country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !country.trim()) return;
    storeLocation(city.trim(), country.trim());
    setEditing(false);
    load(city.trim(), country.trim());
  };

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
          PRAYER TIMES
        </span>
      </div>

      {/* Content */}
      <div
        style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "32px 24px 100px",
          maxWidth: "560px",
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Location + date */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {editing ? (
            <form onSubmit={saveLocation} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={LABEL_STYLE}>YOUR LOCATION</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                style={inputStyle}
              />
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                style={inputStyle}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" style={{ ...smallBtn, backgroundColor: "var(--primary)", color: "var(--text-primary)" }}>
                  SAVE
                </button>
                <button type="button" onClick={() => setEditing(false)} style={smallBtn}>
                  CANCEL
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {data ? `${data.city}, ${data.country}` : `${initial.city}, ${initial.country}`}
                </span>
                {data && (
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                    {data.gregorianDate} · {data.hijriDate} AH
                  </span>
                )}
              </div>
              <button
                onClick={() => setEditing(true)}
                style={{ ...LABEL_STYLE, color: "var(--secondary)" }}
              >
                CHANGE
              </button>
            </div>
          )}
        </div>

        {loading && <div style={LABEL_STYLE}>LOADING PRAYER TIMES…</div>}

        {error && !loading && (
          <div
            style={{
              border: "1px solid var(--secondary)",
              padding: "16px 18px",
              fontSize: "12px",
              lineHeight: "1.6",
              color: "var(--text-muted)",
            }}
          >
            Couldn't load prayer times for that location. Check the city and country spelling,
            or your connection, and try again.
          </div>
        )}

        {data && !loading && (
          <>
            {/* Next prayer highlight + live countdown */}
            {next && (
              <div
                style={{
                  border: "1px solid var(--primary)",
                  backgroundColor: "var(--surface)",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <span style={{ ...LABEL_STYLE, color: "var(--primary)" }}>NEXT PRAYER</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
                  <span style={{ fontSize: "32px", fontWeight: "bold", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {next.name}
                  </span>
                  <span style={{ fontSize: "24px", fontWeight: "bold", color: "var(--secondary)" }}>
                    {next.time}
                  </span>
                </div>
                <span style={{ fontSize: "13px", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                  IN {formatCountdown(next.secondsUntil)}
                </span>
              </div>
            )}

            {/* All times */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", backgroundColor: "var(--border)", border: "1px solid var(--border)" }}>
              {ROW_LABELS.map((row) => {
                const isNext = next?.name === row.key;
                const isPrayer = PRAYER_ORDER.includes(row.key);
                return (
                  <div
                    key={row.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 20px",
                      backgroundColor: isNext ? "var(--primary)" : "var(--bg)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "bold",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: isPrayer ? "var(--text-primary)" : "var(--text-muted)",
                        }}
                      >
                        {row.label}
                      </span>
                      {row.note && (
                        <span style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                          {row.note}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "0.05em", color: isNext ? "var(--text-primary)" : "var(--secondary)" }}>
                      {data.timings[row.key]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Tie-in to the masjid bridge */}
            <button
              onClick={onFindMasjid}
              style={{
                padding: "18px",
                border: "1px solid var(--secondary)",
                color: "var(--secondary)",
                fontSize: "12px",
                fontWeight: "bold",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                transition: "background-color 150ms ease-out, color 150ms ease-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--secondary)";
                e.currentTarget.style.color = "var(--bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--secondary)";
              }}
            >
              {next ? `PRAY ${next.name} AT A MASJID → FIND ONE` : "FIND A MASJID →"}
            </button>

            <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.06em", lineHeight: "1.6" }}>
              Times from the Aladhan API · {data.method} · {data.timezone}. Prayer time
              calculation methods vary by community — confirm with your local masjid.
            </span>
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

const smallBtn: React.CSSProperties = {
  flex: 1,
  padding: "12px",
  border: "1px solid var(--border)",
  color: "var(--text-muted)",
  fontSize: "11px",
  fontWeight: "bold",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
};
