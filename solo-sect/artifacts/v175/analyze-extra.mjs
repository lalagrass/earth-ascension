// v1.75 新系統彙整：extra-dao-on / extra-dao-off
import fs from 'node:fs';
const on = JSON.parse(fs.readFileSync('artifacts/v175/extra-dao-on.json')).cases, off = JSON.parse(fs.readFileSync('artifacts/v175/extra-dao-off.json')).cases;
const mean = (xs) => +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2), rng = (xs) => `${Math.min(...xs)}–${Math.max(...xs)}`;
const ops = [...new Set(on.map((c) => c.opening))]; const out = { perOpening: {}, all: {}, dao: {}, pop: {} };
for (const op of ops) { const X = on.filter((c) => c.opening === op);
  out.perOpening[op] = { brew: rng(X.map((c) => c.acts.brew || 0)), pillMade: rng(X.map((c) => c.pillMade)), pillUsed: rng(X.map((c) => c.pillUsed)), pass: rng(X.map((c) => c.final.pass)), masters: rng(X.map((c) => c.final.masters)), waterMade: rng(X.map((c) => c.waterMade)), waterUsed: rng(X.map((c) => c.waterUsed)), minHp: rng(X.map((c) => Math.round(c.minHp))), raidHurt: rng(X.map((c) => Math.round(c.raidHurt))) }; }
const acts = {}; for (const c of on) for (const [k, v] of Object.entries(c.acts)) acts[k] = (acts[k] || 0) + v; out.all.actsTotal = Object.fromEntries(Object.entries(acts).sort((a, b) => b[1] - a[1]));
out.all.passCases = on.filter((c) => c.final.pass > 0).length; out.all.passTotal = on.reduce((a, c) => a + c.final.pass, 0); out.all.brewCases = on.filter((c) => (c.acts.brew || 0) > 0).length;
out.all.masterCases = on.filter((c) => c.final.masters > 0).length; out.all.pillEnd = rng(on.map((c) => c.final.pill)); out.all.waterEnd = rng(on.map((c) => c.final.water)); out.all.okOn = on.filter((c) => c.ok).length; out.all.okOff = off.filter((c) => c.ok).length;
const k = (c) => c.seed + '|' + c.opening; const offM = new Map(off.map((c) => [k(c), c]));
const diffs = on.map((c) => { const o = offM.get(k(c)); return { case: k(c), best: c.final.best - o.final.best, expN: c.final.expN - o.final.expN, rep: +(c.final.rep - o.final.rep).toFixed(1), minHp: Math.round(c.minHp - o.minHp), kills: Object.values(c.final.codex).reduce((a, b) => a + b, 0) - Object.values(o.final.codex).reduce((a, b) => a + b, 0) }; });
out.dao = { identical: diffs.filter((d) => !d.best && !d.expN && !d.rep && !d.kills).length, meanBest: mean(diffs.map((d) => d.best)), meanKills: mean(diffs.map((d) => d.kills)), meanRep: mean(diffs.map((d) => d.rep)), bestUp: diffs.filter((d) => d.best > 0).length, bestDown: diffs.filter((d) => d.best < 0).length, diffs };
const pk = Object.keys(on[0].pop.at(-1)).filter((x) => x !== 'day'); for (const p of pk) out.pop[p] = { d0: rng(on.map((c) => c.pop[0][p] ?? 0)), d15: rng(on.map((c) => c.pop[15]?.[p] ?? 0)), d29: rng(on.map((c) => c.pop.at(-1)[p] ?? 0)), zeroCases: on.filter((c) => c.pop.some((x) => (x[p] ?? 1) === 0)).length };
fs.writeFileSync('artifacts/v175/extra-summary.json', JSON.stringify(out, null, 1)); const { diffs: _, ...dao } = out.dao; console.log(JSON.stringify({ ...out, dao }, null, 1));
