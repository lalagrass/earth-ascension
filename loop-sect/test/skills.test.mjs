import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, release, companionsFor } from '../src/sim.mjs';
import { gainFor, grow, extraTake, workTimeMul, buildRate, extraMeal, footMul, effectText } from '../src/skills.mjs';
import { speedOf, fromTemplate } from '../src/person.mjs';
import { SKILLS } from '../src/data.mjs';

const world = (seed = 4) => createWorld({ seed, people: [{ template: 'guojing', name: '甲' }, ...companionsFor(seed, 'guojing')] });
const withSkills = (tpl) => { const p = fromTemplate(tpl, { id: 'x' }); p.skills = Object.fromEntries(SKILLS.map((s) => [s.id, 0])); return p; };

test('M4-A1 做完才成長，中途釋放不加', () => {
  const s = world();
  const p = s.people[0];
  for (const o of s.people) o.needs = { food: 95, energy: 95, social: 95, fun: 95 };
  p.focus = 'wood';
  let t = 0;
  while (p.task?.kind !== 'chop' && t < 2000) { step(s); t++; }
  assert.equal(p.task.kind, 'chop');
  while (p.act !== 'do' && t < 4000) { step(s); t++; }
  step(s);
  release(s, p); p.act = 'idle';
  assert.equal(p.skills.chop, 0, '被打斷的砍樹不該成長');
  while (p.skills.chop === 0 && t < 6000) { step(s); t++; }
  assert.ok(p.skills.chop > 0, '做完一次應該成長');
});

test('M4-A2 邊際遞減；根骨影響伐木、悟性影響烹飪', () => {
  const g = withSkills('guojing');    // 根骨 9、悟性 2
  const h = withSkills('huangrong');  // 根骨 2、悟性 10
  assert.ok(gainFor(g, 'chop') > gainFor(h, 'chop'));
  assert.ok(gainFor(h, 'cook') > gainFor(g, 'cook'));
  const first = gainFor(g, 'chop');
  for (let i = 0; i < 20; i++) grow(g, 'chop');
  assert.ok(gainFor(g, 'chop') < first);
  for (let i = 0; i < 500; i++) grow(g, 'chop');
  assert.ok(g.skills.chop <= 100);
});

test('M4-A3 效果：多扛、快、工時、煮飯、腳程', () => {
  const p = withSkills('guojing');
  const base = speedOf(p);
  p.skills = { chop: 70, quarry: 35, build: 50, cook: 60, forage: 40, foot: 100 };
  assert.equal(extraTake(p, 'chop'), 2);
  assert.equal(extraTake(p, 'quarry'), 1);
  assert.equal(extraTake(p, 'forage'), 1);
  assert.ok(Math.abs(workTimeMul(p, 'chop') - 0.72) < 1e-9);
  assert.equal(buildRate(p), 1.5);
  assert.equal(extraMeal(p), 1);
  assert.equal(footMul(p), 1.3);
  assert.ok(Math.abs(speedOf(p) / base - 1.3) < 1e-9);
  for (const s of SKILLS) assert.ok(effectText(p, s.id).length > 0);
});

test('M4-A1 負重走路練腳力，空手不練', () => {
  const walk = (loaded) => {
    const s = world();
    const p = s.people[0];
    p.x = 38; p.y = 25;
    if (loaded) { p.load.wood = 4; s.ledger.woodCut += 4; }
    p.task = { kind: 'store' }; p.act = 'walk';
    p.path = Array.from({ length: 20 }, (_, i) => ({ x: 39 + i, y: 25 }));
    for (let t = 0; t < 120 && p.act === 'walk'; t++) step(s);
    return p.skills.foot;
  };
  assert.ok(walk(true) > 0);
  assert.equal(walk(false), 0);
});

// M4-A4 控制實驗：同一世界、同一個人、同一棵樹，只差熟練度，比一趟伐木花在路上與做事的 tick。
test('M4-A4 熟手同一趟伐木每根木頭比生手快 ≥ 10%', () => {
  const trip = (skilled) => {
    const s = world(6);
    s.tick = 9 * 60;
    for (const o of s.people) { o.needs = { food: 100, energy: 100, social: 100, fun: 100 }; }
    const p = s.people[0];
    for (const o of s.people.slice(1)) { o.act = 'do'; o.task = { kind: 'idle', left: 99999 }; }
    p.focus = 'wood';
    if (skilled) for (let i = 0; i < 25; i++) { grow(p, 'chop'); grow(p, 'foot'); }
    let ticks = 0, prev = 0, wood = 0;
    for (let t = 0; t < 2000; t++) {
      step(s);
      for (const o of s.people) o.needs.food = o.needs.energy = o.needs.social = o.needs.fun = 100;
      if (['chop', 'store'].includes(p.task?.kind)) ticks++;
      if (prev > 0 && p.load.wood === 0) { wood = prev; break; }
      prev = p.load.wood;
    }
    return { per: ticks / wood, wood, chop: p.skills.chop };
  };
  const a = trip(false), b = trip(true);
  assert.ok(b.per <= a.per * 0.9, `熟手 ${b.per.toFixed(1)}（${b.wood} 木、熟練 ${b.chop.toFixed(0)}）vs 生手 ${a.per.toFixed(1)}（${a.wood} 木）`);
});
