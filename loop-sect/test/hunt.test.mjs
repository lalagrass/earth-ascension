import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, placeBlueprint, release, scorePois, stateHash } from '../src/sim.mjs';
import { candidates } from '../src/ai.mjs';
import { huntChance } from '../src/hunt.mjs';
import { walkable } from '../src/map.mjs';
import { standSpot } from '../src/build.mjs';
import { HUNT, TICKS_PER_DAY } from '../src/data.mjs';

const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
const fed = (s) => { for (const p of s.people) p.needs = { food: 95, energy: 95, social: 95, fun: 95 }; };
const park = (s, keep) => { for (const p of s.people) if (!keep.includes(p)) { release(s, p); p.task = { kind: 'idle', left: 99999 }; p.act = 'do'; } };
function withLodge(seed = 4) {
  const s = world(seed);
  s.raids = []; s.visits = [];
  s.stock.wood = 20;
  assert.ok(placeBlueprint(s, 'lodge').ok);
  for (let i = 0; i < 2 * TICKS_PER_DAY && !(s.built.includes('lodge') && s.deer?.length); i++) { fed(s); step(s); }
  assert.ok(s.built.includes('lodge'), '小屋應該完工');
  return s;
}
const lodged = withLodge();

test('M19a-A1 小屋完工後林間有鹿；沒有小屋時沒有', () => {
  const s0 = world();
  for (let i = 0; i < 200; i++) step(s0);
  assert.ok(!s0.deer);
  const s = structuredClone(lodged);
  assert.ok(s.objects.some((o) => o.kind === 'lodge'));
  assert.ok(s.deer.length >= HUNT.HERD - 1, `鹿 ${s.deer.length}`); // 完工到這一刻可能已有人打走一頭
  for (const d of s.deer) {
    assert.ok(d.x >= HUNT.X0 && d.x <= HUNT.X1, `x ${d.x}`);
    assert.ok(walkable(s.map, d.x, d.y) && standSpot(s, d.x, d.y));
  }
});

test('M19a-A2 打獵：有候選、訪客沒有；成功扛肉、帳上加；鹿離開、之後補回', () => {
  const s = structuredClone(lodged);
  const [a, g] = s.people;
  park(s, [a, g]);
  for (const p of [a, g]) { release(s, p); p.task = null; p.act = 'idle'; p.wait = 0; p.carry = 0; p.load = { wood: 0, stone: 0 }; }
  fed(s);
  g.guest = { arrived: 0, until: 1e9 };
  assert.ok(candidates(s, a, scorePois).list.some((c) => c.kind === 'hunt'));
  assert.ok(!candidates(s, g, scorePois).list.some((c) => c.kind === 'hunt'), '訪客不打獵');
  g.guest = null; park(s, [a]);
  // 讓甲一定打中：身法拉高。
  a.attrs.shen = 10;
  const d = s.deer[0];
  const spot = standSpot(s, d.x, d.y);
  a.x = spot.x; a.y = spot.y; a.path = [];
  a.task = { kind: 'hunt', deer: d.id, left: 1 }; a.act = 'do'; d.user = a.id;
  const picked0 = s.ledger.picked, n0 = s.deer.length;
  let ok = 0;
  for (let k = 0; k < 20 && !ok; k++) {
    const t = structuredClone(s);
    const ta = t.people[0];
    t.rng = (t.rng + k * 7919) >>> 0;
    fed(t); step(t);
    if (ta.carry === HUNT.MEAT) {
      ok++;
      assert.equal(t.ledger.picked - picked0, HUNT.MEAT);
      assert.equal(t.ledger.meat, HUNT.MEAT);
      assert.equal(t.deer.length, n0 - 1, '鹿離開');
      for (let i = 0; i < HUNT.RESPAWN + 2; i++) { fed(t); step(t); }
      assert.ok(t.deer.length >= n0 - 1 && t.deer.some((x) => !s.deer.some((y) => y.id === x.id)), '補回一頭');
    }
  }
  assert.ok(ok, '換幾次亂數應該有一次打中');
});

test('M19a-A3 身法高的人比較會打；決定論', () => {
  assert.ok(huntChance({ attrs: { shen: 9 } }) > huntChance({ attrs: { shen: 2 } }));
  const a = structuredClone(lodged), b = structuredClone(lodged);
  for (let i = 0; i < 600; i++) { step(a); step(b); }
  assert.equal(stateHash(a), stateHash(b));
  assert.deepEqual(a.deer, b.deer);
});
