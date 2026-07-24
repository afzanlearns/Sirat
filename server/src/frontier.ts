import type { Topic, NodeStatus, RoadmapNode, RoadmapResponse } from "./types.js";

/**
 * Core DAG frontier algorithm.
 * Maps each topic to completed | unlocked | locked based on which prerequisites
 * have been satisfied. This is deterministic code — no LLM involved.
 */
export function computeFrontier(
  topics: Topic[],
  completedIds: Set<string>
): Map<string, NodeStatus> {
  const state = new Map<string, NodeStatus>();

  for (const topic of topics) {
    if (completedIds.has(topic.id)) {
      state.set(topic.id, "completed");
      continue;
    }
    const prereqsMet = topic.prerequisites.every((p) => completedIds.has(p));
    state.set(topic.id, prereqsMet ? "unlocked" : "locked");
  }

  return state;
}

/**
 * Builds the full roadmap response shape — annotated nodes + connection list.
 */
export function buildRoadmapResponse(
  topics: Topic[],
  completedIds: Set<string>
): RoadmapResponse {
  const frontier = computeFrontier(topics, completedIds);

  const nodes: RoadmapNode[] = topics.map((topic) => ({
    topicId: topic.id,
    status: frontier.get(topic.id) ?? "locked",
    title: topic.title,
    description: topic.description,
    category: topic.category,
    difficulty: topic.difficulty,
  }));

  // Build connections from prerequisite relationships
  const connections: [string, string][] = [];
  for (const topic of topics) {
    for (const prereq of topic.prerequisites) {
      connections.push([prereq, topic.id]);
    }
  }

  return { nodes, connections };
}

/**
 * Computes which topic IDs just transitioned from locked → unlocked
 * as a result of a single completion event. Used to drive the animation diff.
 */
export function computeNewlyUnlocked(
  topics: Topic[],
  prevCompleted: Set<string>,
  newCompleted: Set<string>
): string[] {
  const prevFrontier = computeFrontier(topics, prevCompleted);
  const newFrontier = computeFrontier(topics, newCompleted);

  const newlyUnlocked: string[] = [];
  for (const topic of topics) {
    if (
      prevFrontier.get(topic.id) === "locked" &&
      newFrontier.get(topic.id) === "unlocked"
    ) {
      newlyUnlocked.push(topic.id);
    }
  }
  return newlyUnlocked;
}
