import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { RAID, minPopOf, points } from '../src/threat.mjs';

const sp = (o = {}) => ({ kind: 'custom', name: '測', answers: Array(9).fill(0), ...o });
test('loop12 預設門檻不變（8），江湖規則開時 4', () => {
  assert.equal(RAID.minPop, 8); assert.equal(minPopOf(createState(1)), 8); assert.equal(minPopOf(createState(1, sp({ peace: true }))), RAID.minPopRules);
  assert.ok(RAID.minPopRules <= createState(1, sp()).ds.length, '門檻須 ≤ 開局人數，否則前期看不到山賊');
});
test('loop12 開局 4 人：舊規則 0 點、新規則有點數', () => {
  const a = createState(1), b = createState(1, sp({ peace: true })); a.day = b.day = 8; assert.equal(points(a), 0); assert.ok(points(b) > 0);
});
test('loop12 開江湖規則跑到第 10 日內就有山賊上門', () => {
  const s = createState(2, sp({ peace: true })); for (let i = 0; i < 600 * 10 / 6; i++) tick(s, 6); assert.ok((s.threat?.n || 0) >= 1);
});
