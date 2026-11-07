#!/usr/bin/env node
// Phase 7 C 報告：正常 0.25 秒步長，自動按過警示，自然日程不下玩家新命令；只列數字不校常數。
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(process.argv.slice(2).find(a => !a.startsWith('--')) || path.resolve(import.meta.dirname, '..'));
const seedArg = Number(process.argv.find(a => a.startsWith('--seed='))?.slice(7)) || null;
const days = Number(process.argv.find(a => a.startsWith('--days='))?.slice(7)) || 10;
const { createState, tick } = await import(pathToFileURL(path.join(root, 'src/sim.mjs')));
const { DAY } = await import(pathToFileURL(path.join(root, 'src/data.mjs')));
const rows = [];
for (const seed of seedArg ? [seedArg] : Array.from({ length: 12 }, (_, i) => 1001 + i)) {
  const starterArt = seed % 2 ? 'chunyangFist' : 'luohanHands';
  const partner = seed % 2 ? 'xiaolongnv' : 'huangrong';
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, hermitage: true, partner, starterArt });
  for (let t = 0; t < days * DAY; t += .25) { if (s.alert) s.alert = null; tick(s, .25); }
  rows.push({ seed, partner, starterArt, pendingFounding: !!s.choices?.some(c => c.sect === 'hermitageFounding'), foundedDay: s.hermitage?.foundedDay || null, doctrine: s.hermitage?.doctrine || null,
    sectId: s.sect?.id || null, partnerStage: s.hermitage?.stage || 0, exploredCliffs: s.hermitage?.exploredCliffs || [],
    graceUntil: s.econ?.graceUntil || null, rep: s.rep });
}
console.log(JSON.stringify({ days, dt: .25, alertPolicy: 'automatically acknowledge before next tick', scope: 'headless fixed schedule; player decisions are not supplied', rows }, null, 2));
