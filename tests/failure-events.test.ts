import assert from "node:assert/strict";
import test from "node:test";
import {
  FAILURE_EVENTS,
  calculateReplicateConsistency,
  pickWeightedFailure,
  resolveFailureChoice,
  summarizeScientificResults,
  type FailureAction,
  type ScientificObservation,
} from "../app/game/experiments/failures.ts";

test("failure catalog has the requested bilingual category coverage", () => {
  assert.equal(FAILURE_EVENTS.length, 33);
  const counts = FAILURE_EVENTS.reduce<Record<string, number>>((result, event) => {
    result[event.category] = (result[event.category] ?? 0) + 1;
    return result;
  }, {});
  assert.deepEqual(counts, { wb: 6, qpcr: 5, "cell-culture": 5, animal: 8, omics: 5, "pathology-imaging": 4 });
  for (const event of FAILURE_EVENTS) {
    assert.ok(event.title.zh && event.title.en);
    assert.ok(event.reason.zh && event.reason.en);
    assert.ok(event.techniqueTags.length > 0);
    assert.ok(event.weight > 0);
    assert.equal(event.choices.length, 5);
    for (const item of event.choices) {
      assert.ok(item.label.zh && item.label.en);
      assert.ok(item.cost >= 0);
      assert.ok(Number.isFinite(item.slots) && Number.isFinite(item.quality));
      assert.ok(Number.isFinite(item.energy) && Number.isFinite(item.san));
      assert.ok(Number.isFinite(item.trust) && Number.isFinite(item.integrity));
      assert.deepEqual(item.effects, { cost: item.cost, slots: item.slots, quality: item.quality, energy: item.energy, san: item.san, trust: item.trust, integrity: item.integrity });
      if (item.integrity < 0) assert.equal(item.negativeIntegrity, true);
    }
  }
});

test("weighted picking respects technique tags and consumes one deterministic sample", () => {
  let calls = 0;
  const selected = pickWeightedFailure(["qPCR"], () => { calls += 1; return 0; });
  assert.ok(selected);
  assert.equal(selected?.category, "qpcr");
  assert.equal(calls, 1);
  assert.equal(pickWeightedFailure(["does-not-exist"], () => 0), undefined);
});

test("choice resolution is pure and exposes integrity risk explicitly", () => {
  const event = FAILURE_EVENTS[0];
  const before = JSON.stringify(event);
  const resolved = resolveFailureChoice(event, "discard");
  assert.ok(resolved);
  assert.equal(resolved?.action, "discard");
  assert.equal(resolved?.negativeIntegrity, true);
  assert.equal(resolved?.effects.integrity, -1);
  assert.equal(resolved?.integrity, -1);
  assert.equal(JSON.stringify(event), before);
  const actions: FailureAction[] = ["retry", "optimize", "replace-reagent", "accept-low-quality", "discard"];
  assert.deepEqual(event.choices.map((item) => item.action), actions);
});

test("replicateGroupId determines agreement while retaining all scientific result classes", () => {
  const observations: ScientificObservation[] = [
    { replicateGroupId: "g1", result: "significant" },
    { replicateGroupId: "g1", result: "significant" },
    { replicateGroupId: "g1", result: "trend" },
    { replicateGroupId: "g2", result: "opposite" },
    { replicateGroupId: "g2", result: "not-significant" },
    { replicateGroupId: "g3", result: "inconsistent" },
  ];
  const g1 = calculateReplicateConsistency(observations, "g1");
  assert.equal(g1.result, "significant");
  assert.equal(g1.consistency, 2 / 3);
  assert.equal(g1.consistent, false);
  const g2 = calculateReplicateConsistency(observations, "g2");
  assert.equal(g2.result, "inconsistent");
  assert.equal(g2.consistency, 0.5);
  const summary = summarizeScientificResults(observations);
  assert.deepEqual(Object.keys(summary).sort(), ["g1", "g2", "g3"]);
  assert.equal(summary.g3.result, "inconsistent");
});
