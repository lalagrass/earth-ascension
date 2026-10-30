import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, release, companionsFor, scorePois } from '../src/sim.mjs';
import { candidates } from '../src/ai.mjs';
import { moveGain, compChance, comprehendable, practice, drillMove, prowess, newMoves } from '../src/martial.mjs';
import { addAff, prestige } from '../src/social.mjs';
import { fromTemplate } from '../src/person.mjs';
import { seedHolder } from '../src/rng.mjs';
import { MOVES, START_MOVES, MARTIAL, SKILLS } from '../src/data.mjs';

const world = (seed = 4, tpl = 'guojing') => createWorld({ seed, people: [{ template: tpl, name: '甲' }, ...companionsFor(seed, tpl)] });
const calm = (p) => { p.needs = { food: 95, energy: 95, social: 95, fun: 95 }; };
const fighter = (tpl) => { const p = fromTemplate(tpl, { id: tpl }); p.moves = newMoves(); p.skills = Object.fromEntries(SKILLS.map((s) => [s.id, 0])); return p; };
// 讓其他人去忙，只留 a 自主行動。
const busy = (p) => { p.act = 'do'; p.task = { kind: 'idle', left: 99999 }; };

test('M6-A1 招式資料：前置都存在、起始招無前置、每招都領悟得到', () => {
  const ids = new Set(MOVES.map((m) => m.id));
  for (const m of MOVES) for (const k of Object.keys(m.req ?? {})) assert.ok(ids.has(k), `${m.id} 的前置 ${k} 不存在`);
  for (const id of START_MOVES) assert.equal(MOVES.find((m) => m.id === id).req, null);
  // 從起始招出發，熟練都練滿，每招都能進入可領悟清單。
  const p = fighter('guojing');
  const reached = new Set(START_MOVES);
  for (let round = 0; round < MOVES.length; round++) {
    for (const id of Object.keys(p.moves)) p.moves[id] = 100;
    for (const m of comprehendable(p)) { p.moves[m.id] = 0; reached.add(m.id); }
  }
  assert.equal(reached.size, MOVES.length);
});

test('M6-A1 打木樁：做完才長熟練，中途打斷不加', () => {
  const s = world();
  const [a, b, c] = s.people;
  calm(a); busy(b); busy(c);
  a.needs.fun = 30; s.tick = 9 * 60;
  a.focus = 'martial'; // 開局倉堆是空的，不指定的話會先去伐木採石
  let t = 0;
  while (!(a.task?.kind === 'drill' && a.act === 'do') && t < 600) { step(s); t++; a.needs.food = 95; }
  assert.equal(a.task?.kind, 'drill', '指定練功時應該會去打木樁');
  step(s);
  release(s, a); a.act = 'idle';
  assert.equal(a.moves.changquan, 0, '被打斷的練功不該長');
  while (a.moves.changquan === 0 && t < 2000) { step(s); t++; a.needs.food = 95; }
  assert.ok(a.moves.changquan > 0, '練完一次應該長');
});

test('M6-A2 熟練邊際遞減、天賦對應；悟性高、直覺型開竅快', () => {
  const g = fighter('guojing'), h = fighter('huangrong');   // 根骨 9／2，悟性 2／10
  assert.ok(moveGain(g, 'changquan') > moveGain(h, 'changquan'));
  assert.ok(compChance(h) > compChance(g) * 2);
  const first = moveGain(g, 'changquan');
  g.moves.changquan = 60;
  assert.ok(moveGain(g, 'changquan') < first);
  // 同樣練到門檻後，平均要練幾次才領悟（200 次試驗）。
  const avg = (tpl) => {
    let total = 0;
    for (let k = 0; k < 200; k++) {
      const p = fighter(tpl); p.moves.changquan = 30;
      const st = seedHolder(k + 1);
      let n = 0;
      while (!practice(st, p, 'changquan') && n < 500) n++;
      total += n + 1;
    }
    return total / 200;
  };
  const slow = avg('guojing'), fast = avg('huangrong');
  assert.ok(fast < slow * 0.6, `悟性 10 平均 ${fast.toFixed(1)} 次、悟性 2 平均 ${slow.toFixed(1)} 次`);
});

test('M6-A2 前置不足不會領悟；要練哪招：熟練最低的', () => {
  const p = fighter('huangrong');
  p.moves.changquan = 29;
  assert.equal(comprehendable(p).length, 0);
  const st = seedHolder(3);
  for (let i = 0; i < 50 && p.moves.changquan < 29.9; i++) practice(st, p, 'changquan', 0);
  assert.equal(Object.keys(p.moves).length, 1);
  p.moves = { changquan: 80, kaishan: 10, liuyun: 40 };
  assert.equal(drillMove(p), 'kaishan');
  assert.ok(Math.abs(prowess(p) - (0.8 + 0.2 + 0.8)) < 1e-9);
});

test('M6-A3 強者有名望：只改武力，名望上升', () => {
  const a = fighter('guojing'), b = fighter('guojing');
  b.moves = { changquan: 100, kaishan: 100 };
  assert.ok(Math.abs(prestige(b) - prestige(a) - 3 * MARTIAL.PRESTIGE_PER_POWER) < 1e-9);
});

// a、b 相識，站在一起、都有精神；第三人在忙。跑到 a 這次切磋結束。
function sparOnce(s, stage = 12) {
  const [a, b, c] = s.people;
  for (const o of s.people) calm(o);
  busy(c);
  addAff(s, a, b, stage); addAff(s, b, a, stage);
  s.tick = 10 * 60;
  b.act = 'idle'; b.task = null; b.wait = 400;
  a.x = b.x; a.y = b.y; a.needs.fun = 20;
  a.focus = 'martial';
  // 讓 a 只看得到切磋（拿掉木樁，否則專長也會加在練功上）。
  s.objects = s.objects.filter((o) => o.kind !== 'dummy');
  let started = false;
  for (let t = 0; t < 400; t++) {
    step(s);
    a.needs.food = 95; b.needs.food = 95;
    if (a.task?.kind === 'spar' && a.act === 'do') started = true;
    if (started && a.task?.kind !== 'spar') break;
  }
  return started;
}

test('M6-A4 切磋：雙方熟練與好感都上升', () => {
  const s = world(4, 'qiaofeng');
  const [a, b] = s.people;
  assert.ok(sparOnce(s), '相識又有精神時應該切磋');
  assert.ok(a.moves.changquan > 0 && b.moves.changquan > 0);
  // 切磋比打木樁長得多。
  const one = fighter('qiaofeng');
  assert.ok(a.moves.changquan > moveGain(one, 'changquan') * 1.2);
  assert.ok(s.aff['p0>p1'] > 12 && s.aff['p1>p0'] > 12);
  assert.ok(s.counts.sparDone >= 2);
});

test('M6-A4 有成見的人不切磋；沒力氣的人不切磋；陌生人可以以武會友', () => {
  const s = world(4, 'qiaofeng');
  const [a, b] = s.people;
  calm(a); calm(b);
  const has = () => candidates({ ...s, ...seedHolder(9) }, a, scorePois).list.some((c) => c.kind === 'spar' && c.partner === b.id);
  assert.equal(has(), true, '陌生也可以找切磋');
  addAff(s, a, b, -3);
  assert.equal(has(), false, '有成見不該找');
  addAff(s, a, b, 15);
  assert.equal(has(), true);
  b.needs.energy = MARTIAL.SPAR_MIN_ENERGY - 1;
  assert.equal(has(), false, '對方沒力氣不該找');
});

test('M6-A4 指點：朋友以上切磋會學到對方的招，陌生到相識不會', () => {
  const run = (stage) => {
    let learned = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const s = world(seed, 'qiaofeng');
      s.people[1].moves.kaishan = 60;
      sparOnce(s, stage);
      if ('kaishan' in s.people[0].moves) learned++;
    }
    return learned;
  };
  assert.equal(run(12), 0, '相識不該被指點');
  const n = run(40);
  assert.ok(n >= 5 && n <= 20, `朋友 30 次切磋學會 ${n} 次（期望約 ${30 * MARTIAL.POINT_P}）`);
});

test('M6-A6 只改定力：定力高的人練功候選分數較高', () => {
  const s = world();
  const a = s.people[0];
  calm(a);
  const drill = () => candidates({ ...s, ...seedHolder(5) }, a, scorePois).list.find((c) => c.kind === 'drill');
  const base = drill();
  a.attrs = { ...a.attrs, ding: a.attrs.ding + 3 };
  assert.ok(drill().f.persona > base.f.persona);
});

test('loop 6 回歸：有人專門伐木時，其他人的砍樹活計因子打折（睡著的專人不算）', () => {
  const s = world();
  const [a, b] = s.people;
  calm(a);
  const chop = () => candidates({ ...s, ...seedHolder(5) }, a, scorePois).list.find((c) => c.kind === 'chop');
  const base = chop().f.work;
  b.focus = 'wood';
  assert.ok(Math.abs(chop().f.work - base * 0.6) < 1e-9);
  b.act = 'do'; b.task = { kind: 'sleep', left: 100 };
  assert.equal(chop().f.work, base);
  a.focus = 'wood'; b.act = 'idle'; b.task = null;
  assert.equal(chop().f.work, base, '自己也是專人就不讓');
});
