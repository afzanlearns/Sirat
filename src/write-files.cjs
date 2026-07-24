const fs = require("fs");
const path = require("path");
const base = "C:\\Users\\Afzan Khan\\Documents\\Sirat\\src";

const files = {};

files["data.ts"] = `import type { DiagnosticQuestion, Topic, RoadmapNode, Roadmap } from "./types";

export const diagnosticQuestions: DiagnosticQuestion[] = [
  {
    id: "q1",
    question: "What draws you to Islam?",
    options: [
      "I want to learn about God",
      "I\\'m inspired by the Quran",
      "I know Muslims and admire their faith",
      "I\\'m exploring different paths",
    ],
  },
  {
    id: "q2",
    question: "Have you ever read any part of the Quran?",
    options: [
      "Yes, some of it",
      "A few verses only",
      "No, not yet",
      "I don\\'t know where to start",
    ],
  },
  {
    id: "q3",
    question: "Do you know any Muslims personally?",
    options: [
      "Yes, close friends or family",
      "Yes, acquaintances",
      "No, not really",
      "Only online communities",
    ],
  },
  {
    id: "q4",
    question: "Do you have access to a local mosque or Islamic center?",
    options: [
      "Yes, I do",
      "There is one nearby",
      "No, not nearby",
      "I\\'m not sure",
    ],
  },
  {
    id: "q5",
    question: "What is your familiarity with Arabic script?",
    options: [
      "I can read Arabic",
      "I know the alphabet",
      "I know a few letters",
      "None at all",
    ],
  },
  {
    id: "q6",
    question: "What area interests you most right now?",
    options: [
      "Faith and belief (Aqeedah)",
      "Prayer and worship",
      "Quran study",
      "Islamic history and culture",
    ],
  },
];

export const topics: Topic[] = [
  {
    id: "t1",
    title: "The Concept of God in Islam",
    description: "Understand Tawhid — the foundational belief in the oneness of God. This is the core of Islamic faith and the starting point for every Muslim.",
    resourceTitle: "The Fundamentals of Tawhid",
    resourceSource: "Al-Islam.org",
  },
  {
    id: "t2",
    title: "The Quran: Revelation & Structure",
    description: "Learn how the Quran was revealed, its structural organization, and how to approach reading it for the first time.",
    resourceTitle: "Quran 101: A Beginner\\'s Guide",
    resourceSource: "Quran.com",
  },
  {
    id: "t3",
    title: "The Life of the Prophet Muhammad",
    description: "A concise overview of the Prophet\\'s life, his character, and why he is central to Islamic faith and practice.",
    resourceTitle: "The Sealed Nectar (Ar-Raheeq Al-Makhtum)",
    resourceSource: "Darussalam Publications",
  },
  {
    id: "t4",
    title: "The Five Pillars of Islam",
    description: "The five foundational acts of worship that shape a Muslim\\'s life: Shahada, Salah, Zakat, Sawm, and Hajj.",
    resourceTitle: "Pillars of Islam - A Beginner\\'s Guide",
    resourceSource: "Yaqeen Institute",
  },
  {
    id: "t5",
    title: "How to Pray (Salah)",
    description: "A step-by-step guide to performing the five daily prayers, including purification, postures, and what to recite.",
    resourceTitle: "How to Pray: A Step-by-Step Guide",
    resourceSource: "IslamReligion.com",
  },
  {
    id: "t6",
    title: "Building Faith: Certainty & Doubt",
    description: "Practical guidance on strengthening your faith, dealing with doubts, and finding stability in your journey.",
    resourceTitle: "Fortifying Faith in Times of Doubt",
    resourceSource: "SeekersGuidance",
  },
  {
    id: "t7",
    title: "Understanding the Sunnah",
    description: "What is the Sunnah, how does it complement the Quran, and how do Muslims follow the example of the Prophet in daily life.",
    resourceTitle: "The Authority of Sunnah",
    resourceSource: "IslamWeb.net",
  },
  {
    id: "t8",
    title: "Fasting & Spiritual Growth",
    description: "The purpose and practice of fasting in Ramadan, and how it cultivates self-discipline and closeness to God.",
    resourceTitle: "Ramadan: A Month of Spiritual Training",
    resourceSource: "IslamOnline.net",
  },
  {
    id: "t9",
    title: "Zakat & Community Responsibility",
    description: "Understanding obligatory charity, its purpose in purifying wealth, and building a community of care.",
    resourceTitle: "Zakat: Rights & Obligations",
    resourceSource: "Zakat Foundation of America",
  },
  {
    id: "t10",
    title: "Journey to Hajj",
    description: "The pilgrimage to Mecca: its history, rituals, and spiritual significance for Muslims worldwide.",
    resourceTitle: "Hajj: A Practical Guide",
    resourceSource: "Saudi Ministry of Hajj",
  },
];

export function buildPersonalizedRoadmap(answers: string[]): Roadmap {
  const interest = answers[5] || "Faith and belief (Aqeedah)";
  const arabicLevel = answers[4] || "None at all";

  let order: string[];
  switch (interest) {
    case "Faith and belief (Aqeedah)":
      order = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10"];
      break;
    case "Prayer and worship":
      order = ["t1", "t4", "t5", "t7", "t2", "t3", "t6", "t8", "t9", "t10"];
      break;
    case "Quran study":
      order = ["t2", "t1", "t3", "t4", "t5", "t7", "t6", "t8", "t9", "t10"];
      break;
    case "Islamic history and culture":
      order = ["t3", "t1", "t2", "t4", "t7", "t5", "t6", "t8", "t9", "t10"];
      break;
    default:
      order = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10"];
  }

  const connections: [string, string][] = [];
  for (let i = 0; i < order.length - 1; i++) {
    connections.push([order[i], order[i + 1]]);
  }

  const nodes: RoadmapNode[] = order.map((topicId, index) => ({
    id: \`node-\${topicId}\`,
    topicId,
    status: index === 0 ? "unlocked" : "locked",
    prerequisites: index > 0 ? [order[index - 1]] : [],
  }));

  return { nodes, connections };
}

export function updateRoadmapAfterComplete(
  roadmap: Roadmap,
  completedNodeId: string
): Roadmap {
  const newNodes = roadmap.nodes.map((node) => {
    if (node.id === completedNodeId) {
      return { ...node, status: "completed" as const };
    }
    if (node.status === "locked") {
      const allPrereqsMet = node.prerequisites.every((prereqId) => {
        const prereqNode = roadmap.nodes.find(
          (n) => n.topicId === prereqId || n.id === prereqId
        );
        return (
          prereqNode &&
          (prereqNode.status === "completed" ||
            (prereqNode.id === completedNodeId &&
              node.prerequisites.includes(prereqNode.topicId)))
        );
      });
      if (allPrereqsMet) {
        return { ...node, status: "unlocked" as const };
      }
    }
    return node;
  });
  return { ...roadmap, nodes: newNodes };
}
`;

files["index.css"] = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg: #0A1F1A;
  --surface: #122B24;
  --primary: #0B6E5A;
  --secondary: #D5B38E;
  --muted: #3D4A45;
  --border: #1E332C;
  --text-primary: #F2EDE6;
  --text-muted: #8B9B94;

  --font-mono: "Geist Mono", "Consolas", monospace;
}

html, body, #root {
  height: 100%;
  width: 100%;
}

body {
  font-family: var(--font-mono);
  background: var(--bg);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.5;
}

button {
  font-family: var(--font-mono);
  cursor: pointer;
  border: none;
  background: none;
  color: inherit;
  font-size: inherit;
}

button:focus-visible {
  outline: 1px solid var(--primary);
  outline-offset: 2px;
}
`;

files["main.tsx"] = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

files["App.tsx"] = `import { useState, useCallback } from "react";
import type { Screen, Roadmap, Topic } from "./types";
import { diagnosticQuestions, topics, buildPersonalizedRoadmap, updateRoadmapAfterComplete } from "./data";
import Onboarding from "./components/Onboarding";
import Diagnostic from "./components/Diagnostic";
import Roadmap from "./components/Roadmap";
import TopicDetail from "./components/TopicDetail";

export default function App() {
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [answers, setAnswers] = useState<string[]>([]);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const handleBegin = useCallback(() => {
    setScreen("diagnostic");
  }, []);

  const handleDiagnosticComplete = useCallback((allAnswers: string[]) => {
    const r = buildPersonalizedRoadmap(allAnswers);
    setRoadmap(r);
    setAnswers(allAnswers);
    setScreen("roadmap");
  }, []);

  const handleNodeClick = useCallback((topicId: string) => {
    setSelectedTopicId(topicId);
    setScreen("topic");
  }, []);

  const handleMarkComplete = useCallback((topicId: string) => {
    if (!roadmap) return;
    const nodeId = \`node-\${topicId}\`;
    const updated = updateRoadmapAfterComplete(roadmap, nodeId);
    setRoadmap(updated);
    setScreen("roadmap");
    setSelectedTopicId(null);
  }, [roadmap]);

  const handleBackToRoadmap = useCallback(() => {
    setScreen("roadmap");
    setSelectedTopicId(null);
  }, []);

  const selectedTopic = selectedTopicId
    ? topics.find((t) => t.id === selectedTopicId) || null
    : null;

  const currentNode = selectedTopicId && roadmap
    ? roadmap.nodes.find((n) => n.topicId === selectedTopicId) || null
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
      {screen === "diagnostic" && (
        <Diagnostic
          questions={diagnosticQuestions}
          onComplete={handleDiagnosticComplete}
        />
      )}
      {screen === "roadmap" && roadmap && (
        <Roadmap
          roadmap={roadmap}
          topics={topics}
          onNodeClick={handleNodeClick}
        />
      )}
      {screen === "topic" && selectedTopic && currentNode && (
        <TopicDetail
          topic={selectedTopic}
          node={currentNode}
          onMarkComplete={handleMarkComplete}
          onBack={handleBackToRoadmap}
        />
      )}
    </div>
  );
}
`;

Object.entries(files).forEach(([name, content]) => {
  const p = path.join(base, name);
  fs.writeFileSync(p, content, "utf-8");
  console.log("Written:", p);
});