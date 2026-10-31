import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../src/sim.mjs';
import { T, threatDaily, raidResolve, threatStep } from '../../src/threat.mjs';
import { WAVE } from '../../src/threat.mjs';

const sp = { kind: 'custom', name: '測', answers: Array(9).fill(0), peace: true };
const win = (s, kind) => { s.day = 30; s.res.coin = 500; threatDaily(s); Object.assign(T(s).pending, { kind, p: 1, noPay: false }); return raidResolve(s, 1, null); };
test('loop18 悍匪被打退必來第二波：不談價、點數×k、hist 記 wave', () => {
  const s = createState(1, sp); const r = win(s, 'hanfei'); assert.equal(r.win, true); const X = T(s); assert.ok(X.wave);
  const pts = X.hist.at(-1).pts; assert.equal(X.wave.pts, Math.round(pts * WAVE.k));
  s.t = X.wave.at; threatStep(s, null); assert.ok(X.pending?.noPay); assert.equal(X.pending.wave, 2);
  X.pending.p = 1; raidResolve(s, 0, null); assert.equal(X.hist.at(-1).wave, 2); assert.equal(X.wave, null, '第二波後不再有第三波');
});
test('loop18 舊局不會有波次', () => { const s = createState(1); s.day = 30; s.res.coin = 500; s.ds.push(...s.ds.slice(0, 4).map((d, i) => ({ ...d, id: 'x' + i }))); const P = threatDaily(s); if (P) { P.p = 1; raidResolve(s, 1, null); } assert.equal(T(s).wave, undefined); });
