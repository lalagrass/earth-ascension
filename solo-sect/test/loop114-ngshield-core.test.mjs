import test from 'node:test';
import assert from 'node:assert/strict';
import { NG2, qiMax, qiMax2, mitOf, shieldHit, qiOf } from '../src/arts.mjs';
const mk = (arts, extra = {}) => ({ arts, ng: 1, ng2: 1, qi: 0, ...extra });
test('二版：沒有內功時內力上限 0、沒有減傷', () => {
  const d = mk({ fist: { xp: 50 } });
  assert.equal(qiMax2(d), 0); assert.equal(qiMax(d), 0); assert.equal(mitOf(d), 0);
  assert.equal(shieldHit(d, 10), 10);
});
test('二版：上限隨階成長，入門遠小於圓滿；沒有一版（loop142）', () => {
  const lo = mk({ breath: { xp: 0 } }), hi = mk({ breath: { xp: 90 } });
  assert.equal(qiMax(lo), NG2.cap[0]); assert.equal(qiMax(hi), NG2.cap[3]);
  assert.ok(mitOf(hi) > mitOf(lo));
  assert.equal(qiMax({ arts: { breath: { xp: 0 } }, ng: 1 }), NG2.cap[0]);
});
test('二版：先減傷再由內力吸收，打空進力竭並加重', () => {
  const d = mk({ breath: { xp: 90 } }, { qi: 10 });
  const left = shieldHit(d, 20, 0);
  assert.equal(qiOf(d), 0);
  assert.ok(Math.abs(left - (20 * (1 - NG2.mit[3]) - 10)) < 1e-9);
  assert.ok(d.spentUntil > 0);
  assert.ok(Math.abs(shieldHit(d, 10, 1) - 10 * NG2.spentMul) < 1e-9);
  assert.equal(shieldHit(d, 10, NG2.spentT + 1), 10);
});
test('二版：內力夠時不扣生命；未開二版原樣', () => {
  const d = mk({ breath: { xp: 30 } }, { qi: 25 });
  assert.equal(shieldHit(d, 5), 0); assert.ok(qiOf(d) < 25);
  assert.equal(shieldHit({ arts: { breath: { xp: 30 } }, ng: 1, qi: 30 }, 5), 5);
});
