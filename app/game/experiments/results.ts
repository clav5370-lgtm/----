import type { ProjectRun } from "../types";
import { EXPERIMENT_CATALOG, getExperimentDefinition } from "./catalog";
import { availability, researchForProject } from "./rules";
import { createResearchState, deriveEvidenceChain, researchStateWithLegacyEvidence } from "../research/evidence";
import type { EvidenceItem, GameMessage, MechanismCandidate, ProjectResearchState } from "../research/types";

export type ResearchExperimentOutcome = {
  result?: "positive" | "negative" | "trend" | "contradictory" | "reversed";
  modelId?: string;
  modelName?: string;
  dose?: string;
  durationHours?: number;
  intervention?: string;
  phenotypeReversed?: boolean;
};

export type ResearchActionResult =
  | { ok: true; project: ProjectRun; state: ProjectRun; message: GameMessage; evidence: EvidenceItem | null }
  | { ok: false; error: string; message: GameMessage };

const clone = <T>(value: T): T => {
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)) as T; }
};

function ensureResearch(project: ProjectRun): ProjectResearchState {
  if (project.research) return clone(project.research);
  return project.evidence ? researchStateWithLegacyEvidence(project) : createResearchState("cell");
}

type ResearchResult = NonNullable<ResearchExperimentOutcome["result"]>;

/** A weak, negative, or contradictory readout must never be treated as a full result. */
function levelForResult(maxLevel: number, result: ResearchResult, rescueValid = false): number {
  if (maxLevel <= 0) return 0;
  if (result === "positive") return maxLevel;
  if (result === "trend") return Math.max(0, maxLevel - 1);
  if (result === "reversed") return rescueValid ? maxLevel : 0;
  return 0;
}

function nonEmpty(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function nextStage(research: ProjectResearchState, experimentId: string) {
  const stageByExperiment: Record<string, ProjectResearchState["activeStage"]> = {
    "cell-model-select": "model", "cell-dose-finding": "model", "cell-time-course": "model", "cell-model-establishment": "model",
    "cell-viability": "phenotype", "cell-gene-expression": "molecular", "cell-protein-expression": "molecular", "cell-pharmacology-rescue": "causal",
  };
  research.activeStage = stageByExperiment[experimentId] ?? research.activeStage;
}

function messageFor(experimentId: string, title: string, body: string, nextExperimentIds: string[] = []): GameMessage {
  return { id: `research-${experimentId}`, tone: "success", title, body, nextExperimentIds };
}

export function completeResearchExperiment(project: ProjectRun, experimentId: string, outcome: ResearchExperimentOutcome = {}): ResearchActionResult {
  const gate = availability(project, experimentId);
  if (!gate.available || !gate.experiment) return { ok: false, error: gate.reason ?? "实验尚未解锁。", message: { id: `blocked-${experimentId}`, tone: "warning", title: "实验尚未解锁", body: gate.reason ?? "请先完成前置条件。" } };
  const experiment = gate.experiment;
  const next = clone(project);
  const research = ensureResearch(project);
  next.research = research;
  if (!Array.isArray(research.completedExperimentIds)) research.completedExperimentIds = [];
  if (!Array.isArray(research.cellModels)) research.cellModels = [];
  if (!Array.isArray(research.evidenceItems)) research.evidenceItems = [];
  if (!Array.isArray(research.mechanismCandidates)) research.mechanismCandidates = [];
  nextStage(research, experimentId);

  let evidence: EvidenceItem | null = null;
  const modelId = outcome.modelId ?? research.selectedModelId ?? undefined;
  if (experimentId === "cell-model-select") {
    const id = nonEmpty(outcome.modelId) ?? "cell-default";
    const existing = research.cellModels.find((model) => model.id === id);
    research.cellModels.forEach((model) => { model.selected = model.id === id; });
    if (existing) existing.selected = true;
    else research.cellModels.push({ id, name: outcome.modelName ?? id, selected: true, established: false });
    research.selectedModelId = id;
  } else if (experimentId === "cell-dose-finding") {
    const model = research.cellModels.find((entry) => entry.id === research.selectedModelId);
    if (!model) return { ok: false, error: "请先选择细胞模型。", message: { id: `blocked-${experimentId}`, tone: "warning", title: "模型尚未选择", body: "剂量摸索需要一个已选中的细胞模型。" } };
    model.dose = nonEmpty(outcome.dose) ?? "中剂量";
  } else if (experimentId === "cell-time-course") {
    const model = research.cellModels.find((entry) => entry.id === research.selectedModelId);
    if (!model) return { ok: false, error: "请先选择细胞模型。", message: { id: `blocked-${experimentId}`, tone: "warning", title: "模型尚未选择", body: "时间摸索需要一个已选中的细胞模型。" } };
    model.durationHours = typeof outcome.durationHours === "number" && Number.isFinite(outcome.durationHours) && outcome.durationHours > 0 ? Math.round(outcome.durationHours) : 24;
  } else if (experimentId === "cell-model-establishment") {
    const model = research.cellModels.find((entry) => entry.id === research.selectedModelId);
    if (!model || !model.dose || !model.durationHours || model.durationHours <= 0) return { ok: false, error: "剂量和时间条件尚未完整。", message: { id: `blocked-${experimentId}`, tone: "warning", title: "模型条件不完整", body: "请先完成剂量和时间摸索，再建立正式细胞模型。" } };
    model.established = true;
  } else {
    const rule = experiment.resultRule;
    const isRescue = experimentId === "cell-pharmacology-rescue";
    const candidate = research.mechanismCandidates[0];
    const result = outcome.result ?? (isRescue && outcome.phenotypeReversed ? "reversed" : "positive");
    const explicitIntervention = nonEmpty(outcome.intervention);
    const rescueValid = Boolean(isRescue && candidate && explicitIntervention && outcome.phenotypeReversed === true && result === "reversed");
    evidence = {
      id: `evidence-${next.runId}-${experimentId}-${research.evidenceItems.length + 1}`,
      experimentId, evidenceClass: rule.evidenceClass, role: rule.role, dimension: rule.dimension,
      level: isRescue ? (rescueValid ? rule.maxLevel : 0) : levelForResult(rule.maxLevel, result),
      summary: rule.positiveSummary, canTell: rule.canTell, cannotTell: rule.cannotTell, result, modelId,
      mechanismCandidateId: isRescue && rescueValid ? candidate?.id : undefined,
      intervention: isRescue ? explicitIntervention : undefined,
      phenotypeReversed: isRescue ? outcome.phenotypeReversed === true : undefined,
    };
    research.evidenceItems.push(evidence);
    if (experimentId === "cell-protein-expression" && evidence.level > 0 && research.mechanismCandidates.length === 0) {
      const mechanism: MechanismCandidate = { id: `mechanism-${next.runId}-1`, label: "候选信号通路", pathway: "候选机制", sourceExperimentIds: ["cell-gene-expression", experimentId], confidence: "medium", interventionTested: false, rescueObserved: false };
      research.mechanismCandidates.push(mechanism);
    }
    if (isRescue && candidate && explicitIntervention) { candidate.interventionTested = true; candidate.rescueObserved = rescueValid; }
  }
  if (!research.completedExperimentIds.includes(experimentId)) research.completedExperimentIds.push(experimentId);
  research.evidenceChain = deriveEvidenceChain(research);
  return { ok: true, project: next, state: next, evidence, message: messageFor(experimentId, experiment.name, evidence?.summary ?? "实验条件已记录。", experiment.recommendedNext) };
}

export const recordResearchExperiment = completeResearchExperiment;
export const completeExperiment = completeResearchExperiment;

export type ResearchRecommendation = { id: string; name: string; reason: string };
export function recommendations(project: ProjectRun): ResearchRecommendation[] {
  const research = researchForProject(project);
  const completed = new Set(research.completedExperimentIds);
  const configuredNext = [...completed].reverse().flatMap((id) => getExperimentDefinition(id)?.recommendedNext ?? []);
  const order = [...new Set([...configuredNext, ...EXPERIMENT_CATALOG.map((item) => item.id)])];
  return order.flatMap((id) => {
    const result = availability(project, id);
    if (!result.available || !result.experiment || completed.has(id)) return [];
    return [{ id, name: result.experiment.name, reason: result.experiment.purpose }];
  }).slice(0, 3);
}
export const recommendResearchNextSteps = recommendations;

export function recordOmicsDataset(project: ProjectRun, dataset: ProjectResearchState["omicsDatasets"][number]): ProjectRun {
  const next = clone(project); const research = ensureResearch(project);
  next.research = research;
  if (!Array.isArray(research.omicsDatasets)) research.omicsDatasets = [];
  if (!Array.isArray(research.evidenceItems)) research.evidenceItems = [];
  const normalized = { ...clone(dataset), contributesToMechanism: dataset.status === "raw" ? false as const : "association" as const };
  const existingIndex = research.omicsDatasets.findIndex((item) => item.id === normalized.id);
  if (existingIndex >= 0) research.omicsDatasets.splice(existingIndex, 1, normalized);
  else research.omicsDatasets.push(normalized);
  const omicsEvidenceId = `omics-${normalized.id}`;
  research.evidenceItems = research.evidenceItems.filter((item) => item.id !== omicsEvidenceId);
  if (normalized.status !== "raw") {
    research.evidenceItems.push({
      id: omicsEvidenceId,
      experimentId: `omics-${normalized.id}`,
      evidenceClass: "association",
      role: "mechanism",
      dimension: "mechanism",
      level: normalized.status === "candidate-pathways" ? 2 : 1,
      summary: normalized.status === "candidate-pathways" ? "组学分析提出了候选通路。" : "组学数据完成分析，提示候选分子关联。",
      canTell: "支持候选通路与表型之间的关联。",
      cannotTell: "组学关联不能单独证明机制或因果关系。",
      result: "positive",
    });
  }
  research.evidenceChain = deriveEvidenceChain(research);
  return next;
}
