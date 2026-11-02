// loop39：人多分攤日課（預設勾選）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, quotaOf, shareOn, outers } from '../../src/sim.mjs';
import { QUOTA } from '../../src/data.mjs';
const sp = (x) => ({ kind: 'custom', answers: Array(9).fill(0), ...x });
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
test('全派 ≥ 外門×2 時，外門日課 −1（欠課照加）', () => {
  const s = createState(1, sp({ qshare: true })); const o = s.ds[0]; o.role = 'outer'; o.choreDebt = 2;
  for (const d of s.ds.slice(1)) d.role = 'inner'; while (s.ds.length < 2) s.ds.push({ ...s.ds[0], id: 'x' + s.ds.length, role: 'inner' });
  assert.ok(shareOn(s)); assert.equal(quotaOf(o, s), QUOTA.points - 1 + 2); assert.equal(quotaOf(o), QUOTA.points + 2);
});
