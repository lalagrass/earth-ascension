// loop1 M1：16 型 → 既有特質映射
import test from 'node:test';
import assert from 'node:assert/strict';
import { AXES, TYPES, MBTI_Q, traitExists, traitsOf, typeFromAnswers, nearestType, isType } from '../src/mbti.mjs';

const all16 = () => { const out = ['']; for (const ax of AXES) { const n = []; for (const p of out) n.push(p + ax[0], p + ax[1]); out.splice(0, out.length, ...n); } return out; };

test('16 型齊全，且只用既有特質（不新增特質）', () => {
  const want = all16();
  assert.equal(want.length, 16);
  assert.deepEqual(Object.keys(TYPES).sort(), want.sort());
  for (const [k, v] of Object.entries(TYPES)) {
    assert.equal(v.traits.length, 2, k);
    assert.notEqual(v.traits[0], v.traits[1], k);
    for (const t of v.traits) assert.ok(traitExists(t), `${k} 用了不存在的特質 ${t}`);
  }
  const pairs = new Set(Object.values(TYPES).map((v) => [...v.traits].sort().join('+')));
  assert.equal(pairs.size, 16, '每型特質組合要不同，才看得出差異');
});

test('問卷：每軸兩題、結果可重現、同分取第一極', () => {
  for (let i = 0; i < 4; i++) assert.equal(MBTI_Q.filter((q) => q.axis === i).length, 2);
  assert.equal(typeFromAnswers([0, 0, 0, 0, 0, 0, 0, 0]), 'ESTJ');
  assert.equal(typeFromAnswers([1, 1, 1, 1, 1, 1, 1, 1]), 'INFP');
  assert.equal(typeFromAnswers([0, 1, 0, 1, 0, 1, 0, 1]), 'ESTJ'); // 每軸 1:1 同分
  assert.equal(typeFromAnswers([1, 1, 0, 0, 1, 1, 1, 1]), 'ISFP');
  for (let m = 0; m < 256; m++) { const p = [...Array(8)].map((_, i) => (m >> i) & 1); assert.ok(isType(typeFromAnswers(p))); }
});

test('反例：答案數錯、選項越界、未知型都丟錯', () => {
  assert.throws(() => typeFromAnswers([0, 0]));
  assert.throws(() => typeFromAnswers([0, 0, 0, 0, 0, 0, 0, 2]));
  assert.throws(() => traitsOf('XXXX'));
  assert.throws(() => traitsOf('__proto__'));
});

test('反查：每型自己的特質會對回自己；無重疊回 null', () => {
  for (const k of Object.keys(TYPES)) assert.equal(nearestType(traitsOf(k)), k);
  assert.equal(nearestType(['drinker']), null);
  assert.equal(nearestType([]), null);
});
