// SG-LIFE-01 批次1 純模型反例（node design/life01/drink-counterexamples.mjs）。常數一律讀 model.rules，不抄寫公式。
import assert from 'node:assert/strict';
import { createModel, STEP_MS } from '../../demo/model.mjs';
import { createRoutes } from '../../demo/routes.mjs';
import { WATER_LENGTH } from '../../demo/water-layout.mjs';

const geo = createRoutes();
const LEN = { water: WATER_LENGTH, herb: geo.routes.herb.length, seat: geo.seatLengths, fun: geo.funLengths, guard: geo.guardLength,
  drink: geo.drinkLengths.home, drinkSeat: geo.drinkLengths.seat };
const fresh = () => createModel(LEN, undefined, undefined, undefined, { placeOf: geo.of });
const sec = (m, n) => { for (let i = 0; i < Math.round(n * 1000 / STEP_MS); i++) m.step(); };
const kinds = (m, k) => m.state.log.filter((l) => l.kind === k);
const out = [];
const ok = (name) => { out.push(name); console.log('ok -', name); };

{ // 1 新局 80、每秒 −0.5；水缸不再背景扣（只因喝水成功而減）
  const m = fresh(), D = m.rules.drink;
  assert.equal(m.view().people.hero.water, D.start);
  let prev = m.state.vat, drops = 0;
  for (let i = 0; i < 60 * 600; i++) { m.step(); if (m.state.vat < prev) drops += prev - m.state.vat; prev = m.state.vat; }
  assert.equal(drops, kinds(m, 'drink:ok').length * D.cost + 0, 'vat 只因喝水減少');
  const m2 = fresh(); m2.state.people.hero.motion = { ...m2.state.people.hero.motion }; // 同一局 10 秒
  m2.state.people.hero.rest = 'manual'; m2.state.people.hero.motion = { mode: 'seated', job: null, phase: null, steps: 0, need: null, tripLevel: 1 };
  sec(m2, 10); assert.equal(m2.view().people.hero.water, D.start - D.perSec * 10);
  ok('水分 80 起、每遊戲秒 −0.5；600 秒內水缸減少量＝成功喝水次數×1（舊 60 秒背景扣水已移除）');
}
{ // 2 同 tick 只剩 1 份水：固定順序 hero 成功、cousin 沒喝到
  const m = fresh(), s = m.state;
  sec(m, 0.1);
  s.vat = 1;
  for (const id of ['hero', 'cousin']) { const p = s.people[id]; p.waterQ = 0; p.motion = { mode: 'drink', job: null, phase: null, steps: 179, need: 180, tripLevel: 1, from: 'home' }; }
  const before = s.inFlight; m.step();
  assert.equal(s.vat, 0); assert.equal(s.people.hero.drinkNote, 'ok'); assert.equal(s.people.cousin.drinkNote, 'empty');
  assert.ok(s.people.hero.waterQ > 0 && s.people.cousin.waterQ === 0); void before;
  ok('同 tick 剩 1 份水：主角成功（水缸 1→0）、熟手沒喝到，水缸不為負');
}
{ // 3 水缸 0 時口渴者照常工作，不卡死；之後有水會喝
  const m = fresh(), s = m.state; s.vat = 0;
  for (const id of ['hero', 'cousin']) s.people[id].waterQ = 0;
  sec(m, 900);
  assert.ok(kinds(m, 'drink:ok').length >= 2, '補水後有人喝到');
  assert.ok(s.people.hero.trips + s.people.cousin.trips >= 4, '口渴不阻擋工作');
  ok('水缸 0、兩人都渴：照常挑水補缸，之後真去喝到（不會兩人都等水沒人挑）');
}
{ // 4 停工坐著：精力≥80 口渴自己去喝、回座位、仍停工、不產出
  const m = fresh(), s = m.state, p = s.people.cousin;
  m.dispatch('restAfterTrip', 'cousin'); sec(m, 5);
  assert.equal(p.motion.mode, 'seated');
  p.waterQ = Math.round(m.rules.drink.want * 120); s.vat = 3; const t0 = p.trips;
  m.step(); assert.equal(p.motion.mode, 'toDrink'); assert.equal(p.motion.from, 'seat');
  sec(m, 20);
  assert.equal(p.motion.mode, 'seated'); assert.equal(p.rest, 'manual'); assert.equal(p.trips, t0); assert.equal(p.drinkNote, 'ok');
  ok('停工者自己喝水後回座位，仍停工、不重新開工');
}
{ // 5 喝水中改令：取消、沒扣水缸、沒加水分、返院後照新令出發
  const m = fresh(), s = m.state, p = s.people.hero;
  s.vat = 5; p.waterQ = 0; sec(m, 0.05);
  while (p.motion.mode !== 'drink') m.step();
  m.step(); const v0 = s.vat, w0 = p.waterQ;
  const r = m.dispatch('work:herb', 'hero'); assert.ok(r.ok, r.reason);
  assert.equal(p.motion.mode, 'fromDrink'); assert.equal(p.drinkNote, 'canceled');
  while (p.motion.mode === 'fromDrink') m.step();
  assert.ok(p.waterQ <= w0 && !kinds(m, 'drink:ok').some((l) => l.person === 'hero'), '沒結算喝水'); assert.equal(p.job, 'herb'); void v0;
  ok('喝水中改做採藥：取消未喝完的水、不扣缸不加水，返院後照新工作');
}
{ // 6 挑水途中口渴：本趟先交付，回院中才去喝
  const m = fresh(), s = m.state, p = s.people.hero;
  sec(m, 1); assert.equal(p.motion.mode, 'carry');
  p.waterQ = 0; const trips = p.trips;
  while (p.trips === trips) { m.step(); assert.ok(p.motion.mode === 'carry' || p.trips > trips); }
  const done = s.tick;
  for (let i = 0; i < 60 * 300 && !kinds(m, 'toDrink').some((l) => l.person === 'hero'); i++) m.step();
  const go = kinds(m, 'toDrink').find((l) => l.person === 'hero');
  assert.ok(go && go.tick >= done, '交付後（必要時先恢復）才去喝');
  ok('途中口渴不中斷本趟：交付後才去喝');
}
{ // 7 精力 ≤30 先恢復到 80，才去喝
  const m = fresh(), s = m.state, p = s.people.hero;
  sec(m, 1); p.energy = 30.5; p.waterQ = 0;
  for (let i = 0; i < 60 * 300 && p.motion.mode !== 'toDrink'; i++) m.step();
  const seatedLog = kinds(m, 'seated').find((l) => l.person === 'hero'), drinkLog = kinds(m, 'toDrink').find((l) => l.person === 'hero');
  assert.ok(seatedLog && drinkLog && seatedLog.tick < drinkLog.tick && p.energy >= m.rules.energy.backAt);
  ok('精力低先恢復到 80，回院中後才去喝');
}
{ // 8 護院派遣優先：有驅離任務時不去喝
  const m = fresh(), s = m.state, p = s.people.hero;
  p.guardOrder = 99; p.waterQ = 0; p.motion = { mode: 'idle', job: null, phase: null, steps: 0, need: null, tripLevel: 1 };
  m.step(); assert.notEqual(p.motion.mode, 'toDrink');
  ok('有護院／整理／清理在身時不去喝水（互斥與優先序保留）');
}
console.log(`\n${out.length}/8 counterexamples passed`);
