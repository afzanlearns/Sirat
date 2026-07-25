import type { ReactNode } from "react";

export type Tab = "path" | "ask" | "pray" | "people" | "you";

interface ShellProps {
  active: Tab;
  onChange: (t: Tab) => void;
  children: ReactNode;
}

const ICONS: Record<Tab, ReactNode> = {
  path: (
    <path d="M6 3v6a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v6M6 3l-2.5 2.5M6 3l2.5 2.5M18 21l-2.5-2.5M18 21l2.5-2.5" />
  ),
  ask: (
    <path d="M12 16v.01M12 13a2.5 2.5 0 1 0-2.5-3M4 12a8 8 0 1 1 16 0 8 8 0 0 1-16 0Z" />
  ),
  pray: <path d="M20 15A8 8 0 1 1 9 4.5a6.5 6.5 0 0 0 11 10.5Z" />,
  people: (
    <path d="M16 19a4 4 0 0 0-8 0M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 19a3.5 3.5 0 0 0-4-3.2M18 11.8A2.5 2.5 0 0 0 17.5 7" />
  ),
  you: <path d="M18 19a6 6 0 0 0-12 0M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />,
};

const TABS: { key: Tab; label: string }[] = [
  { key: "path", label: "Path" },
  { key: "ask", label: "Ask" },
  { key: "pray", label: "Pray" },
  { key: "people", label: "People" },
  { key: "you", label: "You" },
];

export default function Shell({ active, onChange, children }: ShellProps) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Content */}
      <main style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{children}</main>

      {/* Bottom tab bar */}
      <nav
        style={{
          flexShrink: 0,
          display: "flex",
          borderTop: "1px solid var(--border)",
          backgroundColor: "color-mix(in srgb, var(--bg) 88%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {TABS.map((t) => {
          const on = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              aria-label={t.label}
              aria-current={on ? "page" : undefined}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                padding: "10px 4px 12px",
                minHeight: "56px",
                color: on ? "var(--accent)" : "var(--text-faint)",
                transition: "color var(--dur) var(--ease-out)",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={on ? 2 : 1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {ICONS[t.key]}
              </svg>
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.04em",
                  fontWeight: on ? 600 : 500,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
