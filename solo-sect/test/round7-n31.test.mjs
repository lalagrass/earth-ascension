import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim.mjs';
import { breakChance } from '../src/arts.mjs';
import { winP } from '../src/threat.mjs';

test('N31：守山勝算由耗時自然收斂，沒有機率硬夾值', () => {
  const s = createState(31);
  const near = winP(s, 100), far = winP(s, 800);
  assert.ok(near > far && near < 1 && far > 0);
  s.fence = { lv: 1, hp: 60, max: 60 };
  assert.ok(winP(s, 100) > near);
  assert.ok(breakChance({ mood: -1000, wu: 0, needs: { energy: 0 } }) > 0);
  assert.ok(breakChance({ mood: 100, wu: 10, needs: { energy: 100 } }) < 1);
});
