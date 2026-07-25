import { useState, useEffect, useRef } from "react";
import PrayerBanner from "./PrayerBanner";

interface ServerNode {
  topicId: string;
  status: "locked" | "unlocked" | "completed";
  title: string;
  category: string;
  difficulty: number;
}

interface RoadmapProps {
  nodes: ServerNode[];
  connections: [string, string][];
  newlyUnlocked: string[];
  onNodeClick: (topicId: string) => void;
  onAnimationComplete: () => void;
  onOpenClarity: () => void;
  onOpenMasjid: () => void;
  onOpenPrayer: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  Aqeedah: "BELIEF",
  Ibadah: "WORSHIP",
  Fiqh: "LAW",
  Quran: "QURAN",
  Seerah: "HISTORY",
  Akhlaq: "CHARACTER",
};

const DIFFICULTY_LABEL = ["", "FOUNDATIONAL", "INTERMEDIATE", "ADVANCED"];

export default function Roadmap({
  nodes,
  connections,
  newlyUnlocked,
  onNodeClick,
  onAnimationComplete,
  onOpenClarity,
  onOpenMasjid,
  onOpenPrayer,
}: RoadmapProps) {
  const [animatingUnlocked, setAnimatingUnlocked] = useState<Set<string>>(new Set());
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (newlyUnlocked.length === 0) return;

    const kickoffTimer = setTimeout(() => {
      setAnimatingUnlocked(new Set(newlyUnlocked));
      animationRef.current = setTimeout(() => {
        setAnimatingUnlocked(new Set());
        onAnimationComplete();
      }, 450);
    }, 80);

    return () => {
      clearTimeout(kickoffTimer);
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [newlyUnlocked, onAnimationComplete]);

  const completedCount = nodes.filter((n) => n.status === "completed").length;
  const totalCount = nodes.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Build prerequisite lookup: which nodes does each node unlock
  const prereqMap = new Map<string, string[]>();
  for (const [from, to] of connections) {
    if (!prereqMap.has(to)) prereqMap.set(to, []);
    prereqMap.get(to)!.push(from);
  }

  const getStatus = (node: ServerNode) => {
    if (animatingUnlocked.has(node.topicId)) return "unlocked";
    return node.status;
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
      {/* ── Next-prayer banner (real data) ── */}
      <PrayerBanner onOpen={onOpenPrayer} />

      {/* ── Stats header ── */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "18px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "0.3em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
          >
            YOUR PATH
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              letterSpacing: "0.12em",
            }}
          >
            {String(completedCount).padStart(2, "0")}/{String(totalCount).padStart(2, "0")}&nbsp;NODES
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ flex: 1, margin: "0 40px" }}>
          <div
            style={{
              height: "2px",
              backgroundColor: "var(--border)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${progressPercent}%`,
                backgroundColor:
                  progressPercent === 100 ? "var(--secondary)" : "var(--primary)",
                transition: "width 400ms ease-out",
              }}
            />
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "0.3em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
          >
            COMPLETION
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              letterSpacing: "0.12em",
              color: "var(--secondary)",
            }}
          >
            {progressPercent}%
          </div>
        </div>

        {/* Clarity entry point */}
        <button
          onClick={onOpenClarity}
          style={{
            marginLeft: "32px",
            flexShrink: 0,
            padding: "12px 18px",
            border: "1px solid var(--secondary)",
            color: "var(--secondary)",
            fontSize: "11px",
            fontWeight: "bold",
            letterSpacing: "0.2em",
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
          ASK · CLARITY
        </button>

        {/* Community / masjid bridge entry point */}
        <button
          onClick={onOpenMasjid}
          style={{
            marginLeft: "10px",
            flexShrink: 0,
            padding: "12px 18px",
            border: "1px solid var(--primary)",
            color: "var(--text-primary)",
            backgroundColor: "var(--primary)",
            fontSize: "11px",
            fontWeight: "bold",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            transition: "opacity 150ms ease-out",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          COMMUNITY
        </button>
      </div>

      {/* ── Scrollable path ── */}
      <div
        style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "40px 0 80px",
        }}
      >
        <div
          style={{
            maxWidth: "680px",
            margin: "0 auto",
            padding: "0 32px",
            position: "relative",
          }}
        >
          {/* Vertical spine line */}
          <div
            style={{
              position: "absolute",
              left: "52px",
              top: 0,
              bottom: 0,
              width: "1px",
              backgroundColor: "var(--border)",
            }}
          />

          {nodes.map((node, index) => {
            const status = getStatus(node);
            const isClickable = status !== "locked";
            const prereqs = prereqMap.get(node.topicId) ?? [];
            const unlockedByCount = prereqs.length;

            // Dot color on the spine
            let dotBg = "var(--muted)";
            let dotBorder = "var(--border)";
            if (status === "completed") {
              dotBg = "var(--secondary)";
              dotBorder = "var(--secondary)";
            } else if (status === "unlocked") {
              dotBg = "var(--primary)";
              dotBorder = "var(--primary)";
            }

            // Card border + background
            let cardBg = "var(--surface)";
            let cardBorder = "var(--border)";
            let titleColor = "var(--text-muted)";
            let statusLabel = "LOCKED";
            let statusColor = "var(--muted)";

            if (status === "completed") {
              cardBg = "var(--secondary)";
              cardBorder = "var(--secondary)";
              titleColor = "var(--bg)";
              statusLabel = "COMPLETED";
              statusColor = "var(--bg)";
            } else if (status === "unlocked") {
              cardBg = "var(--primary)";
              cardBorder = "var(--primary)";
              titleColor = "var(--text-primary)";
              statusLabel = "READY";
              statusColor = "var(--text-primary)";
            }

            return (
              <div
                key={node.topicId}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "24px",
                  marginBottom: index < nodes.length - 1 ? "16px" : 0,
                  position: "relative",
                }}
              >
                {/* Spine dot */}
                <div
                  style={{
                    flexShrink: 0,
                    width: "12px",
                    height: "12px",
                    marginTop: "18px",
                    backgroundColor: dotBg,
                    border: `2px solid ${dotBorder}`,
                    position: "relative",
                    zIndex: 2,
                    transition: "background-color 400ms ease-out, border-color 400ms ease-out",
                  }}
                />

                {/* Node card */}
                <button
                  onClick={() => isClickable && onNodeClick(node.topicId)}
                  disabled={!isClickable}
                  style={{
                    flex: 1,
                    textAlign: "left",
                    padding: "18px 20px",
                    backgroundColor: cardBg,
                    border: `1px solid ${cardBorder}`,
                    color: titleColor,
                    cursor: isClickable ? "pointer" : "default",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    transition:
                      "background-color 400ms ease-out, border-color 400ms ease-out, color 400ms ease-out",
                  }}
                  onMouseEnter={(e) => {
                    if (isClickable && status !== "completed") {
                      e.currentTarget.style.borderColor = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isClickable) {
                      e.currentTarget.style.borderColor = cardBorder;
                    }
                  }}
                >
                  {/* Top row: index + category + difficulty */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "bold",
                        letterSpacing: "0.2em",
                        opacity: 0.5,
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        letterSpacing: "0.15em",
                        fontWeight: "bold",
                        opacity: status === "completed" ? 0.6 : 0.7,
                      }}
                    >
                      {CATEGORY_LABELS[node.category] ?? node.category}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        letterSpacing: "0.1em",
                        opacity: 0.4,
                      }}
                    >
                      ·&nbsp;{DIFFICULTY_LABEL[node.difficulty]}
                    </span>

                    {/* Status badge pushed to the right */}
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: "10px",
                        fontWeight: "bold",
                        letterSpacing: "0.15em",
                        color: statusColor,
                      }}
                    >
                      [{statusLabel}]
                    </span>
                  </div>

                  {/* Title — full text, no truncation */}
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "bold",
                      letterSpacing: "0.04em",
                      lineHeight: "1.4",
                      textTransform: "uppercase",
                    }}
                  >
                    {node.title}
                  </div>

                  {/* Prerequisites hint for locked nodes */}
                  {status === "locked" && unlockedByCount > 0 && (
                    <div
                      style={{
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        color: "var(--text-muted)",
                        opacity: 0.7,
                      }}
                    >
                      REQUIRES {unlockedByCount} PREREQUISITE{unlockedByCount > 1 ? "S" : ""}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
