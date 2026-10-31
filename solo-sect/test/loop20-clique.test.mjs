import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim.mjs';
import { initPair } from '../src/social.mjs';
import { CLQ, cliqueDaily, cliqueOf, mates, cliqueTrain } from '../src/bonds.mjs';

const sp = { kind: 'custom', name: '測', answers: Array(9).fill(0), draw: true };
const setAff = (s, a, b, v) => initPair(s, a, b, v);
const mk = (o) => { const s = createState(1, o); for (const a of s.ds) for (const b of s.ds) if (a !== b) initPair(s, a, b, 10); return s; };
test('loop20 舊局不成派', () => { const s = mk(); const [a, b] = s.ds; setAff(s, a, b, 95); cliqueDaily(s); assert.equal(s.cliques, undefined); });
test('loop20 好感 ≥ 門檻的一對結成小派；跌破 leave 就散', () => {
  const s = mk(sp); const [a, b, c] = s.ds; setAff(s, a, b, 95); cliqueDaily(s);
  assert.equal(s.cliques.length, 1); assert.deepEqual(mates(s, a), [b.id]); assert.equal(cliqueOf(s, c), null);
  setAff(s, a, b, CLQ.leave - 1); cliqueDaily(s); assert.equal(s.cliques.length, 0);
});
test('loop20 同派有人一起練 → 另加技藝', () => {
  const s = mk(sp); const [a, b] = s.ds; setAff(s, a, b, 95); cliqueDaily(s); let got = 0; const grow = (_s, _d, _k, v) => { got += v; };
  b.task = { act: 'train' }; assert.equal(cliqueTrain(s, a, 'train', { style: 4 }, grow), true); assert.ok(Math.abs(got - 4 * CLQ.bonus) < 1e-9);
  b.task = { act: 'farm' }; assert.equal(cliqueTrain(s, a, 'train', { style: 4 }, grow), false);
});
