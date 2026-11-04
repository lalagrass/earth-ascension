/* 第五輪 #427 N21 部位傷：只在架勢空的重擊／精準武學重擊發生；目傷讀招失效、手傷出手慢、身傷內力不回；最多三日，療傷縮短、醫術直接好。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PART, partHit, partHeal, partText, clashOdds, windOf, addQi } from '../src/arts.mjs';

test('部位傷：觸發條件、三種效果、三日內好', () => {
  const s = { t: 0, log: [], fx: [] }, d = () => ({ id: 'a', name: '甲', hp: 100, wu: 6, qi: 0, ng: 1, skills: { agility: 0 }, arts: {} }), m = { k: 'boar', uid: 'b' };
  const a = d(); assert.equal(partHit(s, a, { kind: 'hit', heavy: false }), null, '輕擊不傷');
  assert.equal(partHit(s, a, { kind: 'hit', heavy: true }), null, '架勢沒空、也不是精準武學');
  const eye = d(); partHit(s, eye, { kind: 'hit', heavy: true, why: 'open' }, { rnd: () => 0.1 }); assert.equal(eye.part.where, 'eye');
  assert.match(partText(eye), /^左目受傷，三日內看不清來招$/);
  const ok = d(); assert.ok(clashOdds(s, m, ok).read > 0); assert.equal(clashOdds(s, m, eye).read, 0, '目傷：讀招失效');
  const hand = d(); hand.part = { where: 'hand', side: '右', days: 3 }; assert.ok(Math.abs(windOf(hand, 'fist', 1) / windOf(ok, 'fist', 1) - PART.hand) < 1e-9);
  const body = d(); body.part = { where: 'body', side: '', days: 3 }; addQi(body, 10); assert.equal(body.qi, 0, '身傷：內力不回');
  partHeal(s, eye, 'day'); partHeal(s, eye, 'heal'); assert.equal(eye.part.days, 1); partHeal(s, eye, 'day'); assert.equal(eye.part, null, '最多三日');
  partHeal(s, hand, 'doctor'); assert.equal(hand.part, null, '醫術直接好');
});
