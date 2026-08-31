import assert from "node:assert/strict";
import test from "node:test";
import { migrateSave, migrateSaveEnvelope, normalizeGameState, validateGameState } from "../app/game/save-migration.ts";
import { clearMemorySave, loadGameState, loadSave, saveGameState } from "../app/game/storage.ts";

const base = {
  seed: 42, turn: 8, maxTurns: 104, candidateId: "candidate-1", advisorId: "advisor-1", graduationRuleId: "mixed",
  stats: { wet: 50, data: 50, writing: 50, theory: 50, social: 50 }, resources: { energy: 70, san: 70, trust: 50 },
  funding: { initial: 100, balance: 88, creditLimit: 20, totalSpent: 12, debtTurns: 0 }, familiarity: { wb: 2 }, lab: [],
  projects: [{ runId: "project-1", experimentHistory: [{ experimentId: "western-blot" }] }], currentProjectRunId: "project-1",
  activeExperiments: [{ id: "run-1", definitionId: "qpcr" }], plan: [{ refId: "rna-seq" }], overtimeSlots: 0, manuscripts: [],
  pendingEventId: null, eventCooldown: 0, flags: ["old-flag"], relation: 32, integrity: 99, pressure: 2, minSan: 70,
  totalExperiments: 3, technicalFailures: 0, negativeResults: 1, surprises: 0, totalSubmissions: 0, finished: false, endingId: null,
  logs: [{ turn: 1, title: "start", text: "old", type: "start" }],
};

for (const version of [4, 5, 6, 7] as const) {
  test(`migrates V${version} fixture without dropping run data`, () => {
    const migrated = migrateSave({ schemaVersion: version, revision: 3, updatedAt: "2026-01-01T00:00:00.000Z", state: { ...base, schemaVersion: version } });
    assert.equal(migrated.schemaVersion, 7);
    assert.equal(migrated.turn, 8);
    assert.equal(migrated.funding.balance, 88);
    assert.equal(migrated.flags[0], "old-flag");
    assert.equal(migrated.projects[0].experimentHistory[0].experimentId, "wb");
    assert.equal(migrated.activeExperiments[0].definitionId, "pcr");
    assert.equal(migrated.plan[0].refId, "transcriptomics");
  });
}

test("migration is idempotent and writes a real revision", () => {
  const first = migrateSaveEnvelope({ schemaVersion: 5, revision: 11, state: { ...base, schemaVersion: 5 } });
  const second = migrateSaveEnvelope(first);
  assert.deepEqual(second.state, first.state);
  assert.equal(second.revision, 11);
  assert.equal(second.schemaVersion, 7);
});

test("bad JSON is rejected by the caller without throwing from validation", () => {
  assert.throws(() => migrateSave("{ definitely not json }"));
  assert.equal(validateGameState(null).valid, false);
  assert.equal(validateGameState({}).valid, false);
});

test("a semantically bad canonical save falls back to a usable legacy key", () => {
  const values = new Map<string, string>([
    ["lab-life-v7-local", JSON.stringify({ schemaVersion: 7, revision: 99, state: {} })],
    ["lab-life-v6-local", JSON.stringify({ schemaVersion: 6, revision: 4, state: { ...base, schemaVersion: 6 } })],
  ]);
  const original = (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem() {} } });
  try {
    const loaded = loadSave();
    assert.equal(loaded?.sourceKey, "lab-life-v6-local");
    assert.equal(loaded?.envelope.state.turn, 8);
  } finally {
    if (original === undefined) delete (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original });
  }
});

test("normalization preserves unknown future fields and old paper/resources", () => {
  const input = { ...base, schemaVersion: 6, futurePluginData: { keep: true } };
  const normalized = normalizeGameState(input);
  assert.deepEqual((normalized as typeof normalized & { futurePluginData: unknown }).futurePluginData, { keep: true });
  assert.equal(normalized.resources.energy, 70);
  assert.equal(normalized.manuscripts.length, 0);
});

test("storage writes a canonical V7 revision and keeps the old raw save", () => {
  const oldRaw = JSON.stringify({ schemaVersion: 6, revision: 4, state: { ...base, schemaVersion: 6 } });
  const values = new Map<string, string>([["lab-life-v6-local", oldRaw]]);
  const fakeStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const original = (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: fakeStorage });
  try {
    const saved = saveGameState(migrateSaveEnvelope(JSON.parse(oldRaw)).state);
    assert.equal(saved.revision, 5);
    assert.equal(JSON.parse(values.get("lab-life-v6-local")!).state.turn, 8);
    assert.equal(JSON.parse(values.get("lab-life-v7-local-backup")!).schemaVersion, 6);
    assert.equal(loadGameState()?.schemaVersion, 7);
  } finally {
    clearMemorySave();
    if (original === undefined) delete (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original });
  }
});

test("blocked localStorage falls back to an in-memory save", () => {
  const original = (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } } });
  try {
    clearMemorySave();
    const state = normalizeGameState(base);
    saveGameState(state);
    assert.equal(loadGameState()?.turn, 8);
  } finally {
    clearMemorySave();
    if (original === undefined) delete (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original });
  }
});
