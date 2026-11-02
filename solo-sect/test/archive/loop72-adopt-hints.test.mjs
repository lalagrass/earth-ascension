/* loop72：收養卡後果說明（純顯示） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { genHints, GEN } from '../../src/sect.mjs';
test('收養卡有兩行說明，寫出糧的代價', () => { const h = genHints({ gen: 'adopt' }); assert.equal(h.length, 2); assert.match(h[0], new RegExp(`糧 −${GEN.adoptFood}`)); });
test('其他卡不給說明', () => { assert.equal(genHints({ xia: 'x' }), null); assert.equal(genHints(null), null); });
// #390 退役：此測試含規則開關關閉時的斷言，開關已刪（擁有人 2026-11-02）
