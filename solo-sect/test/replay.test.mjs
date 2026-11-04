/* 第五輪 #423 重播決定性：同一個種子、同樣的指令，跑兩次結果逐位相同（固定步長、固定種子亂數，沒有 setTimeout）。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startHunt } from '../src/sim.mjs';

function run() {
  const s = createState(7);
  for (let i = 0; i < 2400; i++) { tick(s, 0.25); if (i === 200 || i === 1400) startHunt(s, s.ds.filter((d) => d.role !== 'laborer').slice(0, 2).map((d) => d.id)); }
  for (let i = 0; i < 300; i++) tick(s, 6);
  return JSON.stringify({ t: s.t, n: s.rngN, ds: s.ds.map((d) => [d.id, d.hp, d.qi, d.posture, d.part, d.zjUsed]), log: s.log.slice(-40), witch: s.witchN || 0 });
}
test('同種子同指令，兩次重播完全一樣', () => { assert.equal(run(), run()); });
