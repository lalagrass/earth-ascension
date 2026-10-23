'use strict';
// SG-LIFE-01（#279）生活開發版 demo：自主飲水、停工自理、手動存讀的 CI 測試。
// 只用 demo 的公開 API（createModel／step／dispatch／view／exportState／restore 與 life-save.mjs）；
// 常數一律讀 model.rules.drink 與匯出值，不在測試裡抄寫數值或公式。路線長度由 routes.mjs／water-layout.mjs 實算。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEMO = path.join(__dirname, '..', 'experiments', 'water-carry', 'demo');
const load = (f) => import(pathToFileURL(path.join(DEMO, f)).href);

async function setup() {
  const M = await load('model.mjs'), R = await load('routes.mjs'), W = await load('water-layout.mjs'), S = await load('life-save.mjs');
  const geo = R.createRoutes(W.WATER_POINTS);
  const r1 = (n) => Math.round(n * 10) / 10;
  // 與 app.mjs 的 LENGTHS 同一組來源。
  const LEN = { water: W.WATER_LENGTH, herb: r1(geo.routes.herb.length), seat: geo.seatLengths, fun: geo.funLengths,
    boar: { edge: r1(geo.boarLengths.edge), total: r1(geo.boarLengths.total), seen: geo.boarSeenD }, guard: r1(geo.guardLength),
    drink: r1(geo.drinkLengths.home), drinkSeat: { hero: r1(geo.drinkLengths.seat.hero), cousin: r1(geo.drinkLengths.seat.cousin) } };
  const fresh = () => M.createModel(LEN, undefined, undefined, undefined, { placeOf: geo.of });
  const ticksOf = (sec) => Math.round(sec * 1000 / M.STEP_MS);
  const run = (m, sec) => { for (let i = 0; i < ticksOf(sec); i++) m.step(); };
  const until = (m, pred, sec = 900) => { for (let i = 0; i < ticksOf(sec); i++) { if (pred(m)) return true; m.step(); } return pred(m); };
  return { M, S, geo, LEN, fresh, run, until, ticksOf };
}

test('水分：新局起始值、每遊戲秒下降、口渴門檻；水缸只因成功喝水而減少（不再背景扣水）', async () => {
  const { fresh, run } = await setup();
  const m = fresh(), D = m.rules.drink;
  assert.ok(D, 'demo 規則要有飲水設定');
  for (const id of ['hero', 'cousin']) assert.equal(m.view().people[id].water, D.start);
  // 兩人都停工坐著：不產出、不喝（未渴），量測純下降。
  m.dispatch('restAfterTrip', 'hero'); m.dispatch('restAfterTrip', 'cousin');
  const t0 = m.view().seconds, w0 = m.view().people.hero.water, vat0 = m.state.vat;
  run(m, 20);
  const v = m.view();
  assert.equal(v.people.hero.water, w0 - D.perSec * (v.seconds - t0));
  assert.equal(m.state.vat, vat0, '沒人喝水時水缸不變');
  assert.equal(v.people.hero.thirsty, false);
  // 長跑：水缸減少量＝成功喝水次數 × 每次扣量。
  const g = fresh();
  let drops = 0, prev = g.state.vat;
  for (let i = 0; i < 60 * 900; i++) { g.step(); if (g.state.vat < prev) drops += prev - g.state.vat; prev = g.state.vat; }
  const oks = g.state.log.filter((l) => l.kind === 'drink:ok').length;
  assert.ok(oks >= 2, '15 分鐘內兩人都會真去喝');
  assert.equal(drops, oks * D.cost);
  for (const id of ['hero', 'cousin']) assert.ok(g.view().people[id].water <= D.max && g.view().people[id].water >= 0);
});

test('口渴時真走到水缸旁、喝滿時長才結算；同 tick 只剩 1 份水時固定順序只 1 人成功', async () => {
  const { fresh, until, LEN, M } = await setup();
  const m = fresh(), D = m.rules.drink, p = m.state.people.hero;
  p.waterQ = Math.round(D.want * M.WATER_Q); // 恰在門檻
  assert.ok(until(m, (x) => x.view().people.hero.mode === 'toDrink', 1));
  const leg = m.view().people.hero.drinkLeg;
  assert.equal(leg.from, 'home');
  assert.ok(LEN.drink > 0);
  assert.ok(until(m, (x) => x.view().people.hero.mode === 'drink', 30));
  const startTick = m.state.tick;
  let vatBefore = m.state.vat;
  while (m.view().people.hero.mode === 'drink') { vatBefore = m.state.vat; m.step(); }
  assert.equal(m.view().people.hero.mode, 'fromDrink');
  assert.equal(Math.round((m.state.tick - startTick) * M.STEP_MS), D.drinkMs);
  // 結算當下（主角在人物迴圈第一位）水缸恰扣 1 次；紀錄寫的是扣後實存。
  const okLog = m.state.log.filter((l) => l.kind === 'drink:ok' && l.person === 'hero').at(-1);
  assert.equal(okLog.tick, m.state.tick); assert.equal(okLog.vat, vatBefore - D.cost);
  assert.equal(p.drinkNote, 'ok');
  // 剩 1 份：兩人同 tick 喝滿。
  const n = fresh(), s = n.state;
  s.vat = 1;
  for (const id of ['hero', 'cousin']) {
    s.people[id].waterQ = 0;
    s.people[id].motion = { mode: 'drink', job: null, phase: null, steps: 0, need: 1, tripLevel: s.people[id].level, from: 'home' };
  }
  n.step();
  assert.equal(s.vat, 0);
  assert.deepEqual(['hero', 'cousin'].map((id) => s.people[id].drinkNote), ['ok', 'empty']);
});

test('手動停工：坐著精力已回滿可自己喝水，喝完回座位仍停工、不產出；改令可取消未喝完的水', async () => {
  const { fresh, until, M } = await setup();
  const m = fresh(), D = m.rules.drink, p = m.state.people.cousin;
  assert.ok(m.dispatch('restAfterTrip', 'cousin').ok);
  assert.ok(until(m, (x) => x.view().people.cousin.mode === 'seated', 600));
  assert.ok(until(m, () => p.energy >= m.rules.energy.backAt, 600));
  const trips = p.trips, done = { ...p.done };
  p.waterQ = Math.round(D.want * M.WATER_Q);
  m.state.vat = Math.max(m.state.vat, D.cost);
  assert.ok(until(m, (x) => x.view().people.cousin.mode === 'toDrink', 1));
  assert.equal(m.view().people.cousin.drinkFrom, 'seat');
  assert.ok(until(m, (x) => x.view().people.cousin.mode === 'seated', 60));
  assert.equal(p.rest, 'manual'); assert.equal(p.drinkNote, 'ok');
  assert.equal(p.trips, trips); assert.deepEqual(p.done, done);
  assert.match(m.view().people.cousin.status, /停工/);
  // 取消：喝水途中下改工作，不扣缸、不加水，返院後照新工作。
  const h = fresh(), q = h.state.people.hero;
  q.waterQ = 0; h.state.vat = 3;
  assert.ok(until(h, (x) => x.view().people.hero.mode === 'drink', 30));
  const w = q.waterQ;
  const r = h.dispatch('work:herb', 'hero');
  assert.ok(r.ok);
  assert.equal(h.view().people.hero.mode, 'fromDrink');
  assert.ok(until(h, (x) => x.view().people.hero.mode !== 'fromDrink', 30));
  assert.ok(q.waterQ <= w);
  assert.equal(h.state.log.filter((l) => l.kind === 'drink:ok' && l.person === 'hero').length, 0);
  assert.equal(q.job, 'herb');
});

test('存讀：存檔後兩局續跑結果逐欄相同；讀檔不推進 tick、不重發收穫', async () => {
  const { fresh, run, S } = await setup();
  const a = fresh();
  run(a, 300); a.dispatch('restAfterTrip', 'cousin'); a.dispatch('work:herb', 'hero'); run(a, 45);
  const store = new Map();
  const storage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const sv = S.saveTo(storage, a);
  assert.ok(sv.ok, sv.text);
  assert.deepEqual([...store.keys()], [S.SAVE_KEY]);
  const env = JSON.parse(store.get(S.SAVE_KEY));
  assert.equal(env.saveVersion, S.SAVE_VERSION); assert.equal(env.compat, S.COMPAT_ID);
  assert.ok(env.state.log.length <= S.LOG_KEEP);
  const b = fresh(), tpl = fresh().exportState();
  run(b, 7); // 目前這局狀態不同
  const r = S.loadFrom(storage, b, tpl);
  assert.ok(r.ok, r.text);
  assert.equal(b.state.tick, a.state.tick, '讀檔不推進 tick');
  assert.deepEqual(b.view().people.hero.done, a.view().people.hero.done, '收穫不重發');
  assert.equal(b.state.vat, a.state.vat);
  run(a, 400); run(b, 400);
  const x = a.exportState(), y = b.exportState();
  assert.deepEqual(y, x);
});

test('壞檔：未知版本、結構錯、數值錯、資源／任務不一致、非 JSON 一律拒絕，目前這局不動；沒有存檔與寫入失敗有正常訊息', async () => {
  const { fresh, run, S } = await setup();
  const a = fresh(); run(a, 200);
  const good = S.makeSave(a), tpl = fresh().exportState();
  const b = fresh(); run(b, 3);
  const before = JSON.stringify(b.exportState());
  const mutate = (fn) => { const e = JSON.parse(JSON.stringify(good)); fn(e); return e; };
  const cases = {
    version: mutate((e) => { e.saveVersion = 2; }),
    compat: mutate((e) => { e.compat = 'other'; }),
    structure: mutate((e) => { delete e.state.people.hero.energy; }),
    extra: mutate((e) => { e.state.people.hero.bonus = 1; }),
    value: mutate((e) => { e.state.people.cousin.energy = -5; }),
    water: mutate((e) => { e.state.people.hero.waterQ = 1e9; }),
    consistency: mutate((e) => { e.state.inFlight += 1; }),
    capacity: mutate((e) => { e.state.vat = 1e3; }),
    mode: mutate((e) => { e.state.people.hero.motion.mode = 'teleport'; }),
  };
  for (const [name, env] of Object.entries(cases)) {
    const r = S.loadInto(b, env, tpl);
    assert.equal(r.ok, false, name);
    assert.equal(JSON.stringify(b.exportState()), before, `${name}：目前這局不變`);
  }
  assert.equal(S.loadInto(b, '{not json', tpl).code, 'parse');
  const empty = { getItem: () => null, setItem: () => {} };
  assert.equal(S.loadFrom(empty, b, tpl).code, 'none');
  // 額度不足：寫入失敗，舊檔保留。
  const store = new Map([[S.SAVE_KEY, 'OLD']]);
  const full = { getItem: (k) => store.get(k) ?? null, setItem: () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } };
  const w = S.saveTo(full, a);
  assert.equal(w.ok, false); assert.equal(w.code, 'quota');
  assert.equal(store.get(S.SAVE_KEY), 'OLD');
});
