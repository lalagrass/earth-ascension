import test from 'node:test';
import assert from 'node:assert/strict';
import { perfectDodge } from '../../../src/arts.mjs';
import { createState } from '../../../src/sim.mjs';

test('N23：弱招閃開不放慢', () => {
  const s = createState(7), d = s.ds[0];
  d.arts.basicFist = { xp: 150, bt1: true, bt2: true, bt3: true, bt4: true };
  d.skills.agility = 80; d.wu = 6;
  assert.equal(perfectDodge(s, d, () => 0.999, { depth: 1, damage: 2 }), false);
  assert.equal(s.witchN || 0, 0);
});
