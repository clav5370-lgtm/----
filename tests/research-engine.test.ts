import assert from "node:assert/strict";
import test from "node:test";
import type { ProjectRun } from "../app/game/types.ts";
import { completeResearchExperiment, recordOmicsDataset } from "../app/game/experiments/results.ts";
import { createResearchState, deriveEvidenceChain, researchStateWithLegacyEvidence } from "../app/game/research/evidence.ts";
import { availability } from "../app/game/experiments/rules.ts";
import { migrateSave } from "../app/game/save-migration.ts";

const makeProject = (runId = "research-test"): ProjectRun => ({
  id: "project-test", programId: "program-test", stage: 1, question: "test", knowledgeGap: "test", mechanismAxis: "target",
  requiredEvidence: ["phenotype", "molecular", "mechanism", "causality"], referenceIds: [], domain: "test", title: "test",
  intervention: "test", model: "test cells", target: "target", route: "cell", difficulty: 1, novelty: 1, truthBias: 1,
  recommendedExperiments: [], runId, mode: "base", evidence: { phenotype: 0, biochemical: 0, histology: 0, molecular: 0, mechanism: 0, omics: 0, causality: 0, replication: 0 },
  experimentHistory: [], figures: 0, figureCoverage: [], writingProgress: 0, thesisProgress: 0, active: true, research: createResearchState("cell"),
});

function finish(project: ProjectRun, id: string, outcome: Parameters<typeof completeResearchExperiment>[2] = {}): ProjectRun {
  const result = completeResearchExperiment(project, id, outcome);
  assert.equal(result.ok, true, result.ok ? undefined : result.error);
  if ("error" in result) throw new Error(result.error);
  return result.project;
}

test("the complete minimal cell route is walkable and recommendations follow configured gates", () => {
  let project = makeProject();
  assert.equal(availability(project, "cell-dose-finding").available, false);
  project = finish(project, "cell-model-select", { modelId: "hepatocyte", modelName: "Hepatocyte" });
  assert.equal(availability(project, "cell-dose-finding").available, true);
  assert.equal(availability(project, "cell-model-establishment").available, false);
  project = finish(project, "cell-dose-finding", { dose: "10 µM" });
  assert.equal(availability(project, "cell-model-establishment").available, false);
  project = finish(project, "cell-time-course", { durationHours: 24 });
  project = finish(project, "cell-model-establishment");
  project = finish(project, "cell-viability", { result: "positive" });
  project = finish(project, "cell-gene-expression", { result: "positive" });
  project = finish(project, "cell-protein-expression", { result: "positive" });
  const rescue = completeResearchExperiment(project, "cell-pharmacology-rescue", { result: "reversed", intervention: "target inhibitor", phenotypeReversed: true });
  assert.equal(rescue.ok, true);
  if (!rescue.ok) return;
  assert.equal(rescue.evidence?.level, 4);
  assert.equal(rescue.project.research?.evidenceChain?.causality, 4);
});

test("negative, trend, and contradictory results are not full-strength evidence", () => {
  let project = makeProject("weak-results");
  for (const id of ["cell-model-select", "cell-dose-finding", "cell-time-course", "cell-model-establishment"]) project = finish(project, id);
  project = finish(project, "cell-viability", { result: "trend" });
  assert.equal(project.research?.evidenceItems.at(-1)?.level, 1);
  project = finish(project, "cell-gene-expression", { result: "negative" });
  assert.equal(project.research?.evidenceItems.at(-1)?.level, 0);
  project = finish(project, "cell-protein-expression", { result: "contradictory" });
  assert.equal(project.research?.evidenceItems.at(-1)?.level, 0);
});

test("qPCR is molecular association and WB is mechanism association, never causality", () => {
  let project = makeProject("assays");
  for (const id of ["cell-model-select", "cell-dose-finding", "cell-time-course", "cell-model-establishment", "cell-viability"]) project = finish(project, id);
  project = finish(project, "cell-gene-expression");
  const qpcr = project.research?.evidenceItems.at(-1)!;
  assert.deepEqual([qpcr.evidenceClass, qpcr.role, qpcr.dimension], ["association", "molecular", "molecular"]);
  assert.equal(project.research?.mechanismCandidates.length, 0);
  project = finish(project, "cell-protein-expression");
  const wb = project.research?.evidenceItems.at(-1)!;
  assert.deepEqual([wb.evidenceClass, wb.role, wb.dimension], ["association", "mechanism", "mechanism"]);
  assert.notEqual(wb.dimension, "causality");
});

test("rescue reaches level 4 only with an existing candidate, explicit intervention, and reversed result", () => {
  let project = makeProject("rescue");
  for (const id of ["cell-model-select", "cell-dose-finding", "cell-time-course", "cell-model-establishment", "cell-viability", "cell-gene-expression", "cell-protein-expression"]) project = finish(project, id);
  const incomplete = completeResearchExperiment(project, "cell-pharmacology-rescue", { result: "positive", phenotypeReversed: true });
  assert.equal(incomplete.ok, true);
  if (!incomplete.ok) return;
  assert.equal(incomplete.evidence?.level, 0);
  const complete = completeResearchExperiment(incomplete.project, "cell-pharmacology-rescue", { result: "reversed", intervention: "inhibitor", phenotypeReversed: true });
  assert.equal(complete.ok, true);
  if (!complete.ok) return;
  assert.equal(complete.evidence?.level, 4);
});

test("legacy evidence remains conservative and cannot become five-star without a coherent cross-model programme", () => {
  const project = makeProject("caps");
  project.research = researchStateWithLegacyEvidence({ runId: project.runId, evidence: { phenotype: 99, biochemical: 99, histology: 99, molecular: 99, mechanism: 99, omics: 99, causality: 99, replication: 99 } });
  assert.ok(project.research.evidenceItems.every((item) => item.level <= 4));
  assert.ok(deriveEvidenceChain(project.research).max <= 4);
});

test("raw RNA-seq does not create mechanism evidence; analyzed data is association only", () => {
  let project = makeProject("omics");
  project = recordOmicsDataset(project, { id: "rna-raw", kind: "rna-seq", status: "raw", sampleLotIds: [], candidatePathways: [], contributesToMechanism: false });
  assert.equal(project.research?.evidenceItems.length, 0);
  project = recordOmicsDataset(project, { id: "rna-analyzed", kind: "rna-seq", status: "analyzed", sampleLotIds: [], candidatePathways: ["MAPK"], contributesToMechanism: false });
  const evidence = project.research?.evidenceItems.at(-1)!;
  assert.deepEqual([evidence.evidenceClass, evidence.role, evidence.dimension], ["association", "mechanism", "mechanism"]);
  assert.notEqual(evidence.dimension, "causality");
});

test("migration keeps old evidence conservative and exposes the additive V7 research index", () => {
  const project = makeProject("legacy");
  project.research = undefined;
  const state = migrateSave({
    ...({
      seed: 1, turn: 1, maxTurns: 104, candidateId: "candidate", advisorId: "advisor", graduationRuleId: "mixed",
      stats: { wet: 1, data: 1, writing: 1, theory: 1, social: 1 }, resources: { energy: 1, san: 1, trust: 1 },
      funding: { initial: 1, balance: 1, creditLimit: 0, totalSpent: 0, debtTurns: 0 }, familiarity: {}, lab: [], projects: [{ ...project, evidence: { ...project.evidence, causality: 99 } }],
      currentProjectRunId: project.runId, activeExperiments: [], plan: [], overtimeSlots: 0, manuscripts: [], pendingEventId: null, eventCooldown: 0,
      flags: [], relation: 0, integrity: 100, pressure: 0, minSan: 0, totalExperiments: 0, technicalFailures: 0, negativeResults: 0, surprises: 0, totalSubmissions: 0,
      finished: false, endingId: null, logs: [], schemaVersion: 6,
    }),
  });
  assert.equal(state.schemaVersion, 7);
  assert.equal(state.research?.projects[project.runId].evidenceItems.find((item) => item.dimension === "causality")?.level, 4);
  // The legacy item is retained at level 4, but cannot activate the causal chain
  // without the new rescue metadata.
  assert.equal(state.research?.projects[project.runId].evidenceChain?.causality, 0);
});
