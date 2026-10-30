import test from 'node:test'; import assert from 'node:assert/strict';
import { run } from './harness/bot.mjs';
test('寨強看戰力：開啟時寨子點數不隨錢變多', () => {
  const a = run(4, {}, 30), b = run(4, {}, 30, false, (s) => { if (s.t === 600 * 5) s.res.coin += 2000; });
  const pa = (a.lair?.hist || [])[0]?.pts, pb = (b.lair?.hist || [])[0]?.pts; if (pa && pb) assert.ok(pb < pa * 1.5, `${pa} vs ${pb}`); });
test('關閉時維持舊公式（財富放大）', () => { const s = run(4, { lairpow: false }, 1); assert.equal(s.lairpow, undefined); });
