import { useState } from "react";

interface Question {
  id: string;
  question: string;
  options: string[];
}

interface DiagnosticProps {
  question: Question;
  questionIndex: number;
  questionTotal: number;
  onAnswer: (answer: string) => void;
}

export default function Diagnostic({
  question,
  questionIndex,
  questionTotal,
  onAnswer,
}: DiagnosticProps) {
  const [opacity, setOpacity] = useState(1);
  const [transform, setTransform] = useState("translateY(0)");
  const [busy, setBusy] = useState(false);

  const progressPercent = (questionIndex / questionTotal) * 100;

  const handleSelect = (option: string) => {
    if (busy) return;
    setBusy(true);

    // Exit animation
    setOpacity(0);
    setTransform("translateY(-10px)");

    setTimeout(() => {
      onAnswer(option);
      // Reset entry state for the next question (parent swaps the question prop)
      setTransform("translateY(10px)");
      requestAnimationFrame(() => {
        setTimeout(() => {
          setOpacity(1);
          setTransform("translateY(0)");
          setBusy(false);
        }, 20);
      });
    }, 150);
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
        position: "relative",
      }}
    >
      {/* Progress bar — thin line, no numbers */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "2px",
          backgroundColor: "var(--border)",
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPercent}%`,
            backgroundColor: "var(--primary)",
            transition: "width 200ms ease-out",
          }}
        />
      </div>

      {/* Question container */}
      <div
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: "600px",
          width: "100%",
          margin: "0 auto",
          padding: "64px 24px 24px",
        }}
      >
        <div
          style={{
            opacity,
            transform,
            transition: "opacity 150ms linear, transform 150ms ease-out",
            display: "flex",
            flexDirection: "column",
            gap: "40px",
          }}
        >
          {/* Question text */}
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              letterSpacing: "0.08em",
              lineHeight: "1.4",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            {question.question}
          </h2>

          {/* Answer options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(option)}
                disabled={busy}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "20px 24px",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  letterSpacing: "0.05em",
                  lineHeight: "1.4",
                  cursor: busy ? "not-allowed" : "pointer",
                  transition:
                    "border-color 150ms ease-out, background-color 150ms ease-out",
                  opacity: busy ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!busy) {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.backgroundColor =
                      "rgba(11, 110, 90, 0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.backgroundColor = "var(--surface)";
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
