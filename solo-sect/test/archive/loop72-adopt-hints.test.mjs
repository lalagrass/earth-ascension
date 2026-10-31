/* loop72：收養卡後果說明（純顯示） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { genHints, GEN } from '../../src/sect.mjs';
test('收養卡有兩行說明，寫出糧的代價', () => { const h = genHints({ gen: 'adopt' }); assert.equal(h.length, 2); assert.match(h[0], new RegExp(`糧 −${GEN.adoptFood}`)); });
test('其他卡不給說明', () => { assert.equal(genHints({ xia: 'x' }), null); assert.equal(genHints(null), null); });
test('不透露根骨、特質或日期；抉擇卡接線隨江湖面板開關', () => { for (const t of genHints({ gen: 'adopt' })) assert.doesNotMatch(t, /根骨|特質|第 \d+ 日/);
  assert.match(readFileSync(new URL('../../src/start-ui.mjs', import.meta.url), 'utf8'), /S\.jhui \? xiaHints\(ch\) \|\| genHints\(ch\)/); });
