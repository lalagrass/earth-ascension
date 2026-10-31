/* v2.6（loop171–，擁有人 t191）：鎮派絕學位階鎖、同門成套、雜學曲線、各派成長鏈；全部只在 v22 新局（d.v24） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import * as A from '../src/arts.mjs';
import { ARTS, SECTS } from '../src/data.mjs';
import { passPick } from '../src/bonds.mjs';
import { bisai24 } from '../src/sect.mjs';
const V = (o = {}) => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true, ...o });
const OLD = () => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false });
const hero = (s) => s.ds.find((d) => d.id === 'hero');
const other = (s) => s.ds.find((d) => d.id !== 'hero' && d.role !== 'laborer');
const give = (d, id, xp) => { d.arts[id] ??= { xp: 0, last: 0 }; d.arts[id].xp = xp; };

test('loop171 chiefOnly24：標記照規格', () => {
  for (const id of ['zixia', 'linjiZhuang', 'wudangJiuyang', 'taijiSword', 'lanhuaHand', 'yunvSword', 'huagongDafa']) assert.ok(A.artById(id).chiefOnly24, id);
});
test('loop171 位階鎖：一般弟子鎖、掌門／首徒／魁首可；顯示線索；不擋已會者', () => {
  const s = V({ sect24: 'taohua' }); tick(s, 0.1); const h = hero(s), d = other(s), a = A.artById('lanhuaHand'); assert.equal(d.sectId, 'taohua');
  assert.ok(A.chiefLocked24(d, a) && A.lockedArt24(d, a)); assert.ok(!A.chiefLocked24(h, a) && !A.lockedArt24(h, a));
  assert.equal(A.artState(d, a).why, A.CHIEF24_WHY); assert.ok(A.artHints(d).find((r) => r.id === 'lanhuaHand').need.includes(A.CHIEF24_WHY));
  d.role = 'head'; assert.ok(!A.chiefLocked24(d, a)); d.role = 'inner'; d.chief24 = true; assert.ok(!A.chiefLocked24(d, a)); d.chief24 = false;
  give(d, 'lanhuaHand', 30); assert.ok(!A.chiefLocked24(d, a)); delete d.arts.lanhuaHand;
  give(d, 'luoyingPalm', 60); assert.ok(A.selfTarget(d) !== 'lanhuaHand');
  give(h, 'lanhuaHand', 60); for (const x of s.ds) x.passDay = -1; s.passN = null; const p = passPick(s, h); assert.ok(!p || p.art !== 'lanhuaHand' || A.rankOk24(p.p));
});
test('loop171 大比魁首得 chief24', () => {
  const s = V({ sect24: 'gumu' }); tick(s, 0.1); for (let i = 0; i < 4; i++) { const d = s.ds.find((x) => x.id !== 'hero'); if (!d) break; }
  const c = bisai24(s); if (c) assert.ok(c.chief24);
});
test('loop171 同門成套：2 類 ×1.08、3 類 ×1.16＋打坐 ×1.15；舊局不變', () => {
  const s = V({ sect24: 'emei' }); tick(s, 0.1); const d = other(s); for (const id of Object.keys(d.arts)) if (d.stree.includes(id)) delete d.arts[id];
  assert.equal(A.sectClasses24(d), 0); const m0 = A.medQi(d);
  give(d, 'emeiJiuyang', 30); give(d, 'emeiSword', 30); assert.equal(A.sectClasses24(d), 2); assert.equal(A.styleDmg24(d) / (A.polymath24(d) === 2 ? A.SYN24.conv : 1), 1.08);
  give(d, 'stepFeather', 30); assert.equal(A.sectClasses24(d), 3); assert.ok(A.styleBadges24(d).includes('【本門正宗】')); assert.ok(Math.abs(A.medQi(d) / m0 - 1.15) < 1e-9);
  const o = OLD(); tick(o, 0.1); const od = hero(o); assert.equal(A.styleDmg24(od), 1); assert.equal(A.sectClasses24(od), 0);
});
test('loop171 同門根基 1.18／一脈相承 1.28', () => {
  const s = V({ sect24: 'emei' }); tick(s, 0.1); const d = other(s); for (const id of Object.keys(d.arts)) if (d.stree.includes(id)) delete d.arts[id];
  const parts = (id) => A.artMulParts(d, A.artById(id)).ext?.map?.((x) => x[0]) || JSON.stringify(A.artMulParts(d, A.artById(id)));
  assert.equal(A.sectLine24(d, A.artById('huifengSword')), null);
  give(d, 'emeiSword', 60); assert.deepEqual(A.sectLine24(d, A.artById('huifengSword')), ['同門根基', 1.18]);
  give(d, 'emeiJiuyang', 60); give(d, 'jindingPalm', 60); assert.deepEqual(A.sectLine24(d, A.artById('huifengSword')), ['一脈相承', 1.28]);
  assert.equal(A.sectLine24(d, A.artById('basicFist')), null); assert.ok(String(parts('huifengSword')).includes('一脈相承'));
});
test('loop171 雜學：跨兩派血統 → 分心 0.85；大成 ≥4 且造詣 ≥50 → 萬流歸宗', () => {
  const s = V({ sect24: 'emei' }); tick(s, 0.1); const d = other(s); d.arts = {}; give(d, 'emeiSword', 10); give(d, 'luoyingPalm', 10);
  assert.equal(A.polymath24(d), 1); assert.ok(A.styleBadges24(d).includes('【雜學分心】'));
  const r = A.artMulParts(d, A.artById('emeiSword')); assert.ok(JSON.stringify(r).includes('雜學分心'));
  for (const id of ['emeiSword', 'luoyingPalm', 'jindingPalm', 'tianluoPalm', 'chousuiPalm']) give(d, id, 100); d.mast = null;
  const m = Math.max(...Object.keys(A.CATS).map((k) => A.mastery(d, k))); if (m >= 50) { assert.equal(A.polymath24(d), 2); assert.ok(A.styleDmg24(d) >= 1.18 - 1e-9); }
});
test('loop172 華山二宗／武當成長鏈：資料照規格、v24 專屬', () => {
  const chk = (id, k, g, sc) => { const a = A.artById(id); assert.ok(a && a.v24 && a.classic && !a.secret && a.own24 === k && a.grade === g && a.school === sc, id); assert.ok(A.ART_CAT[id], id); if (sc !== 'inner' && sc !== 'step') assert.equal(a.techs.length, 2, id); };
  chk('huashanXinfa', 'qizong', 1, 'inner'); chk('pishiFist', 'qizong', 1, 'fist'); chk('hunyuanPalm', 'qizong', 2, 'palm'); chk('kuangfengSword', 'jianzong', 3, 'palm'); chk('wudangXinfa', 'wudang', 1, 'inner'); chk('mianPalm', 'wudang', 2, 'palm');
  assert.deepEqual(A.artById('hunyuanPalm').req, [{ art: 'pishiFist', tier: 1 }, { art: 'huashanXinfa', tier: 1 }]); assert.deepEqual(A.artById('wudangJiuyang').req, [{ art: 'wudangXinfa', tier: 1 }]);
  assert.deepEqual(SECTS.qizong.tree24, ['huashanXinfa', 'zixia', 'pishiFist', 'hunyuanPalm', 'basicSword', 'huashanSword', 'sanxianSword', 'snowStep']); assert.deepEqual(SECTS.qizong.unlock24, { zixia: [{ art: 'huashanXinfa', tier: 2 }] });
  assert.deepEqual(SECTS.jianzong.tree24, ['breath', 'basicSword', 'huashanSword', 'sanxianSword', 'kuangfengSword', 'snowStep', 'stepFeather', 'dugu']); assert.ok(SECTS.wudang.tree.includes('mianPalm') && SECTS.wudang.tree.includes('wudangXinfa'));
  assert.ok(A.isSwordArt('kuangfengSword'));
});
test('loop172 氣宗紫霞：掌門華山心法大成可領悟（第一層），一般弟子不行', () => {
  const s = V({ sect24: 'qizong' }); tick(s, 0.1); const h = hero(s), d = other(s); assert.ok(s.sect.tree.includes('huashanXinfa'));
  give(h, 'huashanXinfa', 60); assert.deepEqual(A.sectUnlock24(h).map((a) => a.id), ['zixia']); A.learnArt(h, 'zixia', 0); assert.equal(h.zixia, 1);
  if (d) { give(d, 'huashanXinfa', 60); assert.deepEqual(A.sectUnlock24(d).map((a) => a.id), []); }
  const o = OLD(); assert.ok(!o.sect?.tree?.includes('huashanXinfa'));
});
test('loop173 丐幫／明教成長鏈：資料、tree24、僅 v24 新局併入；會武可偷', () => {
  const G = { gaibang: ['huntianGong', 'xiaoyaoStep', 'lianhuaPalm', 'fengmoStaff'], mingjiao: ['shenghuoXinfa', 'qingfuStep', 'yingzhuaHand', 'qishangFist'] };
  for (const [k, ids] of Object.entries(G)) for (const id of ids) { const a = A.artById(id); assert.ok(a && a.v24 && a.classic && !a.secret && !a.signature && a.own24 === k, id); assert.ok(A.ART_CAT[id], id); assert.ok(SECTS[k].tree24.includes(id), id); assert.ok(!SECTS[k].tree.includes(id), id); }
  assert.deepEqual(A.artById('qishangFist').req, [{ art: 'yingzhuaHand', tier: 2 }, { art: 'shenghuoXinfa', tier: 1 }]); assert.equal(A.artById('fengmoStaff').weapon, 'staff'); assert.deepEqual(A.ART_CAT.yingzhuaHand, { quanzhang: 0.7, qimen: 0.3 });
  const s = V({ sect24: 'gaibang' }); tick(s, 0.1); assert.ok(s.sect.tree.includes('huntianGong'));
  const o = createState(7, { kind: 'template', id: 'guojing', askMajor: false }); assert.ok(!o.sect.tree.includes('huntianGong'));
});
