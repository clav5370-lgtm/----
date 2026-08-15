import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the playable graduate-student selection screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>实验室摸鱼模拟器 · 毕业生存指南<\/title>/i);
  assert.match(html, /选择你的/);
  assert.match(html, /研究生人生/);
  assert.match(html, /重新抽取命运/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships the complete vertical-slice systems and original lab artwork", async () => {
  const [page, data, artwork] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/game-data.ts", import.meta.url), "utf8"),
    stat(new URL("../public/lab-evening.png", import.meta.url)),
  ]);
  for (const marker of ["resolveWeek", "Evidence Map", "Major Revision", "毕业论文答辩", "lab-life-save"]) {
    assert.match(page, new RegExp(marker));
  }
  for (const marker of ["预实验", "因果挽救", "向导师申领经费", "一支快过期的好抗体", "Advanced Mouse Studies"]) {
    assert.match(data, new RegExp(marker));
  }
  assert.ok((data.match(/id:\s*"/g) ?? []).length >= 20);
  assert.ok(artwork.size > 100_000);
});
