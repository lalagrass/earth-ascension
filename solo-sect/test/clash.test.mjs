/* 第四輪 #418 N14 見招拆招：三段出招、四種接法、架勢條。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASH, windOf, windFrac, resolveSwing, postureOf, postureMax, clashOdds } from '../src/arts.mjs';
import { createState, tick, startHunt, save } from '../src/sim.mjs';

const seq = (...v) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const hero = () => { const s = createState(3); return { s, d: s.ds.find((x) => x.id === 'hero') }; };

test('N14：同一招在入門時的前搖比化境長', () => {
  const { d } = hero();
  d.arts.basicFist = { xp: 0, last: 0 }; const w0 = windOf(d, 'fist', 1);
  d.arts.basicFist = { xp: 150, last: 0, bt1: true, bt2: true, bt3: true, bt4: true }; const w4 = windOf(d, 'fist', 1);
  assert.ok(w0 > w4, `${w0} > ${w4}`);
  assert.equal(windFrac(0), CLASH.windIn); assert.equal(windFrac(4), CLASH.windHua);
});

test('N14：架勢空了之後，下一招是重擊', () => {
  const { s, d } = hero();
  const rat = { uid: 'r1', k: 'rat', hp: 10, pos: [0, 0] };
  postureOf(d); d.posture = 0;
  const r = resolveSwing(s, rat, d, seq(0, 0, 0));
  assert.equal(r.kind, 'hit'); assert.equal(r.heavy, true);
  assert.ok(d.posture > 0, '挨過重擊架勢回一半');
});

test('N14：看破成立時，攻方架勢下降，守方下一招必中', () => {
  const { s, d } = hero();
  s.codex = { rat: { insight: 60 } }; d.wu = 5;
  const rat = { uid: 'r1', k: 'rat', hp: 10, pos: [0, 0] };
  const o = clashOdds(s, rat, d, { wind: 0.5 }); assert.ok(o.read > 0);
  const before = postureOf(rat);
  const r = resolveSwing(s, rat, d, seq(0));
  assert.equal(r.kind, 'read');
  assert.equal(rat.posture, Math.max(0, before - CLASH.read.drop));
  assert.equal(d.sure, 'r1');
  const r2 = resolveSwing(s, d, rat, seq(0.99, 0.99, 0.99));
  assert.equal(r2.kind, 'hit', '看破後下一招必中');
});

test('N14：招架雙方都掉架勢；氣血只在中招時掉', () => {
  const { s, d } = hero();
  const rat = { uid: 'r1', k: 'rat', hp: 10, pos: [0, 0] }; d.wu = 1; s.codex = {};
  const o = clashOdds(s, rat, d, { wind: 0.5 }); assert.ok(o.parry > 0);
  const hp = d.hp, pd = postureOf(d), pr = postureOf(rat);
  const r = resolveSwing(s, rat, d, seq(0.99, 0));
  assert.equal(r.kind, 'parry');
  assert.ok(d.posture < pd && rat.posture < pr);
  assert.equal(d.hp, hp);
  assert.ok(postureMax(rat) < postureMax(d));
});

test('N14：固定種子狩獵重播兩次，結果相同', () => {
  const runHunt = () => { const s = createState(11); for (let i = 0; i < 40; i++) tick(s, 0.25); const ids = s.ds.filter((d) => d.role !== 'laborer').map((d) => d.id).slice(0, 3); startHunt(s, ids);
    for (let i = 0; i < 2400 && s.hunt; i++) tick(s, 0.25); return JSON.stringify({ r: s.lastReport, ds: s.ds.map((d) => [d.id, Math.round(d.hp * 100), Math.round((d.posture ?? -1) * 100)]), n: s.clashN }); };
  const a = runHunt(), b = runHunt();
  assert.equal(a, b);
});

test('N14：狩獵中會出現預警扇形', () => {
  const s = createState(11); for (let i = 0; i < 40; i++) tick(s, 0.25);
  startHunt(s, s.ds.filter((d) => d.role !== 'laborer').map((d) => d.id).slice(0, 3));
  let warn = 0; for (let i = 0; i < 2400 && s.hunt; i++) { tick(s, 0.25); warn += s.fx.filter((f) => f.kind === 'warn').length; }
  assert.ok(warn > 0);
  JSON.parse(save(s));
});
