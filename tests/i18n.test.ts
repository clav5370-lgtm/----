import assert from "node:assert/strict";
import test from "node:test";
import { ACTIVITIES, ADVISORS, CANDIDATES, ENDINGS, EVENTS, EXPERIMENTS, NPC_POOL, PROJECTS, RESEARCH_PROGRAMS } from "../app/game/content.ts";
import { activityText, advisorText, candidateText, choiceText, endingText, eventText, experimentText, memberText, programText, projectText } from "../app/game/i18n.tsx";

const hasCjk=(value:unknown)=>/[\u3400-\u9fff]/.test(JSON.stringify(value));

test("all authored gameplay inventories provide English-facing copy",()=>{
  for(const candidate of CANDIDATES){const copy=candidateText(candidate,"en-US");assert.equal(hasCjk([copy.name,copy.background,copy.bio,copy.trait,copy.traitEffect,copy.flaw,copy.flawEffect]),false,candidate.id);}
  for(const advisor of ADVISORS){const copy=advisorText(advisor,"en-US");assert.equal(hasCjk([copy.name,copy.title,copy.supervision,copy.honor,copy.strictness,copy.archetype,copy.quote]),false,advisor.id);}
  for(const program of RESEARCH_PROGRAMS){const copy=programText(program,"en-US");assert.equal(hasCjk([copy.domain,copy.name,copy.summary]),false,program.id);}
  for(const project of PROJECTS){const copy=projectText(project,"en-US");assert.equal(hasCjk([copy.title,copy.domain,copy.intervention,copy.model,copy.mechanismAxis,copy.route,copy.question,copy.knowledgeGap]),false,project.id);}
  for(const experiment of EXPERIMENTS){const copy=experimentText(experiment,"en-US");assert.equal(hasCjk([copy.name,copy.short,copy.description,copy.equipment,copy.sample]),false,experiment.id);}
  for(const [id,activity] of Object.entries(ACTIVITIES)){const copy=activityText(id as keyof typeof ACTIVITIES,activity,"en-US");assert.equal(hasCjk([copy.name,copy.description]),false,id);}
  for(const ending of ENDINGS){const copy=endingText(ending,"en-US")!;assert.equal(hasCjk([copy.title,copy.family,copy.description]),false,ending.id);}
});

test("events and every A-B-C-D choice have English copy",()=>{
  for(const event of EVENTS){const copy=eventText(event,"en-US");assert.equal(hasCjk([copy.category,copy.speaker,copy.title,copy.text]),false,event.id);for(const [index,choice] of event.choices.entries()){const translated=choiceText(choice,event,index,"en-US");assert.equal(hasCjk([translated.label,translated.hint]),false,`${event.id}:${index}`);}}
});

test("the twenty lab members have stable English identities",()=>{
  NPC_POOL.forEach((member,index)=>{const copy=memberText(member,"en-US",index);assert.equal(hasCjk([copy.name,copy.role,copy.specialty,copy.personality]),false,member.id);});
});
