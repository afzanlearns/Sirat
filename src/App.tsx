import { useState, useCallback, useEffect } from "react";
import type { Screen } from "./types";
import Onboarding from "./components/Onboarding";
import Diagnostic from "./components/Diagnostic";
import RoadmapComponent from "./components/Roadmap";
import TopicDetail from "./components/TopicDetail";
import Complete from "./components/Complete";

// ─── API helpers ──────────────────────────────────────────────────────────────
const API = "http://localhost:3001/api";

function getOrCreateUserId(): string {
  let id = localStorage.getItem("sirat_user_id");
  if (!id) {
    id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("sirat_user_id", id);
  }
  return id;
}

// ─── Types matching server response shapes ─────────────────────────────────────
interface ServerNode {
  topicId: string;
  status: "locked" | "unlocked" | "completed";
  title: string;
  description: string;
  category: string;
  difficulty: number;
}

interface ServerRoadmap {
  nodes: ServerNode[];
  connections: [string, string][];
  newlyUnlocked?: string[];
}

interface ServerQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface TopicDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: number;
  resource: { title: string; source: string; url: string };
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [userId] = useState<string>(getOrCreateUserId);

  // Roadmap state
  const [roadmap, setRoadmap] = useState<ServerRoadmap | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  // Diagnostic state
  const [currentQuestion, setCurrentQuestion] = useState<ServerQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionTotal, setQuestionTotal] = useState(6);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Topic detail state
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [loadingTopic, setLoadingTopic] = useState(false);

  // ── Onboarding: begin ────────────────────────────────────────────────────────
  const handleBegin = useCallback(async () => {
    const res = await fetch(`${API}/diagnostic/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json() as { question: ServerQuestion; total: number };
    setCurrentQuestion(data.question);
    setQuestionTotal(data.total);
    setQuestionIndex(0);
    setAnswers({});
    setScreen("diagnostic");
  }, [userId]);

  // ── Diagnostic: answer ───────────────────────────────────────────────────────
  const handleAnswer = useCallback(async (answer: string) => {
    if (!currentQuestion) return;

    const updatedAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(updatedAnswers);

    const res = await fetch(`${API}/diagnostic/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, questionId: currentQuestion.id, answer }),
    });
    const data = await res.json() as
      | { done: false; question: ServerQuestion; questionIndex: number; total: number }
      | { done: true };

    if (!data.done) {
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
    } else {
      // All questions answered — complete diagnostic + get roadmap
      const completeRes = await fetch(`${API}/diagnostic/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const completeData = await completeRes.json() as { done: boolean; roadmap: ServerRoadmap };
      setRoadmap(completeData.roadmap);
      setNewlyUnlocked([]);
      setScreen("roadmap");
    }
  }, [userId, currentQuestion, answers]);

  // ── Node click: load topic detail ────────────────────────────────────────────
  const handleNodeClick = useCallback(async (topicId: string) => {
    setSelectedTopicId(topicId);
    setLoadingTopic(true);
    setScreen("topic");
    try {
      const res = await fetch(`${API}/topic/${topicId}`);
      const data = await res.json() as TopicDetail;
      setTopicDetail(data);
    } finally {
      setLoadingTopic(false);
    }
  }, []);

  // ── Mark complete ────────────────────────────────────────────────────────────
  const handleMarkComplete = useCallback(async (topicId: string) => {
    const res = await fetch(`${API}/topic/${topicId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json() as ServerRoadmap & { newlyUnlocked: string[] };
    setRoadmap(data);
    setNewlyUnlocked(data.newlyUnlocked ?? []);
    setSelectedTopicId(null);
    setTopicDetail(null);
    setScreen("roadmap");

    const allCompleted = data.nodes.every((n) => n.status === "completed");
    if (allCompleted) {
      setTimeout(() => setScreen("complete"), 800);
    }
  }, [userId]);

  const handleBackToRoadmap = useCallback(async () => {
    // Refresh roadmap state from server on back navigation
    const res = await fetch(`${API}/roadmap/${userId}`);
    const data = await res.json() as ServerRoadmap;
    setRoadmap(data);
    setNewlyUnlocked([]);
    setSelectedTopicId(null);
    setTopicDetail(null);
    setScreen("roadmap");
  }, [userId]);

  const handleRestart = useCallback(() => {
    localStorage.removeItem("sirat_user_id");
    window.location.reload();
  }, []);

  // ── Selected node status (for TopicDetail) ──────────────────────────────────
  const selectedNode = selectedTopicId && roadmap
    ? roadmap.nodes.find((n) => n.topicId === selectedTopicId) ?? null
    : null;

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {screen === "onboarding" && <Onboarding onBegin={handleBegin} />}

      {screen === "diagnostic" && currentQuestion && (
        <Diagnostic
          question={currentQuestion}
          questionIndex={questionIndex}
          questionTotal={questionTotal}
          onAnswer={handleAnswer}
        />
      )}

      {screen === "roadmap" && roadmap && (
        <RoadmapComponent
          nodes={roadmap.nodes}
          connections={roadmap.connections}
          newlyUnlocked={newlyUnlocked}
          onNodeClick={handleNodeClick}
          onAnimationComplete={() => setNewlyUnlocked([])}
        />
      )}

      {screen === "topic" && selectedNode && (
        <TopicDetail
          topicId={selectedNode.topicId}
          topicDetail={topicDetail}
          loading={loadingTopic}
          nodeStatus={selectedNode.status}
          onMarkComplete={handleMarkComplete}
          onBack={handleBackToRoadmap}
        />
      )}

      {screen === "complete" && (
        <Complete
          completedCount={roadmap?.nodes.filter((n) => n.status === "completed").length ?? 0}
          totalCount={roadmap?.nodes.length ?? 0}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
