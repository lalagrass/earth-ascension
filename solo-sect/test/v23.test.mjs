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
  for (const c of ['zhenfa', 'dushu', 'yishu', 'gunbang', 'qimen', 'zaxue']) { assert.equal(supOf(c, hero(s)), 'part'); assert.equal(supOf(c, hero(o)), 'none'); assert.equal(CATS[c].sup, 'none'); }
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
