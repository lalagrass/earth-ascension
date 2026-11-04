/* 第四輪 #420 N16 招式名、首用、大成滑步、化境範圍逐個判、實戰紀錄。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { NODES, MOVES } from '../src/data.mjs';
import { handleTake, windOf, visTier, artOfMove } from '../src/arts.mjs';
import { createState, tick, startHunt } from '../src/sim.mjs';
import { powerHtml } from '../src/panel-ui.mjs';

function onPost(seed = 11) {
  const s = createState(seed); for (let i = 0; i < 40; i++) tick(s, 0.25);
  const d = s.ds.filter((x) => x.role !== 'laborer')[0]; assert.ok(startHunt(s, [d.id])); tick(s, 0.25);
  d.pos = [...NODES[s.hunt.post]]; d.at = s.hunt.post; d.path = []; d.hp = 100; s.hunt.started = true; s.hunt.queue = []; return { s, d };
}
const rat = (s, pos, hp = 999) => ({ uid: `t${s.rngN++}`, k: 'rat', hp, max: hp, pos, path: [], cool: 99 });
const huaFist = (d) => { d.arts.basicFist = { xp: 9999, last: 0, bt1: true, bt2: true, bt3: true, bt4: true }; };

test('N16：招式名浮字每人每 2 秒最多一次', () => {
  const { s, d } = onPost(); for (let k = 0; k < 3; k++) s.mons.push(rat(s, [d.pos[0] + 12, d.pos[1] + k * 4]));
  const times = []; for (let i = 0; i < 80; i++) { tick(s, 0.25); for (const f of s.fx) if (f.kind === 'mvname' && f.who === d.id && !f.seen) { f.seen = true; times.push(s.t); } }
  assert.ok(times.length >= 2, `浮字 ${times.length}`);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= 2 - 1e-6);
});

test('N16：第一次使出某招記一筆大事記，第二次不記', () => {
  const { s, d } = onPost(); d.firstMoves = []; s.mons.push(rat(s, [d.pos[0] + 12, d.pos[1]]));
  for (let i = 0; i < 80; i++) tick(s, 0.25);
  const c = (s.chron || []).filter((e) => e.kind === 'move1' && e.who === d.name);
  assert.ok(c.length >= 1); assert.equal(new Set(c.map((e) => e.text)).size, c.length);
});

test('N16：大成以上，遠程招會滑步上前', () => {
  const { s, d } = onPost(); d.arts.pushPalm = { xp: 9999, last: 0, bt1: true, bt2: true, bt3: true }; d.moves = ['push']; assert.ok(visTier(d, 'push') >= 3);
  const p0 = [...d.pos]; s.mons.push(rat(s, [d.pos[0] + 60, d.pos[1]]));
  let dash = 0; for (let i = 0; i < 40; i++) { tick(s, 0.25); dash += s.fx.filter((f) => f.kind === 'dash').length; }
  assert.ok(dash > 0, '有滑步'); assert.ok(Math.hypot(d.pos[0] - NODES[s.hunt.post][0], d.pos[1] - NODES[s.hunt.post][1]) <= 41, '不離守點太遠'); assert.ok(p0);
});

test('N16：化境前搖更短；範圍招逐個目標判接法', () => {
  const { s, d } = onPost(); const a = { arts: {} }, w0 = windOf(a, 'wave', 1);
  d.arts.wavePalm = { xp: 9999, last: 0, bt1: true, bt2: true, bt3: true, bt4: true }; d.moves = ['wave']; assert.ok(visTier(d, 'wave') >= 4);
  assert.ok(w0 > windOf(d, 'wave', 1)); assert.ok(MOVES.find((m) => m.id === 'wave').aoe && artOfMove('wave'));
  for (let k = 0; k < 3; k++) s.mons.push(rat(s, [d.pos[0] + 10, d.pos[1] + k * 3]));
  s.clashN = {}; for (let i = 0; i < 60; i++) tick(s, 0.25);
  assert.ok((s.hunt?.aoeEach || 0) > 0, '化境範圍招逐個判');
});

test('N16：應接最多、單波最多擊退會記下、破紀錄進大事記、人物面板看得到', () => {
  const s = { t: 1, day: 3, chron: [] }, d = { id: 'x', name: '甲', arts: { basicFist: { xp: 9999, last: 0, bt1: true, bt2: true, bt3: true, bt4: true } }, skills: {} };
  handleTake(s, d); handleTake(s, d); handleTake(s, d);
  assert.equal(d.maxHandled, 3); assert.ok(s.chron.some((e) => e.kind === 'handled'));
  const { s: s2, d: d2 } = onPost(); for (let k = 0; k < 3; k++) s2.mons.push(rat(s2, [d2.pos[0] + 12, d2.pos[1] + k * 3], 1));
  for (let i = 0; i < 400 && s2.hunt; i++) tick(s2, 0.25);
  assert.ok((d2.waveBest || 0) >= 1);
  assert.ok(powerHtml(d2, {}, s2.day, s2.t).includes('單波最多擊退'));
});
