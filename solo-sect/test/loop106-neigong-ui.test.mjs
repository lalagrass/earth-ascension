/* loop106 內功介面：第 6 軸只在開啟時出現、狀態列內力條、規則說明綁參數 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim.mjs';
import { AXES, axesOf, polySvg, growthHtml, QI_AXIS } from '../src/growui.mjs';
import { NG, qiMax } from '../src/neigong.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...x });
test('關閉維持五軸與舊字樣；開啟多內力軸', () => {
  const off = createState(7, spec()).ds[0], on = createState(7, spec({ neigong: true })).ds[0];
  assert.equal(axesOf(off).length, 5); assert.equal(axesOf(on).at(-1).name, '內力'); assert.equal(AXES.length, 5);
  assert.match(growthHtml(off, {}, 1, 0, true), /本版沒有內力系統/); assert.doesNotMatch(growthHtml(off, {}, 1, 0, true), /內力怎麼算/);
  assert.match(polySvg(on), /內力 20/);
});
test('狀態列顯示目前／上限；規則數字取自 NG', () => {
  const d = createState(7, spec({ neigong: true })).ds[0]; d.qi = 13; const h = growthHtml(d, {}, 1, 0, true);
  assert.match(h, new RegExp(`內力 13/${qiMax(d)}`)); assert.doesNotMatch(h, /本版沒有內力系統/);
  for (const v of [NG.base, NG.perTier, NG.med, NG.strikeCost, NG.healCost, NG.btCost]) assert.ok(h.includes(String(v)), v);
  assert.equal(QI_AXIS.hi, NG.base + NG.perTier * 5);
});
