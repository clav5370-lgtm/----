import {
  calculateReplicateConsistency,
  pickWeightedFailure,
  resolveFailureChoice,
  summarizeScientificResults,
  type FailureAction,
  type FailureEffects,
  type FailureEvent,
  type FailureRng,
  type ReplicateConsistency,
  type ScientificObservation,
  type ScientificResult,
} from "./failures";

/**
 * The additive part of a save used by the failure/replication subsystem.
 * `quality`, `slots`, and `cost` are ledgers for this subsystem; the normal
 * game resources are also updated when they are present on the carrier.
 */
export type ExperimentFailureState = {
  version: 1;
  incidents: IncidentRecord[];
  observations: ScientificObservation[];
  replicateConsistency: Record<string, ReplicateConsistency>;
  quality: number;
  slots: number;
  cost: number;
  energy: number;
  san: number;
  trust: number;
  integrity: number;
  negativeIntegrity: boolean;
};

export type IncidentStatus = "pending" | "resolved";

/** A self-contained snapshot: old event text remains available in a save. */
export type IncidentRecord = {
  id: string;
  experimentId: string;
  eventId: string;
  category: FailureEvent["category"];
  title: FailureEvent["title"];
  reason: FailureEvent["reason"];
  techniqueTags: readonly string[];
  tags: readonly string[];
  event: FailureEvent;
  status: IncidentStatus;
  createdTurn?: number;
  resolvedTurn?: number;
  choiceId?: string;
  action?: FailureAction;
  effects?: FailureEffects;
  negativeIntegrity?: boolean;
};

/** Minimal structural contract keeps the helpers useful for V7 and fixtures. */
export type FailureStateCarrier = {
  failureState?: ExperimentFailureState;
  pendingIncidents?: IncidentRecord[];
  turn?: number;
  seed?: number;
  resources?: { energy: number; san: number; trust: number };
  funding?: { balance: number; totalSpent: number };
  integrity?: number;
  negativeIntegrity?: boolean;
  flags?: string[];
};

export type FailureResolutionResult<T extends FailureStateCarrier = FailureStateCarrier> = {
  ok: true;
  state: T;
  incident: IncidentRecord;
  resolution: ReturnType<typeof resolveFailureChoice> & {};
  effects: FailureEffects;
  negativeIntegrity: boolean;
};

export type ScientificObservationInput = ScientificObservation & {
  incidentId?: string;
};

const emptyFailureState = (): ExperimentFailureState => ({
  version: 1,
  incidents: [],
  observations: [],
  replicateConsistency: {},
  quality: 100,
  slots: 0,
  cost: 0,
  energy: 0,
  san: 0,
  trust: 0,
  integrity: 0,
  negativeIntegrity: false,
});

const cloneEffects = (effects: FailureEffects): FailureEffects => ({ ...effects });
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function failureStateOf(state: FailureStateCarrier): ExperimentFailureState {
  const existing = state.failureState;
  if (!existing) return emptyFailureState();
  return {
    ...emptyFailureState(),
    ...existing,
    incidents: [...(existing.incidents ?? [])],
    observations: [...(existing.observations ?? [])],
    replicateConsistency: { ...(existing.replicateConsistency ?? {}) },
  };
}

function pendingOf(state: FailureStateCarrier): IncidentRecord[] {
  if (state.pendingIncidents) return [...state.pendingIncidents];
  return failureStateOf(state).incidents.filter((incident) => incident.status === "pending");
}

function incidentIdFor(state: FailureStateCarrier, experimentId: string): string {
  const count = failureStateOf(state).incidents.length + pendingOf(state).length + 1;
  const seed = typeof state.seed === "number" ? `-${state.seed.toString(36)}` : "";
  return `failure-${experimentId}${seed}-${count.toString(36)}`;
}

/** Select and enqueue one incident without mutating the input state or event catalog. */
export function beginFailureIncident<T extends FailureStateCarrier>(
  state: T,
  experimentId: string,
  tags: readonly string[] = [],
  rng: FailureRng = Math.random,
): T {
  const event = pickWeightedFailure(tags, rng);
  if (!event) return state;
  const incident: IncidentRecord = {
    id: incidentIdFor(state, experimentId),
    experimentId,
    eventId: event.id,
    category: event.category,
    title: { ...event.title },
    reason: { ...event.reason },
    techniqueTags: [...event.techniqueTags],
    tags: [...event.tags],
    event,
    status: "pending",
    ...(typeof state.turn === "number" ? { createdTurn: state.turn } : {}),
  };
  const failureState = failureStateOf(state);
  failureState.incidents.push(incident);
  return {
    ...state,
    failureState,
    pendingIncidents: [...pendingOf(state), incident],
  };
}

/**
 * Apply an explicit recovery/disclosure choice. Invalid IDs are rejected with
 * `undefined`; valid resolutions return a new carrier and retain the incident
 * in history for auditability.
 */
export function resolveFailureIncident<T extends FailureStateCarrier>(
  state: T,
  incidentId: string,
  choiceId: string | FailureAction,
): FailureResolutionResult<T> | undefined {
  const pending = pendingOf(state);
  const incident = pending.find((item) => item.id === incidentId);
  if (!incident) return undefined;
  const resolution = resolveFailureChoice(incident.event, choiceId);
  if (!resolution) return undefined;
  const effects = cloneEffects(resolution.effects);
  const negativeIntegrity = resolution.negativeIntegrity || effects.integrity < 0;
  const resolvedIncident: IncidentRecord = {
    ...incident,
    status: "resolved",
    resolvedTurn: typeof state.turn === "number" ? state.turn : undefined,
    choiceId: resolution.choiceId,
    action: resolution.action,
    effects,
    negativeIntegrity,
  };
  const failureState = failureStateOf(state);
  failureState.incidents = failureState.incidents.map((item) => item.id === incidentId ? resolvedIncident : item);
  failureState.quality = clamp(failureState.quality + effects.quality);
  failureState.slots += effects.slots;
  failureState.cost += effects.cost;
  failureState.energy += effects.energy;
  failureState.san += effects.san;
  failureState.trust += effects.trust;
  failureState.integrity += effects.integrity;
  failureState.negativeIntegrity ||= negativeIntegrity;

  const nextResources = state.resources
    ? {
        energy: clamp(state.resources.energy + effects.energy),
        san: clamp(state.resources.san + effects.san),
        trust: clamp(state.resources.trust + effects.trust),
      }
    : state.resources;
  const nextFunding = state.funding
    ? { ...state.funding, balance: state.funding.balance - effects.cost, totalSpent: state.funding.totalSpent + effects.cost }
    : state.funding;
  const nextFlags = negativeIntegrity && state.flags
    ? [...new Set([...state.flags, "negative-integrity"])]
    : state.flags;
  const nextIntegrity = typeof state.integrity === "number" ? clamp(state.integrity + effects.integrity) : state.integrity;
  const nextState = {
    ...state,
    failureState,
    pendingIncidents: pending.filter((item) => item.id !== incidentId),
    resources: nextResources,
    funding: nextFunding,
    integrity: nextIntegrity,
    negativeIntegrity: state.negativeIntegrity || negativeIntegrity,
    flags: nextFlags,
  } as T;
  return { ok: true, state: nextState, incident: resolvedIncident, resolution, effects, negativeIntegrity };
}

/** Record one result class; no option exists here to edit or overwrite data. */
export function recordScientificObservation<T extends FailureStateCarrier>(
  state: T,
  observation: ScientificObservationInput,
): T;
export function recordScientificObservation<T extends FailureStateCarrier>(
  state: T,
  replicateGroupId: string,
  result: ScientificResult,
  extra?: Omit<ScientificObservationInput, "replicateGroupId" | "result">,
): T;
export function recordScientificObservation<T extends FailureStateCarrier>(
  state: T,
  observationOrGroup: ScientificObservationInput | string,
  result?: ScientificResult,
  extra: Omit<ScientificObservationInput, "replicateGroupId" | "result"> = {},
): T {
  const observation: ScientificObservationInput = typeof observationOrGroup === "string"
    ? { replicateGroupId: observationOrGroup, result: result ?? "inconsistent", ...extra }
    : { ...observationOrGroup };
  const failureState = failureStateOf(state);
  failureState.observations.push(observation);
  failureState.replicateConsistency = summarizeScientificResults(failureState.observations);
  return { ...state, failureState };
}

/** State-aware consistency lookup; the pure catalog helper remains available too. */
export function getReplicateConsistency(state: FailureStateCarrier, replicateGroupId: string): ReplicateConsistency {
  return calculateReplicateConsistency(failureStateOf(state).observations, replicateGroupId);
}

export const replicateConsistency = getReplicateConsistency;

export {
  calculateReplicateConsistency,
  computeReplicateConsistency,
  evaluateScientificResults,
  summarizeReplicates,
  summarizeScientificResults,
} from "./failures";
