// loop32：Lehmer 亂數流種子雜湊——種子 1–10 的第 1 抽要散開（舊版＝線性，全擠在 0 附近）
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedMix, M } from '../src/seedmix.mjs';

const first = (seed, salt) => (seedMix(seed, salt) * 16807) % M / M;
const SALTS = { lair: 4219, jhev: 7919, threat: 7477, jianghu: 977 };

test('seedMix 落在 [1, M−1] 的整數，且可重現', () => {
  for (let s = 0; s < 500; s++) for (const k of Object.values(SALTS)) { const v = seedMix(s, k); assert.ok(Number.isInteger(v) && v >= 1 && v < M, `${s}/${k}→${v}`); assert.equal(v, seedMix(s, k)); }
});
for (const [name, salt] of Object.entries(SALTS)) test(`${name}：種子 1–10 第 1 抽散開（不線性、橫跨高低）`, () => {
  const xs = Array.from({ length: 10 }, (_, i) => first(i + 1, salt));
  assert.ok(Math.max(...xs) - Math.min(...xs) > 0.5, `range ${xs.map((x) => x.toFixed(2))}`);
  assert.ok(xs.filter((x) => x >= 0.5).length >= 2 && xs.filter((x) => x < 0.5).length >= 2, '高低都要有');
  const mean = xs.reduce((a, b) => a + b, 0) / 10; assert.ok(mean > 0.25 && mean < 0.75, `mean ${mean}`);
  const inc = xs.every((x, i) => i === 0 || x > xs[i - 1]); assert.ok(!inc, '不可隨種子單調遞增');
});
test('四條流各自獨立（同種子第 1 抽不全相同）', () => {
  for (let s = 1; s <= 10; s++) assert.ok(new Set(Object.values(SALTS).map((k) => first(s, k).toFixed(6))).size === 4);
});
