import test from 'node:test';
import assert from 'node:assert/strict';
import { runCrowd } from '../tools/round7-crowd.mjs';

test('N31b：四名山賊同時起手時，郭靖可截的比例低於單挑', () => {
  const rows = runCrowd().rows.filter((r) => r.foe === 'bandit' && r.mode === 'simultaneous');
  assert.ok(rows.find((r) => r.n === 4).ratio.read < rows.find((r) => r.n === 1).ratio.read);
});
