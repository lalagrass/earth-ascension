// loop34 介面可讀性：原型／同門小派／江湖事件面板（s.jhui，純顯示）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { jhuiHtml, archLine, archPanel, cliquePanel, jhevPanel, archKnown } from '../src/panel-ui.mjs';
import { ARCH } from '../src/social.mjs';
import { run, ALL_ON } from './harness/bot.mjs';

const sp = (o = {}) => ({ kind: 'custom', name: '測', answers: Array(9).fill(0), ...o });
const strip = (s) => { const { jhui, ...rest } = s; return JSON.stringify(rest); };

test('預設關閉：不帶 jhui 的開局沒有面板；帶了才開', () => {
  assert.equal(createState(1).jhui, undefined); assert.equal(jhuiHtml(createState(1)), '');
  const s = createState(1, sp({ jhui: true })); assert.equal(s.jhui, true); assert.match(jhuiHtml(s), /原型.*同門小派.*江湖事件/s);
});
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
test('同門小派：未開人以群分有說明；有小派時列出成員與結成日', () => {
  assert.match(cliquePanel(createState(1, sp({ jhui: true }))), /未開「人以群分」/);
  const s = createState(1, sp({ jhui: true, draw: true })); const [a, b] = s.ds; s.cliques = [{ ids: [a.id, b.id], name: `${a.name}一派`, day: 7 }];
  a.task = { act: 'train' }; b.task = { act: 'train' };
  const h = cliquePanel(s); assert.match(h, new RegExp(`${a.name}一派`)); assert.match(h, /第 7 日結成・2 人/); assert.match(h, /正一起練功（2 人）/);
});
test('江湖事件：次數、勝敗、勝算與近期紀事；不顯示下次何時來（隱藏亂數）', () => {
  const s = run(5, {}, 60, true); s.jhui = true; const h = jhevPanel(s);
  assert.match(h, /過路高人：來過 \d+ 次/); assert.match(h, /挑戰帖：應戰 \d+ 次，勝 \d+・敗 \d+/); assert.match(h, /勝算約 \d+%/);
  assert.doesNotMatch(h, /mNext|lNext|rng|下次/);
  assert.match(jhevPanel(createState(1, sp({ jhui: true }))), /未開「江湖事件」/);
});
test('ALL_ON 長跑 10 日面板不丟錯', () => { for (const seed of [1001, 1002]) { const s = run(seed, {}, 10, true); s.jhui = true; assert.ok(jhuiHtml(s).length > 100); } });
