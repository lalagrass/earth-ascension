/* loop92 熟練度十重介面：只顯示真實數值 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim.mjs';
import { artsGrowHtml } from '../src/panel-ui.mjs';
import { profLabel, profMul } from '../src/arts.mjs';
import { ARTS } from '../src/data.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, grow: true, ...x });
const pick = (d) => ARTS.find((a) => d.arts[a.id]);
test('開啟時顯示第幾重與實際加成', () => { const s = createState(7, spec({ prof: true })), d = s.ds[0], a = pick(d); d.arts[a.id].xp = 33;
  const h = artsGrowHtml(d, s.t); assert.ok(h.includes(profLabel(33)), profLabel(33)); assert.ok(h.includes(`+${((profMul(33) - 1) * 100).toFixed(1)}%`)); assert.match(h, /第.重 xp/); });
test('瓶頸與化境文字', () => { const s = createState(7, spec({ prof: true })), d = s.ds[0], a = pick(d); d.arts[a.id].xp = 54.9; assert.match(artsGrowHtml(d, s.t), /瓶頸/); d.arts[a.id].xp = 100; assert.match(artsGrowHtml(d, s.t), /化境不分重/); });
test('關閉時不顯示', () => { const s = createState(7, spec()), d = s.ds[0]; assert.ok(!/熟練度|data-prof/.test(artsGrowHtml(d, s.t))); });
