import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { BODY_MOVES, BODY_TIMING, foeAction } from '../src/starter-combat.mjs';
import { windOf, clashTimes, moveStats } from '../src/arts.mjs';
import { MONSTERS, SOURCES } from '../src/data.mjs';

test('N32 白身無武學、起手秒數與野狗從邊緣走來', () => {
  const s = createState(27, { kind: 'bare', askMajor: false }), d = s.ds.find((d) => d.id === 'hero');
  assert.deepEqual(d.arts, {}); assert.ok(d.moves.includes('bodyKick')); assert.ok(!d.moves.includes('fist'));
  assert.equal(windOf(d, 'bodyPunch', 1), .45);
  assert.ok(windOf(d,'bodyPunch',1) < windOf(d,'bodyPush',1) && windOf(d,'bodyPush',1) < windOf(d,'bodyKick',1));
  const charge = foeAction({ k: 'boar' }, 70), T = clashTimes(s, { k:'boar' }, d, { move:charge.id, wind:charge.wind });
  assert.ok(T.reaction + T.step < charge.wind); assert.equal(T.reaction, BODY_TIMING.reaction);
  assert.ok(moveStats({k:'boar'}).armor > moveStats(d,'bodyPunch').force);
  assert.equal(foeAction({k:'dog'}).wind,.4); assert.equal(MONSTERS.dog.sprite,'dog');
  while (!s.mons.some((m) => m.trial) && s.t < 600) { tick(s,.25); s.alert = null; }
  const dog = s.mons.find((m) => m.trial); assert.equal(dog.k,'dog'); assert.deepEqual(dog.pos, SOURCES.den.pos); assert.ok(dog.path.length);
  const pos = [...dog.pos]; tick(s,.25); assert.notDeepEqual(dog.pos,pos);
  assert.equal(Object.keys(d.arts).length,0);
  assert.ok(Object.keys(createState(27).ds[0].arts).length > 0, '既有非白身開局保留');
  assert.ok(BODY_MOVES.every((m) => m.wind > 0 && m.cd > m.wind));
});
