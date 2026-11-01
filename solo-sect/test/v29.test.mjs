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
  give(d, 'huntianGong', 30); give(d, 'lianhuaPalm', 30); assert.equal(A.sectClasses24(d), 2); /* loop192：三類齊、本門兩類，但都未大成 */
  assert.ok(!A.styleBadges24(d).includes('【本門正宗】'));
  give(d, 'huntianGong', 60); assert.equal(A.sectClasses24(d), 3); assert.ok(A.styleBadges24(d).includes('【本門正宗】'));
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

const pick = (d, traits, values) => { d.personality = traits; d.values = values || {}; d.style = 'palm'; return A.autoFocus(d); };
test('loop187 守正厚積：根基未大成先練根基；有三品時先把本門一二品練到大成', () => {
  const [, d] = fresh('wudang'); give(d, 'wudangXinfa', 30); give(d, 'taijiSword', 5); assert.equal(pick(d, ['rigid']), 'wudangXinfa'); assert.ok(d.base28);
  const [, e] = fresh('wudang'); give(e, 'wudangXinfa', 30); give(e, 'taijiSword', 5); assert.equal(pick(e, [], { sect: 80 }), 'wudangXinfa');
  const [, f] = fresh('wudang'); give(f, 'wudangXinfa', 30); give(f, 'taijiSword', 5); assert.notEqual(pick(f, ['playful']), 'wudangXinfa');
});
test('loop187 靈動跳階：直取最高品；巧/快或二品以上 ×1.12；偷師 +6', () => {
  const [, d] = fresh('emei'); give(d, 'basicFist', 5); give(d, 'linjiZhuang', 5); assert.equal(pick(d, ['clever']), 'linjiZhuang');
  assert.ok(A.artMulParts(d, A.artById('linjiZhuang')).parts.ext.some((x) => x[0] === '靈動跳階' && x[1] === 1.12));
  assert.equal(A.TEMPER29.steal, 6); assert.ok(A.temper29(d).ling);
});
test('loop187 梟雄強練：豪爽／偽君子／重名望者先練他派高品外功（憨厚、拘謹除外）', () => {
  const [, d] = fresh('gaibang'); give(d, 'huntianGong', 60); give(d, 'lianhuaPalm', 10); give(d, 'chousuiPalm', 10); assert.equal(pick(d, ['bold']), 'chousuiPalm');
  assert.equal(pick(d, [], { fame: 70 }), 'chousuiPalm'); assert.notEqual(pick(d, ['bold', 'honest']), 'chousuiPalm');
  const [, m] = fresh('mingjiao'); give(m, 'yingzhuaHand', 30); give(m, 'qishangFist', 5); assert.equal(pick(m, ['hypocrite']), 'qishangFist');
});
test('loop187 至情清修：癡＋有默契伴侶、清冷＋小門派 ×1.18；舊局不吃 mods24', () => {
  const [, d] = fresh('emei'); give(d, 'emeiSword', 5); d.personality = ['chi']; d.pairMul = 0; assert.ok(!A.temper29(d).qing); d.pairMul = 0.1; assert.ok(A.temper29(d).qing);
  assert.ok(A.artMulParts(d, A.artById('emeiSword')).parts.ext.some((x) => x[0] === '至情清修' && x[1] === 1.18));
  d.personality = ['quiet']; d.pairMul = 0; d.small29 = true; assert.ok(A.temper29(d).qing);
});
test('loop187 沉睡特質 mods24：只 v24 新局', async () => {
  const { traitMul } = await import('../src/social.mjs');
  const d = { v24: true, personality: ['rigid'] }; assert.equal(traitMul(d, 'train'), 1.15); assert.equal(traitMul(d, 'chat'), 0.85);
  assert.equal(traitMul({ personality: ['rigid'] }, 'train'), 1); assert.equal(traitMul({ v24: true, personality: ['quiet'] }, 'meditate'), 1.35);
});

test('loop188 相性：拘謹剋灑脫、清冷惜癡、豪爽惜嗜酒；舊局不加', async () => {
  const { compat } = await import('../src/social.mjs');
  const p = (t) => ({ v24: true, personality: t }); assert.ok(compat(p(['rigid']), p(['free'])) < 1); assert.ok(compat(p(['quiet']), p(['chi'])) > 1); assert.ok(compat(p(['bold']), p(['drinker'])) > 1);
  assert.equal(compat({ personality: ['rigid'] }, { personality: ['free'] }), 1);
});
test('loop188 俠魅：仁厚可親、風采出塵、威儀服眾', async () => {
  const { charm29, drawOf } = await import('../src/social.mjs');
  const d = { v24: true, personality: [], values: { sect: 60 }, mood: 40, hp: 100 };
  const k = charm29(d, { personality: ['kind'] }); assert.deepEqual(k, { v: 8, tags: ['仁厚可親'] }); d.mood = 80; assert.equal(charm29(d, { personality: ['kind'] }).v, 5);
  assert.deepEqual(charm29({ ...d, personality: ['clever'] }, { personality: ['free'] }), { v: 8, tags: ['風采出塵'] }); assert.equal(charm29(d, { personality: ['quiet'] }).v, 5);
  assert.deepEqual(charm29(d, { id: 'hero', personality: [] }).tags, ['威儀服眾']); assert.deepEqual(charm29({ ...d, values: {} }, { id: 'hero', personality: [] }).tags, []);
  assert.equal(drawOf({ personality: [] }, { personality: ['kind'] }), 0);
});
test('loop188 第 27 日圍山再降約 5%', async () => {
  const { SIEGE27 } = await import('../src/threat.mjs'); assert.deepEqual(SIEGE27.days[27].E, [1000, 1330, 1750, 2140]);
});
test('loop188 招收：新局約 35% 第二特質換成經典特質', async () => {
  const { RECRUIT29 } = await import('../src/data.mjs'); assert.equal(RECRUIT29.p, 0.35); assert.equal(RECRUIT29.pool.length, 9);
});

test('loop192 異屬逆催：吐納不沖、無名派不吃虛級、禁術與真陰陽才第四階', () => {
  const [, e] = fresh('emei'); give(e, 'breath', 60); give(e, 'chousuiPalm', 30);
  assert.equal(drive(e, 'chousuiPalm').tier, 3, '二品外門、中性吐納：內力虛浮，不內傷');
  give(e, 'sanyinClaw', 10); assert.equal(drive(e, 'sanyinClaw').tier, 4, '沒有二品內功硬催三品陰掌');
  give(e, 'emeiJiuyang', 60); assert.equal(drive(e, 'sanyinClaw').tier, 2, '二品調和內功撐住');
  const [, g] = fresh('gaibang'); give(g, 'huntianGong', 60); give(g, 'sanyinClaw', 10); assert.equal(drive(g, 'sanyinClaw').tier, 4, '陽內功對陰掌仍相沖');
  const [, w] = fresh('wuming'); give(w, 'breath', 60); give(w, 'sanyinClaw', 10); assert.equal(drive(w, 'sanyinClaw').tier, 3, '無名派百納，吐納不誤傷');
  give(w, 'jiuyinClaw', 10); assert.equal(drive(w, 'jiuyinClaw').tier, 4, '九陰白骨爪沒有二品內功大成');
  const [, y] = fresh('wuming'); give(y, 'huntianGong', 60); give(y, 'jiuyinClaw', 10); assert.equal(drive(y, 'jiuyinClaw').tier, 4, '陽內功仍與九陰相沖');
  const [, m] = fresh('emei'); give(m, 'emeiJiuyang', 60); give(m, 'jiuyinClaw', 10); assert.equal(drive(m, 'jiuyinClaw').tier, 2);
});
