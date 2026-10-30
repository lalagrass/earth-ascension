import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, placeBlueprint, release, scorePois, canTrial } from '../src/sim.mjs';
import { candidates } from '../src/ai.mjs';
import { spawnEnemy } from '../src/raid.mjs';
import { eligible, retreatReason } from '../src/expedition.mjs';
import { speedOf } from '../src/person.mjs';
import { hurt, heal } from '../src/injury.mjs';
import { INJURY, HERB, ENEMIES, TICKS_PER_DAY, BLUEPRINTS } from '../src/data.mjs';

// loop 18 暫停：預設 RATE 0（不受傷）。規則的測試在 RATE 1 下跑，跑完還原。
const ON = (fn) => () => { const r = INJURY.RATE; INJURY.RATE = 1; try { fn(); } finally { INJURY.RATE = r; } };
const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
const fed = (s) => { for (const p of s.people) p.needs = { food: 95, energy: 95, social: 95, fun: 95 }; };
const park = (s, except = []) => { for (const p of s.people) if (!except.includes(p)) { release(s, p); p.task = { kind: 'idle', left: 99999 }; p.act = 'do'; } };

test('M16-A1 受傷：扣多少精力加多少傷勢；跨過門檻有紀事與泡泡', ON(() => {
  const s = world();
  s.raids = []; s.visits = [];
  const [a] = s.people;
  park(s, [a]);
  const e = spawnEnemy(s, 'boar', 30);
  e.mode = 'come'; e.hp = 1e9; e.path = [];
  a.x = e.x - 1; a.y = e.y; a.path = [];
  a.task = { kind: 'fight', enemy: e.id, dealt: 0, chase: 80 }; a.act = 'do'; a.task.left = 9999;
  a.needs.energy = 100;
  let drained = 0, crossed = null;
  for (let i = 0; i < 200 && a.task?.kind === 'fight'; i++) {
    const h0 = a.hurt;
    a.needs.food = 95;
    step(s);
    if (a.task?.kind !== 'fight') break;
    drained += ENEMIES.boar.hit; // 只有甲一人纏著
    assert.ok(Math.abs(a.hurt - Math.max(0, h0 - INJURY.HEAL) - ENEMIES.boar.hit * INJURY.RATE) < 1e-9, '傷勢跟著扣掉的精力加（先扣這 tick 的休養）');
    if (crossed == null && hurt(a)) crossed = s.tick;
  }
  assert.ok(crossed, `應該受傷（被扣 ${drained.toFixed(1)}）`);
  const ev = s.events.find((x) => x.kind === 'hurt');
  assert.match(ev.text, /^甲迎戰野豬時受了傷$/);
  assert.equal(s.events.filter((x) => x.kind === 'hurt').length, 1, '跨過門檻只記一次');
}));

test('M16-A2 受傷的效果：走得慢、不練功切磋迎敵演武、不去遠征、慢慢好', ON(() => {
  const s = world();
  s.raids = []; s.visits = [];
  fed(s);
  const [a] = s.people;
  const v0 = speedOf(a);
  a.hurt = INJURY.MIN;
  assert.ok(Math.abs(speedOf(a) / v0 - INJURY.SLOW) < 1e-9);
  spawnEnemy(s, 'boar', 30).mode = 'come';
  s.built.push('yard');
  const kinds = new Set(candidates(s, a, scorePois).list.map((c) => c.kind));
  for (const k of ['drill', 'spar', 'fight', 'watch']) assert.ok(!kinds.has(k), `受傷時不該有 ${k}`);
  assert.ok(kinds.has('hide'), '敵人來了會躲');
  assert.match(canTrial(s, a).why, /受了傷/);
  assert.equal(eligible(a), false, '不能去遠征');
  a.hurt = INJURY.MIN - 0.01;
  assert.ok(candidates(s, a, scorePois).list.some((c) => c.kind === 'fight'), '門檻以下照常');
  assert.equal(eligible(a), true);
  // 休養
  a.hurt = 10; heal(a, false); assert.ok(Math.abs(a.hurt - (10 - INJURY.HEAL)) < 1e-12);
  a.hurt = 10; heal(a, true); assert.ok(Math.abs(a.hurt - (10 - INJURY.HEAL_SLEEP)) < 1e-12);
  a.hurt = 0.001; heal(a, true); assert.equal(a.hurt, 0);
  // 傷重撤退排在最前面
  const b = s.people[1];
  b.hurt = INJURY.HEAVY; b.needs.energy = 10;
  assert.equal(retreatReason(s, [a, b], 10), '傷重');
  b.hurt = INJURY.HEAVY - 1;
  assert.equal(retreatReason(s, [a, b], 10), '精力不支');
}));

test('M16-A3 藥園：兩畦藥畦；收成進藥草、菜不變；藥草夠了不種不收', ON(() => {
  const s = world();
  s.raids = []; s.visits = [];
  s.stock.wood = 10;
  assert.ok(placeBlueprint(s, 'herbs').ok);
  for (let i = 0; i < TICKS_PER_DAY && !s.built.includes('herbs'); i++) { fed(s); step(s); }
  assert.ok(s.built.includes('herbs'));
  const bp = BLUEPRINTS.find((b) => b.id === 'herbs');
  assert.equal(s.plots.filter((g) => g.herb).length, bp.cells.length);
  const [a] = s.people;
  park(s, [a]);
  release(s, a); a.task = null; a.act = 'idle'; a.wait = 0;
  const g = s.plots.find((x) => x.herb);
  g.stage = 'ripe';
  a.x = g.x; a.y = g.y; a.path = [];
  const veg0 = s.ledger.veg, carry0 = a.carry;
  const list = candidates(s, a, scorePois).list;
  const c = list.find((x) => x.kind === 'harvest' && x.plot === g.id);
  assert.ok(c, '熟了的藥畦有採藥候選');
  a.task = { kind: 'harvest', plot: g.id, left: 1 }; a.act = 'do'; g.user = a.id;
  fed(s); step(s);
  assert.equal(s.stock.herb, HERB.YIELD);
  assert.equal(s.ledger.veg, veg0, '菜不變');
  assert.equal(a.carry, carry0, '藥草不扛在身上');
  assert.equal(g.stage, 'empty');
  s.stock.herb = HERB.TARGET;
  g.stage = 'ripe';
  release(s, a); a.task = null; a.act = 'idle';
  assert.ok(!candidates(s, a, scorePois).list.some((x) => x.plot && byHerb(s, x.plot)), '藥草夠了不種不收');
}));
const byHerb = (s, id) => s.plots.find((g) => g.id === id)?.herb;

test('M16-A4 煎藥：受傷又有藥才有候選；喝了用掉一份、傷勢退 MED', ON(() => {
  const s = world();
  s.raids = []; s.visits = [];
  const [a] = s.people;
  park(s, [a]);
  release(s, a); a.task = null; a.act = 'idle'; a.wait = 0;
  fed(s);
  a.hurt = INJURY.MIN + 10;
  assert.ok(!candidates(s, a, scorePois).list.some((c) => c.kind === 'medicate'), '沒藥時沒有');
  s.stock.herb = 1;
  assert.ok(candidates(s, a, scorePois).list.some((c) => c.kind === 'medicate'), '有藥時有');
  a.hurt = INJURY.MIN - 1;
  assert.ok(!candidates(s, a, scorePois).list.some((c) => c.kind === 'medicate'), '沒受傷時沒有');
  a.hurt = INJURY.MIN + 10;
  const h = s.objects.find((o) => o.kind === 'hearth');
  a.x = h.slots[0][0]; a.y = h.slots[0][1]; a.path = [];
  a.task = { kind: 'medicate', obj: h.id, slot: -1, left: 1 }; a.act = 'do';
  const before = a.hurt;
  fed(s); step(s);
  assert.equal(s.stock.herb, 0);
  assert.ok(Math.abs(before - a.hurt - INJURY.MED - INJURY.HEAL) < 1e-9, `傷勢 ${before}→${a.hurt}`);
}));

test('M16 暫停時：預設不會受傷', () => {
  assert.equal(INJURY.RATE, 0);
});
