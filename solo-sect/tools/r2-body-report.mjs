#!/usr/bin/env node
// R2（#521）C：三種隱居開局 × 12 種子 × 60 日，記錄每人第 30、60 日的臂力與身法。受控 6 秒步長、每拍清 alert，只作 C 觀察。
// 用法：node tools/r2-body-report.mjs <solo-sect 目錄>（可對 base 與 head 各跑一次比較）
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(process.argv[2] || path.resolve(import.meta.dirname, '..'));
const { createState, tick } = await import(pathToFileURL(path.join(root, 'src/sim.mjs')));
const { DAY } = await import(pathToFileURL(path.join(root, 'src/data.mjs')));
const openings = ['solo', 'xiaolongnv', 'huangrong'], rows = [];
const snap = (s) => s.ds.map((d) => ({ id: d.id, root: d.root, strength: +(d.skills.strength || 0).toFixed(3), agility: +(d.skills.agility || 0).toFixed(3), fatigue: d.muscleFatigue == null ? null : +d.muscleFatigue.toFixed(1) }));
for (const opening of openings) for (let seed = 1001; seed <= 1012; seed++) {
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, hermitage: true, opening }), start = snap(s), at = {};
  for (let elapsed = 0; elapsed < 60 * DAY; elapsed += 6) { tick(s, 6); if (s.alert) s.alert = null; if (!at[30] && elapsed + 6 >= 30 * DAY) at[30] = snap(s); }
  at[60] = snap(s); rows.push({ opening, seed, start, d30: at[30], d60: at[60] });
}
const med = (v) => { const x = v.toSorted((a, b) => a - b); return x[Math.floor(x.length / 2)]; };
const summary = Object.fromEntries(openings.map((o) => { const g = rows.filter((r) => r.opening === o), hero = (k, day) => med(g.map((r) => r[day][0][k] - r.start[0][k]));
  return [o, { heroStrengthGain30: +hero('strength', 'd30').toFixed(3), heroStrengthGain60: +hero('strength', 'd60').toFixed(3), heroAgilityGain30: +hero('agility', 'd30').toFixed(3), heroAgilityGain60: +hero('agility', 'd60').toFixed(3) }]; }));
console.log(JSON.stringify({ days: 60, secondsPerTick: 6, alertPolicy: 'clear after each tick', scope: 'controlled C observation', summary, rows }, null, 1));
