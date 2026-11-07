import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startExpedition } from '../../../src/sim.mjs';
import { openExp, DEN, RINGS } from '../../../src/world.mjs';
import { ENEMIES } from '../../../src/data.mjs';
import { EXP_BOUT } from '../../../src/exp-map-combat.mjs';
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

  const gate = openExp(createState(53, { kind: 'bare', askMajor: false }));
  gate.res.food = 20;
  assert.equal(startExpedition(gate, ['hero'], { target: 120, order: 'steady' }).ok, true);
  gate.exp.dist = 99; gate.exp.nextAt = 1000;
  for (let i = 0; i < 8 && !gate.exp.bout; i++) tick(gate, .25);
  assert.equal(gate.exp.bout?.key, 'boar', '山腳守關野豬也必須建立逐招交手');
  assert.deepEqual(gate.exp.bout.source, DEN);
  assert.equal(gate.exp.pendingGate?.gateName, '擋路的野豬');
  assert.equal(gate.exp.phase, 'out', '守關未打完不能先返程');

  for (const [index, at, target, key, moveKey, near] of [
    [1, 249, 270, 'wolfking', 'wolf', true],
    [2, 449, 470, 'post', 'bandit', false],
  ]) {
    const next = openExp(createState(53 + index, { kind: 'bare', askMajor: false }));
    next.res.food = 20;
    assert.equal(startExpedition(next, ['hero'], { target, order: 'steady' }).ok, true);
    next.exp.dist = at; next.exp.gateI = index; next.exp.nextAt = 1000;
    for (let i = 0; i < 8 && !next.exp.bout; i++) tick(next, .25);
    assert.equal(next.exp.bout?.key, key, `${key} 守關進逐招地圖`);
    assert.equal(next.exp.bout?.foes[0].k, moveKey, `${key} 沿用同種招式`);
    assert.equal(next.exp.bout?.near, near);
    if (near) assert.deepEqual(next.exp.bout.source, RINGS[index].nest, '林地守關從可見環巢走近');
    else {
      const B = next.exp.bout, [x, y] = B.source;
      assert.ok(x === B.left || x === B.left + 2 * EXP_BOUT.halfWidth || y === B.top || y === B.top + 2 * EXP_BOUT.halfHeight, '山腰守關從小地圖邊緣走近');
    }
  }
});
