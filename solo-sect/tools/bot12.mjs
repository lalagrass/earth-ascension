// 量測：bot 情境 12 種子（1001–1012），第 30 日。
// node tools/bot12.mjs [solo-sect 目錄] [--json]
// 分段一律用「本目錄（head）」的 fanRank，讓 base 與 head 以同一把尺分組。
// 可用環境變數 SS_FAN_BASE 覆寫扇形基準（只供 tools/calib-fan.mjs 掃描）。
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = pathToFileURL(path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : here)).href;
const json = process.argv.includes('--json');
const { createState, tick, dpsOf } = await import(root + '/src/sim.mjs');
const { DAY } = await import(root + '/src/data.mjs');
const { ALL_ON, botDaily } = await import(root + '/test/harness/bot.mjs');
const { sectOfSeed } = await import(root + '/test/golden/scenarios.mjs');
const A = await import(root + '/src/arts.mjs');
const T = await import(root + '/src/threat.mjs');
const { fanRank } = await import(pathToFileURL(here).href + '/src/artcard.mjs');
const med = (v) => { v = [...v].sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : NaN; };
const out0 = {}; const pts = [], wp = [], by = {}, famousBy = { yes: [], no: [] }, held = [];
const { ARTS } = await import(pathToFileURL(here).href + '/src/data.mjs');
const FAMOUS = new Set(ARTS.filter((a) => a.secret && a.classic && !a.derived).map((a) => a.id));
for (let seed = 1001; seed <= 1012; seed++) {
  const sect = sectOfSeed(seed);
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, v22: true, ...(sect ? { sect24: sect } : {}) });
  let dayB = s.day; const P = [];
  for (let i = 1; i <= 30 * DAY / 6; i++) { tick(s, 6); if (s.alert) s.alert = null; if (s.day !== dayB) { dayB = s.day; botDaily(s); P.push(T.points(s)); } }
  const p = med(P.slice(-10)); const bd = T.threatBreakdown ? T.threatBreakdown(s) : null; (out0.cShare ??= []).push(bd ? bd.cPct : 0);
  pts.push(p); wp.push(T.winP(s, T.points(s)));
  let n = 0;
  for (const d of s.ds) { for (const id of Object.keys(d.arts || {})) if (FAMOUS.has(id)) n++; }
  held.push(n);
  (n > 0 ? famousBy.yes : famousBy.no).push(p);
  for (const d of s.ds) { if (d.role === 'laborer') continue; const a = A.mainOuter28(d); const k = a ? fanRank(a.id).fanTier : 'none'; (by[k] ??= []).push(dpsOf(s, d)); }
}
const out = { cShareMed: med(out0.cShare), threat: med(pts), winP: +med(wp).toFixed(3), famousHeld: med(held), threatNoFamous: med(famousBy.no), threatFamous: med(famousBy.yes), nNoFamous: famousBy.no.length, tiers: {} };
for (const [k, v] of Object.entries(by)) out.tiers[k] = { n: v.length, dps: +med(v).toFixed(1) };
if (json) console.log(JSON.stringify(out));
else { console.log('threat', out.threat, 'winP', out.winP.toFixed(2), 'famousHeld', out.famousHeld); for (const [k, v] of Object.entries(out.tiers)) console.log(k, v.n, v.dps); }
