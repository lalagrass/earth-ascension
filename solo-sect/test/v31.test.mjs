/* v3.1（loop196–）：內功催動外功與輕功、神木毒功。只在 v24 新局。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, speedOf } from '../src/sim.mjs';
import { artsGrowHtml } from '../src/panel-ui.mjs';
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
  give(x, 'sanyinClaw', 10); assert.equal(drive(x, 'sanyinClaw').tier, 3); assert.ok(Math.abs(drive(x, 'sanyinClaw').mul - A.floatMul31(A.artById('sanyinClaw'))) < 1e-9); /* loop201：打法虛浮依 qiScale，不再固定 0.78 */
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
test('loop198 造詣：內功身法棍棒可加速，三品神功吃三成五底子', () => {
  const d = { v24: true, arts: { breath: { xp: 40, gm: { e: 20 } }, zixia: { xp: 0 } } };
  assert.equal(A.supOf('neigong', d), 'full'); assert.equal(A.supOf('shenfa', d), 'full'); assert.equal(A.supOf('gunbang', d), 'full');
  assert.equal(A.CATS.neigong.sup, 'part'); assert.equal(A.supOf('neigong', { arts: {} }), 'part');
  const ac = A.accelOf(d, A.artById('zixia'), 0);
  assert.equal(ac.cat, 'neigong'); assert.ok(ac.mul > 1 && ac.mul <= 1 + 0.8 * 0.35 + 1e-9);
  const old = { arts: d.arts }; assert.equal(A.accelOf(old, A.artById('zixia'), 0).mul, 1);
  const g4 = { v24: true, arts: { basicSword: { xp: 10, gm: { e: 40 } }, bixie: { xp: 0 } } };
  assert.equal(A.accelOf(g4, A.artById('bixie'), 0).mul, 1);
});
test('loop198 造詣實戰：內力、回氣、內勁、腳程、冷卻、外功傷害', () => {
  const body = { v24: true, v23: true, ng: 1, ng2: 1, qi: 10, sectId: 'wudang', skills: { agility: 0 }, personality: [], needs: { energy: 100 }, carry: 0, path: [] };
  const hi = { ...body, arts: { breath: { xp: 55, gm: { e: 20 } } } };
  const lo = { ...body, arts: { breath: { xp: 55 } } };
  assert.equal(A.mastery(hi, 'neigong'), 20);
  assert.ok(Math.abs(A.qiMax2(hi) / A.qiMax2(lo) - 1.08) < 1e-9);
  assert.ok(Math.abs(A.medQi(hi) / A.medQi(lo) - 1.08) < 1e-9);
  assert.ok(Math.abs(A.restQi(hi) / A.restQi(lo) - 1.08) < 1e-9);
  assert.ok(Math.abs(A.qiStrikeMul(hi) - A.qiStrikeMul(lo) - 0.15 * 0.1 * 0.004 * 20) < 1e-9); /* loop201：築基 qiScale × 內力比 × 造詣項，不再是平坦 +0.002×造詣 */
  const step = { ...body, arts: { breath: { xp: 55 }, wudangFist: { xp: 30 }, snowStep: { xp: 30, gm: { e: 20 } } } };
  const still = { ...body, arts: { breath: { xp: 55 }, wudangFist: { xp: 30 }, snowStep: { xp: 30 } } };
  const sh = A.mastery(step, 'shenfa'); assert.equal(sh, 20);
  assert.ok(Math.abs(A.cdMul(step, 'wd1', 0) / A.cdMul(still, 'wd1', 0) - (1 - 0.0015 * sh)) < 1e-9);
  assert.ok(Math.abs(speedOf(step) / speedOf(still) - (1 + 0.002 * sh)) < 1e-9);
  const armed = { ...body, arts: { breath: { xp: 55 }, wudangFist: { xp: 30, gm: { e: 40 } } } };
  const plain = { ...body, arts: { breath: { xp: 55 }, wudangFist: { xp: 30 } } };
  const fist = A.mastery(armed, 'quanzhang'); assert.equal(fist, 20); /* 一品造詣上限 20 */
  const qRatio = A.qiStrikeMul(armed, A.artById('wudangFist')) / A.qiStrikeMul(plain, A.artById('wudangFist'));
  assert.ok(Math.abs(A.moveMul(armed, 'wd1', 0) / A.moveMul(plain, 'wd1', 0) - qRatio * (1 + 0.0015 * fist)) < 1e-9); /* loop202：外功造詣也抬高內勁有效值 */
});
test('loop196 本門正宗打坐 ×1.15，未大成不乘', () => {
  const [, d] = fresh('gaibang'); give(d, 'huntianGong', 60);
  const q0 = A.medQi(d); assert.equal(A.sectClasses24(d), 0);
  give(d, 'lianhuaPalm', 30); assert.equal(A.sectClasses24(d), 3);
  assert.ok(Math.abs(A.medQi(d) - q0 * A.SYN24.med3) < 1e-9);
});
test('loop199 劍宗前期快、氣宗後期以氣御劍', () => {
  const earlyJ = { v24: true, v23: true, sectId: 'jianzong', qi: 20, ng: 1, moves: [], arts: { jianzongXinfa: { xp: 0 }, bixie: { xp: 55 } } };
  assert.equal(A.swordCdMul(earlyJ, 'bx1'), 1); assert.equal(A.swordDmgMul(earlyJ, 'bx1'), 1); /* loop201：劍宗不再另乘冷卻與傷害 */
  assert.ok(A.swordFast24(earlyJ)); assert.ok(A.styleBadges24(earlyJ).includes('【唯快不破】'));
  assert.match(artsGrowHtml(earlyJ, 0, false), /【唯快不破】/);
  earlyJ.arts.bixie.xp = 85; assert.equal(A.swordDmgMul(earlyJ, 'bx1'), 1);
  earlyJ.arts.bixie.xp = 10; assert.ok(!A.styleBadges24(earlyJ).includes('【唯快不破】'));
  const other = { v24: true, v23: true, sectId: 'wudang', qi: 20, ng: 1, arts: { breath: { xp: 10 }, bixie: { xp: 25 } } };
  assert.equal(A.swordCdMul(other, 'bx1'), 1); assert.equal(A.swordDmgMul(other, 'bx1'), 1); /* loop201 */
  other.arts.bixie.xp = 55; assert.equal(A.swordDmgMul(other, 'bx1'), 1);
  const legacy = { v23: true, sectId: 'qizong', qi: 0, arts: { breath: { xp: 30 } }, zixia: 2 };
  assert.equal(A.swordCdMul(legacy, 'bx1'), 0.82); assert.equal(A.swordDmgMul(legacy, 'bx1'), 1.1);
  assert.ok(Math.abs(A.qiStrikeMul(legacy) - 1.35) < 1e-9);
  const qe = { v24: true, v23: true, sectId: 'qizong', qi: 20, ng: 1, arts: { huashanXinfa: { xp: 24 }, breath: { xp: 0 } } };
  const q = A.qiOf(qe); assert.equal(q, 20);
  const qeMul = 1.06 + 0.04 + 0.08 * 0.2;
  assert.ok(Math.abs(A.qiSwordMul24(qe) - qeMul) < 1e-9); assert.ok(qeMul > 1.1 && qeMul < 1.2);
  assert.ok(Math.abs(A.qiStrikeMul(qe) - (1 + 0.15 * 0.2)) < 1e-9); /* loop201：內勁不再乘 qiSwordMul24 */
  assert.ok(!A.styleBadges24(qe).includes('【以氣御劍】'));
  const qeJ = { ...qe, sectId: 'jianzong' }, qeW = { ...qe, sectId: 'wuming' };
  assert.equal(A.qiStrikeMul(qeJ), A.qiStrikeMul(qe)); assert.equal(A.qiStrikeMul(qeW), A.qiStrikeMul(qe));
  const late = { v24: true, v23: true, sectId: 'qizong', qi: 160, ng: 1, moves: [], arts: { zixia: { xp: 90 }, huashanXinfa: { xp: 60 } } };
  const lateMul = Math.min(1.62, 1.06 + 0.12 + 0.12 + 0.08 + 0.08 * 1.6);
  assert.ok(lateMul >= 1.45 && lateMul <= 1.62); assert.ok(Math.abs(A.qiSwordMul24(late) - lateMul) < 1e-9);
  assert.ok(A.styleBadges24(late).includes('【以氣御劍】')); assert.match(artsGrowHtml(late, 0, false), /主運《紫霞神功》3品/); assert.match(artsGrowHtml(late, 0, false), /【以氣御劍】/);
  const cap = { v24: true, v23: true, sectId: 'qizong', qi: 400, ng: 1, zixia: 9, arts: { zixia: { xp: 100 }, jiuyang: { xp: 100 } } };
  assert.equal(A.qiSwordMul24(cap), 1.62);
  const lateJ = { v24: true, v23: true, sectId: 'jianzong', qi: 40, ng: 1, arts: { jianzongXinfa: { xp: 55 }, bixie: { xp: 90 } } };
  assert.equal(A.swordDmgMul(lateJ, 'bx1'), 1);
  const spent = { v24: true, v23: true, sectId: 'qizong', ng2: 1, qi: 5, arts: { huashanXinfa: { xp: 60 } } };
  A.shieldHit(spent, 100, 0); assert.equal(spent.spentUntil, A.NG2.spentT); /* loop201：一品心法大成不再減半 */
  const great = { v24: true, v23: true, sectId: 'wudang', ng2: 1, qi: 5, arts: { zixia: { xp: 60 } } };
  A.shieldHit(great, 100, 0); assert.equal(great.spentUntil, A.NG2.spentT * 0.5); /* 三品且大成，任何門派都減半 */
  const young = { v24: true, v23: true, sectId: 'qizong', ng2: 1, qi: 5, arts: { huashanXinfa: { xp: 10 } } };
  A.shieldHit(young, 100, 0); assert.equal(young.spentUntil, A.NG2.spentT);
  const oldS = { ng2: 1, qi: 5, sectId: 'qizong', arts: { huashanXinfa: { xp: 60 } } };
  A.shieldHit(oldS, 100, 0); assert.equal(oldS.spentUntil, A.NG2.spentT);
});
test('loop203 日程改由偏好帶動，不再看守正成材', () => {
  const [, d] = fresh('wudang'); d.personality = ['bold', 'nimble', 'playful']; d.values = {};
  assert.equal(A.appetite31(d), 3);
  assert.equal(A.appetiteActMul31(d, 'hunt'), 1.09); assert.equal(A.appetiteActMul31(d, 'spar'), 1.09); assert.equal(A.appetiteActMul31(d, 'defend'), 1.09);
  assert.equal(A.appetiteActMul31(d, 'chat'), 1); assert.equal(A.appetiteActMul31(d, 'train'), 1);
  d.personality = ['honest'];
  assert.equal(A.appetite31(d), -2);
  assert.equal(A.appetiteActMul31(d, 'train'), 1.06); assert.equal(A.appetiteActMul31(d, 'meditate'), 1.06); assert.equal(A.appetiteActMul31(d, 'study'), 1.06);
  assert.equal(A.appetiteActMul31(d, 'hunt'), 1); assert.equal(A.appetiteActMul31(d, 'farm'), 1);
  assert.equal(A.appetiteActMul31({ personality: ['honest'], values: {} }, 'train'), 1);
});
