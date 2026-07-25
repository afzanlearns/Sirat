export interface DiagnosticQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  resourceTitle: string;
  resourceSource: string;
}

export interface RoadmapNode {
  id: string;
  topicId: string;
  status: "locked" | "unlocked" | "completed";
  prerequisites: string[];
}

export interface Roadmap {
  nodes: RoadmapNode[];
  connections: [string, string][];
}

export type Screen =
  | "onboarding"
  | "diagnostic"
  | "roadmap"
  | "topic"
  | "complete"
  | "clarity"
  | "masjid"
  | "prayer";
