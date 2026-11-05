import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, release, scorePois } from '../src/sim.mjs';
import { candidates } from '../src/ai.mjs';
import { FAMILY } from '../src/data.mjs';

const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
const park = (s, keep) => { for (const p of s.people) if (!keep.includes(p)) { release(s, p); p.task = { kind: 'idle', left: 99999 }; p.act = 'do'; } };
function setup() {
  const s = world();
  s.raids = []; s.visits = [];
  const [a, b] = s.people;
  park(s, [a, b]);
  a.kin = b.id; b.kin = a.id;
  release(s, a); a.task = null; a.act = 'idle'; a.wait = 0;
  a.needs = { food: 90, energy: 90, social: 90, fun: 90 };
  b.needs = { food: FAMILY.SERVE - 10, energy: 90, social: 90, fun: 90 };
  release(s, b); b.task = { kind: 'chop', left: 99999 }; b.act = 'do';
  s.stock.meal = 3;
  return { s, a, b };
}
const serveOf = (s, a) => candidates(s, a, scorePois).list.find((c) => c.kind === 'serve');

test('M24-A1 家人餓著有端飯候選；家人在吃、是訪客、自己也餓、灶上沒飯時沒有', () => {
  let { s, a, b } = setup();
  const c = serveOf(s, a);
  assert.ok(c && c.to === b.id && /給.+端飯/.test(c.label));
  b.task = { kind: 'eat', left: 10 }; assert.equal(serveOf(s, a), undefined, '在吃');
  ({ s, a, b } = setup()); b.guest = { arrived: 0, until: 1e9 }; assert.equal(serveOf(s, a), undefined, '訪客');
  ({ s, a, b } = setup()); a.needs.food = FAMILY.SERVE - 1; assert.equal(serveOf(s, a), undefined, '自己也餓');
  ({ s, a, b } = setup()); s.stock.meal = 0; assert.equal(serveOf(s, a), undefined, '沒飯');
});

test('M24-A1 端到了家人 +90、算吃了一頓；家人走開了飯放回灶上', () => {
  let { s, a, b } = setup();
  a.x = b.x + 1; a.y = b.y; a.path = [];
  s.stock.meal--; a.hold.meal = 1; a.task = { kind: 'serve', to: b.id, left: 1 }; a.act = 'do';
  const f0 = b.needs.food, eaten0 = s.ledger.mealsEaten;
  step(s);
  assert.ok(b.needs.food >= Math.min(100, f0 + 90) - 0.5, `${f0} → ${b.needs.food}`);
  assert.equal(s.ledger.mealsEaten, eaten0 + 1);
  assert.equal(a.hold.meal, 0);
  assert.equal(s.counts.served, 1);
  assert.ok(s.events.some((e) => /端了一碗飯$/.test(e.text)));
  ({ s, a, b } = setup());
  a.x = b.x + 10; a.y = b.y; a.path = [];
  const m0 = s.stock.meal;
  s.stock.meal--; a.hold.meal = 1; a.task = { kind: 'serve', to: b.id, left: 1 }; a.act = 'do';
  step(s);
  assert.equal(s.stock.meal, m0, '飯放回灶上');
  assert.equal(s.counts.served ?? 0, 0);
});
