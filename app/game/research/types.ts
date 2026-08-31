/** The two top-level research routes planned for the V7 experiment centre. */
import type { AnimalStudy } from "../experiments/animal";

export type ExperimentRoute = "cell" | "animal";

export type CellStageId = "model" | "phenotype" | "molecular" | "omics" | "causal" | "advanced";
export type AnimalStageId = "design" | "dosing" | "phenotype" | "sampling" | "histology" | "molecular" | "omics" | "causal";

/** Evidence classes describe what a result can support, not how expensive it was. */
export type EvidenceClass = "exploration" | "phenotype" | "association" | "causal" | "strong";
export type Role = "condition" | "phenotype" | "molecular" | "mechanism" | "causality" | "animal" | "replication" | "omics";
export type Dimension = "phenotype" | "molecular" | "mechanism" | "causality" | "animal" | "reproducibility";

export type CellModelInstance = {
  id: string;
  name: string;
  professionalName?: string;
  organ?: string;
  suitability?: string;
  selected: boolean;
  established: boolean;
  dose?: string;
  durationHours?: number;
};

export type SampleLot = {
  id: string;
  source: "cell" | "animal" | "serum" | "tissue" | "other";
  label: string;
  amount: number;
  unit: "well" | "mg" | "µL" | "sample";
  quality: number;
  reservedBy?: string[];
};

export type MechanismCandidate = {
  id: string;
  label: string;
  target?: string;
  pathway?: string;
  sourceExperimentIds: string[];
  confidence: "low" | "medium" | "high";
  interventionTested: boolean;
  rescueObserved: boolean;
};

export type EvidenceItem = {
  id: string;
  experimentId: string;
  evidenceClass: EvidenceClass;
  role: Role;
  dimension: Dimension;
  level: number;
  summary: string;
  canTell: string;
  cannotTell: string;
  result?: "positive" | "negative" | "trend" | "contradictory" | "reversed";
  turn?: number;
  modelId?: string;
  mechanismCandidateId?: string;
  intervention?: string;
  phenotypeReversed?: boolean;
};

export type OmicsDataset = {
  id: string;
  kind: "rna-seq" | "proteomics" | "metabolomics" | "microbiome" | "single-cell";
  status: "raw" | "analyzed" | "candidate-pathways";
  sampleLotIds: string[];
  candidatePathways: string[];
  /** Raw data never counts as causal evidence. */
  contributesToMechanism: false | "association";
};

export type UnlockRule =
  | { all: UnlockRule[] }
  | { any: UnlockRule[] }
  | { not: UnlockRule }
  | { experimentCompleted: string }
  | { evidenceAtLeast: { dimension: Dimension; level: number } }
  | { hasCellModel: string }
  | { hasSelectedCellModel: true }
  | { hasConfiguredCellModel: true }
  | { hasEstablishedCellModel: true }
  | { hasMechanismCandidate: true }
  | { route: ExperimentRoute };

export type ProjectResearchState = {
  /** `route` is retained for V6/V7 save compatibility.  New projects may work
   * in both routes, so it must never be treated as an exclusive research mode. */
  route: ExperimentRoute;
  enabledRoutes?: ExperimentRoute[];
  activeStage: CellStageId | AnimalStageId;
  cellModels: CellModelInstance[];
  selectedModelId: string | null;
  evidenceItems: EvidenceItem[];
  omicsDatasets: OmicsDataset[];
  sampleLots: SampleLot[];
  mechanismCandidates: MechanismCandidate[];
  completedExperimentIds: string[];
  /** Additive animal-route state. Optional so pre-animal V7 saves remain valid. */
  animalStudies?: AnimalStudy[];
  activeAnimalStudyId?: string | null;
  animalCompletedExperimentIds?: string[];
  /** Kept as a cache for UI, but always derivable from evidenceItems. */
  evidenceChain?: EvidenceChain;
};

export type EvidenceChain = {
  phenotype: number;
  molecular: number;
  mechanism: number;
  causality: number;
  animal: number;
  reproducibility: number;
  max: number;
};

export type GameMessage = {
  id: string;
  tone: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  nextExperimentIds?: string[];
  /** Optional bilingual rendering payload used by the animal-route UI. */
  copy?: {
    zh: { title: string; body: string };
    en: { title: string; body: string };
  };
};
