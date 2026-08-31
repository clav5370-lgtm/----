import assert from "node:assert/strict";
import test from "node:test";
import { ANIMAL_STAGE_ORDER, CELL_EXPERIMENTS, CELL_STAGE_ORDER, RESEARCH_ROUTES } from "../app/game/experiments/catalog.ts";
import { ANIMAL_STAGES, CELL_STAGES, ROUTE_COPY, EXPERIMENT_COPY } from "../app/components/experiment-center/copy.ts";

test("V7 experiment centre has two bilingual route entries and six/eight stages", () => {
  assert.deepEqual(Object.keys(ROUTE_COPY).sort(), ["animal", "cell"]);
  assert.deepEqual(RESEARCH_ROUTES.map((route) => route.nameEn), ["Cell Experiments", "Animal Experiments"]);
  assert.equal(CELL_STAGES.length, CELL_STAGE_ORDER.length);
  assert.equal(ANIMAL_STAGES.length, ANIMAL_STAGE_ORDER.length);
  for (const route of Object.values(ROUTE_COPY)) {
    assert.ok(route.zh.name && route.en.name);
    assert.ok(route.zh.description && route.en.description);
  }
});

test("all eight connected cell experiments have bilingual card copy", () => {
  assert.equal(CELL_EXPERIMENTS.length, 8);
  for (const experiment of CELL_EXPERIMENTS) {
    const translated = EXPERIMENT_COPY[experiment.id];
    assert.ok(translated?.nameEn, experiment.id);
    assert.ok(translated?.descriptionEn, experiment.id);
    assert.ok(translated?.cannotTellEn, experiment.id);
  }
});
