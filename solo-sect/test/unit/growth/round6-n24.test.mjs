import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../../src/sim.mjs';
import { T, raidResolve } from '../../../src/threat.mjs';

test('N24：沒有木柵時山賊仍從山門上地圖', () => {
  const s = createState(9); s.fence = null;
  const X = T(s); X.pending = { n: 1, pts: 80, p: 0.5, demand: 0, day: s.day, noPay: true };
  assert.equal(raidResolve(s, 1, {} ).band, true);
  assert.equal(s.band.state, 'go');
  assert.ok(s.band.path.length > 0);
  for (let i = 0; i < 200 && s.band?.state === 'go'; i++) tick(s, 0.25);
  assert.equal(s.band?.state, 'yard');
});
