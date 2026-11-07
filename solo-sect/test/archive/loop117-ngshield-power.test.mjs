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
// #390 退役：釘住 v2.4 以前的內力／減傷／造詣公式；現行公式見 test/v31.test.mjs（loop197／198）
