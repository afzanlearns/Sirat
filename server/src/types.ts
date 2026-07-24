export interface Topic {
  id: string;
  title: string;
  description: string;
  category: "Aqeedah" | "Fiqh" | "Seerah" | "Ibadah" | "Quran" | "Akhlaq";
  difficulty: 1 | 2 | 3;
  prerequisites: string[];
  resource: {
    title: string;
    source: string;
    url: string;
  };
}

export interface UserProgress {
  userId: string;
  completedTopicIds: string[];
  diagnosticAnswers: Record<string, string>;
  startedAt: string;
}

export interface DiagnosticQuestion {
  id: string;
  question: string;
  options: string[];
}

export type NodeStatus = "locked" | "unlocked" | "completed";

export interface RoadmapNode {
  topicId: string;
  status: NodeStatus;
  title: string;
  description: string;
  category: Topic["category"];
  difficulty: Topic["difficulty"];
}

export interface RoadmapResponse {
  nodes: RoadmapNode[];
  connections: [string, string][];
}

export interface CompleteTopicResponse {
  nodes: RoadmapNode[];
  connections: [string, string][];
  newlyUnlocked: string[];
}
