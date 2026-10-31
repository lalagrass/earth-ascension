import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../src/sim.mjs';
import { T, threatDaily, raidResolve, raidAuto, threatHtml } from '../../src/threat.mjs';
import { RAID_KINDS, pickKind } from '../../src/threat.mjs';

const sp = { kind: 'custom', name: '測', answers: Array(9).fill(0), peace: true };
test('loop17 類型權重合計 1、期望點數≈原值、抽類型覆蓋三種', () => {
  const ks = Object.values(RAID_KINDS); assert.ok(Math.abs(ks.reduce((a, k) => a + k.w, 0) - 1) < 1e-9);
  const ev = ks.reduce((a, k) => a + k.w * k.pts, 0); assert.ok(ev > 0.9 && ev <= 1);
  assert.deepEqual(new Set([0.1, 0.6, 0.9].map(pickKind)), new Set(['liukou', 'hanfei', 'yexi']));
});
test('loop17 舊局無類型；江湖規則局有類型', () => {
  const a = createState(1); a.day = 30; a.res.coin = 500; a.ds.push(...a.ds.slice(0, 4).map((d, i) => ({ ...d, id: 'x' + i })));
  const P = threatDaily(a); if (P) assert.equal(P.kind, undefined);
  const b = createState(1, sp); b.day = 30; b.res.coin = 500; const Q = threatDaily(b); assert.ok(Q && RAID_KINDS[Q.kind]);
});
test('loop17 夜襲不能付錢、敗了不傷人', () => {
  const s = createState(1, sp); s.day = 30; s.res.coin = 500; threatDaily(s); const X = T(s);
  Object.assign(X.pending, { kind: 'yexi', noPay: true, p: 0 }); assert.equal(raidAuto(s), 1);
  assert.ok(!/付錢了事/.test(threatHtml(s)));
  const r = raidResolve(s, 0, null); assert.ok(!r.paid); assert.equal(r.win, false); assert.equal(r.hurt, null); assert.equal(X.hist.at(-1).kind, 'yexi');
});
