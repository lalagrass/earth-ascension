import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { buildFence } from '../src/fence.mjs';

const sp = { kind: 'custom', name: '測', answers: Array(9).fill(0), draw: true, comprehend: true, mentor: true, peace: true };
const run = (seed) => { const s = createState(seed, sp); s.res.wood = (s.res.wood || 0) + 6; buildFence(s); for (let i = 0; i < 4800; i++) tick(s, 6); return s.threat.hist; };
test('loop14 柵破後改擲原勝率：有勝有敗，不再一律判敗', () => {
  const br = [1, 2, 3].flatMap(run).filter((e) => e.broke);
  assert.ok(br.length > 0); assert.ok(br.some((e) => e.fight === 'win')); assert.ok(br.some((e) => e.fight === 'lose'));
});
