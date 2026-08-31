import assert from "node:assert/strict";
import test from "node:test";
import {
  ANIMAL_EXPERIMENTS,
  ANIMAL_STAGES,
  animalEvidenceForResult,
  advanceAnimalStudy,
  collectAnimalSamples,
  consumeSample,
  createAnimalRescueStudy,
  createAnimalStudy,
  reserveSample,
  type AnimalSampleInventory,
  type AnimalStudyDesign,
} from "../app/game/experiments/animal.ts";

const design = (purpose: "descriptive" | "causal" = "descriptive"): AnimalStudyDesign => ({
  id: purpose === "causal" ? "rescue-study" : "animal-study",
  name: "小鼠实验",
  species: "mouse",
  strain: "C57BL/6J",
  sex: "mixed",
  ageWeeks: 8,
  animalCount: 12,
  groups: [
    { id: "control", name: "对照组", treatment: "vehicle", animalCount: 6, control: true },
    { id: "model", name: "模型组", treatment: "disease model", animalCount: 6 },
  ],
  intervention: "test intervention",
  purpose,
  adaptationDays: 7,
  monitoring: { measures: ["体重", "一般状态"], frequency: "daily", humaneEndpoints: ["weight loss > 20%"] },
});

const serum: AnimalSampleInventory = {
  id: "serum-1", kind: "serum", label: "血清", amount: 100, unit: "µL", quality: 1,
  available: 100, reserved: 0, reservations: [], sourceAnimalIds: ["mouse-1"],
};

test("animal route exposes all eight stages and required assays with bilingual copy", () => {
  assert.deepEqual(ANIMAL_STAGES, [
    "animal-design", "animal-dosing", "animal-phenotype", "animal-sampling",
    "animal-histology", "animal-molecular", "animal-omics", "animal-causal",
  ]);
  for (const stage of ANIMAL_STAGES) assert.ok(ANIMAL_EXPERIMENTS.some((item) => item.stage === stage));
  for (const id of ["animal-model-select", "animal-grouping", "animal-dose-finding", "animal-administration", "animal-adaptation-monitoring", "animal-body-weight", "animal-serum-biochemistry", "animal-sampling", "animal-organ-weight", "animal-h-and-e", "animal-special-stain", "animal-ihc", "animal-if", "animal-rt-qpcr", "animal-wb", "animal-elisa", "animal-rna-seq", "animal-proteomics", "animal-metabolomics", "animal-microbiome", "animal-single-cell", "animal-rescue"]) {
    const item = ANIMAL_EXPERIMENTS.find((entry) => entry.id === id);
    assert.ok(item, id);
    assert.ok(item?.copy.zh.commonName && item.copy.en.commonName);
    assert.ok(item?.copy.zh.professionalName && item.copy.en.professionalName);
    assert.ok(item?.copy.zh.description && item.copy.en.description);
    assert.ok(item?.copy.zh.prerequisite && item.copy.en.prerequisite);
    assert.ok((item?.evidence.maxLevel ?? 5) <= 4);
  }
});

test("study lifecycle is immutable and follows design, adaptation/dosing, monitoring, sampling, complete", () => {
  const initial = createAnimalStudy(design());
  assert.equal(initial.lifecycle, "design");
  const adaptation = advanceAnimalStudy(initial);
  assert.equal(adaptation.lifecycle, "adaptation");
  assert.equal(initial.lifecycle, "design");
  const dosing = advanceAnimalStudy(adaptation);
  const monitoring = advanceAnimalStudy(dosing);
  const sampling = advanceAnimalStudy(monitoring);
  const complete = advanceAnimalStudy(sampling);
  assert.deepEqual([dosing.lifecycle, monitoring.lifecycle, sampling.lifecycle, complete.lifecycle], ["dosing", "monitoring", "sampling", "completed"]);
});

test("collection, reservation and consumption respect finite sample inventory", () => {
  let study = advanceAnimalStudy(advanceAnimalStudy(advanceAnimalStudy(advanceAnimalStudy(createAnimalStudy(design())))));
  study = collectAnimalSamples(study, [serum]);
  assert.equal(study.samples[0]?.available, 100);
  const reserved = reserveSample(study, "serum-1", 40, "rna-seq");
  assert.equal(reserved.samples[0]?.available, 60);
  const consumed = consumeSample(reserved, "serum-1", 40, "rna-seq");
  assert.equal(consumed.samples[0]?.available, 60);
  assert.equal(consumed.samples[0]?.reserved, 0);
  const exhausted = consumeSample(consumed, "serum-1", 61, "rna-seq");
  assert.equal(exhausted.samples[0]?.available, 60);
  assert.match(exhausted.lastError ?? "", /耗尽|不足/);
});

test("raw omics cannot provide mechanism evidence and rescue requires a new causal-purpose study", () => {
  const raw = animalEvidenceForResult("animal-rna-seq", "raw");
  assert.equal(raw?.maxLevel, 0);
  assert.equal(raw?.canSupportMechanism, false);
  const base = createAnimalStudy(design());
  const rescue = createAnimalRescueStudy(base, design("causal"));
  assert.notEqual(rescue.id, base.id);
  assert.equal(rescue.design.purpose, "causal");
  const rescueDefinition = ANIMAL_EXPERIMENTS.find((entry) => entry.id === "animal-rescue");
  assert.equal(rescueDefinition?.purpose, "causal");
  assert.equal(rescueDefinition?.evidence.maxLevel, 4);
});

