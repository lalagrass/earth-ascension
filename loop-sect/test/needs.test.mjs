import test from 'node:test';
import assert from 'node:assert/strict';
import { urgency, decayNeeds, decayRates, applyPer, isNight } from '../src/needs.mjs';
import { fromTemplate } from '../src/person.mjs';

const person = (tpl) => {
  const p = fromTemplate(tpl, { id: 'x' });
  p.needs = { food: 50, energy: 50, social: 50, fun: 50 };
  return p;
};

test('M2-A1 迫切度：滿 0、空 4、單調遞增', () => {
  assert.equal(urgency(100), 0);
  assert.equal(urgency(0), 4);
  for (let v = 100; v > 0; v -= 5) assert.ok(urgency(v - 5) > urgency(v));
});

test('M2-A1 需求下降、走路多耗精力、夾在 0..100', () => {
  const p = person('guojing');
  decayNeeds(p, false);
  const e1 = p.needs.energy;
  decayNeeds(p, true);
  assert.ok(50 - e1 < e1 - p.needs.energy, '走路應該更累');
  p.needs.food = 0.01;
  decayNeeds(p, false);
  assert.equal(p.needs.food, 0);
  applyPer(p, { fun: 500 });
  assert.equal(p.needs.fun, 100);
});

test('M2-A1 個性影響下降速度：外向者更快寂寞、體弱者更快累', () => {
  const ext = person('linghu'), intr = person('longnv');
  assert.ok(decayRates(ext).social > decayRates(intr).social);
  const frail = person('huangrong'), sturdy = person('guojing');
  assert.ok(decayRates(frail).energy > decayRates(sturdy).energy);
});

test('睡著時餓得慢、不寂寞', () => {
  const a = person('guojing'), b = person('guojing');
  decayNeeds(a, false, true); decayNeeds(b, false, false);
  assert.ok(a.needs.food > b.needs.food);
  assert.equal(a.needs.social, 50);
});

test('夜是 22:00–06:00', () => {
  assert.equal(isNight(23 * 60), true);
  assert.equal(isNight(3 * 60), true);
  assert.equal(isNight(12 * 60), false);
  assert.equal(isNight(1440 + 6 * 60), false);
});
