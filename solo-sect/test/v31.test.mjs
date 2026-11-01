/* v3.1（loop196–）：內功催動外功與輕功、神木毒功。只在 v24 新局。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, speedOf } from '../src/sim.mjs';
import * as A from '../src/arts.mjs';
import { evadeScore } from '../src/world.mjs';
import { EVADE } from '../src/data.mjs';

const V = (o = {}) => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true, ...o });
const OLD = () => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false });
const other = (s) => s.ds.find((d) => d.id !== 'hero' && d.role !== 'laborer');
const give = (d, id, xp) => { d.arts[id] ??= { xp: 0, last: 0 }; d.arts[id].xp = xp; };
const fresh = (sect) => { const s = V({ sect24: sect }); tick(s, 0.1); const d = other(s); d.arts = {}; d.focus = null; d.qiInjury = 0; return [s, d]; };
const drive = (d, id) => A.innerDrive28(d, A.artById(id));

test('loop196 神木毒功：二品本門內功，百毒譜不是主修外功', () => {
  const a = A.artById('shenmuGong');
  assert.equal(a.grade, 2); assert.equal(a.school, 'inner'); assert.equal(a.attr, 'yin'); assert.equal(a.own24, 'xingxiu');
  assert.deepEqual(a.req, [{ art: 'breath', tier: 1 }]); assert.deepEqual(a.cats, { neigong: 0.7, dushu: 0.3 });
  assert.deepEqual(A.ART_CAT.shenmuGong, a.cats);
  assert.equal(A.artById('duPu').own24, undefined); assert.equal(A.artById('duPu').tech, null);
  const [, d] = fresh('xingxiu'); give(d, 'duPu', 5); give(d, 'chousuiPalm', 5); d.personality = ['rigid']; d.values = {}; d.style = 'palm';
  assert.equal(A.autoFocus(d), 'chousuiPalm');
  d.arts = { duPu: { xp: 5, last: 0 } }; assert.equal(A.autoFocus(d), null);
});

test('loop196 四階催動：本門正宗、同源、虛浮、逆催；純內功不催動', () => {
  const [, x] = fresh('xingxiu');
  give(x, 'shenmuGong', 30); give(x, 'chousuiPalm', 30);
  assert.deepEqual(drive(x, 'shenmuGong'), { tier: 0, mul: 1 });
  assert.equal(drive(x, 'chousuiPalm').tier, 1); assert.equal(drive(x, 'chousuiPalm').mul, A.DRIVE28.t1);
  give(x, 'sanyinClaw', 10); assert.equal(drive(x, 'sanyinClaw').tier, 3); assert.equal(drive(x, 'sanyinClaw').mul, A.DRIVE28.t3);
  give(x, 'shenmuGong', 60); assert.equal(drive(x, 'sanyinClaw').tier, 1); assert.equal(drive(x, 'sanyinClaw').mul, A.DRIVE28.t1);
  give(x, 'sanyinClaw', 30); assert.ok(Math.abs(drive(x, 'sanyinClaw').mul - A.DRIVE28.t1 * 1.06) < 1e-9); /* 二品內功大成催三品外功，吃根基 */
  const [, e] = fresh('emei'); give(e, 'breath', 60); give(e, 'chousuiPalm', 30);
  assert.equal(drive(e, 'chousuiPalm').tier, 3);
  give(e, 'emeiJiuyang', 60); assert.equal(drive(e, 'chousuiPalm').tier, 2); assert.equal(drive(e, 'chousuiPalm').mul, 1);
  const [, g] = fresh('gaibang'); give(g, 'huntianGong', 60); give(g, 'sanyinClaw', 10);
  assert.equal(drive(g, 'sanyinClaw').tier, 4); assert.equal(drive(g, 'sanyinClaw').mul, A.DRIVE28.t4);
  const [, w] = fresh('wudang'); give(w, 'wudangXinfa', 60); give(w, 'wudangJiuyang', 30); give(w, 'basicFist', 30);
  const pub = drive(w, 'basicFist'); assert.equal(pub.tier, 2); assert.ok(pub.root); assert.ok(Math.abs(pub.mul - 1.06) < 1e-9);
  give(w, 'taijiSword', 30); delete w.arts.wudangJiuyang; assert.equal(drive(w, 'taijiSword').tier, 3, '一品內功催不動三品本門劍');
  const o = OLD(); tick(o, 0.1); assert.deepEqual(drive(o.ds[0], 'basicFist'), { tier: 0, mul: 1 });
});

test('loop196 輕功身法的腳程與閃避乘同一催動係數', () => {
  const [, d] = fresh('xingxiu'); give(d, 'shenmuGong', 30); give(d, 'zhaixingStep', 30);
  const mul = A.stepDrive28(d); assert.equal(mul, drive(d, 'zhaixingStep').mul); assert.equal(drive(d, 'zhaixingStep').tier, 1);
  const tierPts = Math.max(0, A.effectTier(d, 'speed') + 1) * EVADE.tierPts;
  const lazy = (d.personality || []).includes('lazy') ? EVADE.lazyBonus : 0;
  assert.equal(evadeScore(d), d.skills.agility + tierPts * mul + lazy);
  const v1 = speedOf(d); d.v24 = false; const v0 = speedOf(d); d.v24 = true;
  assert.ok(v1 > v0);
  const bare = { ...d, v24: false, arts: { ...d.arts } };
  assert.equal(evadeScore(bare), bare.skills.agility + tierPts + lazy);
});

test('loop197 內功品階與十重：同階大成，高品內力更高，階內重數連續成長', () => {
  const one = (id, xp) => ({ v24: true, arts: { [id]: { xp } } });
  const old = { arts: { breath: { xp: 55 } }, ng2: 1 };
  assert.equal(A.qiMax2(old), A.NG2.cap[2]); assert.equal(A.mitOf(old), A.NG2.mit[2]);
  assert.ok(Math.abs(A.qiMax2(one('breath', 55)) - 45 * A.GRADE_NG24[1]) < 1e-9);
  assert.ok(Math.abs(A.qiMax2(one('emeiJiuyang', 55)) - 45 * A.GRADE_NG24[2]) < 1e-9);
  assert.ok(Math.abs(A.qiMax2(one('zixia', 55)) - 45 * A.GRADE_NG24[3]) < 1e-9);
  assert.ok(Math.abs(A.ngTierCont24(one('bixie', 55), 'bixie') - 45 * A.GRADE_NG24[4]) < 1e-9);
  const lv1 = A.qiMax2(one('breath', 55)), lv9 = A.qiMax2(one('breath', 80));
  assert.ok(lv9 > lv1); assert.ok(Math.abs(lv9 - (45 + (70 - 45) * 0.8) * A.GRADE_NG24[1]) < 1e-9);
  assert.ok(Math.abs(A.qiMax2(one('zixia', 100)) - 100 * A.GRADE_NG24[3]) < 1e-9);
  assert.ok(Math.abs(A.qiMax2(one('zixia', 99)) - (70 + (100 - 70) * 0.9) * A.GRADE_NG24[3]) < 1e-9);
  assert.ok(Math.abs(A.mitOf(one('zixia', 55)) - 0.08 * A.GRADE_NG24[3]) < 1e-9);
  const piled = { v24: true, arts: { breath: { xp: 100 }, zixia: { xp: 100 }, jiuyang: { xp: 100 }, emeiJiuyang: { xp: 100 } } };
  assert.equal(A.qiMax2(piled), A.NG2.total24); assert.ok(A.mitOf(piled) <= A.NG2.mitCap24);
});
test('loop197 品階難度：一品略快、二品不加、三四品變慢', () => {
  const d = { v24: true, arts: {}, personality: [], wu: 3, pairMul: 0 };
  const name = (id) => A.artMulParts(d, A.artById(id)).parts.ext.find((x) => x[0] === '品階難度');
  assert.deepEqual(name('breath'), ['品階難度', 1.12]);
  assert.equal(name('emeiJiuyang'), undefined);
  assert.deepEqual(name('zixia'), ['品階難度', 0.78]);
  assert.deepEqual(name('bixie'), ['品階難度', 0.65]);
  const old = { arts: {}, personality: [], wu: 3, pairMul: 0 };
  assert.equal(A.artMulParts(old, A.artById('zixia')).parts.ext.find((x) => x[0] === '品階難度'), undefined);
});
test('loop196 本門正宗打坐 ×1.15，未大成不乘', () => {
  const [, d] = fresh('gaibang'); give(d, 'huntianGong', 60);
  const q0 = A.medQi(d); assert.equal(A.sectClasses24(d), 0);
  give(d, 'lianhuaPalm', 30); assert.equal(A.sectClasses24(d), 3);
  assert.ok(Math.abs(A.medQi(d) - q0 * A.SYN24.med3) < 1e-9);
});
