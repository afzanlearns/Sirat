/**
 * validate-dag.ts
 * Run once before demo to verify topics.json has no circular dependencies.
 * Usage: npm run validate
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const topicsPath = join(__dirname, "../data/topics.json");

interface TopicRaw {
  id: string;
  prerequisites: string[];
}

function validateDAG(topics: TopicRaw[]): void {
  const ids = new Set(topics.map((t) => t.id));

  // 1. Check all prerequisite IDs actually exist
  for (const topic of topics) {
    for (const prereq of topic.prerequisites) {
      if (!ids.has(prereq)) {
        console.error(
          `❌ Topic "${topic.id}" references unknown prerequisite "${prereq}"`
        );
        process.exit(1);
      }
    }
  }

  // 2. Cycle detection via DFS with three-color marking
  // white=0 (unvisited), grey=1 (in stack), black=2 (done)
  const color = new Map<string, 0 | 1 | 2>();
  for (const t of topics) color.set(t.id, 0);

  const prereqMap = new Map<string, string[]>();
  for (const t of topics) prereqMap.set(t.id, t.prerequisites);

  function dfs(id: string, path: string[]): void {
    color.set(id, 1);
    for (const prereq of prereqMap.get(id) ?? []) {
      if (color.get(prereq) === 1) {
        console.error(
          `❌ Circular dependency detected: ${[...path, id, prereq].join(" -> ")}`
        );
        process.exit(1);
      }
      if (color.get(prereq) === 0) {
        dfs(prereq, [...path, id]);
      }
    }
    color.set(id, 2);
  }

  for (const t of topics) {
    if (color.get(t.id) === 0) {
      dfs(t.id, []);
    }
  }

  console.log(`✅ DAG validation passed — ${topics.length} topics, no cycles, all prerequisites valid.`);
}

const topics: TopicRaw[] = JSON.parse(readFileSync(topicsPath, "utf-8"));
validateDAG(topics);
