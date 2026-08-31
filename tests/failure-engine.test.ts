import assert from "node:assert/strict";
import test from "node:test";
import {
  beginFailureIncident,
  getReplicateConsistency,
  recordScientificObservation,
  resolveFailureIncident,
  type FailureStateCarrier,
} from "../app/game/experiments/failure-engine.ts";

const base = (): FailureStateCarrier => ({
  seed: 7,
  turn: 12,
  resources: { energy: 60, san: 50, trust: 40 },
  funding: { balance: 5000, totalSpent: 100 },
  integrity: 90,
  flags: [],
});

test("beginFailureIncident queues a bilingual, reasoned incident without mutation", () => {
  const before = base();
  const next = beginFailureIncident(before, "wb", ["WB"], () => 0);
  assert.equal(before.pendingIncidents, undefined);
  assert.equal(next.pendingIncidents?.length, 1);
  assert.equal(next.failureState?.incidents.length, 1);
  assert.equal(next.pendingIncidents?.[0].status, "pending");
  assert.ok(next.pendingIncidents?.[0].reason.zh);
  assert.ok(next.pendingIncidents?.[0].reason.en);
  assert.ok(next.pendingIncidents?.[0].techniqueTags.includes("WB"));
});

test("resolving an incident applies cost/resources and records a quality change", () => {
  const queued = beginFailureIncident(base(), "qpcr", ["qPCR"], () => 0);
  const incident = queued.pendingIncidents![0];
  const result = resolveFailureIncident(queued, incident.id, "accept-low-quality");
  assert.ok(result);
  assert.equal(result?.state.pendingIncidents?.length, 0);
  assert.equal(result?.state.resources?.energy, 62);
  assert.equal(result?.state.resources?.san, 49);
  assert.equal(result?.state.resources?.trust, 38);
  assert.equal(result?.state.failureState?.quality, 88);
  assert.equal(result?.state.failureState?.incidents[0].status, "resolved");
});

test("discard exposes negative integrity as an auditable paper-facing flag", () => {
  const queued = beginFailureIncident(base(), "cell-study", ["WB"], () => 0);
  const result = resolveFailureIncident(queued, queued.pendingIncidents![0].id, "discard");
  assert.ok(result);
  assert.equal(result?.negativeIntegrity, true);
  assert.equal(result?.state.failureState?.negativeIntegrity, true);
  assert.ok(result?.state.flags?.includes("negative-integrity"));
  assert.equal(result?.state.integrity, 89);
});

test("recordScientificObservation preserves all result classes and detects inconsistent replicates", () => {
  let state = base();
  for (const result of ["significant", "opposite", "trend"] as const) {
    state = recordScientificObservation(state, { replicateGroupId: "g1", result });
  }
  state = recordScientificObservation(state, "g2", "inconsistent");
  const summary = getReplicateConsistency(state, "g1");
  assert.equal(summary.result, "inconsistent");
  assert.equal(summary.consistency, 1 / 3);
  assert.equal(getReplicateConsistency(state, "g2").result, "inconsistent");
  assert.deepEqual(state.failureState?.observations.map((item) => item.result), ["significant", "opposite", "trend", "inconsistent"]);
});
