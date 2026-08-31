import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept:"text/html" } }),
    { ASSETS:{ fetch:async()=>new Response("Not found",{status:404}) } },
    { waitUntil(){}, passThroughOnException(){} },
  );
}

test("server-renders the local three-year game menu", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>实验室摸鱼模拟器 · 毕业生存指南<\/title>/i);
  assert.match(html, /三年制深度课题版 · V6\.2/);
  assert.match(html, /78/);
  assert.match(html, /开始新周目/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships portable engine boundaries and local saves", async () => {
  const [page, engine, content, types, i18n] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/game/engine.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/game/content.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/game/types.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/game/i18n.tsx", import.meta.url), "utf8"),
  ]);
  for (const marker of ["lab-life-v6-local", "执行两周计划", "60 个真实研究课题", "30 REAL JOURNALS", "下一步建议|接下来可以做"]) assert.match(page,new RegExp(marker));
  assert.doesNotMatch(page,/结构化自定义/);
  for (const marker of ["createRun", "scheduleExperiment", "resolveTurn", "advanceReview", "startNextProject", "startParallelProject", "submitReviewResponse", "technicalSuccessBreakdown", "nextExperimentSuggestions", "getNextProjectChoices", "journalSubmissionGaps", "evaluateGraduation"]) assert.match(engine,new RegExp(`export function ${marker}`));
  for (const marker of ["单细胞测序", "LC-MS/MS", "Toxicological Sciences", "中国中药杂志", "RESEARCH_PROGRAMS", "RESEARCH_REFERENCES"]) assert.match(content,new RegExp(marker));
  assert.match(types,/GameStateV6/);
  for (const marker of ["lab-life-language", "LanguageToggle", "en-US"]) assert.match(`${page}\n${i18n}`,new RegExp(marker));
});
