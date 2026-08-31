"use client";
import type { EvidenceChain } from "../../game/research/types";
import { copy, type ResearchLocale } from "./copy";

const DIMENSIONS: Array<[keyof Omit<EvidenceChain, "max">, string, string]> = [["phenotype", "表型", "Phenotype"], ["molecular", "分子机制", "Molecular mechanism"], ["causality", "因果", "Causality"], ["animal", "动物", "Animal"], ["reproducibility", "重复", "Reproducibility"], ["mechanism", "机制关联", "Mechanistic association"]];
export function EvidenceChainPanel({ chain, locale }: { chain: EvidenceChain; locale: ResearchLocale }) {
  return <section className="evidence-chain-panel"><div className="v7-panel-heading"><div><p className="eyebrow">EVIDENCE CHAIN</p><h3>{copy(locale, "证据链强度", "Evidence-chain strength")}</h3></div><strong>{chain.max}/5</strong></div><div className="evidence-stars">{DIMENSIONS.map(([key, zh, en]) => { const level = Math.max(0, Math.min(5, chain[key] ?? 0)); return <div key={key}><span>{copy(locale, zh, en)}</span><b aria-label={`${level} of 5`}>{[1, 2, 3, 4, 5].map((star) => <i className={star <= level ? "filled" : ""} key={star}>★</i>)}</b></div>; })}</div><p className="association-note">⚠ {copy(locale, "关联 ≠ 因果：分子变化支持关联，只有干预并观察表型逆转才会提高因果证据。五星还需要动物验证与重复性。", "Association ≠ causality: molecular changes support association; causal strength rises only after intervention and phenotype rescue. Five stars also require animal validation and replication.")}</p></section>;
}
