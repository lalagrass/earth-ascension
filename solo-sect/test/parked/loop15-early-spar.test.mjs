// Parked after T1 CI failure; original assertion(s) retained verbatim: loop15 領悟開：前 10 日內就有人在空地切磋並觀摩偷師; tracked in #496.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, PRED } from '../../src/sim.mjs';
import { COMP } from '../../src/arts.mjs';

const sp = (o = {}) => ({ kind: 'custom', name: '測', answers: Array(9).fill(0), ...o });
const ctx = (s) => ({ s, n: { energy: 80 }, others: [{ needs: { energy: 80 } }] });
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則

test('loop15 領悟開：前 10 日內就有人在空地切磋並觀摩偷師', () => {
  let watch = 0, spar = false;
  for (const seed of [1, 4, 5]) { const s = createState(seed, sp({ comprehend: true, draw: true, mentor: true, peace: true }));
    for (let i = 0; i < 1000; i++) { tick(s, 6); if (s.ds.some((d) => d.task?.act === 'spar' && d.task.phase === 'do')) spar = true; } watch += s.compN?.watch || 0; }
  assert.ok(spar); assert.ok(watch >= 1);
});
