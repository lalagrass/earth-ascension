import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../../src/sim.mjs';
import { growthSnapshot } from '../../../src/growth-adapter.mjs';

test('N52 人物卡第一行從同一成長轉接函式取階段、差額與今日增長', () => {
  const d = createState(52).ds[0], id = Object.keys(d.arts)[0];
  d.focus = id; d.arts[id].xp = 28;
  const g = growthSnapshot(d, 26);
  assert.equal(g.tier, 1);
  assert.equal(g.left, 27);
  assert.equal(g.today, 2);
  assert.match(g.firstLine, /小成.*距大成 27\.0.*今日 \+2\.0/);
});
