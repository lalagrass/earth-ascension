import test from 'node:test';
import assert from 'node:assert/strict';
import { NG2, qiMax, qiMax2, mitOf, shieldHit, qiOf } from '../../src/arts.mjs';
const mk = (arts, extra = {}) => ({ arts, ng: 1, ng2: 1, qi: 0, ...extra });
test('二版：沒有內功時內力上限 0、沒有減傷', () => {
  const d = mk({ fist: { xp: 50 } });
  assert.equal(qiMax2(d), 0); assert.equal(qiMax(d), 0); assert.equal(mitOf(d), 0);
  assert.equal(shieldHit(d, 10), 10);
});
// #390 退役：釘住 v2.4 以前的內力／減傷／造詣公式；現行公式見 test/v31.test.mjs（loop197／198）
// #390 退役：釘住 v2.4 以前的內力／減傷／造詣公式；現行公式見 test/v31.test.mjs（loop197／198）
test('二版：內力夠時不扣生命；未開二版原樣', () => {
  const d = mk({ breath: { xp: 30 } }, { qi: 25 });
  assert.equal(shieldHit(d, 5), 0); assert.ok(qiOf(d) < 25);
  assert.equal(shieldHit({ arts: { breath: { xp: 30 } }, ng: 1, qi: 30 }, 5), 5);
});
