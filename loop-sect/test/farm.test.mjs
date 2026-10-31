import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, placeBlueprint, release } from '../src/sim.mjs';
import { walkable } from '../src/map.mjs';
import { FIRE, FARM, TICKS_PER_DAY, BLUEPRINTS } from '../src/data.mjs';

const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
const fed = (s) => { for (const p of s.people) p.needs = { food: 95, energy: 95, social: 95, fun: 95 }; };
function withGarden(seed = 4) {
  const s = world(seed);
  s.raids = []; s.visits = [];
  s.stock.wood = 10;
  placeBlueprint(s, 'garden');
  for (let i = 0; i < TICKS_PER_DAY && !s.built.includes('garden'); i++) step(s);
  return s;
}

test('M12-A3 菜園完工：六格變可走的菜畦、產生六畦空地', () => {
  const s = withGarden();
  assert.ok(s.built.includes('garden'));
  const bp = BLUEPRINTS.find((b) => b.id === 'garden');
  for (const [x, y] of bp.cells) { assert.equal(s.map[y][x], 'g'); assert.ok(walkable(s.map, x, y)); }
  assert.equal(s.plots.length, 6);
});

test('M12-A2 菜畦：播種→長成→熟了→收成→送到灶邊算生莓，帳上記，收完回空地', () => {
  const s = withGarden();
  const seen = new Set();
  const raw0 = s.ledger.veg;
  for (let i = 0; i < 2 * TICKS_PER_DAY && s.ledger.veg === raw0; i++) { fed(s); step(s); for (const g of s.plots) seen.add(g.stage); }
  assert.ok(seen.has('growing') && seen.has('ripe'), [...seen].join());
  assert.ok(s.ledger.veg >= FARM.YIELD, '應該收成過');
  assert.ok(s.plots.some((g) => g.stage === 'empty' || g.stage === 'growing'), '收完的畦回到空地再種');
  // 守恆：生菜也算在 picked 裡。
  const L = s.ledger;
  const carried = s.people.reduce((a, p) => a + p.carry, 0), held = s.people.reduce((a, p) => a + p.hold.raw, 0);
  assert.equal(6 + L.picked, L.rawEaten + L.rawCooked + (L.rawStolen ?? 0) + s.stock.raw + carried + held);
});

test('M12-A2 長成要 FARM.GROW tick', () => {
  const s = withGarden();
  const g = s.plots[0];
  g.stage = 'growing'; g.at = s.tick;
  for (const p of s.people) { release(s, p); p.task = { kind: 'idle', left: 99999 }; p.act = 'do'; }
  for (let i = 0; i < FARM.GROW - 1; i++) step(s);
  assert.equal(g.stage, 'growing');
  step(s); step(s);
  assert.equal(g.stage, 'ripe');
});

test('M12-A4 收成帶動採集熟練；熟練高收得多', () => {
  const s = withGarden();
  const [a] = s.people;
  for (const p of s.people) { release(s, p); p.task = { kind: 'idle', left: 99999 }; p.act = 'do'; }
  release(s, a); a.task = null; a.act = 'idle';
  const g = s.plots[0];
  g.stage = 'ripe';
  a.x = g.x; a.y = g.y; a.path = [];
  a.skills.forage = 80;
  const before = a.skills.forage;
  a.task = { kind: 'harvest', plot: g.id }; g.user = a.id;
  a.act = 'do'; a.task.left = 1;
  step(s);
  assert.ok(a.carry >= FARM.YIELD + 2, `熟練 80 應多收 2 份，收了 ${a.carry}`);
  assert.ok(a.skills.forage > before, '收成算一次採集完成');
});

test('M12-A1 柴火（規則在，目前停用）：開工扣木、沒木不能煮、中途放棄退回', () => {
  const was = FIRE.WOOD_PER_POT;
  FIRE.WOOD_PER_POT = 1;
  try {
    const s = world();
    s.raids = []; s.visits = [];
    s.stock = { ...s.stock, raw: 10, meal: 0, wood: 0 };
    for (const p of s.people) p.needs.food = 50;
    for (let i = 0; i < 120; i++) { step(s); assert.ok(!s.people.some((p) => p.task?.kind === 'cook' && p.act === 'do'), '沒柴不能煮'); }
    s.stock.wood = 3;
    let cook = null;
    for (let i = 0; i < 400 && !cook; i++) { step(s); cook = s.people.find((p) => p.task?.kind === 'cook' && p.act === 'do'); }
    assert.ok(cook, '有柴就有人煮');
    assert.equal(cook.hold.wood, 1);
    const w = s.stock.wood;
    release(s, cook);
    assert.equal(s.stock.wood, w + 1, '放棄要退回柴');
  } finally { FIRE.WOOD_PER_POT = was; }
});
