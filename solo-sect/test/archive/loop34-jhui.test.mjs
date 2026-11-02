// loop34 介面可讀性：原型／同門小派／江湖事件面板（s.jhui，純顯示）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../src/sim.mjs';
import { jhuiHtml, archLine, archPanel, cliquePanel, jhevPanel, archKnown } from '../../src/panel-ui.mjs';
import { ARCH } from '../../src/social.mjs';
import { run, ALL_ON } from '../harness/bot.mjs';

const sp = (o = {}) => ({ kind: 'custom', name: '測', answers: Array(9).fill(0), ...o });
const strip = (s) => { const { jhui, ...rest } = s; return JSON.stringify(rest); };

// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
test('純顯示：渲染前後狀態一字不差，模擬結果與不開面板相同', () => {
  const a = run(3, { jhui: true }, 12, true), b = run(3, { jhui: false }, 12, true);
  const before = JSON.stringify(a); for (let i = 0; i < 5; i++) jhuiHtml(a); assert.equal(JSON.stringify(a), before);
  assert.equal(strip(a), strip(b));
});
test('原型：主角自選原型可見；根骨未明的新弟子不洩漏原型', () => {
  const s = createState(1, sp({ jhui: true, arch: 'kulian' })); const hero = s.ds.find((d) => d.id === 'hero');
  assert.match(archLine(s, hero), /苦練憨直（參考：郭靖）/); assert.match(archPanel(s), /苦練憨直/);
  const d = { ...s.ds[1], arch: 'caizi', rootKnown: false }; s.ds[1] = d;
  assert.equal(archKnown(s, d), false); assert.doesNotMatch(archLine(s, d), /灑脫才子|令狐沖/); assert.match(archLine(s, d), /？？/);
  assert.doesNotMatch(archPanel(s), /灑脫才子/); assert.match(archPanel(s), /1 人原型未明/);
  for (const A of Object.values(ARCH)) assert.doesNotMatch(archPanel(s), /<img|portrait/);
});
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
test('ALL_ON 長跑 10 日面板不丟錯', () => { for (const seed of [1001, 1002]) { const s = run(seed, {}, 10, true); s.jhui = true; assert.ok(jhuiHtml(s).length > 100); } });
