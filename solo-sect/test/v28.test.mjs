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
  for (let i = 0; i < 4; i++) A.qiInjuryAdd28(s, d); assert.equal(d.qiInjury, 24); assert.equal(s.v28n.inj, 1);
  assert.ok(A.injuryMul28(d) < 0.91 && A.injuryMul28(d) >= 0.75); assert.ok(A.styleBadges24(d).includes('⚠️【經脈內傷】'));
  A.qiInjuryCure28(s, d, A.DRIVE28.med); assert.equal(d.qiInjury, 16); A.qiInjuryCure28(s, d, A.DRIVE28.heal); assert.equal(d.qiInjury, 0); assert.equal(s.v28n.cure, 1);
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
