// HOME-02（#330／D49）直接反例：木料容量與交付才成長、最後 6 木競爭、取消守恆、工時保留、完成一次、床位、較新指令、明確停止、存檔 guard。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, RULES, WOOD, SITE, H2_MODES } from '../demo/model.mjs';
import { guardedSave, guardedLoad } from '../demo/life02.mjs';

const LEN = 300;
const ONE = [{ id: 'hero', initialLevel: 1 }];
const SENSE = { woodLength: 120, siteLength: 150, bedLengths: { 'bed-1': 160, 'bed-2': 170 } };
const mk = (chars, prefs) => createModel(LEN, RULES, chars, prefs, SENSE);
const P = (m, id = 'hero') => m.state.people[id];
const H = (m) => m.home02.state;
const until = (m, f, max = 40000) => { for (let i = 0; i < max; i++) { if (f()) return i; m.step(); } throw new Error('沒有等到條件'); };
const total = (m) => { const t = H(m); return t.wood + t.site.at + (t.site.bundle ? t.site.bundle.n : 0); }; // 守恆量（不含砍柴在途）
const done = (m) => { const t = H(m); t.site.stage = 'done'; };

test('砍柴：0 起、砍 8 秒、交付才 +1 木與成長一次；實存＋在途 ≤12，滿了不出發但手上照交', () => {
  const m = mk(ONE, {});
  assert.equal(H(m).wood, 0);
  assert.ok(m.dispatch('work:wood').ok);
  assert.equal(P(m).motion.job, 'wood');
  assert.equal(P(m).motion.need[1], Math.ceil(WOOD.chopMs / (1000 / 60) - 1e-9), '砍 8 秒');
  assert.equal(H(m).woodIn, 1);
  const xp0 = P(m).xp, lv0 = P(m).level;
  until(m, () => P(m).motion.phase === 3);
  assert.equal(H(m).wood, 0, '未交付不入帳');
  until(m, () => H(m).wood === 1);
  assert.equal(H(m).woodIn, 0 + (P(m).motion.mode === 'carry' ? 1 : 0));
  assert.ok(P(m).level > lv0 || P(m).xp === xp0 + 1, '交付成長一次');
  assert.equal(P(m).done.wood, undefined, '不寫舊存檔 done 欄');
  H(m).wood = 11; // 已有一趟在途 → 11+1=12 滿
  until(m, () => P(m).motion.mode !== 'carry');
  assert.equal(H(m).wood, 12, '在途那捆照交');
  for (let i = 0; i < 600; i++) { m.step(); assert.ok(H(m).wood + H(m).woodIn <= WOOD.cap); assert.notEqual(P(m).motion.mode, 'carry', '滿了不出發'); }
});

test('最後 6 木競爭：兩人同 tick 下修寢舍，只有一人占工位與預約，另一人被拒且原工作不變', () => {
  const m = mk(undefined, {});
  H(m).wood = 6;
  P(m, 'hero').rest = 'manual'; P(m, 'cousin').rest = 'manual';
  const a = m.dispatch('build', 'hero'), b = m.dispatch('build', 'cousin');
  assert.ok(a.ok); assert.equal(b.ok, false);
  assert.match(b.reason, /工位/);
  assert.equal(H(m).site.resv, 6); assert.equal(m.view().home02.avail, 0);
  // 工位空出後：可用 0，第二人因缺料被拒（不能二次扣）
  m.dispatch('buildCancel', 'hero');
  assert.equal(H(m).site.resv, 0, '未領料取消全退');
  H(m).wood = 5;
  assert.match(m.dispatch('build', 'cousin').reason, /缺木料/);
  assert.equal(H(m).wood, 5);
});

test('取消守恆：領料前／扛料途中／交料後；扛料途中取消沿原路帶回入庫，已交料不退不二扣', () => {
  const m = mk(ONE, {});
  H(m).wood = 8; P(m).rest = 'manual';
  assert.ok(m.dispatch('build').ok);
  assert.equal(total(m), 8);
  until(m, () => P(m).motion.mode === 'toSite');
  assert.deepEqual(H(m).site.bundle, { by: 'hero', n: 6 }); assert.equal(H(m).wood, 2); assert.equal(total(m), 8);
  for (let i = 0; i < 20; i++) m.step();
  const u = P(m).motion.steps / P(m).motion.need;
  m.dispatch('buildCancel');
  assert.equal(P(m).motion.mode, 'fromSite');
  assert.ok(Math.abs(P(m).motion.a - u) < 0.01, '從所在處走回，不瞬移');
  assert.equal(total(m), 8);
  until(m, () => !H2_MODES.includes(P(m).motion.mode));
  assert.equal(H(m).wood, 8, '帶回入庫'); assert.equal(H(m).site.by, null); assert.equal(H(m).site.resv, 0);
  assert.equal(P(m).rest, 'manual', '明確停止：待命不恢復工作');
  // 交料後取消：料留工地
  P(m).energy = 100;
  m.dispatch('build');
  until(m, () => P(m).motion.mode === 'build');
  assert.equal(H(m).site.at, 6); assert.equal(H(m).wood, 2);
  for (let i = 0; i < 120; i++) m.step();
  const w = H(m).site.work;
  m.dispatch('work:water'); // 較新指令勝
  until(m, () => !H2_MODES.includes(P(m).motion.mode));
  assert.equal(H(m).site.at, 6, '已交料不退'); assert.equal(H(m).wood, 2); assert.equal(H(m).site.work, w, '工時保留');
  assert.equal(H(m).site.stage, 'building');
  // 再下令：不需再扣料，工時接續
  P(m).energy = 100; P(m).rest = 'manual';
  const r = m.dispatch('build'); assert.ok(r.ok); assert.equal(r.text.includes('領木'), false);
  assert.equal(H(m).site.resv, 0); assert.equal(H(m).wood, 2);
});

test('施工：精力 ≤30 先回去恢復、工時與工位保留；完成只一次、開兩床、回院待命', () => {
  const m = mk(ONE, {});
  H(m).wood = 6; P(m).rest = 'manual';
  m.dispatch('build');
  until(m, () => P(m).motion.mode === 'build');
  P(m).energy = 31;
  until(m, () => P(m).motion.mode === 'fromSite');
  const w = H(m).site.work;
  assert.ok(w > 0 && w < m.home02.WORK); assert.equal(H(m).site.by, 'hero'); assert.ok(H(m).want.hero);
  until(m, () => P(m).motion.mode === 'build', 60000);
  assert.equal(H(m).site.work, w, '恢復後接續工時');
  assert.ok(P(m).energy >= 80);
  until(m, () => H(m).site.stage === 'done');
  const n = m.home02.events().filter((e) => e.kind === 'done').length;
  assert.equal(n, 1);
  assert.equal(H(m).site.at, SITE.wood); assert.equal(H(m).wood, 0);
  until(m, () => P(m).motion.mode !== 'fromSite');
  assert.equal(P(m).rest, 'manual');
  for (let i = 0; i < 600; i++) m.step();
  assert.equal(m.home02.events().filter((e) => e.kind === 'done').length, 1, '不重複完成');
  assert.equal(m.dispatch('build').ok, false);
  assert.ok(m.view().home02.beds.every((b) => b.open));
});

test('床位：己床優先、自動認領穩定順序、閒置才可指派／解除、改派原子釋放舊床、不推 tick；未修好走石凳', () => {
  const m = mk(undefined, {});
  P(m, 'hero').energy = 20; P(m, 'cousin').energy = 20;
  m.step();
  assert.equal(P(m, 'hero').motion.bed, undefined, '未修好：石凳');
  until(m, () => P(m, 'hero').motion.mode === 'seated');
  assert.match(m.view().people.hero.bedWhy, /石凳/);
  const m2 = mk(undefined, {}); done(m2);
  P(m2, 'cousin').energy = 20; m2.step();
  assert.equal(P(m2, 'cousin').motion.bed, 'bed-1', '穩定順序認第一張');
  assert.equal(H(m2).beds[0].owner, 'cousin');
  const t0 = m2.state.tick;
  assert.equal(m2.assignBed('bed-1', null).ok, false, '使用中不可解除');
  assert.equal(m2.assignBed('bed-1', 'hero').ok, false);
  assert.ok(m2.assignBed('bed-2', 'hero').ok);
  assert.equal(m2.state.tick, t0, '床牌不推 tick');
  until(m2, () => P(m2, 'cousin').motion.mode === 'seated');
  assert.equal(m2.view().people.cousin.status, '躺下恢復');
  const e = P(m2, 'cousin').energy; m2.step(); assert.ok(P(m2, 'cousin').energy > e, '真到床才 +5/s');
  until(m2, () => P(m2, 'cousin').motion.mode === 'idle' || P(m2, 'cousin').motion.mode === 'carry');
  assert.ok(m2.assignBed('bed-1', 'hero').ok, '閒置可改派');
  assert.equal(H(m2).beds[0].owner, 'hero'); assert.equal(H(m2).beds[1].owner, null, '舊床原子釋放');
  P(m2, 'hero').energy = 20; P(m2, 'cousin').energy = 20;
  const got = {};
  until(m2, () => { for (const id of ['hero', 'cousin']) if (P(m2, id).motion.mode === 'toSeat' && !got[id]) got[id] = P(m2, id).motion.bed; return got.hero && got.cousin; });
  assert.equal(got.hero, 'bed-1', '己床優先');
  assert.equal(got.cousin, 'bed-2', '自動認領空床');
  assert.ok(m2.dispatch('work:herb', 'cousin').ok, '新指令：恢復到 80 後去');
  const g = guardedSave(m2, () => ({ ok: true, text: 'saved' }));
  assert.equal(g.ok, false); assert.equal(g.code, 'home02');
});

test('較新指令勝：扛料途中改派挑水→帶回入庫並照新工作；存讀：讀檔成功才重設、失敗還原', () => {
  const m = mk(ONE, {});
  H(m).wood = 7;
  m.dispatch('build');
  until(m, () => P(m).motion.mode === 'toSite' && P(m).motion.steps > 5);
  m.dispatch('work:water');
  until(m, () => P(m).motion.mode === 'carry');
  assert.equal(P(m).motion.job, 'water'); assert.equal(H(m).wood, 7); assert.equal(H(m).want.hero, false);
  until(m, () => P(m).motion.mode !== 'carry');
  const ok = guardedSave(m, () => ({ ok: true, text: 'saved' }));
  assert.ok(ok.ok); assert.match(ok.text, /不寫入存檔/);
  guardedLoad(m, () => ({ ok: false, text: 'bad' }));
  assert.equal(H(m).wood, 7, '失敗不動暫態');
  guardedLoad(m, () => ({ ok: true, text: 'ok' }));
  assert.equal(H(m).wood, 0, '成功才重設');
});
