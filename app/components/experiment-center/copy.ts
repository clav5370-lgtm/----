import type { CellStageId, AnimalStageId, ExperimentRoute } from "../../game/research/types";

export type ResearchLocale = "zh-CN" | "en-US";
export const copy = (locale: ResearchLocale, zh: string, en: string) => locale === "en-US" ? en : zh;

export const ROUTE_COPY: Record<ExperimentRoute, { icon: string; zh: { name: string; description: string; hint: string }; en: { name: string; description: string; hint: string } }> = {
  cell: { icon: "🧫", zh: { name: "细胞实验", description: "从稳定模型开始，逐步建立表型、分子与因果证据。", hint: "8 个 V7 实验已接入，可直接记录研究证据。" }, en: { name: "Cell Experiments", description: "Start with a stable model and build phenotype, molecular, and causal evidence.", hint: "Eight V7 experiments are connected and ready to record evidence." } },
  animal: { icon: "🐁", zh: { name: "动物实验", description: "从动物设计、给药、取材到病理和因果验证，规划整体证据链。", hint: "动物路线已配置八个阶段；具体方案正在逐阶段建立。" }, en: { name: "Animal Experiments", description: "Plan a whole-organism evidence chain from design and dosing to pathology and causal validation.", hint: "Eight animal stages are mapped; detailed protocols are being built stage by stage." } },
};

export const CELL_STAGES: Array<{ id: CellStageId; zh: string; en: string; detailZh: string; detailEn: string }> = [
  { id: "model", zh: "模型", en: "Model", detailZh: "选择模型、剂量和处理时间", detailEn: "Choose a model, dose, and treatment window" },
  { id: "phenotype", zh: "表型", en: "Phenotype", detailZh: "确认细胞是否真的发生变化", detailEn: "Confirm that cells actually change" },
  { id: "molecular", zh: "分子", en: "Molecular", detailZh: "寻找基因和蛋白层面的线索", detailEn: "Find gene- and protein-level clues" },
  { id: "omics", zh: "组学", en: "Omics", detailZh: "从全局数据寻找候选机制", detailEn: "Search global data for candidate mechanisms" },
  { id: "causal", zh: "因果", en: "Causal", detailZh: "干预候选通路并观察逆转", detailEn: "Perturb a candidate pathway and look for rescue" },
  { id: "advanced", zh: "高级验证", en: "Advanced validation", detailZh: "跨模型、重复和高阶验证", detailEn: "Cross-model, repeat, and higher-order validation" },
];

export const ANIMAL_STAGES: Array<{ id: AnimalStageId; zh: string; en: string; detailZh: string; detailEn: string }> = [
  { id: "design", zh: "设计", en: "Design", detailZh: "分组、随机化与样本量规划", detailEn: "Groups, randomization, and sample-size planning" },
  { id: "dosing", zh: "建模/给药", en: "Model / dosing", detailZh: "建立模型并执行给药方案", detailEn: "Establish the model and administer the intervention" },
  { id: "phenotype", zh: "表型", en: "Phenotype", detailZh: "记录体重、行为和整体状态", detailEn: "Record weight, behavior, and whole-animal state" },
  { id: "sampling", zh: "取材", en: "Sampling", detailZh: "按时间点采集血液和组织", detailEn: "Collect blood and tissue at defined time points" },
  { id: "histology", zh: "病理", en: "Histology", detailZh: "观察组织损伤和修复", detailEn: "Inspect tissue injury and repair" },
  { id: "molecular", zh: "分子", en: "Molecular", detailZh: "验证组织中的分子变化", detailEn: "Validate molecular changes in tissue" },
  { id: "omics", zh: "组学", en: "Omics", detailZh: "整合多层次动物样本数据", detailEn: "Integrate multi-layer animal sample data" },
  { id: "causal", zh: "因果验证", en: "Causal validation", detailZh: "用干预验证机制是否成立", detailEn: "Test whether the mechanism holds under intervention" },
];

export const EXPERIMENT_COPY: Record<string, { nameEn: string; professionalZh: string; professionalEn: string; descriptionEn: string; purposeEn: string; canTellEn: string; cannotTellEn: string; positiveSummaryEn: string }> = {
  "cell-model-select": { nameEn: "Select a cell model", professionalZh: "Cell model selection", professionalEn: "Cell model selection", descriptionEn: "Choose the cell type that best matches the organ or disease question.", purposeEn: "Match the research object to the question.", canTellEn: "Which cell model is suitable for the question.", cannotTellEn: "It cannot show that the intervention has an effect yet.", positiveSummaryEn: "A usable cell model has been selected." },
  "cell-dose-finding": { nameEn: "Dose finding", professionalZh: "Dose finding", professionalEn: "Dose finding", descriptionEn: "Compare a concentration range to find a usable dose without destroying every cell.", purposeEn: "Set a dose for formal experiments.", canTellEn: "Which dose range is appropriate for formal work.", cannotTellEn: "It cannot establish a molecular mechanism by itself.", positiveSummaryEn: "A workable dose range has been found." },
  "cell-time-course": { nameEn: "Time-course pilot", professionalZh: "Time-course pilot", professionalEn: "Time-course pilot", descriptionEn: "Compare treatment windows such as 6, 12, 24, and 48 hours.", purposeEn: "Set the formal treatment duration.", canTellEn: "When the phenotype is easiest to observe.", cannotTellEn: "It cannot explain why the change happens.", positiveSummaryEn: "A suitable treatment window has been identified." },
  "cell-model-establishment": { nameEn: "Establish a cell model", professionalZh: "Cell model establishment", professionalEn: "Cell model establishment", descriptionEn: "Combine cell type, dose, and duration into a stable reusable model.", purposeEn: "Create consistent conditions for formal experiments.", canTellEn: "Whether a reusable cell treatment model is established.", cannotTellEn: "Model establishment does not prove a mechanism.", positiveSummaryEn: "A usable cell model has been established." },
  "cell-viability": { nameEn: "Cell viability assay", professionalZh: "CCK-8 / MTT", professionalEn: "CCK-8 / MTT", descriptionEn: "Check whether treated cells are broadly less viable or more viable.", purposeEn: "Confirm the basic cell phenotype.", canTellEn: "Whether cell viability changes.", cannotTellEn: "It cannot identify the death mode or prove ROS or a protein caused the change.", positiveSummaryEn: "Cell viability shows an observable change." },
  "cell-gene-expression": { nameEn: "Gene-expression assay", professionalZh: "RT-qPCR", professionalEn: "RT-qPCR", descriptionEn: "Measure whether target-gene mRNA increases or decreases.", purposeEn: "Find molecular clues at the gene-expression level.", canTellEn: "Whether target-gene mRNA changes.", cannotTellEn: "mRNA change is not protein change and does not prove causality.", positiveSummaryEn: "Target-gene expression has changed." },
  "cell-protein-expression": { nameEn: "Protein-expression assay", professionalZh: "Western blot / WB", professionalEn: "Western blot / WB", descriptionEn: "Check whether target proteins or pathway activation states change.", purposeEn: "Validate a candidate pathway at the protein level.", canTellEn: "Whether a target protein or pathway changes in association with the phenotype.", cannotTellEn: "A WB association cannot prove that the protein causes the injury.", positiveSummaryEn: "The target protein or candidate pathway has changed." },
  "cell-pharmacology-rescue": { nameEn: "Pharmacological rescue", professionalZh: "Pharmacological rescue", professionalEn: "Pharmacological rescue", descriptionEn: "Perturb the candidate pathway and test whether the original phenotype reverses.", purposeEn: "Test whether the candidate pathway participates in causing the phenotype.", canTellEn: "Whether perturbing the candidate reverses the phenotype.", cannotTellEn: "One rescue in one model does not prove a universal mechanism.", positiveSummaryEn: "The phenotype is partly or clearly rescued after intervention." },
};
