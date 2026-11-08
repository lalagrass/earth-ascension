#!/usr/bin/env node
// R8（#526）：固定 12 種子、30 日；同一工具指定上一輪或本輪 checkout。
// 6 秒一拍、清警示與每日 bot 收徒是受控日程，不推論自然 0.25 秒可達性。
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const arg = (key, fallback) => { const flag = process.argv.find(x => x.startsWith(`--${key}=`)); return flag ? flag.split('=').slice(1).join('=') : fallback; };
const dir = path.resolve(arg('root', '.'));
const root = pathToFileURL(dir + '/').href;
const seedArg = arg('seed', '');
const seeds = seedArg === '' ? Array.from({ length: 12 }, (_, i) => 1001 + i) : [Number(seedArg)];
const days = Number(arg('days', '30'));
if (!seeds.every(Number.isSafeInteger) || !Number.isSafeInteger(days) || days < 1) throw Error('--seed 要整數，--days 要正整數');
const { createState, tick, foundHermitageSect } = await import(root + 'src/sim.mjs');
const { botDaily } = await import(root + 'test/harness/bot.mjs');
const { DAY } = await import(root + 'src/data.mjs');
const rows = [];
for (const seed of seeds) {
  const s = createState(seed, { kind: 'custom', opening: 'solo', askMajor: false });
  const founded = foundHermitageSect(s, 'single'); if (!founded.ok) throw Error(`seed ${seed}: ${founded.why}`);
  const openingN = s.ds.length;
  let day = s.day;
  for (let i = 0; i < days * DAY / 6; i++) {
    tick(s, 6); if (s.alert) s.alert = null;
    if (s.day !== day) { day = s.day; botDaily(s); }
  }
  const rumors = (s.rumors || []).filter(r => r.expires > s.day);
  const reach = [...new Set(rumors.flatMap(r => (r.heard || (r.arrived == null ? [] : [{ site: r.site }])).map(h => h.site)))];
  rows.push({ seed, newDisciples: s.ds.filter(d => d.role !== 'laborer').length - openingN,
    famousVisits: Object.keys(s.xia?.done || {}).length, activeRumors: rumors.length,
    totalRumors: s.rumorSerial || 0, reach, reachedSites: reach.length,
    raids: s.threat?.n || 0, raidHistory: (s.threat?.hist || []).length });
}
const sum = (key) => rows.reduce((n, r) => n + r[key], 0);
console.log(JSON.stringify({ days, tickSeconds: 6, seeds, total: { newDisciples: sum('newDisciples'), famousVisits: sum('famousVisits'), activeRumors: sum('activeRumors'), totalRumors: sum('totalRumors'), reachedSites: sum('reachedSites'), raids: sum('raids') }, rows }, null, 2));
