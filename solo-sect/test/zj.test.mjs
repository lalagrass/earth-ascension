/* 第五輪 #426 N20 絕學改規則：只在地圖戰生效、和舊 on 絕活不重複計算。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { TIERS } from '../src/data.mjs';
import { ZJ, zjHas, zjIntercept, resolveSwing, applyArtOn } from '../src/arts.mjs';

const xpOf = (t) => TIERS[t][0] + 1;
const man = (id, arts) => ({ id, name: id, pos: [0, 0], hp: 100, wu: 3, qi: 100, ng: 'x', skills: { agility: 0, strength: 0 }, arts: Object.fromEntries(arts.map(([a, t]) => [a, { xp: xpOf(t) }])) });

test('名功的極端勁力與獨孤截招；地圖戰只跳過重複的舊 on 效果', () => {
  const s = { t: 10, fx: [], log: [], chron: [], codex: { boar: { insight: ZJ.dugu.insight } } };
  const a = man('a', [['xuantie', 2]]), d = man('d', []);
  d.wu = 1; d.qi = 0; d.rageUntil = s.t + 1; assert.equal(resolveSwing(s, a, d, () => 0.5, { move: 'xt1', wind: 1, map: true }).kind, 'parry', '玄鐵勁大，對方招架崩潰'); assert.equal(d.posture, 0);
  const x = man('x', [['xianglong', 2]]), e = man('e', []); e.wu = 1; e.qi = 0; e.rageUntil = s.t + 1;
  assert.equal(resolveSwing(s, x, e, () => 0.5, { move: 'jianlong', wind: 1, map: true }).kind, 'parry', '降龍也依勁力破架勢'); assert.equal(e.posture, 0);
  assert.equal(applyArtOn(s, 'hit', a, e, { move: 'xt1', map: true, power: 10 }).power, 12.5, '玄鐵傷害倍率仍保留');
  const g = man('g', []); g.dugu = ['f1']; assert.ok(zjHas(g, 'dugu'));
  const m = { uid: 'b1', k: 'boar', pos: [30, 0], hp: 50 };
  assert.equal(zjIntercept(s, m, [g]), g); assert.equal(g.sure, 'b1'); assert.ok(s.fx.some((f) => f.kind === 'stamp' && f.char === ZJ.dugu.char));
  assert.equal(zjIntercept(s, m, [g]), null, '冷卻中');
  assert.equal(applyArtOn(s, 'hit', g, m, { map: true, power: 10 }).power, 12, '獨孤地圖傷害倍率仍保留');
  assert.equal(applyArtOn(s, 'dodge', g, m, { map: true }).see, false, '獨孤舊 dodge 在地圖戰不算');
  assert.equal(applyArtOn(s, 'dodge', g, m, {}).see, true, '抽象戰照舊');
  const tj = man('tj', [['taijiSword', 2]]);
  assert.equal(applyArtOn(s, 'gethit', tj, m, { map: true, dmg: 10 }).reflect, 0, '地圖只算共用借力');
  assert.equal(applyArtOn(s, 'gethit', tj, m, { dmg: 10 }).reflect, 0.45, '抽象戰保留舊期望');
});
