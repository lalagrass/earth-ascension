import test from 'node:test';
import assert from 'node:assert/strict';
import { clashOdds, moveStats, taijiReturn } from '../../../src/arts.mjs';
import { createState } from '../../../src/sim.mjs';

test('N22/N27：高手截鼠招，新手沒有截擊優勢', () => {
  const rat = { k: 'rat' };
  const s = createState(3), fighter = s.ds[0]; fighter.arts.breath = { xp: 0 }; fighter.qi = 100;
  fighter.arts.basicFist = { xp: 150, bt1: true, bt2: true, bt3: true, bt4: true };
  assert.ok(clashOdds(s, rat, fighter, { wind: 0.54 }).read > 0.9);
  fighter.arts.basicFist = { xp: 0 };
  assert.ok(clashOdds(s, rat, fighter, { wind: 0.54 }).read < 0.5);
  assert.ok(moveStats({ k: 'boar' }).armor > moveStats(rat).armor);
  assert.ok(taijiReturn({ k: 'boar' }) > taijiReturn(rat));
});
