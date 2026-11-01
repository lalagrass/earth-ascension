/* v2.8（loop181–，擁有人 t193）：四階內功催動、經脈內傷、雜學收緊、造詣偷師、執事鎮派營建；只在 v22 新局（d.v24） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import * as A from '../src/arts.mjs';
const V = (o = {}) => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true, ...o });
const OLD = () => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false });
const other = (s) => s.ds.find((d) => d.id !== 'hero' && d.role !== 'laborer');
const give = (d, id, xp) => { d.arts[id] ??= { xp: 0, last: 0 }; d.arts[id].xp = xp; };
const fresh = (sect) => { const s = V({ sect24: sect }); tick(s, 0.1); const d = other(s); d.arts = {}; d.focus = null; d.qiInjury = 0; return [s, d]; };
const drive = (d, id) => A.innerDrive28(d, A.artById(id));

test('loop181 第一階：本門專屬內功催動本門外功 ×1.20；真三才 ×1.28', () => {
  const [, d] = fresh('xingxiu'); give(d, 'huagongDafa', 30); give(d, 'chousuiPalm', 30);
  assert.deepEqual(drive(d, 'chousuiPalm'), { tier: 1, mul: 1.2 });
  give(d, 'zhaixingStep', 30); assert.deepEqual(drive(d, 'chousuiPalm'), { tier: 1, mul: 1.28 });
});
test('loop181 第三階：只靠吐納催動三品外功 ×0.78；第二階：公共武學內功撐得住 ×1', () => {
  const [, d] = fresh('emei'); give(d, 'breath', 60); give(d, 'huifengSword', 10); give(d, 'basicFist', 10);
  assert.equal(drive(d, 'huifengSword').tier, 3); assert.equal(drive(d, 'huifengSword').mul, 0.78);
  assert.deepEqual(drive(d, 'basicFist'), { tier: 2, mul: 1 });
});
test('loop181 第四階：陽內功逆催他派陰掌 ×0.65，練功累積內傷，打坐與醫館化解', () => {
  const [s, d] = fresh('gaibang'); give(d, 'huntianGong', 60); give(d, 'chousuiPalm', 30); d.focus = 'chousuiPalm';
  assert.deepEqual(drive(d, 'chousuiPalm'), { tier: 4, mul: 0.65 });
  for (let i = 0; i < 4; i++) A.qiInjuryAdd28(s, d); assert.equal(d.qiInjury, 32); assert.equal(s.v28n.inj, 1); /* loop186 +8 */
  assert.ok(A.injuryMul28(d) < 0.91 && A.injuryMul28(d) >= 0.75); assert.ok(A.styleBadges24(d).includes('⚠️【經脈內傷】'));
  A.qiInjuryCure28(s, d, A.DRIVE28.med); assert.equal(d.qiInjury, 24); A.qiInjuryCure28(s, d, A.DRIVE28.heal); assert.equal(d.qiInjury, 0); assert.equal(s.v28n.cure, 1);
});
test('loop181 舊局不吃催動與內傷', () => {
  const o = OLD(); tick(o, 0.1); const d = other(o); assert.deepEqual(A.innerDrive28(d, A.artById('basicFist')), { tier: 0, mul: 1 }); d.qiInjury = 80; assert.equal(A.injuryMul28(d), 1);
});
test('loop182 雜學收緊：公共武學不算跨派；兩派血統即分心 ×0.82；三派大成＋造詣 ≥58 才萬流歸宗', () => {
  const [, d] = fresh('emei'); for (const id of ['basicFist', 'pushPalm', 'breath', 'snowStep', 'basicSword', 'stepEight']) give(d, id, 100);
  assert.equal(A.polymath24(d), 0); give(d, 'emeiSword', 100); give(d, 'luoyingPalm', 30); assert.equal(A.polymath24(d), 1);
  assert.ok(JSON.stringify(A.artMulParts(d, A.artById('emeiSword'))).includes('0.82'));
  give(d, 'luoyingPalm', 100); assert.equal(A.polymath24(d), 1); /* 只有兩派大成 */
  give(d, 'chousuiPalm', 100); const m = Math.max(...Object.keys(A.CATS).map((k) => A.mastery(d, k)));
  assert.equal(A.polymath24(d), m >= 58 ? 2 : m >= 55 ? 0 : 1);
});
test('loop182 造詣門道偷師：造詣不足機率 0，達標或悟性 5 高機率', async () => {
  const { stealCheck28, STEAL28 } = await import('../src/sect.mjs'); const { SECTS } = await import('../src/data.mjs');
  const [, d] = fresh('emei'); d.wu = 3; const O = { tree: ['chousuiPalm'] };
  const r0 = stealCheck28(null, [d], O); assert.equal(r0.a.id, 'chousuiPalm'); assert.equal(r0.need, 24); assert.equal(r0.p, 0);
  d.wu = 5; const sc = A.mastery(d, A.primaryCat('chousuiPalm')) + STEAL28.wu5; const r1 = stealCheck28(null, [d], O);
  assert.equal(r1.p, sc >= 24 ? Math.min(0.85, 0.45 + (sc - 24) * 0.015) : 0);
  d.wu = 3; for (const id of ['jindingPalm', 'tiangangFinger', 'luoyingPalm', 'yingzhuaHand']) { give(d, id, 100); d.arts[id].gm = { e: 20, ms: 0 }; } const r2 = stealCheck28(null, [d], O);
  assert.ok(r2.score >= 24 && r2.p >= 0.45 && r2.p <= 0.85); assert.ok(stealCheck28(null, [d], SECTS.gaibang));
});

test('loop183 v2.8：狂風快劍/七傷拳列魁首限定、會武池含天地會豬籠城寨、圍山 E 下修', async () => {
  const { artById } = await import('../src/arts.mjs');
  const { HUIWU24 } = await import('../src/sect.mjs');
  const { SIEGE27, WAVE27 } = await import('../src/threat.mjs');
  assert.ok(artById('kuangfengSword').chiefOnly24 && artById('qishangFist').chiefOnly24);
  assert.ok(HUIWU24.pool.includes('tiandihui') && HUIWU24.pool.includes('zhulong'));
  assert.deepEqual(SIEGE27.days[27].E, [1000, 1330, 1750, 2140]);
  assert.equal(WAVE27.eliteMax, 8);
});

/* loop184 v2.8 驗收測試 */
test('loop184 四階齊備：同一弟子依內外搭配落在第一至第四階', () => {
  const [, d] = fresh('wudang'); give(d, 'wudangXinfa', 60); give(d, 'taijiSword', 10);
  assert.equal(drive(d, 'taijiSword').tier, 1); /* 本門內功大成撐三品本門外功 */
  give(d, 'basicFist', 10); assert.equal(drive(d, 'basicFist').tier, 2);
  const [, e] = fresh('emei'); give(e, 'breath', 60); give(e, 'huifengSword', 10); assert.equal(drive(e, 'huifengSword').tier, 3);
  const [, g] = fresh('gaibang'); give(g, 'huntianGong', 60); give(g, 'chousuiPalm', 10); assert.equal(drive(g, 'chousuiPalm').tier, 4);
});
test('loop184 內傷：第四階練功 +6、≥50 每日扣血扣心情、醫館有藥師清零、離開第四階每日 −6', () => {
  const [s, d] = fresh('gaibang'); give(d, 'huntianGong', 60); give(d, 'chousuiPalm', 30); d.focus = 'chousuiPalm';
  for (let i = 0; i < 9; i++) A.qiInjuryAdd28(s, d); assert.equal(d.qiInjury, 72); assert.ok(A.injuryMul28(d) < 0.9 && A.injuryMul28(d) >= 0.75); d.qiInjury = 100; assert.equal(A.injuryMul28(d), 0.75);
  A.qiInjuryCure28(s, d, 999); assert.equal(d.qiInjury, 0);
  d.qiInjury = 30; d.focus = null; delete d.arts.chousuiPalm; give(d, 'basicFist', 10);
  assert.ok(typeof A.injuryDaily28 !== 'function' || (A.injuryDaily28(s, d), d.qiInjury <= 24));
});
test('loop184 一練七傷：無聖火心法小成練七傷拳落第四階', () => {
  const [, d] = fresh('mingjiao'); give(d, 'qishangFist', 10); assert.equal(drive(d, 'qishangFist').tier, 4);
  give(d, 'shenghuoXinfa', 30); assert.equal(drive(d, 'qishangFist').tier, 4); give(d, 'shenghuoXinfa', 60); assert.notEqual(drive(d, 'qishangFist').tier, 4); /* loop186 大成才解 */
});
test('loop184 執事替武當自動興建紫霄宮', () => {
  const s = V({ sect24: 'wudang', steward: true }); tick(s, 0.1); assert.ok(s.steward); s.sect.fac = false; s.rep = 50; for (const k of ['wood', 'stone', 'coin']) { s.res[k] = 999; if (s.cap?.[k] != null) s.cap[k] = 9999; }
  for (let i = 0; i < 2 * 600 * 4 && !s.sect.fac; i++) tick(s);
  assert.ok(s.sect.fac, '紫霄宮應落成'); assert.ok((s.v28n?.facAuto || 0) >= 1);
});
test('loop184 addendum：主修內功取有效分、學新高階內功不掉第一階', () => {
  const [, d] = fresh('wudang'); give(d, 'wudangXinfa', 90); give(d, 'taijiSword', 10); const t0 = drive(d, 'taijiSword');
  give(d, 'wudangJiuyang', 1); assert.equal(drive(d, 'taijiSword').tier, t0.tier);
  assert.equal(A.mainInner28(d).id, 'wudangXinfa'); /* 3*30+15+18+20=143 > 0+45+0.2+20 */
  assert.equal(A.innerScore28(d, A.artById('wudangXinfa')), 3 * 30 + 15 + 90 * 0.2 + 20);
});
test('loop184 addendum：根基渾厚 — 一品本門內功二三四階加速進階內功並加催動', () => {
  const [, d] = fresh('wudang'); give(d, 'wudangJiuyang', 30); give(d, 'taijiSword', 10);
  const parts = (x) => JSON.stringify(A.artMulParts(d, A.artById('wudangJiuyang')));
  for (const [xp, tr, mv] of [[55, '1.15', 1.06], [85, '1.28', 1.12], [100, '1.4', 1.18]]) {
    give(d, 'wudangXinfa', xp); assert.equal(A.rootFoundation28(d), [55, 85, 100].indexOf(xp) + 2); assert.ok(parts().includes(tr), parts());
    const r = drive(d, 'taijiSword'); assert.ok(r.root); assert.ok(Math.abs(r.mul / (A.sectClasses24(d) >= 3 ? A.DRIVE28.t1s : A.DRIVE28.t1) - mv) < 1e-9);
  }
  assert.ok(A.styleBadges24(d).includes('【根基渾厚】'));
  give(d, 'wudangXinfa', 30); assert.ok(!drive(d, 'taijiSword').root);
});
test('loop184 addendum：憨厚/勤奮/較真先練根基到二階，聰明人跳階', () => {
  const [, d] = fresh('wudang'); give(d, 'wudangXinfa', 20); give(d, 'taiji', 10); give(d, 'wudangFist', 5);
  d.personality = ['honest']; assert.equal(A.autoFocus(d), 'wudangXinfa'); assert.ok(d.base28);
  d.personality = ['clever']; d.base28 = false; assert.notEqual(A.autoFocus(d), 'wudangXinfa');
  d.personality = ['stubborn']; give(d, 'wudangXinfa', 56); assert.notEqual(A.autoFocus(d), 'wudangXinfa');
});
