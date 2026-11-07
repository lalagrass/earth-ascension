import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../../src/sim.mjs';
import { freeSpot, reserve } from '../../../src/core.mjs';

test('N53：僅餘一個木人樁時，第二位練功者改去空地', () => {
  const s = createState(21, { kind: 'template', id: 'guojing', askMajor: false });
  s.fac.yard.stage = 1;
  s.resv = { 'yard:spot:dummy0': 'other0', 'yard:spot:dummy1': 'other1' };
  const [a, b] = s.ds;
  const dummy = freeSpot(s, 'yard', 'train', a);
  assert.equal(dummy.spotKind, 'dummy');
  assert.ok(reserve(s, a, dummy.key));
  const open = freeSpot(s, 'yard', 'train', b);
  assert.equal(open.spotKind, 'open');
  assert.notDeepEqual(open.xy, dummy.xy);
  assert.ok(reserve(s, b, open.key));
  assert.notEqual(s.resv[dummy.key], s.resv[open.key]);
});
