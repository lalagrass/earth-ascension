import test from 'node:test';
import assert from 'node:assert/strict';
import { clashOdds, moveStats } from '../src/arts.mjs';
import { createState } from '../src/sim.mjs';

test('N22：高手能閃老鼠，同級對手沒有絕對優勢', () => {
  const rat = { k: 'rat' };
  const s = createState(3), fighter = s.ds[0]; fighter.arts.breath = { xp: 0 }; fighter.qi = 100;
  fighter.skills.agility = 80;
  assert.ok(clashOdds(s, rat, fighter).dodge > 0.9);
  fighter.skills.agility = 30;
  assert.ok(clashOdds(s, rat, fighter).dodge < 0.6);
  assert.ok(moveStats({ k: 'boar' }).armor > moveStats(rat).armor);
});
