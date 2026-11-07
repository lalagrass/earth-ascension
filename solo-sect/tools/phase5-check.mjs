#!/usr/bin/env node
// Phase 5 C 報告：同一組種子與 5 日固定步長，純觀察、不以此比例調整規則。
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(process.argv.slice(2).find(a => !a.startsWith('--')) || path.resolve(import.meta.dirname, '..'));
const chosenSeed = Number(process.argv.find(a => a.startsWith('--seed='))?.slice(7)) || null;
const { createState, tick } = await import(pathToFileURL(path.join(root, 'src/sim.mjs')));
const { DAY } = await import(pathToFileURL(path.join(root, 'src/data.mjs')));
const rows = [];
for (const seed of chosenSeed ? [chosenSeed] : Array.from({ length: 12 }, (_, i) => 1001 + i)) {
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, hermitage: true, partner: seed % 2 ? 'xiaolongnv' : 'huangrong', starterArt: seed % 2 ? 'chunyangFist' : 'luohanHands' });
  for (let t = 0; t < 5 * DAY; t += 6) { tick(s, 6); if (s.alert) s.alert = null; }
  rows.push({ seed, partner: s.hermitage.partnerId, herb: s.res.herb || 0, medFood: s.res.medFood || 0,
    people: s.ds.map(d => ({ id: d.id, strength: d.skills.strength, agility: d.skills.agility, fatigue: d.muscleFatigue ?? null, cycles: d.maxCyclesToday ?? null, buff: !!(d.herbalDietUntil > s.t) })) });
}
console.log(JSON.stringify({ days: 5, dt: 6, rows }, null, 2));
