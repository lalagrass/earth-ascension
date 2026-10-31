import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, run, step, stateHash, companionsFor, scorePois } from '../src/sim.mjs';
import { TICKS_PER_DAY } from '../src/data.mjs';

const roster = (seed) => [{ template: 'linghu', name: '主角', protagonist: true }, ...companionsFor(seed, 'linghu')];

test('M1-A1 同種子 3 日後雜湊相同，不同種子不同', () => {
  const a = run(createWorld({ seed: 5, people: roster(5) }), TICKS_PER_DAY * 3);
  const b = run(createWorld({ seed: 5, people: roster(5) }), TICKS_PER_DAY * 3);
  const c = run(createWorld({ seed: 6, people: roster(6) }), TICKS_PER_DAY * 3);
  assert.equal(stateHash(a), stateHash(b));
  assert.notEqual(stateHash(a), stateHash(c));
});

test('人物一日內會做事並留下理由', () => {
  const s = run(createWorld({ seed: 2, people: roster(2) }), TICKS_PER_DAY);
  for (const p of s.people) assert.ok(p.why.length > 0 && p.why[0].f, `${p.name} 沒有理由`);
  assert.ok(Object.keys(s.counts).length >= 4);
});

test('同住者不重複主角模板且彼此不同', () => {
  for (let seed = 1; seed < 30; seed++) {
    const c = companionsFor(seed, 'guojing');
    assert.notEqual(c[0].template, 'guojing');
    assert.notEqual(c[0].template, c[1].template);
    assert.notEqual(c[0].name, c[1].name);
  }
});

// M1-A7 控制實驗：同一位置、同一世界，只改外向軸，看首選去處是不是熱鬧的地方。
test('M1-A7 只變外向軸：外向者更常選熱鬧去處', () => {
  const pickSocial = (E) => {
    const s = createWorld({ seed: 3, people: roster(3) });
    const p = s.people[0];
    p.axes = { E, N: 0, F: 0, P: 0 };
    for (const o of s.people.slice(1)) { o.x = 31; o.y = 25; }
    let n = 0;
    for (let i = 0; i < 300; i++) {
      p.x = 31; p.y = 18; p.goal = null;
      const top = scorePois(s, p)[0];
      if ((s.pois.find((x) => x.id === top.target).tags.social || 0) > 0) n++;
    }
    return n;
  };
  const e = pickSocial(0.9), i = pickSocial(-0.9);
  assert.ok(e > i * 2, `外向 ${e} / 內向 ${i}`);
});

test('step 不會讓任何需求超出範圍', () => {
  const s = createWorld({ seed: 9, people: roster(9) });
  for (let t = 0; t < 2000; t++) {
    step(s);
    for (const p of s.people) for (const v of Object.values(p.needs)) assert.ok(v >= 0 && v <= 100);
  }
});
