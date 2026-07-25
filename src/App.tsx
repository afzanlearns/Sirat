import { useState, useCallback, useEffect } from "react";
import {
  authHeaders,
  currentUserId,
  onAuthChange,
  signOut,
  isSupabaseEnabled,
} from "./lib/supabase";
import Onboarding from "./components/Onboarding";
import Diagnostic from "./components/Diagnostic";
import TopicDetail from "./components/TopicDetail";
import Complete from "./components/Complete";
import ClarityCards from "./components/ClarityCards";
import MasjidBridge from "./components/MasjidBridge";
import PrayerTimes from "./components/PrayerTimes";
import Home from "./screens/Home";
import Profile from "./screens/Profile";
import Auth from "./screens/Auth";
import Shelf from "./components/Shelf";
import BasicsList, { type BasicsItem } from "./components/BasicsList";
import BasicsDetail from "./components/BasicsDetail";
import Shell, { type Tab } from "./ui/Shell";
import { API_BASE as API } from "./lib/api";

function getLocalUserId(): string {
  let id = localStorage.getItem("sirat_user_id");
  if (!id) {
    id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("sirat_user_id", id);
  }
  return id;
}

type Mode = "loading" | "onboarding" | "auth" | "diagnostic" | "app" | "complete";

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
export interface Evidence {
  type: "quran" | "hadith" | "video";
  reference: string;
  summary?: string;
  grading?: string;
  url: string;
}

export interface TopicDetailData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: number;
  resource: { title: string; source: string; url: string };
  evidence?: Evidence[];
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState<Mode>("loading");
  const [tab, setTab] = useState<Tab>("path");
  const [userId, setUserId] = useState<string>("");

  const [roadmap, setRoadmap] = useState<ServerRoadmap | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState<ServerQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionTotal, setQuestionTotal] = useState(6);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [topicDetail, setTopicDetail] = useState<TopicDetailData | null>(null);
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [showShelf, setShowShelf] = useState(false);
  const [showBasics, setShowBasics] = useState(false);
  const [selectedBasicsItem, setSelectedBasicsItem] = useState<BasicsItem | null>(null);

  // ── Start the diagnostic for a given user ────────────────────────────────────
  const startDiagnostic = useCallback(async (uid: string) => {
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
  }, []);

  // ── Route a known user: straight to app if onboarded, else diagnostic ─────────
  const routeFor = useCallback(
    async (uid: string) => {
      const headers = await authHeaders();
      try {
        const meRes = await fetch(`${API}/me/${uid}`, { headers });
        const { onboarded } = (await meRes.json()) as { onboarded: boolean };
        if (onboarded) {
          const rm = await fetch(`${API}/roadmap/${uid}`, { headers });
          setRoadmap((await rm.json()) as ServerRoadmap);
          setTab("path");
          setMode("app");
        } else {
          await startDiagnostic(uid);
        }
      } catch {
        // Network trouble — let them (re)start rather than hang on a spinner.
        setMode(isSupabaseEnabled ? "onboarding" : "onboarding");
      }
    },
    [startDiagnostic]
  );

  // ── Bootstrap: restore session (stateful) ────────────────────────────────────
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      if (!isSupabaseEnabled) {
        // No auth configured — use a local id, still restore onboarded state.
        const uid = getLocalUserId();
        setUserId(uid);
        await routeFor(uid);
        return;
      }
      const uid = await currentUserId();
      if (uid) {
        setUserId(uid);
        await routeFor(uid);
      } else {
        setMode("onboarding");
      }
      // React to sign-out (and cross-tab session changes).
      unsub = onAuthChange((newUid) => {
        if (!newUid) {
          setRoadmap(null);
          setUserId("");
          setMode("onboarding");
        }
      });
    })();
    return () => unsub();
  }, [routeFor]);

  // ── Onboarding "Begin" → auth gate (or straight in) ──────────────────────────
  const handleBegin = useCallback(async () => {
    if (!isSupabaseEnabled) {
      const uid = getLocalUserId();
      setUserId(uid);
      await startDiagnostic(uid);
      return;
    }
    const uid = await currentUserId();
    if (uid) {
      setUserId(uid);
      await routeFor(uid);
    } else {
      setMode("auth");
    }
  }, [routeFor, startDiagnostic]);

  // ── Auth success ─────────────────────────────────────────────────────────────
  const handleAuthed = useCallback(async () => {
    const uid = await currentUserId();
    if (!uid) return;
    setUserId(uid);
    setMode("loading");
    await routeFor(uid);
  }, [routeFor]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    // onAuthChange handles routing to onboarding.
  }, []);

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

  const refreshRoadmap = useCallback(async () => {
    const res = await fetch(`${API}/roadmap/${userId}`, { headers: await authHeaders() });
    setRoadmap((await res.json()) as ServerRoadmap);
  }, [userId]);

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

  // ── Full-screen flows ────────────────────────────────────────────────────────
  if (mode === "loading")
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <span className="label" style={{ color: "var(--text-muted)" }}>Loading…</span>
      </div>
    );
  if (mode === "onboarding") return <Onboarding onBegin={handleBegin} />;
  if (mode === "auth") return <Auth onAuthed={handleAuthed} />;
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
        onRestart={() => setMode("app")}
      />
    );

  // ── Shelf pushes over the shell (same pattern as TopicDetail) ───────────────────
  const completedCategories = roadmap?.nodes
    .filter((n) => n.status === "completed")
    .map((n) => n.category) ?? [];
  if (showShelf)
    return (
      <Shelf
        completedTopicCategories={completedCategories}
        onBack={() => setShowShelf(false)}
      />
    );

  // ── Basics detail pushes over the basics list ─────────────────────────────
  if (showBasics && selectedBasicsItem)
    return (
      <BasicsDetail
        item={selectedBasicsItem}
        onBack={() => setSelectedBasicsItem(null)}
      />
    );
  if (showBasics)
    return (
      <BasicsList
        onOpenItem={(item) => setSelectedBasicsItem(item)}
        onBack={() => setShowBasics(false)}
      />
    );

  // ── Topic detail pushes over the shell (its fixed CTA needs full height) ─────
  const selectedNode =
    selectedTopicId && roadmap
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
        <Home
          nodes={roadmap.nodes}
          onOpenTopic={handleOpenTopic}
          onOpenPrayer={() => setTab("pray")}
          onOpenShelf={() => setShowShelf(true)}
          onOpenBasics={() => setShowBasics(true)}
        />
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
          onSignOut={isSupabaseEnabled ? handleSignOut : undefined}
        />
      )}
    </Shell>
  );
}
