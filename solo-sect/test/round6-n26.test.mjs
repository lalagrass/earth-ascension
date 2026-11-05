import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCap, partHit } from '../src/arts.mjs';
import { createState } from '../src/sim.mjs';

test('N26：單靠內功化境仍只應接一招', () => {
  const s = createState(11), d = s.ds[0];
  d.arts = { breath: { xp: 150, bt1: true, bt2: true, bt3: true, bt4: true } };
  assert.equal(handleCap(d), 1);
  partHit(s, d, { heavy: true, why: 'open' }, { attack: { k: 'rat' }, rnd: () => 0 });
  assert.equal(d.part.where, 'hand');
});
