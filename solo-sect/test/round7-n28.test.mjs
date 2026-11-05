import test from 'node:test';
import assert from 'node:assert/strict';
import { handleTake, clashTimes, resolveSwing } from '../src/arts.mjs';
import { createState } from '../src/sim.mjs';

test('N28：沒有接招次數硬上限；前招佔用後招時間', () => {
  const s = createState(3), d = s.ds[0], rat = { uid: 'r1', k: 'rat', hp: 10 };
  for (let i = 0; i < 8; i++) assert.equal(handleTake(s, d), true);
  d.arts.basicFist = { xp: 150, bt1: true, bt2: true, bt3: true, bt4: true };
  const before = clashTimes(s, rat, d, { wind: 0.54 }).wind;
  resolveSwing(s, rat, d, () => 0.5, { wind: 0.54 });
  assert.ok(clashTimes(s, rat, d, { wind: 0.54 }).wind < before);
});
