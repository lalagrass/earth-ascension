import test from 'node:test';
import assert from 'node:assert/strict';
import { handleThroughput, partHit } from '../../../src/arts.mjs';
import { createState } from '../../../src/sim.mjs';

test('N26/N28：單靠內功化境不縮短外功截擊時間', () => {
  const s = createState(11), d = s.ds[0];
  d.arts = { breath: { xp: 150, bt1: true, bt2: true, bt3: true, bt4: true } };
  assert.ok(handleThroughput(d) > 0);
  partHit(s, d, { heavy: true, why: 'open' }, { attack: { k: 'rat' }, rnd: () => 0 });
  assert.equal(d.part.where, 'hand');
});
