import assert from "node:assert/strict";
import test from "node:test";
import { ACTIVITIES, ADVISORS, CANDIDATES, ENDINGS, EVENTS, EXPERIMENTS, FEATURE_FLAGS, GRADUATION_RULES, JOURNALS, NPC_POOL, PROJECTS, RESEARCH_PROGRAMS, RESEARCH_REFERENCES } from "../app/game/content.ts";
import { advanceReview, applyEventChoice, autoFillPlan, clearPlan, createRun, evaluateGraduation, evaluateReviewRequests, getActiveAdvisorDemand, getCandidateSet, getNextProjectChoices, getProjectChoices, journalSubmissionGaps, nextExperimentSuggestions, resolveTurn, scheduleActivity, scheduleExperiment, setOvertime, startParallelProject, submitManuscript, switchProject, technicalSuccessBreakdown } from "../app/game/engine.ts";

const setup = () => ({ ...PROJECTS[0], definitionId:PROJECTS[0].id, mode:"base" as const });

test("content inventory matches the V6 contract", () => {
  assert.deepEqual([CANDIDATES.length,ADVISORS.length,PROJECTS.length,NPC_POOL.length,EXPERIMENTS.length,JOURNALS.length,EVENTS.length,ENDINGS.length],[12,9,60,20,22,30,68,24]);
  for (const collection of [CANDIDATES,ADVISORS,PROJECTS,NPC_POOL,EXPERIMENTS,JOURNALS,EVENTS,ENDINGS]) assert.equal(new Set(collection.map(item=>item.id)).size,collection.length);
  assert.equal(EXPERIMENTS.find(item=>item.id==="wb")?.slots,5);
  assert.ok(EXPERIMENTS.every(item=>Number.isFinite(item.cost)&&item.cost>=0));
  assert.equal(JOURNALS.filter(item=>item.language==="英文").length,18);
  assert.equal(JOURNALS.filter(item=>item.language==="中文").length,12);
  assert.ok(EVENTS.every(event=>event.choices.length===4));
  assert.ok(EVENTS.some(event=>event.id==="conflict-pickup-child"));
  assert.ok(EVENTS.some(event=>event.id==="conflict-extra-experiments"));
  assert.ok(ACTIVITIES.pilot);assert.ok(ACTIVITIES.figure);
  assert.ok(ADVISORS.every(advisor=>advisor.supervision&&advisor.honor&&advisor.strictness));
  assert.equal(FEATURE_FLAGS.customProjects,false);
});

test("60 concrete topics form six balanced domains and twelve five-stage programs",()=>{
  assert.equal(RESEARCH_PROGRAMS.length,12);assert.equal(RESEARCH_REFERENCES.length,60);
  const domains=new Map<string,number>();for(const project of PROJECTS)domains.set(project.domain,(domains.get(project.domain)??0)+1);
  assert.deepEqual([...domains.values()].sort((a,b)=>a-b),[10,10,10,10,10,10]);
  for(const program of RESEARCH_PROGRAMS){const projects=PROJECTS.filter(project=>project.programId===program.id);assert.equal(projects.length,5);assert.deepEqual(projects.map(project=>project.stage).sort(),[1,2,3,4,5]);}
  const placeholders=/化合物\s*X|候选物\s*N|天然产物\s*[QRT]|小分子\s*M|抑制剂\s*A|多肽\s*P|抗体\s*B|候选药\s*C/;
  assert.ok(PROJECTS.every(project=>!placeholders.test(`${project.title}${project.intervention}${project.model}${project.target}`)));
  const referenceIds=new Set(RESEARCH_REFERENCES.map(reference=>reference.id));
  assert.equal(referenceIds.size,60);
  assert.ok(RESEARCH_REFERENCES.every(reference=>Boolean(reference.doi)||/^\d{7,9}$/.test(reference.pmid??"")));
  assert.ok(PROJECTS.every(project=>project.referenceIds.length>=1&&project.referenceIds.every(id=>referenceIds.has(id))));
});

test("formal experiment library is simplified and keeps the requested groups",()=>{
  const byId=(id:string)=>EXPERIMENTS.find(experiment=>experiment.id===id);
  assert.equal(byId("cell-study")?.family,"cell");assert.equal(byId("animal-model")?.family,"animal");assert.equal(byId("elisa")?.family,"pathology");
  assert.ok(["qpcr","special-stain","ihc","if-confocal"].every(id=>!byId(id)));
  assert.ok((byId("pcr")?.description??"").includes("RT-qPCR"));assert.equal(byId("wb")?.slots,5);
});

test("energy gates experiments and lowers technical success monotonically",()=>{
  const state=createRun(551,CANDIDATES[0].id,setup());const experiment=EXPERIMENTS.find(item=>item.id==="wb")!;
  state.resources.energy=82;const full=technicalSuccessBreakdown(state,experiment).chance;state.resources.energy=35;const tired=technicalSuccessBreakdown(state,experiment).chance;state.resources.energy=1;const exhausted=technicalSuccessBreakdown(state,experiment).chance;
  assert.ok(full>tired&&tired>exhausted);assert.ok(full<=.95&&exhausted>=.25);state.resources.energy=0;assert.equal(scheduleExperiment(state,"pcr").ok,false);assert.ok(scheduleActivity(state,"rest").ok);assert.equal(scheduleActivity(state,"analysis").ok,false);
});

test("candidate stats and traits materially change displayed probability",()=>{
  const state=createRun(712,CANDIDATES[0].id,setup());const experiment=EXPERIMENTS.find(item=>item.id==="cell-toxicity")!;
  state.candidateId=CANDIDATES[0].id;state.stats={...CANDIDATES[0].stats};const skilled=technicalSuccessBreakdown(state,experiment).chance;state.candidateId=CANDIDATES[6].id;state.stats={...CANDIDATES[6].stats};const novice=technicalSuccessBreakdown(state,experiment).chance;
  assert.ok(skilled>novice);assert.ok(skilled<=.95);
});

test("routine techniques stay accessible while advanced methods remain harder",()=>{
  const state=createRun(713,CANDIDATES[6].id,setup());state.resources.energy=75;
  const chance=(id:string)=>technicalSuccessBreakdown(state,EXPERIMENTS.find(item=>item.id===id)!).chance;
  assert.ok(chance("pcr")>=.6);assert.ok(chance("animal-model")>=.6);assert.ok(chance("transcriptomics")>=.6);
  assert.ok(chance("pcr")>chance("single-cell"));assert.ok(EXPERIMENTS.filter(item=>["pcr","elisa","clinical-monitor","cell-toxicity"].includes(item.id)).every(item=>item.baseSuccess>=.8));
});

test("next-step suggestions respond to evidence gaps",()=>{
  const state=createRun(812,CANDIDATES[0].id,setup());assert.ok(nextExperimentSuggestions(state).some(item=>item.id==="animal-model"||item.id==="cell-study"));state.projects[0].evidence.phenotype=1;assert.ok(nextExperimentSuggestions(state).some(item=>item.id==="pcr"));state.projects[0].evidence.molecular=1;assert.ok(nextExperimentSuggestions(state).some(item=>item.id==="wb"));
});

test("opening choices are introductory and the next paper follows its research line",()=>{
  for(let seed=1;seed<=100;seed+=1){const choices=getProjectChoices(seed);assert.equal(choices.length,3);assert.ok(choices.every(project=>project.stage<=2));assert.equal(new Set(choices.map(project=>project.programId)).size,3);}
  const current=PROJECTS.find(project=>project.programId==="tox-dili"&&project.stage===1)!;const next=getNextProjectChoices(42,current);
  assert.ok(next.some(project=>project.programId===current.programId&&project.stage>current.stage));
});

test("figure actions cover evidence once and cap main figures at six",()=>{
  let state=createRun(813,CANDIDATES[0].id,setup());const project=state.projects[0];
  project.evidence.phenotype=2;project.evidence.biochemical=1;
  for(let index=0;index<5;index+=1){const scheduled=scheduleActivity(state,"figure");assert.ok(scheduled.ok);if(!scheduled.ok)return;state=scheduled.state;}
  const resolved=resolveTurn(state);assert.ok(resolved.ok);if(!resolved.ok)return;
  const updated=resolved.state.state.projects[0];assert.equal(updated.figures,2);assert.deepEqual(updated.figureCoverage,["phenotype","biochemical"]);assert.ok(updated.figures<=6);
});

test("journal submission needs evidence coverage, not only a figure count",()=>{
  const state=createRun(814,CANDIDATES[0].id,setup());const project=state.projects[0];const journal=JOURNALS.find(item=>item.language==="中文")!;
  project.writingProgress=100;project.figures=journal.recommendedFigures[0];project.figureCoverage=["phenotype","molecular","replication"];
  assert.ok(journalSubmissionGaps(project,journal).length>0);assert.equal(submitManuscript(state,journal.id).ok,false);
  for(const key of new Set([...project.requiredEvidence,...journal.requiredEvidence]))project.evidence[key]=1;
  project.evidence.biochemical=1;
  assert.deepEqual(journalSubmissionGaps(project,journal),[]);assert.ok(submitManuscript(state,journal.id).ok);
});

test("external review allows exactly one parallel second paper and project switching",()=>{
  let state=createRun(913,CANDIDATES[0].id,setup());state.manuscripts[0].status="under_review";const second=startParallelProject(state,{...PROJECTS[1],definitionId:PROJECTS[1].id,mode:"base"},"base");assert.ok(second.ok);if(!second.ok)return;state=second.state;assert.equal(state.projects.filter(item=>item.active).length,2);const switched=switchProject(state,state.projects[0].runId);assert.ok(switched.ok);if(!switched.ok)return;state=switched.state;const blocked=startParallelProject(state,{...PROJECTS[2],definitionId:PROJECTS[2].id,mode:"base"},"base");assert.equal(blocked.ok,false);assert.equal(state.currentProjectRunId,state.projects[0].runId);
});

test("review requests are completed by matching evidence and work",()=>{
  const state=createRun(1014,CANDIDATES[0].id,setup());const paper=state.manuscripts[0];const project=state.projects[0];paper.status="revision";paper.reviewRequests=[
    {id:"r-e",kind:"evidence",text:"补病理",evidence:"histology",baseline:0,target:1,suggestedAction:"病理切片",suggestedExperimentIds:["he"],essential:true,completed:false},
    {id:"r-a",kind:"analysis",text:"补统计",baseline:state.stats.data,target:state.stats.data+1,suggestedAction:"数据分析",suggestedExperimentIds:[],essential:true,completed:false},
    {id:"r-f",kind:"figure",text:"补图",baseline:0,target:1,suggestedAction:"论文画图",suggestedExperimentIds:[],essential:false,completed:false},
    {id:"r-w",kind:"writing",text:"补讨论",baseline:0,target:8,suggestedAction:"论文写作",suggestedExperimentIds:[],essential:true,completed:false},
  ];project.evidence.histology=1;state.stats.data+=1;project.figures=1;project.writingProgress=8;evaluateReviewRequests(state,paper.id);assert.ok(paper.reviewRequests.every(item=>item.completed));
});

test("peer review creates concrete tasks and a revision deadline",()=>{
  const state=createRun(1115,CANDIDATES[0].id,setup());const paper=state.manuscripts[0];const project=state.projects[0];paper.status="under_review";paper.journalId="comparative-med";paper.decisionTurn=state.turn;project.evidence.phenotype=1;project.evidence.histology=1;project.evidence.molecular=1;project.evidence.mechanism=1;const results=[];advanceReview(state,()=>.5,results);assert.equal(paper.status,"revision");assert.ok(paper.reviewRequests.length>=3);assert.ok(paper.reviewDeadlineTurn&&paper.reviewDeadlineTurn>state.turn);assert.ok(paper.reviewRequests.some(item=>item.kind==="analysis"));assert.ok(paper.reviewRequests.some(item=>item.kind==="writing"));
});

test("candidate refresh is one non-overlapping three-person set", () => {
  const first=getCandidateSet(90210,0).map(item=>item.id);const second=getCandidateSet(90210,1).map(item=>item.id);
  assert.equal(first.length,3);assert.equal(second.length,3);assert.equal(first.filter(id=>second.includes(id)).length,0);
});

test("new runs use 3-10 lab members and exactly 20 percent credit", () => {
  for(let seed=1;seed<=300;seed+=1){const state=createRun(seed,CANDIDATES[seed%CANDIDATES.length].id,setup());assert.ok(state.lab.length>=3&&state.lab.length<=10);assert.equal(state.funding.creditLimit,Math.round(state.funding.initial*.2));assert.ok(GRADUATION_RULES.some(rule=>rule.id===state.graduationRuleId));}
});

test("two experiments can run in parallel and a third is blocked", () => {
  let state=createRun(44,CANDIDATES[0].id,setup());
  const first=scheduleExperiment(state,"clinical-monitor");assert.ok(first.ok);if(!first.ok)return;state=first.state;
  const second=scheduleExperiment(state,"pcr");assert.ok(second.ok);if(!second.ok)return;state=second.state;
  const third=scheduleExperiment(state,"cell-toxicity");assert.equal(third.ok,false);
  const fill=scheduleActivity(state,"literature");assert.ok(fill.ok);if(!fill.ok)return;
  assert.ok(resolveTurn(fill.state).ok);
});

test("long experiments cross turns and are charged once", () => {
  let state=createRun(2026,CANDIDATES[1].id,setup());const starting=state.funding.balance;
  const overtime=setOvertime(state,2);assert.ok(overtime.ok);if(!overtime.ok)return;state=overtime.state;
  const scheduled=scheduleExperiment(state,"animal-model");assert.ok(scheduled.ok);if(!scheduled.ok)return;
  const first=resolveTurn(scheduled.state);assert.ok(first.ok);if(!first.ok)return;state=first.state.state;
  assert.equal(state.activeExperiments[0].completedSlots,7);assert.equal(state.funding.balance,starting-28);
  state.pendingEventId=null;
  assert.equal(state.plan.length,1);assert.equal(state.plan[0].locked,true);assert.equal(state.plan[0].slots,3);assert.match(state.plan[0].label,/续作/);
  assert.equal(clearPlan(state).plan.length,1);
  const filled=autoFillPlan(state);const done=resolveTurn(filled);assert.ok(done.ok);if(!done.ok)return;
  assert.equal(done.state.state.activeExperiments.length,0);assert.equal(done.state.state.funding.balance,starting-28);
});

test("omics and analysis wait for prepared samples and upstream data", () => {
  const state=createRun(119,CANDIDATES[0].id,setup());
  assert.equal(scheduleExperiment(state,"transcriptomics").ok,false);
  assert.equal(scheduleExperiment(state,"bioinformatics").ok,false);
  assert.equal(scheduleExperiment(state,"multiomics").ok,false);
});

test("negative balance freezes new paid experiments", () => {
  const state=createRun(78,CANDIDATES[0].id,setup());state.funding.balance=-1;
  assert.equal(scheduleExperiment(state,"pcr").ok,false);
});

test("overtime consumes energy and SAN", () => {
  let state=createRun(99,CANDIDATES[0].id,setup());const energy=state.resources.energy;const san=state.resources.san;
  const overtime=setOvertime(state,2);assert.ok(overtime.ok);if(!overtime.ok)return;state=autoFillPlan(overtime.state);
  const result=resolveTurn(state);assert.ok(result.ok);if(!result.ok)return;
  assert.ok(result.state.state.resources.energy<energy);assert.ok(result.state.state.resources.san<=san+6);
});

test("advisor extra-experiment demands persist and resolve across turns", () => {
  let state=createRun(314,CANDIDATES[0].id,setup());const event=EVENTS.find(item=>item.id==="conflict-extra-experiments")!;state.pendingEventId=event.id;
  state=applyEventChoice(state,event.choices[0]);const demand=getActiveAdvisorDemand(state);assert.ok(demand);if(!demand)return;
  const funding=state.funding.balance;state.totalExperiments=demand.target;state=autoFillPlan(state);
  const result=resolveTurn(state);assert.ok(result.ok);if(!result.ok)return;
  assert.equal(getActiveAdvisorDemand(result.state.state),null);assert.ok(result.state.state.flags.includes("demand-extra-complete"));assert.equal(result.state.state.funding.balance,funding+18);
});

test("graduation is impossible before turn 78", () => {
  const state=createRun(7,CANDIDATES[0].id,setup());state.manuscripts[0].status="accepted";state.manuscripts[0].publicationClass="SCI_HIGH";state.projects[0].thesisProgress=100;state.turn=77;
  assert.equal(evaluateGraduation(state).eligible,false);state.turn=78;assert.equal(evaluateGraduation(state).eligible,evaluateGraduation(state).papers);
});

test("10,000 seeded starts cover all authored archetypes", () => {
  const advisors=new Set<string>();const candidates=new Set<string>();const rules=new Set<string>();let rosterTotal=0;
  for(let seed=1;seed<=10_000;seed+=1){const candidate=CANDIDATES[seed%CANDIDATES.length];const state=createRun(seed,candidate.id,setup());advisors.add(state.advisorId);candidates.add(state.candidateId);rules.add(state.graduationRuleId);rosterTotal+=state.lab.length;}
  assert.equal(advisors.size,9);assert.equal(candidates.size,12);assert.equal(rules.size,4);assert.ok(rosterTotal/10_000>=3&&rosterTotal/10_000<=10);
});
