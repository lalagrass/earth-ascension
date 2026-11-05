import test from 'node:test';
import assert from 'node:assert/strict';
import { findPath } from '../src/path.mjs';
import { walkable } from '../src/map.mjs';

const MAP = [
  '.......',
  '.###...',
  '...#...',
  '.#.#.#.',
  '.#...#.',
];

test('A2 繞過牆、不經過擋路格', () => {
  const p = findPath(MAP, 0, 2, 6, 2);
  assert.ok(p && p.length > 0);
  for (const c of p) assert.ok(walkable(MAP, c.x, c.y), `經過擋路格 ${c.x},${c.y}`);
  assert.deepEqual(p.at(-1), { x: 6, y: 2 });
});

test('A2 不切角', () => {
  const m = ['.#', '#.'];
  assert.equal(findPath(m, 0, 0, 1, 1), null);
});

test('A2 每步只走相鄰格', () => {
  const p = findPath(MAP, 0, 4, 6, 4);
  let prev = { x: 0, y: 4 };
  for (const c of p) {
    assert.ok(Math.abs(c.x - prev.x) <= 1 && Math.abs(c.y - prev.y) <= 1);
    prev = c;
  }
});

test('A2 到不了或目標擋路回 null', () => {
  assert.equal(findPath(['.#.'], 0, 0, 2, 0), null);
  assert.equal(findPath(MAP, 0, 0, 1, 1), null);
});
