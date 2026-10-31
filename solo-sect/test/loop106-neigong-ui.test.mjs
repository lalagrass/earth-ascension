/* loop106 → loop142 改寫：第 6 軸只在開啟時出現（0–100 護體真氣軸）、規則說明綁 NG/NG2 參數 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim.mjs';
import { AXES, axesOf, growthHtml, QI_AXIS } from '../src/growui.mjs';
import { NG, NG2 } from '../src/neigong.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...x });
test('關閉維持五軸；開啟多內力軸（0–100）', () => {
  const off = createState(7, spec()).ds[0], on = createState(7, spec({ neigong: true })).ds[0];
  assert.equal(axesOf(off).length, 5); assert.equal(axesOf(on).at(-1).name, '內力'); assert.equal(AXES.length, 5);
  assert.match(growthHtml(off, {}, 1, 0, true), /本版沒有內力系統/); assert.doesNotMatch(growthHtml(off, {}, 1, 0, true), /護體真氣怎麼算/);
  assert.equal(QI_AXIS.lo, 0); assert.equal(QI_AXIS.hi, NG2.cap.at(-1));
});
test('規則說明只有護體真氣，數字取自 NG／NG2', () => {
  const d = createState(7, spec({ neigong: true })).ds[0]; const h = growthHtml(d, {}, 1, 0, true);
  assert.match(h, /護體真氣怎麼算/); assert.doesNotMatch(h, /狩獵出手扣/);
  for (const v of [NG.med, NG.btCost, NG2.spentT, NG2.guard]) assert.ok(h.includes(String(v)), v);
});
