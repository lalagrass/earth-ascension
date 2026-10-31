/* loop70：月俸缺口提示（純顯示） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { payHint, econHtml, wageBill } from '../src/economy.mjs';
const mk = (coin, jhui = true) => ({ day: 12, res: { coin }, fac: {}, jhui, ds: [{ id: 'hero', role: 'head' }, { id: 'a', role: 'inner' }, { id: 'b', role: 'inner' }] });
test('缺錢時顯示還差多少，夠錢時顯示結算後剩多少', () => {
  const s = mk(0), w = wageBill(s);
  assert.match(payHint(s), new RegExp(`還差 ${w} 才付得清`));
  assert.match(payHint(mk(w + 50)), /結算後約剩 50/);
});
test('再收一名外門的月俸不少於現在，且提示隨江湖面板開關', () => {
  const s = mk(0), n1 = +payHint(s).match(/月俸約 (\d+)/)[1];
  assert.ok(n1 >= wageBill(s));
  assert.match(econHtml(mk(0)), /data-payhint/);
  assert.doesNotMatch(econHtml(mk(0, false)), /data-payhint/);
});
test('payHint 只讀不寫', () => { const s = mk(5), j = JSON.stringify(s); payHint(s); assert.equal(JSON.stringify(s), j); });
