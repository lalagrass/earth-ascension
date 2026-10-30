import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, run, stateHash, companionsFor } from '../src/sim.mjs';
import { TICKS_PER_DAY } from '../src/data.mjs';

const roster = (seed) => [{ template: 'linghu', name: '主角', protagonist: true }, ...companionsFor(seed, 'linghu')];

test('A1 同種子 3 日後雜湊相同，不同種子不同', () => {
  const a = run(createWorld({ seed: 5, people: roster(5) }), TICKS_PER_DAY * 3);
  const b = run(createWorld({ seed: 5, people: roster(5) }), TICKS_PER_DAY * 3);
  const c = run(createWorld({ seed: 6, people: roster(6) }), TICKS_PER_DAY * 3);
  assert.equal(stateHash(a), stateHash(b));
  assert.notEqual(stateHash(a), stateHash(c));
});

test('人物會選去處並留下理由', () => {
  const s = run(createWorld({ seed: 2, people: roster(2) }), 200);
  for (const p of s.people) {
    assert.ok(Object.keys(p.visits).length > 0, `${p.name} 沒去過任何地方`);
    assert.ok(p.why.length > 0 && p.why[0].f);
  }
});

test('同住者不重複主角模板且彼此不同', () => {
  for (let seed = 1; seed < 30; seed++) {
    const c = companionsFor(seed, 'guojing');
    assert.notEqual(c[0].template, 'guojing');
    assert.notEqual(c[0].template, c[1].template);
    assert.notEqual(c[0].name, c[1].name);
  }
});
