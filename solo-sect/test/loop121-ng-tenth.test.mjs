/* loop121 十重質變：圓滿十重或化境的內功 →「真氣綿長」：內力打空不力竭；不加內力、不加減傷 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { tenthOf, shieldHit, qiMax, mitOf } from '../src/arts.mjs';
import { qiStatus } from '../src/panel-ui.mjs';
const mk = (xp, pf = 1, extra = {}) => ({ arts: { breath: { xp, bt1: xp >= 55, bt2: xp >= 100 } }, ng: 1, ng2: 1, pf, qi: 5, ...extra });
test('圓滿九重不算、圓滿十重算（需熟練度）、化境算', () => {
  assert.equal(tenthOf(mk(97)), false); assert.equal(tenthOf(mk(99)), true); assert.equal(tenthOf(mk(99, 0)), false); assert.equal(tenthOf(mk(100, 0)), true);
  assert.equal(tenthOf({ arts: { pushPalm: { xp: 100, bt1: true, bt2: true } }, ng: 1, ng2: 1 }), false);
});
test('打空不力竭；上限與減傷和圓滿九重相同（不重複加）', () => {
  const a = mk(99), b = mk(97); assert.equal(qiMax(a), qiMax(b)); assert.equal(mitOf(a), mitOf(b));
  shieldHit(a, 50, 0); assert.equal(a.qi, 0); assert.ok(!((a.spentUntil ?? -1) > 0));
  shieldHit(b, 50, 0); assert.ok(b.spentUntil > 0);
  assert.match(qiStatus(a), /真氣綿長/); assert.doesNotMatch(qiStatus(b), /真氣綿長/);
});
