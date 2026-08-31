import type {
  ActivityId,
  Advisor,
  Candidate,
  EndingDefinition,
  EventNode,
  ExperimentDefinition,
  GraduationRule,
  JournalDefinition,
  LabMember,
  ProjectDefinition,
  ResearchProgram,
  ResearchReference,
} from "./types";

export const STAT_LABELS = { wet: "湿实验", data: "数据", writing: "写作", theory: "理论", social: "社交" } as const;
export const FEATURE_FLAGS = { customProjects:false } as const;
export const EVIDENCE_LABELS = {
  phenotype: "表型",
  biochemical: "生化",
  histology: "病理",
  molecular: "分子",
  mechanism: "机制",
  omics: "组学",
  causality: "因果",
  replication: "重复",
} as const;

export const CANDIDATES: Candidate[] = [
  { id:"lin-xiaoman",name:"林晓满",background:"药学保研生",bio:"移液枪像是手的延伸，但一打开 R 就想逃。",avatar:"🧪",stats:{wet:86,data:35,writing:48,theory:63,social:42},trait:"稳准快",traitEffect:"湿实验技术成功率 +8%",flaw:"代码恐惧",flawEffect:"组学分析耗时增加",tags:["湿实验","药理"] },
  { id:"zhou-yiming",name:"周一鸣",background:"数学背景转行",bio:"相信一切问题都可以先画一张图。",avatar:"💻",stats:{wet:31,data:91,writing:58,theory:72,social:40},trait:"数据直觉",traitEffect:"阴性数据更容易形成 Figure",flaw:"手生",flawEffect:"新实验熟练度起步较低",tags:["生信","组学"] },
  { id:"chen-ruoshui",name:"陈若水",background:"中医药世家",bio:"能背方剂，也坚持每个结论都要有现代证据。",avatar:"🌿",stats:{wet:61,data:46,writing:72,theory:82,social:55},trait:"本草雷达",traitEffect:"中药课题新颖性 +6",flaw:"路线太宽",flawEffect:"压力随并行课题增加",tags:["中药","理论"] },
  { id:"gao-fei",name:"高飞",background:"本科科研达人",bio:"做动物实验从不迟到，写论文永远从明天开始。",avatar:"🐁",stats:{wet:82,data:49,writing:30,theory:58,social:62},trait:"动物朋友",traitEffect:"动物模型成功率 +10%",flaw:"拖延症",flawEffect:"前两年写作收益降低",tags:["动物","毒理"] },
  { id:"tang-keke",name:"唐可可",background:"临床药学转基础",bio:"知道什么问题值得问，也知道病历不会自动变成机制。",avatar:"🩺",stats:{wet:52,data:58,writing:66,theory:76,social:78},trait:"临床嗅觉",traitEffect:"转化类期刊匹配度提高",flaw:"值班冲突",flawEffect:"偶发损失一个时间格",tags:["临床","药理"] },
  { id:"li-siyuan",name:"李思源",background:"调剂上岸生",bio:"起点普通，但失败记录写得比谁都完整。",avatar:"📓",stats:{wet:55,data:55,writing:55,theory:55,social:55},trait:"越挫越勇",traitEffect:"连续失败后成功率提升",flaw:"自我怀疑",flawEffect:"技术失败额外损失 SAN",tags:["均衡","成长"] },
  { id:"shen-xingchi",name:"沈星池",background:"零实验经验",bio:"第一次戴手套用了十分钟，但学习曲线异常陡峭。",avatar:"✨",stats:{wet:28,data:54,writing:62,theory:67,social:70},trait:"快速学习",traitEffect:"熟练度增长 +50%",flaw:"新人事故",flawEffect:"首次执行技术更易污染",tags:["成长","社交"] },
  { id:"lu-jiuyue",name:"陆九月",background:"实验室技术员考研",bio:"会修离心机，也会在深夜劝所有人回家。",avatar:"🔧",stats:{wet:78,data:45,writing:43,theory:52,social:76},trait:"设备通",traitEffect:"仪器类技术成功率 +7%",flaw:"不会拒绝",flawEffect:"人情事件更容易增加债务",tags:["设备","人情"] },
  { id:"chen-mo",name:"陈默",background:"生物信息学本科",bio:"话不多，提交的脚本每一行都有注释。",avatar:"⌨️",stats:{wet:38,data:88,writing:70,theory:68,social:27},trait:"可复现",traitEffect:"完整性与重复证据收益提高",flaw:"社恐",flawEffect:"求助收益减半",tags:["数据","诚信"] },
  { id:"fang-tang",name:"方糖",background:"学生会科研部",bio:"认识全院的人，但实验本总在某个会议室。",avatar:"☕",stats:{wet:45,data:47,writing:64,theory:50,social:92},trait:"资源整合",traitEffect:"合作成本与经费申请难度降低",flaw:"会议体质",flawEffect:"随机行政事件增加",tags:["社交","资源"] },
  { id:"qiao-mu",name:"乔木",background:"环境科学跨考",bio:"对污染物有执念，对自己的睡眠没有。",avatar:"🌎",stats:{wet:65,data:71,writing:50,theory:73,social:39},trait:"夜行动物",traitEffect:"加班的精力惩罚降低",flaw:"咖啡依赖",flawEffect:"连续加班时 SAN 下降加速",tags:["环境","夜班"] },
  { id:"xu-zhizhi",name:"徐知之",background:"中文核心一作",bio:"文章写得像故事，实验操作像悬疑片。",avatar:"✒️",stats:{wet:36,data:52,writing:93,theory:77,social:64},trait:"写作机器",traitEffect:"论文与回复审稿收益 +40%",flaw:"手残",flawEffect:"精密实验成功率 -8%",tags:["写作","理论"] },
];

export const ADVISORS: Advisor[] = [
  {id:"lu-wenshan",name:"陆文山",title:"教授·课题组 PI",supervision:"博导",honor:"省级领军人才",strictness:"较严",archetype:"数据洁癖",quote:"原始数据先给我，故事可以晚点讲。",icon:"🧑‍🏫",patience:62,wealth:72,care:48,pressure:58,experimentBonus:4,fundingMultiplier:1,eventBias:"实验完整性"},
  {id:"xu-jingzhi",name:"许静之",title:"副教授·青年 PI",supervision:"硕导",honor:"青年托举人才",strictness:"极严",archetype:"高压 PUA",quote:"这个方向很有希望，所以周末也不能放弃希望。",icon:"👩‍🔬",patience:38,wealth:58,care:24,pressure:88,experimentBonus:3,fundingMultiplier:.9,eventBias:"进度与加班"},
  {id:"chen-an",name:"陈安",title:"教授·中心主任",supervision:"博导",honor:"学科带头人",strictness:"宽松",archetype:"放养型",quote:"方向你自己定，毕业时我要看到闭环。",icon:"🧔",patience:78,wealth:82,care:35,pressure:34,experimentBonus:0,fundingMultiplier:1.05,eventBias:"自主选择"},
  {id:"wen-yuqing",name:"温予清",title:"研究员·实验室副主任",supervision:"博导",honor:"国家优青",strictness:"温和",archetype:"温和关照",quote:"人先休息好，数据明天还在那里。",icon:"👩‍🏫",patience:84,wealth:63,care:92,pressure:22,experimentBonus:2,fundingMultiplier:1,eventBias:"健康与成长"},
  {id:"jin-shouxin",name:"金守信",title:"教授·财务签字人",supervision:"博导",honor:"校级特聘教授",strictness:"较严",archetype:"极度抠门",quote:"这盒枪头为什么不能再省一点？",icon:"🧮",patience:56,wealth:48,care:39,pressure:65,experimentBonus:-2,fundingMultiplier:.65,eventBias:"经费审查"},
  {id:"fu-yuan",name:"傅源",title:"重点实验室 PI",supervision:"博导",honor:"国家杰青",strictness:"中等",archetype:"经费充足",quote:"方案合理就买，别拿坏试剂浪费时间。",icon:"💼",patience:66,wealth:98,care:58,pressure:61,experimentBonus:5,fundingMultiplier:1.45,eventBias:"设备与合作"},
  {id:"gao-yin",name:"高引",title:"教授·期刊编委",supervision:"博导",honor:"省级教学名师",strictness:"很严",archetype:"论文导向",quote:"实验不是越多越好，是要投得出去。",icon:"📰",patience:49,wealth:70,care:45,pressure:77,experimentBonus:0,fundingMultiplier:1,eventBias:"投稿与抢发"},
  {id:"he-linchuan",name:"何临川",title:"主任医师·双聘教授",supervision:"博导",honor:"临床学科带头人",strictness:"中等",archetype:"临床资源型",quote:"样本我能协调，但问题必须对患者有意义。",icon:"🩺",patience:70,wealth:76,care:68,pressure:52,experimentBonus:3,fundingMultiplier:1.12,eventBias:"临床转化"},
  {id:"ning-shuang",name:"宁霜",title:"青年研究员·独立 PI",supervision:"硕导",honor:"海外青年人才",strictness:"认真",archetype:"亲自带教",quote:"第一块胶我陪你跑，第二块开始你来教别人。",icon:"🥼",patience:74,wealth:52,care:80,pressure:46,experimentBonus:8,fundingMultiplier:.88,eventBias:"技术成长"},
];

const NPC_BLUEPRINTS: Omit<LabMember,"relation"|"favorDebt"|"leaveTurn"|"active">[] = [
  ["han-zhe","韩哲","博三","WB 与抗体优化","🧑‍🔬","嘴硬心软",true], ["su-qing","苏晴","博四","统计与 R","👩‍💻","冷静可靠",true],
  ["shao-yu","邵宇","硕二","细胞培养","🧑‍🎓","消息灵通",true], ["jiang-nan","江楠","博二","动物模型","🐁","原则性强",true],
  ["luo-xin","罗欣","科研助理","流式细胞术","🔬","效率至上",false], ["bai-lu","白露","硕一","病理染色","🧫","细腻慢热",true],
  ["zhao-qi","赵祺","博后","转录组","🧬","野心勃勃",false], ["lin-zhou","林舟","仪器管理员","LC-MS/MS","⚙️","按章办事",false],
  ["wu-tong","吴桐","博士生","代谢组","📈","夜间活跃",true], ["ye-jia","叶嘉","硕三","论文写作","📝","完美主义",true],
  ["sun-ning","孙宁","临床研究生","病例与样本","🏥","热心健谈",true], ["qiu-ran","邱然","博士生","微生物组","🦠","好奇心强",true],
  ["mo-li","莫莉","硕二","中药药理","🌿","温柔坚定",true], ["yuan-ye","袁野","博一","类器官","🫧","冒险派",true],
  ["fang-qin","方勤","科研秘书","报销与伦理","🗂️","记忆惊人",false], ["cheng-yu","程煜","博士生","免疫荧光","🌈","社交达人",true],
  ["gu-yan","顾言","博五","项目设计","🧠","毕业倒计时",false], ["tian-miao","田苗","硕一","PCR/qPCR","🧪","认真紧张",true],
  ["an-qi","安琪","实验师","生物安全","🧯","严谨直接",false], ["xie-chuan","谢川","联培生","蛋白组","🧊","随遇而安",true],
].map(([id,name,role,specialty,icon,personality,romanceEligible])=>({id:String(id),name:String(name),role:String(role),specialty:String(specialty),icon:String(icon),personality:String(personality),romanceEligible:Boolean(romanceEligible)}));

export const NPC_POOL: LabMember[] = NPC_BLUEPRINTS.map((npc,index)=>({ ...npc, relation:28+(index%5)*4, favorDebt:0, leaveTurn:40+(index%8)*7, active:true }));

export const RESEARCH_PROGRAMS: ResearchProgram[] = [
  ["tox-dili","毒理","药物性肝肾损伤","从暴露、器官表型追到代谢与细胞死亡机制。"],
  ["tox-multiorgan","毒理","多器官毒性","比较药物在心、肺、神经和肾脏的特异损伤。"],
  ["pharm-metabolic","药理","代谢药理","研究具体药物如何重塑跨器官代谢信号。"],
  ["pharm-resistance","药理","肿瘤耐药","用细胞、类器官和挽救实验拆解耐药机制。"],
  ["tcm-processing","中医药","有毒药材与炮制","把毒性物质基础、炮制变化和机制连起来。"],
  ["tcm-formula","中医药","配伍与复方","研究成分相互作用如何改变暴露、药效和毒性。"],
  ["natural-protection","天然产物","器官保护","验证明确天然成分对经典器官损伤模型的保护。"],
  ["natural-mechanism","天然产物","药效机制","从代谢、炎症、免疫与铁死亡解释天然产物药效。"],
  ["env-emerging","环境与食品","新污染物","聚焦PFAS、微塑料和双酚替代物的联合暴露。"],
  ["food-toxicants","环境与食品","食源性毒物","研究真菌毒素、热加工污染物与DNA损伤。"],
  ["biotech-human-model","生物技术","人源模型","比较二维、类器官和多器官微生理系统的预测力。"],
  ["biotech-therapy-safety","生物技术","新疗法安全性","评估AAV、mRNA-LNP、基因编辑和CAR-T风险。"],
].map(([id,domain,name,summary])=>({id,domain,name,summary}));

const REFERENCE_ROWS: Array<[string,number,string]> = [
  ["Schisandrin B alleviates APAP-induced hepatocyte ferroptosis",2026,"42070336"], ["A human liver organoid screening platform for DILI risk prediction",2023,"36738840"],
  ["Clinicopathological features of herbal drug-induced liver injury",2019,"30066422"], ["ATP/ADP biosensor organoids for drug nephrotoxicity assessment",2023,"36936695"],
  ["Automated 3D imaging screening with cisplatin kidney organoids",2024,"38547531"], ["Doxorubicin disrupts ALAS1-dependent heme synthesis",2022,"36318618"],
  ["PGAM1-dependent VDAC1 oligomerization drives doxorubicin cardiotoxicity",2026,"41651300"], ["Paclitaxel-related metabolic and neuronal injury study",2014,"24937102"],
  ["Acrylamide developmental neurotoxicity via NLRP3 pyroptosis",2023,"37392875"], ["Kidney organoids reveal transporter-specific nephrotoxicity",2023,"36936695"],
  ["Inter-organ communication resolves anti-diabetic drug responses",2026,"42244566"], ["Low-dose metabolic drug response in microphysiological systems",2026,"42244566"],
  ["Inflammatory and metabolic signaling in diabetic organ injury",2025,"40436296"], ["Puerarin baicalin and berberine in fatty liver pharmacology",2016,"26889237"],
  ["Diet-dependent hepatic lipid metabolism revealed by omics",2021,"33483757"], ["ANGPTL4 contributes to osimertinib resistance in organoids",2026,"42415069"],
  ["Dauricine overcomes osimertinib resistance through SAT1",2025,"40485050"], ["SLC25A39-NRF2 drives osimertinib resistance",2026,"42402515"],
  ["Organoid models of targeted therapy resistance",2026,"42415069"], ["Natural compound control of multidrug-resistant cancer cells",2017,"28818460"],
  ["Differential hepatotoxicity of raw and processed Polygonum multiflorum",2024,"38632548"], ["Geographical harvest changes Polygonum multiflorum toxicity",2017,"28676759"],
  ["Aconitine cardiotoxicity through calcium signaling",2020,"31975431"], ["Triptolide hepatotoxicity through Nrf2 degradation",2024,"39503881"],
  ["Genome-wide mutational signatures of aristolochic acid",2013,"23926199"], ["Aconitine processing and cardiotoxicity model",2020,"31975431"],
  ["Puerarin baicalin and berberine protect ETEC-infected intestinal cells",2019,"30891078"], ["Pharmacokinetics of geniposide with baicalin and berberine",2013,"24367386"],
  ["Aconitum compatibility and ion-channel safety study",2022,"35754486"], ["Baicalin and berberine derivative interactions in decoction",2024,"38573419"],
  ["Schisandrin B protects human hepatic organoids",2026,"42070336"], ["Kidney organoid screening identifies protection from cisplatin",2024,"38547531"],
  ["Natural ferroptosis modulation in doxorubicin cardiotoxicity",2026,"41880833"], ["Natural-product intervention in fibrotic injury models",2024,"39695708"],
  ["Organoids metabolize dietary carcinogens and form DNA adducts",2024,"38232180"], ["Berberine baicalin and puerarin regulate insulin resistance",2018,"30486537"],
  ["Baicalin and berberine regulate intestinal inflammatory injury",2019,"30891078"], ["Tanshinone-related vascular redox pharmacology",2019,"31894475"],
  ["Ginsenoside-related tumor pharmacology and immune response",2024,"39704424"], ["Natural compound induction of ferroptosis in resistant tumors",2025,"40485050"],
  ["Gestational PFOA and GenX hepatic transcriptomics",2022,"36436258"], ["PFOS toxicity depends on prostaglandin metabolism and transport",2024,"38393201"],
  ["Microplastics and BPA worsen diabetic intestinal injury",2026,"41456157"], ["Microplastics and TBBPA co-exposure alters human gut models",2021,"33725607"],
  ["BPA and BHPF alter intestinal organoid cell states",2024,"39167857"], ["Human organoids activate aflatoxin B1 and form DNA adducts",2024,"38232180"],
  ["Sheep intestinal organoids model deoxynivalenol toxicity",2025,"39940725"], ["Single-cell atlas of DON and zearalenone-exposed intestinal organoids",2026,"42231404"],
  ["Acrylamide neurotoxicity via NLRP3-mediated pyroptosis",2023,"37392875"], ["Human colon organoids metabolize PhIP",2024,"38232180"],
  ["Single-cell APAP responses in 2D and 3D liver microtissues",2025,"41535591"], ["ATP/ADP biosensor kidney organoids",2023,"36936695"],
  ["Human cardiac microtissues in doxorubicin cardiotoxicity",2026,"42196592"], ["Multi-organ organoids model dietary carcinogen activation",2024,"38232180"],
  ["Six-tissue system resolves metformin and semaglutide response",2026,"42244566"], ["High-dose AAV causes liver and dorsal root ganglion toxicity",2018,"29378426"],
  ["Repeated administration of mRNA lipid nanoparticles",2024,"38779139"], ["Genome-wide sequencing reveals Cas9 specificity risks",2015,"25425480"],
  ["Base editors induce off-target structural variations",2024,"39529170"], ["Single-cell dynamics of CAR-T breakthrough toxicities",2025,"39928957"],
];

export const RESEARCH_REFERENCES: ResearchReference[] = REFERENCE_ROWS.map(([title,year,pmid],index)=>({id:`ref-${index+1}`,title,year,pmid}));

type ProjectRow = [string,1|2|3|4|5,string,string,string,string,string,number,number,number,string[]];
const PROJECT_ROWS: ProjectRow[] = [
  ["tox-dili",1,"对乙酰氨基酚-CYP2E1/GSH-铁死亡与五味子乙素干预","对乙酰氨基酚与五味子乙素","人源肝细胞与APAP小鼠","CYP2E1-GSH-GPX4","细胞—动物—挽救",66,78,.58,["cell-study","cell-toxicity","animal-model","biochem","wb"]],
  ["tox-dili",2,"异烟肼/利福平联合暴露的胆汁酸稳态与肝损伤","异烟肼与利福平","联合给药小鼠与肝细胞","胆汁酸转运-线粒体应激","毒代—病理—分子",70,76,.52,["animal-model","biochem","he","lcms","pcr"]],
  ["tox-dili",3,"双氯芬酸反应性代谢物与免疫性肝损伤","双氯芬酸","肝类器官与免疫共培养","反应性代谢物-先天免疫","类器官—质谱—免疫",76,84,.48,["organoid","lcms","elisa","flow","proteomics"]],
  ["tox-dili",4,"顺铂-OCT2肾小管损伤与西咪替丁阻断","顺铂与西咪替丁","肾类器官与顺铂小鼠","OCT2-线粒体损伤","类器官—动物—阻断",74,82,.55,["organoid","animal-model","biochem","he","wb"]],
  ["tox-dili",5,"庆大霉素溶酶体应激性近端肾小管损伤","庆大霉素","近端肾小管细胞与大鼠","巨蛋白-溶酶体应激","细胞—病理—机制",72,80,.5,["cell-study","animal-model","biochem","he","wb"]],
  ["tox-multiorgan",1,"阿霉素-mtDNA/ALAS1心肌铁死亡与5-ALA挽救","阿霉素与5-氨基乙酰丙酸","心肌细胞与阿霉素小鼠","mtDNA-ALAS1-血红素-铁死亡","细胞—动物—挽救",72,86,.56,["cell-study","animal-model","biochem","pcr","wb"]],
  ["tox-multiorgan",2,"博来霉素肺泡上皮铁死亡与肺纤维化","博来霉素","肺泡上皮细胞与肺纤维化小鼠","GPX4-TGF-β","动物—病理—机制",72,79,.53,["animal-model","he","biochem","pcr","wb"]],
  ["tox-multiorgan",3,"紫杉醇背根神经节炎症与周围神经病变","紫杉醇","背根神经节细胞与神经病变大鼠","NLRP3-神经炎症","行为—病理—分子",76,82,.5,["animal-model","clinical-monitor","he","elisa","wb"]],
  ["tox-multiorgan",4,"丙戊酸斑马鱼神经发育毒性与HDAC抑制","丙戊酸","斑马鱼胚胎与神经祖细胞","HDAC-神经分化","发育表型—转录组—验证",78,84,.48,["animal-model","clinical-monitor","transcriptomics","bioinformatics","pcr"]],
  ["tox-multiorgan",5,"替诺福韦OAT1/OAT3介导的肾单位节段毒性","替诺福韦","多节段人肾类器官","OAT1-OAT3-能量代谢","类器官—毒代—验证",80,87,.46,["organoid","lcms","biochem","transcriptomics","wb"]],
  ["pharm-metabolic",1,"二甲双胍重塑多器官葡萄糖调控网络","二甲双胍","肠-肝-胰岛微生理系统","AMPK-葡萄糖通量","多器官功能—转录组",70,80,.6,["organoid","biochem","transcriptomics","bioinformatics","pcr"]],
  ["pharm-metabolic",2,"司美格鲁肽调节肠-胰岛-肝营养感知信号","司美格鲁肽","六组织微生理系统","GLP-1R-营养感知","多器官—代谢组—验证",74,84,.57,["organoid","biochem","metabolomics","pcr","wb"]],
  ["pharm-metabolic",3,"恩格列净抑制糖尿病肾病NLRP3炎症","恩格列净","糖尿病肾病小鼠与肾小管细胞","SGLT2-NLRP3","动物—病理—炎症",68,73,.62,["animal-model","biochem","he","elisa","wb"]],
  ["pharm-metabolic",4,"吡格列酮通过PPARγ调控MASH脂毒性","吡格列酮","高脂饮食MASH小鼠","PPARγ-脂毒性","动物—病理—脂质组",70,72,.6,["animal-model","biochem","he","metabolomics","wb"]],
  ["pharm-metabolic",5,"非诺贝特激活PPARα改善肝脏脂质沉积","非诺贝特","脂肪肝小鼠与原代肝细胞","PPARα-脂肪酸氧化","细胞—动物—代谢验证",68,70,.64,["cell-study","animal-model","he","metabolomics","pcr"]],
  ["pharm-resistance",1,"奥希替尼-ANGPTL4/NDRG1细胞外基质耐药","奥希替尼","EGFR突变肺癌耐药类器官","ANGPTL4-NDRG1-ECM","类器官—敲低—挽救",78,88,.5,["organoid","cell-toxicity","transcriptomics","wb","flow"]],
  ["pharm-resistance",2,"蝙蝠葛碱联合奥希替尼诱导SAT1依赖铁死亡","蝙蝠葛碱与奥希替尼","肺癌耐药细胞与类器官","SAT1-多胺代谢-铁死亡","联合用药—机制—挽救",76,90,.48,["cell-study","cell-toxicity","organoid","ros","wb"]],
  ["pharm-resistance",3,"索拉非尼-SLC7A11/GPX4铁死亡耐药","索拉非尼","肝癌耐药细胞与异种移植模型","SLC7A11-GPX4","细胞—动物—基因干预",78,85,.5,["cell-study","animal-model","ros","pcr","wb"]],
  ["pharm-resistance",4,"奥拉帕利同源重组恢复与卵巢癌类器官耐药","奥拉帕利","BRCA缺陷卵巢癌类器官","同源重组-复制叉保护","类器官—遗传毒性—测序",84,92,.43,["organoid","genotoxicity","pcr","single-cell","bioinformatics"]],
  ["pharm-resistance",5,"紫杉醇-ABCB1与溶酶体滞留介导的耐药","紫杉醇","三阴性乳腺癌细胞与肿瘤球","ABCB1-溶酶体滞留","细胞—流式—药代",74,80,.54,["cell-study","cell-toxicity","flow","lcms","wb"]],
  ["tcm-processing",1,"生首乌与制首乌诱导肝细胞铁死亡的差异","生首乌与制首乌","L02细胞与C57BL/6小鼠","ROS-GPX4-铁死亡","细胞—动物—转录组",72,84,.48,["cell-study","animal-model","biochem","he","transcriptomics"]],
  ["tcm-processing",2,"首乌产地及TSG/蒽醌成分与肝毒性关联","不同产地首乌及TSG/蒽醌","肝细胞与精准肝切片","成分暴露-批次毒性","质谱—细胞—谱效关系",80,88,.44,["lcms","cell-toxicity","he","metabolomics","bioinformatics"]],
  ["tcm-processing",3,"附子炮制对三种双酯型生物碱与心脏毒性的影响","乌头碱、次乌头碱和新乌头碱","H9c2细胞与斑马鱼胚胎","钠/钙离子通道","成分—心功能—机制",78,86,.46,["lcms","cell-study","animal-model","clinical-monitor","wb"]],
  ["tcm-processing",4,"雷公藤甲素通过NRF2降解诱导肝细胞铁死亡","雷公藤甲素","肝细胞与Nrf2干预小鼠","NRF2-GPX4-铁死亡","细胞—动物—因果",76,88,.47,["cell-study","animal-model","ros","pcr","wb"]],
  ["tcm-processing",5,"马兜铃酸I-DNA加合物与突变Signature 22","马兜铃酸I","肾小管细胞与尿路上皮样本","AL-DNA加合物-Signature 22","质谱—遗传毒性—测序",88,94,.38,["lcms","genotoxicity","organoid","transcriptomics","bioinformatics"]],
  ["tcm-formula",1,"附子-甘草配伍降低双酯型生物碱心脏毒性","附子与甘草配伍","心肌细胞与斑马鱼","生物碱暴露-离子通道","质谱—心功能—机制",74,82,.52,["lcms","cell-study","animal-model","clinical-monitor","wb"]],
  ["tcm-formula",2,"葛根芩连汤三成分保护ETEC损伤肠屏障","葛根素、黄芩苷与小檗碱","ETEC感染肠上皮细胞","NF-κB-紧密连接","细胞—炎症—屏障验证",68,78,.59,["cell-study","cell-toxicity","elisa","pcr","wb"]],
  ["tcm-formula",3,"黄连解毒汤配伍改变栀子苷药代动力学","栀子苷、黄芩苷与小檗碱","脑缺血大鼠","成分相互作用-体内暴露","质谱药代—药效关联",74,81,.54,["animal-model","lcms","clinical-monitor","biochem","metabolomics"]],
  ["tcm-formula",4,"麻黄-甘草配伍对麻黄碱心血管暴露的影响","麻黄碱、伪麻黄碱与甘草酸","心肌细胞与大鼠","肾上腺素能信号-药代","质谱—心功能—分子",76,80,.5,["lcms","cell-study","animal-model","clinical-monitor","pcr"]],
  ["tcm-formula",5,"黄芩-黄连配伍中黄芩苷/小檗碱复合沉淀与吸收","黄芩苷与小檗碱","模拟煎煮液与Caco-2单层","复合沉淀-跨膜吸收","成分—理化—吸收验证",72,86,.5,["lcms","cell-study","cell-toxicity","metabolomics","bioinformatics"]],
  ["natural-protection",1,"五味子乙素缓解APAP诱导肝细胞铁死亡","五味子乙素","人iPSC肝类器官与APAP大鼠","GPX4-脂质过氧化","类器官—动物—挽救",74,86,.56,["organoid","animal-model","biochem","he","wb"]],
  ["natural-protection",2,"槲皮素缓解顺铂近端肾小管损伤","槲皮素","肾小管细胞、肾类器官与小鼠","NRF2-HO-1","细胞—类器官—动物",72,74,.62,["cell-study","organoid","animal-model","biochem","wb"]],
  ["natural-protection",3,"姜黄素缓解阿霉素心肌氧化损伤","姜黄素","心肌细胞与阿霉素小鼠","NRF2-线粒体稳态","细胞—动物—机制",70,72,.63,["cell-study","animal-model","ros","biochem","wb"]],
  ["natural-protection",4,"白藜芦醇干预博来霉素肺纤维化","白藜芦醇","肺泡细胞与肺纤维化小鼠","SIRT1-TGF-β","细胞—病理—机制",70,74,.6,["cell-study","animal-model","he","pcr","wb"]],
  ["natural-protection",5,"萝卜硫素抑制黄曲霉毒素B1肝细胞损伤","萝卜硫素与黄曲霉毒素B1","人肝类器官","NRF2-解毒酶-DNA加合物","类器官—遗传毒性—挽救",80,86,.5,["organoid","genotoxicity","lcms","pcr","wb"]],
  ["natural-mechanism",1,"小檗碱激活AMPK改善脂肪肝","小檗碱","胰岛素抵抗肝细胞与脂肪肝小鼠","AMPK-脂质合成","细胞—动物—代谢",68,70,.66,["cell-study","animal-model","biochem","he","wb"]],
  ["natural-mechanism",2,"黄芩苷抑制ETEC诱导的肠屏障炎症","黄芩苷","ETEC感染肠上皮细胞","NF-κB-ZO-1","细胞—炎症—屏障",66,72,.64,["cell-study","cell-toxicity","elisa","pcr","wb"]],
  ["natural-mechanism",3,"丹参酮IIA调控血管内皮氧化应激","丹参酮IIA","血管内皮细胞与动脉损伤小鼠","NRF2-eNOS","细胞—动物—血管功能",70,76,.6,["cell-study","animal-model","ros","biochem","wb"]],
  ["natural-mechanism",4,"人参皂苷Rg3调控肿瘤血管与免疫微环境","人参皂苷Rg3","肿瘤细胞-免疫共培养与荷瘤小鼠","VEGF-CD8免疫","流式—动物—蛋白组",78,82,.54,["cell-study","flow","animal-model","elisa","proteomics"]],
  ["natural-mechanism",5,"青蒿素类诱导耐药肿瘤细胞铁死亡","青蒿琥酯","耐药肿瘤细胞与类器官","铁负荷-GPX4","细胞—类器官—挽救",76,83,.52,["cell-study","cell-toxicity","organoid","ros","wb"]],
  ["env-emerging",1,"PFOA与GenX母胎肝毒性转录反应比较","PFOA与GenX","妊娠CD-1小鼠母体及胎肝","PPAR-胆汁酸-氧化磷酸化","动物—转录组—比较",78,88,.46,["animal-model","biochem","he","transcriptomics","bioinformatics"]],
  ["env-emerging",2,"PFOS与高脂饮食对肝脂沉积的交互作用","PFOS与高脂饮食","C57BL/6J与PPARα缺失小鼠","PPARα-脂质转运","动物—脂质组—转录组",82,86,.47,["animal-model","he","metabolomics","transcriptomics","bioinformatics"]],
  ["env-emerging",3,"聚苯乙烯微塑料与BPA加重糖尿病肠损伤","聚苯乙烯微塑料与BPA","2型糖尿病小鼠与Caco-2细胞","菌群代谢-紧密连接","动物—菌群—代谢组",80,90,.43,["animal-model","he","microbiome","metabolomics","pcr"]],
  ["env-emerging",4,"聚乙烯微塑料与TBBPA联合扰动肠菌群","聚乙烯微塑料与TBBPA","Caco-2细胞与体外人肠菌群","线粒体损伤-菌群稳态","细胞—菌群—代谢",76,84,.5,["cell-study","cell-toxicity","flow","microbiome","metabolomics"]],
  ["env-emerging",5,"BPA与BHPF改变肠类器官细胞分化轨迹","BPA与BHPF","小肠类器官与小鼠","抗氧化-细胞分化轨迹","类器官—单细胞—体内验证",86,94,.4,["organoid","single-cell","bioinformatics","animal-model","he"]],
  ["food-toxicants",1,"黄曲霉毒素B1在肝类器官中的DNA加合物形成","黄曲霉毒素B1","人肝类器官","CYP代谢-DNA加合物","类器官—质谱—遗传毒性",82,88,.45,["organoid","lcms","genotoxicity","pcr","wb"]],
  ["food-toxicants",2,"脱氧雪腐镰刀菌烯醇抑制肠类器官更新","脱氧雪腐镰刀菌烯醇DON","羊肠类器官","PI3K-AKT-GSK3β-β-catenin","类器官—转录组—验证",80,86,.48,["organoid","cell-toxicity","transcriptomics","bioinformatics","wb"]],
  ["food-toxicants",3,"DON与玉米赤霉烯酮联合暴露的细胞异质性","DON与玉米赤霉烯酮ZEA","猪肠类器官","上皮分化-屏障功能","类器官—单细胞—时间序列",88,94,.38,["organoid","single-cell","bioinformatics","pcr","wb"]],
  ["food-toxicants",4,"丙烯酰胺通过NLRP3焦亡导致神经发育毒性","丙烯酰胺","斑马鱼胚胎","NLRP3-Caspy焦亡","发育表型—基因干预—病理",78,85,.48,["animal-model","clinical-monitor","he","pcr","wb"]],
  ["food-toxicants",5,"PhIP在结肠类器官中的代谢活化与DNA损伤","PhIP","人结肠类器官","CYP代谢-DNA加合物","类器官—质谱—遗传毒性",84,91,.42,["organoid","lcms","genotoxicity","transcriptomics","bioinformatics"]],
  ["biotech-human-model",1,"APAP二维细胞与三维肝微组织单细胞反应比较","对乙酰氨基酚","二维肝细胞与三维多细胞肝球","细胞异质性-缺氧反应","单细胞—模型比较",82,90,.43,["cell-study","organoid","single-cell","bioinformatics","pcr"]],
  ["biotech-human-model",2,"顺铂肾类器官ATP/ADP传感毒性模型","顺铂","带ATP/ADP传感器的人肾类器官","能量代谢-肾单位节段","类器官—成像—药理阻断",84,91,.42,["organoid","cell-toxicity","lcms","pcr","wb"]],
  ["biotech-human-model",3,"阿霉素人心肌微组织多细胞损伤模型","阿霉素","人三维心肌微组织","心肌细胞-成纤维细胞通讯","微组织—蛋白组—单细胞",86,92,.4,["organoid","proteomics","single-cell","bioinformatics","wb"]],
  ["biotech-human-model",4,"AFB1/AAI/PhIP多器官类器官代谢差异","AFB1、AAI与PhIP","肝、肾、胃和结肠类器官","组织特异代谢-DNA加合物","多器官—质谱—遗传毒性",90,96,.34,["organoid","lcms","genotoxicity","transcriptomics","multiomics"]],
  ["biotech-human-model",5,"二甲双胍与司美格鲁肽六组织微生理系统比较","二甲双胍与司美格鲁肽","肠、脑、胰岛、肝等六组织系统","器官通讯-营养感知","多组织—转录组—代谢组",92,97,.32,["organoid","transcriptomics","metabolomics","bioinformatics","multiomics"]],
  ["biotech-therapy-safety",1,"高剂量AAV9的肝脏与背根神经节毒性","AAV9-SMN载体","非人灵长类与仔猪","转导负荷-肝损伤-轴突病变","毒代—病理—神经功能",88,94,.38,["animal-model","clinical-monitor","biochem","he","pcr"]],
  ["biotech-therapy-safety",2,"重复给药mRNA-LNP的抗PEG反应与组织分布","mRNA-LNP与不同PEG脂质","BALB/c小鼠","抗PEG IgM-补体-表达衰减","重复给药—ELISA—分布",84,92,.42,["animal-model","elisa","lcms","biochem","pcr"]],
  ["biotech-therapy-safety",3,"个体SNV对Cas9脱靶位点形成的影响","CRISPR-Cas9与个体SNV","人iPSC克隆","序列变异-等位基因特异脱靶","基因编辑—全基因组验证",88,95,.36,["cell-study","pcr","genotoxicity","transcriptomics","bioinformatics"]],
  ["biotech-therapy-safety",4,"碱基编辑器诱导结构变异与非整倍体风险","腺嘌呤碱基编辑器ABE","小鼠胚胎与人原代T细胞","脱靶结构变异-p53反应","编辑—单细胞—全基因组",92,97,.31,["cell-study","genotoxicity","single-cell","bioinformatics","pcr"]],
  ["biotech-therapy-safety",5,"CAR-T突破性细胞因子释放综合征的单细胞机制","Axicabtagene ciloleucel与阿那白滞素","淋巴瘤患者PBMC样本","IFN-γ-CXCL10-单核细胞通讯","病例—细胞因子—单细胞",94,98,.28,["clinical-monitor","elisa","flow","single-cell","bioinformatics"]],
];

export const PROJECTS: ProjectDefinition[] = PROJECT_ROWS.map((row,index)=>{
  const [programId,stage,title,intervention,model,target,route,difficulty,novelty,truthBias,recommendedExperiments]=row;
  const program=RESEARCH_PROGRAMS.find(item=>item.id===programId)!;
  const requiredEvidence = (stage>=4 ? ["phenotype","mechanism","causality","replication"] : stage>=2 ? ["phenotype","molecular","mechanism","replication"] : ["phenotype","molecular","replication"]) as ProjectDefinition["requiredEvidence"];
  if(recommendedExperiments.some(id=>["transcriptomics","proteomics","metabolomics","microbiome","single-cell","multiomics"].includes(id)))requiredEvidence.splice(requiredEvidence.length-1,0,"omics");
  return {id:`project-${index+1}`,programId,stage,domain:program.domain,title,intervention,model,target,mechanismAxis:target,route,difficulty,novelty,truthBias,recommendedExperiments,requiredEvidence,referenceIds:[`ref-${index+1}`],question:`${intervention}在${model}中是否通过${target}产生可重复、可干预的效应？`,knowledgeGap:`现有研究仍缺少剂量—时间关系、关键节点干预和跨模型一致性证据。`};
});

export const EXPERIMENTS: ExperimentDefinition[] = [
  {id:"cell-study",name:"做细胞实验",short:"细胞实验",icon:"🧫",family:"cell",description:"建立细胞处理体系、剂量和时间窗，获得后续检测需要的样本与基础表型。",slots:3,cost:6,energy:12,baseSuccess:.82,skill:"wet",equipment:"细胞平台",sample:"细胞系或原代细胞",evidence:"phenotype",tags:["细胞","处理体系"]},
  {id:"cell-toxicity",name:"细胞活性检测",short:"细胞活性",icon:"◌",family:"cell",description:"通过 CCK-8、MTT 或 LDH 等方法判断细胞存活和损伤程度。",slots:2,cost:4,energy:10,baseSuccess:.86,skill:"wet",equipment:"细胞平台",sample:"细胞",evidence:"phenotype",tags:["细胞","剂量"]},
  {id:"ros",name:"ROS / 氧化应激",short:"ROS",icon:"✦",family:"cell",description:"检测活性氧和抗氧化系统，判断损伤是否与氧化应激有关。",slots:2,cost:5,energy:10,baseSuccess:.8,skill:"wet",equipment:"荧光酶标仪",sample:"细胞或组织",evidence:"biochemical",tags:["氧化应激"]},
  {id:"apoptosis",name:"凋亡 / TUNEL",short:"凋亡",icon:"◇",family:"cell",description:"区分凋亡、坏死等细胞死亡方式，补充机制证据。",slots:3,cost:8,energy:14,baseSuccess:.76,skill:"wet",equipment:"成像系统",sample:"细胞或切片",evidence:"mechanism",tags:["细胞死亡"]},
  {id:"flow",name:"流式细胞术",short:"流式",icon:"∴",family:"cell",description:"定量细胞亚群、周期、凋亡和免疫表型。",slots:4,cost:12,energy:17,baseSuccess:.72,skill:"wet",equipment:"流式细胞仪",sample:"单细胞悬液",evidence:"mechanism",tags:["免疫","细胞"]},
  {id:"pcr",name:"PCR",short:"PCR",icon:"⌁",family:"molecular",description:"整合常规 PCR 与 RT-qPCR，确认目标基因及其表达量变化。",slots:2,cost:4,energy:9,baseSuccess:.84,skill:"wet",equipment:"PCR 平台",sample:"DNA 或 RNA",evidence:"molecular",tags:["核酸"]},
  {id:"wb",name:"Western blot 机制验证",short:"WB",icon:"≡",family:"molecular",description:"验证蛋白表达与磷酸化通路，常用于支持机制结论。",slots:5,cost:13,energy:21,baseSuccess:.7,skill:"wet",equipment:"电泳转膜系统",sample:"蛋白裂解液",evidence:"mechanism",tags:["蛋白","机制"]},
  {id:"animal-model",name:"做动物实验",short:"动物实验",icon:"🐁",family:"animal",description:"包含建模、随机分组、给药和取样，用整体模型验证效应是否成立。",slots:10,cost:28,energy:30,baseSuccess:.8,skill:"wet",equipment:"动物房",sample:"实验动物",evidence:"phenotype",tags:["动物","长期"]},
  {id:"clinical-monitor",name:"一般状态与病例监测",short:"状态监测",icon:"▤",family:"animal",description:"记录体重、行为、生存和临床表现。",slots:2,cost:2,energy:8,baseSuccess:.88,skill:"theory",equipment:"观察记录",sample:"动物或病例",evidence:"phenotype",tags:["监测","重复"]},
  {id:"biochem",name:"血液 / 组织生化",short:"生化",icon:"⬡",family:"toxicology",description:"检测肝肾功能、代谢和组织损伤指标。",slots:3,cost:8,energy:13,baseSuccess:.84,skill:"wet",equipment:"生化分析仪",sample:"血清或组织",evidence:"biochemical",tags:["器官毒性"]},
  {id:"he",name:"病理切片",short:"病理切片",icon:"◉",family:"pathology",description:"整合制片、H&E、特殊染色与必要免疫组化，直接观察组织损伤。",slots:4,cost:10,energy:16,baseSuccess:.78,skill:"wet",equipment:"病理平台",sample:"固定组织",evidence:"histology",tags:["病理"]},
  {id:"elisa",name:"ELISA / 细胞因子",short:"ELISA",icon:"▦",family:"pathology",description:"定量血清、组织或上清中的炎症因子和分泌蛋白。",slots:2,cost:6,energy:10,baseSuccess:.84,skill:"wet",equipment:"病理与指标平台",sample:"血清、组织或上清",evidence:"biochemical",tags:["病理指标","炎症"]},
  {id:"genotoxicity",name:"遗传毒性组合",short:"遗传毒性",icon:"☷",family:"toxicology",description:"用 Ames、彗星或微核试验判断DNA损伤与致突变风险。",slots:5,cost:15,energy:19,baseSuccess:.74,skill:"wet",equipment:"生物安全平台",sample:"菌株、细胞或骨髓",evidence:"causality",tags:["DNA 损伤"]},
  {id:"lcms",name:"LC-MS/MS 毒代动力学",short:"LC-MS",icon:"⌬",family:"toxicology",description:"分析具体物质的暴露、代谢物与毒性窗口。",slots:6,cost:24,energy:18,baseSuccess:.72,skill:"data",equipment:"质谱平台",sample:"血浆或组织",evidence:"causality",tags:["药代","定量"]},
  {id:"organoid",name:"类器官 / 3D 模型",short:"类器官",icon:"◍",family:"cell",description:"在人源三维模型中验证二维细胞结果和组织特异反应。",slots:8,cost:30,energy:24,baseSuccess:.64,skill:"wet",equipment:"类器官平台",sample:"原代或iPSC来源细胞",evidence:"causality",tags:["替代模型","高难度"]},
  {id:"transcriptomics",name:"转录组测序",short:"转录组",icon:"🧬",family:"omics",description:"完成样本质控与测序，获得全局表达变化；技术成功不保证出现显著通路。",slots:8,cost:32,energy:20,baseSuccess:.78,skill:"data",equipment:"测序平台",sample:"高质量 RNA",evidence:"omics",tags:["组学"]},
  {id:"proteomics",name:"蛋白组学",short:"蛋白组",icon:"⟐",family:"omics",description:"完成蛋白提取、质谱检测并寻找机制网络。",slots:9,cost:38,energy:22,baseSuccess:.72,skill:"data",equipment:"质谱平台",sample:"蛋白样本",evidence:"omics",tags:["组学"]},
  {id:"metabolomics",name:"代谢组学",short:"代谢组",icon:"⬢",family:"omics",description:"分析代谢物谱与通路扰动，阴性结果仍可用于风险解释。",slots:8,cost:35,energy:21,baseSuccess:.74,skill:"data",equipment:"质谱平台",sample:"血清、尿液或组织",evidence:"omics",tags:["组学"]},
  {id:"microbiome",name:"16S / 宏基因组",short:"微生物组",icon:"🦠",family:"omics",description:"解析菌群结构与功能变化。",slots:8,cost:30,energy:19,baseSuccess:.76,skill:"data",equipment:"测序平台",sample:"粪便或环境样本",evidence:"omics",tags:["组学","菌群"]},
  {id:"single-cell",name:"单细胞测序",short:"单细胞",icon:"✣",family:"omics",description:"从高活率单细胞中解析亚群和异质性，样本制备仍有较高难度。",slots:12,cost:55,energy:28,baseSuccess:.66,skill:"data",equipment:"单细胞平台",sample:"高活率单细胞",evidence:"omics",tags:["组学","前沿"]},
  {id:"bioinformatics",name:"组学数据分析",short:"组学分析",icon:"∿",family:"analysis",description:"完成质控、差异分析和通路解释，把组学结果变成可验证假说。",slots:4,cost:2,energy:15,baseSuccess:.82,skill:"data",equipment:"工作站",sample:"组学数据",evidence:"mechanism",tags:["分析"]},
  {id:"multiomics",name:"多组学整合",short:"多组学",icon:"∞",family:"analysis",description:"整合两种以上组学与表型证据，建立跨层级因果线索。",slots:10,cost:12,energy:26,baseSuccess:.68,skill:"data",equipment:"计算集群",sample:"多组学数据",evidence:"causality",tags:["组学","整合"]},
];

export const ACTIVITIES: Record<ActivityId,{name:string;icon:string;description:string;energy:number;san:number;slots:number}> = {
  pilot:{name:"预实验",icon:"⌁",description:"先用小样本摸清条件，提高下一项正式实验成功率。",energy:-8,san:-1,slots:1},
  literature:{name:"文献与方案",icon:"▧",description:"提高理论并优化技术路线。",energy:-7,san:-1,slots:1},
  analysis:{name:"数据分析",icon:"∿",description:"整理、统计并解释已有实验结果。",energy:-10,san:-2,slots:1},
  figure:{name:"论文画图",icon:"▦",description:"把分析结果整理成可投稿的 Figure。",energy:-9,san:-2,slots:1},
  writing:{name:"论文写作",icon:"✎",description:"推进当前稿件与回复。",energy:-9,san:-2,slots:1},
  review:{name:"回复审稿人",icon:"↩",description:"逐条解释修改内容、定位补充数据并撰写回复信。",energy:-10,san:-4,slots:1},
  thesis:{name:"毕业论文",icon:"▥",description:"第三年后整理毕业论文。",energy:-10,san:-3,slots:1},
  grant:{name:"申请经费",icon:"¥",description:"向导师或学院申请机动经费。",energy:-6,san:-2,slots:1},
  collaborate:{name:"找同门合作",icon:"☕",description:"换取技术加成，也可能欠人情。",energy:-5,san:2,slots:1},
  rest:{name:"认真休息",icon:"☾",description:"恢复精力与 SAN。",energy:20,san:14,slots:1},
  games:{name:"正当摸鱼",icon:"☂",description:"短暂离开科研焦虑。",energy:9,san:12,slots:1},
  date:{name:"约会与陪伴",icon:"♡",description:"仅与关系足够的成年同级同门。",energy:4,san:15,slots:1},
  travel:{name:"短途旅行",icon:"✈",description:"占用整个双周，恢复巨大但可能延误。",energy:28,san:24,slots:5},
};

export const GRADUATION_RULES: GraduationRule[] = [
  {id:"two-sci",name:"国际论文型",description:"至少接收 2 篇 SCI 论文",sci:2,highSci:0,chineseCore:0},
  {id:"one-high",name:"高水平成果型",description:"至少接收 1 篇高水平 SCI",sci:0,highSci:1,chineseCore:0},
  {id:"three-core",name:"国内成果型",description:"至少接收 3 篇中文核心",sci:0,highSci:0,chineseCore:3},
  {id:"mixed",name:"综合成果型",description:"至少接收 1 篇 SCI 与 1 篇中文核心",sci:1,highSci:0,chineseCore:1},
];

const sci = (id:string,name:string,value:number,days:[number,number],source:string,scope:string[],quality:number,complete:number,high=false):JournalDefinition => ({
  id,name,language:"英文",publicationClass:high?"SCI_HIGH":"SCI",metricLabel:"JIF",metricValue:value,metricYear:2025,metricSource:source,reviewDays:days,reviewEstimate:false,apc:high?32000:22000,scope,qualityNeed:quality,completenessNeed:complete,
  recommendedFigures:high?[5,6]:[4,5],requiredEvidence:high?["phenotype","mechanism","causality","replication"]:["phenotype","molecular","mechanism","replication"],
  submissionProfile:high?"建议5–6张主图：完整表型、机制链、因果或挽救验证，并有独立重复。":"建议4–5张主图：表型、分子和机制形成闭环，并完成独立重复。",
  officialDisplayItemLimit:null,figurePolicyKind:"game-target",
});
const cn = (id:string,name:string,value:number|null,scope:string[],quality:number,core=true):JournalDefinition => ({
  id,name,language:"中文",publicationClass:core?"CHINESE_CORE":"CHINESE_OTHER",metricLabel:"复合影响因子",metricValue:value,metricYear:2025,metricSource:`https://www.baidu.com/s?wd=${encodeURIComponent(name+" 官网")}`,reviewDays:[30,90],reviewEstimate:true,apc:2800,scope,qualityNeed:quality,completenessNeed:50,
  recommendedFigures:[3,4],requiredEvidence:["phenotype","molecular","replication"],submissionProfile:"建议3–4张主图：核心表型、病理或生化、分子验证，并至少完成一次独立重复。",officialDisplayItemLimit:null,figurePolicyKind:"game-target",
});
export const JOURNALS: JournalDefinition[] = [
  sci("toxsci","Toxicological Sciences",5.2,[21,35],"https://academic.oup.com/toxsci/pages/About",["毒理","机制"],78,75,true),
  sci("arch-tox","Archives of Toxicology",6.1,[18,45],"https://link.springer.com/journal/200",["毒理","机制"],82,80,true),
  sci("fct","Food and Chemical Toxicology",3.5,[1,27],"https://www.sciencedirect.com/journal/food-and-chemical-toxicology/about/insights",["食品","毒理"],70,68),
  sci("toxicology","Toxicology",4.6,[3,19],"https://www.sciencedirect.com/journal/toxicology",["毒理","机制"],75,70),
  sci("taap","Toxicology and Applied Pharmacology",3.4,[8,40],"https://www.sciencedirect.com/journal/toxicology-and-applied-pharmacology/about/insights",["毒理","药理"],69,68),
  sci("etap","Environmental Toxicology and Pharmacology",4.2,[7,46],"https://www.sciencedirect.com/journal/environmental-toxicology-and-pharmacology",["环境","毒理"],71,66),
  sci("cbt","Cell Biology and Toxicology",5.3,[20,55],"https://link.springer.com/journal/10565",["细胞","毒理"],80,74,true),
  sci("jat","Journal of Applied Toxicology",3.3,[20,60],"https://onlinelibrary.wiley.com/journal/10991263",["应用毒理"],66,62),
  sci("rtp","Regulatory Toxicology and Pharmacology",2.8,[10,42],"https://www.sciencedirect.com/journal/regulatory-toxicology-and-pharmacology",["风险评价"],62,64),
  sci("jep","Journal of Ethnopharmacology",5.4,[4,35],"https://www.sciencedirect.com/journal/journal-of-ethnopharmacology",["中药","天然产物"],76,70,true),
  sci("phytomedicine","Phytomedicine",7.9,[5,36],"https://www.sciencedirect.com/journal/phytomedicine",["中药","天然产物"],85,78,true),
  sci("chinese-medicine","Chinese Medicine",5.7,[20,50],"https://cmjournal.biomedcentral.com/",["中医药"],78,72,true),
  sci("apsb","Acta Pharmaceutica Sinica B",14.7,[7,42],"https://www.sciencedirect.com/journal/acta-pharmaceutica-sinica-b",["药理","药学"],94,88,true),
  sci("front-pharm","Frontiers in Pharmacology",4.8,[30,70],"https://www.frontiersin.org/journals/pharmacology",["药理","毒理"],72,66),
  sci("bmp","Biomedicine & Pharmacotherapy",7.5,[5,40],"https://www.sciencedirect.com/journal/biomedicine-and-pharmacotherapy",["药理","转化"],84,76,true),
  sci("jhm","Journal of Hazardous Materials",11.3,[4,38],"https://www.sciencedirect.com/journal/journal-of-hazardous-materials",["环境","污染物"],91,84,true),
  sci("ees","Ecotoxicology and Environmental Safety",6.2,[4,35],"https://www.sciencedirect.com/journal/ecotoxicology-and-environmental-safety",["环境","生态毒理"],79,72,true),
  sci("cbi","Chemico-Biological Interactions",5.1,[5,34],"https://www.sciencedirect.com/journal/chemico-biological-interactions",["机制","毒理"],75,70,true),
  cn("cjpt","中国药理学与毒理学杂志",1.17,["毒理","药理"],58), cn("cjp","中国药理学通报",2.04,["药理"],61),
  cn("aps-cn","药学学报",2.04,["药学","药理"],66), cn("cjcmm","中国中药杂志",2.21,["中药"],62),
  cn("zcy","中草药",2.75,["中药","天然产物"],64), cn("syfjx","中国实验方剂学杂志",2.61,["中医药","方剂"],59),
  cn("zcyy","中成药",1.62,["中药"],55), cn("new-drugs","中国新药杂志",1.83,["新药","药理"],58),
  cn("pharmacy","中国药房",2.43,["药学"],56), cn("modern-pharm","中国现代应用药学",1.71,["药学"],55),
  cn("carcinogenesis","癌变·畸变·突变",1.02,["遗传毒性","肿瘤"],53), cn("comparative-med","中国比较医学杂志",1.48,["动物模型"],54),
];

const EVENT_SEEDS: Record<EventNode["category"],Array<[string,string,string,string]>> = {
  实验:[["freezer","-80°C 冰箱报警","仪器室","你的样本和同门的样本都在里面。"],["antibody","最后半支好抗体","韩哲","供应商说下批要等六周。"],["contam","培养箱里的陌生云团","邵宇","污染可能来自任何一次开门。"],["machine","流式仪器临时停机","罗欣","预约表已经排到下个月。"],["label","两个相似的样本标签","安琪","记录本和冻存管出现了分歧。"],["power","夜间短暂停电","值班群","备用电源只能保一部分设备。"],["reagent","试剂批次漂移","田苗","新批号的标准曲线不太一样。"],["animal","动物模型波动","江楠","同一批动物出现了两个方向。"],["blind","盲法评分争议","白露","两位评分者差了整整一级。"],["backup","工作站硬盘异响","苏晴","Figure 3 还没有同步。"],["platform","平台插队机会","林舟","今晚有一个临时空档。"],["sample","珍贵样本只够一次","孙宁","重做意味着再等三个月。"]],
  导师:[["friday","周五 17:58 的消息","导师","“不急，下周组会讲完整故事。”"],["funding-cut","经费单被退回","科研秘书","导师在采购理由旁画了问号。"],["praise","导师罕见的表扬","导师","“这组数据值得继续。”"],["scope","课题范围又变宽了","导师","一个问题在白板上长出了三个分支。"],["conference","会议摘要截止","导师","导师希望你代表课题组投稿。"],["meeting","组会公开追问","导师","屏幕上的机制箭头显得格外孤单。"],["holiday","导师主动放假","导师","“实验室也需要关机维护。”"],["grant-deadline","基金标书救火","导师","你的初步数据突然成为关键图。"],["authorship","作者顺序讨论","导师","贡献和承诺在会议室里重新排列。"],["new-direction","导师看中一条新方向","导师","新颖，但会让现有证据打折。"],["budget","年度预算清零提醒","导师","月底前不用掉也不会留给明年。"],["patience","导师耐心正在下降","导师","连续延期开始改变谈话语气。"]],
  人情:[["favor","人情债到期","韩哲","清晨六点的取样缺一个人。"],["milk-tea","同门论文接收奶茶","邵宇","杯子上写着：下一个就是你。"],["stats-help","统计救火请求","苏晴","她能救你的图，也需要你帮忙取样。"],["collab","跨组合作邀请","赵祺","共享数据，也共享作者顺序。"],["graduation","师兄毕业清仓","顾言","旧实验本和试剂盒正在找新主人。"],["rumor","走廊里的抢发传闻","方糖","隔壁组可能在做同一条通路。"],["conflict","公共冰箱空间争执","白露","你的盒子占了最后一层。"],["credit","共同一作谈判","赵祺","工作量和署名并不自动相等。"],["meal","一顿不谈论文的午饭","邵宇","两分钟后所有人开始谈 p 值。"],["farewell","联培生即将离组","谢川","最后一周可以交接全部蛋白组经验。"],["help-new","新人求助","田苗","教会别人会消耗时间，也会巩固技能。"],["network","学术会议认识同行","孙宁","对方实验室刚好有你缺的模型。"]],
  生活:[["date-conflict","约会与实验撞车","手机日历","两个重要提醒出现在同一晚。"],["travel","三天短途旅行","同门群","车票很便宜，截止日期很近。"],["family","家里问什么时候毕业","家人","这不是一个能用 p 值回答的问题。"],["sleep","连续失眠","身体","咖啡已经不能解释心跳。"],["exercise","操场偶遇","校园","跑步的人看起来没有 Reviewer。"],["festival","节假日空实验室","门禁系统","没人排队，也没人替你处理事故。"],["illness","突然发烧","体温计","细胞不会因为你请假停止生长。"],["concert","抢到一张演出票","手机","演出当天正好是关键取样。"],["roommate","室友搬走","宿舍","安静增加了，孤独也增加了。"],["coffee","咖啡机坏了","实验室","一个小设备影响了全组情绪。"],["pet","校园猫的固定饭点","校园猫","它比你的实验更准时。"],["career","企业宣讲会","就业中心","研发岗的工作描述意外具体。"]],
  伦理:[["points","两个不好看的数据点","内心审稿人","去掉后 p=0.047，保留则 p=0.081。"],["duplicate","图片面板疑似重复","Figure 检查","文件名只差一个 final。"],["protocol","伦理批件范围不足","科研秘书","新增剂量不在原批准方案内。"],["selective","只汇报最漂亮的重复","组会 PPT","另外两次被放进了隐藏文件夹。"],["authorship-ethics","礼物作者提议","导师","对方没有做实验，但能提供资源。"],["raw-data","原始数据缺少时间戳","实验记录","结果很好，记录却不完整。"],["outlier","离群值处理争议","苏晴","统计规则应该在看结果前决定。"],["animal-welfare","动物福利异常","江楠","继续实验可能扩大伤害。"],["safety","生物安全流程被省略","安琪","节省十分钟也增加了暴露风险。"],["scoop-ethics","预印本高度相似","文献预警","抢速度不能成为降低标准的理由。"],["negative","阴性结果是否隐藏","稿件草稿","它会削弱故事，也会提高可信度。"],["reuse","旧数据能否用于新论文","导师","边界取决于问题、披露和重复发表风险。"]],
};

const EVENT_EFFECTS: Record<EventNode["category"],[EventNode["choices"][number],EventNode["choices"][number],EventNode["choices"][number],EventNode["choices"][number]]> = {
  实验:[{label:"立刻停下其他任务处理",hint:"精力↓·信任↑",effect:{energy:-10,san:-3,trust:5,integrity:2},flag:"responsible"},{label:"找平台老师一起排查",hint:"经费↓·社交↑",effect:{funding:-4,relation:6,stats:{social:2}},flag:"platform-help"},{label:"改设计，把异常变成问题",hint:"理论↑·SAN↓",effect:{energy:-5,san:-2,stats:{theory:2}},flag:"redesign"},{label:"先相信运气",hint:"SAN↑·证据风险",effect:{san:5,trust:-6,integrity:-2},flag:"lab-risk"}],
  导师:[{label:"正面沟通工作量",hint:"信任↑·压力小幅上升",effect:{energy:-5,san:-3,trust:6,pressure:3,stats:{social:1}},flag:"spoke-up"},{label:"默默加班完成",hint:"精力↓↓·导师信任↑",effect:{energy:-12,san:-8,trust:5,pressure:5},flag:"overtime"},{label:"拿数据和时间表谈判",hint:"理论、社交↑·压力↓",effect:{energy:-4,pressure:-5,stats:{theory:1,social:2}},flag:"negotiate"},{label:"明确说现在做不到",hint:"精力保留·导师信任↓",effect:{san:4,trust:-9,pressure:6},flag:"refuse-advisor"}],
  人情:[{label:"帮这个忙",hint:"关系↑↑·精力↓",effect:{energy:-8,relation:10},flag:"favor"},{label:"提议交换帮助",hint:"关系↑·边界清晰",effect:{energy:-5,relation:6,stats:{social:1}},flag:"fair-exchange"},{label:"找第三个人协调",hint:"经费↓·社交↑",effect:{funding:-2,relation:3,stats:{social:2}},flag:"coordinate"},{label:"明确拒绝",hint:"精力保留·关系↓",effect:{san:3,relation:-8},flag:"boundary"}],
  生活:[{label:"给生活留位置",hint:"SAN↑↑·信任小幅下降",effect:{energy:8,san:14,trust:-2},flag:"life"},{label:"项目优先",hint:"信任↑·SAN↓",effect:{energy:-7,san:-8,trust:4,pressure:3},flag:"work-first"},{label:"和同门调班两全",hint:"关系↑·人情负担",effect:{energy:-3,san:7,relation:6},flag:"shift-swap"},{label:"什么都不决定，先拖着",hint:"暂时省下时间·压力↑↑",effect:{san:-6,pressure:9},flag:"avoidance"}],
  伦理:[{label:"按最严格规范处理",hint:"诚信↑↑·进度慢",effect:{energy:-7,san:-2,trust:5,integrity:6},flag:"integrity"},{label:"咨询伦理或统计专家",hint:"经费↓·理论↑",effect:{funding:-3,stats:{theory:2},integrity:4},flag:"expert-consult"},{label:"完整保留记录并披露局限",hint:"写作↑·诚信↑",effect:{energy:-4,stats:{writing:2},integrity:3},flag:"transparent-report"},{label:"先让结果好看",hint:"短期信任↑·诚信↓↓",effect:{san:3,trust:6,integrity:-22},flag:"integrity-risk"}],
};

const BASE_EVENTS: EventNode[] = Object.entries(EVENT_SEEDS).flatMap(([category,rows])=>rows.map(([slug,title,speaker,text],index)=>({id:`${category}-${slug}`,category:category as EventNode["category"],speaker,icon:{实验:"🧪",导师:"🧑‍🏫",人情:"☕",生活:"🌙",伦理:"⚖"}[category]!,title,text,choices:EVENT_EFFECTS[category as EventNode["category"]],minTurn:1+index*4})));

const CONFLICT_EVENTS: EventNode[] = [
  {id:"conflict-extra-experiments",category:"导师",speaker:"导师",icon:"🧑‍🏫",title:"“再补三个实验就完整了”",text:"组会结束前，导师在你的证据树旁又画了三个圈，要求六个回合内补完。",minTurn:8,choices:[
    {label:"接下限时任务",hint:"六回合内完成 3 项实验·成功有经费",effect:{energy:-5,san:-6,trust:7,pressure:8},flag:"accept-extra-experiments"},
    {label:"拿证据树谈判",hint:"理论↑·压力↓·信任？",effect:{energy:-4,san:-2,pressure:-5,stats:{theory:2,social:2}},flag:"negotiate-scope"},
    {label:"要求先批经费",hint:"经费 +¥18k·导师信任↓",effect:{funding:18,trust:-4,pressure:3},flag:"budget-before-work"},
    {label:"直接拒绝无限加码",hint:"保住精力·关系显著下降",effect:{san:5,trust:-12,pressure:7},flag:"refuse-scope-creep"},
  ]},
  {id:"conflict-pickup-child",category:"导师",speaker:"导师",icon:"🎒",title:"导师请你帮忙接孩子",text:"下班前，导师说家里临时有事，希望你去学校门口接一下孩子。晚上正好是你的取样时间。",minTurn:5,choices:[
    {label:"答应，调整取样",hint:"精力↓·导师信任↑·边界模糊",effect:{energy:-12,san:-4,trust:10,pressure:4},flag:"pickup-child"},
    {label:"请同门代班取样",hint:"关系↓·人情债风险",effect:{energy:-4,relation:-8,trust:6},flag:"delegate-private-task"},
    {label:"说明实验冲突",hint:"社交能力↑·结果取决于导师性格",effect:{stats:{social:2},pressure:-2},flag:"professional-boundary"},
    {label:"说自己不方便",hint:"保留时间·导师信任↓",effect:{san:3,trust:-8,pressure:5},flag:"refuse-private-task"},
  ]},
  {id:"conflict-weekend-delivery",category:"导师",speaker:"导师",icon:"📦",title:"周末替导师收试剂",text:"导师让你周六一整天留在实验室等一批冷链包裹，但你已经买了旅行的车票。",minTurn:7,choices:[
    {label:"留守实验室",hint:"精力↓↓·信任↑",effect:{energy:-14,san:-7,trust:8},flag:"weekend-duty"},
    {label:"与技术员协调",hint:"经费↓·社交↑",effect:{funding:-3,stats:{social:2},trust:3},flag:"paid-coordination"},
    {label:"提醒导师应建立值班表",hint:"压力↑·长期边界改善",effect:{trust:-3,pressure:5,integrity:1},flag:"duty-roster"},
    {label:"照常出发旅行",hint:"SAN↑·冷链事故风险",effect:{energy:8,san:12,trust:-10},flag:"missed-delivery"},
  ]},
  {id:"conflict-grant-pivot",category:"导师",speaker:"导师",icon:"📋",title:"你的课题被借去写标书",text:"导师希望你暂停当前路线，先用两个月补一组基金申请需要的数据。",minTurn:14,choices:[
    {label:"把标书当成合作",hint:"经费↑·本课题延误",effect:{funding:22,energy:-10,trust:9,pressure:5},flag:"grant-rescue"},
    {label:"要求明确数据与署名",hint:"诚信↑·社交↑",effect:{integrity:3,stats:{social:2},trust:2},flag:"grant-credit-agreed"},
    {label:"只提供现有结果",hint:"精力保留·信任小幅下降",effect:{trust:-3,san:2},flag:"limited-grant-help"},
    {label:"优先自己的毕业进度",hint:"压力↑·导师信任↓",effect:{trust:-9,pressure:8},flag:"refuse-grant-work"},
  ]},
  {id:"conflict-authorship",category:"人情",speaker:"导师",icon:"✍️",title:"突然多出来的共同一作",text:"导师说某位同学“后面会帮忙”，希望在你的稿件上加为共同一作。",minTurn:20,choices:[
    {label:"接受导师安排",hint:"信任↑·心态下降",effect:{trust:8,san:-10,relation:-5},flag:"gift-cofirst"},
    {label:"要求先列贡献清单",hint:"诚信↑·压力↑",effect:{integrity:4,pressure:5,stats:{social:2}},flag:"contribution-record"},
    {label:"换取对方完成一项实验",hint:"人情债↑·证据链可能加快",effect:{relation:7,trust:3},flag:"cofirst-exchange"},
    {label:"明确拒绝礼物署名",hint:"诚信↑↑·导师信任↓",effect:{integrity:7,trust:-10,pressure:7},flag:"refuse-gift-author"},
  ]},
  {id:"conflict-negative-data",category:"伦理",speaker:"导师",icon:"📉",title:"导师让你“先别放”阴性数据",text:"阴性重复会让故事变得难看。导师建议只把最清晰的两次结果放进主文。",minTurn:18,choices:[
    {label:"完整报告所有重复",hint:"诚信↑↑·稿件故事变弱",effect:{integrity:7,trust:-3,pressure:3},flag:"report-all-results"},
    {label:"主文精简，补充材料披露",hint:"诚信↑·写作负担↑",effect:{integrity:4,energy:-6,stats:{writing:2}},flag:"disclose-supplement"},
    {label:"重做一轮预注册实验",hint:"精力↓↓·重复证据机会",effect:{energy:-12,san:-4,trust:4},flag:"preregister-repeat"},
    {label:"按导师意思删掉",hint:"短期信任↑·诚信↓↓",effect:{trust:8,integrity:-24,san:-5},flag:"integrity-risk"},
  ]},
  {id:"conflict-lab-favor",category:"人情",speaker:"师兄",icon:"🚗",title:"“帮导师办点私事很正常”",text:"师兄说他们以前替导师搬过家、送过机，劝你不要在小事上“太计较”。",minTurn:10,choices:[
    {label:"跟着师兄做",hint:"关系↑·精力↓",effect:{relation:10,energy:-9,san:-4},flag:"normalize-private-favor"},
    {label:"只做与科研有关的事",hint:"边界清晰·关系↓",effect:{relation:-6,san:4,integrity:2},flag:"research-only-boundary"},
    {label:"去问其他课题组怎么处理",hint:"社交↑·获得外部视角",effect:{stats:{social:2,theory:1},relation:2},flag:"seek-outside-advice"},
    {label:"记下来，暂时不表态",hint:"SAN↓·保留后续选择",effect:{san:-3,pressure:2},flag:"document-boundary"},
  ]},
  {id:"conflict-student-scoop",category:"人情",speaker:"同门",icon:"📁",title:"同门拿你的数据先做了汇报",text:"你在大组会上看到了自己尚未公开的图。同门说他只是想帮忙推进合作。",minTurn:16,choices:[
    {label:"当场要求标注贡献",hint:"关系↓·诚信↑·压力↑",effect:{relation:-8,integrity:4,pressure:5},flag:"public-credit-claim"},
    {label:"会后私下对质",hint:"社交↑·仍有谈判空间",effect:{stats:{social:2},relation:-3,san:-3},flag:"private-confrontation"},
    {label:"提议正式共享与署名协议",hint:"精力↓·合作稳定",effect:{energy:-5,relation:6,integrity:3},flag:"data-sharing-agreement"},
    {label:"当作没发生",hint:"短期省事·长期信任与 SAN 下降",effect:{san:-10,relation:-10,trust:-2},flag:"silent-scoop"},
  ]},
];

export const EVENTS: EventNode[] = [...BASE_EVENTS,...CONFLICT_EVENTS];

export const ENDINGS: EndingDefinition[] = [
  ["normal","按时毕业","毕业","三年整，你带着几篇论文和一身实验室气味离开。"],["excellent","优秀毕业","毕业","答辩委员会一致认为证据链完整。"],["late","第四年毕业","毕业","日历多翻了几页，但毕业证最终到手。"],["barely","压线毕业","毕业","最后一封接收邮件赶在系统关闭前出现。"],
  ["phd","继续读博","学术","你决定把尚未回答的问题继续追下去。"],["postdoc-star","学术新星","学术","高质量成果让多个团队发来邀请。"],["young-pi","破格青年 PI","学术","多年后的你比想象中更早拥有了自己的课题组。"],["nobel","未来诺奖线索","学术","那次意外发现最终改变了一个领域。"],
  ["pharma","药企研发","就业","你把失败排查能力带进了候选药管线。"],["cro","CRO 项目经理","就业","排期、预算和沟通突然都成了优势。"],["platform","实验平台老师","就业","你终于可以合法地要求所有人预约仪器。"],["regulatory","药物警戒与注册","就业","严谨记录成为新的职业护城河。"],
  ["love","毕业与爱情","生活","有人陪你走过最后一次深夜取样。"],["balanced","生活重新开机","生活","科研很重要，但不再占据全部屏幕。"],["traveler","在路上","生活","你先去看了没有实验室灯光的夜空。"],["friendship","同门终身群聊","生活","论文会过时，凌晨救过样本的人不会。"],
  ["lab-manager","实验室管理员","荒诞","你对每一台设备的脾气都了如指掌。"],["coffee","咖啡机守护者","荒诞","全组公认最重要的基础设施由你负责。"],["reviewer","Reviewer Survivor","荒诞","你开始替编辑审稿，并努力不成为曾经讨厌的人。"],["slack-master","摸鱼宗师","荒诞","你证明恢复和工作可以形成稳定振荡。"],
  ["withdraw","主动离开学术","失败","离开不是失败，只是选择不再继续这条路线。"],["burnout","燃尽结局","失败","身体替你按下了暂停键。"],["integrity-fall","学术诚信危机","失败","漂亮结果无法覆盖缺失的记录。"],["unfinished","第四年仍未完成","失败","课题仍在继续，但这一局在这里结算。"],
].map(([id,title,family,description])=>({id,title,family:family as EndingDefinition["family"],description}));

export const PROJECT_BUILDER = {
  domains:["药物毒理","药理机制","中医药","天然产物","环境毒理","食品毒理","免疫毒理","神经药理","药物警戒","生物技术安全"],
  models:["肝损伤模型","肾损伤模型","心肌损伤模型","神经炎症模型","肿瘤类器官","慢性暴露模型","斑马鱼模型","原代肝细胞","人源肠类器官","免疫共培养模型","生殖发育模型","肠菌定植模型"],
  interventions:["候选小分子","天然产物单体","经典复方","纳米递送系统","抗体药物","环境污染物","基因治疗载体","农药混合物","食品污染物","多肽候选药"],
  targets:["铁死亡","氧化应激","炎症小体","线粒体自噬","肠道菌群","表观遗传","内质网应激","细胞焦亡","免疫检查点","脂质代谢","DNA 损伤","屏障稳态"],
  routes:["分子毒理","多组学整合","药效物质基础","风险评价","因果挽救","转化验证","单细胞解析","毒代动力学","类器官验证","真实世界证据"],
};
