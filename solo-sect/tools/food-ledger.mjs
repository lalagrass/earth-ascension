// N57：用原 resAdd 帳本重播逐日糧食流，不建立平行庫存。
// node tools/food-ledger.mjs [solo-sect 目錄] --seed=1001 --days=30 --json
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : here;
const root = pathToFileURL(folder).href;
const option = (name, fallback) => Number(process.argv.find((x) => x.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
const seed = option('seed', 1001), days = option('days', 30);
const { createState, tick } = await import(root + '/src/sim.mjs');
const { DAY, COMPANIONS, RECRUIT } = await import(root + '/src/data.mjs');
const { ALL_ON, botDaily } = await import(root + '/test/harness/bot.mjs');
const { sectOfSeed } = await import(root + '/test/golden/scenarios.mjs');
const dailyRations = existsSync(path.join(folder, 'src/admission.mjs')) ? (await import(root + '/src/admission.mjs')).dailyRations : null;
const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, v22: true, ...(sectOfSeed(seed) ? { sect24: sectOfSeed(seed) } : {}) });
let opening = s.res.food, lastDay = s.day;
const rows = [];
for (let i = 0; i < days * DAY / 6; i++) {
  for (let j = 0; j < 24; j++) { tick(s, .25); if (s.alert) s.alert = null; }
  if (s.day === lastDay) continue;
  const ledger = s.ledgerPrev, current = s.ledger;
  const closing = s.res.food - (current.in.food || 0) + (current.out.food || 0);
  const incoming = ledger.in.food || 0, outgoing = ledger.out.food || 0;
  const delta = closing - opening, balance = delta - incoming + outgoing;
  const residents = s.ds.length, famous = s.ds.filter((d) => d.id !== 'hero' && (d.xia || COMPANIONS[d.id])).length;
  const sources = ledger.foodBySource || null;
  const sourceError = sources ? Math.max(...['in', 'out'].map((dir) => Math.abs(Object.values(sources[dir]).reduce((n, v) => n + v, 0) - (ledger[dir].food || 0)))) : null;
  rows.push({ day: lastDay, opening, incoming, outgoing, closing, delta, balance, sources, sourceError, residents, famous, nextCandidateFoodNeed: dailyRations ? (residents + 1) * dailyRations(s) : RECRUIT.food, raidCount: s.threat?.hist?.length || 0 });
  opening = closing; lastDay = s.day; botDaily(s);
}
const total = (key) => rows.reduce((n, row) => n + row[key], 0);
const result = { seed, days, rules: s.rules, initial: rows[0]?.opening, final: rows.at(-1)?.closing, incoming: total('incoming'), outgoing: total('outgoing'), balanceError: Math.max(0, ...rows.map((r) => Math.abs(r.balance))), sourceError: Math.max(0, ...rows.map((r) => r.sourceError || 0)), day10: rows[9], day30: rows[29], rows };
if (process.argv.includes('--json')) console.log(JSON.stringify(result));
else { console.log(`seed ${seed}：糧 ${result.initial} → ${result.final}；入 ${result.incoming}、出 ${result.outgoing}；帳本最大誤差 ${result.balanceError}`); for (const r of rows) console.log(`${r.day}: ${r.opening} + ${r.incoming} - ${r.outgoing} = ${r.closing}，人 ${r.residents}（名俠 ${r.famous}）`); }
if (result.balanceError > 1e-9 || result.sourceError > 1e-9) process.exitCode = 1;
