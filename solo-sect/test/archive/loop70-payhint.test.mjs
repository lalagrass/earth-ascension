/* loop70：月俸缺口提示（純顯示） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { payHint, econHtml, wageBill } from '../../src/economy.mjs';
const mk = (coin, jhui = true) => ({ day: 12, res: { coin }, fac: {}, jhui, ds: [{ id: 'hero', role: 'head' }, { id: 'a', role: 'inner' }, { id: 'b', role: 'inner' }] });
test('缺錢時顯示還差多少，夠錢時顯示結算後剩多少', () => {
  const s = mk(0), w = wageBill(s);
  assert.match(payHint(s), new RegExp(`還差 ${w} 才付得清`));
  assert.match(payHint(mk(w + 50)), /結算後約剩 50/);
});
// #390 退役：此測試含規則開關關閉時的斷言，開關已刪（擁有人 2026-11-02）
test('payHint 只讀不寫', () => { const s = mk(5), j = JSON.stringify(s); payHint(s); assert.equal(JSON.stringify(s), j); });
