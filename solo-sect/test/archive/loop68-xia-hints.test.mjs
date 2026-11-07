// loop68：奇遇卡後果說明（純顯示）
import test from 'node:test';
import assert from 'node:assert/strict';
import { xiaHints } from '../../src/wuxia.mjs';
test('非奇遇卡沒有說明', () => { assert.equal(xiaHints({ jh: 'morning' }), null); assert.equal(xiaHints(null), null); });
test('說明不透露暗特質或時機（不含數字天數以外的隱藏資訊）', () => { for (const k of ['guojing', 'yangguo', 'hongqigong', 'zhoubotong']) for (const l of xiaHints({ xia: k })) assert.ok(!/特質|性格|根骨|悟性|第 ?\d+ ?日/.test(l), l); });
