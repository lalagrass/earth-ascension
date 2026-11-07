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
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
