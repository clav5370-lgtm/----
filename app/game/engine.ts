import {
  ACTIVITIES,
  ADVISORS,
  CANDIDATES,
  ENDINGS,
  EVENTS,
  EXPERIMENTS,
  GRADUATION_RULES,
  JOURNALS,
  NPC_POOL,
  PROJECTS,
} from "./content";
import {
  SAVE_SCHEMA_VERSION,
  type ActivityId,
  type EngineResult,
  type EventChoice,
  type EvidenceKey,
  type ExperimentDefinition,
  type ExperimentOutcomeRecord,
  type ExperimentRun,
  type GameStateV4,
  type JournalDefinition,
  type Manuscript,
  type ReviewRequest,
  type ReviewStrategy,
  type SuccessBreakdown,
  type PlanItem,
  type ProjectRun,
  type ProjectDefinition,
  type ProjectSetup,
  type ScientificOutcome,
  type TurnResult,
} from "./types";
import { getExperimentDefinition, type ResearchExperimentDefinition } from "./experiments/catalog";
import { availability as researchAvailability } from "./experiments/rules";
import { completeResearchExperiment, type ResearchExperimentOutcome } from "./experiments/results";
import { beginFailureIncident } from "./experiments/failure-engine";

export function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let n = value;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const uid = (prefix: string, stateSeed: number, sequence: number) => `${prefix}-${stateSeed.toString(36)}-${sequence.toString(36)}`;
const currentProject = (state: GameStateV4) => state.projects.find((project) => project.runId === state.currentProjectRunId)!;
const currentManuscript = (state: GameStateV4) => state.manuscripts.find((paper) => paper.projectRunId === state.currentProjectRunId)!;

export function shuffledIndexes(seed: number, length: number) {
  const rng = mulberry32(seed);
  const values = Array.from({ length }, (_, index) => index);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values;
}

export function getCandidateSet(seed: number, refresh: 0 | 1) {
  const indexes = shuffledIndexes(seed ^ 0x51f15e, CANDIDATES.length);
  return indexes.slice(refresh * 3, refresh * 3 + 3).map((index) => CANDIDATES[index]);
}

export function getProjectChoices(seed: number) {
  const entryProjects=PROJECTS.filter(project=>project.stage<=2);
  const shuffled=shuffledIndexes(seed ^ 0x91c33d,entryProjects.length).map(index=>entryProjects[index]);
  const selected:typeof PROJECTS=[];const programs=new Set<string>();
  for(const project of shuffled){if(programs.has(project.programId))continue;selected.push(project);programs.add(project.programId);if(selected.length===3)break;}
  return selected;
}

export function getNextProjectChoices(seed:number,current:Pick<ProjectDefinition,"programId"|"stage"|"id">){
  const continuation=PROJECTS.filter(project=>project.programId===current.programId&&project.stage>current.stage).sort((a,b)=>a.stage-b.stage).slice(0,2);
  const alternatives=shuffledIndexes(seed ^ 0x4ac31,PROJECTS.length).map(index=>PROJECTS[index]).filter(project=>project.id!==current.id&&project.stage<=2&&project.programId!==current.programId);
  return [...continuation,...alternatives].slice(0,3);
}

export function buildCustomProject(input: Pick<ProjectSetup,"domain"|"model"|"intervention"|"target"|"route">): ProjectSetup {
  const variation = Object.values(input).join("").split("").reduce((sum,character)=>sum+character.charCodeAt(0),0);
  return {
    ...input,
    programId:"custom-disabled",
    stage:1,
    title: `${input.intervention}在${input.model}中的${input.target}作用研究`,
    question:`${input.intervention}是否通过${input.target}改变${input.model}？`,
    knowledgeGap:"自定义课题功能当前关闭。",
    mechanismAxis:input.target,
    requiredEvidence:["phenotype","molecular","replication"],
    referenceIds:[],
    difficulty: 58 + variation % 30,
    novelty: 64 + Math.floor(variation / 7) % 30,
    truthBias: .46 + (variation % 17) / 100,
    recommendedExperiments: ["cell-toxicity", "pcr", "wb", input.route.includes("单细胞")?"single-cell":"transcriptomics", "bioinformatics"],
    mode: "custom",
  };
}

function makeProjectRun(seed: number, setup: ProjectSetup, index: number, inherited?: ProjectRun): ProjectRun {
  const inheritedEvidence = inherited
    ? Object.fromEntries(Object.entries(inherited.evidence).map(([key, value]) => [key, Math.min(1, value)])) as ProjectRun["evidence"]
    : { phenotype:0, biochemical:0, histology:0, molecular:0, mechanism:0, omics:0, causality:0, replication:0 };
  return {
    id: setup.definitionId ?? `custom-${seed}`,
    runId: uid("project", seed, index),
    programId:setup.programId??"custom-disabled",
    stage:setup.stage??1,
    question:setup.question??`${setup.intervention}是否在${setup.model}中产生可重复效应？`,
    knowledgeGap:setup.knowledgeGap??"需要建立剂量—效应与机制证据。",
    mechanismAxis:setup.mechanismAxis??setup.target,
    requiredEvidence:setup.requiredEvidence??["phenotype","molecular","replication"],
    referenceIds:setup.referenceIds??[],
    domain: setup.domain,
    title: setup.title,
    intervention: setup.intervention,
    model: setup.model,
    target: setup.target,
    route: setup.route,
    difficulty: setup.difficulty,
    novelty: setup.novelty,
    truthBias: setup.truthBias,
    recommendedExperiments: setup.recommendedExperiments,
    mode: setup.mode ?? "base",
    evidence: inheritedEvidence,
    experimentHistory: [],
    figures: inherited ? Math.min(1, inherited.figures) : 0,
    figureCoverage:inherited?[...inherited.figureCoverage.slice(0,1)]:[],
    writingProgress: 0,
    thesisProgress: 0,
    active: true,
  };
}

function makeManuscript(project: ProjectRun, sequence: number): Manuscript {
  return {
    id: `paper-${project.runId}-${sequence}`,
    projectRunId: project.runId,
    title: project.title,
    status: "draft",
    journalId: null,
    submittedTurn: null,
    decisionTurn: null,
    acceptedTurn: null,
    quality: 0,
    completeness: 0,
    revisionProgress: 0,
    requirements: [],
    reviewRequests: [],
    reviewDeadlineTurn: null,
    responseProgress: 0,
    reviewStrategy: null,
    publicationClass: null,
  };
}

export function createRun(seed: number, candidateId: string, projectSetup: ProjectSetup): GameStateV4 {
  const rng = mulberry32(seed ^ 0x7e57);
  const candidate = CANDIDATES.find((item) => item.id === candidateId) ?? CANDIDATES[0];
  const advisor = ADVISORS[Math.floor(rng() * ADVISORS.length)];
  const graduationRule = GRADUATION_RULES[Math.floor(rng() * GRADUATION_RULES.length)];
  const rosterSize = 3 + Math.floor(rng() * 8);
  const roster = shuffledIndexes(seed ^ 0x1ab, NPC_POOL.length).slice(0, rosterSize).map((index) => {
    const member = structuredClone(NPC_POOL[index]);
    member.leaveTurn = 36 + Math.floor(rng() * 60);
    return member;
  });
  const project = makeProjectRun(seed, projectSetup, 1);
  const initialFunding = Math.round(55 + advisor.wealth * .85 - projectSetup.difficulty * .16);
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    seed,
    turn: 1,
    maxTurns: 104,
    candidateId: candidate.id,
    advisorId: advisor.id,
    graduationRuleId: graduationRule.id,
    stats: { ...candidate.stats },
    resources: { energy: 82, san: candidate.trait === "夜行动物" ? 70 : 78, trust: 52 },
    funding: { initial: initialFunding, balance: initialFunding, creditLimit: Math.round(initialFunding * .2), totalSpent: 0, debtTurns: 0 },
    familiarity: {},
    lab: roster,
    projects: [project],
    currentProjectRunId: project.runId,
    activeExperiments: [],
    plan: [],
    overtimeSlots: 0,
    manuscripts: [makeManuscript(project, 1)],
    pendingEventId: null,
    eventCooldown: 0,
    flags: [],
    relation: 32,
    integrity: 100,
    pressure: advisor.pressure * .35,
    minSan: 78,
    totalExperiments: 0,
    technicalFailures: 0,
    negativeResults: 0,
    surprises: 0,
    totalSubmissions: 0,
    finished: false,
    endingId: null,
    logs: [{ turn:1, title:"研一入学", text:`加入${advisor.name}课题组，培养方案：${graduationRule.description}。`, type:"start" }],
  };
}

export const planCapacity = (state: GameStateV4) => 5 + state.overtimeSlots;
export const plannedSlots = (state: GameStateV4) => state.plan.reduce((sum, item) => sum + item.slots, 0);

export function setOvertime(state: GameStateV4, slots: 0 | 1 | 2): EngineResult {
  if (plannedSlots(state) > 5 + slots) return { ok:false, error:"请先移除超出新容量的安排。" };
  return { ok:true, state:{ ...state, overtimeSlots:slots } };
}

export function clearPlan(state: GameStateV4): GameStateV4 {
  const removable = state.plan.filter((item)=>!item.locked);
  const plannedRunIds = new Set(removable.map((item) => item.experimentRunId).filter(Boolean));
  return {
    ...state,
    plan: state.plan.filter((item)=>item.locked),
    activeExperiments: state.activeExperiments.filter((run) => run.costPaid || !plannedRunIds.has(run.id)),
  };
}

export function removePlanItem(state: GameStateV4, planId: string): GameStateV4 {
  const item = state.plan.find((plan) => plan.id === planId);
  if (item?.locked) return state;
  const next = { ...state, plan:state.plan.filter((plan) => plan.id !== planId) };
  if (item?.experimentRunId) {
    const run = state.activeExperiments.find((entry) => entry.id === item.experimentRunId);
    if (run && !run.costPaid) next.activeExperiments = state.activeExperiments.filter((entry) => entry.id !== run.id);
  }
  return next;
}

export function technicalSuccessChance(state: GameStateV4, experiment: ExperimentDefinition) {
  return technicalSuccessBreakdown(state,experiment).chance;
}

export function technicalSuccessBreakdown(state: GameStateV4, experiment: ExperimentDefinition): SuccessBreakdown {
  const candidate = CANDIDATES.find((item) => item.id === state.candidateId)!;
  const advisor = ADVISORS.find((item) => item.id === state.advisorId)!;
  const familiarity = state.familiarity[experiment.id] ?? 0;
  const skill = state.stats[experiment.skill];
  const skillEffect = (skill-50)*.003;
  const familiarityEffect = familiarity*.0012;
  const energy = state.resources.energy;
  const fatigue = energy>=70?0:energy>=40?-(70-energy)*.002:-(.06+(40-energy)*.004);
  const pressureEffect = -Math.max(0,state.pressure-60)*.0015;
  const trait = candidate.trait === "稳准快" ? .06 : candidate.trait === "动物朋友" && experiment.family === "animal" ? .08 : candidate.trait === "设备通" ? .05 : 0;
  const flaw = candidate.flaw === "手残" ? -.06 : candidate.flaw === "新人事故" && familiarity === 0 ? -.06 : 0;
  const advisorEffect = advisor.experimentBonus*.003;
  const pilot = state.flags.includes("pilot-bonus") ? .08 : 0;
  const factors=[
    {label:"基础难度",value:experiment.baseSuccess},
    {label:`${experiment.skill==="wet"?"湿实验":experiment.skill==="data"?"数据":experiment.skill==="theory"?"理论":"角色"} ${skill}`,value:skillEffect},
    {label:"技术熟练度",value:familiarityEffect},
    {label:"导师带教",value:advisorEffect},
    {label:"角色特质",value:trait+flaw},
    {label:"预实验",value:pilot},
    {label:"当前精力",value:fatigue},
    {label:"当前压力",value:pressureEffect},
  ].filter(factor=>Math.abs(factor.value)>.0001);
  return {chance:clamp(factors.reduce((sum,factor)=>sum+factor.value,0),.25,.95),factors};
}

export function nextExperimentSuggestions(state:GameStateV4) {
  const project=currentProject(state);const suggestions:Array<{id:string;kind:"experiment"|"activity";label:string;reason:string;section:"pilot"|"formal"|"omics"|"paper"}>=[];
  const add=(id:string,reason:string,section:"pilot"|"formal"|"omics"|"paper",kind:"experiment"|"activity"="experiment")=>{if(suggestions.some(item=>item.id===id))return;const label=kind==="experiment"?EXPERIMENTS.find(item=>item.id===id)?.name:ACTIVITIES[id as ActivityId]?.name;if(label)suggestions.push({id,kind,label,reason,section});};
  if(!project.evidence.phenotype)add(project.model.includes("小鼠")||project.model.includes("大鼠")||project.model.includes("斑马鱼")||project.model.includes("动物")?"animal-model":"cell-study","先建立处理体系，确认干预是否产生可观察的表型变化。","formal");
  if(project.evidence.phenotype&&!project.evidence.molecular)add("pcr","已有表型，但还缺少基因表达层面的解释。","formal");
  if((project.model.includes("动物")||project.model.includes("器官")||project.evidence.phenotype)&&!project.evidence.histology)add("he","补充组织层面的直接证据，减少审稿质疑。","formal");
  if(project.evidence.molecular&&!project.evidence.mechanism)add("wb","验证候选蛋白和通路是否真的发生变化。","formal");
  const basic=[project.evidence.phenotype,project.evidence.biochemical,project.evidence.histology,project.evidence.molecular,project.evidence.mechanism].filter(Boolean).length;
  if(basic>=2&&!project.evidence.omics)add(project.route.includes("单细胞")?"single-cell":"transcriptomics","基础证据已经成形，可以从全局寻找新机制。","omics");
  if(project.evidence.omics&&!project.evidence.mechanism)add("bioinformatics","组学数据需要质控和通路解释才能形成结论。","omics");
  if(project.experimentHistory.length&&!project.evidence.replication){const latest=[...project.experimentHistory].reverse().find(item=>item.technical==="成功");if(latest)add(latest.experimentId,"关键结论还缺独立重复，投稿时很容易被追问。",EXPERIMENTS.find(item=>item.id===latest.experimentId)?.family==="omics"?"omics":"formal");}
  if(project.experimentHistory.length&&!project.figures){add("analysis","先整理和统计已有结果。","paper","activity");add("figure","把结果做成可投稿的 Figure。","paper","activity");}
  if(!suggestions.length)add("writing","证据较完整，可以集中推进论文写作。","paper","activity");
  return suggestions.slice(0,3);
}

/** The turn planner speaks the original ExperimentDefinition shape.  V7 cards
 * are adapted here so they use exactly the same time, money, energy and
 * carry-over loop instead of completing immediately in the UI. */
function scheduledResearchDefinition(definition: ResearchExperimentDefinition): ExperimentDefinition {
  const evidence: EvidenceKey = definition.resultRule.dimension === "phenotype" ? "phenotype"
    : definition.resultRule.dimension === "molecular" ? "molecular"
      : definition.resultRule.dimension === "mechanism" ? "mechanism"
        : definition.resultRule.dimension === "causality" ? "causality" : "omics";
  return {
    id: definition.id, name: definition.name, short: definition.professionalName ?? definition.name,
    icon: "🔬", family: "cell", description: definition.description,
    slots: Math.max(1, Math.ceil(definition.time)), cost: Math.max(1, Math.ceil(definition.cost / 1000)),
    energy: Math.max(4, Math.ceil(definition.time * 4)), baseSuccess: .82, skill: definition.stage === "omics" ? "data" : "wet",
    equipment: definition.stage === "omics" ? "测序/分析平台" : "V7 实验中心", sample: "已建立的细胞模型", evidence,
    tags: ["V7", definition.route, definition.stage],
  };
}

function runtimeExperimentDefinition(id: string): ExperimentDefinition | undefined {
  return EXPERIMENTS.find((item) => item.id === id) ?? (getExperimentDefinition(id) ? scheduledResearchDefinition(getExperimentDefinition(id)!) : undefined);
}

/** Schedule a V7 experiment. The detail dialog supplies its selected model and
 * conditions; the evidence is only recorded when the scheduled task resolves. */
export function scheduleResearchExperiment(state: GameStateV4, experimentId: string, outcome: ResearchExperimentOutcome = {}): EngineResult {
  return scheduleExperiment(state, experimentId, outcome);
}

export function scheduleExperiment(state: GameStateV4, experimentId: string, researchOutcome?: ResearchExperimentOutcome): EngineResult {
  if (state.finished) return { ok:false, error:"本局已经结算。" };
  if (state.resources.energy <= 0) return { ok:false, error:"精力已经耗尽，先安排休息、摸鱼或旅行恢复。" };
  const researchDefinition = getExperimentDefinition(experimentId);
  if (researchDefinition) {
    const gate = researchAvailability(currentProject(state), experimentId);
    if (!gate.available) return { ok:false, error:gate.reason ?? "实验前置条件尚未满足。" };
  }
  const experiment = runtimeExperimentDefinition(experimentId);
  if (!experiment) return { ok:false, error:"未知实验。" };
  const project = currentProject(state);
  const successfulRuns = project.experimentHistory.filter((item) => item.technical === "成功").length;
  if (!researchDefinition && ["transcriptomics","proteomics","metabolomics","microbiome","single-cell"].includes(experiment.id) && successfulRuns === 0) return { ok:false, error:"还没有通过预实验确认可用样本，暂不能送组学。" };
  if (experiment.id === "bioinformatics" && project.evidence.omics === 0) return { ok:false, error:"还没有组学数据可供分析。" };
  if (experiment.id === "multiomics" && project.evidence.omics < 2) return { ok:false, error:"多组学整合至少需要两组成功的组学证据。" };
  const free = planCapacity(state) - plannedSlots(state);
  if (free <= 0) return { ok:false, error:"本回合时间格已排满。" };
  let run = state.activeExperiments.find((entry) => entry.definitionId === experiment.id && entry.projectRunId === state.currentProjectRunId && entry.status !== "complete");
  const next = structuredClone(state);
  if (!run) {
    if (state.funding.balance < 0 && experiment.cost > 0) return { ok:false, error:"实验室处于欠款状态，先补充经费才能启动新实验。" };
    if (state.funding.balance - experiment.cost < -state.funding.creditLimit) return { ok:false, error:`超过信用额度，还差 ¥${Math.ceil(experiment.cost - state.funding.balance - state.funding.creditLimit)}k。` };
    const running = state.activeExperiments.filter((entry) => entry.status !== "complete");
    if (running.length >= 2) return { ok:false, error:"最多同时推进两条实验任务。" };
    const conflict = running.some((entry) => runtimeExperimentDefinition(entry.definitionId)?.equipment === experiment.equipment);
    if (conflict) return { ok:false, error:`${experiment.equipment}正在被另一项任务占用。` };
    run = { id:uid("exp",state.seed,state.totalExperiments+state.activeExperiments.length+1), definitionId:experiment.id, projectRunId:state.currentProjectRunId, totalSlots:experiment.slots, completedSlots:0, startedTurn:state.turn, attempt:(state.familiarity[experiment.id]??0)/12+1, costPaid:false, status:"planned", researchOutcome: researchDefinition ? researchOutcome : undefined };
    next.activeExperiments.push(run);
  }
  const alreadyPlanned = state.plan.some((item) => item.experimentRunId === run!.id);
  if (alreadyPlanned) return { ok:false, error:"这项实验本回合已经安排。" };
  const slots = Math.min(free, run.totalSlots - run.completedSlots);
  next.plan.push({ id:uid("plan",state.seed,state.turn*20+state.plan.length), kind:"experiment",refId:experiment.id,label:experiment.short,icon:experiment.icon,slots,experimentRunId:run.id });
  return { ok:true, state:next };
}

export function scheduleActivity(state: GameStateV4, activityId: ActivityId, targetId?: string): EngineResult {
  const activity = ACTIVITIES[activityId];
  if(state.resources.energy<=0&&!(["rest","games","date","travel"] as ActivityId[]).includes(activityId))return{ok:false,error:"精力为 0，只能先安排恢复类行动。"};
  const free = planCapacity(state) - plannedSlots(state);
  if (activity.slots > free) return { ok:false, error:`${activity.name}需要 ${activity.slots} 格，本回合空间不足。` };
  if (activityId === "thesis" && state.turn < 65) return { ok:false, error:"毕业论文将在第三年后半段开放。" };
  if (activityId === "review" && currentManuscript(state).status !== "revision") return { ok:false, error:"当前稿件没有需要回复的审稿意见。" };
  if (activityId === "date") {
    const member = state.lab.find((item) => item.id === targetId);
    if (!member?.romanceEligible || member.relation < 65) return { ok:false, error:"只有关系达到 65 的成年同级或同门可以约会。" };
  }
  const item: PlanItem = { id:uid("plan",state.seed,state.turn*20+state.plan.length),kind:"activity",refId:activityId,label:activity.name,icon:activity.icon,slots:activity.slots,targetId };
  return { ok:true, state:{ ...state, plan:[...state.plan,item] } };
}

export function autoFillPlan(state: GameStateV4): GameStateV4 {
  let next = state;
  while (plannedSlots(next) < planCapacity(next)) {
    const paper = currentManuscript(next);
    const choice: ActivityId = next.resources.energy < 35 ? "rest" : paper.status === "revision" || currentProject(next).writingProgress < 100 ? "writing" : "analysis";
    const scheduled = scheduleActivity(next, choice);
    if (!scheduled.ok) break;
    next = scheduled.state;
  }
  return next;
}

function resolveScientificOutcome(state: GameStateV4, project: ProjectRun, rng: () => number): ScientificOutcome {
  const scientificRoll = rng();
  const truth = clamp(project.truthBias + (state.stats.theory - 50) * .001, .18, .82);
  if (scientificRoll < truth * .5) return "清晰阳性";
  if (scientificRoll < truth) return "弱阳性";
  if (scientificRoll < truth + .2) return "阴性";
  if (scientificRoll < .965) return "矛盾";
  return "意外发现";
}

function researchReadoutFor(scientific: ScientificOutcome): NonNullable<ResearchExperimentOutcome["result"]> {
  if (scientific === "清晰阳性" || scientific === "意外发现") return "positive";
  if (scientific === "弱阳性") return "trend";
  if (scientific === "阴性") return "negative";
  return "contradictory";
}

function mirrorResearchEvidence(project: ProjectRun, dimension: string, level: number, experimentId: string) {
  if (level <= 0) return;
  const evidenceKey: Partial<Record<string, EvidenceKey>> = {
    phenotype: "phenotype", molecular: "molecular", mechanism: "mechanism", causality: "causality",
    animal: "histology", reproducibility: "replication",
  };
  const key = evidenceKey[dimension] ?? (experimentId.includes("omics") || experimentId.includes("seq") ? "omics" : undefined);
  if (key) project.evidence[key] = Math.max(project.evidence[key], 1);
}

function resolveCompletedExperiment(state: GameStateV4, run: ExperimentRun, experiment: ExperimentDefinition, rng: () => number): TurnResult {
  const project = state.projects.find((item) => item.runId === run.projectRunId)!;
  const chance = technicalSuccessChance(state, experiment);
  const pilotIndex = state.flags.indexOf("pilot-bonus");
  if (pilotIndex >= 0) state.flags.splice(pilotIndex,1);
  const roll = rng();
  const contaminationThreshold = Math.max(chance, .91);
  const technical = roll < chance ? "成功" : roll > contaminationThreshold ? "污染" : "技术失败";
  const scientific = technical === "成功" ? resolveScientificOutcome(state, project, rng) : undefined;
  const researchDefinition = getExperimentDefinition(experiment.id);
  let researchDetail: string | undefined;
  let researchEvidenceLevel = 0;
  if (technical === "成功" && researchDefinition) {
    const selected = run.researchOutcome ?? {};
    const resolvedOutcome: ResearchExperimentOutcome = {
      ...selected,
      result: selected.result ?? researchReadoutFor(scientific!),
      // A Rescue has to be explicitly configured by the player.  Do not turn
      // a random positive outcome into causal proof.
      phenotypeReversed: selected.phenotypeReversed === true && selected.intervention?.trim()
        ? selected.phenotypeReversed : false,
    };
    const applied = completeResearchExperiment(project, experiment.id, resolvedOutcome);
    if (applied.ok) {
      project.research = applied.project.research;
      researchDetail = applied.message.body;
      researchEvidenceLevel = applied.evidence?.level ?? 0;
      if (applied.evidence) mirrorResearchEvidence(project, applied.evidence.dimension, applied.evidence.level, applied.evidence.experimentId);
    } else researchDetail = applied.error;
  }
  const detail = technical !== "成功" ? `${experiment.sample}未产生可用数据；成本不退。` : researchDetail ?? (scientific === "意外发现" ? "偏离原假说，却打开了一条高新颖性路线。" : scientific === "阴性" ? "没有支持原假说，但形成了可报告证据。" : `${experiment.evidence} 证据已更新。`);
  const record: ExperimentOutcomeRecord = { id:`result-${run.id}-${state.turn}`,turn:state.turn,experimentId:experiment.id,technical,scientific,successChance:chance,roll,detail };
  project.experimentHistory.push(record);
  state.totalExperiments += 1;
  state.familiarity[experiment.id] = Math.min(100, (state.familiarity[experiment.id] ?? 0) + (CANDIDATES.find((item)=>item.id===state.candidateId)?.trait === "快速学习" ? 18 : 12));
  state.stats.wet = clamp(state.stats.wet + 1);
  if (technical === "成功") {
    const gain = scientific === "清晰阳性" || scientific === "意外发现" ? 2 : 1;
    if (!researchDefinition) project.evidence[experiment.evidence] += gain;
    const repeats = project.experimentHistory.filter((item) => item.experimentId === experiment.id && item.technical === "成功").length;
    if (!researchDefinition && repeats >= 2) project.evidence.replication += 1;
    if (scientific === "阴性" || scientific === "矛盾") state.negativeResults += 1;
    if (scientific === "意外发现") { state.surprises += 1; project.novelty = clamp(project.novelty + 8); }
    state.resources.trust = clamp(state.resources.trust + (scientific === "意外发现" ? 4 : 2));
  } else {
    state.technicalFailures += 1;
    state.resources.san = clamp(state.resources.san - (technical === "污染" ? 9 : 7));
    if (CANDIDATES.find((item)=>item.id===state.candidateId)?.trait === "越挫越勇") state.familiarity[experiment.id] += 7;
    const incidentState = beginFailureIncident(state, experiment.id, experiment.tags, rng);
    Object.assign(state, incidentState);
  }
  const manuscript=state.manuscripts.find(item=>item.projectRunId===project.runId);if(manuscript)evaluateReviewRequests(state,manuscript.id);
  const evidenceSuffix = researchDefinition && technical === "成功" ? ` · 证据等级 ${researchEvidenceLevel}/5` : "";
  return { id:record.id,icon:experiment.icon,title:experiment.name,result:technical === "成功" ? scientific! : technical,detail:`技术成功率 ${Math.round(chance*100)}% · ${detail}${evidenceSuffix}`,tone:technical !== "成功" ? "bad" : scientific === "阴性" || scientific === "矛盾" ? "neutral" : "good" };
}

const FIGURE_PRIORITY:EvidenceKey[]=["phenotype","biochemical","histology","molecular","mechanism","omics","causality","replication"];

function applyActivity(state: GameStateV4, item: PlanItem, rng: () => number): TurnResult {
  const id = item.refId as ActivityId;
  const activity = ACTIVITIES[id];
  const project = currentProject(state);
  const paper = currentManuscript(state);
  state.resources.energy = clamp(state.resources.energy + activity.energy);
  state.resources.san = clamp(state.resources.san + activity.san);
  if (id === "pilot") {
    state.flags.push("pilot-bonus");
    state.stats.wet = clamp(state.stats.wet + 1);
    return {id:item.id,icon:item.icon,title:item.label,result:"条件已摸清",detail:"下一项完成的实验技术成功率 +6%。",tone:"good"};
  }
  if (id === "literature") {
    state.stats.theory = clamp(state.stats.theory + 2); project.novelty = clamp(project.novelty + (rng()>.6?2:1));
    return {id:item.id,icon:item.icon,title:item.label,result:"路线更清晰",detail:`理论 ${state.stats.theory} · 课题新颖性 ${project.novelty}`,tone:"good"};
  }
  if (id === "analysis") {
    if (project.experimentHistory.length) { state.stats.data = clamp(state.stats.data + 2); project.writingProgress=Math.min(100,project.writingProgress+3); }
    evaluateReviewRequests(state,paper.id);
    return {id:item.id,icon:item.icon,title:item.label,result:project.experimentHistory.length?"统计结果已整理":"没有可分析的数据",detail:project.experimentHistory.length?"你看懂了数据在说什么，下一步可以画图。":"先完成至少一项实验。",tone:project.experimentHistory.length?"good":"neutral"};
  }
  if (id === "figure") {
    const nextEvidence=FIGURE_PRIORITY.find(key=>project.evidence[key]>0&&!project.figureCoverage.includes(key));
    const created=Boolean(nextEvidence&&project.figures<6);
    if (nextEvidence&&created) { project.figureCoverage.push(nextEvidence);project.figures=project.figureCoverage.length;state.stats.data = clamp(state.stats.data + 1); }
    evaluateReviewRequests(state,paper.id);
    return {id:item.id,icon:item.icon,title:item.label,result:created?`主图 ${project.figures} 完成`:project.figures>=6?"主图已满6张":"没有新的证据可画",detail:created?`已把“${nextEvidence}”证据整理进主图；同类数据不会重复刷图。`:project.figures>=6?"后续结果自动作为补充材料。":"先完成一种尚未进入主图的实验证据。",tone:created?"good":"neutral"};
  }
  if (id === "writing") {
    const gain = Math.max(7,Math.round(state.stats.writing*.15));
    project.writingProgress = Math.min(100,project.writingProgress+gain);
    state.stats.writing = clamp(state.stats.writing+1);
    evaluateReviewRequests(state,paper.id);
    return {id:item.id,icon:item.icon,title:item.label,result:`稿件 ${project.writingProgress}%`,detail:"文字正在把分散证据变成一个可审查的故事。",tone:"good"};
  }
  if(id==="review"){
    const gain=Math.max(12,Math.round(state.stats.writing*.18));paper.responseProgress=Math.min(100,paper.responseProgress+gain);paper.revisionProgress=paper.responseProgress;evaluateReviewRequests(state,paper.id);
    return{id:item.id,icon:item.icon,title:item.label,result:`回复信 ${paper.responseProgress}%`,detail:"逐条说明新增实验、统计修改和未采纳意见的理由。",tone:"good"};
  }
  if (id === "thesis") {
    project.thesisProgress = Math.min(100,project.thesisProgress+14+Math.floor(state.stats.writing/20));
    return {id:item.id,icon:item.icon,title:item.label,result:`毕业论文 ${project.thesisProgress}%`,detail:"方法、结果与附录继续成形。",tone:"good"};
  }
  if (id === "grant") {
    const advisor = ADVISORS.find((entry)=>entry.id===state.advisorId)!;
    const success = rng() < clamp(.25+state.resources.trust*.006+advisor.wealth*.002,.2,.92);
    const amount = success ? Math.round((12+advisor.wealth*.22)*advisor.fundingMultiplier) : 0;
    state.funding.balance += amount; state.resources.trust=clamp(state.resources.trust+(success?1:-2));
    return {id:item.id,icon:item.icon,title:item.label,result:success?`获批 ¥${amount}k`:"暂缓拨款",detail:success?"采购冻结解除。":"导师希望先看到阶段结果。",tone:success?"good":"bad"};
  }
  if (id === "collaborate") {
    const member = state.lab.find((entry)=>entry.id===item.targetId) ?? state.lab[0];
    if (member) { member.relation=clamp(member.relation+9);member.favorDebt+=1;state.relation=clamp(state.relation+4); }
    return {id:item.id,icon:item.icon,title:item.label,result:member?`${member.name}答应帮忙`:"没有找到合适的人",detail:member?`${member.specialty}熟练度获得临时加成 · 人情债 +1`:"",tone:member?"good":"neutral"};
  }
  if (id === "date") {
    const member=state.lab.find((entry)=>entry.id===item.targetId);if(member)member.relation=clamp(member.relation+10);
    return {id:item.id,icon:item.icon,title:item.label,result:"认真陪伴",detail:"关系与 SAN 上升，科研时间减少。",tone:"good"};
  }
  if (id === "travel") { state.resources.trust=clamp(state.resources.trust-(state.pressure>65?5:1)); return {id:item.id,icon:item.icon,title:item.label,result:"短暂离开实验室",detail:"精力和 SAN 大幅恢复。",tone:"good"}; }
  if (id === "games" && state.pressure>70) state.resources.trust=clamp(state.resources.trust-2);
  return {id:item.id,icon:item.icon,title:item.label,result:"恢复完成",detail:`精力 ${state.resources.energy} · SAN ${state.resources.san}`,tone:"good"};
}

function evidenceCompleteness(project: ProjectRun) {
  const unique = Object.values(project.evidence).filter((value)=>value>0).length;
  const repeats = project.evidence.replication;
  return clamp(unique*11+Math.min(12,repeats*4)+Math.min(12,project.experimentHistory.length));
}

export function paperQuality(state: GameStateV4, project = currentProject(state)) {
  return clamp(Math.round(project.novelty*.24+evidenceCompleteness(project)*.4+project.figures*3+project.figureCoverage.length*2+project.writingProgress*.16+state.stats.writing*.08+state.integrity*.09));
}

export function journalSubmissionGaps(project:ProjectRun,journal:JournalDefinition){
  const gaps:string[]=[];
  const [minimum]=journal.recommendedFigures;
  if(project.figures<minimum)gaps.push(`还缺 ${minimum-project.figures} 张主图`);
  const required=new Set<EvidenceKey>([...journal.requiredEvidence,...project.requiredEvidence]);
  for(const key of required)if(project.evidence[key]<=0)gaps.push(`缺少${key==="phenotype"?"表型":key==="biochemical"?"生化":key==="histology"?"病理":key==="molecular"?"分子":key==="mechanism"?"机制":key==="omics"?"组学":key==="causality"?"因果/挽救":"独立重复"}证据`);
  if(journal.language==="中文"&&!project.evidence.histology&&!project.evidence.biochemical)gaps.push("病理或生化证据至少完成一种");
  return [...new Set(gaps)];
}

function makeReviewRequests(state:GameStateV4,project:ProjectRun,journal:JournalDefinition,paper:Manuscript):ReviewRequest[]{
  const requests:ReviewRequest[]=[];
  const evidence=(id:string,text:string,key:EvidenceKey,suggested:string[],essential=true)=>requests.push({id:`${paper.id}-${id}`,kind:"evidence",text,evidence:key,baseline:project.evidence[key],target:project.evidence[key]+1,suggestedAction:`完成：${suggested.map(item=>EXPERIMENTS.find(exp=>exp.id===item)?.name).filter(Boolean).join(" / ")}`,suggestedExperimentIds:suggested,essential,completed:false});
  if(!project.evidence.histology&&journal.scope.some(tag=>["毒理","中药","环境"].includes(tag)))evidence("histology","Reviewer 1：补充病理或组织层面的独立证据","histology",["he"]);
  if(!project.evidence.replication)evidence("repeat","Reviewer 2：关键结果需要独立重复","replication",project.experimentHistory.length?[project.experimentHistory.at(-1)!.experimentId]:["cell-toxicity"]);
  if(!project.evidence.mechanism)evidence("mechanism","Reviewer 2：相关性不足以支持机制结论","mechanism",["wb","apoptosis","flow"]);
  if(!project.evidence.causality&&journal.qualityNeed>=75)evidence("causality","Reviewer 3：需要毒代、类器官或多组学因果验证","causality",["lcms","organoid","multiomics"],false);
  if(!project.evidence.omics&&journal.scope.some(tag=>["环境","中药"].includes(tag)))evidence("omics","编辑：增加全局组学证据，或在回复中解释不做的理由","omics",["transcriptomics","metabolomics"],false);
  requests.push({id:`${paper.id}-analysis`,kind:"analysis",text:"统计审稿人：补充统计方法、效应量和原始数据说明",baseline:state.stats.data,target:state.stats.data+1,suggestedAction:"完成一次数据分析",suggestedExperimentIds:[],essential:true,completed:false});
  if(project.figures<2)requests.push({id:`${paper.id}-figure`,kind:"figure",text:"编辑：统一 Figure 标注并补充一张关键结果图",baseline:project.figures,target:project.figures+1,suggestedAction:"完成一次论文画图",suggestedExperimentIds:[],essential:false,completed:false});
  requests.push({id:`${paper.id}-writing`,kind:"writing",text:"编辑：完善讨论、局限性和方法描述",baseline:project.writingProgress,target:Math.min(100,project.writingProgress+8),suggestedAction:"完成一次论文写作",suggestedExperimentIds:[],essential:true,completed:false});
  return requests;
}

export function evaluateReviewRequests(state:GameStateV4,manuscriptId?:string){
  const papers=manuscriptId?state.manuscripts.filter(item=>item.id===manuscriptId):state.manuscripts;
  for(const paper of papers){const project=state.projects.find(item=>item.runId===paper.projectRunId);if(!project)continue;for(const request of paper.reviewRequests){request.completed=request.kind==="evidence"?project.evidence[request.evidence!]>=request.target:request.kind==="analysis"?state.stats.data>=request.target:request.kind==="figure"?project.figures>=request.target:project.writingProgress>=request.target;}paper.requirements=paper.reviewRequests.map(item=>`${item.completed?"✓":"○"} ${item.text}`);}
  return state;
}

export function advanceReview(state: GameStateV4, rng: () => number, results: TurnResult[]) {
  for (const paper of state.manuscripts) {
    if(paper.status==="revision"&&paper.reviewDeadlineTurn!==null&&state.turn>paper.reviewDeadlineTurn){paper.status="rejected";paper.requirements=["修回期限已过，编辑按撤稿处理；数据和课题进度保留，可重新投稿。"];results.push({id:`overdue-${paper.id}`,icon:"⌛",title:paper.title,result:"修回逾期",detail:"稿件已撤回，可补强后重新投稿。",tone:"bad"});continue;}
    if (paper.status !== "under_review" || paper.decisionTurn === null || paper.decisionTurn > state.turn) continue;
    const journal=JOURNALS.find((entry)=>entry.id===paper.journalId)!;const project=state.projects.find((entry)=>entry.runId===paper.projectRunId)!;
    paper.quality=paperQuality(state,project);paper.completeness=evidenceCompleteness(project);
    const score=paper.quality-journal.qualityNeed+(paper.completeness-journal.completenessNeed)*.45+(rng()-.5)*18;
    if(score>=18){paper.status="accepted";paper.acceptedTurn=state.turn;paper.publicationClass=journal.publicationClass;state.resources.san=clamp(state.resources.san+12);results.push({id:`accept-${paper.id}`,icon:"✓",title:journal.name,result:"Accept",detail:"编辑认为证据链足以支持结论。",tone:"good"});}
    else if(score<-14){paper.status="rejected";paper.requirements=["编辑拒稿：证据链与期刊门槛差距较大，可补强后转投。"];state.resources.san=clamp(state.resources.san-9);results.push({id:`reject-${paper.id}`,icon:"×",title:journal.name,result:"Reject",detail:"可以补强后转投其他期刊。",tone:"bad"});}
    else{paper.status="revision";paper.revisionProgress=0;paper.responseProgress=0;paper.reviewStrategy=null;paper.reviewDeadlineTurn=state.turn+(score<0?6:4);paper.reviewRequests=makeReviewRequests(state,project,journal,paper);evaluateReviewRequests(state,paper.id);results.push({id:`revision-${paper.id}`,icon:"!",title:journal.name,result:score<0?"Major Revision":"Minor Revision",detail:`收到 ${paper.reviewRequests.length} 条任务 · 第 ${paper.reviewDeadlineTurn} 回合前回复。`,tone:"neutral"});}
  }
}

export function getActiveAdvisorDemand(state: GameStateV4) {
  const encoded = state.flags.find((flag) => flag.startsWith("demand:extra-experiments:"));
  if (!encoded) return null;
  const [, , targetText, deadlineText] = encoded.split(":");
  const target = Number(targetText); const deadline = Number(deadlineText);
  if (!Number.isFinite(target) || !Number.isFinite(deadline)) return null;
  return { target, deadline, remaining:Math.max(0,target-state.totalExperiments), turnsLeft:Math.max(0,deadline-state.turn) };
}

function resolveAdvisorDemand(state:GameStateV4,results:TurnResult[]) {
  const demand=getActiveAdvisorDemand(state);if(!demand)return;
  const encoded=state.flags.find((flag)=>flag.startsWith("demand:extra-experiments:"))!;
  if(state.totalExperiments>=demand.target){state.flags=state.flags.filter((flag)=>flag!==encoded);state.flags.push("demand-extra-complete");state.funding.balance+=18;state.resources.trust=clamp(state.resources.trust+8);state.pressure=clamp(state.pressure-6);state.logs.push({turn:state.turn,title:"导师追加实验已完成",text:"你在期限内补完三项实验，获得追加经费。",type:"conflict"});results.push({id:`demand-done-${state.turn}`,icon:"✓",title:"导师的限时加码",result:"按时完成",detail:"追加经费 +¥18k·导师信任 +8。",tone:"good"});}
  else if(state.turn>demand.deadline){state.flags=state.flags.filter((flag)=>flag!==encoded);state.flags.push("demand-extra-failed");state.resources.trust=clamp(state.resources.trust-13);state.resources.san=clamp(state.resources.san-8);state.pressure=clamp(state.pressure+12);state.logs.push({turn:state.turn,title:"导师追加实验逾期",text:`约定的三项实验还差 ${demand.remaining} 项。`,type:"conflict"});results.push({id:`demand-fail-${state.turn}`,icon:"!",title:"导师的限时加码",result:"逾期",detail:`仍差 ${demand.remaining} 项·信任 -13·压力上升。`,tone:"bad"});}
}

export function resolveTurn(state: GameStateV4): EngineResult<{state:GameStateV4;results:TurnResult[]}> {
  if (plannedSlots(state) !== planCapacity(state)) return {ok:false,error:`请排满 ${planCapacity(state)} 个时间格。`};
  if (state.pendingEventId) return {ok:false,error:"先处理当前突发事件。"};
  if ((state.pendingIncidents ?? []).length > 0) return {ok:false,error:"先处理实验事故，再继续推进计划。"};
  const next=structuredClone(state);const results:TurnResult[]=[];const rng=mulberry32(state.seed+state.turn*104729+state.totalExperiments*997);
  if(next.overtimeSlots){next.resources.energy=clamp(next.resources.energy-next.overtimeSlots*10);next.resources.san=clamp(next.resources.san-next.overtimeSlots*4);next.pressure=clamp(next.pressure+next.overtimeSlots*5);}
  const recoveryIds=new Set<ActivityId>(["rest","games","date","travel"]);
  const orderedPlan=[...next.plan].sort((a,b)=>Number(b.kind==="activity"&&recoveryIds.has(b.refId as ActivityId))-Number(a.kind==="activity"&&recoveryIds.has(a.refId as ActivityId)));
  for(const item of orderedPlan){
    if(item.kind==="activity"){results.push(applyActivity(next,item,rng));continue;}
    const run=next.activeExperiments.find((entry)=>entry.id===item.experimentRunId)!;const experiment=runtimeExperimentDefinition(item.refId)!;
    if(next.resources.energy<=0){results.push({id:`paused-${item.id}`,icon:"⏸",title:experiment.name,result:"精力耗尽，实验暂停",detail:"项目进度和已付经费均保留；先恢复精力，之后会自动续排。",tone:"neutral"});continue;}
    if(!run.costPaid){next.funding.balance-=experiment.cost;next.funding.totalSpent+=experiment.cost;run.costPaid=true;run.status="running";}
    run.completedSlots=Math.min(run.totalSlots,run.completedSlots+item.slots);next.resources.energy=clamp(next.resources.energy-Math.ceil(experiment.energy*item.slots/experiment.slots));
    if(run.completedSlots>=run.totalSlots){run.status="complete";results.push(resolveCompletedExperiment(next,run,experiment,rng));}
    else results.push({id:item.id,icon:experiment.icon,title:experiment.name,result:`进度 ${run.completedSlots}/${run.totalSlots}`,detail:`实验跨回合继续 · 已支付 ¥${experiment.cost}k`,tone:"neutral"});
  }
  advanceReview(next,rng,results);
  next.turn+=1;next.plan=[];next.overtimeSlots=0;next.activeExperiments=next.activeExperiments.filter((run)=>run.status!=="complete");
  let carryoverCapacity=next.resources.energy>0?5:0;
  for(const run of next.activeExperiments){
    if(carryoverCapacity<=0)break;
    const experiment=runtimeExperimentDefinition(run.definitionId)!;
    const slots=Math.min(carryoverCapacity,run.totalSlots-run.completedSlots);
    if(slots<=0)continue;
    next.plan.push({id:uid("carry",next.seed,next.turn*20+next.plan.length),kind:"experiment",refId:experiment.id,label:`续作·${experiment.short}`,icon:experiment.icon,slots,experimentRunId:run.id,locked:true});
    carryoverCapacity-=slots;
  }
  resolveAdvisorDemand(next,results);
  next.lab.forEach((member)=>{if(member.active&&member.leaveTurn<=next.turn){member.active=false;next.logs.push({turn:next.turn,title:`${member.name}离开课题组`,text:`${member.role}完成了自己的阶段，${member.specialty}支持暂时消失。`,type:"people"});}});
  if(next.funding.balance<0){next.funding.debtTurns+=1;if(next.funding.debtTurns>=2){next.resources.trust=clamp(next.resources.trust-4);next.pressure=clamp(next.pressure+6);}}
  else next.funding.debtTurns=0;
  const advisor=ADVISORS.find((entry)=>entry.id===next.advisorId)!;
  next.pressure=clamp(advisor.pressure*.35+(100-next.resources.energy)*.22+(100-next.resources.trust)*.14+(next.turn/78)*24+(next.funding.balance<0?12:0));
  if(next.pressure>72)next.resources.san=clamp(next.resources.san-3);next.minSan=Math.min(next.minSan,next.resources.san);
  next.logs.push({turn:state.turn,title:`第 ${state.turn} 回合 · ${turnLabel(state.turn)}`,text:results.map((row)=>`${row.title}：${row.result}`).join("；"),type:"turn"});
  if(next.eventCooldown>0)next.eventCooldown-=1;
  else if(rng()<.35){const eligible=EVENTS.filter((event)=>event.minTurn<=next.turn&&!next.flags.includes(`event:${event.id}`)&&(!event.requiredFlag||next.flags.includes(event.requiredFlag)));if(eligible.length)next.pendingEventId=eligible[Math.floor(rng()*eligible.length)].id;}
  if(next.turn===79&&!evaluateGraduation(next).eligible){next.flags.push("extended");next.logs.push({turn:79,title:"进入第四年",text:"培养年限已满，但成果要求或毕业论文尚未完成。",type:"milestone"});}
  if(next.turn>104&&!next.finished){next.finished=true;next.endingId=evaluateGraduation(next).eligible?chooseEnding(next,true):"unfinished";}
  return {ok:true,state:{state:next,results}};
}

export function applyEventChoice(state:GameStateV4,choice:EventChoice):GameStateV4{
  const next=structuredClone(state);const event=EVENTS.find((entry)=>entry.id===state.pendingEventId);if(!event)return next;
  next.resources.energy=clamp(next.resources.energy+(choice.effect.energy??0));next.resources.san=clamp(next.resources.san+(choice.effect.san??0));next.resources.trust=clamp(next.resources.trust+(choice.effect.trust??0));next.funding.balance+=choice.effect.funding??0;next.relation=clamp(next.relation+(choice.effect.relation??0));next.pressure=clamp(next.pressure+(choice.effect.pressure??0));next.integrity=clamp(next.integrity+(choice.effect.integrity??0));
  if(choice.effect.stats)for(const [key,value] of Object.entries(choice.effect.stats))next.stats[key as keyof typeof next.stats]=clamp(next.stats[key as keyof typeof next.stats]+(value??0));
  if(choice.flag==="accept-extra-experiments"&&!getActiveAdvisorDemand(next))next.flags.push(`demand:extra-experiments:${next.totalExperiments+3}:${next.turn+6}`);
  if(choice.flag==="professional-boundary"){const advisor=ADVISORS.find((entry)=>entry.id===next.advisorId)!;if(advisor.care>=60){next.resources.trust=clamp(next.resources.trust+5);next.resources.san=clamp(next.resources.san+3);}else{next.resources.trust=clamp(next.resources.trust-5);next.pressure=clamp(next.pressure+4);}}
  if(choice.flag==="delegate-private-task"){const member=[...next.lab].filter((entry)=>entry.active).sort((a,b)=>b.relation-a.relation)[0];if(member){member.relation=clamp(member.relation-8);member.favorDebt+=2;}}
  if(choice.flag)next.flags.push(choice.flag);next.flags.push(`event:${event.id}`);next.pendingEventId=null;next.eventCooldown=1;next.logs.push({turn:next.turn,title:event.title,text:choice.label,type:"event"});return next;
}

export function submitManuscript(state:GameStateV4,journalId:string):EngineResult{
  const next=structuredClone(state);const project=currentProject(next);const paper=currentManuscript(next);const journal=JOURNALS.find((entry)=>entry.id===journalId);
  if(!journal)return{ok:false,error:"期刊不存在。"};if(!["draft","rejected"].includes(paper.status))return{ok:false,error:"当前稿件不能投稿。"};if(project.writingProgress<55)return{ok:false,error:"稿件至少完成 55% 才能投稿。"};const gaps=journalSubmissionGaps(project,journal);if(gaps.length)return{ok:false,error:`尚未达到 ${journal.name} 的投稿准备度：${gaps.slice(0,3).join("；")}。`};
  paper.journalId=journal.id;paper.status="under_review";paper.submittedTurn=next.turn;paper.quality=paperQuality(next,project);paper.completeness=evidenceCompleteness(project);paper.requirements=[];paper.reviewRequests=[];paper.reviewDeadlineTurn=null;paper.responseProgress=0;paper.reviewStrategy=null;paper.revisionProgress=0;paper.decisionTurn=next.turn+Math.max(1,Math.ceil(((journal.reviewDays[0]+journal.reviewDays[1])/2)/14));next.totalSubmissions+=1;next.logs.push({turn:next.turn,title:`投稿 ${journal.name}`,text:`预计第 ${paper.decisionTurn} 回合收到首轮决定；等待期间可以继续补强或启动第二篇。`,type:"review"});return{ok:true,state:next};
}

export function submitReviewResponse(state:GameStateV4,strategy:Exclude<ReviewStrategy,null>):EngineResult{
  const next=structuredClone(state);const paper=currentManuscript(next);const project=currentProject(next);if(paper.status!=="revision")return{ok:false,error:"当前没有待回复的审稿意见。"};evaluateReviewRequests(next,paper.id);
  if(paper.reviewDeadlineTurn!==null&&next.turn>paper.reviewDeadlineTurn)return{ok:false,error:"修回期限已经过去，稿件已无法提交。"};
  const completed=paper.reviewRequests.filter(item=>item.completed).length;const essential=paper.reviewRequests.filter(item=>item.essential);const essentialDone=essential.filter(item=>item.completed).length;
  const responseNeed=strategy==="complete"?60:strategy==="key-only"?70:80;if(paper.responseProgress<responseNeed)return{ok:false,error:`回复信至少完成 ${responseNeed}% 才能采用这一策略。`};
  if(strategy==="complete"&&completed<paper.reviewRequests.length)return{ok:false,error:"“逐条完成”策略要求所有审稿任务均已完成。"};
  if(strategy==="key-only"&&essentialDone<essential.length)return{ok:false,error:"“只补关键实验”至少要完成全部关键任务。"};
  const journal=JOURNALS.find(entry=>entry.id===paper.journalId)!;paper.reviewStrategy=strategy;paper.quality=paperQuality(next,project);paper.completeness=evidenceCompleteness(project);const completionRatio=paper.reviewRequests.length?completed/paper.reviewRequests.length:1;const strategyPenalty=strategy==="complete"?0:strategy==="key-only"?-.1:-.25;const acceptChance=clamp(.42+completionRatio*.26+paper.responseProgress*.002+(paper.quality-journal.qualityNeed)*.008+strategyPenalty,.08,.92);const rng=mulberry32(next.seed+next.turn*701+paper.responseProgress+completed*31);const accepted=rng()<acceptChance;
  if(accepted){paper.status="accepted";paper.acceptedTurn=next.turn;paper.publicationClass=journal.publicationClass;paper.requirements=[];paper.reviewDeadlineTurn=null;next.resources.trust=clamp(next.resources.trust+9);next.resources.san=clamp(next.resources.san+13);next.logs.push({turn:next.turn,title:`${journal.name} 接收`,text:`修回策略：${strategy==="complete"?"逐条完成":strategy==="key-only"?"关键补充":"解释申辩"}。`,type:"review"});}
  else{paper.status="rejected";paper.requirements=[`修回后拒稿：本次接收概率约 ${Math.round(acceptChance*100)}%，可继续补强后转投。`];paper.reviewDeadlineTurn=null;next.resources.san=clamp(next.resources.san-8);next.logs.push({turn:next.turn,title:"修回后拒稿",text:"稿件和新增实验均保留，可以转投。",type:"review"});}
  return{ok:true,state:next};
}

export function replyToReview(state:GameStateV4):EngineResult{return submitReviewResponse(state,"complete");}

export function withdrawManuscript(state:GameStateV4):EngineResult{
  const next=structuredClone(state);const paper=currentManuscript(next);if(!["under_review","revision"].includes(paper.status))return{ok:false,error:"当前稿件不能撤回。"};paper.status="rejected";paper.decisionTurn=null;paper.reviewDeadlineTurn=null;paper.requirements=["作者主动撤稿：所有数据与修改进度保留，可重新选刊投稿。"];next.logs.push({turn:next.turn,title:"主动撤稿",text:paper.title,type:"review"});return{ok:true,state:next};
}

export function switchProject(state:GameStateV4,projectRunId:string):EngineResult{
  const project=state.projects.find(item=>item.runId===projectRunId);if(!project||!project.active)return{ok:false,error:"该课题当前不可切换。"};return{ok:true,state:{...state,currentProjectRunId:projectRunId}};
}

export function startParallelProject(state:GameStateV4,setup:ProjectSetup,mode:"extension"|"base"="base"):EngineResult{
  const sourcePaper=currentManuscript(state);if(!["under_review","revision"].includes(sourcePaper.status))return{ok:false,error:"只有论文外审或修回期间才能并行准备下一篇。"};
  const active=state.projects.filter(project=>project.active&&state.manuscripts.find(paper=>paper.projectRunId===project.runId)?.status!=="accepted");if(active.length>=2)return{ok:false,error:"最多同时推进两篇论文，请先完成或放弃其中一篇。"};
  const next=structuredClone(state);const source=currentProject(next);const adjusted={...setup,mode,novelty:mode==="extension"?Math.max(45,setup.novelty-8):setup.novelty};const project=makeProjectRun(next.seed+next.projects.length*101,adjusted,next.projects.length+1,mode==="extension"?source:undefined);next.projects.push(project);next.currentProjectRunId=project.runId;next.manuscripts.push(makeManuscript(project,next.manuscripts.length+1));next.logs.push({turn:next.turn,title:"外审期间启动第二篇",text:project.title,type:"project"});return{ok:true,state:next};
}

export function startNextProject(state:GameStateV4,setup:ProjectSetup,mode:"extension"|"base"):EngineResult{
  const activePaper=currentManuscript(state);if(activePaper.status!=="accepted")return{ok:false,error:"当前论文接收后才能按顺序开启下一篇。"};const next=structuredClone(state);const previous=currentProject(next);previous.active=false;const adjusted={...setup,mode,novelty:mode==="extension"?Math.max(45,setup.novelty-6):setup.novelty};const project=makeProjectRun(next.seed+next.projects.length*101,adjusted,next.projects.length+1,mode==="extension"?previous:undefined);next.projects.push(project);next.currentProjectRunId=project.runId;next.manuscripts.push(makeManuscript(project,next.manuscripts.length+1));next.activeExperiments=next.activeExperiments.filter(run=>run.projectRunId!==previous.runId);next.plan=next.plan.filter(item=>!item.experimentRunId||next.activeExperiments.some(run=>run.id===item.experimentRunId));next.logs.push({turn:next.turn,title:mode==="extension"?"开启延伸课题":"开启全新课题",text:project.title,type:"project"});return{ok:true,state:next};
}

export function evaluateGraduation(state:GameStateV4){const rule=GRADUATION_RULES.find((entry)=>entry.id===state.graduationRuleId)!;const accepted=state.manuscripts.filter((paper)=>paper.status==="accepted");const sci=accepted.filter((paper)=>paper.publicationClass==="SCI"||paper.publicationClass==="SCI_HIGH").length;const high=accepted.filter((paper)=>paper.publicationClass==="SCI_HIGH").length;const core=accepted.filter((paper)=>paper.publicationClass==="CHINESE_CORE").length;const papers=rule.id==="mixed"?sci>=1&&core>=1:sci>=rule.sci&&high>=rule.highSci&&core>=rule.chineseCore;const thesis=Math.max(...state.projects.map((project)=>project.thesisProgress),0)>=100;return{eligible:state.turn>=78&&papers&&thesis,papers,thesis,sci,high,core,rule};}

function chooseEnding(state:GameStateV4,graduated:boolean){const accepted=state.manuscripts.filter((paper)=>paper.status==="accepted");const high=accepted.filter((paper)=>paper.publicationClass==="SCI_HIGH").length;if(!graduated)return state.integrity<50?"integrity-fall":state.minSan<=5?"burnout":"unfinished";if(state.surprises>=3&&high>=2&&state.integrity>=95)return"nobel";if(high>=2&&state.resources.trust>=85)return"young-pi";if(state.integrity<60)return"integrity-fall";if(state.minSan<=8)return"burnout";if(state.turn>78)return"late";if(accepted.length>=3&&state.integrity>=90)return"excellent";if(state.lab.some((member)=>member.romanceEligible&&member.relation>=85))return"love";const strongest=Object.entries(state.stats).sort((a,b)=>b[1]-a[1])[0][0];return strongest==="data"?"pharma":strongest==="social"?"cro":strongest==="writing"?"phd":state.flags.filter((flag)=>flag==="life").length>=3?"balanced":"normal";}

export function finishRun(state:GameStateV4):EngineResult{const evaluation=evaluateGraduation(state);if(!evaluation.eligible)return{ok:false,error:`尚未满足毕业条件：${!evaluation.papers?evaluation.rule.description:"毕业论文未完成"}。`};const next=structuredClone(state);next.finished=true;next.endingId=chooseEnding(next,true);next.logs.push({turn:next.turn,title:"毕业答辩通过",text:ENDINGS.find((ending)=>ending.id===next.endingId)?.title??"毕业",type:"ending"});return{ok:true,state:next};}

export function turnLabel(turn:number){const year=Math.min(4,Math.floor((turn-1)/26)+1);const fortnight=(turn-1)%26+1;return `第 ${year} 年 · 双周 ${String(fortnight).padStart(2,"0")}`;}
export function getPhase(state:GameStateV4){if(state.turn>78)return"延毕补救";if(state.turn>=65)return"毕业与投稿";if(state.turn>=40)return"机制与论文";if(state.turn>=14)return"正式实验";return"开题与预实验";}
