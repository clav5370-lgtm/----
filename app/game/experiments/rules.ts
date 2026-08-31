import type { ProjectRun } from "../types";
import { getExperimentDefinition, type ResearchExperimentDefinition } from "./catalog";
import type { ProjectResearchState, UnlockRule } from "../research/types";

const emptyResearch = (): ProjectResearchState => ({ route: "cell", enabledRoutes: ["cell", "animal"], activeStage: "model", cellModels: [], selectedModelId: null, evidenceItems: [], omicsDatasets: [], sampleLots: [], mechanismCandidates: [], completedExperimentIds: [], animalStudies: [], activeAnimalStudyId: null, animalCompletedExperimentIds: [] });
export const researchForProject = (project: Pick<ProjectRun, "research">): ProjectResearchState => project.research ?? emptyResearch();

export function evaluateUnlockRule(rule: UnlockRule, research: ProjectResearchState): boolean {
  if ("all" in rule) return rule.all.every((child) => evaluateUnlockRule(child, research));
  if ("any" in rule) return rule.any.some((child) => evaluateUnlockRule(child, research));
  if ("not" in rule) return !evaluateUnlockRule(rule.not, research);
  if ("experimentCompleted" in rule) return research.completedExperimentIds.includes(rule.experimentCompleted);
  if ("evidenceAtLeast" in rule) return research.evidenceItems.some((item) => item.dimension === rule.evidenceAtLeast.dimension && item.level >= rule.evidenceAtLeast.level);
  if ("hasCellModel" in rule) return research.cellModels.some((model) => model.id === rule.hasCellModel && model.established);
  if ("hasSelectedCellModel" in rule) return Boolean(research.selectedModelId && research.cellModels.some((model) => model.id === research.selectedModelId && model.selected));
  if ("hasConfiguredCellModel" in rule) return Boolean(research.selectedModelId && research.cellModels.some((model) => model.id === research.selectedModelId && model.selected && Boolean(model.dose) && typeof model.durationHours === "number" && Number.isFinite(model.durationHours) && model.durationHours > 0));
  if ("hasEstablishedCellModel" in rule) return Boolean(research.selectedModelId && research.cellModels.some((model) => model.id === research.selectedModelId && model.selected && model.established));
  if ("hasMechanismCandidate" in rule) return research.mechanismCandidates.length > 0;
  return (research.enabledRoutes ?? [research.route]).includes(rule.route);
}

export type ExperimentAvailability = { available: boolean; experiment: ResearchExperimentDefinition | null; reason?: string };

export function availability(project: Pick<ProjectRun, "research">, experimentId: string): ExperimentAvailability {
  const experiment = getExperimentDefinition(experimentId);
  if (!experiment) return { available: false, experiment: null, reason: "未知实验。" };
  const research = researchForProject(project);
  if (!(research.enabledRoutes ?? [research.route]).includes(experiment.route)) return { available: false, experiment, reason: "当前研究路线不匹配。" };
  if (!evaluateUnlockRule(experiment.prerequisites, research)) return { available: false, experiment, reason: "前置条件尚未完成。" };
  return { available: true, experiment };
}

export const isExperimentAvailable = (project: Pick<ProjectRun, "research">, experimentId: string) => availability(project, experimentId).available;
export const getExperimentAvailability = availability;
