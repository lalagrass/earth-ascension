import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, scorePois } from '../src/sim.mjs';
import { candidates } from '../src/ai.mjs';
import { raidSchedule, spawnEnemy, activeEnemies } from '../src/raid.mjs';
import { setTile } from '../src/build.mjs';
import { walkable } from '../src/map.mjs';
import { seedHolder } from '../src/rng.mjs';
import { RAID, DEFENSE, ENEMIES, BLUEPRINTS, TICKS_PER_DAY } from '../src/data.mjs';

const world = (seed = 4, tpl = 'qiaofeng') => createWorld({ seed, people: [{ template: tpl, name: '甲' }, ...companionsFor(seed, tpl)] });
const calm = (p) => { p.needs = { food: 95, energy: 95, social: 95, fun: 95 }; };
const busy = (p) => { p.act = 'do'; p.task = { kind: 'idle', left: 99999 }; };
const fenceUp = (s) => { for (const [x, y] of BLUEPRINTS.find((b) => b.id === 'fence-s').cells) setTile(s, x, y, 'F'); };
// 只跑敵人那一側：所有人都在忙，不會迎敵。
const runAlone = (s, n, each = () => {}) => { for (let i = 0; i < n; i++) { for (const p of s.people) busy(p); step(s); each(); } };

test('M7-A1 排程：決定論、第 2 日起每天一次、白天、頭數遞增、山賊第 3 日起', () => {
  const a = raidSchedule(3), b = raidSchedule(3);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, raidSchedule(4));
  for (const [i, r] of a.entries()) {
    const day = Math.floor(r.tick / TICKS_PER_DAY), hour = (r.tick % TICKS_PER_DAY) / 60;
    assert.equal(day, RAID.START_DAY + i);
    assert.ok(hour >= RAID.HOUR_FROM && hour < RAID.HOUR_TO, `第 ${day + 1} 日 ${hour} 時`);
    if (day < RAID.BANDIT_DAY) assert.ok(r.kinds.every((k) => k === 'boar'));
  }
  assert.ok(a[3].kinds.length >= a[0].kinds.length + 1);
});

test('M7-A2 野豬撞柵欄：耐久歸零變斷柵，途中不站在擋路格', () => {
  const s = world();
  fenceUp(s);
  s.raids = [];
  const e = spawnEnemy(s, 'boar', 36);
  let broke = null;
  runAlone(s, 400, () => {
    const x = Math.round(e.x), y = Math.round(e.y);
    assert.ok(walkable(s.map, x, y), `野豬站在 ${x},${y}`);
    if (!broke && s.map.join('').includes('f')) broke = s.tick;
  });
  assert.ok(broke, '離門口遠的野豬應該撞破柵欄');
  assert.ok(s.events.some((x) => x.kind === 'breach'));
});

test('M7-A3 偷：野豬到灶邊吃掉生莓，帳上記一筆（守恆由 soak 每 tick 檢查）', () => {
  const s = world();
  s.raids = [];
  s.stock.raw = 6;
  const e = spawnEnemy(s, 'boar', 34);
  runAlone(s, 600);
  const L = s.ledger;
  assert.equal(L.rawStolen, ENEMIES.boar.steal);
  assert.equal(s.stock.raw, 6 - ENEMIES.boar.steal);
  assert.ok(!s.enemies.includes(e), '偷完應該離開');
});

// a 在灶邊、精神好；另外兩人在忙。野豬來，看 a 打退牠花多久。
function defend(s, strong) {
  const [a, b, c] = s.people;
  busy(b); busy(c); calm(a);
  if (strong) a.moves = { changquan: 100, kaishan: 100, liuyun: 100 };
  s.raids = []; s.tick = 10 * 60;
  a.x = 34; a.y = 28; a.act = 'idle'; a.task = null; a.wait = 0;
  s.stock.raw = 6;
  const e = spawnEnemy(s, 'boar', 34);
  let first = null, done = null;
  for (let t = 0; t < 800 && !done; t++) {
    step(s); busy(b); busy(c); a.needs.food = 95;
    if (first === null && e.hp < e.hpMax) first = t;
    if (e.hp <= 0) done = t;
  }
  return { ticks: done === null ? Infinity : done - first, s, a };
}

test('M7-A4 迎敵：只改武力，打退得比較快；打退的不偷；出手的人熟練上升', () => {
  const weak = defend(world(), false), strong = defend(world(), true);
  assert.ok(Number.isFinite(weak.ticks), '生手也該打得退一頭野豬');
  assert.ok(strong.ticks < weak.ticks * 0.6, `強 ${strong.ticks} vs 弱 ${weak.ticks}`);
  for (let i = 0; i < 300; i++) step(weak.s);
  assert.equal(weak.s.ledger.rawStolen, 0, '被打退的野豬不該偷到');
  assert.ok(weak.a.moves.changquan > 0, '實戰應該長功');
});

test('M7-A5 膽識：只改武力，迎敵分數較高、躲的分數較低', () => {
  const s = world();
  const a = s.people[0];
  calm(a);
  s.raids = [];
  spawnEnemy(s, 'boar', 31);
  const pick = () => {
    const { list } = candidates({ ...s, ...seedHolder(5) }, a, scorePois);
    return { fight: list.find((c) => c.kind === 'fight').f.work, hide: list.find((c) => c.kind === 'hide').f.persona };
  };
  const before = pick();
  a.moves = { changquan: 100, kaishan: 100 };
  const after = pick();
  assert.ok(after.fight > before.fight && after.hide < before.hide, JSON.stringify({ before, after }));
});

test('M7-A6 修補：有斷柵和木頭就有人去修，木頭扣 1、格子變回柵欄', () => {
  const s = world();
  fenceUp(s);
  s.raids = [];
  setTile(s, 35, 30, 'f');
  s.stock.wood = 3;
  const [a, b, c] = s.people;
  for (const p of s.people) calm(p);
  busy(b); busy(c);
  a.focus = 'guard'; s.tick = 9 * 60;
  for (let t = 0; t < 600 && s.map[30][35] !== 'F'; t++) { step(s); a.needs.food = 95; busy(b); busy(c); }
  assert.equal(s.map[30][35], 'F');
  assert.equal(s.ledger.woodUsed, 1);
  assert.equal(s.stock.wood, 2);
});

test('M7 敵人期間沒人時也會離開（不卡住）', () => {
  const s = world();
  s.raids = [];
  spawnEnemy(s, 'bandit', 20);
  runAlone(s, RAID.MAX_LIFE + 400);
  assert.equal(activeEnemies(s).length, 0);
  assert.equal(s.enemies.filter((e) => e.mode !== 'guard').length, 0, '守巢的（M9）不算');
  assert.ok(DEFENSE.FENCE_HP > 0);
});
