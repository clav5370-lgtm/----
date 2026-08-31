"use client";
import type { CellStageId } from "../../game/research/types";
import type { ResearchRecommendation } from "../../game/experiments/results";
import { copy, EXPERIMENT_COPY, type ResearchLocale } from "./copy";

export function ExperimentAssistant({ recommendations, locale, onJump }: { recommendations: ResearchRecommendation[]; locale: ResearchLocale; onJump: (stage: CellStageId) => void }) {
  return <aside className="experiment-assistant"><p className="eyebrow">V7 ASSISTANT</p><h3>{copy(locale, "下一步建议", "Next-step assistant")}</h3>{recommendations.length ? recommendations.map((item) => <button type="button" key={item.id} onClick={() => onJump((item.id === "cell-viability" ? "phenotype" : item.id === "cell-gene-expression" || item.id === "cell-protein-expression" ? "molecular" : item.id === "cell-pharmacology-rescue" ? "causal" : "model") as CellStageId)}><b>{locale === "en-US" ? (EXPERIMENT_COPY[item.id]?.nameEn ?? "Recommended experiment") : item.name}</b><span>{copy(locale, item.reason, "This is recommended because it closes the next evidence gap.")}</span><em>→ {copy(locale, "跳到对应阶段", "Go to stage")}</em></button>) : <p>{copy(locale, "当前没有新的可用建议；先查看已完成证据。", "There are no new unlocked recommendations; review the evidence already collected.")}</p>}</aside>;
}
