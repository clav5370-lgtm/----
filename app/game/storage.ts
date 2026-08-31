import { migrateSaveEnvelope } from "./save-migration";
import { SAVE_SCHEMA_VERSION, type GameStateV4, type GameStateV7, type SaveEnvelope } from "./types";

export const SAVE_KEYS = ["lab-life-v7-local", "lab-life-v6-local", "lab-life-v5-local", "lab-life-v4-local", "lab-life-save"] as const;
export const CANONICAL_SAVE_KEY = SAVE_KEYS[0];
const MEMORY_KEY = "__lab_life_memory_save__";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
let memoryValue: string | null = null;

function getStorage(): StorageLike | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    if (typeof globalThis !== "undefined" && "localStorage" in globalThis) return (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage ?? null;
  } catch { /* privacy mode / blocked storage: memory fallback below */ }
  return null;
}

function readRaw(): { key: string; raw: string } | null {
  const storage = getStorage();
  for (const key of SAVE_KEYS) {
    try {
      let raw: string | null = null;
      try { raw = storage?.getItem(key) ?? null; } catch { /* fall through to memory */ }
      if (!raw && key === CANONICAL_SAVE_KEY) raw = memoryValue;
      if (raw) return { key, raw };
    } catch { /* try the next key */ }
  }
  return null;
}

function readRawCandidates(): Array<{ key: string; raw: string }> {
  const storage = getStorage();
  const result: Array<{ key: string; raw: string }> = [];
  for (const key of SAVE_KEYS) {
    try {
      let raw: string | null = null;
      try { raw = storage?.getItem(key) ?? null; } catch { /* fall through to memory */ }
      if (!raw && key === CANONICAL_SAVE_KEY) raw = memoryValue;
      if (raw) result.push({ key, raw });
    } catch { /* continue in restricted-storage environments */ }
  }
  return result;
}

export function hasSavedGame() { return loadSave() !== null; }

export function loadSave(): { envelope: SaveEnvelope; sourceKey: string } | null {
  for (const raw of readRawCandidates()) {
    try { return { envelope: migrateSaveEnvelope(JSON.parse(raw.raw)), sourceKey: raw.key }; }
    catch { /* malformed canonical data should not hide a usable legacy save */ }
  }
  return null;
}

export function loadGameState(): GameStateV7 | null {
  return loadSave()?.envelope.state ?? null;
}

/** Save without ever deleting a legacy key. Existing canonical data is backed up first. */
export function saveGameState(state: GameStateV7 | GameStateV4): SaveEnvelope {
  const storage = getStorage();
  let revision = 0;
  const existing = readRaw();
  if (existing) {
    try { revision = migrateSaveEnvelope(JSON.parse(existing.raw)).revision; } catch { /* overwrite with a fresh revision */ }
  }
  const envelope: SaveEnvelope = { schemaVersion: SAVE_SCHEMA_VERSION, revision: revision + 1, updatedAt: new Date().toISOString(), state: state as GameStateV7 };
  const serialized = JSON.stringify(envelope);
  try {
    if (storage && existing) storage.setItem(`${CANONICAL_SAVE_KEY}-backup`, existing.raw);
    if (storage) storage.setItem(CANONICAL_SAVE_KEY, serialized);
    else memoryValue = serialized;
  } catch {
    memoryValue = serialized;
  }
  return envelope;
}

export function clearMemorySave() { memoryValue = null; }

export const storageKeys = SAVE_KEYS;
export const STORAGE_MEMORY_KEY = MEMORY_KEY;
