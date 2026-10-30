import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, placeBlueprint, release, stateHash } from '../src/sim.mjs';
import { formOf, shapeOf, period, sizeOf, bestMove, stepStrike } from '../src/forms.mjs';
import { MOVES, FORMS, MARTIAL, TICKS_PER_DAY, BLUEPRINTS } from '../src/data.mjs';
import { walkable } from '../src/map.mjs';

const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });

test('M13-A1 每招都有形狀；四種形狀兩兩分得開', () => {
  for (const m of MOVES) assert.ok(FORMS[m.form], `${m.label} 沒有形狀`);
  const forms = Object.keys(FORMS);
  assert.equal(forms.length, 4);
  const sh = Object.fromEntries(forms.map((f) => [f, shapeOf(f, 1)]));
  for (let i = 0; i < forms.length; i++) for (let j = i + 1; j < forms.length; j++) {
    const a = sh[forms[i]], b = sh[forms[j]];
    const apart = a.shape !== b.shape || Math.abs(a.reach - b.reach) / Math.max(a.reach, b.reach) >= 0.3 || Math.abs(a.spread - b.spread) >= 40 * Math.PI / 180;
    assert.ok(apart, `${forms[i]} 跟 ${forms[j]} 分不開`);
  }
  assert.equal(new Set(Object.values(sh).map((x) => x.shape)).size, 4, '四種形狀類型都不同');
  assert.equal(formOf('changquan'), 'fist');
  assert.equal(formOf('kaishan'), 'palm');
});

// 一個人在木樁前一直練，量出手次數。
function drillFor(v, ticks = 600) {
  const s = world();
  s.raids = []; s.visits = [];
  const [a, ...rest] = s.people;
  for (const p of rest) { release(s, p); p.task = { kind: 'idle', left: 99999 }; p.act = 'do'; }
  const dummy = s.objects.find((o) => o.kind === 'dummy');
  a.moves.changquan = v;
  a.x = dummy.slots[0][0]; a.y = dummy.slots[0][1]; a.path = [];
  a.task = { kind: 'drill', obj: dummy.id, slot: 0, move: 'changquan', left: 1e9 }; a.act = 'do'; dummy.users[0] = a.id;
  let n = 0, last = null, sizes = [];
  for (let i = 0; i < ticks; i++) {
    a.needs = { food: 90, energy: 90, social: 90, fun: 90 };
    a.moves.changquan = v;
    step(s);
    if (a.strike && a.strike !== last) { n++; last = a.strike; sizes.push(a.strike.size); }
  }
  return { n, size: sizes[0], s, a };
}

test('M13-A2 熟練 80 出手比 20 密 ≥ 1.3 倍；大小隨熟練變大', () => {
  const lo = drillFor(20), hi = drillFor(80);
  assert.ok(hi.n >= 1.3 * lo.n, `熟練 80 出手 ${hi.n} 次、20 出手 ${lo.n} 次`);
  assert.equal(period(20), 14);
  assert.equal(period(80), 10);
  assert.ok(hi.size > lo.size);
  assert.equal(lo.size, sizeOf(20));
});

test('M13-A3 練功、切磋、迎敵都會出手；迎敵出最強的招；閒著不出手；出招不影響雜湊', () => {
  const { a } = drillFor(50, 30);
  assert.equal(a.strike.kind, 'drill');
  assert.equal(a.strike.form, 'fist');
  const p = { moves: { changquan: 90, kaishan: 40, liuyun: 10 } };
  assert.equal(bestMove(p), 'changquan', '1×90 > 2×40');
  p.moves.kaishan = 60;
  assert.equal(bestMove(p), 'kaishan');
  // 迎敵與閒著。
  const s = world();
  const b = s.people[0];
  b.act = 'do'; b.task = { kind: 'fight', enemy: 'e9' };
  stepStrike(s, b, { x: b.x + 1, y: b.y });
  assert.equal(b.strike.kind, 'fight');
  assert.equal(b.strike.move, bestMove(b));
  const at = b.strike.at;
  b.task = { kind: 'sit' };
  s.tick += 50;
  stepStrike(s, b, null);
  assert.equal(b.strike.at, at, '閒著不出手');
  // 出招記錄不進雜湊：清掉出招紀錄雜湊不變。
  const t = world(); for (let i = 0; i < 2000; i++) step(t);
  const h = stateHash(t);
  for (const q of t.people) { q.strike = null; q.strikeNext = null; }
  assert.equal(stateHash(t), h);
  const u = world(); for (let i = 0; i < 2000; i++) step(u);
  assert.equal(stateHash(u), h, '同種子兩次雜湊相同');
});

test('M13-A4 外功場：完工後夯土可走、多三個木人；在那裡練完熟練是一般木樁的 1.25 倍', () => {
  const s = world();
  s.raids = []; s.visits = [];
  s.stock.wood = 20; s.stock.stone = 10;
  assert.ok(placeBlueprint(s, 'yard').ok);
  for (let i = 0; i < 2 * TICKS_PER_DAY && !s.built.includes('yard'); i++) step(s);
  assert.ok(s.built.includes('yard'), '外功場應該完工');
  const bp = BLUEPRINTS.find((b) => b.id === 'yard');
  for (const [x, y] of bp.cells) { assert.equal(s.map[y][x], 'w'); assert.ok(walkable(s.map, x, y)); }
  const yd = s.objects.filter((o) => o.kind === 'dummy' && o.yard);
  assert.equal(yd.length, 3);
  // 同一人、同熟練，在外功場與一般木樁各練完一次。
  const gain = (obj) => {
    const t = world();
    t.raids = []; t.visits = [];
    if (obj.yard) t.objects.push({ ...obj, users: [null] });
    const a = t.people[0];
    for (const p of t.people.slice(1)) { release(t, p); p.task = { kind: 'idle', left: 99999 }; p.act = 'do'; }
    a.moves.changquan = 10; a.x = obj.slots[0][0]; a.y = obj.slots[0][1]; a.path = [];
    const o = t.objects.find((x) => x.id === obj.id);
    a.task = { kind: 'drill', obj: o.id, slot: 0, move: 'changquan', left: 1 }; a.act = 'do'; o.users[0] = a.id;
    const before = a.moves.changquan;
    step(t);
    return a.moves.changquan - before;
  };
  const plain = gain(s.objects.find((o) => o.kind === 'dummy' && !o.yard));
  const yard = gain(yd[0]);
  assert.ok(Math.abs(yard / plain - MARTIAL.YARD_MUL) < 1e-9, `外功場 ${yard}、一般 ${plain}`);
});
