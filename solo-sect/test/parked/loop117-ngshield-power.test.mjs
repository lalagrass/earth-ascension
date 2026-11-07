// Parked after T1 CI failure; original assertion(s) retained verbatim: 內功越高，門派戰力與守柵出手越高; tracked in #496.
/* loop117 護體真氣：門派戰力、守柵出手、寨匪／剿寨重傷時護體 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { NG2, powBonus, dpsBonus, guardHurt, qiMax } from '../../src/arts.mjs';
import { power } from '../../src/jianghu.mjs';
import { defenderDps } from '../../src/threat.mjs';
import { createState } from '../../src/sim.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, neigong: true, ...x });
// #390 退役：釘住 v2.4 以前的內力／減傷／造詣公式；現行公式見 test/v31.test.mjs（loop197／198）

test('內功越高，門派戰力與守柵出手越高', () => {
  const s = createState(3, spec({ ngshield: true })); const p0 = power(s);
  for (const d of s.ds) d.arts.breath = { xp: 90 };
  assert.ok(power(s) > p0); const d = s.ds[0]; assert.ok(Math.abs(powBonus(d) - NG2.powK * qiMax(d)) < 1e-9);
  const b = defenderDps(d); d.ng2 = 0; assert.ok(defenderDps(d) < b);
});
