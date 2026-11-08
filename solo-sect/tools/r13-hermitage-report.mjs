#!/usr/bin/env node
// R4（#520）C：同種子三個情境各 30 日；受控 6 秒步長，每拍清 alert 以量出成長而非 UI 等待。
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(process.argv[2] || path.resolve(import.meta.dirname, '..'));
const { createState, tick } = await import(pathToFileURL(path.join(root, 'src/sim.mjs')));
const { DAY } = await import(pathToFileURL(path.join(root, 'src/data.mjs')));
const rows = [];
for (const opening of ['solo', 'xiaolongnv', 'huangrong']) {
  for (let seed = 1001; seed <= 1012; seed++) {
    const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, hermitage: true, opening });
    for (let elapsed = 0; elapsed < 30 * DAY; elapsed += 6) { tick(s, 6); if (s.alert) s.alert = null; }
    rows.push({ opening, seed, day: s.day, people: s.ds.map((d) => ({ id: d.id, mood: +d.mood.toFixed(2), arts: Object.fromEntries(Object.entries(d.arts || {}).map(([id, r]) => [id, +r.xp.toFixed(2)])) })) });
  }
}
const med = (values) => { const v = values.toSorted((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
const summary = Object.fromEntries(['solo', 'xiaolongnv', 'huangrong'].map((opening) => {
  const group = rows.filter((r) => r.opening === opening);
  return [opening, { heroMoodMedian: med(group.map((r) => r.people[0].mood)), heroArtCountMedian: med(group.map((r) => Object.keys(r.people[0].arts).length)), residentCountMedian: med(group.map((r) => r.people.length)), residentMoodMedian: opening === 'solo' ? null : med(group.map((r) => r.people[1].mood)), residentArtCountMedian: opening === 'solo' ? null : med(group.map((r) => Object.keys(r.people[1].arts).length)) }];
}));
console.log(JSON.stringify({ days: 30, secondsPerTick: 6, alertPolicy: 'clear after each tick', scope: 'controlled C observation; not a natural 0.25-second reachability claim', summary, rows }, null, 2));
