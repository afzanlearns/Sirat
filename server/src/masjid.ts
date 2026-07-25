import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type {
  Masjid,
  EtiquetteSection,
  ConnectRequest,
  ConnectType,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Curated, human-authored data (no LLM involved) ─────────────────────────────
const MASJIDS: Masjid[] = JSON.parse(
  readFileSync(join(__dirname, "../data/masjids.json"), "utf-8")
);
const ETIQUETTE: EtiquetteSection[] = JSON.parse(
  readFileSync(join(__dirname, "../data/masjid-etiquette.json"), "utf-8")
);

const REQUESTS_PATH = join(__dirname, "../data/connect-requests.json");

// ── Directory ──────────────────────────────────────────────────────────────────
export interface DirectoryFilter {
  city?: string;
  revertFriendly?: boolean;
  newMuslimClass?: boolean;
}

export function getDirectory(filter: DirectoryFilter = {}): {
  masjids: Masjid[];
  cities: string[];
  sampleData: boolean;
} {
  let list = MASJIDS;
  if (filter.city) {
    const c = filter.city.toLowerCase();
    list = list.filter((m) => m.city.toLowerCase() === c);
  }
  if (filter.revertFriendly) list = list.filter((m) => m.revertFriendly);
  if (filter.newMuslimClass) list = list.filter((m) => m.newMuslimClass);

  const cities = Array.from(new Set(MASJIDS.map((m) => m.city))).sort();
  // Sort revert-friendly first, then by name.
  const masjids = [...list].sort(
    (a, b) => Number(b.revertFriendly) - Number(a.revertFriendly) || a.name.localeCompare(b.name)
  );

  return {
    masjids,
    cities,
    // True while the whole dataset is still the hand-seeded sample.
    sampleData: MASJIDS.every((m) => !m.verified),
  };
}

export function getEtiquette(): EtiquetteSection[] {
  return ETIQUETTE;
}

// ── Connect requests (persisted, human-triaged) ────────────────────────────────
interface RequestsDB {
  requests: ConnectRequest[];
}

function readRequests(): RequestsDB {
  if (!existsSync(REQUESTS_PATH)) return { requests: [] };
  try {
    return JSON.parse(readFileSync(REQUESTS_PATH, "utf-8")) as RequestsDB;
  } catch {
    return { requests: [] };
  }
}

function writeRequests(db: RequestsDB): void {
  writeFileSync(REQUESTS_PATH, JSON.stringify(db, null, 2), "utf-8");
}

const VALID_TYPES: ConnectType[] = ["buddy", "mentor", "visit"];

export interface ConnectInput {
  userId: string;
  name?: string;
  city?: string;
  contactMethod?: string;
  type?: string;
  message?: string;
}

export function saveConnectRequest(
  input: ConnectInput
): { ok: true; request: ConnectRequest } | { ok: false; error: string } {
  if (!input.userId) return { ok: false, error: "userId required" };
  if (!input.contactMethod || !input.contactMethod.trim()) {
    return { ok: false, error: "contactMethod required" };
  }
  const type = (input.type ?? "buddy") as ConnectType;
  if (!VALID_TYPES.includes(type)) {
    return { ok: false, error: `type must be one of ${VALID_TYPES.join(", ")}` };
  }

  const request: ConnectRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    name: (input.name ?? "").trim(),
    city: (input.city ?? "").trim(),
    contactMethod: input.contactMethod.trim(),
    type,
    message: (input.message ?? "").trim(),
    createdAt: new Date().toISOString(),
  };

  const db = readRequests();
  db.requests.push(request);
  writeRequests(db);

  console.log(`[masjid] New ${type} request from ${request.userId} (${request.city || "no city"})`);
  return { ok: true, request };
}
