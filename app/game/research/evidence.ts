import type { ProjectRun } from "../types";
import type { Dimension, EvidenceChain, EvidenceClass, EvidenceItem, ProjectResearchState, Role } from "./types";

export const createResearchState = (route: "cell" | "animal" = "cell"): ProjectResearchState => ({
  route,
  enabledRoutes: ["cell", "animal"],
  activeStage: route === "cell" ? "model" : "design",
  cellModels: [], selectedModelId: null, evidenceItems: [], omicsDatasets: [], sampleLots: [], mechanismCandidates: [], completedExperimentIds: [],
  animalStudies: [], activeAnimalStudyId: null, animalCompletedExperimentIds: [],
});

const legacyMap: Array<[string, EvidenceClass, Role, Dimension, number]> = [
  ["phenotype", "phenotype", "phenotype", "phenotype", 2],
  ["biochemical", "phenotype", "phenotype", "phenotype", 2],
  ["histology", "phenotype", "animal", "animal", 2],
  ["molecular", "association", "molecular", "molecular", 3],
  ["mechanism", "association", "mechanism", "mechanism", 3],
  ["causality", "causal", "causality", "causality", 4],
  ["omics", "association", "omics", "mechanism", 2],
  ["replication", "association", "replication", "reproducibility", 3],
];

/** Convert old aggregate evidence into conservative, non-five-star evidence items. */
export function legacyEvidenceItems(project: Pick<ProjectRun, "evidence" | "runId">): EvidenceItem[] {
  const oldEvidence = (project.evidence && typeof project.evidence === "object" ? project.evidence : {}) as Partial<ProjectRun["evidence"]>;
  return legacyMap.flatMap(([key, evidenceClass, role, dimension, cap]) => {
    const raw = oldEvidence[key as keyof ProjectRun["evidence"]] ?? 0;
    const level = Math.min(cap, Math.max(0, Number(raw) || 0));
    return level > 0 ? [{ id: `legacy-${project.runId}-${key}`, experimentId: `legacy-${key}`, evidenceClass, role, dimension, level, summary: `旧版本${key}证据（迁移）`, canTell: "保留旧版本已有的有限观察。", cannotTell: "旧版本汇总证据不能单独升级为五星机制。" }] : [];
  });
}

const caps: Record<Dimension, number> = { phenotype: 2, molecular: 3, mechanism: 3, causality: 4, animal: 3, reproducibility: 3 };

export function deriveEvidenceChain(source: ProjectResearchState | EvidenceItem[]): EvidenceChain {
  const items = Array.isArray(source) ? source : source.evidenceItems;
  const chain: EvidenceChain = { phenotype: 0, molecular: 0, mechanism: 0, causality: 0, animal: 0, reproducibility: 0, max: 0 };
  for (const item of items) {
    if (item.level <= 0 || !(item.dimension in chain)) continue;
    if (item.dimension === "causality" && !(item.evidenceClass === "causal" && item.mechanismCandidateId && item.intervention && item.phenotypeReversed && item.result === "reversed")) continue;
    const key = item.dimension as Dimension;
    chain[key] = Math.min(caps[key], Math.max(chain[key], item.level));
  }
  const strongestSingleLayer = Math.max(...Object.entries(chain).filter(([key]) => key !== "max").map(([, value]) => value));
  // Five stars are a property of a coherent programme, never of one expensive
  // assay: reproducible phenotype + molecular association + causal rescue +
  // in-vivo confirmation.  The individual dimensions intentionally stay capped
  // below five so a single result cannot claim a complete mechanism.
  const strongAcrossModels = chain.phenotype >= 2 && chain.molecular >= 3 && chain.mechanism >= 3
    && chain.causality >= 4 && chain.animal >= 3 && chain.reproducibility >= 2;
  chain.max = strongAcrossModels ? 5 : Math.min(4, strongestSingleLayer);
  return chain;
}

export function researchStateWithLegacyEvidence(project: Pick<ProjectRun, "evidence" | "runId">): ProjectResearchState {
  const state = createResearchState("cell");
  state.evidenceItems = legacyEvidenceItems(project);
  state.evidenceChain = deriveEvidenceChain(state);
  return state;
}
