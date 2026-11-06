// 和 Canvas 共用候選文字、框與碰撞規則；純讀取，不改模擬。
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createState, tick, phaseOf } from '../src/sim.mjs';
import { ALL_ON, botDaily } from '../test/harness/bot.mjs';
import { homeLabelCandidates, layoutLabels, boxesOverlap } from '../src/label-layout.mjs';
const args = process.argv.slice(2), arg = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
const seed = Number(arg('--seed', 1)), day = Number(arg('--day', 10)), phase = arg('--phase', 'dawn');
if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(day) || day < 1 || !['dawn','day','dusk','night'].includes(phase)) throw Error('用法：--seed 整數 --day 正整數 --phase dawn|day|dusk|night');
const s = createState(seed, { kind: 'template', id: 'guojing', askMajor: false, ...ALL_ON });
let previousDay = s.day, snapshot, most = -1;
while (s.day <= day) {
  if (s.day === day && phaseOf(s).id === phase) {
    const n = s.ds.filter((d) => d.task?.act === 'train' && d.task.phase === 'do').length;
    if (n > most) { most = n; snapshot = structuredClone(s); }
  }
  tick(s, 0.5); if (s.alert) s.alert = null;
  if (s.day !== previousDay) { previousDay = s.day; botDaily(s); }
}
if (!snapshot) throw Error('找不到指定時段');
const result = layoutLabels(homeLabelCandidates(snapshot));
let overlaps = 0; for (let i = 0; i < result.shown.length; i++) for (let j = i + 1; j < result.shown.length; j++) if (boxesOverlap(result.shown[i].box, result.shown[j].box)) overlaps++;
const heroShown = result.shown.some((l) => l.id === 'hero');
const hiddenActors = result.hidden.filter((l) => snapshot.ds.some((d) => d.id === l.id));
const revealChecks = hiddenActors.every((l) => layoutLabels(homeLabelCandidates(snapshot, { selected: l.id })).shown.some((p) => p.id === l.id));
console.log(JSON.stringify({ seed, day: snapshot.day, phase, ...result, overlaps, heroShown, revealChecks }, null, 2));
if (overlaps || !heroShown || !revealChecks) process.exitCode = 1;

const out = arg('--blind-out', null);
if (out) {
  fs.mkdirSync(out, { recursive: true });
  const candidates = homeLabelCandidates(snapshot), swap = createHash('sha256').update(String(seed)).digest()[0] % 2;
  const esc = (v) => String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const svg = (rows) => `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#f3ead7"/>${snapshot.ds.filter((d) => !d.away).map((d) => `<circle cx="${d.pos[0]}" cy="${d.pos[1]-20}" r="12" fill="#6b4a2a"/>`).join('')}${rows.map((l) => `<text x="${l.x}" y="${l.y}" text-anchor="middle" font-size="13" font-family="sans-serif" stroke="#fff" stroke-width="4" paint-order="stroke">${esc(l.text)}</text>`).join('')}</svg>`;
  const variants = swap ? [result.shown, candidates] : [candidates, result.shown];
  for (const [i, rows] of variants.entries()) fs.writeFileSync(path.join(out, `${i ? 'B' : 'A'}.svg`), svg(rows));
  fs.writeFileSync(path.join(out, 'answers.json'), JSON.stringify({ collisionManaged: swap ? 'A' : 'B', seed, day, phase, note: '同一事件快照、相同文字與位置；僅比較有無碰撞過濾。標籤示意不是遊戲實拍。' }, null, 2));
}
