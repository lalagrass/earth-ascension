// loop35：開局江湖規則接線——每個勾選項在「經典」「自創」兩分頁都要真的變成 state 旗標（外部審查 P1）
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, ruleSpec, buildSpec } from '../src/start-ui.mjs';
import { createState } from '../src/sim.mjs';
import { defaultStats } from '../src/hero.mjs';

const FLAG = { draw: 'draw', comprehend: 'wu7', mentor: 'mentor', peace: 'm9', jhev: 'jhev', bt25: 'bt25', lift: 'lift', lairpow: 'lairpow', steward: 'steward', jhui: 'jhui', qshare: 'qshare', jhrefuse: 'jhrefuse', mfit: 'mfit' };
const base = (tab) => ({ tab, hero: 'guojing', comp: null, name: '測', stats: defaultStats(), ans: Array(9).fill(0), ask: false, draw: true });
const on = (s, sk) => !!s[FLAG[sk]];

test('RULES 單一來源：13 項、id／spec 鍵不重複、每項都有對應旗標', () => {
  assert.equal(RULES.length, 13); assert.equal(new Set(RULES.map((r) => r[0])).size, 13); assert.equal(new Set(RULES.map((r) => r[2])).size, 13);
  for (const [, , sk] of RULES) assert.ok(FLAG[sk], sk);
});
for (const tab of ['classic', 'custom']) {
  test(`${tab}：全部預設勾選 → 13 個旗標都開`, () => { const s = createState(7, buildSpec(base(tab))); for (const [, , sk] of RULES) assert.ok(on(s, sk), `${tab} ${sk}`); });
  for (const [id, k, sk] of RULES) test(`${tab}：只取消「${id}」→ 只有 ${sk} 關、其餘照開`, () => {
    const st = { ...base(tab), [k]: false }; const s = createState(7, buildSpec(st));
    for (const [, , o] of RULES) assert.equal(on(s, o), o !== sk, `${tab} 取消 ${id} 時 ${o}`);
  });
}
test('兩分頁規則部分一致（經典不再重複列）', () => { for (const tab of ['classic', 'custom']) assert.deepEqual(Object.keys(ruleSpec(base(tab))).sort(), RULES.map((r) => r[2]).sort()); });
test('面板折疊狀態：closed 標記的區塊不帶 open，其餘預設展開（審查 P2）', async () => {
  const { jhuiHtml } = await import('../src/jhui.mjs'); const s = createState(1, { kind: 'custom', answers: Array(9).fill(0), jhui: true });
  const h = jhuiHtml(s, { 'jhui-arch': true });
  assert.match(h, /<details data-keep="jhui-arch"><summary>原型/); assert.match(h, /<details data-keep="jhui-clique" open>/); assert.match(h, /<details data-keep="jhui-jhev" open>/);
});
