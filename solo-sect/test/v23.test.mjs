/* v2.3（loop151–）：專長門類、內功、村中幫工；全部只在 v22 新局（s.v23）生效 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { CATS, supOf, mastery, specGrow, SPEC, zhenK, bestSpec, learnArt } from '../src/arts.mjs';
import { XIA } from '../src/wuxia.mjs';
import { onJoin13 } from '../src/jianghu.mjs';
export const V = (o = {}) => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true, ...o });
export const OLD = () => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false });
const hero = (s) => s.ds.find((d) => d.id === 'hero');

test('loop151 六門專長門類只在 v23 啟用（舊局仍「尚未支援」）', () => {
  const s = V(), o = OLD(); tick(s, 0.1); tick(o, 0.1);
  for (const c of ['zhenfa', 'dushu', 'yishu', 'qimen', 'zaxue']) { assert.equal(supOf(c, hero(s)), 'part'); assert.equal(supOf(c, hero(o)), 'none'); assert.equal(CATS[c].sup, 'none'); }
  assert.equal(supOf('gunbang', hero(s)), 'full'); assert.equal(supOf('gunbang', hero(o)), 'none'); assert.equal(CATS.gunbang.sup, 'none'); /* loop198：v24 棍棒 full，舊表仍是 none */
  assert.equal(supOf('neigong', hero(s)), 'full'); assert.equal(supOf('shenfa', hero(s)), 'full'); assert.equal(CATS.neigong.sup, 'part'); assert.equal(CATS.shenfa.sup, 'part');
  assert.ok(s.v23 && hero(s).v23); assert.ok(!o.v23 && !hero(o).v23);
});
test('loop151 活動長專長：煉丹／療傷→醫術、採藥→毒術、守望／讀書／練功→陣法', () => {
  const s = V(); tick(s, 0.1); const d = hero(s); learnArt(d, 'yaowang', s.t); learnArt(d, 'xingxiuDu', s.t); learnArt(d, 'qimenZhen', s.t);
  const m0 = ['yishu', 'dushu', 'zhenfa'].map((c) => mastery(d, c));
  specGrow(d, 'brew'); specGrow(d, 'heal'); specGrow(d, 'forage'); specGrow(d, 'watch'); specGrow(d, 'study'); specGrow(d, 'train');
  const m1 = ['yishu', 'dushu', 'zhenfa'].map((c) => mastery(d, c)); m1.forEach((v, i) => assert.ok(v > m0[i], `cat ${i}`));
  const o = OLD(); tick(o, 0.1); assert.equal(specGrow(hero(o), 'brew'), 0);
});
test('loop151 程瑛／阿紫／程靈素：只在 v23 進池，入門帶招牌', () => {
  for (const k of ['chengying', 'azi', 'chenglingsu']) assert.ok(XIA[k]);
  const s = V(); tick(s, 0.1); const d = hero(s);
  onJoin13(s, d, 'chengying'); assert.ok(d.arts.qimenZhen); tick(s, 0.1); assert.ok(bestSpec(s, 'zhenfa') > 0); assert.ok(zhenK(s) > 0 && zhenK(s) <= 1);
});
test('loop151 陣法：守柵時柵受傷減少（封頂 25%）', () => {
  assert.equal(SPEC.zhenMit, 0.25); const s = V(); tick(s, 0.1); hero(s).arts.qimenZhen = { xp: 99, gm: { e: 55, ms: 0 } };
  assert.ok(zhenK(s) === 1);
});
import * as PU from '../src/panel-ui.mjs';
test('loop152 角色卡門類造詣：v23 顯示專長效果說明，舊局仍標尚未支援', () => {
  const f = Object.values(PU).find((x) => typeof x === 'function' && /SPEC_TIP/.test(String(x))); assert.ok(f);
  const s = V(); tick(s, 0.1); const d = hero(s); learnArt(d, 'yaowang', s.t); d.arts.yaowang.gm = { e: 20, ms: 0 };
  assert.match(f(d), /醫術：療傷回復/); const o = OLD(); tick(o, 0.1); assert.match(f(hero(o)), /尚未支援/);
});
import { speedOf } from '../src/sim.mjs';
import { NG23, NG, yuqiOn, yuqiMul, qiStrikeMul, qiSwordMul24, swordCdMul, medQi, qiMax, innerSpecs } from '../src/arts.mjs';
test('loop153 三段腳程：v23 輕功每階 6%；御氣疾行要內功小成以上且內力 >30%，耗氣停在三成', () => {
  const s = V(); tick(s, 0.1); const d = hero(s); learnArt(d, 'breath', s.t); d.arts.breath.xp = 60; d.qi = qiMax(d);
  assert.ok(qiMax(d) > 0); assert.ok(yuqiOn(d)); assert.ok(yuqiMul(d) >= 1.15);
  d.path = [{ xy: [d.pos[0] + 5000, d.pos[1]], n: 'x' }]; const v1 = speedOf(d); d.v23 = false; const v0 = speedOf(d); d.v23 = true; assert.ok(v1 > v0);
  for (let i = 0; i < 2000; i++) tick(s, 0.25); assert.ok(d.qi >= qiMax(d) * NG23.yuqi.keep - 1e-9 || d.path.length === 0);
  assert.ok(!(d.spentUntil > s.t) || !d.path.length);
});
test('loop153 打坐 +16（紫霞 +4）、舊局仍 12；真氣出手與劍招只在 v23', () => {
  const s = V(); tick(s, 0.1); const d = hero(s); assert.ok(Math.abs(medQi(d) - 16 * (1 + 0.004 * mastery(d, 'neigong'))) < 1e-9); assert.equal(NG.med, 12); /* loop198：內功造詣加成打坐 */
  d.zixia = 2; assert.ok(Math.abs(qiStrikeMul(d) - (1 + 0.15 * qiOf2(d) / 100 + 0.002 * mastery(d, 'neigong')) * qiSwordMul24(d)) < 1e-9); assert.equal(swordCdMul(d, { id: 'bx1' }), d.sectId === 'jianzong' ? 0.76 : 0.86); /* loop199 */
  const o = OLD(); tick(o, 0.1); const h = hero(o); h.zixia = 2; assert.equal(qiStrikeMul(h), 1); assert.equal(swordCdMul(h, { id: 'bx1' }), 1); assert.equal(medQi(h), 12);
  learnArt(d, 'jiuyang', s.t); assert.ok(innerSpecs(d).includes('jiuyang')); assert.deepEqual(innerSpecs(h), []);
});
import { qiStatus, neigongRules2Html } from '../src/panel-ui.mjs';
test('loop154 介面：內功被動與 v2.3 內功規則只在 v23 顯示', () => {
  const s = V(); tick(s, 0.1); const d = hero(s); learnArt(d, 'breath', s.t); d.arts.breath.xp = 60; d.ng = 1; d.ng2 = 1; d.qi = qiMax(d);
  assert.match(qiStatus(d, s.t), /內功被動：吐納/); assert.match(qiStatus(d, s.t), /御氣疾行/); assert.match(neigongRules2Html(d), /打坐一次 \+16/);
  const o = OLD(); tick(o, 0.1); const h = hero(o); learnArt(h, 'breath', o.t); assert.doesNotMatch(qiStatus(h, o.t), /內功被動/); assert.match(neigongRules2Html(h), /打坐一次 \+12/);
});
import { canHire, hire, laborCap, buildWhy, isEliteHermit, laborSpeed, scoreActs, canInvite } from '../src/sim.mjs';
import { LABOR_POOL, LABOR23 } from '../src/data.mjs';
import { canDefend } from '../src/threat.mjs';
const rich = (s) => { s.res.coin = 999; s.res.food = 999; s.res.wood = 99; s.res.stone = 99; s.rep = 99; };
test('loop155 村舍大院只在 v23 可蓋；床位 8', () => {
  const s = V(), o = OLD(); for (const x of [s, o]) { rich(x); x.fac.shed.stage = 2; }
  assert.equal(buildWhy(o, 'shed'), '已到頂'); assert.equal(buildWhy(s, 'shed'), null); s.fac.shed.stage = 3; assert.equal(laborCap(s) >= 8, true);
});
test('loop155 v23 第 7 位起雇到新幫工，帶專長；舊局只有原六人', () => {
  const s = V(), o = OLD(); for (const x of [s, o]) { rich(x); x.fac.shed.stage = 2; }
  s.fac.shed.stage = 3; for (let i = 0; i < 8; i++) assert.ok(hire(s).ok, `hire ${i}`); const L = s.ds.filter((d) => d.role === 'laborer');
  assert.ok(L.some((d) => d.id === 'shibo')); assert.ok(L.every((d) => d.lspec === LABOR23.spec[d.id]));
  for (let i = 0; i < 4; i++) hire(o); assert.ok(o.ds.filter((d) => d.role === 'laborer').every((d) => !d.lspec && LABOR_POOL.some((p) => p.id === d.id)));
});
test('loop155 幫工專長：評分 ×1.35、快 20%；v23 幫工可種菜煮飯挑水修柵採藥', () => {
  const s = V(); rich(s); s.fac.shed.stage = 1; hire(s); tick(s, 0.1); const d = s.ds.find((x) => x.role === 'laborer');
  assert.equal(laborSpeed(s, d, d.lspec), 1.2); assert.equal(laborSpeed(s, d, 'build'), 1);
  const acts = new Set(scoreActs(s, d).map((o) => o.act)); for (const a of acts) assert.ok(['rest', 'eat', 'chat', 'leisure', 'chop', 'quarry', 'build', 'farm', 'cook', 'water', 'repair', 'forage', 'defend'].includes(a), a);
});
test('loop155 清修山莊：弟子 ≤3 且幫工 ≥2；隱世高人身分已明可守柵、可直接邀入門', () => {
  const s = V(); rich(s); s.fac.shed.stage = 2; hire(s); hire(s); tick(s, 0.1);
  while (s.ds.filter((d) => d.role !== 'laborer').length > 3) s.ds.splice(s.ds.findIndex((d) => d.role !== 'laborer' && d.id !== 'hero'), 1);
  assert.ok(isEliteHermit(s)); assert.equal(laborSpeed(s, hero(s), 'train'), 1.2); assert.equal(isEliteHermit(OLD()), false);
  const L = s.ds.find((d) => d.role === 'laborer'); L.hp = 100; L.needs.energy = 100; assert.equal(canDefend(L), false);
  L.hidden = { art: 'tantui', shown: true }; assert.equal(canDefend(L), true); s.ds.splice(s.ds.findIndex((d) => d.role !== 'laborer' && d.id !== 'hero'), 1); const ci = canInvite(s, L.id); assert.ok(ci.ok, ci.why);
});
// ---- loop157 wrap-up：補齊規格驗收清單 ----
import { jhResolve } from '../src/jianghu.mjs';
import { LABOR_ACTS23 } from '../src/data.mjs';
import { restQi, qiSchool, qiAoeAdd, swordDmgMul, hasPoison, specK } from '../src/arts.mjs';
test('loop157 專長效果：毒術削敵、醫術解餘毒、陣法減速／先手；強度隨造詣封頂', () => {
  assert.equal(SPEC.poisonWeak, 0.15); assert.equal(SPEC.poisonT, 6); assert.equal(SPEC.zhenSlow, 0.2); assert.equal(SPEC.zhenScout, 0.15); assert.equal(SPEC.healMax, 0.5); assert.equal(SPEC.brewEvery, 3);
  assert.equal(specK(20), 0.5); assert.equal(specK(400), 1);
  const s = V(); tick(s, 0.1); const d = hero(s); assert.equal(hasPoison(s), false);
  onJoin13(s, d, 'azi'); tick(s, 0.1); assert.ok(hasPoison(s)); const o = OLD(); tick(o, 0.1); assert.equal(hasPoison(o), false);
  s.jh.poison = { id: d.id, until: s.t + 999 }; tick(s, 0.1); assert.ok(s.jh.poison, '無醫者不解');
  onJoin13(s, d, 'chenglingsu'); tick(s, 0.1); assert.equal(s.jh.poison, null);
});
test('loop157 內功被動：吐納歇息回氣 ×1.5、紫霞打坐 +4／二層起氣宗 ×1.35、範圍半徑、劍招小成以下 +10%', () => {
  const s = V(); tick(s, 0.1); const d = hero(s); delete d.arts.breath; /* loop164 無名派家傳已帶吐納 */ const r0 = restQi(d); learnArt(d, 'breath', s.t); assert.equal(restQi(d), r0 * 1.5);
  learnArt(d, 'zixia', s.t); assert.ok(Math.abs(medQi(d) - 20 * (1 + 0.004 * mastery(d, 'neigong'))) < 1e-9); d.zixia = 1; assert.equal(qiSchool(d), false); d.zixia = 2; assert.equal(qiSchool(d), true); /* loop198 */
  d.ng = 1; d.arts.zixia.xp = 100; d.qi = Math.min(60, qiMax(d)); assert.ok(d.qi >= 50, String(qiMax(d))); assert.equal(qiAoeAdd(d, { aoe: 30 }), 15); d.qi = 10; assert.equal(qiAoeAdd(d, { aoe: 30 }), 0); assert.equal(qiAoeAdd(d, {}), 0);
  assert.equal(swordDmgMul(d, { skill: 'palm' }), 1);
});
test('loop157 九陽：站定自回氣（舊局不回）', () => {
  const s = V(), o = OLD(); for (const x of [s, o]) { tick(x, 0.1); const d = hero(x); learnArt(d, 'jiuyang', x.t); d.ng = 1; d.qi = 1; d.path = []; }
  const a = hero(s), b = hero(o); const qa = a.qi, qb = b.qi; tick(s, 0.25); tick(o, 0.25);
  assert.ok(a.qi - qa > b.qi - qb, `${a.qi - qa} vs ${b.qi - qb}`);
});
test('loop157 御氣耗氣：玉女心經耗氣減半；低於三成不再御氣、也不力竭', () => {
  const s = V(); tick(s, 0.1); const d = hero(s); learnArt(d, 'breath', s.t); d.arts.breath.xp = 60; d.ng = 1; d.ng2 = 1;
  d.qi = qiMax(d) * 0.3; assert.equal(yuqiOn(d), false); assert.equal(yuqiMul(d), 1); d.qi = qiMax(d); assert.ok(yuqiOn(d));
  assert.ok(!(d.spentUntil > s.t));
});
test('loop157 幫工活計：v23 評分表確實出現種菜／煮飯／挑水／修柵；高人揭露後仍是幫工並可守柵', () => {
  const s = V(); rich(s); s.fac.shed.stage = 3; for (let i = 0; i < 8; i++) hire(s); tick(s, 0.1);
  const seen = new Set(); for (const d of s.ds.filter((x) => x.role === 'laborer')) { d.needs.hunger = 90; d.needs.energy = 90; for (const o of scoreActs(s, d)) seen.add(o.act); }
  s.res.food = 0; s.fence = Math.max(0, (s.fence ?? 50) - 40); s.res.water = 0;
  for (const d of s.ds.filter((x) => x.role === 'laborer')) for (const o of scoreActs(s, d)) seen.add(o.act);
  for (const a of ['farm', 'cook', 'water', 'repair', 'forage']) assert.ok(LABOR_ACTS23.includes(a), a); assert.ok(seen.has('farm') && seen.has('forage'), [...seen].join());
  const L = s.ds.find((d) => d.role === 'laborer'); L.hidden = { art: 'tantui', shown: false }; L.hp = 100; L.needs.energy = 100;
  jhResolve(s, { jh: 'axe' }, 0); assert.equal(L.role, 'laborer'); assert.ok(L.hidden.shown); assert.ok(canDefend(L));
  const o = OLD(); rich(o); o.fac.shed.stage = 2; hire(o); const M = o.ds.find((d) => d.role === 'laborer'); M.hidden = { art: 'tantui', shown: false }; jhResolve(o, { jh: 'axe' }, 0); assert.equal(M.role, 'outer');
});
test('loop157 清修 +20%：練功／打坐／讀書三項都加，幫工與非清修局不加', () => {
  const s = V(); rich(s); s.fac.shed.stage = 2; hire(s); hire(s); tick(s, 0.1);
  while (s.ds.filter((d) => d.role !== 'laborer').length > 3) s.ds.splice(s.ds.findIndex((d) => d.role !== 'laborer' && d.id !== 'hero'), 1);
  for (const a of ['train', 'meditate', 'study']) assert.equal(laborSpeed(s, hero(s), a), 1.2, a); assert.equal(laborSpeed(s, hero(s), 'chop'), 1);
  const L = s.ds.find((d) => d.role === 'laborer'); assert.equal(laborSpeed(s, L, 'train'), 1);
  s.ds.filter((d) => d.role === 'laborer').slice(1).forEach((d) => s.ds.splice(s.ds.indexOf(d), 1)); assert.equal(isEliteHermit(s), false); assert.equal(laborSpeed(s, hero(s), 'train'), 1);
});
// ---- loop157 擁有人 t188：劍招判定修正、出手倍率統一入口、藏經閣補位 ----
import { cdMul, moveMul, isSwordMove, qiOf as qiOf2 } from '../src/arts.mjs';
import { readFileSync } from 'node:fs';
import { dpsOf } from '../src/world.mjs';
import { stewFallback } from '../src/economy.mjs';
test('loop157 劍招：辟邪／獨孤九劍真實招式吃 cdMul ×0.82 與 moveMul +10%；掌法不吃；舊局不吃', () => {
  const s = V(); tick(s, 0.1); const d = hero(s); learnArt(d, 'bixie', s.t); d.qi = 0;
  assert.ok(isSwordMove('bx1') && isSwordMove('dg1') && isSwordMove('xt1')); assert.equal(isSwordMove('qm1'), false);
  for (const mv of ['bx1', 'dg1']) { const c1 = cdMul(d, mv, s.t), m1 = moveMul(d, mv, s.t); d.v23 = false; const c0 = cdMul(d, mv, s.t), m0 = moveMul(d, mv, s.t); d.v23 = true;
    assert.ok(Math.abs(c1 / c0 - (d.sectId === 'jianzong' ? 0.76 : 0.86)) < 1e-9, mv); assert.ok(Math.abs(m1 / m0 - qiStrikeMul(d) * swordDmgMul(d, mv)) < 1e-9, `${mv} ${m1 / m0}`); } /* loop199：v24 一般劍冷卻 0.86、小成前 ×1.08；劍宗另計 */
  learnArt(d, 'qimenZhen', s.t); const c1 = cdMul(d, 'qm1', s.t); d.v23 = false; assert.equal(cdMul(d, 'qm1', s.t), c1); d.v23 = true;
});
test('loop157 以氣御招走 moveMul0：內力越多越重、氣宗再 ×1.35；巡山 dpsOf 同步反映，且巡獵不再重複乘', () => {
  const s = V(); tick(s, 0.1); const d = hero(s); learnArt(d, 'breath', s.t); d.arts.breath.xp = 100; d.ng = 1; d.ng2 = 1;
  d.qi = 0; const m0 = moveMul(d, d.moves[0], s.t), p0 = dpsOf(s, d); d.qi = Math.min(100, qiMax(d)); const q = qiOf2(d), add = 0.002 * mastery(d, 'neigong');
  assert.ok(Math.abs(moveMul(d, d.moves[0], s.t) / m0 - (1 + 0.15 * q / 100 + add) / (1 + add)) < 1e-9); assert.ok(dpsOf(s, d) > p0);
  d.zixia = 2; assert.ok(Math.abs(qiStrikeMul(d) - (1 + 0.15 * q / 100 + add) * qiSwordMul24(d)) < 1e-9); d.zixia = 0; d.sectId = 'qizong'; assert.ok(Math.abs(qiStrikeMul(d) - (1 + 0.15 * q / 100 + add) * qiSwordMul24(d)) < 1e-9); /* loop199：氣宗改乘以氣御劍，不再固定 ×1.35 */
  learnArt(d, 'bixie', s.t); d.moves.push('bx1'); const pb = dpsOf(s, d); d.v23 = false; const pb0 = dpsOf(s, d); d.v23 = true; assert.ok(pb > pb0);
  const src = readFileSync(new URL('../src/sim.mjs', import.meta.url), 'utf8'); assert.doesNotMatch(src, /qiStrikeMul\(|swordDmgMul\(|swordCdMul\(/);
});
test('loop157 P7：v23 藏經閣名聲門檻 10；執事有膳房、門人 ≥4、木 ≥5 就立藏經閣（舊 v22 照舊要木樁場＋6 人）', () => {
  const s = V(); tick(s, 0.1); s.rep = 10; s.res.coin = 99; s.res.wood = 5; s.fac.kitchen.stage = 1; s.fac.yard.stage = 0;
  assert.equal(buildWhy(s, 'library'), null); const o = OLD(); o.rep = 10; o.res.coin = 99; assert.match(String(buildWhy(o, 'library')), /名聲不足/);
  while (s.ds.filter((d) => d.role !== 'laborer').length < 4) s.ds.push({ ...hero(s), id: 'x' + s.ds.length });
  assert.equal(stewFallback(s), 'library'); s.res.wood = 4; assert.notEqual(stewFallback(s), 'library');
  const w = V({ v23off: true }); delete w.v23; tick(w, 0.1); w.res.wood = 50; w.res.stone = 50; w.fac.kitchen.stage = 1; assert.equal(stewFallback(w), null);
});
test('loop157 P6：靈石 30 錢、每集限 2', async () => {
  const EC = await import('../src/economy.mjs'); assert.deepEqual(EC.MARKET.rare.lingshi, { price: 30, max: 2 }); assert.deepEqual(EC.MARKET.rare.tiemu, { price: 35, max: 2 });
});
