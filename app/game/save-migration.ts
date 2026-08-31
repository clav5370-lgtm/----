import { SAVE_SCHEMA_VERSION, type GameStateV4, type GameStateV5, type GameStateV6, type GameStateV7, type SaveEnvelope, type ProjectRun } from "./types";
import { createResearchState, deriveEvidenceChain, researchStateWithLegacyEvidence } from "./research/evidence";
import type { ProjectResearchState } from "./research/types";

/**
 * Stable IDs are part of a save file. Keep this table even while the new
 * experiment centre is being built so old runs never lose their history.
 */
export const LEGACY_EXPERIMENT_ID_MAP: Readonly<Record<string, string>> = Object.freeze({
  "qpcr": "pcr",
  "rt-qpcr": "pcr",
  "western-blot": "wb",
  "western_blot": "wb",
  "cell-viability": "cell-toxicity",
  "cck8": "cell-toxicity",
  "cck-8": "cell-toxicity",
  "rna-seq": "transcriptomics",
  "rna_seq": "transcriptomics",
});

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => Boolean(value && typeof value === "object" && !Array.isArray(value));
const clone = <T>(value: T): T => {
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)) as T; }
};
const finite = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const array = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

const LEGACY_RESEARCH_ID_MAP: Readonly<Record<string, string>> = Object.freeze({
  pcr: "cell-gene-expression", qpcr: "cell-gene-expression", "rt-qpcr": "cell-gene-expression",
  wb: "cell-protein-expression", "western-blot": "cell-protein-expression", western_blot: "cell-protein-expression",
  "cell-toxicity": "cell-viability", cck8: "cell-viability", "cck-8": "cell-viability",
});

function normalizeProjectResearch(project: UnknownRecord): ProjectResearchState {
  if (!isRecord(project.research)) return researchStateWithLegacyEvidence(project as unknown as ProjectRun);
  const raw = project.research;
  const route = raw.route === "animal" ? "animal" : "cell";
  const state = { ...createResearchState(route), ...raw } as ProjectResearchState;
  state.route = route;
  if (route === "cell" && !["model", "phenotype", "molecular", "omics", "causal", "advanced"].includes(state.activeStage as string)) state.activeStage = "model";
  if (route === "animal" && !["design", "dosing", "phenotype", "sampling", "histology", "molecular", "omics", "causal"].includes(state.activeStage as string)) state.activeStage = "design";
  state.cellModels = array<UnknownRecord>(state.cellModels).filter(isRecord) as ProjectResearchState["cellModels"];
  state.evidenceItems = array<UnknownRecord>(state.evidenceItems).filter(isRecord) as ProjectResearchState["evidenceItems"];
  state.omicsDatasets = array<UnknownRecord>(state.omicsDatasets).filter(isRecord) as ProjectResearchState["omicsDatasets"];
  state.sampleLots = array<UnknownRecord>(state.sampleLots).filter(isRecord) as ProjectResearchState["sampleLots"];
  state.mechanismCandidates = array<UnknownRecord>(state.mechanismCandidates).filter(isRecord) as ProjectResearchState["mechanismCandidates"];
  state.completedExperimentIds = array(state.completedExperimentIds).filter((id): id is string => typeof id === "string").map((id) => LEGACY_RESEARCH_ID_MAP[id] ?? id);
  state.animalStudies = array<UnknownRecord>(state.animalStudies).filter(isRecord) as ProjectResearchState["animalStudies"];
  state.animalCompletedExperimentIds = array(state.animalCompletedExperimentIds).filter((id): id is string => typeof id === "string");
  state.activeAnimalStudyId = typeof state.activeAnimalStudyId === "string" ? state.activeAnimalStudyId : null;
  state.selectedModelId = typeof state.selectedModelId === "string" ? state.selectedModelId : null;
  state.evidenceChain = deriveEvidenceChain(state);
  return state;
}

/** Map IDs in the nested history structures without deleting unknown fields. */
function mapExperimentIds(state: UnknownRecord) {
  const mapId = (value: unknown) => typeof value === "string" ? LEGACY_EXPERIMENT_ID_MAP[value] ?? value : value;
  for (const project of array<UnknownRecord>(state.projects)) {
    for (const record of array<UnknownRecord>(project.experimentHistory)) {
      if ("experimentId" in record) record.experimentId = mapId(record.experimentId);
    }
  }
  for (const run of array<UnknownRecord>(state.activeExperiments)) {
    if ("definitionId" in run) run.definitionId = mapId(run.definitionId);
  }
  for (const item of array<UnknownRecord>(state.plan)) {
    if ("refId" in item) item.refId = mapId(item.refId);
  }
}

/** Runtime shape repair. Defaults are deliberately conservative and additive. */
export function normalizeGameState(input: unknown): GameStateV7 {
  if (!isRecord(input)) throw new Error("存档不是有效的游戏状态。");
  const state = clone(input);
  state.schemaVersion = SAVE_SCHEMA_VERSION;
  state.experimentSystemVersion = 1;
  state.seed = finite(state.seed, Date.now() % 2147483647);
  const normalizedTurn = Math.max(1, Math.floor(finite(state.turn, 1)));
  state.turn = normalizedTurn;
  state.maxTurns = Math.max(normalizedTurn, Math.floor(finite(state.maxTurns, 104)));
  state.stats = isRecord(state.stats) ? state.stats : {};
  state.resources = isRecord(state.resources) ? state.resources : { energy: 82, san: 78, trust: 52 };
  state.funding = isRecord(state.funding) ? state.funding : { initial: 0, balance: 0, creditLimit: 0, totalSpent: 0, debtTurns: 0 };
  state.familiarity = isRecord(state.familiarity) ? state.familiarity : {};
  const projects = array<UnknownRecord>(state.projects);
  state.projects = projects;
  for (const project of projects) project.research = normalizeProjectResearch(project);
  state.research = { version: 1, projects: Object.fromEntries(projects.filter((project) => typeof project.runId === "string" && isRecord(project.research)).map((project) => [project.runId as string, project.research])) };
  // Failure incidents are additive.  Keep old saves valid while repairing a
  // partially written failureState conservatively for the new engine.
  const rawFailure = isRecord(state.failureState) ? state.failureState : {};
  state.failureState = {
    version: 1,
    incidents: array(rawFailure.incidents),
    observations: array(rawFailure.observations),
    replicateConsistency: isRecord(rawFailure.replicateConsistency) ? rawFailure.replicateConsistency : {},
    quality: finite(rawFailure.quality, 100),
    slots: finite(rawFailure.slots, 0),
    cost: finite(rawFailure.cost, 0),
    energy: finite(rawFailure.energy, 0),
    san: finite(rawFailure.san, 0),
    trust: finite(rawFailure.trust, 0),
    integrity: finite(rawFailure.integrity, 0),
    negativeIntegrity: Boolean(rawFailure.negativeIntegrity),
  };
  state.pendingIncidents = array(state.pendingIncidents);
  state.negativeIntegrity = Boolean(state.negativeIntegrity || (state.failureState as UnknownRecord).negativeIntegrity);
  state.lab = array(state.lab);
  state.activeExperiments = array(state.activeExperiments);
  state.plan = array(state.plan);
  state.manuscripts = array(state.manuscripts);
  state.flags = array(state.flags);
  state.logs = array(state.logs);
  state.pendingEventId = typeof state.pendingEventId === "string" ? state.pendingEventId : null;
  state.eventCooldown = finite(state.eventCooldown, 0);
  state.overtimeSlots = Math.max(0, Math.floor(finite(state.overtimeSlots, 0)));
  state.relation = finite(state.relation, 32);
  state.integrity = finite(state.integrity, 100);
  state.pressure = finite(state.pressure, 0);
  state.minSan = finite(state.minSan, finite((state.resources as UnknownRecord).san, 78));
  for (const key of ["totalExperiments", "technicalFailures", "negativeResults", "surprises", "totalSubmissions"])
    state[key] = Math.max(0, Math.floor(finite(state[key], 0)));
  state.finished = Boolean(state.finished);
  state.endingId = typeof state.endingId === "string" ? state.endingId : null;
  if (typeof state.currentProjectRunId !== "string" && projects[0]) state.currentProjectRunId = projects[0].runId;
  mapExperimentIds(state);
  return state as GameStateV7;
}

export type SaveValidation = { valid: true; state: GameStateV7 } | { valid: false; errors: string[] };

export function validateGameState(input: unknown): SaveValidation {
  if (!isRecord(input)) return { valid: false, errors: ["state is not an object"] };
  const errors: string[] = [];
  for (const key of ["turn", "seed", "maxTurns"]) if (typeof input[key] !== "number" || !Number.isFinite(input[key])) errors.push(`${key} must be a finite number`);
  for (const key of ["candidateId", "advisorId", "graduationRuleId", "currentProjectRunId"]) if (typeof input[key] !== "string" || input[key].length === 0) errors.push(`${key} must be a non-empty string`);
  for (const key of ["projects", "manuscripts", "logs", "plan", "activeExperiments", "lab", "flags"]) if (!Array.isArray(input[key])) errors.push(`${key} must be an array`);
  const projects = Array.isArray(input.projects) ? input.projects.filter(isRecord) : [];
  if (projects.length === 0) errors.push("projects must contain at least one project");
  if (typeof input.currentProjectRunId === "string" && !projects.some((project) => project.runId === input.currentProjectRunId)) errors.push("currentProjectRunId must point to an existing project");
  for (const [group, keys] of Object.entries({
    stats: ["wet", "data", "writing", "theory", "social"],
    resources: ["energy", "san", "trust"],
    funding: ["initial", "balance", "creditLimit", "totalSpent", "debtTurns"],
  })) {
    if (!isRecord(input[group])) { errors.push(`${group} must be an object`); continue; }
    for (const key of keys) if (typeof input[group][key] !== "number" || !Number.isFinite(input[group][key])) errors.push(`${group}.${key} must be a finite number`);
  }
  return errors.length ? { valid: false, errors } : { valid: true, state: normalizeGameState(input) };
}

function rawState(input: unknown): UnknownRecord {
  if (!isRecord(input)) throw new Error("存档不是对象。");
  return isRecord(input.state) ? input.state : input;
}

/** Migrate V4/V5/V6 envelopes and raw legacy states to the canonical V7 state. */
export function migrateSave(input: unknown): GameStateV7 {
  const migrated = normalizeGameState(rawState(input));
  const validation = validateGameState(migrated);
  if (!validation.valid) throw new Error(`存档校验失败：${validation.errors.join("；")}`);
  return validation.state;
}

export function migrateSaveEnvelope(input: unknown): SaveEnvelope {
  const source = isRecord(input) ? input : {};
  const revision = Math.max(0, Math.floor(finite(source.revision, 0)));
  return { schemaVersion: SAVE_SCHEMA_VERSION, revision, updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString(), state: migrateSave(input) };
}

export type LegacySaveFixture = GameStateV4 | GameStateV5 | GameStateV6 | GameStateV7;
