/* v2.7（loop176–，擁有人 t192）：無名派／武當補強、合參分流、正邪波次大戰、傾巢討伐；全部只在 v22 新局（s.v24） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import * as A from '../src/arts.mjs';
import { SECTS, ARTS } from '../src/data.mjs';
const pump = (d) => { for (const x of ARTS) if ((A.ART_CAT[x.id]?.quanzhang || 0) >= 1 && x.id !== 'jindingPalm') { give(d, x.id, 5000); d.arts[x.id].gm = { e: 99 }; if (A.mastery(d, 'quanzhang') >= 60) break; } };
import { sgainOf, def24Of } from '../src/sect.mjs';
import { defense } from '../src/threat.mjs';
import { power } from '../src/jianghu.mjs';
const V = (o = {}) => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true, ...o });
const hero = (s) => s.ds.find((d) => d.id === 'hero');
const other = (s) => s.ds.find((d) => d.id !== 'hero' && d.role !== 'laborer');
const give = (d, id, xp) => { d.arts[id] ??= { xp: 0, last: 0 }; d.arts[id].xp = xp; };

test('loop176 無名派觸類旁通：造詣 ≥38 可學他派 grade ≤2 專屬；名門仍鎖；禁學／三品不開', () => {
  const s = V(); tick(s, 0.1); const d = hero(s); assert.equal(d.sectId, 'wuming');
  const a = A.artById('jindingPalm'); assert.ok(A.lockedArt24(d, a), '造詣不足仍鎖');
  pump(d); assert.ok(A.mastery(d, 'quanzhang') >= 38, String(A.mastery(d, 'quanzhang')));
  assert.ok(!A.lockedArt24(d, a)); assert.ok(A.lockedArt24(d, A.artById('jiuyinClaw')), '禁學'); assert.ok(A.lockedArt24(d, A.artById('sanyinClaw')), '三品');
  const e = V({ sect24: 'wudang' }); tick(e, 0.1); const w = hero(e); pump(w); assert.ok(A.lockedArt24(w, a), '名門仍鎖');
});
test('loop176 祖師堂 gain24 1.12（只 v24）、紫霄宮 def24 1.18', () => {
  const s = V(); tick(s, 0.1); assert.equal(sgainOf(s), 1.12); assert.equal(SECTS.wuming.fac.gain, undefined);
  const w = V({ sect24: 'wudang' }); tick(w, 0.1); w.sect.fac = false; assert.equal(def24Of(w), 1); w.sect.fac = true; assert.equal(def24Of(w), 1.18);
  assert.ok(Math.abs(defense(w) - power(w) * 1.18) < 1e-9);
});
test('loop176 合參上限分流：名門 1、無名 2', () => {
  const s = V(); tick(s, 0.1); assert.equal(A.deriveMax24(s), 2); const e = V({ sect24: 'emei' }); tick(e, 0.1); assert.equal(A.deriveMax24(e), 1);
});
import * as TH from '../src/threat.mjs';
test('loop177 正邪鏡像：明教／星宿對六大派聯軍，其餘對黑木崖魔教', () => {
  for (const [k, want] of [['mingjiao', '六大派圍剿聯軍'], ['xingxiu', '六大派圍剿聯軍'], ['emei', '黑木崖魔教'], [null, '黑木崖魔教']]) { const s = V(k ? { sect24: k } : {}); assert.equal(TH.foe27(s).name, want, String(k)); }
});
test('loop177 割草倍率與合圍：1.45–1.85、後段減半；≥7 人每人 +5% 上限 +50%', () => {
  const s = V(); tick(s, 0.1); const d = other(s); d.moves = ['fist']; d.arts = { basicFist: { xp: 1 } }; assert.equal(TH.aoeCleaveMul(d, 0), 1);
  d.moves = ['wave']; assert.equal(TH.aoeCleaveMul(d, 0), 1.45); give(d, 'zixia', 1); assert.ok(Math.abs(TH.aoeCleaveMul(d, 1) - 1.65) < 1e-9); give(d, 'huifengSword', 1); assert.equal(TH.aoeCleaveMul(d, 0), 1.85);
  assert.ok(Math.abs(TH.aoeCleaveMul(d, 2) - 1.425) < 1e-9);
  const arr = (n) => Array(n).fill(d); assert.equal(TH.crowdSwarmMul(arr(6)), 1); assert.ok(Math.abs(TH.crowdSwarmMul(arr(7)) - 1.05) < 1e-9); assert.equal(TH.crowdSwarmMul(arr(30)), 1.5);
});
test('loop177 連戰結算：不吃山賊亂數、kills 加總、MVP、勝則全波人數', () => {
  const s = V(); tick(s, 0.1); const team = s.ds.filter((x) => x.role !== 'laborer'), rng = TH.T(s).rng;
  const r = TH.waveBattle27(s, team, { key: 't', waves: [{ name: 'a', n: 30, E: 1 }, { name: 'b', n: 20, E: 1 }] });
  assert.equal(TH.T(s).rng, rng); assert.ok(r.win); assert.equal(r.total, 50); assert.equal(Object.values(r.kills).reduce((a, b) => a + b, 0), 50); assert.ok(r.mvp && r.kills[r.mvp.id] === Math.max(...Object.values(r.kills)));
  const L = TH.waveBattle27(s, team, { key: 'u', waves: [{ name: 'a', n: 30, E: 1e9 }] }); assert.equal(L.win, false); assert.equal(L.won, 0);
});
