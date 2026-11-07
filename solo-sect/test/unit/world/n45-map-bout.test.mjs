import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startExpedition } from '../../../src/sim.mjs';
import { openExp, DEN } from '../../../src/world.mjs';
import { ENEMIES } from '../../../src/data.mjs';
import { lairStep } from '../../../src/threat.mjs';

test('N45 巡山山腳從既有邊緣獸穴走來，逐招交手後才結算', () => {
  const s = openExp(createState(17, { kind: 'bare', askMajor: false }));
  s.res.food = 20;
  assert.equal(startExpedition(s, ['hero'], { target: 60, order: 'steady' }).ok, true);
  for (let i = 0; i < 800 && !s.exp?.bout; i++) tick(s, .25);
  const B = s.exp?.bout;
  assert.ok(B, '第一段在地圖建立交手，而非當拍用期望值結算');
  assert.equal(B.seg, 'foot'); assert.equal(B.near, true);
  assert.deepEqual(B.source, DEN);
  assert.deepEqual(B.foes[0].pos, DEN);
  assert.ok(ENEMIES[B.key]);
  const start = Math.hypot(B.foes[0].pos[0] - B.anchor[0], B.foes[0].pos[1] - B.anchor[1]);
  let sawExchange = false, approached = false;
  for (let i = 0; i < 1200 && s.exp?.bout === B; i++) {
    tick(s, .25);
    if (s.exp?.bout === B) {
      approached ||= Math.hypot(B.foes[0].pos[0] - B.anchor[0], B.foes[0].pos[1] - B.anchor[1]) < start;
      sawExchange ||= B.exchanges > 0;
    }
  }
  assert.equal(approached, true, '敵人可見地從獸穴走向巡山隊');
  assert.equal(sawExchange, true, '真出招／接法已發生');
  assert.equal(s.exp?.bout, null, '交手有真結果後才可繼續走路');

  const raid = createState(31, { kind: 'bare', askMajor: false });
  raid.lair = { found: 1, n: 1, won: 0, next: 0, trip: { ids: ['hero'], pts: 40, pow: 100, back: raid.t, n: 1 } };
  lairStep(raid);
  assert.equal(raid.lair.trip.bout.near, false, '剿寨目標開同規則的小地圖');
  const lairBout = raid.lair.trip.bout;
  for (let i = 0; i < 500 && raid.lair.trip; i++) tick(raid, .25);
  assert.ok(lairBout.exchanges > 0, '山寨勝負也由逐招判定');
  assert.equal(raid.lair.trip, null);
  assert.equal(typeof raid.lair.hist[0].win, 'boolean');
});
