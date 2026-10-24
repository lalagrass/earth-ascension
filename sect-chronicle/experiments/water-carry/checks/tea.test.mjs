// HOME-01（#309／D45）直接反例：新局無口渴、茶座原子占座＋真料預約、一次扣料一次給益、取消邊界、最後一份、搬運先交付、存檔 guard。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, RULES, TEA, TEA_MODES, DRINK_MODES } from '../demo/model.mjs';
import { guardedSave } from '../demo/life02.mjs';

const LEN = 1700.9;
const ONE = [{ id: 'hero', initialLevel: 1 }];
const mk = (over = {}, chars) => createModel(LEN, { ...RULES, ...over }, chars);
const P = (m, id = 'hero') => m.state.people[id];
const until = (m, f, max = 20000) => { for (let i = 0; i < max; i++) { if (f()) return i; m.step(); } throw new Error('沒有等到條件'); };

test('D45 新局：沒有口渴衰減、不自動喝水，水分欄位只是舊合法資料', () => {
  const m = mk();
  const w0 = P(m).waterQ;
  for (let i = 0; i < 60 * 240; i++) { m.step(); for (const id of ['hero', 'cousin']) assert.ok(!DRINK_MODES.includes(P(m, id).motion.mode), '不會自己去喝水'); }
  assert.equal(P(m).waterQ, w0, '水分不衰減');
  assert.equal(m.view().thirst, false);
  assert.equal(m.view().people.hero.thirsty, false);
});

test('泡茶：到座同 tick 占座＋預約；煮完才扣一次料；喝完一次 +40（上限 100）；回院 manual 待命', () => {
  const m = mk({ vatStart: 3, herbStart: 2 }, ONE);
  P(m).energy = 50;
  const r = m.dispatch('tea');
  assert.ok(r.ok, r.reason);
  until(m, () => P(m).motion.mode === 'brew');
  assert.equal(m.tea.state.seat, 'hero');
  assert.deepEqual(m.tea.state.resv, { water: 1, herb: 1 });
  assert.equal(m.state.vat, 3, '煮完前不扣');
  assert.equal(m.view().teaAvail.water, 2, '可用＝實存−預約');
  const e0 = P(m).energy;
  until(m, () => P(m).motion.mode === 'sip');
  assert.equal(P(m).energy, e0, '煮茶不回精力、不疊坐歇');
  assert.equal(m.state.vat, 2); assert.equal(m.state.herbs, 1);
  assert.deepEqual(m.tea.state.resv, { water: 0, herb: 0 });
  until(m, () => P(m).motion.mode === 'fromTea');
  assert.equal(P(m).energy, Math.min(100, e0 + TEA.gain));
  assert.equal(m.state.vat, 2, '只扣一次');
  until(m, () => !TEA_MODES.includes(P(m).motion.mode));
  assert.equal(P(m).rest, 'manual', '回院 manual 待命，不默恢復舊工作');
  assert.ok(m.tea.events().some((e) => e.kind === 'drank'));
  P(m).energy = 90; m.dispatch('tea');
  until(m, () => P(m).motion.mode === 'fromTea' && m.state.vat === 1);
  until(m, () => P(m).motion.mode !== 'fromTea');
  assert.equal(P(m).energy, 100, '上限 100');
});

test('取消：煮完前全退不扣；煮完後不退料、沒喝完沒有精力', () => {
  const m = mk({ vatStart: 3, herbStart: 3 }, ONE);
  P(m).energy = 50;
  m.dispatch('tea');
  until(m, () => P(m).motion.mode === 'brew' && P(m).motion.steps > 60);
  assert.ok(m.dispatch('teaCancel').ok);
  assert.equal(m.tea.state.seat, null); assert.deepEqual(m.tea.state.resv, { water: 0, herb: 0 });
  assert.equal(m.state.vat, 3); assert.equal(m.state.herbs, 3);
  assert.equal(P(m).motion.mode, 'fromTea', '從茶座真走回');
  until(m, () => P(m).motion.mode !== 'fromTea');
  m.dispatch('tea');
  until(m, () => P(m).motion.mode === 'sip' && P(m).motion.steps > 30);
  const e = P(m).energy;
  assert.ok(m.dispatch('work:herb').ok, '較新改令勝出');
  assert.equal(m.state.vat, 2, '料已用不退');
  until(m, () => P(m).motion.mode !== 'fromTea');
  assert.ok(P(m).energy <= e, '沒喝完沒有 +40');
  assert.ok(!m.tea.active(P(m)));
});

test('最後一份不能兩人同用：先到的占座預約，後到的清楚失敗、不排隊', () => {
  const m = mk({ vatStart: 1, herbStart: 1 });
  P(m, 'hero').energy = 50; P(m, 'cousin').energy = 50;
  assert.ok(m.dispatch('tea', 'hero').ok);
  assert.ok(m.dispatch('tea', 'cousin').ok);
  for (let i = 0; i < 60 * 40; i++) m.step();
  assert.equal(m.state.vat, 0); assert.equal(m.state.herbs, 0);
  const drank = m.tea.events().filter((e) => e.kind === 'drank');
  const failed = m.tea.events().filter((e) => e.kind === 'fail');
  assert.equal(drank.length, 1); assert.equal(failed.length, 1);
  assert.match(failed[0].text, /缺料|茶座正被/);
});

test('缺料拒絕：給原因、不清舊意圖', () => {
  const m = mk({ vatStart: 0, herbStart: 2 }, ONE);
  for (let i = 0; i < 30; i++) m.step();
  const mode = P(m).motion.mode, job = P(m).job;
  const r = m.dispatch('tea');
  assert.equal(r.ok, false); assert.match(r.reason, /缺料：水缸可用 0/);
  assert.equal(P(m).motion.mode, mode); assert.equal(P(m).job, job);
  assert.equal(m.actions('hero').find((a) => a.id === 'tea').enabled, false);
});

test('搬運中派茶：這趟先交付，再去茶座；煮茶中不能存、舊檔不被覆寫', () => {
  const m = mk({ vatStart: 2, herbStart: 2 }, ONE);
  until(m, () => P(m).motion.mode === 'carry');
  const trips = P(m).trips;
  assert.ok(m.dispatch('tea').ok);
  assert.equal(P(m).motion.mode, 'carry');
  until(m, () => P(m).motion.mode === 'toTea', 60 * 600);
  assert.equal(P(m).trips, trips + 1, '原趟交付一次');
  until(m, () => P(m).motion.mode === 'brew');
  let wrote = false;
  const r = guardedSave(m, () => { wrote = true; return { ok: true, text: '' }; });
  assert.equal(r.ok, false); assert.equal(r.code, 'tea'); assert.equal(wrote, false);
  assert.match(r.text, /舊存檔未覆寫/);
});

test('review 6387175919①：喝完茶返院途中下較新 work:herb，抵院後照新指令採藥，不被舊 manual 待命蓋掉', () => {
  const m = mk({ vatStart: 3, herbStart: 2 }, ONE);
  P(m).energy = 50;
  assert.ok(m.dispatch('tea').ok);
  until(m, () => P(m).motion.mode === 'fromTea');
  assert.equal(m.tea.state.done.hero, true);
  const r = m.dispatch('work:herb');
  assert.ok(r.ok, r.reason);
  until(m, () => P(m).motion.mode !== 'fromTea');
  for (let i = 0; i < 30; i++) m.step();
  assert.notEqual(P(m).rest, 'manual');
  assert.equal(P(m).job, 'herb');
  assert.ok(!['toSeat', 'seated'].includes(P(m).motion.mode), `應去採藥，實際 ${P(m).motion.mode}`);
  // 明確取消仍保持 manual 語義。
  const n = mk({ vatStart: 3, herbStart: 2 }, ONE);
  P(n).energy = 50;
  assert.ok(n.dispatch('tea').ok);
  until(n, () => P(n).motion.mode === 'brew');
  assert.ok(n.dispatch('teaCancel').ok);
  until(n, () => !TEA_MODES.includes(P(n).motion.mode));
  assert.equal(P(n).rest, 'manual');
});

test('review 6387175919②：合法舊 drink mode 與茶預約競爭最後水 1，水缸不為負、不雙用', () => {
  const m = mk({ vatStart: 1, herbStart: 1 });
  const c = P(m, 'cousin');
  c.motion = { mode: 'drink', job: null, phase: null, steps: 0, need: 180, tripLevel: c.level, from: 'home' };
  P(m).energy = 50;
  assert.ok(m.dispatch('tea').ok);
  let min = m.state.vat;
  for (let i = 0; i < 60 * 40; i++) { m.step(); min = Math.min(min, m.state.vat); }
  assert.ok(min >= 0, `水缸出現 ${min}`);
  const drank = m.state.log.filter((l) => l.kind === 'drink:ok').length;
  const brewed = m.tea.state.events.filter((e) => e.kind === 'brewed').length;
  assert.equal(drank + brewed, 1, `最後一份只能用一次（drink ${drank}／tea ${brewed}）`);
  assert.equal(m.state.vat, 0);
});
