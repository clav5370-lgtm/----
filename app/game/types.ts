/** Current persisted save format. Older formats are intentionally kept below. */
import type { ProjectResearchState } from "./research/types";
import type { ExperimentFailureState, IncidentRecord } from "./experiments/failure-engine";

export const SAVE_SCHEMA_VERSION = 7 as const;

export type StatKey = "wet" | "data" | "writing" | "theory" | "social";
export type ResourceKey = "energy" | "san" | "trust";
export type EvidenceKey =
  | "phenotype"
  | "biochemical"
  | "histology"
  | "molecular"
  | "mechanism"
  | "omics"
  | "causality"
  | "replication";
export type ExperimentFamily =
  | "cell"
  | "molecular"
  | "pathology"
  | "animal"
  | "toxicology"
  | "omics"
  | "analysis";
export type ActivityId =
  | "pilot"
  | "literature"
  | "analysis"
  | "figure"
  | "writing"
  | "review"
  | "thesis"
  | "grant"
  | "collaborate"
  | "rest"
  | "games"
  | "date"
  | "travel";

export type Candidate = {
  id: string;
  name: string;
  background: string;
  bio: string;
  avatar: string;
  stats: Record<StatKey, number>;
  trait: string;
  traitEffect: string;
  flaw: string;
  flawEffect: string;
  tags: string[];
};

export type Advisor = {
  id: string;
  name: string;
  title: string;
  supervision: "硕导" | "博导";
  honor: string;
  strictness: string;
  archetype: string;
  quote: string;
  icon: string;
  patience: number;
  wealth: number;
  care: number;
  pressure: number;
  experimentBonus: number;
  fundingMultiplier: number;
  eventBias: string;
};

export type LabMember = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  icon: string;
  personality: string;
  romanceEligible: boolean;
  relation: number;
  favorDebt: number;
  leaveTurn: number;
  active: boolean;
};

export type ProjectDefinition = {
  id: string;
  programId: string;
  stage: 1 | 2 | 3 | 4 | 5;
  question: string;
  knowledgeGap: string;
  mechanismAxis: string;
  requiredEvidence: EvidenceKey[];
  referenceIds: string[];
  domain: string;
  title: string;
  intervention: string;
  model: string;
  target: string;
  route: string;
  difficulty: number;
  novelty: number;
  truthBias: number;
  recommendedExperiments: string[];
};

export type ProjectRun = ProjectDefinition & {
  runId: string;
  mode: "base" | "custom" | "extension";
  evidence: Record<EvidenceKey, number>;
  experimentHistory: ExperimentOutcomeRecord[];
  figures: number;
  figureCoverage: EvidenceKey[];
  writingProgress: number;
  thesisProgress: number;
  active: boolean;
  /** Additive V7 research state; absent on pre-V7 saves until migration. */
  research?: ProjectResearchState;
};

export type ExperimentDefinition = {
  id: string;
  name: string;
  short: string;
  icon: string;
  family: ExperimentFamily;
  description: string;
  slots: number;
  cost: number;
  energy: number;
  baseSuccess: number;
  skill: StatKey;
  equipment: string;
  sample: string;
  evidence: EvidenceKey;
  tags: string[];
};

export type ExperimentRun = {
  id: string;
  definitionId: string;
  projectRunId: string;
  totalSlots: number;
  completedSlots: number;
  startedTurn: number;
  attempt: number;
  costPaid: boolean;
  status: "planned" | "running" | "complete";
  /** V7 experiments keep their player-selected setup until the scheduled work resolves. */
  researchOutcome?: {
    result?: "positive" | "negative" | "trend" | "contradictory" | "reversed";
    modelId?: string;
    modelName?: string;
    dose?: string;
    durationHours?: number;
    intervention?: string;
    phenotypeReversed?: boolean;
  };
};

export type TechnicalOutcome = "成功" | "技术失败" | "污染";
export type ScientificOutcome = "清晰阳性" | "弱阳性" | "阴性" | "矛盾" | "意外发现";
export type ExperimentOutcomeRecord = {
  id: string;
  turn: number;
  experimentId: string;
  technical: TechnicalOutcome;
  scientific?: ScientificOutcome;
  successChance: number;
  roll: number;
  detail: string;
};

export type JournalDefinition = {
  id: string;
  name: string;
  language: "英文" | "中文";
  publicationClass: "SCI" | "SCI_HIGH" | "CHINESE_CORE" | "CHINESE_OTHER";
  metricLabel: string;
  metricValue: number | null;
  metricYear: number;
  metricSource: string;
  reviewDays: [number, number];
  reviewEstimate: boolean;
  apc: number;
  scope: string[];
  qualityNeed: number;
  completenessNeed: number;
  recommendedFigures: [number, number];
  requiredEvidence: EvidenceKey[];
  submissionProfile: string;
  officialDisplayItemLimit: number | null;
  figurePolicyKind: "official-limit" | "game-target";
};

export type ResearchProgram = {
  id: string;
  domain: string;
  name: string;
  summary: string;
};

export type ResearchReference = {
  id: string;
  title: string;
  year: number;
  pmid?: string;
  doi?: string;
};

export type FigureCoverage = EvidenceKey[];

export type ManuscriptStatus = "draft" | "submitted" | "under_review" | "revision" | "rejected" | "accepted";
export type ReviewRequestKind = "evidence" | "analysis" | "figure" | "writing";
export type ReviewStrategy = "complete" | "key-only" | "rebuttal" | null;
export type ReviewRequest = {
  id: string;
  kind: ReviewRequestKind;
  text: string;
  evidence?: EvidenceKey;
  baseline: number;
  target: number;
  suggestedAction: string;
  suggestedExperimentIds: string[];
  essential: boolean;
  completed: boolean;
};
export type Manuscript = {
  id: string;
  projectRunId: string;
  title: string;
  status: ManuscriptStatus;
  journalId: string | null;
  submittedTurn: number | null;
  decisionTurn: number | null;
  acceptedTurn: number | null;
  quality: number;
  completeness: number;
  revisionProgress: number;
  requirements: string[];
  reviewRequests: ReviewRequest[];
  reviewDeadlineTurn: number | null;
  responseProgress: number;
  reviewStrategy: ReviewStrategy;
  publicationClass: JournalDefinition["publicationClass"] | null;
};

export type ExperimentSuggestion = {
  id: string;
  kind: "experiment" | "activity";
  label: string;
  reason: string;
  section: "pilot" | "formal" | "omics" | "paper";
};

export type SuccessFactor = { label:string; value:number };
export type SuccessBreakdown = { chance:number; factors:SuccessFactor[] };

export type GraduationRule = {
  id: string;
  name: string;
  description: string;
  sci: number;
  highSci: number;
  chineseCore: number;
};

export type ResourceDelta = Partial<Record<ResourceKey, number>> & {
  funding?: number;
  relation?: number;
  pressure?: number;
  integrity?: number;
  stats?: Partial<Record<StatKey, number>>;
};
export type EventChoice = { label: string; hint: string; effect: ResourceDelta; flag?: string };
export type EventNode = {
  id: string;
  category: "实验" | "导师" | "人情" | "生活" | "伦理";
  speaker: string;
  icon: string;
  title: string;
  text: string;
  choices: EventChoice[];
  minTurn: number;
  requiredFlag?: string;
};

export type EndingDefinition = {
  id: string;
  title: string;
  family: "毕业" | "学术" | "就业" | "生活" | "荒诞" | "失败";
  description: string;
};

export type PlanItem = {
  id: string;
  kind: "experiment" | "activity";
  refId: string;
  label: string;
  icon: string;
  slots: number;
  targetId?: string;
  experimentRunId?: string;
  locked?: boolean;
};

export type FundingLedger = {
  initial: number;
  balance: number;
  creditLimit: number;
  totalSpent: number;
  debtTurns: number;
};

export type TurnResult = {
  id: string;
  icon: string;
  title: string;
  result: string;
  detail: string;
  tone: "good" | "neutral" | "bad";
};

export type RunLog = { turn: number; title: string; text: string; type: string };

export type GameStateV6 = {
  /** V6 is a real historical shape; do not widen this to the current version. */
  schemaVersion: 6;
  seed: number;
  turn: number;
  maxTurns: 104;
  candidateId: string;
  advisorId: string;
  graduationRuleId: string;
  stats: Record<StatKey, number>;
  resources: Record<ResourceKey, number>;
  funding: FundingLedger;
  familiarity: Record<string, number>;
  lab: LabMember[];
  projects: ProjectRun[];
  currentProjectRunId: string;
  activeExperiments: ExperimentRun[];
  plan: PlanItem[];
  overtimeSlots: number;
  manuscripts: Manuscript[];
  pendingEventId: string | null;
  eventCooldown: number;
  flags: string[];
  relation: number;
  integrity: number;
  pressure: number;
  minSan: number;
  totalExperiments: number;
  technicalFailures: number;
  negativeResults: number;
  surprises: number;
  totalSubmissions: number;
  finished: boolean;
  endingId: string | null;
  logs: RunLog[];
};

/** Current runtime/persisted state. V7 is additive so old data can be migrated safely. */
export type GameStateV7 = Omit<GameStateV6, "schemaVersion"> & {
  schemaVersion: 7;
  /** Reserved for the staged experiment-system migration. */
  experimentSystemVersion?: 1;
  /** Additive index for the research engine; ProjectRun.research remains the source of truth. */
  research?: { version: 1; projects: Record<string, ProjectResearchState> };
  /** Additive failure/incident state; absent fields remain valid for old saves. */
  failureState?: ExperimentFailureState;
  pendingIncidents?: IncidentRecord[];
  /** True once an incident resolution carries a negative-integrity risk. */
  negativeIntegrity?: boolean;
};

export type SaveEnvelope = {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  revision: number;
  updatedAt: string;
  state: GameStateV7;
};

export type ProjectSetup = Pick<ProjectDefinition, "domain" | "title" | "intervention" | "model" | "target" | "route"> & {
  definitionId?: string;
  programId?: string;
  stage?: ProjectDefinition["stage"];
  question?: string;
  knowledgeGap?: string;
  mechanismAxis?: string;
  requiredEvidence?: EvidenceKey[];
  referenceIds?: string[];
  difficulty: number;
  novelty: number;
  truthBias: number;
  recommendedExperiments: string[];
  mode?: ProjectRun["mode"];
};

/** Legacy V5 persisted state. Kept as a distinct type for migration and fixtures. */
export type GameStateV5 = Omit<GameStateV6, "schemaVersion"> & { schemaVersion: 5 | 7 };
/** Legacy V4 persisted state. Kept as a distinct type for migration and fixtures. */
export type GameStateV4 = Omit<GameStateV6, "schemaVersion"> & { schemaVersion: 4 | 7 };

export type EngineResult<T = GameStateV4> = { ok: true; state: T } | { ok: false; error: string };
