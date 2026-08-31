"use client";
import { useMemo, useState } from "react";
import type { GameStateV4, ProjectRun } from "../../game/types";
import { CELL_EXPERIMENTS, type ResearchExperimentDefinition } from "../../game/experiments/catalog";
import { ANIMAL_EXPERIMENTS, type AnimalExperimentDefinition } from "../../game/experiments/animal";
import { animalAvailability, advanceAnimalExperiment, runAnimalAssay, startAnimalExperiment, collectAnimalSamplesForProject } from "../../game/experiments/animal-engine";
import { availability } from "../../game/experiments/rules";
import { recommendations, type ResearchExperimentOutcome } from "../../game/experiments/results";
import { scheduleResearchExperiment } from "../../game/engine";
import { createResearchState, deriveEvidenceChain } from "../../game/research/evidence";
import type { AnimalStageId, CellStageId, ExperimentRoute } from "../../game/research/types";
import { useLocale } from "../../game/i18n";
import { ANIMAL_STAGES, CELL_STAGES, ROUTE_COPY, copy } from "./copy";
import { RouteSelector } from "./RouteSelector";
import { StageStepper } from "./StageStepper";
import { ExperimentCard, type ExperimentStatus } from "./ExperimentCard";
import { ExperimentDetailModal } from "./ExperimentDetailModal";
import { EvidenceChainPanel } from "./EvidenceChainPanel";
import { ExperimentAssistant } from "./ExperimentAssistant";

export { RouteSelector } from "./RouteSelector";
export { StageStepper } from "./StageStepper";
export { ExperimentCard } from "./ExperimentCard";
export { ExperimentDetailModal } from "./ExperimentDetailModal";
export { EvidenceChainPanel } from "./EvidenceChainPanel";
export { ExperimentAssistant } from "./ExperimentAssistant";

export function ExperimentCenter({ state, onChange, notify }: { state: GameStateV4; onChange: (state: GameStateV4) => void; notify: (message: string) => void }) {
  const { locale } = useLocale(); const project = state.projects.find((item) => item.runId === state.currentProjectRunId) as ProjectRun; const [route, setRoute] = useState<ExperimentRoute | null>(null); const [stage, setStage] = useState<CellStageId | AnimalStageId>(project.research?.activeStage ?? "model"); const [selected, setSelected] = useState<ResearchExperimentDefinition | null>(null);
  const research = project.research ?? createResearchState("cell"); const activeRoute = route ?? research.route; const completed = research.completedExperimentIds ?? []; const chain = deriveEvidenceChain(research); const availableRecommendations = useMemo(() => activeRoute === "cell" ? recommendations(project) : [], [activeRoute, project]); const stageList = activeRoute === "cell" ? CELL_STAGES : ANIMAL_STAGES; const visibleExperiments = activeRoute === "cell" ? CELL_EXPERIMENTS.filter((item) => item.stage === stage) : [];
  const schedule = (outcome: ResearchExperimentOutcome) => { if (!selected) return; const result = scheduleResearchExperiment(state, selected.id, outcome); if (!result.ok) { notify(result.error); return; } onChange(result.state); setSelected(null); };
  const activeStudy = research.activeAnimalStudyId ? research.animalStudies?.find((study) => study.id === research.activeAnimalStudyId) : undefined;
  const animalStage = `animal-${stage}` as AnimalExperimentDefinition["stage"];
  const animalCards = ANIMAL_EXPERIMENTS.filter((item) => item.stage === animalStage);
  const createAnimalStudy = () => {
    const result = startAnimalExperiment(project, `animal-study-${state.seed}-${(research.animalStudies?.length ?? 0) + 1}`, {
      species: "小鼠", strain: "C57BL/6", sex: "mixed", ageWeeks: 8, groups: ["Control", "Model", "Treatment"], animalCount: 18,
      intervention: project.intervention, purpose: "descriptive", adaptationDays: 3,
      sampleInventory: [{ id: "serum", kind: "serum", label: "血清", amount: 120, unit: "µL", quality: 1 }, { id: "liver", kind: "tissue", label: "肝脏", amount: 420, unit: "mg", quality: 1 }],
    });
    if (result.ok) onChange({ ...state, projects: state.projects.map((item) => item.runId === project.runId ? result.project : item) }); else notify(result.error);
  };
  const runAnimal = (definition: AnimalExperimentDefinition) => {
    if (!activeStudy) return;
    let result = definition.id === "animal-sampling"
      ? collectAnimalSamplesForProject(project, activeStudy.id)
      : animalAvailability(project, definition.id).available
        ? runAnimalAssay(project, activeStudy.id, definition.id, definition.id === "animal-rescue" ? { result: "reversed", intervention: "候选通路干预", phenotypeReversed: true } : "positive")
        : null;
    if (result?.ok) onChange({ ...state, projects: state.projects.map((item) => item.runId === project.runId ? result!.project : item) }); else if (result && !result.ok) notify(result.error);
  };
  const advanceAnimal = () => { if (!activeStudy) return; const result = advanceAnimalExperiment(project, activeStudy.id); if (result.ok) onChange({ ...state, projects: state.projects.map((item) => item.runId === project.runId ? result.project : item) }); else notify(result.error); };
  if (!route) return <RouteSelector locale={locale} onSelect={(next) => { setRoute(next); setStage(next === "cell" ? (project.research?.activeStage ?? "model") : "design"); }} />;
  const routeCopy = ROUTE_COPY[activeRoute][locale === "en-US" ? "en" : "zh"]; const isAnimal = activeRoute === "animal";
  return <section className="experiment-center"><div className="experiment-center-toolbar"><button type="button" className="v7-back-route" onClick={() => setRoute(null)}>← {copy(locale, "返回路线选择", "Back to routes")}</button><span>{ROUTE_COPY[activeRoute].icon} {routeCopy.name}</span></div><StageStepper route={activeRoute} activeStage={stage} completedIds={completed} locale={locale} onSelect={(next) => setStage(next)} /><div className="experiment-center-main"><div className="experiment-stage-content"><div className="v7-stage-heading"><div><p className="eyebrow">{copy(locale, "当前阶段", "CURRENT STAGE")}</p><h2>{stageList.find((item) => item.id === stage)?.[locale === "en-US" ? "en" : "zh"]}</h2><p>{stageList.find((item) => item.id === stage)?.[locale === "en-US" ? "detailEn" : "detailZh"]}</p></div><span className={`v7-stage-state ${isAnimal ? "planning" : "live"}`}>{isAnimal ? `🔓 ${copy(locale, "按方案阶段执行", "Run by protocol phase")}` : `🔓 ${copy(locale, "排入两周计划后执行", "Scheduled work resolves with the turn")}`}</span></div>{isAnimal ? <div className="v7-animal-workbench">{!activeStudy ? <div className="animal-planning-panel"><div className="animal-planning-icon">🐁</div><div><h3>{copy(locale, "先建立动物实验方案", "Start an animal study protocol")}</h3><p>{copy(locale, "默认创建小鼠、对照/模型/处理三组，并建立有限血清和肝脏样本库存。", "Creates a mouse study with control/model/treatment groups and finite serum and liver inventory.")}</p></div><button type="button" className="v7-card-action" onClick={createAnimalStudy}>{copy(locale, "建立方案", "Create protocol")}</button></div> : <><div className="animal-study-status"><b>{copy(locale, "当前方案", "Active protocol")}: {activeStudy.id}</b><span>{copy(locale, "生命周期", "Lifecycle")}: {activeStudy.lifecycle} · {copy(locale, "样本", "Samples")}: {activeStudy.samples.reduce((sum, item) => sum + item.available, 0)}</span><button type="button" className="v7-card-action" onClick={advanceAnimal}>{copy(locale, "推进阶段", "Advance phase")}</button></div><div className="v7-experiment-grid">{animalCards.map((definition) => { const gate = animalAvailability(project, definition.id); const done = activeStudy.completedExperimentIds.includes(definition.id); return <article className={`v7-experiment-card ${done ? "status-complete" : gate.available ? "status-available" : "status-locked"}`} key={definition.id}><div className="v7-card-top"><span className="v7-status">{done ? "✓" : gate.available ? "🔓" : "🔒"}</span><div><h3>{locale === "en-US" ? definition.copy.en.commonName : definition.copy.zh.commonName}</h3><small>{locale === "en-US" ? definition.copy.en.professionalName : definition.copy.zh.professionalName}</small></div></div><p>{locale === "en-US" ? definition.copy.en.description : definition.copy.zh.description}</p><small className="v7-lock-reason">{gate.available ? copy(locale, "完成后形成有限证据；不能单独证明完整机制。", "Creates bounded evidence; cannot prove a complete mechanism alone.") : gate.reason}</small><button type="button" className="v7-card-action" disabled={!gate.available || done} onClick={() => runAnimal(definition)}>{done ? copy(locale, "已完成", "Completed") : copy(locale, "执行实验", "Run assay")}</button></article>; })}</div></>}</div> : <div className="v7-experiment-grid">{visibleExperiments.map((experiment) => { const gate = availability(project, experiment.id); const isComplete = completed.includes(experiment.id); const isRecommended = availableRecommendations.some((item) => item.id === experiment.id); const status: ExperimentStatus = isComplete ? "complete" : isRecommended ? "recommended" : gate.available ? "available" : "locked"; return <ExperimentCard key={experiment.id} experiment={experiment} locale={locale} status={status} lockReason={gate.reason} onOpen={() => setSelected(experiment)} />; })}</div>}</div><div className="experiment-center-sidebar"><EvidenceChainPanel chain={chain} locale={locale} />{!isAnimal && <ExperimentAssistant recommendations={availableRecommendations} locale={locale} onJump={(next) => setStage(next)} />}</div></div>{selected && <ExperimentDetailModal experiment={selected} locale={locale} onClose={() => setSelected(null)} onComplete={schedule} />}</section>;
}

export default ExperimentCenter;
