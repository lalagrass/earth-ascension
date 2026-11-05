import test from 'node:test';
import assert from 'node:assert/strict';
import { WITCH, perfectDodge } from '../src/arts.mjs';
import { createState } from '../src/sim.mjs';
import { winP } from '../src/threat.mjs';

test('N30：險招以移步耗時判定；木柵提高守山預估', () => {
  const s = createState(3), d = s.ds[0]; d.wu = 5;
  assert.equal(perfectDodge(s, d, () => 0.999, { strain: WITCH.strain - 0.01 }), false);
  assert.equal(perfectDodge(s, d, () => 0.999, { strain: WITCH.strain + 0.01 }), true);
  const open = winP(s, 100);
  s.fence = { lv: 1, hp: 60, max: 60 };
  assert.ok(winP(s, 100) >= open);
});
