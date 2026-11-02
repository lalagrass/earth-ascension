/* loop102 → loop142 改寫：一版內功淘汰，上限只走護體真氣（NG2.cap 依階） */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NG2, INNER, qiMax, qiOf, addQi, spendQi } from '../../src/arts.mjs';
import { TIERS } from '../../src/data.mjs';
const D = (arts = {}) => ({ ng: 1, ng2: 1, qi: 0, arts });
test('內功武學：吐納與內功門類，招式武學不算', () => {
  for (const id of ['breath', 'zixia', 'jiuyang']) assert.ok(INNER.includes(id), id);
  assert.ok(!INNER.includes('basicFist'));
});
// #390 退役：釘住 v2.4 以前的內力／減傷／造詣公式；現行公式見 test/v31.test.mjs（loop197／198）
// #390 退役：釘住 v2.4 以前的內力／減傷／造詣公式；現行公式見 test/v31.test.mjs（loop197／198）
// #390 退役：釘住 v2.4 以前的內力／減傷／造詣公式；現行公式見 test/v31.test.mjs（loop197／198）
test('關閉（沒有 d.ng）時永不扣用', () => { const d = { qi: 50, arts: {} }; assert.equal(spendQi(d, 1), false); assert.equal(d.qi, 50); });
test('存量超過上限（忘了內功）時以上限計', () => { const d = D(); d.qi = 90; assert.equal(qiOf(d), 0); });
