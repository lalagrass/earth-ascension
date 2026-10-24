// SG-TRAIN-01（#305／D43）直接反例：有效單位／取消不給進度／上限；自理中止與恢復、玩家覆寫不搶回、原趟保留；
// 練熟改原清理起手；保存 guard 與載入邊界。不重跑舊矩陣、不做常數鏡像（數值讀 TRAIN／SKILLS 匯出）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel, TRAIN, TRAIN_MODES } from '../demo/model.mjs';
import { createRoutes } from '../demo/routes.mjs';
import { SKILLS } from '../demo/palm.mjs';
import { saveTo, loadFrom, SAVE_KEY } from '../demo/life-save.mjs';
import { guardedSave, guardedLoad } from '../demo/life02.mjs';

const scene = JSON.parse(readFileSync(new URL('../spikes/shared/scene.json', import.meta.url)));
const geo = createRoutes(scene.path.points);
const r1 = (n) => Math.round(n * 10) / 10;
const LENGTHS = { water: scene.path.length, herb: r1(geo.routes.herb.length), seat: geo.seatLengths, fun: geo.funLengths,
  boar: { edge: r1(geo.boarLengths.edge), total: r1(geo.boarLengths.total), seen: geo.boarSeenD }, guard: r1(geo.guardLength) };
const mk = () => createModel(LENGTHS, undefined, undefined, undefined, { placeOf: geo.of, meetLengths: geo.meetLengths, trainLengths: geo.trainLengths });
const UNIT = Math.round(TRAIN.unitMs * 60 / 1000);
const P = (m, id = 'hero') => m.state.people[id];
const T = (m) => m.train01.state;
const run = (m, n, f) => { for (let i = 0; i < n; i++) { if (f && f(m) === false) return i; m.step(); } return -1; };
const until = (m, f, n = 60 * 60 * 30) => { const i = run(m, n, (x) => (f(x) ? false : undefined)); assert.ok(i >= 0, '等不到條件'); };
const store = () => ({ v: new Map(), getItem(k) { return this.v.has(k) ? this.v.get(k) : null; }, setItem(k, x) { this.v.set(k, x); } });
const atPost = (m, id = 'hero') => P(m, id).motion.mode === 'train';

test('A1 有效單位：站位上完整 12 秒才 +1；取消／重派不給進度、耗掉精力不退；進度止於 6 並寫原 palm', () => {
  const m = mk();
  assert.ok(m.dispatch('train', 'hero').ok);
  until(m, atPost);
  run(m, UNIT - 1);
  assert.equal(T(m).units.hero, 0, '差 1 tick 不算');
  const e = P(m).energy;
  assert.ok(m.dispatch('restAfterTrip', 'hero').ok);
  assert.equal(T(m).units.hero, 0); assert.equal(T(m).cur.hero, 0, '未完成單位歸零');
  assert.ok(P(m).energy <= e, '已耗精力不退');
  assert.ok(m.dispatch('train', 'hero').ok, '停後可再派');
  until(m, atPost); run(m, UNIT + 1);
  assert.equal(T(m).units.hero, 1, '重派從 0 重算本單位');
  until(m, () => P(m).palm === 'adept', 60 * 60 * 60 * 3);
  assert.equal(T(m).units.hero, TRAIN.units);
  run(m, 60 * 60 * 5);
  assert.equal(T(m).units.hero, TRAIN.units, '止於 6');
  assert.equal(m.dispatch('train', 'hero').ok, false, '已熟練不可再練');
  assert.ok(m.state.log.some((x) => x.kind === 'palm:skill' && x.person === 'hero'));
});

test('B1 自理：精力 ≤30 中止本單位（保留已完成、未完成歸零），恢復後目標仍在才回來練', () => {
  const m = mk();
  m.dispatch('train', 'hero');
  let dropped = null;
  until(m, () => { const d = m.train01.log().find((x) => x.kind === 'unit:drop' && x.why === 'care'); if (d) dropped = { d, units: T(m).units.hero }; return !!d; }, 60 * 60 * 60);
  assert.ok(dropped.units >= 1 && T(m).cur.hero === 0);
  assert.equal(P(m).motion.mode, 'fromTrain');
  until(m, atPost, 60 * 60 * 60);
  assert.equal(T(m).units.hero, dropped.units, '恢復後從已完成單位續');
  assert.ok(P(m).energy > 30);
});

test('B2 玩家覆寫：改工作即退出目標、不搶回；搬運中原趟先交付、不改行走', () => {
  const m = mk();
  m.dispatch('work:water', 'hero');
  until(m, () => P(m).motion.mode === 'carry' || P(m).motion.phase === 'carry' || /carry|back/.test(P(m).motion.mode));
  const mo = JSON.stringify(P(m).motion);
  assert.ok(m.dispatch('train', 'hero').ok);
  assert.equal(JSON.stringify(P(m).motion), mo, '原趟行走不變');
  until(m, atPost, 60 * 60 * 10);
  // 同 job 也可明確覆寫回人工（#302/#304 反例）
  const a = m.actions('hero').find((x) => x.id === 'work:water');
  assert.equal(a.enabled, true, a.reason);
  assert.ok(m.dispatch('work:water', 'hero').ok);
  assert.equal(T(m).goal.hero, false); assert.equal(T(m).cur.hero, 0);
  run(m, 60 * 60 * 3);
  assert.ok(!TRAIN_MODES.slice(0, 2).includes(P(m).motion.mode) || P(m).motion.mode === 'fromTrain', '不被搶回練功');
  assert.equal(T(m).goal.hero, false);
  assert.equal(P(m).job, 'water');
});

test('B3 練熟後回院休息待命，不恢復舊工作或自主補水方針', () => {
  const m = mk();
  m.dispatch('fill', 'hero'); m.dispatch('train', 'hero');
  assert.equal(m.life02.state.fill.hero, false, '練掌退出自主補水');
  until(m, () => P(m).palm === 'adept', 60 * 60 * 60 * 3);
  until(m, () => P(m).motion.mode === 'idle' || P(m).motion.mode === 'seated' || P(m).rest, 60 * 60 * 5);
  run(m, 60 * 60 * 2);
  assert.equal(P(m).rest, 'manual'); assert.equal(m.life02.state.fill.hero, false);
  assert.ok(!TRAIN_MODES.includes(P(m).motion.mode));
});

test('C1 練熟套用到原清理：起手 tick 由 48 變 24（原 palm 欄位，SKILLS 讀值）', () => {
  const m = mk();
  m.dispatch('train', 'hero');
  until(m, () => P(m).palm === 'adept', 60 * 60 * 60 * 3);
  until(m, () => !TRAIN_MODES.includes(P(m).motion.mode), 60 * 60 * 5);
  const rs = m.dispatch('start', 'hero'); assert.ok(rs.ok, rs.reason); // 待命＝原停工；玩家先解除再派清理
  const rc = m.dispatch('clean', 'hero'); assert.ok(rc.ok, rc.reason);
  let w = 0;
  until(m, () => P(m).motion.mode === 'windup', 60 * 60 * 20);
  until(m, () => { if (P(m).motion.mode === 'windup') { w += 1; return false; } return true; }, 600);
  assert.ok(Math.abs(w - SKILLS.adept.windup) <= 1, `起手 ${w} tick`);
  assert.equal(SKILLS.novice.windup, 48);
});

test('D1 保存 guard：練功途中不覆寫舊檔；回院後可存，練熟結果沿原 palm 存', () => {
  const m = mk(), st = store();
  st.setItem(SAVE_KEY, 'OLD');
  m.dispatch('train', 'hero');
  until(m, atPost);
  const r = guardedSave(m, () => saveTo(st, m));
  assert.equal(r.ok, false); assert.equal(st.getItem(SAVE_KEY), 'OLD');
  until(m, () => P(m).palm === 'adept', 60 * 60 * 60 * 3);
  until(m, () => !TRAIN_MODES.includes(P(m).motion.mode), 60 * 60 * 5);
  const r2 = guardedSave(m, () => saveTo(st, m));
  assert.ok(r2.ok, r2.text); assert.match(r2.text, /練掌進度不保存/);
  assert.match(st.getItem(SAVE_KEY), /"palm":"adept"/);
  assert.ok(!/train01|units/.test(st.getItem(SAVE_KEY)));
});

test('D2 載入：失敗全不變；成功清新暫態、掌法照存檔', () => {
  const tpl = mk().exportState();
  const m = mk(), st = store();
  assert.ok(saveTo(st, m).ok);
  m.dispatch('train', 'hero'); until(m, atPost); run(m, UNIT + 10);
  const keepT = JSON.stringify(T(m)), keepS = JSON.stringify(m.exportState());
  const bad = store(); bad.setItem(SAVE_KEY, '{"broken":');
  assert.equal(guardedLoad(m, () => loadFrom(bad, m, tpl)).ok, false);
  assert.equal(JSON.stringify(T(m)), keepT); assert.equal(JSON.stringify(m.exportState()), keepS);
  const ro = guardedLoad(m, () => loadFrom(st, m, tpl));
  assert.ok(ro.ok, ro.text);
  assert.equal(T(m).goal.hero, false); assert.equal(T(m).units.hero, 0); assert.equal(P(m).palm, 'novice');
});
