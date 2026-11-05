// 量測：bot 情境 12 種子（1001–1012），第 30 日。
// node tools/bot12.mjs [solo-sect 目錄] [--json]
// 分段一律用「本目錄（head）」的 fanRank，讓 base 與 head 以同一把尺分組。
// --fan=N 覆寫扇形基準（只供 tools/calib-fan.mjs 掃描；遊戲程式本身不讀環境變數）。
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = pathToFileURL(path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : here)).href;
const json = process.argv.includes('--json');
const fanArg = +(process.argv.find((x) => x.startsWith('--fan=')) || '').slice(6);
const { createState, tick, dpsOf, startHunt, clone, resolveRaid } = await import(root + '/src/sim.mjs');
const { DAY, ECO } = await import(root + '/src/data.mjs');
const { ALL_ON, botDaily } = await import(root + '/test/harness/bot.mjs');
const { sectOfSeed } = await import(root + '/test/golden/scenarios.mjs');
const A = await import(root + '/src/arts.mjs');
const T = await import(root + '/src/threat.mjs');
if (fanArg > 0) { const AC = await import(root + '/src/artcard.mjs'); const D = await import(root + '/src/data.mjs'); if (!AC.setFanBase) throw new Error('此目錄的 artcard 沒有 setFanBase'); AC.setFanBase(fanArg, D.ARTS); }
const { fanRank } = await import(pathToFileURL(here).href + '/src/artcard.mjs');
const med = (v) => { v = [...v].sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : NaN; };
/* 第四輪護欄（#418、#419）：第 10／20／30 日各複製一份局面，派戰力前三上「山頂守點」打一輪狩獵（遊戲步長 0.25），
   獸數補滿以免各局山中存量不同；記擊退、溜走、重傷（氣血 ≤25）。原局不受影響。 */
const HUNT = { kills: [], escaped: [], hurt: [], witch: [], breaks: [] };
function huntProbe(s0) { huntRun(s0, false, HUNT); huntRun(s0, true, HUNT1); }
/* 單人探針：戰力最弱的一位獨守，讓溜走、重傷、失血有變化可比（三人隊常全殲無傷）。 */
const HUNT1 = { kills: [], escaped: [], hurt: [], hpLost: [], witch: [], breaks: [] };
function huntRun(s0, solo, OUT) {
  const s = clone(s0); s.eco.rat.n = ECO.rat.max; s.eco.boar.n = ECO.boar.max; s.alert = null; s.post = 'guard';
  const team = s.ds.filter((d) => d.role !== 'laborer' && !d.away && d.hp > 30).sort((a, b) => dpsOf(s, b) - dpsOf(s, a) || (a.id < b.id ? -1 : 1));
  if (solo) team.splice(0, team.length - 1); else team.splice(3);
  if (!team.length || !startHunt(s, team.map((d) => d.id))) return;
  const hp0 = team.map((d) => d.hp); const t0 = s.t; let h = s.hunt; while (s.hunt && s.t - t0 < 900) { h = s.hunt; tick(s, 0.25); if (s.alert) s.alert = null; }
  OUT.kills.push(h.kills); OUT.escaped.push(h.escaped); OUT.hurt.push(team.filter((d) => (s.ds.find((x) => x.id === d.id)?.hp ?? 100) <= 25).length); (OUT.hpLost ??= []).push(team.reduce((a, d, i) => a + Math.max(0, hp0[i] - (s.ds.find((x) => x.id === d.id)?.hp ?? 0)), 0)); OUT.witch.push((s.witchN || 0) - (s0.witchN || 0)); OUT.breaks.push((s.breakN || 0) - (s0.breakN || 0));
}
/* 山賊上地圖（#419）：bot 局多半沒立柵，所以第 9 日起每 3 日各複製一份，立滿耐久的木柵、送一夥照當下威脅點數的山賊來，
   選迎戰，用遊戲步長 0.25 打到分出勝負（上限 600 秒）。勝算＝柵未破就打退記 1，柵破則記 winP(剩餘山賊戰力)；另記重傷人次。 */
const BANDP = { odds: [], winP: [], won: 0, n: 0, hurt: 0, fenceHeld: 0, witch: [], breaks: [] };
function bandProbe(s0) {
  const s = clone(s0); s.alert = null; const X = T.T(s); if (X.pending || s.band) { X.pending = null; s.band = null; }
  s.fence = { lv: 1, hp: 60, max: 60, hits: 0, broken: 0, repaired: 0, blocked: 0 };
  const pts = Math.max(1, Math.round(T.points(s))), predicted = T.winP(s, pts); X.pending = { n: X.n + 1, pts, demand: 0, p: predicted, at: s.t, until: s.t + 9999, day: s.day, noPay: true };
  const h0 = X.homeHurt, n0 = (X.hist || []).length; resolveRaid(s, 1); let odds = null; const t0 = s.t;
  while (s.band && s.t - t0 < 600) { const b = s.band; tick(s, 0.25); if (s.alert) s.alert = null; if (!s.band) odds = b.hp <= 0 ? 1 : T.winP(s, Math.max(1, b.hp)); }
  const r = (X.hist || [])[n0]; if (!r) return;
  BANDP.n++; if (r.fight === 'win') BANDP.won++; if (!r.broke) BANDP.fenceHeld++; BANDP.hurt += X.homeHurt - h0; BANDP.odds.push(odds ?? (r.fight === 'win' ? 1 : 0)); BANDP.winP.push(predicted); BANDP.witch.push((s.witchN || 0) - (s0.witchN || 0)); BANDP.breaks.push((s.breakN || 0) - (s0.breakN || 0));
}
const RAIDS = { n: 0, fights: 0, won: 0, hurt: 0, map: 0 };
const out0 = {}; const pts = [], wp = [], by = {}, famousBy = { yes: [], no: [] }, held = [];
const { ARTS } = await import(pathToFileURL(here).href + '/src/data.mjs');
const FAMOUS = new Set(ARTS.filter((a) => a.secret && a.classic && !a.derived).map((a) => a.id));
for (let seed = 1001; seed <= 1012; seed++) {
  const sect = sectOfSeed(seed);
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, v22: true, ...(sect ? { sect24: sect } : {}) });
  let dayB = s.day; const P = [];
  for (let i = 1; i <= 30 * DAY / 6; i++) { if (s.band) for (let j = 0; j < 24; j++) tick(s, 0.25); else tick(s, 6); if (s.alert) s.alert = null; if (s.day !== dayB) { dayB = s.day; botDaily(s); P.push(T.points(s)); if (s.day === 4 || s.day === 11 || s.day === 21) huntProbe(s); if (s.day >= 9 && s.day % 3 === 0) bandProbe(s); } }
  huntProbe(s);
  for (const r of T.T(s).hist || []) { RAIDS.n++; if (r.fight) { RAIDS.fights++; if (r.fight === 'win') RAIDS.won++; if (r.map) RAIDS.map++; } if (r.hurt) RAIDS.hurt++; }
  const p = med(P.slice(-10)); const bd = T.threatBreakdown ? T.threatBreakdown(s) : null; (out0.cShare ??= []).push(bd ? bd.cPct : 0);
  pts.push(p); wp.push(T.winP(s, T.points(s)));
  let n = 0;
  for (const d of s.ds) { for (const id of Object.keys(d.arts || {})) if (FAMOUS.has(id)) n++; }
  held.push(n);
  (n > 0 ? famousBy.yes : famousBy.no).push(p);
  for (const d of s.ds) { if (d.role === 'laborer') continue; const a = A.mainOuter28(d); const k = a ? fanRank(a.id).fanTier : 'none'; (by[k] ??= []).push(dpsOf(s, d)); }
}
const sum = (v) => v.reduce((a, b) => a + b, 0);
const out = { solo: { probes: HUNT1.kills.length, kills: sum(HUNT1.kills), escaped: sum(HUNT1.escaped), hurt: sum(HUNT1.hurt), hpLost: Math.round(sum(HUNT1.hpLost)) }, band: { n: BANDP.n, oddsMed: +med(BANDP.odds).toFixed(3), winPMed: +med(BANDP.winP).toFixed(3), won: BANDP.won, fenceHeld: BANDP.fenceHeld, hurt: BANDP.hurt, hurtPerRaid: BANDP.n ? +(BANDP.hurt / BANDP.n).toFixed(3) : 0 }, witch: sum(HUNT.witch) + sum(HUNT1.witch) + sum(BANDP.witch), breaks: sum(HUNT.breaks) + sum(HUNT1.breaks) + sum(BANDP.breaks), hunt: { probes: HUNT.kills.length, kills: sum(HUNT.kills), escaped: sum(HUNT.escaped), hurt: sum(HUNT.hurt) }, raids: { ...RAIDS, hurtPerRaid: RAIDS.n ? +(RAIDS.hurt / RAIDS.n).toFixed(3) : 0 }, cShareMed: med(out0.cShare), threat: med(pts), winP: +med(wp).toFixed(3), famousHeld: med(held), threatNoFamous: med(famousBy.no), threatFamous: med(famousBy.yes), nNoFamous: famousBy.no.length, tiers: {} };
for (const [k, v] of Object.entries(by)) out.tiers[k] = { n: v.length, dps: +med(v).toFixed(1) };
if (json) console.log(JSON.stringify(out));
else { console.log('band', JSON.stringify(out.band)); console.log('solo', JSON.stringify(out.solo)); console.log('hunt', JSON.stringify(out.hunt), 'raids', JSON.stringify(out.raids)); console.log('threat', out.threat, 'winP', out.winP.toFixed(2), 'famousHeld', out.famousHeld); for (const [k, v] of Object.entries(out.tiers)) console.log(k, v.n, v.dps); }
