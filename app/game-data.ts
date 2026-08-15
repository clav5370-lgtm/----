export type StatKey = "wet" | "data" | "writing" | "theory" | "social";
export type ResourceKey = "energy" | "san" | "funding" | "trust";
export type EvidenceKey = "phenotype" | "biochemical" | "histology" | "mechanism" | "rescue" | "replication";
export type ActionKind = "research" | "analysis" | "social" | "recovery" | "writing";

export type Candidate = {
  name: string;
  background: string;
  bio: string;
  stats: Record<StatKey, number>;
  trait: string;
  flaw: string;
  avatar: string;
};

export type GameAction = {
  id: string;
  name: string;
  short: string;
  icon: string;
  kind: ActionKind;
  desc: string;
  skill: StatKey;
  cost: number;
  funding: number;
  evidence?: EvidenceKey;
  requires?: EvidenceKey;
};

export type Advisor = {
  name: string;
  title: string;
  visible: string;
  quote: string;
  patience: number;
  icon: string;
};

export type Project = {
  title: string;
  compound: string;
  model: string;
  mechanism: string;
  novelty: number;
};

export type StoryEvent = {
  id: string;
  speaker: string;
  role: string;
  icon: string;
  title: string;
  text: string;
  tone: "warm" | "risk" | "weird" | "science";
  choices: { label: string; hint: string; effect: string }[];
};

export const STAT_LABELS: Record<StatKey, string> = {
  wet: "实验", data: "数据", writing: "写作", theory: "理论", social: "社交",
};

export const RESOURCE_LABELS: Record<ResourceKey, { name: string; icon: string }> = {
  energy: { name: "精力", icon: "⚡" }, san: { name: "SAN", icon: "◐" },
  funding: { name: "经费", icon: "¥" }, trust: { name: "信任", icon: "◆" },
};

export const EVIDENCE_LABELS: Record<EvidenceKey, { name: string; code: string; detail: string }> = {
  phenotype: { name: "表型证据", code: "PHE", detail: "化合物对模型表型产生作用" },
  biochemical: { name: "生化证据", code: "BIO", detail: "血清与组织生化指标" },
  histology: { name: "病理证据", code: "HIS", detail: "组织切片与形态学" },
  mechanism: { name: "机制证据", code: "MEC", detail: "信号通路与分子机制" },
  rescue: { name: "因果挽救", code: "RES", detail: "抑制或挽救实验建立因果性" },
  replication: { name: "独立重复", code: "REP", detail: "关键结果独立重复" },
};

export const ACTIONS: GameAction[] = [
  { id: "literature", name: "文献深挖", short: "文献", icon: "◫", kind: "research", desc: "检查假说，解锁实验路线", skill: "theory", cost: 8, funding: 0 },
  { id: "pilot", name: "预实验", short: "预实验", icon: "⚗", kind: "research", desc: "确认剂量和建模条件", skill: "wet", cost: 16, funding: 7, evidence: "phenotype" },
  { id: "biochemical", name: "生化检测", short: "生化", icon: "⬡", kind: "research", desc: "检测 ALT、AST 与氧化应激", skill: "wet", cost: 15, funding: 8, evidence: "biochemical", requires: "phenotype" },
  { id: "histology", name: "病理切片", short: "病理", icon: "◉", kind: "research", desc: "制片、染色、盲法评分", skill: "wet", cost: 17, funding: 10, evidence: "histology", requires: "phenotype" },
  { id: "mechanism", name: "WB 机制验证", short: "WB", icon: "≡", kind: "research", desc: "追踪候选信号通路", skill: "wet", cost: 18, funding: 12, evidence: "mechanism", requires: "biochemical" },
  { id: "rescue", name: "抑制剂挽救", short: "挽救", icon: "⌘", kind: "research", desc: "建立机制与表型的因果联系", skill: "wet", cost: 20, funding: 16, evidence: "rescue", requires: "mechanism" },
  { id: "replicate", name: "关键重复", short: "重复", icon: "↻", kind: "research", desc: "独立重复最关键的一组结果", skill: "wet", cost: 18, funding: 11, evidence: "replication", requires: "mechanism" },
  { id: "analysis", name: "数据分析", short: "分析", icon: "∿", kind: "analysis", desc: "清洗数据，完成统计与 Figure", skill: "data", cost: 10, funding: 1 },
  { id: "writing", name: "论文写作", short: "写作", icon: "✎", kind: "writing", desc: "把证据写成可投稿的论文", skill: "writing", cost: 12, funding: 0 },
  { id: "senior", name: "请教师兄", short: "求助", icon: "☕", kind: "social", desc: "人情也是实验室的隐藏货币", skill: "social", cost: 7, funding: 0 },
  { id: "funding", name: "向导师申领经费", short: "申经费", icon: "¥", kind: "social", desc: "拿着原始数据去说服导师", skill: "social", cost: 8, funding: 0 },
  { id: "games", name: "正当摸鱼", short: "摸鱼", icon: "☂", kind: "recovery", desc: "打一局游戏，就一局", skill: "social", cost: -8, funding: 0 },
  { id: "sleep", name: "认真休息", short: "休息", icon: "☾", kind: "recovery", desc: "离开实验室，恢复精力与 SAN", skill: "social", cost: -18, funding: 0 },
];

export const ADVISORS: Advisor[] = [
  { name: "陆文山", title: "教授·课题组 PI", visible: "数据控", quote: "故事可以晚点讲，原始数据先给我。", patience: 58, icon: "🧑‍🏫" },
  { name: "许静之", title: "副教授·青年 PI", visible: "鸡血型", quote: "我们这个方向非常有希望，所以周末也不能放弃希望。", patience: 48, icon: "👩‍🔬" },
  { name: "陈安", title: "教授·中心主任", visible: "放养型", quote: "方向你自己定，但毕业时我要看到闭环。", patience: 72, icon: "🧔" },
];

export const PROJECTS: Project[] = [
  { title: "化合物 X 对对乙酰氨基酚性肝损伤的保护机制", compound: "化合物 X", model: "APAP 肝损伤模型", mechanism: "线粒体应激", novelty: 68 },
  { title: "天然产物 Q 缓解顺铂肾毒性的药效与机制", compound: "天然产物 Q", model: "顺铂肾损伤模型", mechanism: "铁死亡", novelty: 74 },
  { title: "小分子 M 干预药物性心肌损伤的因果证据链", compound: "小分子 M", model: "DOX 心脏毒性模型", mechanism: "炎症小体", novelty: 71 },
];

export const NPCS = [
  { name: "韩师兄", role: "博三·WB 大神", icon: "🧑‍🔬" },
  { name: "苏师姐", role: "博四·统计救火队", icon: "👩‍💻" },
  { name: "邵同学", role: "同级·咖啡情报站", icon: "🧑‍🎓" },
];

export const EVENTS: StoryEvent[] = [
  { id:"antibody", speaker:"韩师兄", role:"博三·WB 大神", icon:"🧑‍🔬", title:"一支快过期的好抗体", text:"“我这里还有半支抗体，你的预实验可以先用。不过以后我可能会找你帮忙。”", tone:"warm", choices:[{label:"收下抗体",hint:"项目 ↑·人情？",effect:"borrow"},{label:"婉拒，自己买",hint:"经费 ↓·独立性 ↑",effect:"buy_self"}] },
  { id:"favor", speaker:"韩师兄", role:"博三·明天预答辩", icon:"😰", title:"人情会在截止日前兑现", text:"“明天早上六点的取样能帮我吗？上次那支抗体……你懂的。”", tone:"risk", choices:[{label:"调整计划去帮忙",hint:"精力 ↓·关系 ↑↑",effect:"repay"},{label:"我也在赶数据",hint:"关系 ？",effect:"refuse_favor"}] },
  { id:"freezer", speaker:"仪器室", role:"02:17 自动报警", icon:"🧊", title:"-80°C 冰箱发出了灵魂尖叫", text:"值班群里连续弹出了 17 条消息。你的样本在第二层，师姐的在最里面。", tone:"risk", choices:[{label:"立刻赶回实验室",hint:"精力 ↓·样本 ↑",effect:"save_samples"},{label:"相信值班同门",hint:"样本？·SAN ↑",effect:"trust_lab"}] },
  { id:"critique", speaker:"导师", role:"周会发言", icon:"🧑‍🏫", title:"“这不是机制，这只是两条线。”", text:"导师在你的 Figure 前停了三秒。屏幕上的箭头突然显得非常孤单。", tone:"science", choices:[{label:"追问怎样建立因果",hint:"理论 ↑·SAN ↓",effect:"ask_why"},{label:"记下，回去补实验",hint:"信任 ↑·压力 ↑",effect:"accept_critique"}] },
  { id:"lunch", speaker:"邵同学", role:"同级·饭搭子", icon:"🍜", title:"一顿不谈论文的午饭", text:"“今天谁都不许说 p 值。”邵同学宣布。然后两分钟后开始吐槽自己的 p 值。", tone:"warm", choices:[{label:"吃完再说",hint:"SAN ↑↑·精力 ↑",effect:"eat"},{label:"我还有一块胶",hint:"项目 ↑·SAN ↓",effect:"skip_lunch"}] },
  { id:"scoop", speaker:"文献预警", role:"关键词订阅", icon:"📡", title:"一篇令人手心出汗的预印本", text:"隔壁团队刚刚上传了高度相似的机制研究。他们没有做挽救实验，但图很漂亮。", tone:"risk", choices:[{label:"加速做因果挽救",hint:"压力 ↑·新颖性 ↑",effect:"race"},{label:"转向另一条通路",hint:"项目路线改变",effect:"pivot"}] },
  { id:"coffee", speaker:"实验室群", role:"稀有集体事件", icon:"☕", title:"同门请了所有人喝奶茶", text:"原因是她的文章接收了。你的杯子上写着：“下一个就是你”。", tone:"warm", choices:[{label:"接受这份祝福",hint:"SAN ↑↑·关系 ↑",effect:"milk_tea"}] },
  { id:"integrity", speaker:"内心审稿人", role:"数据清洗阶段", icon:"👁", title:"那两个“不好看”的数据点", text:"去掉它们以后 p=0.047，留着它们 p=0.081。实验记录里没有明确的剔除理由。", tone:"science", choices:[{label:"保留并如实报告",hint:"完整性 ↑↑",effect:"honest"},{label:"暂时移出主图",hint:"写作 ↑·风险 ↑↑",effect:"hide_points"}] },
  { id:"server", speaker:"工作站", role:"Kernel panic", icon:"💻", title:"旧硬盘发出了不祥的声音", text:"还没有同步的 Figure 3 正在它里面。你突然想起师姐说过：“备份不存在，直到你恢复过一次。”", tone:"weird", choices:[{label:"找苏师姐救数据",hint:"人情 ↓·Figure？",effect:"recover_drive"},{label:"重新分析",hint:"精力 ↓↓·数据 ↑",effect:"redo_analysis"}] },
  { id:"weekend", speaker:"导师", role:"周五 17:58", icon:"📱", title:"一条在周末边缘发来的消息", text:"“下周组会想听一下你的完整故事。不急，有空看一下。”你和“不急”对视了很久。", tone:"weird", choices:[{label:"周末做图",hint:"论文 ↑·SAN ↓",effect:"weekend_work"},{label:"先放下手机",hint:"SAN ↑·信任？",effect:"weekend_rest"}] },
];

export const JOURNALS = [
  { name:"Advanced Mouse Studies", tier:"挑战", need:72, color:"#e87847" },
  { name:"Cellular Things", tier:"稳妥", need:58, color:"#9fd349" },
  { name:"Journal of Questionable Significance", tier:"保底", need:43, color:"#7aa9ad" },
];
