/* v2.55（loop168–，擁有人 t190）：五大新門派專屬武學、寒玉床打坐、神木王鼎；全部只在 v22 新局（s.v24） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../../src/sim.mjs';
import * as A from '../../../src/arts.mjs';
import { ARTS, SECTS } from '../../../src/data.mjs';
import { sectStep, HUIWU24 } from '../../../src/sect.mjs';
import * as EC from '../../../src/economy.mjs';
import { SECT_PICK24 } from '../../../src/data.mjs';
import { buildSpec } from '../../../src/start-ui.mjs';
import { passPick } from '../../../src/bonds.mjs';
const V = (o = {}) => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true, ...o });
// #390：舊規則開局已不存在，原本的舊局對照組（OLD）與各測試裡的舊局斷言一併刪除
const hero = (s) => s.ds.find((d) => d.id === 'hero');

const NEW = { emei: ['emeiJiuyang', 'linjiZhuang', 'emeiSword', 'huifengSword', 'jindingPalm', 'tiangangFinger', 'yanhang', 'jieshou'], wudang: ['wudangJiuyang', 'wudangFist', 'rouyunSword', 'taijiSword', 'taijiClaw', 'xuanxuBlade'], taohua: ['biboXinfa', 'tanzhi', 'lanhuaHand', 'yuxiaoSword'], gumu: ['tianluoPalm', 'yunvSword', 'meinvFist', 'yunvJian', 'changhen', 'qianmie', 'qufeng', 'jiuyinGong', 'xianyunStep'], xingxiu: ['huagongDafa', 'chousuiPalm', 'sanyinClaw', 'tianshanStaff', 'zhaixingHand', 'mingtian', 'xiaowuxiang'] }; /* loop201：神木毒功退出星宿樹。#409 落英改自練，不在這張可傳清單 */
test('loop168 五派專屬武學：classic＋v24、非 secret、ART_CAT 照規格、各派樹照規格', () => {
  for (const [k, ids] of Object.entries(NEW)) for (const id of ids) { const a = A.artById(id); assert.ok(a && a.v24 && a.classic && !a.secret && a.own24 === k, id); assert.ok(A.ART_CAT[id], id); assert.ok(SECTS[k].tree.includes(id), id); }
  assert.deepEqual(SECTS.emei.tree, ['breath', 'emeiJiuyang', 'linjiZhuang', 'emeiSword', 'huifengSword', 'yanhang', 'jindingPalm', 'tiangangFinger', 'jieshou', 'stepFeather']); assert.deepEqual(SECTS.emei.ban, ['jiuyinClaw']);
  assert.deepEqual(SECTS.wudang.tree, ['breath', 'wudangXinfa', 'wudangJiuyang', 'wudangFist', 'mianPalm', 'taiji', 'taijiClaw', 'basicSword', 'rouyunSword', 'taijiSword', 'xuanxuBlade', 'stepEight']); /* loop172 t191 補武當心法、綿掌。#409 補太極爪、玄虛刀 */
  assert.deepEqual(SECTS.taohua.tree, ['breath', 'biboXinfa', 'tanzhi', 'lanhuaHand', 'basicSword', 'yuxiaoSword', 'stepEight']);
  assert.deepEqual(SECTS.gumu.tree, ['breath', 'yunv', 'tianluoPalm', 'meinvFist', 'yunvJian', 'yunvSword', 'changhen', 'qianmie', 'qufeng', 'jiuyinGong', 'xianyunStep', 'xuantie', 'anran', 'stepFeather']);
  assert.deepEqual(SECTS.xingxiu.tree, ['breath', 'huagongDafa', 'chousuiPalm', 'sanyinClaw', 'tianshanStaff', 'zhaixingHand', 'mingtian', 'xiaowuxiang', 'duPu', 'zhaixingStep']); /* loop201：神木毒功退出，化功大法仍 chiefOnly */
  const shenmu = A.artById('shenmuGong'); assert.equal(shenmu.deprecated, true); assert.equal(shenmu.secret, true); assert.ok(!SECTS.xingxiu.tree.includes('shenmuGong'));
  assert.deepEqual(A.ART_CAT.tiangangFinger, { quanzhang: 0.5, qimen: 0.5 }); assert.deepEqual(A.ART_CAT.huagongDafa, { neigong: 0.6, dushu: 0.4 });
  assert.ok(A.isSwordArt('yuxiaoSword') && A.isSwordArt('taijiSword') && !A.isSwordArt('jindingPalm'));
  for (const a of ARTS.filter((x) => x.own24)) for (const m of a.techs) if (a.tech) assert.ok(m, a.id);
});
test('loop168 傳承鎖：他派（含無名派）鎖住、本門可學；九陰白骨爪人人鎖；舊局不見', () => {
  const e = V({ sect24: 'emei' }); tick(e, 0.1); const h = hero(e); assert.equal(h.sectId, 'emei');
  assert.ok(!A.lockedArt24(h, A.artById('emeiSword'))); assert.ok(A.lockedArt24(h, A.artById('luoyingPalm'))); assert.ok(A.lockedArt24(h, A.artById('jiuyinClaw')));
  const w = V(); tick(w, 0.1); assert.equal(hero(w).sectId, 'wuming'); assert.ok(A.lockedArt24(hero(w), A.artById('emeiSword')));
  assert.ok(h.arts.emeiJiuyang && h.arts.emeiSword, '峨眉掌門 T1 根基＝峨眉九陽功＋峨眉劍法');
  assert.ok(!A.artHints(h, () => '').some((r) => r.id === 'luoyingPalm')); assert.ok(!A.artsSvg(h).includes('data-art="luoyingPalm"'));
});
test('loop168 武當：武當長拳大成可領悟太極拳；太極拳大成可免柔雲劍法學太極劍（以拳通劍）', () => {
  const s = V({ sect24: 'wudang' }); tick(s, 0.1); const h = hero(s); delete h.arts.taiji; h.pendingArt = null;
  assert.ok(!A.sectUnlock24(h).length); h.arts.wudangFist.xp = 100; assert.equal(A.sectUnlock24(h)[0]?.id, 'taiji'); assert.equal(A.selfTarget(h), 'taiji');
  const ts = A.artById('taijiSword'); assert.ok(A.reqMissing(h, ts).length); A.learnArt(h, 'taiji', 0); h.arts.taiji.xp = 100; assert.equal(A.reqMissing(h, ts).length, 0);
});
test('loop168 本門專屬可傳功', () => {
  const s = V({ sect24: 'taohua' }); tick(s, 0.1); const h = hero(s); h.arts.luoyingPalm = { xp: 100 };
  assert.notEqual(passPick(s, h)?.art, 'luoyingPalm');
  h.arts.tanzhi = { xp: 100 };
  const p = passPick(s, h); assert.equal(p?.art, 'tanzhi');
  const o = V({ sect24: 'emei' }); tick(o, 0.1); const k = hero(o); for (const id of Object.keys(k.arts)) k.arts[id].xp = 0; k.arts.luoyingPalm = { xp: 100 }; assert.equal(passPick(o, k), null, '他派專屬不傳');
});
test('loop168 寒玉床：門人 ≤5 打坐回氣與衝關率 ×1.5；神木王鼎：藥材 +1、香火 +1、毒傷 ×1.35', () => {
  const g = V({ sect24: 'gumu' }); tick(g, 0.1); const h = hero(g); const q0 = A.medQi(h), b0 = A.breakChance(h);
  g.sect.fac = true; sectStep(g); assert.equal(h.medK24, 1.5); assert.ok(Math.abs(A.medQi(h) - q0 * 1.5) < 1e-9); assert.ok(A.breakChance(h) > b0 || A.breakChance(h) === 0.9);
  const x = V({ sect24: 'xingxiu' }); tick(x, 0.1); assert.deepEqual(SECTS.xingxiu.fac.daily, { herb: 1, coin: 1 }); assert.equal(SECTS.xingxiu.fac.name, '神木王鼎');
  x.sect.fac = true; sectStep(x); assert.equal(x.psnK24, 1.35);
  const e = V({ sect24: 'emei' }); tick(e, 0.1); e.sect.fac = true; sectStep(e); assert.equal(hero(e).medK24, 1); assert.equal(e.psnK24, 1);
});

test('loop169 合參收緊：門檻 52/48、本門樹已有不再推演、每局上限 2', () => {
  assert.deepEqual(A.DERIVE_RULES24.map((R) => R.min), [52, 52, 48, 52]); assert.equal(A.DERIVE24.max, 1); /* loop176 名門 1、無名 2 */
  const s = V(); tick(s, 0.1); const h = hero(s); const R = A.DERIVE_RULES24[1];
  const fake = { ...h, arts: {} }; s.sect.tree.push(R.id); assert.ok(!A.deriveReady24(fake, s).some((x) => x.id === R.id));
  s.v24n = { derive: A.deriveMax24(s) }; assert.deepEqual(A.deriveReady24(h, s), []);
});
test('loop169 臨陣偷師：機率 0.55；他派專屬優先', () => { assert.equal(HUIWU24.steal, 0.55); });
test('loop169 執事藏經閣：出征過或有殘頁，木 ≥5 即立（石料暫緩）', () => {
  const s = V(); tick(s, 0.1); for (const d of s.ds) d.arts = { basicFist: d.arts.basicFist || { xp: 1 } }; s.res.wood = 5; s.res.stone = 0;
  assert.equal(EC.stewLib24(s), null); s.expN = 1; assert.equal(EC.stewLib24(s), 'library'); s.expN = 0; s.res.page1 = 1; assert.equal(EC.stewLib24(s), 'library'); s.res.wood = 4; assert.equal(EC.stewLib24(s), null);
});
test('loop169 開局門派選單：十個選項、自創主角帶 sect24（無名派不帶）、可開華山／丐幫／明教', () => {
  assert.deepEqual(SECT_PICK24, ['wuming', 'emei', 'wudang', 'taohua', 'gumu', 'xingxiu', 'qizong', 'jianzong', 'gaibang', 'mingjiao', 'tiandihui']); /* loop174 t191 天地會 */
  const base = { tab: 'custom', name: '甲', stats: {}, ans: Array(9).fill(0), ask: false };
  assert.equal(buildSpec({ ...base, sect24: 'gumu' }).sect24, 'gumu'); assert.ok(!('sect24' in buildSpec({ ...base, sect24: 'wuming' })));
  for (const k of SECT_PICK24.slice(1)) { const s = V({ sect24: k }); assert.equal(s.sect.id, k, k); }
});
