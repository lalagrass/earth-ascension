/* loop102 → loop142 改寫：一版內功淘汰，上限只走護體真氣（NG2.cap 依階） */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NG2, INNER, qiMax, qiOf, addQi, spendQi } from '../src/neigong.mjs';
import { TIERS } from '../src/data.mjs';
const D = (arts = {}) => ({ ng: 1, ng2: 1, qi: 0, arts });
test('內功武學：吐納與內功門類，招式武學不算', () => {
  for (const id of ['breath', 'zixia', 'jiuyang']) assert.ok(INNER.includes(id), id);
  assert.ok(!INNER.includes('basicFist'));
});
test('上限衍生：沒學內功 0；每門內功依階給 NG2.cap，封頂 NG2.total', () => {
  assert.equal(qiMax(D()), 0);
  assert.equal(qiMax(D({ basicFist: { xp: 99 } })), 0);
  assert.equal(qiMax(D({ breath: { xp: 0 } })), NG2.cap[0]);
  assert.equal(qiMax(D({ breath: { xp: TIERS.at(-1)[0] } })), NG2.cap[TIERS.length - 1]);
  const all = Object.fromEntries(INNER.map((id) => [id, { xp: 100 }]));
  assert.equal(qiMax(D(all)), NG2.total);
});
test('造詣、十重不影響上限（只看階）', () => {
  const a = D({ breath: { xp: 26 } }), b = D({ breath: { xp: 54 } }); b.mast = { neigong: 99 };
  assert.equal(qiMax(a), qiMax(b));
});
test('回復不超上限、不為負；扣用不夠不扣', () => {
  const d = D({ breath: { xp: 0 } }); addQi(d, 999); assert.equal(d.qi, NG2.cap[0]); addQi(d, -999); assert.equal(d.qi, 0);
  assert.equal(spendQi(d, 1), false); assert.equal(d.qi, 0);
  addQi(d, 10); assert.equal(spendQi(d, 4), true); assert.equal(d.qi, 6);
});
test('關閉（沒有 d.ng）時永不扣用', () => { const d = { qi: 50, arts: {} }; assert.equal(spendQi(d, 1), false); assert.equal(d.qi, 50); });
test('存量超過上限（忘了內功）時以上限計', () => { const d = D(); d.qi = 90; assert.equal(qiOf(d), 0); });
