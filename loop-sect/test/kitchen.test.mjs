import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, companionsFor, release, scorePois } from '../src/sim.mjs';
import { candidates, rawPile } from '../src/ai.mjs';
import { KITCHEN, MEAL_TARGET } from '../src/data.mjs';

// M21 暫停中（KITCHEN.ON false）；規則照開著測。
const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
function cookOf(s, p) {
  release(s, p); p.task = null; p.act = 'idle'; p.wait = 0;
  p.needs = { food: 80, energy: 80, social: 80, fun: 80 };
  return candidates(s, p, scorePois).list.find((c) => c.kind === 'cook');
}
const withOn = (fn) => { KITCHEN.ON = true; try { fn(); } finally { KITCHEN.ON = false; } };

test('M21-A1 生越多煮飯活計越高、封頂；飯在 6–11 而生堆著時也能煮，到 CAP 就沒有', () => withOn(() => {
  const s = world(); s.stock.wood = 10;
  const p = s.people[0];
  const work = (raw, meal) => { s.stock.raw = raw; s.stock.meal = meal; return cookOf(s, p)?.f.work; };
  const w0 = work(KITCHEN.RAW0, 2), w1 = work(KITCHEN.RAW0 + KITCHEN.RAW_K / 2, 2), w2 = work(KITCHEN.RAW0 + KITCHEN.RAW_K, 2), w3 = work(KITCHEN.RAW0 + 3 * KITCHEN.RAW_K, 2);
  assert.ok(w1 > w0 && w2 > w1, `${w0} ${w1} ${w2}`);
  assert.ok(Math.abs(w2 - w0 - KITCHEN.PULL) < 1e-9 && Math.abs(w3 - w2) < 1e-9, '封頂');
  assert.equal(rawPile({ raw: KITCHEN.RAW0 }), 0);
  assert.ok(work(KITCHEN.RAW0 + 4, MEAL_TARGET + 2) > 0, '飯 8、生堆著：可以煮');
  assert.equal(work(KITCHEN.RAW0 + 4, KITCHEN.CAP), undefined, '飯到 CAP 不煮');
  assert.equal(work(KITCHEN.RAW0, MEAL_TARGET + 2), undefined, '沒堆著時照舊：飯夠就不煮');
  s.stock.raw = KITCHEN.RAW0 + 4; s.stock.meal = 2;
  assert.match(cookOf(s, p).label, /灶邊堆著/);
}));

test('M21-A2 同樣堆量，條理的人順手煮的個性分比隨性的高 J × 條理 × pile', () => withOn(() => {
  const s = world(); s.stock.wood = 10; s.stock.meal = 2;
  const p = s.people[0];
  p.axes = { ...p.axes, P: -1 };
  const persona = (raw) => { s.stock.raw = raw; return cookOf(s, p).f.persona; };
  const a = persona(KITCHEN.RAW0 + 0.0001), b = persona(KITCHEN.RAW0 + KITCHEN.RAW_K);
  assert.ok(Math.abs(b - a - KITCHEN.J * 1 * (1 - 0.0001 / KITCHEN.RAW_K)) < 1e-6, `${a} → ${b}`);
  p.axes = { ...p.axes, P: 1 };
  const c = persona(KITCHEN.RAW0 + 0.0001), d = persona(KITCHEN.RAW0 + KITCHEN.RAW_K);
  assert.ok(Math.abs(d - c) < 1e-6, '隨性的人沒有這一項');
}));

test('M21 關著時跟以前一樣', () => {
  const s = world(); s.stock.wood = 10; s.stock.raw = 30; s.stock.meal = MEAL_TARGET + 1;
  assert.equal(cookOf(s, s.people[0]), undefined);
});
