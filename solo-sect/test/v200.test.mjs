// v2.0 A8 宿命樹資料化：資料↔程式等價（以重構前的快照為準）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CARDS as HC, ARC_YUE, ARC_LHC } from '../src/huashan.mjs';
import { CARDS as JC, ARC13 } from '../src/jianghu.mjs';
import { GUOJING_ARC } from '../src/wuxia.mjs';
import { TREES, destinyStep } from '../src/destiny.mjs';
const snap = JSON.parse(fs.readFileSync(new URL('./fixtures/v200-cards-before.json', import.meta.url)));
const strip = (C) => Object.fromEntries(Object.entries(C).map(([k, c]) => [k, { ...c, opts: c.opts.map((o) => o.map((x) => (typeof x === 'function' ? 'fn' : x))) }]));
test('A8：華山／江湖卡文字、選項、價值觀與重構前完全相同，每個選項仍有效果函式', () => {
  assert.deepEqual(strip(HC), snap.huashan);
  const gotJ = strip(JC);
  for (const k of Object.keys(snap.jianghu)) assert.deepEqual(gotJ[k], snap.jianghu[k], k);
  assert.deepEqual(Object.keys(gotJ).filter((k) => !snap.jianghu[k]), ['wuming'], 'v2.1 只加無名主線，舊卡文字不變');
});
test('A8：主線步驟名稱等同重構前', () => {
  assert.deepEqual(ARC_YUE, ['林平之上山', '暗查劍譜', '辟邪或焚譜', '紫霞七層', '令狐沖去留']);
  assert.deepEqual(ARC_LHC, ['思過崖的老人', '風清揚', '總訣式', '九劍三式', '自立門戶']);
  assert.deepEqual(ARC13.weixiaobao, ['天地會來人', '賭坊開張', '海大富', '寶衣護身', '皇上的朋友']);
  assert.deepEqual(GUOJING_ARC, ['洪七公聞香而來', '吃人嘴軟', '降龍傳人', '華山論劍之約']);
  assert.equal(TREES.arcs.zhangwuji.length, 5); assert.equal(TREES.arcs.axing.length, 5);
});
test('A8：每個檢核引用的卡都存在；檢核器語義（區間、日、武學、旗標、then）', () => {
  for (const [id, L] of Object.entries(TREES.checks)) for (const c of L) if (c.card) assert.ok(JC[c.card], `${id}:${c.card}`);
  const calls = []; const ctx = (ok) => ({ d0: {}, artTier: () => 1, card: (s, k, f) => { calls.push([k, !!f]); return ok; }, arc: (s, id, n, t) => calls.push(['arc', n, t]) });
  const s = { day: 5, hero: { arcStep: 2 }, jh: {} };
  assert.equal(destinyStep(s, 'zhangwuji', ctx(true)), false, 'jiuyang 未到 2 階不觸發 zwj3'); assert.deepEqual(calls, []);
  assert.equal(destinyStep(s, 'weixiaobao', ctx(true)), true); assert.deepEqual(calls, [['hai', false], ['arc', 3, '海大富']]);
  calls.length = 0; s.jh.hai = 1; assert.equal(destinyStep(s, 'weixiaobao', ctx(true)), false); assert.deepEqual(calls, []);
  calls.length = 0; assert.equal(destinyStep(s, 'weixiaobao', ctx(false)), false);
  const a = { day: 1, hero: { arcStep: 3, awakened: true }, jh: {} }; calls.length = 0;
  assert.equal(destinyStep(a, 'axing', ctx(true)), false); assert.deepEqual(calls.map((c) => c[1]), [4, 5]);
  a.hero.arcStep = 1; a.day = 2; calls.length = 0; destinyStep(a, 'axing', ctx(true)); assert.deepEqual(calls, [['beggar', true]]);
});
