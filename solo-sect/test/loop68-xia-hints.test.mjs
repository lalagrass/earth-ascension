// loop68：奇遇卡後果說明（純顯示）
import test from 'node:test';
import assert from 'node:assert/strict';
import { xiaHints } from '../src/wuxia.mjs';
test('弟子／客人／高人各有兩行說明，婉拒都說三天後再來', () => {
  for (const k of ['guojing', 'yangguo', 'hongqigong', 'zhoubotong']) { const h = xiaHints({ xia: k }); assert.equal(h.length, 2); assert.match(h[1], /三天後/); }
  assert.match(xiaHints({ xia: 'guojing' })[0], /入門/); assert.match(xiaHints({ xia: 'yangguo' })[0], /客人/); assert.match(xiaHints({ xia: 'hongqigong' })[0], /名聲 \+3/);
});
test('非奇遇卡沒有說明', () => { assert.equal(xiaHints({ jh: 'morning' }), null); assert.equal(xiaHints(null), null); });
test('說明不透露暗特質或時機（不含數字天數以外的隱藏資訊）', () => { for (const k of ['guojing', 'yangguo', 'hongqigong', 'zhoubotong']) for (const l of xiaHints({ xia: k })) assert.ok(!/特質|性格|根骨|悟性|第 ?\d+ ?日/.test(l), l); });
