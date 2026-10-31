// loop35：開局江湖規則接線——每個勾選項在「經典」「自創」兩分頁都要真的變成 state 旗標（外部審查 P1）
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, ruleSpec, buildSpec } from '../src/start-ui.mjs';
import { createState } from '../src/sim.mjs';
import { defaultStats } from '../src/hero.mjs';

// loop143：33 個勾選框轉正為底層（見 v220.test.mjs）；這裡只驗剩下的 1 個勾選框在兩分頁都接線
const base = (tab) => ({ tab, hero: 'guojing', comp: null, name: '測', stats: defaultStats(), ans: Array(9).fill(0), ask: false });
test('RULES 只剩執事自動營建', () => { assert.deepEqual(RULES.map((r) => r[0]), ['steward']); });
for (const tab of ['classic', 'custom']) test(`${tab}：執事勾選接線（steward／stewkit／stewyard 同進退）`, () => {
  const on = createState(7, buildSpec(base(tab))), off = createState(7, buildSpec({ ...base(tab), steward: false }));
  for (const k of ['steward', 'stewkit', 'stewyard']) { assert.ok(on[k], k); assert.ok(!off[k], k); }
});
test('兩分頁規則部分一致', () => { assert.deepEqual(ruleSpec(base('classic')), ruleSpec(base('custom'))); });
test('面板折疊狀態：closed 標記的區塊不帶 open，其餘預設展開（審查 P2）', async () => {
  const { jhuiHtml } = await import('../src/jhui.mjs'); const s = createState(1, { kind: 'custom', answers: Array(9).fill(0), jhui: true });
  const h = jhuiHtml(s, { 'jhui-arch': true });
  assert.match(h, /<details data-keep="jhui-arch"><summary>原型/); assert.match(h, /<details data-keep="jhui-clique" open>/); assert.match(h, /<details data-keep="jhui-jhev" open>/);
});
