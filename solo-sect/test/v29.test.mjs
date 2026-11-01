/* v2.9（loop186–，擁有人 t195）：四項決定、性格武學習性、相性與俠魅；只在 v22 新局（d.v24） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import * as A from '../src/arts.mjs';
const V = (o = {}) => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true, ...o });
const other = (s) => s.ds.find((d) => d.id !== 'hero' && d.role !== 'laborer');
const give = (d, id, xp) => { d.arts[id] ??= { xp: 0, last: 0 }; d.arts[id].xp = xp; };
const fresh = (sect) => { const s = V({ sect24: sect }); tick(s, 0.1); const d = other(s); d.arts = {}; d.focus = null; d.qiInjury = 0; return [s, d]; };
const drive = (d, id) => A.innerDrive28(d, A.artById(id));

test('loop186 決定 1：副修第四階外功也累積內傷 +5；主修第四階 +8', () => {
  const [s, d] = fresh('gaibang'); give(d, 'huntianGong', 60); give(d, 'basicFist', 80); give(d, 'chousuiPalm', 30); d.focus = 'basicFist';
  assert.notEqual(drive(d, 'basicFist').tier, 4); assert.equal(A.clashOuter28(d).id, 'chousuiPalm');
  A.qiInjuryAdd28(s, d); assert.equal(d.qiInjury, A.DRIVE28.injSub); assert.equal(A.DRIVE28.injSub, 5);
  d.focus = 'chousuiPalm'; A.qiInjuryAdd28(s, d); assert.equal(d.qiInjury, 5 + A.DRIVE28.inj); assert.equal(A.DRIVE28.inj, 8);
  const [s2, e] = fresh('gaibang'); give(e, 'huntianGong', 60); give(e, 'basicFist', 50); assert.equal(A.clashOuter28(e), null); A.qiInjuryAdd28(s2, e); assert.equal(e.qiInjury, 0);
});
test('loop186 決定 2：本門 2 類＋本門樹公共身法 → 三才 3；只有公共不算', () => {
  const [, d] = fresh('gaibang'); give(d, 'breath', 60); give(d, 'snowStep', 60); give(d, 'basicFist', 60); assert.equal(A.sectClasses24(d), 0);
  give(d, 'huntianGong', 30); give(d, 'lianhuaPalm', 30); assert.equal(A.sectClasses24(d), 3); assert.ok(A.styleBadges24(d).includes('【本門正宗】'));
  delete d.arts.snowStep; assert.equal(A.sectClasses24(d), 2);
});
test('loop186 決定 3：無本門一品內功的門派以吐納或本門二品內功為根基', () => {
  const [, d] = fresh('gaibang'); give(d, 'breath', 60); assert.equal(A.baseInner28(d).id, 'breath'); assert.equal(A.rootFoundation28(d), 2);
  give(d, 'huntianGong', 10); const p = A.artMulParts(d, A.artById('huntianGong')).parts.ext.map((x) => x[0]); assert.ok(p.includes('築基渾厚'), JSON.stringify(p));
  const r0 = drive(d, 'lianhuaPalm'); give(d, 'huntianGong', 30); give(d, 'lianhuaPalm', 30); assert.equal(A.baseInner28(d).id, 'breath'); assert.ok(drive(d, 'lianhuaPalm').root, JSON.stringify(drive(d, 'lianhuaPalm'))); void r0;
  give(d, 'huntianGong', 80); assert.equal(A.baseInner28(d).id, 'huntianGong');
  const [, e] = fresh('emei'); give(e, 'emeiJiuyang', 60); assert.equal(A.baseInner28(e).id, 'emeiJiuyang'); give(e, 'linjiZhuang', 10);
  assert.ok(A.artMulParts(e, A.artById('linjiZhuang')).parts.ext.some((x) => x[0] === '根基'));
  const [, w] = fresh('wudang'); give(w, 'wudangXinfa', 60); give(w, 'breath', 90); assert.equal(A.baseInner28(w).id, 'wudangXinfa');
});
test('loop186 決定 4：七傷拳前置只要鷹爪小成；聖火心法或九陽大成前皆第四階', () => {
  assert.deepEqual(A.artById('qishangFist').req, [{ art: 'yingzhuaHand', tier: 1 }]);
  const [, d] = fresh('mingjiao'); give(d, 'yingzhuaHand', 30); give(d, 'qishangFist', 10); give(d, 'shenghuoXinfa', 40); assert.equal(drive(d, 'qishangFist').tier, 4);
  give(d, 'shenghuoXinfa', 60); assert.notEqual(drive(d, 'qishangFist').tier, 4);
  const [, e] = fresh('mingjiao'); give(e, 'qishangFist', 10); give(e, 'jiuyang', 60); assert.notEqual(drive(e, 'qishangFist').tier, 4);
});
