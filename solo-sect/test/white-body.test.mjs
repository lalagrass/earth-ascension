import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { BODY_MOVES, BODY_TIMING, foeAction } from '../src/starter-combat.mjs';
import { windOf, clashTimes, moveStats, clashOdds, resolveSwing } from '../src/arts.mjs';
import { MONSTERS, SOURCES } from '../src/data.mjs';

test('N32 白身無武學、起手秒數與野狗從邊緣走來', () => {
  const s = createState(27, { kind: 'bare', askMajor: false }), d = s.ds.find((d) => d.id === 'hero');
  assert.deepEqual(d.arts, {}); assert.ok(d.moves.includes('bodyKick')); assert.ok(!d.moves.includes('fist'));
  assert.equal(windOf(d, 'bodyPunch', 1), .45);
  assert.ok(windOf(d,'bodyPunch',1) < windOf(d,'bodyPush',1) && windOf(d,'bodyPush',1) < windOf(d,'bodyKick',1));
  const charge = foeAction({ k: 'boar' }, 70), T = clashTimes(s, { k:'boar' }, d, { move:charge.id, wind:charge.wind });
  assert.ok(T.reaction + T.step < charge.wind); assert.ok(Math.abs(T.reaction-BODY_TIMING.reaction)<1e-12);
  assert.ok(moveStats({k:'boar'}).armor > moveStats(d,'bodyPunch').force);
  assert.equal(foeAction({k:'dog'}).wind,.4); assert.equal(MONSTERS.dog.sprite,'dog');
  while (!s.mons.some((m) => m.trial) && s.t < 600) { tick(s,.25); s.alert = null; }
  const dog = s.mons.find((m) => m.trial); assert.equal(dog.k,'dog'); assert.deepEqual(dog.pos, SOURCES.den.pos); assert.ok(dog.path.length);
  const pos = [...dog.pos]; tick(s,.25); assert.notDeepEqual(dog.pos,pos);
  assert.equal(Object.keys(d.arts).length,0);
  assert.ok(Object.keys(createState(27).ds[0].arts).length > 0, '既有非白身開局保留');
  assert.ok(BODY_MOVES.every((m) => m.wind > 0 && m.cd > m.wind));
});


test('N33 同一底層累積w，手熟縮前搖、眼熟縮反應，人獸都有紀錄', async () => {
  const { learningWeight, practiceWindow, practiceResidual, ensurePractice, rehearse } = await import('../src/practice.mjs');
  assert.equal(learningWeight(.5),1); assert.ok(Math.abs(learningWeight(.9)-.36)<1e-12);
  assert.ok(learningWeight(.99)>0); assert.equal(practiceResidual(50),.5);
  const s = createState(39,{kind:'bare',askMajor:false}), d=s.ds[0], dog={k:'dog',uid:'testdog',pos:[800,400],hp:14};
  ensurePractice(dog); const before=clashTimes(s,dog,d,{move:'dogBite',wind:.4}).reaction;
  const hitBefore=clashOdds(s,dog,d,{move:'dogBite',wind:.4}).hit;
  for(let i=0;i<20;i++) { d.busyUntil=0; d.raging=false; d.rageUntil=0; d.fret=0; d.posture=100; dog.posture=30; resolveSwing(s,dog,d,()=>.5,{move:'dogBite',wind:.4}); }
  d.busyUntil=0; d.raging=false; d.rageUntil=0; d.fret=0;
  assert.ok(clashTimes(s,dog,d,{move:'dogBite',wind:.4}).reaction<before);
  assert.ok(clashOdds(s,dog,d,{move:'dogBite',wind:.4}).hit<hitBefore/2);
  assert.ok(dog.practice.hands.dogBite>0); assert.ok(d.practice.eyes['dog:dogBite']>0);
  const start=windOf(d,'bodyPunch',1); rehearse(s,d,BODY_MOVES.filter((m)=>!m.tool),600);
  assert.ok(windOf(d,'bodyPunch',1)<start);
  const fake={skills:{agility:20},practice:{hands:{bodyPunch:50}}}; const w=practiceWindow(fake,'bodyPunch',.45);
  assert.ok(Math.abs((w.wind-w.floor)/(w.start-w.floor)-.5)<1e-12);
});
