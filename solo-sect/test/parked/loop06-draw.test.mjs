// Parked after T1 CI failure; original assertion(s) retained verbatim: loop6 開啟後跑 5 天：無錯、有仰慕發生; tracked in #496.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, scoreActs } from '../../src/sim.mjs';
import { DRAW, isExtro, powOf, drawOf } from '../../src/social.mjs';

const run = (st, days) => { for (let i = 0; i < 240 * days; i++) tick(st, 6); return st; };
const sp = (o = {}) => ({ kind: 'custom', name: '測', answers: Array(9).fill(0), ...o });

// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則

test('loop6 開啟後跑 5 天：無錯、有仰慕發生', () => {
  let adm = 0;
  for (const seed of [1, 2, 3]) { const s = run(createState(seed, sp({ draw: true })), 5); adm += s.log.filter((l) => /心生仰慕/.test(l.msg)).length; }
  assert.ok(adm > 0, 'no admire');
});
