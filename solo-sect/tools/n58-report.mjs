// N58 C report: same 0.25-second simulation for a base or head worktree.
// node tools/n58-report.mjs [solo-sect-directory] [--seed=1001] [--json]
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = pathToFileURL(path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : here)).href;
const arg = process.argv.find((x) => x.startsWith('--seed='));
const seeds = arg ? [Number(arg.slice(7))] : Array.from({ length: 12 }, (_, i) => 1001 + i);
const { createState, tick } = await import(root + '/src/sim.mjs');
const { DAY } = await import(root + '/src/data.mjs');
const { ALL_ON, botDaily } = await import(root + '/test/harness/bot.mjs');
const rows = [];
for (const seed of seeds) {
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, v22: true });
  const count = () => ({ people: s.ds.filter((d) => d.role !== 'laborer').length, youngHeroes: s.ds.filter((d) => d.youngHero).length, workDepartures: s.recruitment?.departures || 0 });
  let day = s.day, day10 = null, day30 = null;
  for (let i = 0; i < 30 * DAY / 0.25; i++) {
    tick(s, 0.25); if (s.alert) s.alert = null;
    if (s.day !== day) { day = s.day; if (day === 11) day10 = count(); if (day === 31) day30 = count(); botDaily(s); }
  }
  rows.push({ seed, day10, day30 });
}
const median = (xs) => { const a = xs.slice().sort((x, y) => x - y); return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; };
const out = { stepSeconds: 0.25, seeds, day10: {}, day30: {}, rows };
for (const day of ['day10', 'day30']) for (const k of ['people', 'youngHeroes', 'workDepartures']) out[day][k] = median(rows.map((r) => r[day][k]));
process.stdout.write(JSON.stringify(out, null, process.argv.includes('--json') ? 2 : 0) + '\n');
