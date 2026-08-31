/**
 * A small, deterministic data layer for experimental mishaps.
 *
 * This module deliberately does not change a ProjectRun.  The game loop can
 * apply the returned effects to whichever resource model it is using, while
 * tests can exercise event selection and choice resolution without a UI or a
 * global random-number source.
 */

export type FailureCategory = "wb" | "qpcr" | "cell-culture" | "animal" | "omics" | "pathology-imaging";

export type FailureAction = "retry" | "optimize" | "replace-reagent" | "accept-low-quality" | "discard";

export type BilingualCopy = { zh: string; en: string };

export type FailureEffects = {
  cost: number;
  slots: number;
  quality: number;
  energy: number;
  san: number;
  trust: number;
  integrity: number;
};

export type FailureChoice = FailureEffects & {
  id: string;
  action: FailureAction;
  label: BilingualCopy;
  /** Nested form mirrors the effect shape used by the main game engine. */
  effects: FailureEffects;
  /** True is required whenever an option carries a negative integrity effect. */
  negativeIntegrity?: boolean;
};

export type FailureEvent = {
  id: string;
  category: FailureCategory;
  title: BilingualCopy;
  /** Why the result is unreliable, rather than an invitation to edit data. */
  reason: BilingualCopy;
  techniqueTags: readonly string[];
  /** `tags` is a convenient alias for callers that use generic tag filters. */
  tags: readonly string[];
  weight: number;
  choices: readonly FailureChoice[];
};

const effects = (values: Partial<FailureEffects>): FailureEffects => ({
  cost: values.cost ?? 0,
  slots: values.slots ?? 0,
  quality: values.quality ?? 0,
  energy: values.energy ?? 0,
  san: values.san ?? 0,
  trust: values.trust ?? 0,
  integrity: values.integrity ?? 0,
});

const choice = (id: string, action: FailureAction, label: BilingualCopy, values: Partial<FailureEffects>): FailureChoice => {
  const impact = effects(values);
  const result = { id, action, label, ...impact, effects: impact };
  return result.integrity < 0 ? { ...result, negativeIntegrity: true } : result;
};

/** Every incident offers recovery, an explicitly marked low-quality path, or responsible discard. */
const choicesFor = (id: string, severity: number): readonly FailureChoice[] => [
  choice(`${id}-retry`, "retry", { zh: "重做本次实验", en: "Retry the run" }, { cost: 500 * severity, slots: 1, quality: 8, energy: -7, san: -2, trust: 0, integrity: 1 }),
  choice(`${id}-optimize`, "optimize", { zh: "优化条件后再做", en: "Optimize conditions first" }, { cost: 350 * severity, slots: 1, quality: 14, energy: -5, san: 1, trust: 1, integrity: 2 }),
  choice(`${id}-replace-reagent`, "replace-reagent", { zh: "更换试剂/耗材", en: "Replace reagent or consumable" }, { cost: 700 * severity, slots: 0, quality: 18, energy: -3, san: -1, trust: 0, integrity: 2 }),
  choice(`${id}-accept-low-quality`, "accept-low-quality", { zh: "接受低质量结果并披露局限", en: "Accept low quality and disclose the limitation" }, { cost: 0, slots: 0, quality: -12 * severity, energy: 2, san: -1, trust: -2, integrity: 3 }),
  choice(`${id}-discard`, "discard", { zh: "弃用该批次并保留记录", en: "Discard the batch and preserve the record" }, { cost: 200 * severity, slots: 1, quality: 0, energy: -4, san: -2, trust: -1, integrity: -1 }),
];

type EventSeed = Omit<FailureEvent, "choices" | "tags"> & { severity?: number };
const incident = (seed: EventSeed): FailureEvent => {
  const tags = [...new Set([seed.category, ...seed.techniqueTags])];
  return { ...seed, tags, choices: choicesFor(seed.id, seed.severity ?? 1) };
};

/* Six WB incidents. */
const WB_FAILURES: readonly FailureEvent[] = [
  incident({ id: "wb-uneven-transfer", category: "wb", title: { zh: "转膜不均：泳道信号忽强忽弱", en: "Uneven transfer: lane signals vary sharply" }, reason: { zh: "膜与胶接触不平或气泡未排尽，导致蛋白转移效率沿泳道变化。", en: "Poor membrane contact or trapped bubbles made transfer efficiency vary across lanes." }, techniqueTags: ["WB", "western-blot", "transfer"], weight: 5 }),
  incident({ id: "wb-high-background", category: "wb", title: { zh: "封闭失效：整张膜背景偏高", en: "Failed blocking: background is high across the blot" }, reason: { zh: "封闭液、洗膜或抗体稀释条件不足，使非特异性结合淹没目标条带。", en: "Blocking, washing, or antibody dilution was insufficient, masking specific bands with nonspecific signal." }, techniqueTags: ["WB", "western-blot", "background"], weight: 5 }),
  incident({ id: "wb-duplicate-band", category: "wb", title: { zh: "非特异条带：目标分子出现多个条带", en: "Nonspecific bands: multiple bands near the target" }, reason: { zh: "抗体特异性不足或样本降解，不能只凭最亮条带判断目标蛋白量。", en: "Antibody specificity or sample integrity is inadequate; the brightest band cannot safely be called the target." }, techniqueTags: ["WB", "western-blot", "antibody"], weight: 4 }),
  incident({ id: "wb-saturated-exposure", category: "wb", title: { zh: "曝光饱和：强条带没有线性动态范围", en: "Saturated exposure: strong bands leave the linear range" }, reason: { zh: "曝光时间或上样量过高，信号达到检测上限，组间差异可能被压扁。", en: "Exposure or loading was too high, clipping the detector and compressing between-group differences." }, techniqueTags: ["WB", "western-blot", "imaging"], weight: 4 }),
  incident({ id: "wb-loading-control-drift", category: "wb", title: { zh: "内参漂移：loading control 随处理改变", en: "Loading-control drift after treatment" }, reason: { zh: "选用的内参受处理影响或定量不稳定，归一化基础不再成立。", en: "The chosen loading control changes with treatment or is unstable, invalidating normalization." }, techniqueTags: ["WB", "western-blot", "normalization"], weight: 4 }),
  incident({ id: "wb-freeze-thaw", category: "wb", title: { zh: "样本反复冻融：蛋白发生降解", en: "Repeated freeze-thaw: protein degradation" }, reason: { zh: "裂解物反复冻融且抑制剂保护不足，目标蛋白可能已经降解。", en: "Repeated freeze-thaw cycles with insufficient inhibitors may have degraded the target protein." }, techniqueTags: ["WB", "western-blot", "sample-prep"], weight: 3, severity: 2 }),
];

/* Five qPCR incidents. */
const QPCR_FAILURES: readonly FailureEvent[] = [
  incident({ id: "qpcr-inhibition", category: "qpcr", title: { zh: "扩增抑制：Ct 整体右移", en: "Amplification inhibition shifts Ct values right" }, reason: { zh: "提取物残留盐、乙醇或其他抑制物，导致扩增效率下降。", en: "Residual salts, ethanol, or other inhibitors reduced amplification efficiency." }, techniqueTags: ["qPCR", "RT-qPCR", "amplification"], weight: 5 }),
  incident({ id: "qpcr-primer-dimer", category: "qpcr", title: { zh: "引物二聚体：熔解曲线多出低温峰", en: "Primer-dimer creates an extra low-temperature melt peak" }, reason: { zh: "引物互补或浓度不合适，非目标产物参与荧光读数。", en: "Primer complementarity or excessive concentration produced a nonspecific fluorescent product." }, techniqueTags: ["qPCR", "RT-qPCR", "melt-curve"], weight: 5 }),
  incident({ id: "qpcr-variable-reference", category: "qpcr", title: { zh: "内参不稳定：参考基因随处理波动", en: "Unstable reference gene varies with treatment" }, reason: { zh: "参考基因并非稳定表达，ΔCt/ΔΔCt 的归一化假设不满足。", en: "The reference gene is treatment-responsive, so the normalization assumption behind ΔCt/ΔΔCt fails." }, techniqueTags: ["qPCR", "RT-qPCR", "normalization"], weight: 5 }),
  incident({ id: "qpcr-low-rna", category: "qpcr", title: { zh: "RNA 量过低：重复间 Ct 飘移", en: "Low RNA input causes Ct drift between replicates" }, reason: { zh: "模板量接近检测下限或逆转录损失较大，重复间随机误差占主导。", en: "Template input is near the detection limit or reverse-transcription recovery is poor, making random error dominant." }, techniqueTags: ["qPCR", "RT-qPCR", "RNA"], weight: 4 }),
  incident({ id: "qpcr-contamination", category: "qpcr", title: { zh: "阴性对照扩增：疑似污染", en: "Negative control amplifies: suspected contamination" }, reason: { zh: "NTC 或无模板对照出现扩增，无法排除试剂、移液或产物污染。", en: "The NTC amplified, so reagent, pipetting, or amplicon contamination cannot be excluded." }, techniqueTags: ["qPCR", "RT-qPCR", "contamination"], weight: 4, severity: 2 }),
];

/* Five cell culture / treatment incidents. */
const CELL_FAILURES: readonly FailureEvent[] = [
  incident({ id: "cell-mycoplasma", category: "cell-culture", title: { zh: "支原体阳性：培养物被污染", en: "Mycoplasma-positive culture" }, reason: { zh: "支原体可改变代谢、增殖和转录，当前培养物不能代表原定模型。", en: "Mycoplasma can alter metabolism, growth, and transcription, so the culture no longer represents the intended model." }, techniqueTags: ["cell-culture", "mycoplasma", "contamination"], weight: 5, severity: 2 }),
  incident({ id: "cell-overconfluence", category: "cell-culture", title: { zh: "过度融合：细胞密度超过设计范围", en: "Overconfluence exceeds the planned cell density" }, reason: { zh: "细胞间接触和营养耗竭改变基础状态，使处理效应与密度效应混杂。", en: "Cell-cell contact and nutrient depletion changed baseline state, confounding treatment with density effects." }, techniqueTags: ["cell-culture", "confluence", "viability"], weight: 5 }),
  incident({ id: "cell-low-viability", category: "cell-culture", title: { zh: "解冻后活率过低：起始状态不一致", en: "Low post-thaw viability" }, reason: { zh: "解冻损伤或运输应激使起始细胞状态不一致，处理前已存在明显选择压力。", en: "Freeze-thaw or transport stress made starting cell states uneven before treatment." }, techniqueTags: ["cell-culture", "viability", "thawing"], weight: 4 }),
  incident({ id: "cell-treatment-precipitate", category: "cell-culture", title: { zh: "处理液析出：实际暴露浓度未知", en: "Treatment precipitates; actual exposure is unknown" }, reason: { zh: "溶剂、pH 或配制顺序造成析出，标称剂量不能代表细胞实际暴露。", en: "Solvent, pH, or mixing order caused precipitation, so nominal dose does not equal cellular exposure." }, techniqueTags: ["cell-culture", "treatment", "dose"], weight: 4 }),
  incident({ id: "cell-edge-effect", category: "cell-culture", title: { zh: "孔板边缘效应：蒸发造成位置偏差", en: "Plate edge effect from evaporation" }, reason: { zh: "边缘孔蒸发更快，渗透压和体积变化造成板内系统性位置偏差。", en: "Faster edge evaporation changed volume and osmolality, creating a systematic plate-position bias." }, techniqueTags: ["cell-culture", "plate", "assay"], weight: 3 }),
];

/* Eight animal incidents. */
const ANIMAL_FAILURES: readonly FailureEvent[] = [
  incident({ id: "animal-dose-misroute", category: "animal", title: { zh: "给药途径偏差：实际暴露不符方案", en: "Dose-route deviation changes actual exposure" }, reason: { zh: "给药途径或针位偏离预设方案，药代和局部损伤都可能改变。", en: "The route or needle placement deviated from the protocol, changing pharmacokinetics and local injury." }, techniqueTags: ["animal", "dosing", "in-vivo"], weight: 4, severity: 2 }),
  incident({ id: "animal-weight-mismatch", category: "animal", title: { zh: "体重记录错配：剂量计算依据不可靠", en: "Weight mismatch compromises dose calculation" }, reason: { zh: "动物编号与体重记录未能可靠对应，按体重换算的实际剂量无法确认。", en: "Animal identity and weight records cannot be reliably matched, so the dose per body weight is uncertain." }, techniqueTags: ["animal", "dosing", "randomization"], weight: 4 }),
  incident({ id: "animal-stress-handling", category: "animal", title: { zh: "抓取应激：行为和生理读数异常", en: "Handling stress distorts behavioral and physiological readouts" }, reason: { zh: "抓取、噪声或等待时间超出平衡范围，急性应激可能成为主要变量。", en: "Handling, noise, or waiting time exceeded the balanced range, making acute stress a major variable." }, techniqueTags: ["animal", "behavior", "handling"], weight: 4 }),
  incident({ id: "animal-randomization-break", category: "animal", title: { zh: "随机化中断：组间分配出现偏差", en: "Randomization break creates group imbalance" }, reason: { zh: "笼位、性别或批次分配未按预设随机化执行，组别可能与批次因素混杂。", en: "Cage, sex, or batch allocation departed from the randomization plan and may be confounded with group." }, techniqueTags: ["animal", "randomization", "blinding"], weight: 4, severity: 2 }),
  incident({ id: "animal-sample-loss", category: "animal", title: { zh: "样本丢失：终点组织未按计划获得", en: "Endpoint tissue sample is missing" }, reason: { zh: "取材、标记或冷冻环节出错，无法确认该动物的终点组织身份或完整性。", en: "Collection, labeling, or freezing failed, so endpoint tissue identity or integrity is uncertain." }, techniqueTags: ["animal", "necropsy", "sample"], weight: 3, severity: 2 }),
  incident({ id: "animal-anesthesia-depth", category: "animal", title: { zh: "麻醉深度不一致：生理参数漂移", en: "Uneven anesthesia depth shifts physiology" }, reason: { zh: "麻醉深度和持续时间不同，心率、呼吸及代谢读数受到额外影响。", en: "Different anesthesia depth and duration affected heart rate, respiration, and metabolism." }, techniqueTags: ["animal", "anesthesia", "physiology"], weight: 3 }),
  incident({ id: "animal-cage-effect", category: "animal", title: { zh: "笼位效应：环境暴露与处理组混杂", en: "Cage effect is confounded with treatment" }, reason: { zh: "温度、光照或同笼关系随组别分布不均，个体结果不能独立于笼位解释。", en: "Temperature, light, or cage-mate exposure was unevenly distributed across groups." }, techniqueTags: ["animal", "cage", "housing"], weight: 3 }),
  incident({ id: "animal-humane-endpoint", category: "animal", title: { zh: "提前人道终点：终点时间不一致", en: "Early humane endpoint creates unequal endpoint timing" }, reason: { zh: "个体因福利标准提前退出，观察时长不同，不能与固定终点动物直接比较。", en: "An animal met humane-endpoint criteria early, so observation time differs from fixed-endpoint animals." }, techniqueTags: ["animal", "ethics", "endpoint"], weight: 3, severity: 2 }),
];

/* Five omics incidents. */
const OMICS_FAILURES: readonly FailureEvent[] = [
  incident({ id: "omics-library-low-complexity", category: "omics", title: { zh: "文库复杂度低：有效 reads 不足", en: "Low library complexity leaves too few informative reads" }, reason: { zh: "文库扩增偏倚或起始量不足，使少数分子过度代表并降低有效覆盖。", en: "Amplification bias or low input over-represented a few molecules and reduced informative coverage." }, techniqueTags: ["omics", "RNA-seq", "library"], weight: 4, severity: 2 }),
  incident({ id: "omics-batch-effect", category: "omics", title: { zh: "批次效应：样本按批次聚类", en: "Batch effect dominates sample clustering" }, reason: { zh: "提取、建库或上机批次与生物学分组重合，技术差异无法和处理效应分开。", en: "Extraction, library, or sequencing batch overlaps with biological group, preventing separation of technical and treatment effects." }, techniqueTags: ["omics", "RNA-seq", "batch-effect"], weight: 5, severity: 2 }),
  incident({ id: "omics-low-depth", category: "omics", title: { zh: "测序深度不足：低丰度信号不稳定", en: "Insufficient sequencing depth destabilizes low-abundance signals" }, reason: { zh: "有效测序深度不足，低丰度转录本或峰的检测受抽样噪声主导。", en: "Insufficient usable depth leaves low-abundance transcripts or peaks dominated by sampling noise." }, techniqueTags: ["omics", "sequencing", "coverage"], weight: 4 }),
  incident({ id: "omics-sample-swap", category: "omics", title: { zh: "样本身份疑似错配：指纹不一致", en: "Possible sample swap: molecular fingerprints disagree" }, reason: { zh: "样本条码、基因型或表达指纹与记录不一致，组间归属不能直接相信。", en: "Barcode, genotype, or expression fingerprints disagree with records, so group assignment cannot be assumed." }, techniqueTags: ["omics", "sample-identity", "QC"], weight: 4, severity: 2 }),
  incident({ id: "omics-multiple-testing", category: "omics", title: { zh: "多重检验未控制：候选列表膨胀", en: "Uncontrolled multiple testing inflates the candidate list" }, reason: { zh: "大量特征比较未进行适当的多重检验校正，名义显著不等于可靠发现。", en: "Many features were tested without suitable multiplicity correction; nominal significance is not a reliable discovery." }, techniqueTags: ["omics", "statistics", "FDR"], weight: 5 }),
];

/* Four pathology / imaging incidents. */
const PATHOLOGY_FAILURES: readonly FailureEvent[] = [
  incident({ id: "pathology-section-fold", category: "pathology-imaging", title: { zh: "切片褶皱：组织结构被遮挡", en: "Section fold obscures tissue architecture" }, reason: { zh: "切片出现褶皱或刀痕，局部结构不可判读，评分区域不再可比。", en: "Folds or knife marks obscure local architecture and make scoring regions incomparable." }, techniqueTags: ["pathology", "histology", "section"], weight: 4 }),
  incident({ id: "pathology-stain-drift", category: "pathology-imaging", title: { zh: "染色漂移：批次间颜色不可比", en: "Stain drift makes color non-comparable between batches" }, reason: { zh: "染色时间、试剂老化或扫描设置变化，使颜色强度不能直接代表组织差异。", en: "Staining time, reagent age, or scanner settings changed, so color intensity is not directly comparable." }, techniqueTags: ["pathology", "histology", "staining"], weight: 4, severity: 2 }),
  incident({ id: "imaging-motion-blur", category: "pathology-imaging", title: { zh: "成像运动伪影：边界无法稳定分割", en: "Motion artifact prevents stable boundary segmentation" }, reason: { zh: "采集时运动或对焦漂移造成模糊，面积和强度测量可能依赖主观勾画。", en: "Motion or focus drift blurred acquisition, making area and intensity measurements depend on subjective tracing." }, techniqueTags: ["imaging", "microscopy", "segmentation"], weight: 4 }),
  incident({ id: "imaging-saturation", category: "pathology-imaging", title: { zh: "荧光饱和：信号强度达到上限", en: "Fluorescence saturation clips signal intensity" }, reason: { zh: "曝光或增益过高使像素饱和，强弱差异和共定位关系都可能被扭曲。", en: "Excess exposure or gain saturated pixels, distorting intensity differences and colocalization." }, techniqueTags: ["imaging", "fluorescence", "quantification"], weight: 4 }),
];

export const FAILURE_EVENTS: readonly FailureEvent[] = [
  ...WB_FAILURES, ...QPCR_FAILURES, ...CELL_FAILURES, ...ANIMAL_FAILURES, ...OMICS_FAILURES, ...PATHOLOGY_FAILURES,
];
export const EXPERIMENT_FAILURES = FAILURE_EVENTS;
export const failureEvents = FAILURE_EVENTS;

export type FailureRng = () => number;

/** Weighted, pure selection. Tags use OR semantics; no matching tag means all events are eligible. */
export function pickWeightedFailure(tags: readonly string[] = [], rng: FailureRng = Math.random): FailureEvent | undefined {
  const wanted = new Set(tags.map((tag) => tag.toLowerCase()));
  const candidates = wanted.size === 0
    ? FAILURE_EVENTS
    : FAILURE_EVENTS.filter((event) => event.tags.some((tag) => wanted.has(tag.toLowerCase())));
  if (!candidates.length) return undefined;
  const total = candidates.reduce((sum, event) => sum + Math.max(0, event.weight), 0);
  if (total <= 0) return candidates[0];
  const sample = rng();
  const random = Number.isFinite(sample) ? Math.min(0.999999999999, Math.max(0, sample)) : 0;
  let cursor = random * total;
  for (const event of candidates) {
    cursor -= Math.max(0, event.weight);
    if (cursor < 0) return event;
  }
  return candidates[candidates.length - 1];
}

export type FailureResolution = {
  eventId: string;
  choiceId: string;
  action: FailureAction;
  /** Direct fields and `effects` are both provided for easy reducer integration. */
  cost: number;
  slots: number;
  quality: number;
  energy: number;
  san: number;
  trust: number;
  integrity: number;
  effects: FailureEffects;
  negativeIntegrity: boolean;
};

/** Resolve a choice without mutating either the event or its choice. */
export function resolveFailureChoice(event: FailureEvent, choiceId: string | FailureAction): FailureResolution | undefined {
  const selected = event.choices.find((item) => item.id === choiceId || item.action === choiceId);
  if (!selected) return undefined;
  const resolvedEffects = effects(selected);
  return {
    eventId: event.id,
    choiceId: selected.id,
    action: selected.action,
    ...resolvedEffects,
    effects: resolvedEffects,
    negativeIntegrity: selected.negativeIntegrity === true || resolvedEffects.integrity < 0,
  };
}

export type ScientificResult = "significant" | "trend" | "not-significant" | "opposite" | "inconsistent";
export type ScientificObservation = {
  replicateGroupId: string;
  result: ScientificResult;
  replicateId?: string;
  quality?: number;
};
export type ReplicateConsistency = {
  replicateGroupId: string;
  n: number;
  counts: Readonly<Partial<Record<ScientificResult, number>>>;
  consistency: number;
  consistent: boolean;
  result: ScientificResult;
};

/** Majority agreement within one replicate group; ties are explicitly inconsistent. */
export function calculateReplicateConsistency(observations: readonly ScientificObservation[], replicateGroupId: string): ReplicateConsistency {
  const group = observations.filter((observation) => observation.replicateGroupId === replicateGroupId);
  const counts: Partial<Record<ScientificResult, number>> = {};
  for (const observation of group) counts[observation.result] = (counts[observation.result] ?? 0) + 1;
  const ranked = (Object.entries(counts) as [ScientificResult, number][]).sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  const tied = Boolean(top && ranked[1] && ranked[1][1] === top[1]);
  const consistency = group.length && top ? top[1] / group.length : 0;
  return {
    replicateGroupId,
    n: group.length,
    counts,
    consistency,
    consistent: Boolean(top && !tied && top[1] === group.length),
    result: top && !tied ? top[0] : "inconsistent",
  };
}

export function summarizeScientificResults(observations: readonly ScientificObservation[]): Readonly<Record<string, ReplicateConsistency>> {
  const groups = [...new Set(observations.map((observation) => observation.replicateGroupId))];
  return Object.fromEntries(groups.map((group) => [group, calculateReplicateConsistency(observations, group)]));
}
export const evaluateScientificResults = summarizeScientificResults;
export const summarizeReplicates = summarizeScientificResults;
export const computeReplicateConsistency = calculateReplicateConsistency;
