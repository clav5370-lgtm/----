"use client";
import type { ExperimentRoute } from "../../game/research/types";
import { ROUTE_COPY, copy, type ResearchLocale } from "./copy";

export function RouteSelector({ locale, onSelect }: { locale: ResearchLocale; onSelect: (route: ExperimentRoute) => void }) {
  return <section className="experiment-route-selector" aria-label={copy(locale, "实验路线", "Research routes")}>
    <div className="experiment-center-intro"><p className="eyebrow">V7 RESEARCH ENGINE · {copy(locale, "实验库", "EXPERIMENT CENTRE")}</p><h2>{copy(locale, "先选择研究路线", "Choose a research route")}</h2><p>{copy(locale, "实验按路线和阶段组织，避免把几十个实验一次铺开。", "Experiments are organized by route and stage instead of flattening the whole library.")}</p></div>
    <div className="experiment-route-grid">{(Object.keys(ROUTE_COPY) as ExperimentRoute[]).map((route) => { const item = ROUTE_COPY[route]; return <button type="button" className={`experiment-route-card route-${route}`} key={route} onClick={() => onSelect(route)}><span className="route-icon">{item.icon}</span><span><strong>{item[locale === "en-US" ? "en" : "zh"].name}</strong><small>{item[locale === "en-US" ? "en" : "zh"].description}</small><em>{item[locale === "en-US" ? "en" : "zh"].hint}</em></span><b>→</b></button>; })}</div>
  </section>;
}
