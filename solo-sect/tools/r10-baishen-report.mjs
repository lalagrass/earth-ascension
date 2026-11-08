#!/usr/bin/env node
// R10（#530）C：白身獨自上山 × 12 種子 × 60 日，記錄第一次學會整門武學的日子。受控 6 秒步長、每拍清 alert，只作 C 觀察。
// 兩種玩法：natural 不下指令；player 第 1 日起派去林中山洞尋殘卷，找到後派去讀譜。
// 用法：node tools/r10-baishen-report.mjs [solo-sect 目錄]
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(process.argv[2] || path.resolve(import.meta.dirname, '..'));
const { createState, tick, setOrder } = await import(pathToFileURL(path.join(root, 'src/sim.mjs')));
const { DAY } = await import(pathToFileURL(path.join(root, 'src/data.mjs')));
const rows = [];
for (const mode of ['natural', 'player']) for (let seed = 1001; seed <= 1012; seed++) {
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, hermitage: true, opening: 'solo', starterArt: 'none' }), h = s.ds[0];
  let firstBook = null, firstArt = null;
  if (mode === 'player') setOrder(s, 'hero', 'searchFragment');
  for (let elapsed = 0; elapsed < 60 * DAY && firstArt == null; elapsed += 6) {
    tick(s, 6); if (s.alert) s.alert = null;
    if (firstBook == null && s.hermitage.books?.length) { firstBook = s.day; if (mode === 'player') setOrder(s, 'hero', 'readBook'); }
    if (Object.keys(h.arts).length) firstArt = { day: s.day, art: Object.keys(h.arts)[0] };
  }
  rows.push({ mode, seed, firstBook, firstArt });
}
const med = (v) => { const x = v.filter((n) => n != null).sort((a, b) => a - b); return x.length ? x[Math.floor(x.length / 2)] : null; };
const summary = Object.fromEntries(['natural', 'player'].map((m) => { const g = rows.filter((r) => r.mode === m); return [m, { learned: `${g.filter((r) => r.firstArt).length}/12`, medianFirstArtDay: med(g.map((r) => r.firstArt?.day)), medianFirstBookDay: med(g.map((r) => r.firstBook)) }]; }));
console.log(JSON.stringify({ days: 60, secondsPerTick: 6, alertPolicy: 'clear after each tick', scope: 'controlled C observation', summary, rows }, null, 1));
