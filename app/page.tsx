"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ACTIONS, ADVISORS, Candidate, EVIDENCE_LABELS, EVENTS, EvidenceKey, GameAction,
  JOURNALS, NPCS, PROJECTS, RESOURCE_LABELS, ResourceKey, STAT_LABELS, StatKey, StoryEvent,
} from "./game-data";

type Outcome = "清晰阳性" | "弱阳性" | "阴性结果" | "矛盾结果" | "技术失败" | "意外发现";
type RunLog = { week: number; title: string; text: string; type: string };
type GameState = {
  seed: number;
  candidate: Candidate;
  advisor: (typeof ADVISORS)[number];
  project: (typeof PROJECTS)[number];
  week: number;
  resources: Record<ResourceKey, number>;
  stats: Record<StatKey, number>;
  evidence: Record<EvidenceKey, number>;
  familiarity: Record<string, number>;
  figures: number;
  manuscript: number;
  integrity: number;
  relation: number;
  debt: number;
  failures: number;
  experiments: number;
  negative: number;
  minSan: number;
  flags: string[];
  logs: RunLog[];
  journal: string;
  reviewStatus: "none" | "revision" | "accepted" | "rejected";
  revision: number;
  submissions: number;
};
type ResultRow = { icon: string; name: string; result: string; detail: string; tone: string };
type Modal =
  | { type: "results"; rows: ResultRow[]; nextEvent?: StoryEvent; milestone?: "proposal" | "midterm" }
  | { type: "event"; event: StoryEvent }
  | { type: "panel"; panel: "proposal" | "midterm" | "defense" }
  | { type: "journal" }
  | { type: "review"; decision: string; requirements: string[] }
  | { type: "report"; ending: string };

const EMPTY_EVIDENCE: Record<EvidenceKey, number> = { phenotype:0, biochemical:0, histology:0, mechanism:0, rescue:0, replication:0 };
const FIRST_NAMES = ["林晓满","周一鸣","陈若水","高飞","唐可可","李思源","沈星池","陆九月","陈默","方糖"];
const BACKGROUNDS = ["本专业保研生","跨专业考研生","调剂上岸生","本科科研达人","零实验经验","数学背景转行","实验室老油条"];
const BIOS = ["手很稳，但看到 R 就开始困。","相信一切问题都可以用脚本解决。","擅长说服别人，不擅长说服自己早睡。","理论像一座山，移液枪像一堵墙。","普通得令人安心，也因此最不可预测。"];
const TRAITS = ["手稳·实验失败保护","数据直觉·异常也有价值","越挫越勇·连败后成功率提升","夜行动物·低精力惩罚减弱","文献雷达·更快解锁机制","咖啡因体质·摸鱼多回精力"];
const FLAWS = ["社恐·求助收益降低","拖延症·前期写作效率低","玻璃心·批评额外损失 SAN","手残·精密实验风险提高","不会拒绝·人情债增长更快"];

function rngFrom(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5; let n = t;
    n = Math.imul(n ^ (n >>> 15), n | 1); n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCandidates(seed: number): Candidate[] {
  const rng = rngFrom(seed);
  return [0,1,2].map((i) => {
    const focus = (Math.floor(rng()*5)+i)%5;
    const weak = (focus+2+Math.floor(rng()*2))%5;
    const keys: StatKey[] = ["wet","data","writing","theory","social"];
    const values = keys.map((_,idx) => Math.max(18,Math.min(92,42+Math.floor(rng()*22)+(idx===focus?25:0)-(idx===weak?23:0))));
    return {
      name:FIRST_NAMES[(Math.floor(rng()*FIRST_NAMES.length)+i)%FIRST_NAMES.length],
      background:BACKGROUNDS[Math.floor(rng()*BACKGROUNDS.length)], bio:BIOS[Math.floor(rng()*BIOS.length)],
      stats:Object.fromEntries(keys.map((key,idx)=>[key,values[idx]])) as Record<StatKey,number>,
      trait:TRAITS[Math.floor(rng()*TRAITS.length)], flaw:FLAWS[Math.floor(rng()*FLAWS.length)],
      avatar:["🧪","🧬","💻"][i],
    };
  });
}

function clamp(value:number,min=0,max=100){ return Math.max(min,Math.min(max,value)); }
function phaseFor(week:number,state:GameState){
  if(state.reviewStatus==="accepted") return "毕业冲刺";
  if(state.reviewStatus==="revision") return "Reviewer 修回";
  if(state.manuscript>=3) return "论文与投稿";
  if(week>=9) return "数据整合";
  if(week>=5) return "正式实验";
  return "预实验";
}
function evidenceTotal(e:Record<EvidenceKey,number>){ return Object.values(e).reduce((a,b)=>a+b,0); }
function evidenceUnique(e:Record<EvidenceKey,number>){ return Object.values(e).filter(v=>v>0).length; }
function paperQuality(state:GameState){ return Math.round(evidenceUnique(state.evidence)*7 + Math.min(12,evidenceTotal(state.evidence)*2) + state.figures*4 + state.manuscript*3 + state.stats.writing*.12 + state.project.novelty*.12 + state.integrity*.06); }

function ResourceBars({state}:{state:GameState}){
  return <div className="resource-strip">{(Object.keys(RESOURCE_LABELS) as ResourceKey[]).map(key=>{
    const raw=state.resources[key]; const pct=key==="funding"?raw:clamp(raw); return <div className="resource" key={key}>
      <div className="resource-head"><span>{RESOURCE_LABELS[key].icon} {RESOURCE_LABELS[key].name}</span><strong>{key==="funding"?`¥${raw}k`:raw}</strong></div>
      <i><b className={`${key} ${raw<25?"danger":""}`} style={{width:`${pct}%`}} /></i>
    </div>;
  })}</div>;
}

export default function Home(){
  const [seed,setSeed]=useState(240731);
  const [screen,setScreen]=useState<"start"|"game">("start");
  const [selected,setSelected]=useState<number|null>(null);
  const [state,setState]=useState<GameState|null>(null);
  const [schedule,setSchedule]=useState<(GameAction|null)[]>([null,null,null,null,null]);
  const [modal,setModal]=useState<Modal|null>(null);
  const [detail,setDetail]=useState(false);
  const [muted,setMuted]=useState(false);
  const [tab,setTab]=useState<"actions"|"people"|"log">("actions");
  const [hasSave,setHasSave]=useState(false);
  const candidates=useMemo(()=>makeCandidates(seed),[seed]);

  useEffect(()=>{ const frame=requestAnimationFrame(()=>setHasSave(Boolean(localStorage.getItem("lab-life-save"))));return()=>cancelAnimationFrame(frame); },[]);
  useEffect(()=>{ if(state && screen==="game") localStorage.setItem("lab-life-save",JSON.stringify(state)); },[state,screen]);

  const sound=(kind:"click"|"success"|"fail")=>{
    if(muted)return;
    try{ const AudioCtx=window.AudioContext || (window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext; const ctx=new AudioCtx(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.type="square"; o.frequency.value=kind==="success"?620:kind==="fail"?150:330; g.gain.setValueAtTime(.035,ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.1); o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.11); }catch{ /* Audio is optional. */ }
  };

  const startRun=(candidate:Candidate)=>{
    const rng=rngFrom(seed);
    const advisor=ADVISORS[Math.floor(rng()*ADVISORS.length)]; const project=PROJECTS[Math.floor(rng()*PROJECTS.length)];
    const fresh:GameState={ seed,candidate,advisor,project,week:1,resources:{energy:82,san:candidate.trait.includes("夜行")?65:76,funding:78,trust:52},stats:{...candidate.stats},evidence:{...EMPTY_EVIDENCE},familiarity:{},figures:0,manuscript:0,integrity:100,relation:30,debt:0,failures:0,experiments:0,negative:0,minSan:76,flags:[],logs:[{week:1,title:"研一·入学",text:`加入 ${advisor.name} 课题组，接手课题《${project.title}》。`,type:"start"}],journal:"",reviewStatus:"none",revision:0,submissions:0};
    setState(fresh);setHasSave(true);setScreen("game");setSchedule([null,null,null,null,null]);sound("success");
  };

  const continueRun=()=>{ try{const raw=localStorage.getItem("lab-life-save");if(raw){setState(JSON.parse(raw));setScreen("game");}}catch{ /* Ignore malformed local saves. */ } };
  const addAction=(action:GameAction)=>{ const idx=schedule.findIndex(x=>!x);if(idx<0)return;sound("click");setSchedule(prev=>prev.map((v,i)=>i===idx?action:v)); };
  const removeAction=(idx:number)=>{sound("click");setSchedule(prev=>prev.map((v,i)=>i===idx?null:v));};
  const isUnlocked=(action:GameAction)=> !action.requires || Boolean(state?.evidence[action.requires]);

  const resolveWeek=()=>{
    if(!state || schedule.some(x=>!x))return;
    const next:GameState=structuredClone(state); const rows:ResultRow[]=[]; const weekSeed=state.seed+state.week*997+state.experiments*31; const rng=rngFrom(weekSeed);
    for(const item of schedule as GameAction[]){
      if(item.kind==="recovery"){
        const sanGain=item.id==="sleep"?19:13; const energyGain=item.id==="sleep"?22:11+(next.candidate.trait.includes("咖啡因")?5:0);
        next.resources.energy=clamp(next.resources.energy+energyGain);next.resources.san=clamp(next.resources.san+sanGain);
        if(item.id==="games" && next.week>=12) next.resources.trust=clamp(next.resources.trust-2);
        rows.push({icon:item.icon,name:item.name,result:"恢复完成",detail:`精力 +${energyGain}·SAN +${sanGain}`,tone:"good"});continue;
      }
      next.resources.energy=clamp(next.resources.energy-item.cost); next.resources.funding=clamp(next.resources.funding-item.funding);
      if(item.id==="literature"){
        next.stats.theory=clamp(next.stats.theory+(rng()>.55?2:1));next.resources.san=clamp(next.resources.san-2);
        rows.push({icon:item.icon,name:item.name,result:next.stats.theory>55?"找到了关键缺口":"补完了知识地图",detail:`理论能力提升·当前 ${next.stats.theory}`,tone:"good"});continue;
      }
      if(item.id==="analysis"){
        const good=rng()<(next.stats.data/110+.18); if(good){next.figures+=1;next.stats.data=clamp(next.stats.data+1);}
        else next.resources.san=clamp(next.resources.san-5);
        rows.push({icon:item.icon,name:item.name,result:good?`Figure ${next.figures} 完成`:"脚本报错到深夜",detail:good?"数据已进入论文结构":"未产生可用 Figure",tone:good?"good":"bad"});continue;
      }
      if(item.id==="writing"){
        const gain=Math.max(1,Math.floor(next.stats.writing/35)-(next.candidate.flaw.includes("拖延")&&next.week<10?1:0));next.manuscript=Math.min(8,next.manuscript+gain);
        next.stats.writing=clamp(next.stats.writing+1);rows.push({icon:item.icon,name:item.name,result:["标题文件已建立","方法学有了骨架","结果串成了故事","初稿逐渐完整"][Math.min(3,next.manuscript-1)]||"稿件继续完善",detail:`稿件完成度 ${Math.min(100,next.manuscript*14)}%`,tone:"good"});continue;
      }
      if(item.id==="senior"){
        const gain=next.candidate.flaw.includes("社恐")?5:10;next.relation=clamp(next.relation+gain);next.debt+=1;next.stats.social=clamp(next.stats.social+1);
        if(next.evidence.mechanism===0&&next.evidence.biochemical>0)next.familiarity.mechanism=(next.familiarity.mechanism||0)+15;
        rows.push({icon:item.icon,name:item.name,result:"师兄在本子上画了一张图",detail:`关系 +${gain}·人情债 +1`,tone:"good"});continue;
      }
      if(item.id==="funding"){
        const grant=16+Math.floor(next.resources.trust/8);next.resources.funding=clamp(next.resources.funding+grant);next.resources.trust=clamp(next.resources.trust-2);next.stats.social=clamp(next.stats.social+1);
        rows.push({icon:item.icon,name:item.name,result:"导师批了一小笔机动经费",detail:`经费 +¥${grant}k·导师期待 ↑`,tone:"good"});continue;
      }
      next.experiments+=1;
      const fam=next.familiarity[item.id]||0; const fatigue=(100-next.resources.energy)/260; const badLuck=next.failures>=3?.18:0; const steady=next.candidate.trait.includes("手稳")?.08:0; const clumsy=next.candidate.flaw.includes("手残")?.08:0;
      const success=clamp(.18+next.stats[item.skill]/145+fam/300-fatigue+badLuck+steady-clumsy,.18,.88);const roll=rng(); let outcome:Outcome;
      if(roll<success*.55)outcome="清晰阳性";else if(roll<success)outcome="弱阳性";else if(roll<success+.13)outcome="阴性结果";else if(roll<success+.2)outcome="矛盾结果";else if(roll>.97)outcome="意外发现";else outcome="技术失败";
      next.familiarity[item.id]=Math.min(100,fam+12);next.stats.wet=clamp(next.stats.wet+1);
      if(outcome==="清晰阳性"||outcome==="意外发现"){ if(item.evidence)next.evidence[item.evidence]+=1;next.failures=0;next.resources.trust=clamp(next.resources.trust+2); }
      else if(outcome==="弱阳性"){ if(item.evidence && next.evidence[item.evidence]===0)next.evidence[item.evidence]=1;next.failures=0; }
      else if(outcome==="阴性结果"||outcome==="矛盾结果"){next.negative+=1;next.resources.san=clamp(next.resources.san-4);next.failures=0;}
      else {next.failures+=1;next.resources.san=clamp(next.resources.san-7);if(next.candidate.trait.includes("越挫"))next.familiarity[item.id]+=8;}
      rows.push({icon:item.icon,name:item.name,result:outcome,detail:detail?`成功率 ${Math.round(success*100)}%·熟练度 ${next.familiarity[item.id]}%`:outcome==="技术失败"?"试剂、手法或样本都可能是原因":outcome==="阴性结果"?"假说没有得到支持，但路线更清晰了":"证据已写入项目树",tone:outcome==="技术失败"?"bad":outcome.includes("阴")||outcome.includes("矛盾")?"neutral":"good"});
    }
    next.week+=1;next.resources.san=clamp(next.resources.san-(next.week>12?2:0));next.minSan=Math.min(next.minSan,next.resources.san);
    if(next.reviewStatus==="revision")next.revision+=schedule.filter(x=>x&&["research","analysis","writing"].includes(x.kind)).length;
    next.logs.push({week:state.week,title:`Week ${state.week} · ${phaseFor(state.week,state)}`,text:rows.map(r=>`${r.name}：${r.result}`).join("；"),type:"week"});
    const nextEvent=chooseEvent(next,rng); const milestone=next.week===4?"proposal":next.week===8?"midterm":undefined;
    setState(next);setSchedule([null,null,null,null,null]);setModal({type:"results",rows,nextEvent,milestone});sound(rows.some(r=>r.tone==="bad")?"fail":"success");
  };

  const chooseEvent=(s:GameState,rng:()=>number):StoryEvent|undefined=>{
    if(s.week===2&&!s.flags.includes("antibody"))return EVENTS.find(e=>e.id==="antibody");
    if(s.week>=6&&s.flags.includes("borrowed")&&!s.flags.includes("favor"))return EVENTS.find(e=>e.id==="favor");
    const eligible=EVENTS.filter(e=>!["antibody","favor"].includes(e.id)&&!s.flags.includes(e.id));
    return rng()<.62?eligible[Math.floor(rng()*eligible.length)]:undefined;
  };

  const closeResults=()=>{
    if(modal?.type!=="results")return; const nextEvent=modal.nextEvent; const milestone=modal.milestone;
    if(milestone)setModal({type:"panel",panel:milestone});else if(nextEvent)setModal({type:"event",event:nextEvent});else setModal(null);
  };

  const applyEvent=(event:StoryEvent,effect:string)=>{
    if(!state)return;const next=structuredClone(state);next.flags.push(event.id);let log="";
    switch(effect){
      case"borrow":next.flags.push("borrowed");next.debt+=2;next.familiarity.mechanism=(next.familiarity.mechanism||0)+18;next.relation+=8;log="你借到了抗体，也记下了一笔人情。";break;
      case"buy_self":next.resources.funding-=12;next.resources.trust+=2;log="你用经费换来了独立性。";break;
      case"repay":next.resources.energy-=14;next.relation+=18;next.debt=Math.max(0,next.debt-2);log="清晨六点，你还掉了这笔人情债。";break;
      case"refuse_favor":next.relation-=16;next.debt+=1;log="师兄回了一个“好”，没有表情。";break;
      case"save_samples":next.resources.energy-=18;next.resources.trust+=10;next.relation+=8;log="样本保住了，你在凌晨见证了冰箱的沉默。";break;
      case"trust_lab":if(next.seed%3===0){next.evidence.replication=Math.max(0,next.evidence.replication-1);next.resources.san-=12;log="样本化了一小部分，一次重复证据丢失。";}else{next.resources.san+=7;log="值班同门处理得很好。";}break;
      case"ask_why":next.stats.theory+=3;next.resources.san-=next.candidate.flaw.includes("玻璃心")?12:7;log="你被追问了十分钟，但终于看懂了缺口。";break;
      case"accept_critique":next.resources.trust+=5;next.resources.san-=5;next.familiarity.rescue=(next.familiarity.rescue||0)+15;log="批评变成了一张新实验设计图。";break;
      case"eat":next.resources.san+=16;next.resources.energy+=10;next.relation+=5;log="这顿饭最终还是谈了 p 值，但你心情好多了。";break;
      case"skip_lunch":next.figures+=1;next.resources.san-=8;log="胶跑得很直，你错过了免费甜品。";break;
      case"race":next.project.novelty+=5;next.resources.san-=10;next.familiarity.rescue=(next.familiarity.rescue||0)+20;next.flags.push("scoop-risk");log="课题组进入了赛跑模式。";break;
      case"pivot":next.project.mechanism=next.project.mechanism==="铁死亡"?"线粒体自噬":"铁死亡";next.project.novelty+=9;next.evidence.mechanism=0;log=`项目转向 ${next.project.mechanism}，机制证据需要重新建立。`;break;
      case"milk_tea":next.resources.san+=17;next.relation+=7;log="奶茶杯被留在了工位上，当作小小的护身符。";break;
      case"honest":next.integrity=100;next.resources.trust+=4;log="你报告了全部数据和预定剔除标准。";break;
      case"hide_points":next.integrity-=32;next.manuscript+=1;next.flags.push("integrity-risk");log="图变好看了，但档案里多了一枚红旗。";break;
      case"recover_drive":next.debt+=2;next.relation+=5;log="师姐用一根奇怪的转接线救回了 Figure 3。";break;
      case"redo_analysis":next.resources.energy-=16;next.stats.data+=3;next.figures+=1;log="凌晨三点，你重做了 Figure 3，还找到了旧脚本的 bug。";break;
      case"weekend_work":next.manuscript+=1;next.resources.san-=9;next.resources.trust+=3;log="这个周末被折叠进了一页幻灯片。";break;
      case"weekend_rest":next.resources.san+=12;next.resources.trust-=2;log="你和手机保持了一天社交距离。";break;
    }
    next.resources.energy=clamp(next.resources.energy);next.resources.san=clamp(next.resources.san);next.resources.funding=clamp(next.resources.funding);next.resources.trust=clamp(next.resources.trust);next.relation=clamp(next.relation);next.stats={wet:clamp(next.stats.wet),data:clamp(next.stats.data),writing:clamp(next.stats.writing),theory:clamp(next.stats.theory),social:clamp(next.stats.social)};next.logs.push({week:next.week,title:event.title,text:log,type:"event"});next.minSan=Math.min(next.minSan,next.resources.san);setState(next);setModal(null);sound("click");
  };

  const finishPanel=(panel:"proposal"|"midterm"|"defense",choice:number)=>{
    if(!state)return;const next=structuredClone(state);
    if(panel==="proposal"){
      const score=next.stats.theory+evidenceUnique(next.evidence)*10+choice*4;next.resources.trust=clamp(next.resources.trust+(score>65?7:-3));next.resources.san=clamp(next.resources.san-(score>65?4:10));next.flags.push("proposal-passed");next.logs.push({week:next.week,title:"开题答辩通过",text:score>65?"评审认为设计有逻辑，建议强化因果证据。":"陷险通过，需在两周内补交实验设计。",type:"milestone"});setState(next);setModal(null);
    }else if(panel==="midterm"){
      const stable=evidenceUnique(next.evidence)>=3;next.resources.trust=clamp(next.resources.trust+(stable?8:-7));next.resources.san=clamp(next.resources.san-(stable?3:12));next.flags.push("midterm-passed");next.logs.push({week:next.week,title:"中期考核通过",text:stable?"证据结构稳定，可以进入机制收口。":"被要求重新聚焦主线，但课题保留。",type:"milestone"});setState(next);setModal(null);
    }else{
      const q=paperQuality(next);let ending="顺利毕业";if(next.integrity<60)ending="带着秘密的毕业证";else if(q>=92&&next.resources.san>=45)ending="科研新星";else if(next.resources.san<25)ending="Reviewer Survivor";else if(next.logs.filter(l=>l.text.includes("摸鱼")).length>=3)ending="摸鱼宗师";next.logs.push({week:next.week,title:"毕业答辩通过",text:`委员会经讨论同意通过。结局：${ending}。`,type:"ending"});setState(next);setModal({type:"report",ending});sound("success");
    }
  };

  const submit=(journal:(typeof JOURNALS)[number])=>{
    if(!state)return;const next=structuredClone(state);const q=paperQuality(next);next.journal=journal.name;next.submissions+=1;let decision="Major Revision";if(q<journal.need-17)decision="Desk Reject";else if(q<journal.need-6)decision="Reject";else if(q>journal.need+18)decision="Minor Revision";
    if(decision==="Desk Reject"||decision==="Reject"){next.reviewStatus="rejected";next.resources.san=clamp(next.resources.san-12);next.logs.push({week:next.week,title:`${journal.name}：${decision}`,text:"稿件被退回，但评论中藏着下一版的路线。",type:"review"});}
    else{next.reviewStatus="revision";next.revision=0;next.logs.push({week:next.week,title:`${journal.name}：${decision}`,text:"审稿人要求补充统计说明、机制验证与 Figure 整合。",type:"review"});}
    setState(next);setModal({type:"review",decision,requirements:decision.includes("Reject")?["补强证据结构","重写故事后可转投"]:["Reviewer 1·补充统计方法说明","Reviewer 2·增加机制或挽救实验","Reviewer 3·重组 Figure 并补充图注"]});sound(decision.includes("Reject")?"fail":"success");
  };

  const replyReview=()=>{
    if(!state)return;const next=structuredClone(state);const success=next.revision>=3&&paperQuality(next)>=52;
    next.reviewStatus=success?"accepted":"rejected";next.logs.push({week:next.week,title:success?"论文接收":"修回后仍被拒稿",text:success?`${next.journal} 发来了 Accept 邮件。`:"编辑认为核心问题仍未解决，可以转投。",type:"review"});next.resources.san=clamp(next.resources.san+(success?16:-12));next.resources.trust=clamp(next.resources.trust+(success?12:-3));setState(next);setModal({type:"review",decision:success?"Accept":"Reject after Revision",requirements:success?["你的证据链、图表和回应说服了编辑。","现在可以进入毕业答辩。"]:["证据链仍有缺口。","建议继续实验或选择更稳妥的期刊。"]});sound(success?"success":"fail");
  };

  if(screen==="start" || !state) return <StartScreen seed={seed} setSeed={setSeed} candidates={candidates} selected={selected} setSelected={setSelected} onStart={startRun} hasSave={hasSave} onContinue={continueRun} />;

  const stage=phaseFor(state.week,state);const quality=paperQuality(state);const canSubmit=state.week>=10&&evidenceUnique(state.evidence)>=3&&state.figures>=2&&state.manuscript>=3;
  return <main className="game-shell">
    <header className="game-top">
      <div className="mini-brand"><b>LL</b><span>实验室摸鱼模拟器</span></div>
      <div className="clock"><span>YEAR {Math.min(3,Math.ceil(state.week/4))}</span><strong>WEEK {String(state.week).padStart(2,"0")}</strong><em>{stage}</em></div>
      <div className="top-tools"><button onClick={()=>setDetail(v=>!v)} className={detail?"active":""}>详细模式</button><button onClick={()=>setMuted(v=>!v)}>{muted?"🔇":"🔊"}</button><button onClick={()=>{setScreen("start");setSelected(null);}}>保存并退出</button></div>
    </header>
    <ResourceBars state={state}/>

    <div className="game-grid">
      <aside className="profile-panel game-panel">
        <div className="panel-label">RESEARCHER</div>
        <div className="profile-head"><div className="avatar-pixel">{state.candidate.avatar}</div><div><h2>{state.candidate.name}</h2><p>{state.candidate.background}</p></div></div>
        <div className="mini-stats">{(Object.keys(STAT_LABELS) as StatKey[]).map(key=><div key={key}><span>{STAT_LABELS[key]}</span><i><b style={{width:`${state.stats[key]}%`}} /></i><strong>{state.stats[key]}</strong></div>)}</div>
        <div className="trait-box"><small>TRAIT</small><b>{state.candidate.trait.split("·")[0]}</b><p>{state.candidate.trait.split("·")[1]}</p></div>
        <div className="advisor-card"><span>{state.advisor.icon}</span><div><small>ADVISOR·{state.advisor.visible}</small><b>{state.advisor.name}</b><p>信任度 {state.resources.trust}</p></div></div>
        <div className="pressure"><span>当前压力</span><b>{Math.round((100-state.resources.san)*.55+(state.week>12?20:0))}</b><i><em style={{width:`${clamp((100-state.resources.san)*.55+(state.week>12?20:0))}%`}} /></i></div>
      </aside>

      <section className="lab-stage">
        <Image src="/lab-evening.png" alt="像素风生物医学实验室晚间场景" fill sizes="(max-width: 760px) 100vw, 55vw" priority />
        <div className="scene-vignette" />
        <div className="scene-badge"><span>● {state.week%3===0?"23:41 · 深夜":"18:24 · 傍晚"}</span><b>{state.project.model}</b></div>
        <div className="npc-float npc-one"><span>{NPCS[0].icon}</span><b>{NPCS[0].name}</b><small>{state.relation>60?"可以请求高级帮助":"正在跑胶"}</small></div>
        <div className="lab-caption"><span>实验室·晚班</span><strong>{schedule.filter(Boolean).length===5?"本周计划已就绪":"把 5 个时间槽排满，然后开始这一周。"}</strong></div>
      </section>

      <aside className="project-panel game-panel">
        <div className="panel-label">RESEARCH PROJECT</div>
        <p className="project-code">RX-{state.seed.toString().slice(-4)} · 药理毒理</p><h3>{state.project.title}</h3>
        <div className="hypothesis"><small>HYPOTHESIS</small><p>{state.project.compound} 可能通过<strong>{state.project.mechanism}</strong>缓解 {state.project.model}。</p></div>
        <div className="evidence-tree">{(Object.keys(EVIDENCE_LABELS) as EvidenceKey[]).map((key,idx)=>{
          const value=state.evidence[key];const locked=idx>0&&!Object.values(state.evidence).slice(0,idx).some(v=>v>0);return <div key={key} className={`evidence-node ${value?"done":""} ${locked?"locked":""}`}><span>{value?"✓":locked?"·":"○"}</span><div><b>{EVIDENCE_LABELS[key].name}</b><small>{value?`${value} 组可用证据`:EVIDENCE_LABELS[key].detail}</small></div></div>;
        })}</div>
        <div className="paper-meter"><span>论文潜力 <b>{quality<55?"LOW":quality<78?"SOLID":"HIGH"}</b></span><i><em style={{width:`${Math.min(100,quality)}%`}} /></i><small>{state.figures} Figures · 稿件 {Math.min(100,state.manuscript*14)}% · 完整性 {state.integrity}</small></div>
        {state.reviewStatus==="revision"?<button className="project-cta" disabled={state.revision<3} onClick={replyReview}>回复 Reviewer · {state.revision}/3</button>:state.reviewStatus==="accepted"?<button className="project-cta success" disabled={state.week<12} onClick={()=>setModal({type:"panel",panel:"defense"})}>{state.week<12?`答辩材料准备中 · Week 12`:`参加毕业答辩 →`}</button>:<button className="project-cta" disabled={!canSubmit} onClick={()=>setModal({type:"journal"})}>{state.week<10?"投稿通道·Week 10 开放":state.reviewStatus==="rejected"?"重新选刊投稿":"准备投稿 →"}</button>}
      </aside>
    </div>

    <section className="planner">
      <div className="planner-tabs"><button className={tab==="actions"?"active":""} onClick={()=>setTab("actions")}>本周行动</button><button className={tab==="people"?"active":""} onClick={()=>setTab("people")}>同门关系</button><button className={tab==="log"?"active":""} onClick={()=>setTab("log")}>研究日志</button></div>
      <div className="schedule-row"><div className="slot-title"><small>WEEK {state.week}</small><b>5 SLOTS</b></div>{schedule.map((item,idx)=><button key={idx} className={`week-slot ${item?item.kind:"empty"}`} onClick={()=>removeAction(idx)} aria-label={item?`移除${item.name}`:"空时间槽"}><span>{item?item.icon:String(idx+1)}</span><div><small>{["周一","周二","周三","周四","周五"][idx]}</small><b>{item?.short||"空闲"}</b></div>{item&&<em>×</em>}</button>)}<button className="execute" disabled={schedule.some(x=>!x)} onClick={resolveWeek}><span>执行本周</span><b>▶</b></button></div>
      {tab==="actions"&&<div className="action-drawer">{ACTIONS.map(action=>{const unlocked=isUnlocked(action);return <button key={action.id} disabled={!unlocked||schedule.every(Boolean)} className={`action-card ${action.kind}`} onClick={()=>addAction(action)}><span>{action.icon}</span><div><b>{action.name}</b><small>{unlocked?action.desc:`需先获得${EVIDENCE_LABELS[action.requires!].name}`}</small></div><em>{action.cost<0?`+${-action.cost} 精力`:`-${action.cost} 精力`}</em></button>})}</div>}
      {tab==="people"&&<div className="people-drawer">{NPCS.map((npc,i)=><div className="person" key={npc.name}><span>{npc.icon}</span><div><b>{npc.name}</b><small>{npc.role}</small></div><i><em style={{width:`${clamp(state.relation-i*8)}%`}} /></i><strong>{i===0?`TRUST ${state.relation}`:`AFFINITY ${clamp(state.relation-i*8)}`}</strong></div>)}<div className="debt-card"><small>FAVOR DEBT</small><b>{state.debt}</b><p>帮助不是免费的，但关系也不只是数字。</p></div></div>}
      {tab==="log"&&<div className="log-drawer">{[...state.logs].reverse().slice(0,8).map((log,i)=><div className="log-item" key={`${log.week}-${i}`}><span>W{String(log.week).padStart(2,"0")}</span><div><b>{log.title}</b><p>{log.text}</p></div></div>)}</div>}
    </section>

    {modal&&<ModalLayer modal={modal} state={state} detail={detail} closeResults={closeResults} applyEvent={applyEvent} finishPanel={finishPanel} submit={submit} setModal={setModal}/>} 
  </main>;
}

function StartScreen({seed,setSeed,candidates,selected,setSelected,onStart,hasSave,onContinue}:{seed:number;setSeed:(n:number)=>void;candidates:Candidate[];selected:number|null;setSelected:(n:number|null)=>void;onStart:(c:Candidate)=>void;hasSave:boolean;onContinue:()=>void}){
  return <main className="start-screen"><header className="topbar"><div className="brand-mark">LL</div><div><p className="eyebrow">LAB LIFE : PUBLISH OR PERISH</p><h1>实验室摸鱼模拟器 <i>· 毕业生存指南</i></h1></div><div className="seed-chip">SEED&nbsp; {seed}</div></header>
    <section className="intro"><div><span className="chapter">01 / 入学报到</span><h2>选择你的<br/><em>研究生人生</em></h2></div><p>三封档案，三种命运。没有完美的开局，<br/>只有你愿意承担的弱项。</p></section>
    <section className="candidate-grid" aria-label="研究生候选人">{candidates.map((c,index)=><button key={`${seed}-${c.name}`} className={`candidate-card ${selected===index?"selected":""}`} onClick={()=>setSelected(index)}><span className="card-index">0{index+1}</span><div className="portrait"><span>{c.avatar}</span></div><div className="identity"><h3>{c.name}</h3><span>{c.background}</span></div><p className="bio">“{c.bio}”</p><div className="stats">{(Object.keys(STAT_LABELS) as StatKey[]).map(key=><div className="stat" key={key}><span>{STAT_LABELS[key]}</span><i><b style={{width:`${c.stats[key]}%`}}/></i><strong>{c.stats[key]}</strong></div>)}</div><div className="tags"><span className="trait">+ {c.trait}</span><span className="flaw">− {c.flaw}</span></div><span className="choose-label">{selected===index?"已选定":"查看档案"}</span></button>)}</section>
    <footer className="start-actions"><div>{hasSave&&<button className="continue" onClick={onContinue}>▶ 继续上次的研究生人生</button>}<button className="reroll" onClick={()=>{setSeed(Math.floor(Math.random()*900000)+100000);setSelected(null);}}>↻ 重新抽取命运</button></div><button className="begin" disabled={selected===null} onClick={()=>selected!==null&&onStart(candidates[selected])}><span>{selected===null?"请先选择一名研究生":`以 ${candidates[selected].name} 开始这一局`}</span><b>→</b></button></footer>
  </main>;
}

function ModalLayer({modal,state,detail,closeResults,applyEvent,finishPanel,submit,setModal}:{modal:Modal;state:GameState;detail:boolean;closeResults:()=>void;applyEvent:(e:StoryEvent,x:string)=>void;finishPanel:(p:"proposal"|"midterm"|"defense",c:number)=>void;submit:(j:(typeof JOURNALS)[number])=>void;setModal:(m:Modal|null)=>void}){
  if(modal.type==="results")return <div className="modal-wrap"><div className="modal result-modal"><div className="modal-top"><span>WEEK {state.week-1} / EXECUTION REPORT</span><b>本周实验记录</b></div><div className="result-list">{modal.rows.map((row,i)=><div className={`result-row ${row.tone}`} style={{animationDelay:`${i*.06}s`}} key={i}><span>{row.icon}</span><div><small>{row.name}</small><b>{row.result}</b><p>{row.detail}</p></div><em>{row.tone==="good"?"DATA +":row.tone==="bad"?"CHECK":"NOTE"}</em></div>)}</div><div className="modal-summary"><span>项目证据 {evidenceTotal(state.evidence)}</span><span>Figures {state.figures}</span><span>SAN {state.resources.san}</span>{detail&&<span>失败保护 {state.failures}/3</span>}</div><button className="modal-next" onClick={closeResults}>{modal.milestone?"进入阶段考核":modal.nextEvent?"处理突发事件":"返回实验室"} →</button></div></div>;
  if(modal.type==="event"){const e=modal.event;return <div className="modal-wrap"><div className={`modal event-modal ${e.tone}`}><div className="event-stripe">EVENT GRAPH · MEMORY ENABLED</div><div className="event-speaker"><span>{e.icon}</span><div><b>{e.speaker}</b><small>{e.role}</small></div></div><h2>{e.title}</h2><p className="event-text">{e.text}</p><div className="event-choices">{e.choices.map(choice=><button key={choice.effect} onClick={()=>applyEvent(e,choice.effect)}><span>{choice.label}</span><small>{choice.hint}</small><b>→</b></button>)}</div></div></div>}
  if(modal.type==="panel"){const isDefense=modal.panel==="defense",isMid=modal.panel==="midterm";const title=isDefense?"毕业论文答辩":isMid?"研究生中期考核":"课题开题答辩";const question=isDefense?"你如何证明这不只是一条相关性通路？":isMid?"目前的证据结构能否支撑按期毕业？":"为什么选择这个模型，如何排除混杂因素？";return <div className="modal-wrap"><div className="modal panel-modal"><span className="panel-stamp">PANEL CHECK</span><h2>{title}</h2><p className="question">{question}</p><div className="panel-metrics"><span>理论 <b>{state.stats.theory}</b></span><span>证据 <b>{evidenceUnique(state.evidence)}/6</b></span><span>导师支持 <b>{state.resources.trust}</b></span></div><div className="panel-answers">{isMid?<><button onClick={()=>finishPanel("midterm",1)}><b>展示当前 Evidence Map</b><small>用证据结构而不是进度条回答</small></button></>:isDefense?<><button onClick={()=>finishPanel("defense",2)}><b>用挽救实验与独立重复回答</b><small>{state.evidence.rescue?"已解锁·因果证据充分":"证据不完整，但可以诚实说明局限"}</small></button><button onClick={()=>finishPanel("defense",0)}><b>坦诚说明局限与未来方向</b><small>不夸大结论，保持学术完整性</small></button></>:<><button onClick={()=>finishPanel("proposal",2)}><b>模型对应临床毒性，并设置阳性与载体对照</b><small>{state.stats.theory>=50?"已解锁·理论能力足够":"尝试用现有知识结构回答"}</small></button><button onClick={()=>finishPanel("proposal",0)}><b>这是导师选的模型</b><small>简洁，但委员会可能会继续追问</small></button></>}</div></div></div>}
  if(modal.type==="journal")return <div className="modal-wrap"><div className="modal journal-modal"><span className="panel-stamp">PUBLICATION STRATEGY</span><h2>这篇论文要投去哪里？</h2><p>证据、新颖性和写作决定下限；选刊决定风险。</p><div className="quality-card"><span>PAPER QUALITY</span><b>{paperQuality(state)}</b><small>{evidenceUnique(state.evidence)} 类证据 · {state.figures} Figures · 完整性 {state.integrity}</small></div><div className="journal-list">{JOURNALS.map(j=><button key={j.name} onClick={()=>submit(j)}><i style={{background:j.color}}/><div><b>{j.name}</b><small>{j.tier}·期望证据强度 {j.need}</small></div><span>投稿 →</span></button>)}</div><button className="text-close" onClick={()=>setModal(null)}>再补点数据</button></div></div>;
  if(modal.type==="review")return <div className="modal-wrap"><div className="modal review-modal"><div className="editor-head"><span>EDITOR DECISION</span><b className={modal.decision.includes("Accept")?"accept":""}>{modal.decision}</b><small>{state.journal}</small></div><h2>{modal.decision.includes("Reject")?"这不是结束，是另一版稿件的开始。":"审稿人给了你一份新实验清单。"}</h2><div className="requirements">{modal.requirements.map((r,i)=><div key={r}><span>0{i+1}</span><p>{r}</p></div>)}</div><button className="modal-next" onClick={()=>setModal(null)}>{modal.decision==="Accept"?"回实验室准备答辩":modal.decision.includes("Reject")?"回去整理证据":"开始修回计时"} →</button></div></div>;
  return <div className="modal-wrap report-bg"><div className="modal report-modal"><div className="report-title"><span>RUN #{String(state.seed).slice(-3)}</span><h2>我的研究生人生</h2><b>{modal.ending}</b></div><div className="report-paper"><small>MANUSCRIPT</small><h3>{state.project.title}</h3><p>{state.journal} · {state.reviewStatus==="accepted"?"ACCEPTED":"GRADUATED"}</p></div><div className="report-grid"><div><span>毕业周数</span><b>{state.week}</b></div><div><span>实验总数</span><b>{state.experiments}</b></div><div><span>阴性结果</span><b>{state.negative}</b></div><div><span>投稿次数</span><b>{state.submissions}</b></div><div><span>最低 SAN</span><b>{state.minSan}</b></div><div><span>论文质量</span><b>{paperQuality(state)}</b></div></div><div className="timeline">{state.logs.filter(l=>["start","milestone","review","ending","event"].includes(l.type)).slice(-7).map((l,i)=><div key={i}><span>W{l.week}</span><p><b>{l.title}</b><small>{l.text}</small></p></div>)}</div><button className="modal-next" onClick={()=>{localStorage.removeItem("lab-life-save");location.reload();}}>再随机一个研究生 →</button></div></div>;
}
