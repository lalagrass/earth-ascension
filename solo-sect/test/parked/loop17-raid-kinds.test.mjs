// Parked after T1 CI failure; original assertion(s) retained verbatim: loop17 夜襲不能付錢、敗了不傷人; tracked in #496.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../src/sim.mjs';
import { T, threatDaily, raidResolve, raidAuto, threatHtml } from '../../src/threat.mjs';
import { RAID_KINDS, pickKind } from '../../src/threat.mjs';

const sp = { kind: 'custom', name: '測', answers: Array(9).fill(0), peace: true };
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則

test('loop17 夜襲不能付錢、敗了不傷人', () => {
  const s = createState(1, sp); s.day = 30; s.res.coin = 500; threatDaily(s); const X = T(s);
  Object.assign(X.pending, { kind: 'yexi', noPay: true, p: 0 }); assert.equal(raidAuto(s), 1);
  assert.ok(!/付錢了事/.test(threatHtml(s)));
  const r = raidResolve(s, 0, null); assert.ok(!r.paid); assert.equal(r.win, false); assert.equal(r.hurt, null); assert.equal(X.hist.at(-1).kind, 'yexi');
});
