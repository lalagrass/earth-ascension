/* loop121 十重質變：圓滿十重或化境的內功 →「真氣綿長」：內力打空不力竭；不加內力、不加減傷 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { tenthOf, shieldHit, qiMax, mitOf } from '../../src/arts.mjs';
import { qiStatus } from '../../src/panel-ui.mjs';
const mk = (xp, pf = 1, extra = {}) => ({ arts: { breath: { xp, bt1: xp >= 55, bt2: xp >= 100 } }, ng: 1, ng2: 1, pf, qi: 5, ...extra });
test('圓滿九重不算、圓滿十重算（需熟練度）、化境算', () => {
  assert.equal(tenthOf(mk(97)), false); assert.equal(tenthOf(mk(99)), true); assert.equal(tenthOf(mk(99, 0)), false); assert.equal(tenthOf(mk(100, 0)), true);
  assert.equal(tenthOf({ arts: { pushPalm: { xp: 100, bt1: true, bt2: true } }, ng: 1, ng2: 1 }), false);
});
// #390 退役：釘住 v2.4 以前的內力／減傷／造詣公式；現行公式見 test/v31.test.mjs（loop197／198）
