/* 第五輪 #426 N20 絕學改規則：只在地圖戰生效、和舊 on 絕活不重複計算。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { TIERS } from '../src/data.mjs';
import { ZJ, zjHas, zjIntercept, resolveSwing, applyArtOn, postureOf } from '../src/arts.mjs';

const xpOf = (t) => TIERS[t][0] + 1;
const man = (id, arts) => ({ id, name: id, pos: [0, 0], hp: 100, wu: 3, qi: 100, ng: 'x', skills: { agility: 0, strength: 0 }, arts: Object.fromEntries(arts.map(([a, t]) => [a, { xp: xpOf(t) }])) });

test('玄鐵破招架、降龍格住也掉架勢；獨孤截觀破過的獸；地圖戰不再觸發舊 on', () => {
  const s = { t: 10, fx: [], log: [], chron: [], codex: { boar: { insight: ZJ.dugu.insight } } };
  const parry = () => 0; /* 讀招、閃避擲不過（odds 為 0），招架必中 */
  const a = man('a', [['xuantie', 2]]), d = man('d', []);
  d.wu = 1; assert.equal(resolveSwing(s, a, d, parry, { move: 'xt1', wind: 1, map: true }).kind, 'hit', '玄鐵：招架等於沒招架');
  d.posture = undefined; assert.equal(resolveSwing(s, a, d, parry, { move: 'xt1', wind: 1 }).kind, 'parry', '非地圖戰照舊');
  const x = man('x', [['xianglong', 2]]), e = man('e', []); e.wu = 1; postureOf(e); const p0 = e.posture;
  assert.equal(resolveSwing(s, x, e, parry, { move: 'jianlong', wind: 1, map: true }).kind, 'parry');
  const lost = p0 - e.posture; e.posture = p0; resolveSwing(s, x, e, parry, { move: 'jianlong', wind: 1 });
  assert.equal(lost - (p0 - e.posture), ZJ.xianglong.drop, '降龍多掉 drop 架勢');
  const g = man('g', []); g.dugu = ['f1']; assert.ok(zjHas(g, 'dugu'));
  const m = { uid: 'b1', k: 'boar', pos: [30, 0], hp: 50 };
  assert.equal(zjIntercept(s, m, [g]), g); assert.equal(g.sure, 'b1'); assert.ok(s.fx.some((f) => f.kind === 'stamp' && f.char === ZJ.dugu.char));
  assert.equal(zjIntercept(s, m, [g]), null, '冷卻中');
  assert.equal(applyArtOn(s, 'dodge', g, m, { map: true }).see, false, '獨孤舊 dodge 在地圖戰不算');
  assert.equal(applyArtOn(s, 'dodge', g, m, {}).see, true, '抽象戰照舊');
});
