import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, PRED } from '../../src/sim.mjs';
import { COMP } from '../../src/arts.mjs';

const sp = (o = {}) => ({ kind: 'custom', name: '測', answers: Array(9).fill(0), ...o });
const ctx = (s) => ({ s, n: { energy: 80 }, others: [{ needs: { energy: 80 } }] });
test('loop15 空地：舊局不能切磋，領悟開時可徒手過招', () => {
  assert.equal(PRED.sparOk(ctx(createState(1))), false);
  assert.equal(PRED.sparOk(ctx(createState(1, sp({ comprehend: true })))), true);
  assert.equal(COMP.watch, 10);
});
test('loop15 領悟開：前 10 日內就有人在空地切磋並觀摩偷師', () => {
  let watch = 0, spar = false;
  for (const seed of [1, 4, 5]) { const s = createState(seed, sp({ comprehend: true, draw: true, mentor: true, peace: true }));
    for (let i = 0; i < 1000; i++) { tick(s, 6); if (s.ds.some((d) => d.task?.act === 'spar' && d.task.phase === 'do')) spar = true; } watch += s.compN?.watch || 0; }
  assert.ok(spar); assert.ok(watch >= 1);
});
