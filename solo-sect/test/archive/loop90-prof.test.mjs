/* loop90 熟練度十重：純函式 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { profOf, profMul, profLabel, nextLvXp, PROF } from '../../src/arts.mjs';
import { TIERS, ART_GAIN } from '../../src/data.mjs';
test('每階十重、化境不分重', () => { assert.equal(profLabel(0), '入門一重'); assert.equal(profLabel(24.99), '入門十重'); assert.equal(profLabel(25), '小成一重'); assert.equal(profLabel(100), '化境'); assert.equal(profOf(100).lv, 0); });
test('瓶頸標示只在 54.9／99.9', () => { assert.match(profLabel(54.9), /小成十重（瓶頸）/); assert.match(profLabel(99.9), /圓滿十重（瓶頸）/); assert.ok(!profOf(24.95).stuck); assert.ok(!profOf(84.95).stuck); });
test('威力加成全程單調不減，且加上階段加成後到下一階淨增為正', () => { let prev = 0; for (let x = 0; x <= 100; x += 0.05) { const t = profOf(x).t, m = (1 + ART_GAIN.tierDmg * t) * profMul(x); assert.ok(m >= prev - 1e-12, `xp ${x}`); prev = m; } });
test('十重最多 +4.5%（= tierDmg/20 × 9）', () => { assert.ok(Math.abs(profMul(24.99) - 1 - PROF.perLv * 9) < 1e-12); assert.equal(PROF.perLv, ART_GAIN.tierDmg / 20); assert.equal(profMul(0), 1); });
test('下一重門檻', () => { assert.equal(nextLvXp(0), 2.5); assert.equal(nextLvXp(24), 25); assert.equal(nextLvXp(100), null); for (const [x] of TIERS.slice(0, -1)) assert.equal(profOf(x).lv, 1); });
