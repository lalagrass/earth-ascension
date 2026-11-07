#!/usr/bin/env node
// Phase 6 C 報告：正常 0.25 秒步長，警示自動按「知道了」；僅報數，不作常數校準。
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
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, hermitage: true, partner: seed % 2 ? 'xiaolongnv' : 'huangrong', starterArt });
  const hero = s.ds.find(x => x.id === 'hero'), heroCliffs = new Set();
  let firstHeartDay = null, firstStepDay = null;
  for (let t = 0; t < days * DAY; t += .25) {
    if (s.alert) s.alert = null; tick(s, .25);
    if (hero.at?.startsWith('cliff')) heroCliffs.add(hero.at);
    if (firstHeartDay === null && hero.arts?.[starterArt === 'luohanHands' ? 'shaolinXinfa' : 'quanzhenXinfa']) firstHeartDay = s.day;
    if (firstStepDay === null && hero.arts?.[starterArt === 'luohanHands' ? 'shaolinStep' : 'jinyanStep']) firstStepDay = s.day;
  }
  const d = s.ds.find(x => x.id === 'hero');
  rows.push({ seed, starterArt, outerXp: d.arts?.[starterArt]?.xp || 0, heart: !!d.arts?.[starterArt === 'luohanHands' ? 'shaolinXinfa' : 'quanzhenXinfa'],
    step: !!d.arts?.[starterArt === 'luohanHands' ? 'shaolinStep' : 'jinyanStep'], firstHeartDay, firstStepDay, strength: d.skills.strength, agility: d.skills.agility,
    heroCliffs: [...heroCliffs],
    exploredCliffs: s.hermitage?.exploredCliffs || [], herb: s.res.herb || 0, beeJelly: s.res.beeJelly || 0, coldWater: s.res.coldWater || 0 });
}
console.log(JSON.stringify({ days, dt: .25, alertPolicy: 'automatically acknowledge before next tick', scope: 'headless fixed schedule; player decisions are not supplied', rows }, null, 2));
