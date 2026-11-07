import test from 'node:test';
import assert from 'node:assert/strict';
import { clashOdds, resolveSwing } from '../../../src/arts.mjs';
import { createState } from '../../../src/sim.mjs';

test('N27：化境高手截鼠招，同級沒有必然截擊', () => {
  const s = createState(3), d = s.ds[0], rat = { uid: 'rat1', k: 'rat', hp: 10, pos: [0, 0] };
  d.arts.basicFist = { xp: 150, bt1: true, bt2: true, bt3: true, bt4: true };
  assert.ok(clashOdds(s, rat, d, { wind: 0.54 }).read > 0.9);
  assert.equal(resolveSwing(s, rat, d, () => 0.5, { wind: 0.54 }).kind, 'read');
  assert.ok(clashOdds(s, d, { k: 'bandit', agi: 30 }, { wind: 0.3 }).read < 0.5);
});
