/* loop117 護體真氣：門派戰力、守柵出手、寨匪／剿寨重傷時護體 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { NG2, powBonus, dpsBonus, guardHurt, qiMax } from '../../src/arts.mjs';
import { power } from '../../src/jianghu.mjs';
import { defenderDps } from '../../src/threat.mjs';
import { createState } from '../../src/sim.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, neigong: true, ...x });
test('沒學內功或沒開二版時沒有加成', () => {
  assert.equal(powBonus({ arts: {}, ng2: 1 }), 0); assert.equal(powBonus({ arts: { breath: { xp: 90 } }, ng: 1 }), 0); assert.equal(dpsBonus({ arts: { breath: { xp: 90 } } }), 0);
});
test('內功越高，門派戰力與守柵出手越高', () => {
  const s = createState(3, spec({ ngshield: true })); const p0 = power(s);
  for (const d of s.ds) d.arts.breath = { xp: 90 };
  assert.ok(power(s) > p0); const d = s.ds[0]; assert.ok(Math.abs(powBonus(d) - NG2.powK * qiMax(d)) < 1e-9);
  const b = defenderDps(d); d.ng2 = 0; assert.ok(defenderDps(d) < b);
});
test('重傷護體：內力夠才擋，並扣內力', () => {
  const d = { arts: { breath: { xp: 30 } }, ng: 1, ng2: 1, qi: 25 };
  assert.equal(guardHurt(d, 15), NG2.guardHp); assert.equal(d.qi, 25 - NG2.guard);
  assert.equal(guardHurt(d, 15), 15); assert.equal(d.qi, 25 - NG2.guard);
  assert.equal(guardHurt({ arts: { breath: { xp: 30 } }, ng: 1, qi: 25 }, 15), 15);
});
