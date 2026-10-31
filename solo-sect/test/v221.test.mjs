import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, dailyPipeline, recordDeed, DEED_CAP, CHRON_CAP } from '../src/sim.mjs';

test('v221 dailyPipeline 可單獨呼叫且不丟錯', () => { const s = createState(7); dailyPipeline(s); assert.ok(s.res); });
test('v221 recordDeed 記入弟子並計數、上限截斷', () => {
  const s = createState(7); const d = s.ds[0];
  for (let i = 0; i < DEED_CAP + 5; i++) recordDeed(s, d, 'hunt', { n: i });
  assert.equal(d.deeds.length, DEED_CAP); assert.equal(d.deedN.hunt, DEED_CAP + 5); assert.equal(d.deeds.at(-1).n, DEED_CAP + 4);
});
test('v221 recordDeed 帶 chron 才進大事紀，且不耗亂數', () => {
  const s = createState(7); const before = JSON.stringify(s.rng ?? s.seed);
  recordDeed(s, s.ds[0], 'x', {}); assert.equal(s.chron, undefined);
  for (let i = 0; i < CHRON_CAP + 3; i++) recordDeed(s, null, 'raid', { chron: '守住山門' + i });
  assert.equal(s.chron.length, CHRON_CAP); assert.equal(s.chron[0].who, null);
  assert.equal(JSON.stringify(s.rng ?? s.seed), before);
});
