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

// ---- loop160 Batch 1 ----
import { ARTS, MOVES } from '../src/data.mjs';
const NEW24 = ['basicSword', 'huashanSword', 'sanxianSword', 'wuhuBlade', 'shaolinStaff', 'tuinaHand', 'stepFeather', 'stepEight'];
test('loop160 Batch1：8 門公共武學存在、招式齊全、有門類與屬性', () => {
  for (const id of NEW24) { const a = ARTS.find((x) => x.id === id); assert.ok(a?.v24, id); assert.ok(A.ART_CAT[id], id); assert.ok(['yin', 'yang', 'he'].includes(a.attr), id);
    for (const m of a.techs) if (a.school !== 'step') assert.ok(MOVES.find((x) => x.id === m), m); }
  for (const id of ['basicSword', 'huashanSword', 'sanxianSword']) assert.ok(A.isSwordArt(id));
});
test('loop160 Batch1：舊局看不到也學不到新武學；新局可學', () => {
  const o = hero(OLD()), n = hero(V()); n.v23 = n.v24 = true; /* d.v24 於首個 tick 標記 */
  for (const id of NEW24) { assert.equal(A.artOk(o, ARTS.find((x) => x.id === id)), false); assert.equal(A.artOk(n, ARTS.find((x) => x.id === id)), true); }
  o.arts = { basicFist: { xp: 0 } }; o.pendingArt = null; A.gainArt?.length; assert.ok(!NEW24.includes(A.selfTarget(o)));
});
test('loop160 Batch1.2：藏經閣圖譜——v24 讀書可得抄本；舊局不會', () => {
  const s = V(), d = hero(s); d.v23 = d.v24 = true; const g = A.studyChart24(s, d, () => 0); assert.ok(g && d.arts[g.art.id]); assert.equal(s.v24n.chart, 1);
  const o = OLD(); assert.equal(A.studyChart24(o, hero(o), () => 0), null);
  const s2 = V(), d2 = hero(s2); d2.v23 = d2.v24 = true; assert.equal(A.studyChart24(s2, d2, () => 0.9), null);
});

// ---- loop161 Batch 2 ----
test('loop161 Batch2：陰陽共鳴——陰＋陽 ×1.08、陰陽和 ×1.12；舊局恆為 1', () => {
  const s = V(), d = hero(s); d.v23 = d.v24 = true; const big = 1e6;
  d.arts = { tuinaHand: { xp: big } }; assert.equal(A.harmonyMul(d), 1);
  d.arts.wuhuBlade = { xp: big }; assert.equal(A.harmonyOf(d), 'yy'); assert.equal(A.harmonyMul(d), 1.08);
  d.arts.basicSword = { xp: big }; assert.equal(A.harmonyMul(d), 1.12);
  const o = hero(OLD()); o.arts = { ...d.arts }; assert.equal(A.harmonyMul(o), 1);
  assert.equal(A.attrOf({ tags: ['剛'] }), 'yang'); assert.equal(A.attrOf({ tags: ['柔'] }), 'yin');
});
test('loop161 Batch2：奇門封穴——隊中有奇門造詣才 > 0；舊局為 0', () => {
  const s = V(), d = hero(s); d.v23 = d.v24 = true; d.arts = { tuinaHand: { xp: 1e6, gm: { e: 20, ms: 0 } } };
  assert.ok(A.fengxueK(s, [d]) > 0);
  const o = OLD(); assert.equal(A.fengxueK(o, [hero(o)]), 0);
});

// ---- loop162 Batch 3 ----
test('loop162 Batch3：頓悟詞綴——大成時依雜湊得字訣，只得一次、可重現；舊局沒有', () => {
  const mk = () => { const s = V(), d = hero(s); d.v23 = d.v24 = true; d.arts = { basicSword: { xp: 60 } }; return [s, d]; };
  const [s, d] = mk(), g = A.affix24(s, d); assert.ok(g); assert.ok(d.arts.basicSword.affix); assert.equal(A.affix24(s, d), null); assert.equal(s.v24n.affix, 1);
  const [, d2] = mk(); A.affix24(V(), d2); assert.equal(d2.arts.basicSword.affix, d.arts.basicSword.affix);
  const x = A.affixOf(d, 'basicSword'); assert.ok((x.dmg || 1) * (1 / (x.cd || 1)) > 1);
  assert.notEqual(A.affixMul(d, 'bs1', x.dmg ? 'dmg' : 'cd'), 1);
  const o = OLD(), h = hero(o); h.arts = { basicFist: { xp: 60 } }; assert.equal(A.affix24(o, h), null);
});

// ---- loop163 Batch 4 ----
import { SECTS } from '../src/data.mjs';
import { sgainOf } from '../src/sect.mjs';
test('loop163 Batch4：五個新門派只在 v2.4 新局可指定；舊局給 sect24 仍走原門派', () => {
  for (const k of ['emei', 'wudang', 'taohua', 'gumu', 'xingxiu']) { assert.ok(SECTS[k].v24); const s = V({ sect24: k }); assert.equal(s.sect.id, k);
    for (const a of SECTS[k].tree) assert.ok(ARTS.find((x) => x.id === a), a); }
  const o = createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, sect24: 'gumu' }); assert.equal(o.sect.id, 'wuming');
  assert.equal(V().sect.id, 'wuming');
});
test('loop163 Batch4：古墓寒玉床——門人 ≤5 才 ×1.5', () => {
  const s = V({ sect24: 'gumu' }); s.sect.fac = true; const n = s.ds.filter((d) => d.role !== 'laborer').length;
  assert.equal(sgainOf(s), n <= 5 ? 1.5 : 1);
  while (s.ds.filter((d) => d.role !== 'laborer').length <= 5) s.ds.push({ ...s.ds[0], id: 'x' + s.ds.length, role: 'disciple' }); assert.equal(sgainOf(s), 1);
});
