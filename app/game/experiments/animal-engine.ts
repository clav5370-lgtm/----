/**
 * Project-level animal route engine.
 *
 * `animal.ts` contains the catalogue and the small study model.  This module
 * is the immutable adapter that stores those studies in a ProjectRun and
 * turns assay results into conservative research evidence.
 */
import type { ProjectRun } from "../types";
import { createResearchState, deriveEvidenceChain } from "../research/evidence";
import type { EvidenceItem, GameMessage, MechanismCandidate, ProjectResearchState } from "../research/types";
import {
  advanceAnimalStudy,
  animalEvidenceForResult,
  collectAnimalSamples,
  consumeSample,
  createAnimalStudy,
  getAnimalExperimentDefinition,
  type AnimalExperimentDefinition,
  type AnimalLifecycle,
  type AnimalSampleInput,
  type AnimalStudy,
  type AnimalStudyDesign,
} from "./animal";

type AnimalResultKind = "positive" | "negative" | "trend" | "contradictory" | "reversed" | "raw";

export type AnimalAssayResult = AnimalResultKind | {
  result?: AnimalResultKind;
  outcome?: AnimalResultKind;
  status?: "raw" | "analyzed" | "candidate-pathways";
  raw?: boolean;
  sampleId?: string;
  /** Accepted aliases keep the API convenient for form payloads. */
  sampleAmount?: number;
  amount?: number;
  sample?: { id: string; amount?: number };
  intervention?: string;
  phenotypeReversed?: boolean;
  mechanismCandidateId?: string;
};

export type AnimalStudyInput = AnimalStudyDesign | {
  design?: AnimalStudyDesign;
  sampleInventory?: AnimalSampleInput[];
  purpose?: AnimalStudyDesign["purpose"];
  [key: string]: unknown;
};

export type AnimalAvailability = {
  available: boolean;
  experiment: AnimalExperimentDefinition | null;
  reason?: string;
  study?: AnimalStudy;
};

export type AnimalEngineFailure = {
  ok: false;
  error: string;
  message: GameMessage;
  project: ProjectRun;
  state: ProjectRun;
};

export type AnimalEngineSuccess = {
  ok: true;
  project: ProjectRun;
  state: ProjectRun;
  message: GameMessage;
  study: AnimalStudy;
  evidence?: EvidenceItem | null;
};

export type AnimalEngineResult = AnimalEngineSuccess | AnimalEngineFailure;

const clone = <T>(value: T): T => {
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)) as T; }
};

const zhEn = (id: string, tone: GameMessage["tone"], zhTitle: string, zhBody: string, enTitle: string, enBody: string, nextExperimentIds: string[] = []): GameMessage => ({
  id, tone, title: zhTitle, body: zhBody, nextExperimentIds,
  copy: { zh: { title: zhTitle, body: zhBody }, en: { title: enTitle, body: enBody } },
});

const failureMessage = (id: string, zh: string, en: string): GameMessage => zhEn(id, "warning", "动物实验暂不可执行", zh, "Animal experiment unavailable", en);

const successMessage = (id: string, zhTitle: string, zhBody: string, enTitle: string, enBody: string, next: string[] = []): GameMessage => zhEn(id, "success", zhTitle, zhBody, enTitle, enBody, next);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function finitePositive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function projectHasAnimalRoute(project: ProjectRun): boolean {
  if (project.research) return (project.research.enabledRoutes ?? [project.research.route]).includes("animal");
  // Older projects used free-form route labels.  Only an explicit cell route
  // is rejected; no-research legacy projects can be safely initialized here.
  return project.route !== "cell";
}

function readResearch(project: ProjectRun): ProjectResearchState {
  const base = project.research ? clone(project.research) : createResearchState("animal");
  if (!Array.isArray(base.animalStudies)) base.animalStudies = [];
  if (!Array.isArray(base.animalCompletedExperimentIds)) base.animalCompletedExperimentIds = [];
  if (typeof base.activeAnimalStudyId !== "string") base.activeAnimalStudyId = null;
  if (!Array.isArray(base.evidenceItems)) base.evidenceItems = [];
  if (!Array.isArray(base.completedExperimentIds)) base.completedExperimentIds = [];
  if (!Array.isArray(base.enabledRoutes) || base.enabledRoutes.length === 0) base.enabledRoutes = [base.route];
  return base;
}

function ensureAnimalProject(project: ProjectRun): { next: ProjectRun; research: ProjectResearchState } {
  const next = clone(project);
  const research = readResearch(project);
  // A project can collect cell and animal evidence in either order.  Legacy
  // single-route saves are upgraded additively when the animal route is first used.
  if (!(research.enabledRoutes ?? []).includes("animal")) research.enabledRoutes = [...(research.enabledRoutes ?? [research.route]), "animal"];
  next.research = research;
  return { next, research };
}

function findStudy(research: ProjectResearchState, studyId: string): AnimalStudy | undefined {
  return (research.animalStudies ?? []).find((study) => study.id === studyId);
}

function activeStudy(research: ProjectResearchState): AnimalStudy | undefined {
  return research.activeAnimalStudyId ? findStudy(research, research.activeAnimalStudyId) : undefined;
}

function normalizedResult(input: AnimalAssayResult): { kind: AnimalResultKind; status?: "raw" | "analyzed" | "candidate-pathways"; raw: boolean; sampleId?: string; amount?: number; intervention?: string; phenotypeReversed: boolean; mechanismCandidateId?: string } {
  if (typeof input === "string") return { kind: input, raw: input === "raw", phenotypeReversed: false };
  const status = input.status;
  const kind = input.result ?? input.outcome ?? (input.raw || status === "raw" ? "raw" : "positive");
  return {
    kind, status, raw: Boolean(input.raw || status === "raw" || kind === "raw"),
    sampleId: typeof input.sampleId === "string" ? input.sampleId : typeof input.sample?.id === "string" ? input.sample.id : undefined,
    amount: finitePositive(input.sampleAmount) ?? finitePositive(input.amount) ?? finitePositive(input.sample?.amount),
    intervention: typeof input.intervention === "string" && input.intervention.trim() ? input.intervention.trim() : undefined,
    phenotypeReversed: input.phenotypeReversed === true,
    mechanismCandidateId: typeof input.mechanismCandidateId === "string" ? input.mechanismCandidateId : undefined,
  };
}

function stageMatches(study: AnimalStudy, definition: AnimalExperimentDefinition): boolean {
  switch (definition.stage) {
    case "animal-design": return study.lifecycle === "design";
    case "animal-dosing": return study.lifecycle === "adaptation" || study.lifecycle === "dosing";
    case "animal-phenotype": return study.lifecycle === "monitoring";
    case "animal-sampling": return study.lifecycle === "sampling" || study.lifecycle === "completed";
    case "animal-histology":
    case "animal-molecular":
    case "animal-omics":
    case "animal-causal": return study.lifecycle === "sampling" || study.lifecycle === "completed";
  }
}

function priorCausalStudyExists(research: ProjectResearchState, currentId: string): boolean {
  return (research.animalStudies ?? []).some((study) => study.id !== currentId && study.design.purpose === "descriptive" && study.completedExperimentIds.includes("animal-single-cell"));
}

function availabilityFromResearch(research: ProjectResearchState, experimentId: string): AnimalAvailability {
  const definition = getAnimalExperimentDefinition(experimentId);
  if (!definition) return { available: false, experiment: null, reason: "未知动物实验。" };
  if (!(research.enabledRoutes ?? [research.route]).includes("animal")) return { available: false, experiment: definition, reason: "当前项目不是动物研究路线。" };
  const study = activeStudy(research);
  if (!study) return { available: false, experiment: definition, reason: "请先开始一个动物研究方案。" };
  if (study.completedExperimentIds.includes(definition.id)) return { available: false, experiment: definition, study, reason: "该动物实验已经完成。" };
  if (!stageMatches(study, definition)) return { available: false, experiment: definition, study, reason: "动物实验必须按设计、适应/给药、监测、取材顺序推进。" };
  if (definition.purpose === "causal" && study.design.purpose !== "causal") return { available: false, experiment: definition, study, reason: "Rescue 必须在新建的 purpose=causal 动物方案中完成，不能升级描述性方案。" };
  if (definition.requiresNewCausalStudy && !priorCausalStudyExists(research, study.id)) return { available: false, experiment: definition, study, reason: "请先在描述性动物方案中完成候选机制检测，再新建因果 Rescue 方案。" };
  const missingPrerequisites = definition.prerequisiteIds.filter((id) => !study.completedExperimentIds.includes(id) && !(definition.requiresNewCausalStudy && id === "animal-single-cell" && priorCausalStudyExists(research, study.id)));
  if (missingPrerequisites.length) return { available: false, experiment: definition, study, reason: `请先完成前置动物实验：${missingPrerequisites.join("、")}。` };
  if (definition.stage !== "animal-design" && !study.completedExperimentIds.includes("animal-grouping")) return { available: false, experiment: definition, study, reason: "必须先完成动物设计与分组，才能进入给药或后续实验。" };
  if (["animal-histology", "animal-molecular", "animal-omics", "animal-causal"].includes(definition.stage) && !study.completedExperimentIds.includes("animal-sampling")) return { available: false, experiment: definition, study, reason: "未完成取材，不能开展组织、分子或组学实验。" };
  return { available: true, experiment: definition, study };
}

/** Return availability without mutating a project or initializing a save. */
export function animalAvailability(project: ProjectRun, experimentId: string): AnimalAvailability {
  if (!projectHasAnimalRoute(project)) return { available: false, experiment: getAnimalExperimentDefinition(experimentId) ?? null, reason: "当前项目不是动物研究路线。" };
  return availabilityFromResearch(readResearch(project), experimentId);
}

function resultFailure(project: ProjectRun, id: string, zh: string, en: string): AnimalEngineFailure {
  return { ok: false, error: zh, message: failureMessage(id, zh, en), project: clone(project), state: clone(project) };
}

function resultSuccess(next: ProjectRun, study: AnimalStudy, message: GameMessage, evidence?: EvidenceItem | null): AnimalEngineSuccess {
  return { ok: true, project: next, state: next, study, message, evidence };
}

function asDesign(id: string, input: AnimalStudyInput): AnimalStudyDesign | undefined {
  const objectInput = isRecord(input) ? input as { design?: unknown } : undefined;
  const candidate: unknown = objectInput && isRecord(objectInput.design) ? objectInput.design : input;
  if (!isRecord(candidate) || typeof candidate.species !== "string" || !Array.isArray(candidate.groups) || typeof candidate.animalCount !== "number" || typeof candidate.intervention !== "string") return undefined;
  const purpose = candidate.purpose === "causal" ? "causal" : "descriptive";
  return clone({ ...candidate, id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : id, purpose }) as AnimalStudyDesign;
}

/** Start a new study in design phase. A causal Rescue always gets a new ID. */
export function startAnimalExperiment(project: ProjectRun, id: string, input: AnimalStudyInput): AnimalEngineResult {
  const { next, research } = ensureAnimalProject(project);
  if (!(research.enabledRoutes ?? [research.route]).includes("animal")) return resultFailure(project, `animal-start-${id}`, "当前项目不是动物研究路线。", "The project is not on the animal route.");
  const design = asDesign(id, input);
  if (!design) return resultFailure(project, `animal-start-${id}`, "动物研究方案不完整：请提供物种、分组、动物数和干预。", "Animal design requires species, groups, animal count and intervention.");
  let studyId = id;
  // When callers use an assay ID as the second argument, the design ID is the
  // natural study ID.  This also makes the API friendly to form submissions.
  if (getAnimalExperimentDefinition(id)) studyId = design.id;
  if (studyId !== design.id) design.id = studyId;
  if ((research.animalStudies ?? []).some((study) => study.id === studyId)) return resultFailure(project, `animal-start-${studyId}`, "该动物研究方案 ID 已存在；Rescue 必须新建独立方案。", "That animal study ID already exists; Rescue requires an independent study.");
  const study = createAnimalStudy({ ...design, id: studyId }, []);
  research.animalStudies = [...(research.animalStudies ?? []), study];
  research.activeAnimalStudyId = study.id;
  research.activeStage = "design";
  next.research = research;
  return resultSuccess(next, study, successMessage(`animal-start-${study.id}`, "动物研究方案已建立", "请先完成动物选择与随机分组，再进入适应/给药。", "Animal study started", "Complete model selection and randomized grouping before acclimation and dosing.", ["animal-model-select", "animal-grouping"]), null);
}

function targetLifecycle(value: unknown): AnimalLifecycle | undefined {
  if (value === "animal-design") return "design";
  if (value === "animal-dosing") return "adaptation";
  if (value === "animal-phenotype") return "monitoring";
  if (value === "animal-sampling" || value === "animal-histology" || value === "animal-molecular" || value === "animal-omics" || value === "animal-causal") return "sampling";
  if (["design", "adaptation", "dosing", "monitoring", "sampling", "completed"].includes(String(value))) return value as AnimalLifecycle;
  return undefined;
}

function lifecycleGate(study: AnimalStudy, target: AnimalLifecycle): string | undefined {
  if (target === "adaptation" && !["animal-model-select", "animal-grouping"].every((id) => study.completedExperimentIds.includes(id))) return "必须先完成动物选择和随机分组，才能进入适应期。";
  if (target === "monitoring" && !["animal-administration", "animal-adaptation-monitoring"].every((id) => study.completedExperimentIds.includes(id))) return "必须完成给药和适应期监测，才能进入表型监测。";
  if (target === "sampling" && !["animal-body-weight", "animal-serum-biochemistry"].every((id) => study.completedExperimentIds.includes(id))) return "必须完成体重和血清生化等监测，才能取材。";
  if (target === "completed" && !study.completedExperimentIds.includes("animal-sampling")) return "必须完成取材后才能结束动物研究。";
  return undefined;
}

/** Advance a study by a named phase, or by days when passed a number. */
export function advanceAnimalExperiment(project: ProjectRun, studyId: string, phaseOrDays?: AnimalLifecycle | string | number | { phase?: AnimalLifecycle | string; days?: number }): AnimalEngineResult {
  const { next, research } = ensureAnimalProject(project);
  const existing = findStudy(research, studyId);
  if (!existing) return resultFailure(project, `animal-advance-${studyId}`, `找不到动物研究方案 ${studyId}。`, `Animal study ${studyId} was not found.`);
  let phase: AnimalLifecycle | undefined;
  let days = 0;
  if (typeof phaseOrDays === "number") days = Number.isFinite(phaseOrDays) ? Math.max(0, Math.floor(phaseOrDays)) : 0;
  else if (isRecord(phaseOrDays)) { phase = targetLifecycle(phaseOrDays.phase); days = finitePositive(phaseOrDays.days) ? Math.floor(phaseOrDays.days as number) : 0; }
  else phase = targetLifecycle(phaseOrDays);
  const currentIndex = ["design", "adaptation", "dosing", "monitoring", "sampling", "completed"].indexOf(existing.lifecycle);
  if (phase === undefined && typeof phaseOrDays !== "number") phase = ["design", "adaptation", "dosing", "monitoring", "sampling", "completed"][Math.min(currentIndex + 1, 5)] as AnimalLifecycle;
  if (typeof phaseOrDays === "number") {
    if (existing.lifecycle === "design") phase = "adaptation";
    else if (existing.lifecycle === "adaptation" && days >= (existing.design.adaptationDays ?? 0)) phase = "dosing";
    else phase = existing.lifecycle;
  }
  if (!phase) return resultFailure(project, `animal-advance-${studyId}`, "无效的动物实验阶段。", "Invalid animal experiment phase.");
  const lifecycleOrder: AnimalLifecycle[] = ["design", "adaptation", "dosing", "monitoring", "sampling", "completed"];
  const targetIndex = lifecycleOrder.indexOf(phase);
  if (targetIndex < currentIndex) return resultFailure(project, `animal-advance-${studyId}`, "动物实验阶段不能倒退。", "Animal phases cannot move backwards.");
  const gate = lifecycleGate(existing, phase);
  if (gate) return resultFailure(project, `animal-advance-${studyId}`, gate, "The preceding animal phase has not been completed.");
  let advanced = clone(existing);
  // A UI may submit the semantic phase (for example, “monitoring”) after the
  // dosing assays without separately submitting the internal dosing marker.
  // Walk the deterministic lifecycle one step at a time so the underlying
  // model still observes the canonical order.
  while (advanced.lifecycle !== phase) advanced = advanceAnimalStudy(advanced);
  if (days > 0) advanced.day += days;
  const studies = (research.animalStudies ?? []).map((study) => study.id === studyId ? advanced : study);
  research.animalStudies = studies;
  research.activeAnimalStudyId = studyId;
  research.activeStage = advanced.stage.replace("animal-", "") as ProjectResearchState["activeStage"];
  next.research = research;
  return resultSuccess(next, advanced, successMessage(`animal-advance-${studyId}-${advanced.lifecycle}`, "动物研究阶段已推进", `当前阶段：${advanced.lifecycle}；实验日：${advanced.day}。`, "Animal phase advanced", `Current phase: ${advanced.lifecycle}; study day ${advanced.day}.`), null);
}

/** Collect the inventory declared in the study design, once the sampling assay is due. */
export function collectAnimalSamplesForProject(project: ProjectRun, studyId: string, collected?: AnimalSampleInput | AnimalSampleInput[]): AnimalEngineResult {
  const { next, research } = ensureAnimalProject(project);
  const existing = findStudy(research, studyId);
  if (!existing) return resultFailure(project, `animal-collect-${studyId}`, `找不到动物研究方案 ${studyId}。`, `Animal study ${studyId} was not found.`);
  if (existing.lifecycle !== "sampling" && existing.lifecycle !== "completed") return resultFailure(project, `animal-collect-${studyId}`, "只有监测完成后才能取材。", "Samples can only be collected after monitoring.");
  if (!existing.completedExperimentIds.includes("animal-sampling")) {
    const missing = ["animal-body-weight", "animal-serum-biochemistry"].filter((id) => !existing.completedExperimentIds.includes(id));
    if (missing.length) return resultFailure(project, `animal-collect-${studyId}`, "取材前必须完成体重和血清生化监测。", "Body-weight and serum-biochemistry monitoring must precede sampling.");
  }
  const source = collected ?? existing.design.sampleInventory ?? [];
  if ((Array.isArray(source) ? source : [source]).length === 0) return resultFailure(project, `animal-collect-${studyId}`, "方案没有配置可收集的动物样本。", "The study has no sample inventory configured.");
  const collectedStudy = collectAnimalSamples(existing, source);
  collectedStudy.completedExperimentIds = [...new Set([...collectedStudy.completedExperimentIds, "animal-sampling"])] as string[];
  collectedStudy.stage = "animal-sampling";
  const updated = (research.animalStudies ?? []).map((study) => study.id === studyId ? collectedStudy : study);
  research.animalStudies = updated;
  research.activeAnimalStudyId = studyId;
  research.animalCompletedExperimentIds = [...new Set([...(research.animalCompletedExperimentIds ?? []), "animal-sampling"])] as string[];
  research.completedExperimentIds = [...new Set([...research.completedExperimentIds, "animal-sampling"])] as string[];
  research.activeStage = "sampling";
  research.evidenceChain = deriveEvidenceChain(research);
  next.research = research;
  return resultSuccess(next, collectedStudy, successMessage(`animal-collect-${studyId}`, "动物样本已入库", "样本已建立可追溯库存，可用于组织、分子和组学实验。", "Animal samples collected", "Traceable inventory is ready for tissue, molecular and omics assays."), null);
}

function assayNeedsSample(definition: AnimalExperimentDefinition): boolean {
  return ["animal-organ-weight", "animal-h-and-e", "animal-special-stain", "animal-ihc", "animal-if", "animal-rt-qpcr", "animal-wb", "animal-elisa", "animal-rna-seq", "animal-proteomics", "animal-metabolomics", "animal-microbiome", "animal-single-cell", "animal-rescue"].includes(definition.id);
}

function consumeAssaySample(study: AnimalStudy, input: ReturnType<typeof normalizedResult>, consumer: string): AnimalStudy | string {
  if (!input.sampleId && !study.samples.some((sample) => sample.available > 0 || sample.reserved > 0)) return "该组织/分子实验需要可用动物样本，但样本库存为空。";
  const requestedSampleId = input.sampleId;
  const candidate = requestedSampleId ? study.samples.find((sample) => sample.id === requestedSampleId) : study.samples.find((sample) => sample.available > 0 || sample.reserved > 0);
  if (!candidate) return `找不到样本 ${input.sampleId ?? ""}。`;
  const amount = input.amount ?? 1;
  const consumed = consumeSample(study, candidate.id, amount, consumer);
  if (consumed.lastError) return consumed.lastError;
  return consumed;
}

/** Run one assay, consume finite material when appropriate, and append bounded evidence. */
export function runAnimalAssay(project: ProjectRun, studyId: string, experimentId: string, result: AnimalAssayResult = "positive"): AnimalEngineResult {
  const { next, research } = ensureAnimalProject(project);
  if (!(research.enabledRoutes ?? [research.route]).includes("animal")) return resultFailure(project, `animal-assay-${experimentId}`, "当前项目不是动物研究路线。", "The project is not on the animal route.");
  const study = findStudy(research, studyId);
  if (!study) return resultFailure(project, `animal-assay-${experimentId}`, `找不到动物研究方案 ${studyId}。`, `Animal study ${studyId} was not found.`);
  research.activeAnimalStudyId = studyId;
  const gate = availabilityFromResearch(research, experimentId);
  if (!gate.available || !gate.experiment) return resultFailure(project, `animal-assay-${experimentId}`, gate.reason ?? "动物实验前置条件尚未满足。", "Animal assay prerequisites are not satisfied.");
  const definition = gate.experiment;
  const observed = normalizedResult(result);
  let working = clone(study);
  if (assayNeedsSample(definition)) {
    const consumed = consumeAssaySample(working, observed, `${studyId}:${definition.id}`);
    if (typeof consumed === "string") return resultFailure(project, `animal-assay-${definition.id}`, consumed, "Insufficient animal sample inventory for this assay.");
    working = consumed;
  }
  if (definition.id === "animal-sampling") working.completedExperimentIds = [...new Set([...working.completedExperimentIds, "animal-sampling"])] as string[];
  else working.completedExperimentIds = [...working.completedExperimentIds, definition.id];
  working.lastError = undefined;
  const evidenceKind = observed.raw || observed.kind === "raw" ? "raw" : observed.kind === "contradictory" || observed.kind === "reversed" ? "negative" : observed.kind;
  const evidenceSpec = animalEvidenceForResult(definition.id, evidenceKind);
  let evidence: EvidenceItem | null = null;
  if (evidenceSpec) {
    const rescueValid = definition.id === "animal-rescue" && observed.kind === "reversed" && Boolean(observed.intervention) && observed.phenotypeReversed;
    let level = evidenceSpec.maxLevel;
    if (definition.id === "animal-rescue" && !rescueValid) level = 0;
    // Omics raw data are never mechanism evidence. Analyzed omics remain
    // association-only, even when their dimension is displayed as mechanism.
    if (definition.stage === "animal-omics") {
      if (observed.raw || observed.status === "raw") level = 0;
      else level = Math.min(2, observed.status === "candidate-pathways" ? 2 : 1) as 0 | 1 | 2 | 3 | 4;
    }
    const evidenceResult = observed.raw ? undefined : (observed.kind === "raw" ? undefined : observed.kind);
    const candidateId = definition.id === "animal-rescue" && rescueValid ? (observed.mechanismCandidateId ?? research.mechanismCandidates[0]?.id ?? `animal-mechanism-${project.runId}-${research.mechanismCandidates.length + 1}`) : undefined;
    if (definition.id === "animal-rescue" && rescueValid && !research.mechanismCandidates.some((candidate) => candidate.id === candidateId)) {
      const candidate: MechanismCandidate = { id: candidateId as string, label: observed.intervention ?? "动物候选靶点", sourceExperimentIds: ["animal-single-cell", "animal-rescue"], confidence: "low", interventionTested: true, rescueObserved: true };
      research.mechanismCandidates = [...research.mechanismCandidates, candidate];
    }
    evidence = {
      id: `animal-evidence-${project.runId}-${studyId}-${definition.id}-${working.completedExperimentIds.length}`,
      experimentId: definition.id,
      evidenceClass: definition.evidence.evidenceClass === "causal" && rescueValid ? "causal" : definition.evidence.evidenceClass,
      role: definition.stage === "animal-omics" ? "omics" : definition.evidence.dimension === "causality" ? "causality" : definition.evidence.dimension === "mechanism" ? "mechanism" : definition.evidence.dimension === "phenotype" ? "phenotype" : "animal",
      dimension: definition.evidence.dimension,
      level: Math.max(0, Math.min(4, level)),
      summary: `${definition.copy.zh.commonName}：${evidenceResult === "positive" ? "观察到阳性结果" : evidenceResult === "trend" ? "观察到趋势" : evidenceResult === "reversed" ? "观察到表型逆转" : evidenceResult === "negative" ? "未观察到预期变化" : "已记录原始数据"}。`,
      canTell: definition.evidence.canSupportMechanism && rescueValid ? "支持候选机制的因果关联。" : definition.stage === "animal-omics" ? "支持候选通路或分子关联。" : "支持动物表型或分子关联。",
      cannotTell: definition.stage === "animal-omics" ? "组学原始数据和分析关联不能单独证明机制或因果关系。" : "单项动物实验不能独立证明完整机制。",
      result: evidenceResult,
      mechanismCandidateId: candidateId,
      intervention: definition.id === "animal-rescue" ? observed.intervention : undefined,
      phenotypeReversed: definition.id === "animal-rescue" ? observed.phenotypeReversed : undefined,
    };
    research.evidenceItems = [...research.evidenceItems, evidence];
  }
  research.animalStudies = (research.animalStudies ?? []).map((entry) => entry.id === studyId ? working : entry);
  research.animalCompletedExperimentIds = [...new Set([...(research.animalCompletedExperimentIds ?? []), definition.id])];
  research.completedExperimentIds = [...new Set([...research.completedExperimentIds, definition.id])];
  research.activeStage = definition.stage.replace("animal-", "") as ProjectResearchState["activeStage"];
  research.evidenceChain = deriveEvidenceChain(research);
  next.research = research;
  return resultSuccess(next, working, successMessage(`animal-assay-${studyId}-${definition.id}`, `${definition.copy.zh.commonName}已完成`, evidence?.summary ?? "实验条件已记录。", `${definition.copy.en.commonName} completed`, evidence?.summary ?? "The assay conditions were recorded.", definition.recommendedNext), evidence);
}

export const runAnimalExperiment = runAnimalAssay;
