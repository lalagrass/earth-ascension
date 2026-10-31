// loop65：新局後自動存檔不再要等追上舊局時間（審查 P1）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { autoDue, AUTO } from '../src/slice.mjs';
test('一般：滿 every 秒才到期', () => { assert.equal(autoDue(59, 0), false); assert.equal(autoDue(60, 0), true); assert.equal(autoDue(AUTO.every + 100, 100), true); });
test('換局時間倒退（舊局 1200、新局 5）→ 立即到期', () => assert.equal(autoDue(5, 1200), true));
test('main.mjs：新局與所有讀檔路徑都呼叫 freshGame，且不再直接寫 lastAuto = S.t', () => {
  const m = readFileSync(new URL('../src/main.mjs', import.meta.url), 'utf8');
  assert.match(m, /createState\(Date\.now\(\) % 100000 \| 0, spec\); freshGame\(\)/);
  assert.equal((m.match(/S = r\.state; freshGame\(\)/g) || []).length, 3);
  assert.ok(!/S = r\.state; lastAuto = S\.t/.test(m)); assert.match(m, /autoDue\(S\.t, lastAuto\)/);
});
