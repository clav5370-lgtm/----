import type { CellStageId, ExperimentRoute, UnlockRule } from "../research/types";

export type ExperimentResultRule = {
  evidenceClass: "exploration" | "phenotype" | "association" | "causal";
  role: "condition" | "phenotype" | "molecular" | "mechanism" | "causality";
  dimension: "phenotype" | "molecular" | "mechanism" | "causality";
  maxLevel: number;
  positiveSummary: string;
  canTell: string;
  cannotTell: string;
};

export type ResearchExperimentDefinition = {
  id: string;
  route: ExperimentRoute;
  stage: CellStageId;
  name: string;
  professionalName?: string;
  description: string;
  purpose: string;
  canTell: string;
  cannotTell: string;
  prerequisites: UnlockRule;
  cost: number;
  time: number;
  resultRule: ExperimentResultRule;
  recommendedNext: string[];
};

/** Stable V7 route/stage contract consumed by the experiment-centre UI. */
export const RESEARCH_ROUTES = [
  { id: "cell" as const, name: "细胞实验", nameEn: "Cell Experiments" },
  { id: "animal" as const, name: "动物实验", nameEn: "Animal Experiments" },
] as const;
export const CELL_STAGE_ORDER = ["model", "phenotype", "molecular", "omics", "causal", "advanced"] as const;
export const ANIMAL_STAGE_ORDER = ["design", "dosing", "phenotype", "sampling", "histology", "molecular", "omics", "causal"] as const;

const cell = (definition: Omit<ResearchExperimentDefinition, "route">): ResearchExperimentDefinition => ({ ...definition, route: "cell" });

export const CELL_EXPERIMENTS: readonly ResearchExperimentDefinition[] = [
  cell({
    id: "cell-model-select", stage: "model", name: "选择细胞模型", professionalName: "Cell model selection",
    description: "先决定用哪一种细胞作为实验对象。", purpose: "让研究对象和课题器官/疾病方向匹配。",
    canTell: "哪种细胞适合回答当前问题。", cannotTell: "不能证明药物或疾病已经产生了效果。", prerequisites: { route: "cell" }, cost: 500, time: 1,
    resultRule: { evidenceClass: "exploration", role: "condition", dimension: "phenotype", maxLevel: 0, positiveSummary: "选定了可用的细胞模型。", canTell: "实验条件已确定。", cannotTell: "尚无表型证据。" }, recommendedNext: ["cell-dose-finding"],
  }),
  cell({
    id: "cell-dose-finding", stage: "model", name: "剂量摸索", professionalName: "Dose finding",
    description: "用几个浓度梯度寻找既能看到变化、又不至于把细胞全杀死的范围。", purpose: "确定后续实验使用的剂量。",
    canTell: "哪个剂量范围适合正式实验。", cannotTell: "不能单独证明分子机制。", prerequisites: { all: [{ experimentCompleted: "cell-model-select" }, { hasSelectedCellModel: true }] }, cost: 1200, time: 1,
    resultRule: { evidenceClass: "exploration", role: "condition", dimension: "phenotype", maxLevel: 0, positiveSummary: "找到了可行的剂量范围。", canTell: "剂量条件可用。", cannotTell: "还没有稳定表型证据。" }, recommendedNext: ["cell-time-course"],
  }),
  cell({
    id: "cell-time-course", stage: "model", name: "时间摸索", professionalName: "Time-course pilot",
    description: "比较 6、12、24、48 小时等处理时间，观察现象何时最清楚。", purpose: "确定正式处理时长。",
    canTell: "表型大致在哪个时间点出现。", cannotTell: "不能直接说明为什么发生变化。", prerequisites: { all: [{ experimentCompleted: "cell-dose-finding" }, { hasSelectedCellModel: true }] }, cost: 1200, time: 1,
    resultRule: { evidenceClass: "exploration", role: "condition", dimension: "phenotype", maxLevel: 0, positiveSummary: "找到了较合适的处理时间。", canTell: "时间条件可用。", cannotTell: "还没有机制证据。" }, recommendedNext: ["cell-model-establishment"],
  }),
  cell({
    id: "cell-model-establishment", stage: "model", name: "建立可用细胞模型", professionalName: "Cell model establishment",
    description: "把细胞、剂量和时间组合成后续实验统一使用的模型。", purpose: "让正式实验有稳定、可重复的处理条件。",
    canTell: "一个可复用的细胞处理模型已经建立。", cannotTell: "模型建立本身不等于机制被证明。", prerequisites: { all: [{ experimentCompleted: "cell-dose-finding" }, { experimentCompleted: "cell-time-course" }, { hasConfiguredCellModel: true }] }, cost: 1800, time: 1,
    resultRule: { evidenceClass: "exploration", role: "condition", dimension: "phenotype", maxLevel: 0, positiveSummary: "可用细胞模型已建立。", canTell: "可以开始正式表型实验。", cannotTell: "尚未证明处理造成了特定损伤。" }, recommendedNext: ["cell-viability"],
  }),
  cell({
    id: "cell-viability", stage: "phenotype", name: "细胞活力检测", professionalName: "CCK-8 / MTT",
    description: "看看处理后细胞整体是不是活得更差了。", purpose: "确认最基本的细胞表型。",
    canTell: "细胞活力是否下降或上升。", cannotTell: "不能说明是哪一种死亡方式，也不能证明 ROS 或某个蛋白导致了变化。", prerequisites: { all: [{ experimentCompleted: "cell-model-establishment" }, { hasEstablishedCellModel: true }] }, cost: 1800, time: 2,
    resultRule: { evidenceClass: "phenotype", role: "phenotype", dimension: "phenotype", maxLevel: 2, positiveSummary: "细胞活力出现了可观察变化。", canTell: "支持处理影响了细胞状态。", cannotTell: "单独不能证明分子机制或因果关系。" }, recommendedNext: ["cell-gene-expression", "cell-protein-expression"],
  }),
  cell({
    id: "cell-gene-expression", stage: "molecular", name: "基因表达检测", professionalName: "RT-qPCR",
    description: "检测目标基因的 mRNA 有没有增加或减少。", purpose: "从基因表达层面寻找候选分子变化。",
    canTell: "目标基因的 mRNA 表达发生了变化。", cannotTell: "mRNA 变化不等于蛋白变化，更不能单独证明因果。", prerequisites: { all: [{ experimentCompleted: "cell-viability" }, { hasEstablishedCellModel: true }] }, cost: 2600, time: 3,
    resultRule: { evidenceClass: "association", role: "molecular", dimension: "molecular", maxLevel: 3, positiveSummary: "目标基因表达发生变化。", canTell: "支持候选分子与表型相关。", cannotTell: "不能替代蛋白检测，也不能证明这个基因导致了表型。" }, recommendedNext: ["cell-protein-expression"],
  }),
  cell({
    id: "cell-protein-expression", stage: "molecular", name: "蛋白表达检测", professionalName: "Western blot / WB",
    description: "看目标蛋白的含量或活化状态有没有改变。", purpose: "验证候选通路在蛋白层面是否发生变化。",
    canTell: "目标蛋白或信号通路出现了关联变化。", cannotTell: "单独做 WB 只能说明关联，不能证明蛋白直接导致损伤。", prerequisites: { all: [{ experimentCompleted: "cell-gene-expression" }, { hasEstablishedCellModel: true }] }, cost: 3000, time: 3,
    resultRule: { evidenceClass: "association", role: "mechanism", dimension: "mechanism", maxLevel: 3, positiveSummary: "目标蛋白和候选通路发生了变化。", canTell: "支持该通路可能参与当前现象。", cannotTell: "仍不能证明因果关系。" }, recommendedNext: ["cell-pharmacology-rescue"],
  }),
  cell({
    id: "cell-pharmacology-rescue", stage: "causal", name: "药理学救援实验", professionalName: "Pharmacological rescue",
    description: "用抑制剂或激动剂主动干预候选通路，再看原来的表型是否被逆转。", purpose: "检验候选通路是否真的参与导致了表型。",
    canTell: "干预候选分子后，表型是否随之逆转。", cannotTell: "一次救援仍不能自动证明所有模型和层次都一致，也不能单独达到五星证据。", prerequisites: { all: [{ experimentCompleted: "cell-protein-expression" }, { hasEstablishedCellModel: true }, { hasMechanismCandidate: true }] }, cost: 4200, time: 4,
    resultRule: { evidenceClass: "causal", role: "causality", dimension: "causality", maxLevel: 4, positiveSummary: "干预后原来的细胞表型得到部分或明显逆转。", canTell: "支持候选机制具有因果作用。", cannotTell: "单个模型和单个干预不能代表多模型强机制证据。" }, recommendedNext: ["cell-protein-expression"],
  }),
];

export const EXPERIMENT_CATALOG: readonly ResearchExperimentDefinition[] = CELL_EXPERIMENTS;
export const getExperimentDefinition = (id: string) => EXPERIMENT_CATALOG.find((experiment) => experiment.id === id);
