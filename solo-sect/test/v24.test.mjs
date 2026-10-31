/* v2.4–v2.5（loop159–，擁有人 t189）：全部只在 v22 新局（s.v24）生效，舊存檔與舊 golden 不變 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import * as EC from '../src/economy.mjs';
import * as A from '../src/arts.mjs';
import { dpsOf, LS_FIRST24 } from '../src/world.mjs';
export const V = (o = {}) => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true, ...o });
export const OLD = () => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false });
export const hero = (s) => s.ds.find((d) => d.id === 'hero');

test('loop159 v24 只在新局：s.v24／d.v24；舊局沒有', () => {
  const s = V(), o = OLD(); tick(s, 0.1); tick(o, 0.1); assert.ok(s.v24 && hero(s).v24); assert.ok(!o.v24 && !hero(o).v24);
});
test('loop159 P5/P6 商隊（市集補貨）：第 12 日前不賣靈石，之後每集 1–2 顆、每顆 28；舊 v23 存檔維持 30×2', () => {
  const s = V(); tick(s, 0.1); s.res.coin = 999;
  s.day = 6; assert.equal(EC.left(s, 'lingshi'), 0); assert.ok(EC.marketWhy(s, 'lingshi'));
  for (const day of [12, 16, 21, 26, 31]) { s.day = day; const n = EC.left(s, 'lingshi'); assert.ok(n >= 1 && n <= 2, `day ${day}: ${n}`); assert.equal(EC.priceOf(s, 'lingshi'), 28); }
  const w = V(); delete w.v24; w.res.coin = 999; w.day = 3; assert.equal(EC.left(w, 'lingshi'), 2); assert.equal(EC.priceOf(w, 'lingshi'), 30);
});
test('loop159 P2 山產交割：每次補貨，有菜園／藥園／丹房才 +15；沒有就不給', () => {
  const s = V(); tick(s, 0.1); EC.market(s); const c0 = s.res.coin; s.day = 6; EC.market(s); assert.equal(s.res.coin, c0);
  s.fac.veg.stage = Math.max(1, s.fac.veg.stage || 0); s.day = 11; EC.market(s); assert.equal(s.res.coin, c0 + 15); assert.ok(s.log.some((e) => /山產交割/.test(e.msg)));
  const w = V(); delete w.v24; tick(w, 0.1); EC.market(w); w.fac.veg.stage = 1; const k0 = w.res.coin; w.day = 6; EC.market(w); assert.equal(w.res.coin, k0);
});
test('loop159 P5/P6 深谷、斷崖守關首通保底靈石（只列兩段）', () => { assert.deepEqual(LS_FIRST24, ['gorge', 'cliff']); });
test('loop159 P7/P8 執事：有人學會 ≥2 門武學且木石夠 → 藏經閣優先於其他藍圖', () => {
  const s = V(); tick(s, 0.1); s.steward = true; s.rep = 20; s.res.coin = 99; s.res.wood = 30; s.res.stone = 30; const d = hero(s);
  while (Object.keys(d.arts).length < 2) A.learnArt(d, ['breath', 'sweepLeg', 'pushPalm'].find((k) => !d.arts[k]), s.t);
  assert.equal(EC.stewLib24(s), 'library'); s.res.stone = 0; assert.equal(EC.stewLib24(s), null); s.res.stone = 30;
  const w = V(); delete w.v24; tick(w, 0.1); w.res.wood = 30; w.res.stone = 30; assert.equal(EC.stewLib24(w), null);
});
test('loop159 isSwordArt：劍法門類、三門經典劍法；掌法不是；swordCdMul 經它作用在真實劍招，dpsOf 吃 cdMul', () => {
  for (const id of ['dugu', 'bixie', 'xuantie']) assert.ok(A.isSwordArt(id), id); assert.equal(A.isSwordArt('pushPalm'), false); assert.equal(A.isSwordArt('qimenZhen'), false);
  const s = V(); tick(s, 0.1); const d = hero(s); A.learnArt(d, 'bixie', s.t); d.moves.push('bx1'); d.qi = 0;
  assert.ok(Math.abs(A.swordCdMul(d, 'bx1') - 0.82) < 1e-9); assert.equal(A.swordCdMul(d, 'push'), 1);
  const p1 = dpsOf(s, d); d.v23 = false; const p0 = dpsOf(s, d); d.v23 = true; assert.ok(p1 > p0);
});
