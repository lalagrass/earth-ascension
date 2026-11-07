/* v2.4–v2.5（loop159–，擁有人 t189）。#390 起所有局都適用，舊存檔讀入即升級 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../src/sim.mjs';
import * as EC from '../../src/economy.mjs';
import * as A from '../../src/arts.mjs';
import { dpsOf, LS_FIRST24 } from '../../src/world.mjs';
export const V = (o = {}) => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true, ...o });
// #390：舊規則開局已不存在，原本的舊局對照組（OLD）與各測試裡的舊局斷言一併刪除
export const hero = (s) => s.ds.find((d) => d.id === 'hero');

// #390 退役：「loop159 v24 只在新局」— 世代旗標已收進規則版本，見 rules-upgrade.test
test('loop159 P5/P6 商隊（市集補貨）：第 12 日前不賣靈石，之後每集 1–2 顆、每顆 28', () => {
  const s = V(); tick(s, 0.1); s.res.coin = 999;
  s.day = 6; assert.equal(EC.left(s, 'lingshi'), 0); assert.ok(EC.marketWhy(s, 'lingshi'));
  for (const day of [12, 16, 21, 26, 31]) { s.day = day; const n = EC.left(s, 'lingshi'); assert.ok(n >= 1 && n <= 2, `day ${day}: ${n}`); assert.equal(EC.priceOf(s, 'lingshi'), 28); }
});
test('loop159 P2 山產交割：每次補貨，有菜園／藥園／丹房才 +15；沒有就不給', () => {
  const s = V(); tick(s, 0.1); EC.market(s); const c0 = s.res.coin; s.day = 6; EC.market(s); assert.equal(s.res.coin, c0);
  s.fac.veg.stage = Math.max(1, s.fac.veg.stage || 0); s.day = 11; EC.market(s); assert.equal(s.res.coin, c0 + 15); assert.ok(s.log.some((e) => /山產交割/.test(e.msg)));
});
test('loop159 P5/P6 深谷、斷崖守關首通保底靈石（只列兩段）', () => { assert.deepEqual(LS_FIRST24, ['gorge', 'cliff']); });
test('loop159 P7/P8 執事：有人學會 ≥2 門武學且木石夠 → 藏經閣優先於其他藍圖', () => {
  const s = V(); tick(s, 0.1); s.steward = true; s.rep = 20; s.res.coin = 99; s.res.wood = 30; s.res.stone = 30; const d = hero(s);
  while (Object.keys(d.arts).length < 2) A.learnArt(d, ['breath', 'sweepLeg', 'pushPalm'].find((k) => !d.arts[k]), s.t);
  assert.equal(EC.stewLib24(s), 'library'); s.res.stone = 0; assert.equal(EC.stewLib24(s), 'library', 'loop169 石料暫緩'); s.res.wood = 4; assert.equal(EC.stewLib24(s), null); s.res.stone = 30; s.res.wood = 30;
});
test('loop159 isSwordArt：劍法門類、三門經典劍法；掌法不是；swordCdMul 經它作用在真實劍招，dpsOf 吃 cdMul', () => {
  for (const id of ['dugu', 'bixie', 'xuantie']) assert.ok(A.isSwordArt(id), id); assert.equal(A.isSwordArt('pushPalm'), false); assert.equal(A.isSwordArt('qimenZhen'), false);
  const s = V(); tick(s, 0.1); const d = hero(s); A.learnArt(d, 'bixie', s.t); d.moves.push('bx1'); d.qi = 0;
  assert.equal(A.swordCdMul(d, 'bx1'), 1); assert.equal(A.swordCdMul(d, 'push'), 1); /* loop201：v24 不再一律縮劍招冷卻 */
  const cd = A.cdMul(d, 'bx1', s.t);
  assert.ok(Math.abs(cd - A.MODE31.da.cd * (A.artTier(d, 'bixie') >= 1 ? 0.9 : 1) * (1 - 0.0015 * A.mastery(d, 'shenfa'))) < 1e-9);
  const p1 = dpsOf(s, d); d.qi = Math.min(80, A.qiMax(d)); assert.ok(dpsOf(s, d) > p1, '有內力時打法劍招再靠 qiScale 變重'); /* #390：舊局對照已刪，改比內力有無 */
});

// ---- loop160 Batch 1 ----
import { ARTS, MOVES } from '../../src/data.mjs';
const NEW24 = ['basicSword', 'huashanSword', 'sanxianSword', 'wuhuBlade', 'shaolinStaff', 'tuinaHand', 'stepFeather', 'stepEight'];
test('loop160 Batch1：8 門公共武學存在、招式齊全、有門類與屬性', () => {
  for (const id of NEW24) { const a = ARTS.find((x) => x.id === id); assert.ok(a?.v24, id); assert.ok(A.ART_CAT[id], id); assert.ok(['yin', 'yang', 'he'].includes(a.attr), id);
    for (const m of a.techs) if (a.school !== 'step') assert.ok(MOVES.find((x) => x.id === m), m); }
  for (const id of ['basicSword', 'huashanSword', 'sanxianSword']) assert.ok(A.isSwordArt(id));
});
test('loop160 Batch1：舊局看不到也學不到新武學；新局可學', () => {
  const n = hero(V()); n.v23 = n.v24 = true; /* d.v24 於首個 tick 標記 */
  for (const id of NEW24) assert.equal(A.artOk(n, ARTS.find((x) => x.id === id)), true);
});
test('loop160 Batch1.2：藏經閣圖譜——v24 讀書可得抄本；舊局不會', () => {
  const s = V(), d = hero(s); d.v23 = d.v24 = true; const g = A.studyChart24(s, d, () => 0); assert.ok(g && d.arts[g.art.id]); assert.equal(s.v24n.chart, 1);
  const s2 = V(), d2 = hero(s2); d2.v23 = d2.v24 = true; assert.equal(A.studyChart24(s2, d2, () => 0.9), null);
});

// ---- loop161 Batch 2 ----
test('loop161 Batch2：陰陽共鳴——陰＋陽 ×1.08、陰陽和 ×1.12；舊局恆為 1', () => {
  const s = V(), d = hero(s); d.v23 = d.v24 = true; const big = 1e6;
  d.arts = { tuinaHand: { xp: big } }; assert.equal(A.harmonyMul(d), 1);
  d.arts.wuhuBlade = { xp: big }; assert.equal(A.harmonyOf(d), 'yy'); assert.equal(A.harmonyMul(d), 1.08);
  d.arts.basicSword = { xp: big }; assert.equal(A.harmonyMul(d), 1.12);
  assert.equal(A.attrOf({ tags: ['剛'] }), 'yang'); assert.equal(A.attrOf({ tags: ['柔'] }), 'yin');
});
test('loop161 Batch2：奇門封穴——隊中有奇門造詣才 > 0；舊局為 0', () => {
  const s = V(), d = hero(s); d.v23 = d.v24 = true; d.arts = { tuinaHand: { xp: 1e6, gm: { e: 20, ms: 0 } } };
  assert.ok(A.fengxueK(s, [d]) > 0);
});

// ---- loop162 Batch 3 ----
test('loop162 Batch3：頓悟詞綴——大成時依雜湊得字訣，只得一次、可重現；舊局沒有', () => {
  const mk = () => { const s = V(), d = hero(s); d.v23 = d.v24 = true; d.arts = { basicSword: { xp: 60 } }; return [s, d]; };
  const [s, d] = mk(), g = A.affix24(s, d); assert.ok(g); assert.ok(d.arts.basicSword.affix); assert.equal(A.affix24(s, d), null); assert.equal(s.v24n.affix, 1);
  const [, d2] = mk(); A.affix24(V(), d2); assert.equal(d2.arts.basicSword.affix, d.arts.basicSword.affix);
  const x = A.affixOf(d, 'basicSword'); assert.ok((x.dmg || 1) * (1 / (x.cd || 1)) > 1);
  assert.notEqual(A.affixMul(d, 'bs1', x.dmg ? 'dmg' : 'cd'), 1);
});

// ---- loop163 Batch 4 ----
import { SECTS } from '../../src/data.mjs';
import { sgainOf } from '../../src/sect.mjs';
test('loop163 Batch4：五個新門派只在 v2.4 新局可指定；舊局給 sect24 仍走原門派', () => {
  for (const k of ['emei', 'wudang', 'taohua', 'gumu', 'xingxiu']) { assert.ok(SECTS[k].v24); const s = V({ sect24: k }); assert.equal(s.sect.id, k);
    for (const a of SECTS[k].tree) assert.ok(ARTS.find((x) => x.id === a), a); }
  assert.equal(V().sect.id, 'wuming');
});
test('loop163 Batch4：古墓寒玉床——門人 ≤5 才 ×1.5', () => {
  const s = V({ sect24: 'gumu' }); s.sect.fac = true; const n = s.ds.filter((d) => d.role !== 'laborer').length;
  assert.equal(sgainOf(s), n <= 5 ? 1.5 : 1);
  while (s.ds.filter((d) => d.role !== 'laborer').length <= 5) s.ds.push({ ...s.ds[0], id: 'x' + s.ds.length, role: 'disciple' }); assert.equal(sgainOf(s), 1);
});

// ---- loop164 Batch 5 ----
import { execFileSync } from 'node:child_process';
test('loop164 Batch5：diag-v24-v25 四種策略各跑 1 局 2 日，不崩潰、欄位齊全', () => {
  for (const st of ['idle', 'bot', 'farm', 'exp']) { const out = execFileSync(process.execPath, [new URL('../../tools/diag/diag-v24-v25.mjs', import.meta.url).pathname, st, '1', '1004', '2'], { env: { ...process.env, SS_DT: '6' } }).toString().trim();
    const r = JSON.parse(out); assert.equal(r.crash, 0, r.err); assert.equal(r.strat, st); for (const k of ['coin', 'pow', 'produce', 'affix', 'fengxue', 'formation', 'chart', 'lsFirst', 'new24']) assert.ok(k in r, k); }
});

// ---- loop164 Batch 4.1⑥／4.2／4.3 ----
import { sectBiasMul, WUMING_KIT24 } from '../../src/data.mjs';
test('loop164 Batch4.1⑥：v24 華山劍宗、氣宗補華山劍法線；舊局樹不變', () => {
  for (const id of ['linghuchong', 'yuebuqun']) { const s = createState(7, { kind: 'template', id, askMajor: false, v22: true }); for (const k of ['basicSword', 'huashanSword', 'sanxianSword']) assert.ok(s.sect.tree.includes(k), id + k); }
});
test('loop164 Batch4.2：自創無名派依主價值帶家傳三件套並入本門樹；名門掌門帶 T1 根基；舊局不帶', () => {
  const s = V(); const h = hero(s), kit = WUMING_KIT24[s.hero.main]; assert.ok(kit); for (const k of kit) { assert.ok(h.arts[k], k); assert.ok(s.sect.tree.includes(k)); }
  const w = V({ sect24: 'wudang' }); assert.ok(hero(w).arts.breath && hero(w).arts.wudangFist /* loop168 武當長拳先於基礎劍法 */);
});
test('loop164 Batch4.2 百納海川：無名派 v24 學外門名學不罰 ×0.7；他派照罰', () => {
  const a = { id: 'dugu', classic: true, tags: [] }; const d = { stree: ['x'], sbias: {}, v24: true, sectId: 'wuming' };
  assert.equal(sectBiasMul(d, a)[1], 1); assert.ok(sectBiasMul({ ...d, sectId: 'emei' }, a)[1] < 1);
});
test('loop164 Batch4.3 本門傳承鎖：他派專屬名學預設鎖住，主門類造詣 ≥40 且品階 ≤2 解鎖；本門優先排序', () => {
  const s = V({ sect24: 'emei' }); tick(s, 0.1); const d = hero(s); const a = A.artById('tantui'), z = A.artById('dugu');
  const c = A.primaryCat(a.id); const lo = { ...d, gm: undefined }; assert.ok(A.mastery(lo, c) < 40); assert.equal(A.lockedArt24(lo, a), true);
  const hi = { ...d, arts: { ...d.arts } }; for (const k of Object.keys(A.ART_CAT)) if (A.ART_CAT[k][c] && k !== 'tantui') hi.arts[k] = { xp: 100, gm: { e: 99 } };
  assert.ok(A.mastery(hi, c) >= 40, String(A.mastery(hi, c))); assert.equal(A.lockedArt24(hi, a), false);
  for (const k of Object.keys(A.ART_CAT)) if (A.ART_CAT[k].jianfa && k !== 'dugu') hi.arts[k] = { xp: 100, gm: { e: 99 } }; assert.ok(A.mastery(hi, 'jianfa') >= 40); assert.equal(A.lockedArt24(hi, z), true, '品階 4 仍鎖');
  assert.equal(A.lockedArt24({ ...d, sectId: 'wuming' }, a), false);
  assert.ok(A.ownFirst24(d)({ id: 'zzz' }, { id: d.stree[0] }) > 0);
});

// ---- loop165 Batch 5.1 合參推演 ----
test('loop165 Batch5.1：劍法＋身法大成且劍法造詣 ≥45 → 推演《流風迴雪劍》並入本門樹；條件不足不推演；舊局無', () => {
  const s = V(); tick(s, 0.1); const d = hero(s); assert.equal(A.checkDeriveArt(s, d), null);
  for (const k of ['basicSword', 'huashanSword', 'sanxianSword', 'stepFeather']) { A.learnArt(d, k, 0); d.arts[k].xp = 60; d.arts[k].gm = { e: 30 }; }
  const a = A.checkDeriveArt(s, d); assert.equal(a?.id, 'liufengSword'); assert.ok(s.sect.tree.includes('liufengSword')); assert.equal(s.v24n.derive, 1); assert.equal(A.checkDeriveArt(s, d), null);
  assert.ok(A.isSwordArt('liufengSword')); assert.equal(A.DERIVE_RULES24.length, 4);
});
test('loop165 Batch5.1：一般外門弟子不推演（只限掌門、內門、首徒）', () => {
  const s = V(); tick(s, 0.1); const d = s.ds.find((x) => x.id !== 'hero' && x.role !== 'laborer'); if (!d) return; d.role = 'outer';
  for (const k of ['basicSword', 'huashanSword', 'sanxianSword', 'stepFeather']) d.arts[k] = { xp: 60, gm: { e: 30 } }; assert.equal(A.checkDeriveArt(s, d), null); d.role = 'inner'; assert.equal(A.checkDeriveArt(s, d)?.id, 'liufengSword');
});

// ---- loop166 Batch 5.2 山門大比、天下會武 ----
import * as SE from '../../src/sect.mjs';
test('loop166 Batch5.2：山門大比第 10、20 日各一次；魁首心情 +15 並得親傳或熟練；舊局沒有', () => {
  assert.deepEqual(SE.BISAI24.days, [10, 20]); const s = V(); tick(s, 0.1); while (s.ds.filter((d) => d.role !== 'laborer').length < 3) s.ds.push({ ...hero(s), id: 'x' + s.ds.length, name: '甲' + s.ds.length, role: 'outer', arts: { ...hero(s).arts }, mood: 50 });
  const c = SE.bisai24(s); assert.ok(c); assert.equal(s.v24n.bisai, 1); assert.ok(s.log.some((e) => /山門大比/.test(e.msg)));
  s.day = 10; SE.bisaiDaily24(s); SE.bisaiDaily24(s); assert.equal(s.v24n.bisai, 2);
});
test('loop166 Batch5.2：會武第 15、26 日出卡；三種排陣；自動挑期望勝場最高；勝方得名聲、賞銀、靈石、稱號', () => {
  assert.deepEqual(Object.keys(SE.HUIWU24.days).map(Number), [15, 26]); const s = V(); tick(s, 0.1); s.day = 15; const ch = SE.huiwuCard24(s, 15); assert.ok(ch && ch.opts.length === 3); assert.notEqual(ch.opp, s.sect.id);
  const team = SE.huiwuTeam(s), ev = [0, 1, 2].map((i) => SE.expWins(s, team, SE.HUIWU24.days[15].opp, i)); assert.equal(ch.auto, ev.indexOf(Math.max(...ev)));
  for (const x of team) x.d.skills = Object.fromEntries(Object.keys(x.d.skills).map((k) => [k, 999])); const r0 = s.rep || 0, c0 = s.res.coin, l0 = s.res.lingshi || 0;
  SE.huiwuResolve(s, ch, 0); assert.equal(s.v24n.huiwu, 1);
  if (s.v24n.huiwuWin) { assert.equal(s.rep, r0 + 15); assert.equal(s.res.coin, c0 + 45); assert.equal(s.res.lingshi, l0 + 1); assert.ok(s.sect.trophies[0].includes('名門會武魁首')); }
  assert.equal(SE.boutWin(0, 100), 0); assert.ok(SE.boutWin(200, 100) > 0.75);
  const L = SE.lineup24(s, [{ d: 1, p: 30 }, { d: 2, p: 20 }, { d: 3, p: 10 }], [1, 2, 3], 1); assert.deepEqual(L.map((b) => [b.p, b.o]), [[20, 1], [30, 2], [10, 3]]);
});
