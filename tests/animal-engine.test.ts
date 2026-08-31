import assert from "node:assert/strict";
import test from "node:test";
import { createResearchState } from "../app/game/research/evidence.ts";
import { animalAvailability, advanceAnimalExperiment, collectAnimalSamplesForProject, runAnimalAssay, startAnimalExperiment } from "../app/game/experiments/animal-engine.ts";
import type { ProjectRun } from "../app/game/types.ts";
import type { AnimalStudyDesign } from "../app/game/experiments/animal.ts";

const project = (withResearch = true): ProjectRun => ({
  id: "project-1", runId: "run-1", programId: "program", stage: 2, question: "q", knowledgeGap: "gap", mechanismAxis: "axis",
  referenceIds: [], domain: "animal", title: "Animal project", intervention: "drug", model: "mouse", target: "target", route: "animal",
  difficulty: 1, novelty: 1, truthBias: 1, recommendedExperiments: [], mode: "custom", evidence: { phenotype: 0, biochemical: 0, histology: 0, molecular: 0, mechanism: 0, omics: 0, causality: 0, replication: 0 },
  experimentHistory: [], figures: 0, figureCoverage: [], writingProgress: 0, thesisProgress: 0, active: true, ...(withResearch ? { research: createResearchState("animal") } : {}),
} as unknown as ProjectRun);

const design = (id = "study-1", purpose: "descriptive" | "causal" = "descriptive"): AnimalStudyDesign => ({
  id, species: "mouse", strain: "C57BL/6J", animalCount: 8, groups: [
    { id: "control", name: "control", treatment: "vehicle", animalCount: 4, control: true },
    { id: "model", name: "model", treatment: "drug", animalCount: 4 },
  ], intervention: "drug", purpose, adaptationDays: 3,
  monitoring: { measures: ["weight"], frequency: "daily", humaneEndpoints: ["weight loss"] },
  sampleInventory: [{ id: "tissue-1", kind: "tissue", label: "liver", amount: 2, unit: "sample", quality: 1, sourceAnimalIds: ["m1"] }],
});

const ok = <T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> => {
  assert.equal(result.ok, true, "expected operation to succeed");
  return result as Extract<T, { ok: true }>;
};

function prepareSampling() {
  let p = project();
  p = ok(startAnimalExperiment(p, "study-1", design())).project;
  assert.equal(animalAvailability(p, "animal-administration").available, false);
  p = ok(runAnimalAssay(p, "study-1", "animal-model-select")).project;
  p = ok(runAnimalAssay(p, "study-1", "animal-grouping")).project;
  p = ok(advanceAnimalExperiment(p, "study-1", "adaptation")).project;
  p = ok(runAnimalAssay(p, "study-1", "animal-dose-finding")).project;
  p = ok(runAnimalAssay(p, "study-1", "animal-administration")).project;
  p = ok(runAnimalAssay(p, "study-1", "animal-adaptation-monitoring")).project;
  p = ok(advanceAnimalExperiment(p, "study-1", "monitoring")).project;
  p = ok(runAnimalAssay(p, "study-1", "animal-body-weight")).project;
  p = ok(runAnimalAssay(p, "study-1", "animal-serum-biochemistry")).project;
  p = ok(advanceAnimalExperiment(p, "study-1", "sampling")).project;
  return p;
}

test("animal engine enforces lifecycle and initializes old projects immutably", () => {
  const old = project(false);
  const started = ok(startAnimalExperiment(old, "study-1", design()));
  assert.equal(old.research, undefined);
  assert.equal(started.project.research?.animalStudies?.[0]?.lifecycle, "design");
  assert.equal(animalAvailability(started.project, "animal-administration").available, false);
  const selected = ok(runAnimalAssay(started.project, "study-1", "animal-model-select")).project;
  assert.equal(started.project.research?.animalStudies?.[0]?.completedExperimentIds.length, 0);
  assert.equal(selected.research?.animalStudies?.[0]?.completedExperimentIds.length, 1);
});

test("animal engine completes design through sampling and consumes finite samples", () => {
  let p = prepareSampling();
  p = ok(collectAnimalSamplesForProject(p, "study-1")).project;
  const before = p.research?.animalStudies?.[0]?.samples[0]?.available;
  p = ok(runAnimalAssay(p, "study-1", "animal-h-and-e", { result: "positive", sampleId: "tissue-1", amount: 1 })).project;
  assert.equal(p.research?.animalStudies?.[0]?.samples[0]?.available, (before ?? 0) - 1);
  const exhausted = runAnimalAssay(p, "study-1", "animal-ihc", { result: "positive", sampleId: "tissue-1", amount: 2 });
  assert.equal(exhausted.ok, false);
});

test("rescue is only available in a new causal study", () => {
  let p = prepareSampling();
  p = ok(collectAnimalSamplesForProject(p, "study-1")).project;
  p = ok(runAnimalAssay(p, "study-1", "animal-single-cell", { result: "positive", sampleId: "tissue-1" })).project;
  const rescue = ok(startAnimalExperiment(p, "rescue-1", design("rescue-1", "causal")));
  assert.equal(rescue.project.research?.animalStudies?.length, 2);
  assert.equal(animalAvailability(rescue.project, "animal-rescue").available, false, "causal design still needs its own lifecycle");
  assert.equal(animalAvailability(p, "animal-rescue").available, false, "descriptive study cannot be upgraded to Rescue");
});

test("animal omics raw evidence is bounded and cannot claim mechanism", () => {
  let p = prepareSampling();
  p = ok(collectAnimalSamplesForProject(p, "study-1")).project;
  const raw = ok(runAnimalAssay(p, "study-1", "animal-rna-seq", { status: "raw", raw: true, sampleId: "tissue-1" }));
  assert.equal(raw.evidence?.level, 0);
  assert.equal(raw.evidence?.canTell.includes("关联"), true);
  assert.ok((raw.evidence?.level ?? 5) <= 4);
});
