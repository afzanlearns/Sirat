import { useState, useCallback, useEffect } from "react";
import { ensureAnonUser, authHeaders } from "./lib/supabase";
import Onboarding from "./components/Onboarding";
import Diagnostic from "./components/Diagnostic";
import TopicDetail from "./components/TopicDetail";
import Complete from "./components/Complete";
import ClarityCards from "./components/ClarityCards";
import MasjidBridge from "./components/MasjidBridge";
import PrayerTimes from "./components/PrayerTimes";
import Home from "./screens/Home";
import Profile from "./screens/Profile";
import Shell, { type Tab } from "./ui/Shell";

// ─── API helpers ──────────────────────────────────────────────────────────────
const API = (import.meta.env.VITE_API_BASE as string) ?? "http://localhost:3001/api";

function getOrCreateUserId(): string {
  let id = localStorage.getItem("sirat_user_id");
  if (!id) {
    id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("sirat_user_id", id);
  }
  return id;
}

type Mode = "onboarding" | "diagnostic" | "app" | "complete";

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
export interface TopicDetailData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: number;
  resource: { title: string; source: string; url: string };
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState<Mode>("onboarding");
  const [tab, setTab] = useState<Tab>("path");
  const [userId, setUserId] = useState<string>(getOrCreateUserId);

  useEffect(() => {
    ensureAnonUser().then((uid) => uid && setUserId(uid));
  }, []);

  const [roadmap, setRoadmap] = useState<ServerRoadmap | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState<ServerQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionTotal, setQuestionTotal] = useState(6);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [topicDetail, setTopicDetail] = useState<TopicDetailData | null>(null);
  const [loadingTopic, setLoadingTopic] = useState(false);

  const refreshRoadmap = useCallback(async () => {
    const res = await fetch(`${API}/roadmap/${userId}`, { headers: await authHeaders() });
    setRoadmap((await res.json()) as ServerRoadmap);
  }, [userId]);

  const handleBegin = useCallback(async () => {
    const uid = (await ensureAnonUser()) ?? userId;
    if (uid !== userId) setUserId(uid);
    const res = await fetch(`${API}/diagnostic/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ userId: uid }),
    });
    const data = (await res.json()) as { question: ServerQuestion; total: number };
    setCurrentQuestion(data.question);
    setQuestionTotal(data.total);
    setQuestionIndex(0);
    setAnswers({});
    setMode("diagnostic");
  }, [userId]);

  const handleAnswer = useCallback(
    async (answer: string) => {
      if (!currentQuestion) return;
      setAnswers({ ...answers, [currentQuestion.id]: answer });

      const res = await fetch(`${API}/diagnostic/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ userId, questionId: currentQuestion.id, answer }),
      });
      const data = (await res.json()) as
        | { done: false; question: ServerQuestion; questionIndex: number; total: number }
        | { done: true };

      if (!data.done) {
        setCurrentQuestion(data.question);
        setQuestionIndex(data.questionIndex);
      } else {
        const completeRes = await fetch(`${API}/diagnostic/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ userId }),
        });
        const completeData = (await completeRes.json()) as { roadmap: ServerRoadmap };
        setRoadmap(completeData.roadmap);
        setTab("path");
        setMode("app");
      }
    },
    [userId, currentQuestion, answers]
  );

  const handleOpenTopic = useCallback(async (topicId: string) => {
    setSelectedTopicId(topicId);
    setLoadingTopic(true);
    try {
      const res = await fetch(`${API}/topic/${topicId}`);
      setTopicDetail((await res.json()) as TopicDetailData);
    } finally {
      setLoadingTopic(false);
    }
  }, []);

  const handleMarkComplete = useCallback(
    async (topicId: string) => {
      const res = await fetch(`${API}/topic/${topicId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json()) as ServerRoadmap;
      setRoadmap(data);
      setSelectedTopicId(null);
      setTopicDetail(null);
      if (data.nodes.every((n) => n.status === "completed")) {
        setTimeout(() => setMode("complete"), 500);
      }
    },
    [userId]
  );

  const closeTopic = useCallback(() => {
    setSelectedTopicId(null);
    setTopicDetail(null);
  }, []);

  const handleRestart = useCallback(() => {
    localStorage.removeItem("sirat_user_id");
    window.location.reload();
  }, []);

  // ── Pre-app flows (full screen) ──────────────────────────────────────────────
  if (mode === "onboarding") return <Onboarding onBegin={handleBegin} />;
  if (mode === "diagnostic" && currentQuestion)
    return (
      <Diagnostic
        question={currentQuestion}
        questionIndex={questionIndex}
        questionTotal={questionTotal}
        onAnswer={handleAnswer}
      />
    );
  if (mode === "complete")
    return (
      <Complete
        completedCount={roadmap?.nodes.filter((n) => n.status === "completed").length ?? 0}
        totalCount={roadmap?.nodes.length ?? 0}
        onRestart={handleRestart}
      />
    );

  // ── Topic detail pushes over the shell (its own fixed CTA needs the full height)
  const selectedNode = selectedTopicId && roadmap
    ? roadmap.nodes.find((n) => n.topicId === selectedTopicId) ?? null
    : null;
  if (selectedNode)
    return (
      <TopicDetail
        topicId={selectedNode.topicId}
        topicDetail={topicDetail}
        loading={loadingTopic}
        nodeStatus={selectedNode.status}
        onMarkComplete={handleMarkComplete}
        onBack={closeTopic}
      />
    );

  // ── Main app: persistent shell with bottom tabs ──────────────────────────────
  return (
    <Shell active={tab} onChange={setTab}>
      {tab === "path" && roadmap && (
        <Home nodes={roadmap.nodes} onOpenTopic={handleOpenTopic} onOpenPrayer={() => setTab("pray")} />
      )}
      {tab === "ask" && <ClarityCards onBack={() => setTab("path")} />}
      {tab === "pray" && (
        <PrayerTimes onBack={() => setTab("path")} onFindMasjid={() => setTab("people")} />
      )}
      {tab === "people" && <MasjidBridge userId={userId} onBack={() => setTab("path")} />}
      {tab === "you" && (
        <Profile
          userId={userId}
          completed={roadmap?.nodes.filter((n) => n.status === "completed").length ?? 0}
          total={roadmap?.nodes.length ?? 0}
          onRefresh={refreshRoadmap}
        />
      )}
    </Shell>
  );
}
