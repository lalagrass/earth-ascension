import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../src/sim.mjs';
import { T, threatDaily, raidResolve, threatStep } from '../../src/threat.mjs';
import { WAVE } from '../../src/threat.mjs';

const sp = { kind: 'custom', name: '測', answers: Array(9).fill(0), peace: true };
const win = (s, kind) => { s.day = 30; s.res.coin = 500; threatDaily(s); Object.assign(T(s).pending, { kind, p: 1, noPay: false }); return raidResolve(s, 1, null); };
test('loop18 舊局不會有波次', () => { const s = createState(1); s.day = 30; s.res.coin = 500; s.ds.push(...s.ds.slice(0, 4).map((d, i) => ({ ...d, id: 'x' + i }))); const P = threatDaily(s); if (P) { P.p = 1; raidResolve(s, 1, null); } assert.equal(T(s).wave, undefined); });
