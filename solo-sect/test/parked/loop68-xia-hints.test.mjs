// Parked after T1 CI failure; original assertion(s) retained verbatim: 弟子／客人／高人各有兩行說明，婉拒都說三天後再來; tracked in #496.
// loop68：奇遇卡後果說明（純顯示）
import test from 'node:test';
import assert from 'node:assert/strict';
import { xiaHints } from '../../src/wuxia.mjs';

test('弟子／客人／高人各有兩行說明，婉拒都說三天後再來', () => {
  for (const k of ['guojing', 'yangguo', 'hongqigong', 'zhoubotong']) { const h = xiaHints({ xia: k }); assert.equal(h.length, 2); assert.match(h[1], /三天後/); }
  assert.match(xiaHints({ xia: 'guojing' })[0], /入門/); assert.match(xiaHints({ xia: 'yangguo' })[0], /客人/); assert.match(xiaHints({ xia: 'hongqigong' })[0], /名聲 \+3/);
});
