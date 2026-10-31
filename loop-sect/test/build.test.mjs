import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, run, placeBlueprint, cancelSite, setFocus, companionsFor, scorePois } from '../src/sim.mjs';
import { candidates } from '../src/ai.mjs';
import { nearestResources, takeResource, addWork } from '../src/build.mjs';
import { walkable } from '../src/map.mjs';
import { BLUEPRINTS, FIRST_BLUEPRINTS, TICKS_PER_DAY } from '../src/data.mjs';

const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
const full = (p) => { p.needs = { food: 95, energy: 95, social: 95, fun: 95 }; };

function conserved(s) {
  for (const [m, cut, used] of [['wood', 'woodCut', 'woodUsed'], ['stone', 'stoneCut', 'stoneUsed']]) {
    const onPeople = s.people.reduce((a, p) => a + p.load[m] + p.hold[m], 0);
    const atSites = s.sites.reduce((a, x) => a + x.have[m], 0);
    assert.equal(s.ledger[cut], s.stock[m] + onPeople + atSites + s.ledger[used], `${m} 不守恆`);
  }
}

test('M3-A1 樹被砍完變通行地', () => {
  const s = world();
  const [r] = nearestResources(s, 'wood', { x: 25, y: 24 }, 1);
  assert.equal(s.map[r.y][r.x], 'T');
  assert.equal(takeResource(s, r.x, r.y, 'wood', 5), 5);
  assert.equal(s.map[r.y][r.x], 'T');
  assert.equal(takeResource(s, r.x, r.y, 'wood', 5), 3);
  assert.ok(walkable(s.map, r.x, r.y));
});

test('M3-A1 自主採集：沒有工地時也會砍樹敲石並扛回倉堆', () => {
  const s = run(world(), TICKS_PER_DAY);
  assert.ok(s.ledger.woodCut > 0 && s.ledger.stoneCut > 0);
  assert.ok(s.stock.wood + s.stock.stone > 0, '倉堆應有東西');
  conserved(s);
});

test('M3-A2/A4 放三張藍圖、跑到完工：守恆、柵欄擋路、茅屋有牆與床、灶台升級', () => {
  const s = world(2);
  s.tick = 360;
  for (const id of FIRST_BLUEPRINTS) assert.equal(placeBlueprint(s, id).ok, true);
  assert.equal(placeBlueprint(s, 'fence-s').ok, false, '同一張藍圖不能放兩次');
  for (let t = 0; t < TICKS_PER_DAY * 5 && s.built.length < 3; t++) { step(s); if (t % 50 === 0) conserved(s); }
  conserved(s);
  assert.equal(s.built.length, 3, `只完工 ${s.built.join(',')}`);
  const fence = BLUEPRINTS.find((b) => b.id === 'fence-s');
  for (const [x, y] of fence.cells) assert.equal(s.map[y][x], 'F');
  assert.ok(walkable(s.map, 29, 30), '柵欄門口要留著');
  assert.equal(s.map[15][39], '#');
  assert.equal(s.map[19][41], '_', '茅屋門');
  assert.equal(s.objects.filter((o) => o.label === '茅屋床').length, 2);
  assert.equal(s.objects.find((o) => o.kind === 'hearth').level, 1);
  for (const p of s.people) assert.ok(walkable(s.map, Math.round(p.x), Math.round(p.y)), `${p.name} 被圍在牆裡`);
});

test('M3-A4 道館床被占時，累的人會選茅屋床', () => {
  const s = world(2);
  const bp = BLUEPRINTS.find((b) => b.id === 'hut-e');
  const r = placeBlueprint(s, 'hut-e');
  const site = r.site;
  site.have = { ...site.need };
  s.ledger.woodCut += site.need.wood; s.ledger.stoneCut += site.need.stone;
  for (const p of s.people) { p.x = 31; p.y = 25; }
  addWork(s, site, site.workTotal);
  assert.ok(s.built.includes('hut-e'));
  for (const o of s.objects.filter((x) => x.kind === 'bed' && x.label === '地鋪')) o.users[0] = 'someone';
  const p = s.people[0];
  p.needs = { food: 90, energy: 20, social: 90, fun: 90 };
  s.tick = 23 * 60;
  const { list } = candidates(s, p, scorePois);
  assert.equal(list[0].kind, 'sleep');
  assert.ok(bp.beds.some(([x, y]) => x === list[0].spot.x && y === list[0].spot.y));
});

test('M3-A4 石灶台：一鍋 4 份、煮得比較快', () => {
  const s = world(2);
  const h = s.objects.find((o) => o.kind === 'hearth');
  const cook = (level) => {
    const w = world(2);
    w.objects.find((o) => o.kind === 'hearth').level = level;
    const p = w.people[0];
    for (const o of w.people) full(o);
    w.stock.meal = 0;
    const before = w.ledger.mealsMade;
    let t = 0;
    while (w.ledger.mealsMade === before && t < 600) { step(w); t++; }
    return { made: w.ledger.mealsMade - before, t };
  };
  const a = cook(0), b = cook(1);
  assert.equal(a.made, 3);
  assert.equal(b.made, 4);
  assert.ok(h.level === 0);
});

test('M3-A5 取消工地：退回材料、搬運中的人改送倉堆、守恆', () => {
  const s = world(3);
  s.tick = 360;
  placeBlueprint(s, 'hut-e');
  let site = s.sites[0];
  let t = 0;
  while (t < TICKS_PER_DAY * 3 && !(site.have.wood > 0 && s.people.some((p) => p.task?.kind === 'haul'))) { step(s); t++; }
  assert.ok(site.have.wood > 0, '應該已經送到一些料');
  const back = site.have.wood;
  const stock = s.stock.wood;
  const reserved = s.people.reduce((a, p) => a + p.hold.wood, 0); // 還沒拿起的預約料也退回
  cancelSite(s, site.id);
  assert.equal(s.sites.length, 0);
  assert.equal(s.stock.wood, stock + back + reserved);
  for (const p of s.people) assert.ok(!p.task || p.task.kind !== 'haul');
  conserved(s);
  for (let i = 0; i < 600; i++) step(s);
  conserved(s);
  assert.ok(s.people.every((p) => p.load.wood === 0 || p.task?.kind === 'store' || p.act !== 'idle'));
});

test('M3-A8 指定伐木的人砍樹時間較多', () => {
  const chopTime = (focus) => {
    const s = world(5);
    if (focus) setFocus(s, 'p1', 'wood');
    let n = 0;
    for (let t = 0; t < TICKS_PER_DAY * 2; t++) { step(s); const p = s.people[1]; if (p.task?.kind === 'chop') n++; }
    return n;
  };
  const a = chopTime(false), b = chopTime(true);
  assert.ok(b > a * 1.5, `指定 ${b} vs 未指定 ${a}`);
});
