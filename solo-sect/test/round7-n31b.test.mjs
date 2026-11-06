import test from 'node:test';
import assert from 'node:assert/strict';
import { runCrowd } from '../tools/round7-crowd.mjs';

test('N31b：各人獨立冷卻後，四名山賊的截擊比例低於單挑', () => {
  const rows = runCrowd().rows.filter((r) => r.foe === 'bandit');
  const read = (mode, n) => rows.find((r) => r.mode === mode && r.n === n).ratio.read;
  assert.ok(read('simultaneous', 4) < read('simultaneous', 1));
  assert.ok(read('staggered', 4) < read('staggered', 1));
  assert.ok(read('simultaneous', 4) < read('staggered', 4));
});
