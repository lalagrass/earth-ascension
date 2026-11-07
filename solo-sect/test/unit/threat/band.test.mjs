import { createState } from '../../harness/historical-party.mjs';
/* 第五輪 #424 N18 山賊逐一交手：守柵者對圈內的人一招招出手，有接法；倒地的人沿山門那條路退走；柵破才進院交手。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { NODES } from '../../../src/data.mjs';
import { newBand, bandStep, FENCE } from '../../../src/threat.mjs';
import { tick } from '../../../src/sim.mjs';

test('山賊逐一交手：判接法、整夥血量＝每人加總、倒地者退走、柵破才進院', () => {
  const s = createState(11); for (let i = 0; i < 40; i++) tick(s, 0.25);
  const d = s.ds.find((x) => x.role !== 'laborer'); d.task = { act: 'defend', node: FENCE.node, phase: 'do' }; d.pos = [...NODES[FENCE.node]]; d.path = []; d.hp = 100;
  d.arts.basicFist = { xp: 150, bt1: true, bt2: true, bt3: true, bt4: true }; d.moves = ['fist']; d.skills.palm = 50; // 明確指定已練成的拳，隔離 N34 試招選擇
  s.fence = { lv: 1, hp: 9999, max: 9999, hits: 0, broken: 0, repaired: 0, blocked: 0 };
  const b = newBand({ n: 1, pts: 160, day: 1 }, FENCE.node); b.state = 'siege'; b.pos = [...NODES[FENCE.node]]; b.path = []; s.band = b;
  const H = { rand: () => 0.5, cancelTask() {}, think() {} };
  for (let i = 0; i < 800 && s.band && !b.downN; i++) { s.t += 0.25; bandStep(s, 0.25, H); assert.ok(Math.abs(b.hp - b.members.reduce((a, m) => a + Math.max(0, m.hp), 0)) < 1e-6); }
  assert.ok(Object.values(b.cl || {}).reduce((a, n) => a + n, 0) >= 2, JSON.stringify(b.cl)); assert.ok(!b.cl.mhit, '柵在時山賊不砍人');
  const down = b.members.find((m) => m.state === 'down'); assert.ok(down && down.path.length > 0, '倒地的人沿路退走');
  s.fence.hp = 1; b.clock = 99; for (let i = 0; i < 400 && s.band && b.state !== 'yard'; i++) { s.t += 0.25; bandStep(s, 0.25, H); }
  assert.equal(b.state, 'yard'); const hp0 = d.hp; for (let i = 0; i < 40 && s.band; i++) { s.t += 0.25; bandStep(s, 0.25, H); }
  assert.ok(Object.keys(b.cl).some((k) => k[0] === 'm'), '進院後山賊也出招'); assert.ok(d.hp <= hp0);
});
