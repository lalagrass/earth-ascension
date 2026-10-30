import test from 'node:test'; import assert from 'node:assert/strict';
import { JHEV } from '../src/jhevents.mjs';
import { run } from './harness/bot.mjs';
test('獎勵參數：挑戰基準維持 75，得勝有彩頭', () => { assert.equal(JHEV.letter.base, 75); assert.ok(JHEV.letter.win.coin > 0); assert.ok(JHEV.master.teach > 0); });
test('10 種子 60 日內至少一次高人傳武學或點撥', () => { let n = 0; for (let seed = 1; seed <= 10 && !n; seed++) { const s = run(seed, {}, 60); n += (s.jhev.t || 0) + (s.jhev.mv || 0); } assert.ok(n > 0); });
