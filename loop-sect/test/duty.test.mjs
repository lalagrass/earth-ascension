import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, setFocus, setDuty, release } from '../src/sim.mjs';
import { assignDuty, stepDuty, dutyOf, pressure, reliability } from '../src/duty.mjs';
import { candidates } from '../src/ai.mjs';
import { scorePois } from '../src/sim.mjs';
import { DUTY, FIRE, FORCE, COOK_RAW, TICKS_PER_DAY } from '../src/data.mjs';

const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
const roles = (s) => s.people.map((p) => dutyOf(s, p));
// 值日暫停中、預設關；測規則時打開。
const was = DUTY.ON;
before(() => { DUTY.ON = true; });
after(() => { DUTY.ON = was; });

test('M18-A1 排班：三人三職各一；訪客、遠征隊員不排；指定的人保留；不排就空著', () => {
  const s = world();
  step(s);
  assert.deepEqual([...roles(s)].sort(), ['cook', 'gather', 'wood']);
  // 訪客不排。
  const [a, b, c] = s.people;
  c.guest = { arrived: 0, until: 999 };
  assignDuty(s);
  assert.equal(dutyOf(s, c), null);
  assert.deepEqual([dutyOf(s, a), dutyOf(s, b)].sort(), ['cook', 'gather'], '兩人時柴火先空');
  c.guest = null;
  // 遠征隊員不排；回來後名單變了就重排。
  b.exp = true;
  step(s);
  assert.equal(dutyOf(s, b), null);
  b.exp = false;
  step(s);
  assert.ok(dutyOf(s, b));
  // 指定的人保留，其他人補上剩下的職。
  setDuty(s, a.id, 'wood');
  assert.equal(dutyOf(s, a), 'wood');
  assert.deepEqual([dutyOf(s, b), dutyOf(s, c)].sort(), ['cook', 'gather']);
  for (let i = 0; i < TICKS_PER_DAY; i++) step(s);
  assert.equal(dutyOf(s, a), 'wood', '每日重排也保留指定');
  setDuty(s, a.id, 'none');
  assert.equal(dutyOf(s, a), null);
  setDuty(s, a.id, null);
  assert.ok(dutyOf(s, a), '改回自動又有值日');
});

test('M18-A1 排班：專長正好是某一職就排那一職；其餘看技能', () => {
  const s = world();
  const [a, b, c] = s.people;
  setFocus(s, c.id, 'cook');
  b.skills.chop = 90;
  assignDuty(s);
  assert.equal(dutyOf(s, c), 'cook');
  assert.equal(dutyOf(s, b), 'wood');
  assert.equal(dutyOf(s, a), 'gather');
});

test('M18-A1 每日 5 時重排；關掉值日時沒人值日', () => {
  const s = world();
  step(s);
  const [a, b] = s.people;
  const role = dutyOf(s, a);
  const other = s.people.find((p) => p !== a && dutyOf(s, p) !== role);
  other.skills[role === 'cook' ? 'cook' : role === 'gather' ? 'forage' : 'chop'] = 100;
  s.tick = TICKS_PER_DAY + DUTY.HOUR * 60 - 1;
  stepDuty(s);
  assert.equal(dutyOf(s, a), role, '還沒到 5 時不重排');
  s.tick++;
  stepDuty(s);
  assert.equal(dutyOf(s, other), role, '5 時重排，技能高的人接手');
  DUTY.ON = false;
  try { stepDuty(s); assert.deepEqual(roles(s), [null, null, null]); } finally { DUTY.ON = true; }
  assert.equal(was, false, '暫停中預設關');
  void b;
});

// 白天、沒飯、生莓夠，三人都不餓不累。
function kitchen() {
  const s = world();
  s.raids = []; s.visits = [];
  s.tick = 8 * 60;
  s.stock = { ...s.stock, meal: 0, raw: 10 };
  for (const p of s.people) { p.needs = { food: 60, energy: 90, social: 90, fun: 90 }; release(s, p); }
  assignDuty(s);
  return s;
}
const cookCand = (s, p) => candidates(s, p, scorePois).list.find((c) => c.kind === 'cook');

test('M18-A2 效果：伙房值日的人最想煮飯；不值日的人煮飯沒有值日加分；隨性的人加分少', () => {
  const s = kitchen();
  const cook = s.people.find((p) => dutyOf(s, p) === 'cook');
  const other = s.people.find((p) => dutyOf(s, p) !== 'cook');
  const mine = cookCand(s, cook);
  assert.ok(mine.f.duty > 0);
  assert.equal(mine.f.duty, DUTY.BONUS * pressure(s, 'cook') * reliability(cook));
  assert.equal(pressure(s, 'cook'), 1);
  assert.equal(cookCand(s, other).f.duty, undefined);
  // 同一個人放得夠近，煮飯排第一。
  const h = s.objects.find((o) => o.kind === 'hearth');
  cook.x = h.slots[0][0]; cook.y = h.slots[0][1];
  assert.equal(candidates(s, cook, scorePois).list[0].kind, 'cook');
  // 隨性程度：P = 1 只拿六成。
  assert.equal(reliability({ axes: { P: 1 } }), 1 - DUTY.SLACK);
  assert.equal(reliability({ axes: { P: -1 } }), 1);
});

test('M18-A3 餓的柴火值日：燒柴、缺木、沒飯、生莓夠時會去砍柴、扛回倉堆；不值日的人不會', () => {
  const was = FIRE.WOOD_PER_POT;
  FIRE.WOOD_PER_POT = 1;
  try {
    const s = kitchen();
    s.stock.wood = 0;
    s.stock.raw = COOK_RAW + 2;
    for (const p of s.people) p.needs.food = FORCE.food - 1;
    const wood = s.people.find((p) => dutyOf(s, p) === 'wood');
    const other = s.people.find((p) => dutyOf(s, p) !== 'wood');
    const w = candidates(s, wood, scorePois);
    assert.equal(w.forced, '太餓了，先找吃的');
    assert.ok(w.list.some((c) => c.kind === 'chop'), '柴火值日的人可以砍柴');
    assert.ok(!candidates(s, other, scorePois).list.some((c) => c.kind === 'chop'));
    // 砍完扛著木頭時，也可以扛回倉堆（loop 14：少了這步，扛著木頭餓到天黑）。
    wood.load.wood = 4;
    assert.ok(candidates(s, wood, scorePois).list.some((c) => c.kind === 'store'));
    wood.load.wood = 0;
    // 有飯就不必。
    s.stock.meal = 2;
    assert.ok(!candidates(s, wood, scorePois).list.some((c) => c.kind === 'chop'));
  } finally { FIRE.WOOD_PER_POT = was; }
});
