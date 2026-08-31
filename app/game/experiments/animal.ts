/**
 * Animal research data layer.
 *
 * This module intentionally does not depend on the experiment centre UI.  It is
 * a small, immutable domain model that can be consumed by either the game UI
 * or a future save/migration layer.
 */

export const ANIMAL_STAGES = [
  "animal-design",
  "animal-dosing",
  "animal-phenotype",
  "animal-sampling",
  "animal-histology",
  "animal-molecular",
  "animal-omics",
  "animal-causal",
] as const;

export type AnimalStageId = (typeof ANIMAL_STAGES)[number];
export type AnimalStudyPurpose = "descriptive" | "causal";
export type AnimalLifecycle = "design" | "adaptation" | "dosing" | "monitoring" | "sampling" | "completed";
export type AnimalSex = "male" | "female" | "mixed" | "unspecified";

export type AnimalCopy = {
  commonName: string;
  professionalName: string;
  description: string;
  prerequisite: string;
};

export type BilingualAnimalCopy = { zh: AnimalCopy; en: AnimalCopy };

export type AnimalGroupDesign = {
  id: string;
  name: string;
  treatment: string;
  animalCount: number;
  dose?: number;
  doseUnit?: string;
  route?: string;
  frequency?: string;
  control?: boolean;
};

export type AnimalMonitoringPlan = {
  measures: string[];
  frequency: string;
  humaneEndpoints: string[];
};

export type AnimalSampleInventory = {
  id: string;
  kind: "serum" | "plasma" | "blood" | "tissue" | "organ" | "feces" | "other";
  label: string;
  amount: number;
  unit: "µL" | "mg" | "sample" | "aliquot";
  quality: number;
  /** Amount currently free for reservation/consumption. */
  available: number;
  reserved: number;
  reservations: AnimalSampleReservation[];
  sourceAnimalIds: string[];
};

/** Convenient input shape; collection fills safe defaults for omitted metadata. */
export type AnimalSampleInput = {
  id: string;
  kind: AnimalSampleInventory["kind"];
  amount: number;
  label?: string;
  unit?: AnimalSampleInventory["unit"];
  quality?: number;
  available?: number;
  reserved?: number;
  reservations?: AnimalSampleReservation[];
  sourceAnimalIds?: string[];
};

export type AnimalSampleReservation = {
  id: string;
  amount: number;
  reservedBy: string;
};

export type AnimalStudyDesign = {
  id: string;
  name?: string;
  species: string;
  strain?: string;
  sex?: AnimalSex;
  ageWeeks?: number;
  animalCount: number;
  groups: AnimalGroupDesign[];
  intervention: string;
  purpose: AnimalStudyPurpose;
  adaptationDays?: number;
  monitoring?: AnimalMonitoringPlan;
  sampleInventory?: AnimalSampleInput[];
  notes?: string;
};

export type AnimalStudy = {
  id: string;
  design: AnimalStudyDesign;
  lifecycle: AnimalLifecycle;
  stage: AnimalStageId;
  day: number;
  samples: AnimalSampleInventory[];
  completedExperimentIds: string[];
  monitoringRecords: AnimalMonitoringRecord[];
  lastError?: string;
};

export type AnimalMonitoringRecord = {
  day: number;
  measure: string;
  value: number | string;
  unit?: string;
};

export type AnimalResultEvidence = {
  evidenceClass: "exploration" | "phenotype" | "association" | "causal";
  dimension: "animal" | "phenotype" | "molecular" | "mechanism" | "causality";
  /** Deliberately capped at four; no individual animal result is five-star. */
  maxLevel: 0 | 1 | 2 | 3 | 4;
  rawData?: boolean;
  canSupportMechanism: boolean;
};

export type AnimalExperimentDefinition = {
  id: string;
  stage: AnimalStageId;
  purpose: AnimalStudyPurpose;
  copy: BilingualAnimalCopy;
  prerequisiteIds: string[];
  evidence: AnimalResultEvidence;
  recommendedNext: string[];
  requiresNewCausalStudy?: boolean;
};

const copy = (
  zh: Omit<AnimalCopy, "professionalName"> & { professionalName: string },
  en: Omit<AnimalCopy, "professionalName"> & { professionalName: string },
): BilingualAnimalCopy => ({ zh, en });

const descriptiveEvidence = (
  dimension: AnimalResultEvidence["dimension"],
  maxLevel: number,
): AnimalResultEvidence => ({
  evidenceClass: dimension === "phenotype" || dimension === "animal" ? "phenotype" : "association",
  dimension,
  maxLevel: Math.max(0, Math.min(4, Math.round(maxLevel))) as 0 | 1 | 2 | 3 | 4,
  canSupportMechanism: dimension === "mechanism",
});

const assay = (
  id: string,
  stage: AnimalStageId,
  purpose: AnimalStudyPurpose,
  zh: Omit<AnimalCopy, "professionalName"> & { professionalName: string },
  en: Omit<AnimalCopy, "professionalName"> & { professionalName: string },
  prerequisiteIds: string[],
  evidence: AnimalResultEvidence,
  recommendedNext: string[] = [],
  requiresNewCausalStudy = false,
): AnimalExperimentDefinition => ({ id, stage, purpose, copy: copy(zh, en), prerequisiteIds, evidence, recommendedNext, requiresNewCausalStudy });

const dosingGate = ["animal-grouping"];
const monitoringGate = ["animal-adaptation-monitoring"];
const samplingGate = ["animal-sampling"];
const molecularGate = ["animal-sampling", "animal-organ-weight"];

/** The complete eight-stage animal route. */
export const ANIMAL_EXPERIMENTS: readonly AnimalExperimentDefinition[] = [
  assay("animal-model-select", "animal-design", "descriptive",
    { commonName: "选择实验动物", professionalName: "Animal model selection", description: "选择物种、品系、性别和年龄，使动物模型与研究问题匹配。", prerequisite: "无" },
    { commonName: "Select experimental animals", professionalName: "Animal model selection", description: "Select species, strain, sex and age that match the research question.", prerequisite: "None" },
    [], descriptiveEvidence("animal", 0), ["animal-grouping"]),
  assay("animal-grouping", "animal-design", "descriptive",
    { commonName: "动物分组与随机化", professionalName: "Randomized group allocation", description: "把动物随机分成对照、模型和处理组，并保留盲法记录。", prerequisite: "完成动物选择" },
    { commonName: "Animal grouping and randomization", professionalName: "Randomized group allocation", description: "Randomize animals into control, model and treatment groups with blinding records.", prerequisite: "Complete animal selection" },
    ["animal-model-select"], descriptiveEvidence("animal", 0), ["animal-dose-finding"]),
  assay("animal-dose-finding", "animal-dosing", "descriptive",
    { commonName: "动物剂量摸索", professionalName: "In vivo dose finding", description: "比较剂量梯度，寻找有效且可耐受的给药范围。", prerequisite: "完成动物分组" },
    { commonName: "Animal dose finding", professionalName: "In vivo dose finding", description: "Compare dose levels to identify an effective and tolerable range.", prerequisite: "Complete animal grouping" },
    dosingGate, descriptiveEvidence("animal", 1), ["animal-administration"]),
  assay("animal-administration", "animal-dosing", "descriptive",
    { commonName: "动物给药", professionalName: "In vivo administration", description: "按预设剂量、给药途径和频率实施给药，并记录实际暴露。", prerequisite: "完成剂量摸索" },
    { commonName: "Animal dosing and administration", professionalName: "In vivo administration", description: "Administer the planned dose, route and frequency while recording actual exposure.", prerequisite: "Complete dose finding" },
    ["animal-dose-finding"], descriptiveEvidence("animal", 1), ["animal-adaptation-monitoring"]),
  assay("animal-adaptation-monitoring", "animal-dosing", "descriptive",
    { commonName: "适应期与一般状态监测", professionalName: "Acclimation and welfare monitoring", description: "记录适应期、体征、摄食、活动和人道终点，确认动物可安全进入正式实验。", prerequisite: "完成给药方案" },
    { commonName: "Acclimation and routine monitoring", professionalName: "Acclimation and welfare monitoring", description: "Record acclimation, clinical signs, food intake, activity and humane endpoints.", prerequisite: "Complete the dosing plan" },
    ["animal-administration"], descriptiveEvidence("animal", 1), ["animal-body-weight", "animal-serum-biochemistry"]),
  assay("animal-body-weight", "animal-phenotype", "descriptive",
    { commonName: "体重与一般表型", professionalName: "Body-weight and clinical phenotype", description: "连续记录体重和一般状态，观察生长、疾病或毒性表型。", prerequisite: "完成适应期与监测" },
    { commonName: "Body weight and clinical phenotype", professionalName: "Body-weight and clinical phenotype", description: "Track body weight and general condition to observe growth, disease or toxicity phenotypes.", prerequisite: "Complete acclimation and monitoring" },
    monitoringGate, descriptiveEvidence("phenotype", 2), ["animal-serum-biochemistry"]),
  assay("animal-serum-biochemistry", "animal-phenotype", "descriptive",
    { commonName: "血清生化", professionalName: "Serum biochemical analysis", description: "检测肝肾功能、血糖、脂质等血清生化指标，描述全身表型。", prerequisite: "完成适应期与监测" },
    { commonName: "Serum biochemistry", professionalName: "Serum biochemical analysis", description: "Measure liver, kidney, glucose and lipid markers to describe systemic phenotypes.", prerequisite: "Complete acclimation and monitoring" },
    monitoringGate, descriptiveEvidence("phenotype", 2), ["animal-sampling"]),
  assay("animal-sampling", "animal-sampling", "descriptive",
    { commonName: "取血与组织取材", professionalName: "Blood and tissue sampling", description: "按随机化和预设时间点完成取血、处死和组织分装，建立可追溯样本库存。", prerequisite: "完成体重和血清生化" },
    { commonName: "Blood and tissue collection", professionalName: "Blood and tissue sampling", description: "Collect blood and tissues at predefined time points and create a traceable sample inventory.", prerequisite: "Complete body weight and serum biochemistry" },
    ["animal-body-weight", "animal-serum-biochemistry"], descriptiveEvidence("animal", 2), ["animal-organ-weight", "animal-h-and-e"]),
  assay("animal-organ-weight", "animal-sampling", "descriptive",
    { commonName: "器官重量", professionalName: "Organ-weight assessment", description: "称量主要器官并计算相对器官重量，辅助判断器官表型和毒性。", prerequisite: "完成取材" },
    { commonName: "Organ weights", professionalName: "Organ-weight assessment", description: "Measure major organs and relative organ weights to support organ phenotype and toxicity assessment.", prerequisite: "Complete tissue collection" },
    samplingGate, descriptiveEvidence("phenotype", 2), ["animal-h-and-e"]),
  assay("animal-h-and-e", "animal-histology", "descriptive",
    { commonName: "H&E 染色", professionalName: "Hematoxylin and eosin staining", description: "观察组织结构、炎症、坏死和纤维化等形态学变化。", prerequisite: "完成取材" },
    { commonName: "H&E staining", professionalName: "Hematoxylin and eosin staining", description: "Assess tissue architecture, inflammation, necrosis and fibrosis morphology.", prerequisite: "Complete tissue collection" },
    samplingGate, descriptiveEvidence("phenotype", 3), ["animal-special-stain", "animal-ihc"]),
  assay("animal-special-stain", "animal-histology", "descriptive",
    { commonName: "特殊染色", professionalName: "Special histochemical staining", description: "用 Masson、PAS、油红 O 等染色定位胶原、糖原或脂质等组织成分。", prerequisite: "完成 H&E" },
    { commonName: "Special stains", professionalName: "Special histochemical staining", description: "Use Masson, PAS, Oil Red O or related stains to localize tissue components.", prerequisite: "Complete H&E" },
    ["animal-h-and-e"], descriptiveEvidence("phenotype", 3), ["animal-ihc", "animal-if"]),
  assay("animal-ihc", "animal-histology", "descriptive",
    { commonName: "免疫组化", professionalName: "Immunohistochemistry (IHC)", description: "在组织空间位置检测目标蛋白及其阳性细胞分布。", prerequisite: "完成 H&E" },
    { commonName: "Immunohistochemistry", professionalName: "Immunohistochemistry (IHC)", description: "Detect target proteins and the distribution of positive cells in tissue context.", prerequisite: "Complete H&E" },
    ["animal-h-and-e"], descriptiveEvidence("mechanism", 3), ["animal-if", "animal-rt-qpcr"]),
  assay("animal-if", "animal-histology", "descriptive",
    { commonName: "免疫荧光", professionalName: "Immunofluorescence (IF)", description: "用荧光标记观察目标蛋白的空间定位和共定位关系。", prerequisite: "完成 H&E" },
    { commonName: "Immunofluorescence", professionalName: "Immunofluorescence (IF)", description: "Use fluorescent labels to examine target-protein localization and co-localization.", prerequisite: "Complete H&E" },
    ["animal-h-and-e"], descriptiveEvidence("mechanism", 3), ["animal-rt-qpcr", "animal-wb"]),
  assay("animal-rt-qpcr", "animal-molecular", "descriptive",
    { commonName: "实时定量 PCR", professionalName: "Reverse-transcription quantitative PCR (RT-qPCR)", description: "检测组织中目标基因 mRNA 的相对表达变化。", prerequisite: "完成取材和器官重量" },
    { commonName: "RT-qPCR", professionalName: "Reverse-transcription quantitative PCR", description: "Measure relative target-gene mRNA expression in tissue.", prerequisite: "Complete sampling and organ weights" },
    molecularGate, descriptiveEvidence("molecular", 3), ["animal-wb", "animal-elisa"]),
  assay("animal-wb", "animal-molecular", "descriptive",
    { commonName: "蛋白免疫印迹", professionalName: "Western blot (WB)", description: "检测组织匀浆中目标蛋白含量或磷酸化状态，提供通路关联证据。", prerequisite: "完成 RT-qPCR" },
    { commonName: "Western blot", professionalName: "Western blot (WB)", description: "Measure target-protein abundance or phosphorylation in tissue lysates as pathway-association evidence.", prerequisite: "Complete RT-qPCR" },
    ["animal-rt-qpcr"], descriptiveEvidence("mechanism", 3), ["animal-elisa"]),
  assay("animal-elisa", "animal-molecular", "descriptive",
    { commonName: "酶联免疫吸附实验", professionalName: "Enzyme-linked immunosorbent assay (ELISA)", description: "定量检测血清或组织中的细胞因子、激素或目标蛋白。", prerequisite: "完成取材" },
    { commonName: "ELISA", professionalName: "Enzyme-linked immunosorbent assay", description: "Quantify cytokines, hormones or target proteins in serum or tissue.", prerequisite: "Complete sampling" },
    samplingGate, descriptiveEvidence("molecular", 3), ["animal-rna-seq"]),
  assay("animal-rna-seq", "animal-omics", "descriptive",
    { commonName: "转录组测序", professionalName: "RNA sequencing (RNA-seq)", description: "比较全转录组表达，提出候选差异基因和通路。原始数据不直接等于机制。", prerequisite: "完成取材并预留 RNA 样本" },
    { commonName: "RNA sequencing", professionalName: "RNA sequencing (RNA-seq)", description: "Compare transcriptome-wide expression and nominate candidate genes and pathways; raw data are not mechanism.", prerequisite: "Complete sampling and reserve RNA samples" },
    samplingGate, { evidenceClass: "association", dimension: "mechanism", maxLevel: 2, rawData: true, canSupportMechanism: false }, ["animal-proteomics"]),
  assay("animal-proteomics", "animal-omics", "descriptive",
    { commonName: "蛋白组学", professionalName: "Quantitative proteomics", description: "系统比较蛋白丰度，寻找与表型相关的候选蛋白。", prerequisite: "完成取材并预留蛋白样本" },
    { commonName: "Proteomics", professionalName: "Quantitative proteomics", description: "Compare protein abundance to identify proteins associated with the phenotype.", prerequisite: "Complete sampling and reserve protein samples" },
    samplingGate, { evidenceClass: "association", dimension: "mechanism", maxLevel: 2, rawData: true, canSupportMechanism: false }, ["animal-metabolomics"]),
  assay("animal-metabolomics", "animal-omics", "descriptive",
    { commonName: "代谢组学", professionalName: "Metabolomics", description: "比较小分子代谢物谱，发现候选代谢通路和标志物。", prerequisite: "完成取材并预留代谢样本" },
    { commonName: "Metabolomics", professionalName: "Metabolomics", description: "Compare small-molecule profiles to nominate metabolic pathways and biomarkers.", prerequisite: "Complete sampling and reserve metabolite samples" },
    samplingGate, { evidenceClass: "association", dimension: "mechanism", maxLevel: 2, rawData: true, canSupportMechanism: false }, ["animal-microbiome"]),
  assay("animal-microbiome", "animal-omics", "descriptive",
    { commonName: "微生物组", professionalName: "Microbiome profiling", description: "分析粪便或肠内容物中的微生物组成及其与表型的关联。", prerequisite: "完成取材并预留微生物样本" },
    { commonName: "Microbiome profiling", professionalName: "Microbiome profiling", description: "Profile microbial composition and its association with the phenotype.", prerequisite: "Complete sampling and reserve microbiome samples" },
    samplingGate, { evidenceClass: "association", dimension: "mechanism", maxLevel: 2, rawData: true, canSupportMechanism: false }, ["animal-single-cell"]),
  assay("animal-single-cell", "animal-omics", "descriptive",
    { commonName: "单细胞测序", professionalName: "Single-cell RNA sequencing", description: "在细胞类型分辨率下比较表达状态，提出候选细胞群和通路。", prerequisite: "完成取材并保存单细胞样本" },
    { commonName: "Single-cell profiling", professionalName: "Single-cell RNA sequencing", description: "Compare expression states at cell-type resolution and nominate candidate populations and pathways.", prerequisite: "Complete sampling and preserve single-cell material" },
    samplingGate, { evidenceClass: "association", dimension: "mechanism", maxLevel: 2, rawData: true, canSupportMechanism: false }, ["animal-rescue"]),
  assay("animal-rescue", "animal-causal", "causal",
    { commonName: "动物 Rescue 救援实验", professionalName: "In vivo causal rescue", description: "在独立动物组中干预候选靶点，观察疾病或损伤表型是否被逆转。必须新建 purpose=causal 的动物方案。", prerequisite: "完成候选机制检测，并新建因果 Rescue 方案" },
    { commonName: "Animal rescue experiment", professionalName: "In vivo causal rescue", description: "Perturb the candidate target in an independent animal group and test whether the phenotype is reversed. A new causal-purpose study is required.", prerequisite: "Complete candidate-mechanism assays and create a new causal rescue design" },
    ["animal-single-cell"], { evidenceClass: "causal", dimension: "causality", maxLevel: 4, rawData: false, canSupportMechanism: true }, ["animal-rt-qpcr"], true),
] as const;

export const ANIMAL_EXPERIMENT_CATALOG = ANIMAL_EXPERIMENTS;
const ANIMAL_ID_ALIASES: Record<string, string> = {
  "animal-model-selection": "animal-model-select",
  "animal-dose": "animal-dose-finding",
  "animal-special-staining": "animal-special-stain",
  "animal-he": "animal-h-and-e",
  "animal-rtqpcr": "animal-rt-qpcr",
};
export const getAnimalExperimentDefinition = (id: string) => ANIMAL_EXPERIMENTS.find((experiment) => experiment.id === (ANIMAL_ID_ALIASES[id] ?? id));

const clone = <T>(value: T): T => {
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)) as T; }
};

function normalizeInventory(inventory: AnimalSampleInput[] = []): AnimalSampleInventory[] {
  return inventory.map((sample, index) => ({
    id: sample.id || `animal-sample-${index + 1}`, kind: sample.kind, label: sample.label ?? sample.id,
    amount: Math.max(0, sample.amount), unit: sample.unit ?? "sample", quality: Math.max(0, Math.min(1, sample.quality ?? 1)),
    available: Math.max(0, Math.min(sample.available ?? sample.amount, sample.amount)), reserved: Math.max(0, sample.reserved ?? 0),
    reservations: clone(sample.reservations ?? []), sourceAnimalIds: [...(sample.sourceAnimalIds ?? [])],
  }));
}

/** Create an animal study in the design phase without mutating the input design. */
export function createAnimalStudy(design: AnimalStudyDesign, initialSamples: AnimalSampleInput[] = design.sampleInventory ?? []): AnimalStudy {
  const normalizedDesign = clone({ ...design,
    name: design.name ?? design.id, strain: design.strain ?? "unspecified", sex: design.sex ?? "unspecified",
    animalCount: Math.max(0, Math.floor(design.animalCount)), adaptationDays: Math.max(0, Math.floor(design.adaptationDays ?? 0)),
    monitoring: design.monitoring ?? { measures: [], frequency: "as scheduled", humaneEndpoints: [] },
  });
  return {
    id: design.id, design: normalizedDesign, lifecycle: "design", stage: "animal-design", day: 0,
    samples: normalizeInventory(initialSamples), completedExperimentIds: [], monitoringRecords: [],
  };
}

const lifecycleSteps: readonly AnimalLifecycle[] = ["design", "adaptation", "dosing", "monitoring", "sampling", "completed"];
const stageForLifecycle: Record<AnimalLifecycle, AnimalStageId> = {
  design: "animal-design", adaptation: "animal-dosing", dosing: "animal-dosing", monitoring: "animal-phenotype", sampling: "animal-sampling", completed: "animal-sampling",
};

/** Advance exactly one lifecycle step. It is intentionally deterministic and immutable. */
export function advanceAnimalStudy(study: AnimalStudy, target?: AnimalLifecycle): AnimalStudy {
  const currentIndex = lifecycleSteps.indexOf(study.lifecycle);
  const expectedLifecycle = lifecycleSteps[Math.min(currentIndex + 1, lifecycleSteps.length - 1)];
  const nextLifecycle = target ?? expectedLifecycle;
  if (!nextLifecycle || nextLifecycle !== expectedLifecycle) return { ...clone(study), lastError: "动物实验生命周期必须按设计、适应/给药、监测、取材、完成顺序推进。" };
  const next = clone(study);
  next.lifecycle = nextLifecycle;
  next.stage = stageForLifecycle[nextLifecycle];
  next.day = Math.max(next.day, nextLifecycle === "adaptation" ? (study.design.adaptationDays ?? 0) : study.day);
  next.lastError = undefined;
  return next;
}

/** Add collected material to the finite inventory; no input array is mutated. */
export function collectAnimalSamples(study: AnimalStudy, collected: AnimalSampleInput | AnimalSampleInput[]): AnimalStudy {
  if (study.lifecycle !== "sampling" && study.lifecycle !== "completed") return { ...clone(study), lastError: "只有取材阶段才能收集动物样本。" };
  const next = clone(study);
  for (const incoming of normalizeInventory(Array.isArray(collected) ? collected : [collected])) {
    const existing = next.samples.find((sample) => sample.id === incoming.id);
    if (existing) {
      existing.amount += incoming.amount; existing.available += incoming.available; existing.quality = Math.min(existing.quality, incoming.quality);
      existing.sourceAnimalIds = [...new Set([...existing.sourceAnimalIds, ...incoming.sourceAnimalIds])];
    } else next.samples.push(incoming);
  }
  next.lastError = undefined;
  return next;
}

/** Reserve a finite aliquot. A failed operation leaves the study unchanged except for lastError. */
export function reserveSample(study: AnimalStudy, sampleId: string, amount: number, reservedBy = "anonymous"): AnimalStudy {
  if (!Number.isFinite(amount) || amount <= 0) return { ...clone(study), lastError: "预留量必须是正数。" };
  const next = clone(study); const sample = next.samples.find((entry) => entry.id === sampleId);
  if (!sample) return { ...next, lastError: `找不到样本 ${sampleId}。` };
  if (sample.available < amount) return { ...next, lastError: "样本库存不足，无法预留。" };
  sample.available -= amount; sample.reserved += amount;
  sample.reservations.push({ id: `${sampleId}-reservation-${sample.reservations.length + 1}`, amount, reservedBy });
  next.lastError = undefined; return next;
}

/** Consume reserved or free material. Exhausted samples cannot be consumed. */
export function consumeSample(study: AnimalStudy, sampleId: string, amount: number, consumer = "anonymous"): AnimalStudy {
  if (!Number.isFinite(amount) || amount <= 0) return { ...clone(study), lastError: "消耗量必须是正数。" };
  const next = clone(study); const sample = next.samples.find((entry) => entry.id === sampleId);
  if (!sample) return { ...next, lastError: `找不到样本 ${sampleId}。` };
  const reservedForConsumer = sample.reservations.filter((reservation) => reservation.reservedBy === consumer).reduce((sum, reservation) => sum + reservation.amount, 0);
  const usable = sample.available + reservedForConsumer;
  if (usable < amount) return { ...next, lastError: "样本已耗尽或可用量不足，无法继续实验。" };
  let remaining = amount;
  // Consume the caller's reservation first, so reserving an aliquot protects
  // it from unrelated consumers and the accounting remains intuitive.
  for (const reservation of sample.reservations) {
    if (reservation.reservedBy !== consumer || remaining <= 0) continue;
    const used = Math.min(reservation.amount, remaining); reservation.amount -= used; sample.reserved -= used; remaining -= used;
  }
  sample.reservations = sample.reservations.filter((reservation) => reservation.amount > 0);
  if (remaining > 0) sample.available -= remaining;
  next.lastError = undefined; return next;
}

/**
 * Convert an observed result to conservative evidence. This helper is useful
 * to callers that do not use the cell-route results module.
 */
export function animalEvidenceForResult(definitionId: string, result: "positive" | "negative" | "trend" | "raw" = "positive"): AnimalResultEvidence | undefined {
  const definition = getAnimalExperimentDefinition(definitionId);
  if (!definition) return undefined;
  const evidence = clone(definition.evidence);
  if (evidence.rawData || result === "raw") { evidence.maxLevel = 0; evidence.canSupportMechanism = false; evidence.rawData = true; }
  else if (result === "negative") evidence.maxLevel = 0;
  else if (result === "trend") evidence.maxLevel = Math.max(0, evidence.maxLevel - 1) as 0 | 1 | 2 | 3 | 4;
  evidence.maxLevel = Math.min(4, evidence.maxLevel) as 0 | 1 | 2 | 3 | 4;
  return evidence;
}

/** A causal rescue must always be performed with a newly created causal study. */
export function createAnimalRescueStudy(base: AnimalStudy, rescueDesign: Omit<AnimalStudyDesign, "purpose">): AnimalStudy {
  const nextDesign = clone(rescueDesign);
  if (nextDesign.id === base.id) nextDesign.id = `${base.id}-rescue`;
  return createAnimalStudy({ ...nextDesign, purpose: "causal" }, nextDesign.sampleInventory ?? []);
}
