import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { UserProgress } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "../data/db.json");

interface DB {
  users: Record<string, UserProgress>;
}

function readDB(): DB {
  if (!existsSync(DB_PATH)) {
    return { users: {} };
  }
  try {
    return JSON.parse(readFileSync(DB_PATH, "utf-8")) as DB;
  } catch {
    return { users: {} };
  }
}

function writeDB(db: DB): void {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function getUser(userId: string): UserProgress | null {
  const db = readDB();
  return db.users[userId] ?? null;
}

export function getOrCreateUser(userId: string): UserProgress {
  const db = readDB();
  if (!db.users[userId]) {
    db.users[userId] = {
      userId,
      completedTopicIds: [],
      diagnosticAnswers: {},
      startedAt: new Date().toISOString(),
    };
    writeDB(db);
  }
  return db.users[userId];
}

export function saveAnswer(
  userId: string,
  questionId: string,
  answer: string
): UserProgress {
  const db = readDB();
  const user = db.users[userId] ?? {
    userId,
    completedTopicIds: [],
    diagnosticAnswers: {},
    startedAt: new Date().toISOString(),
  };
  user.diagnosticAnswers[questionId] = answer;
  db.users[userId] = user;
  writeDB(db);
  return user;
}

export function seedCompletedTopics(
  userId: string,
  topicIds: string[]
): UserProgress {
  const db = readDB();
  const user = db.users[userId] ?? {
    userId,
    completedTopicIds: [],
    diagnosticAnswers: {},
    startedAt: new Date().toISOString(),
  };
  // Merge without duplicates
  const merged = Array.from(new Set([...user.completedTopicIds, ...topicIds]));
  user.completedTopicIds = merged;
  db.users[userId] = user;
  writeDB(db);
  return user;
}

export function completeTopic(userId: string, topicId: string): UserProgress {
  const db = readDB();
  const user = db.users[userId] ?? {
    userId,
    completedTopicIds: [],
    diagnosticAnswers: {},
    startedAt: new Date().toISOString(),
  };
  if (!user.completedTopicIds.includes(topicId)) {
    user.completedTopicIds.push(topicId);
  }
  db.users[userId] = user;
  writeDB(db);
  return user;
}
