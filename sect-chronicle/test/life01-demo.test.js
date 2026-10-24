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
  const fresh = (legacy = false) => M.createModel(LEN, legacy ? { ...M.RULES, thirst: true } : undefined, undefined, undefined, { placeOf: geo.of });
  const ticksOf = (sec) => Math.round(sec * 1000 / M.STEP_MS);
  const run = (m, sec) => { for (let i = 0; i < ticksOf(sec); i++) m.step(); };
  const until = (m, pred, sec = 900) => { for (let i = 0; i < ticksOf(sec); i++) { if (pred(m)) return true; m.step(); } return pred(m); };
  return { M, S, geo, LEN, fresh, run, until, ticksOf };
}

test('D45 新局：沒有口渴衰減、不自動喝水，水缸不背景扣水；舊 waterQ 欄位仍合法', async () => {
  const { fresh, run } = await setup();
  const m = fresh(), D = m.rules.drink;
  assert.ok(D, '舊飲水設定保留給舊檔收尾');
  assert.equal(m.view().thirst, false);
  m.dispatch('restAfterTrip', 'hero'); m.dispatch('restAfterTrip', 'cousin');
  const w0 = m.state.people.hero.waterQ, vat0 = m.state.vat;
  run(m, 20);
  assert.equal(m.state.people.hero.waterQ, w0, '水分不再下降');
  assert.equal(m.state.vat, vat0);
  assert.equal(m.view().people.hero.thirsty, false);
  const g = fresh();
  for (let i = 0; i < 60 * 900; i++) g.step();
  assert.equal(g.state.log.filter((l) => l.kind === 'drink:ok').length, 0, '15 分鐘內不會自動喝水');
  for (const id of ['hero', 'cousin']) assert.ok(!/Drink|^drink$/.test(g.view().people[id].mode));
});

test('口渴時真走到水缸旁、喝滿時長才結算；同 tick 只剩 1 份水時固定順序只 1 人成功', async () => {
  const { fresh, until, LEN, M } = await setup();
  const m = fresh(true), D = m.rules.drink, p = m.state.people.hero;
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
  const n = fresh(true), s = n.state;
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
  const m = fresh(true), D = m.rules.drink, p = m.state.people.cousin;
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
  const h = fresh(true), q = h.state.people.hero;
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
    version: mutate((e) => { e.saveVersion = 99; }),
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

test('壞檔（review 5632832438）：必要物件改 null、未知 enum 一律拒絕；拒絕前後目前這局逐欄相同且能繼續 tick；合法檔仍可讀', async () => {
  const { S, fresh, run } = await setup();
  const m = fresh(), tpl = fresh().exportState();
  run(m, 120);
  const good = S.makeSave(m);
  run(m, 30);
  const cases = {
    'shadow=null': (st) => { st.shadow = null; },
    'boar=null': (st) => { st.boar = null; },
    'people.hero.pos=null': (st) => { st.people.hero.pos = null; },
    'boar.mode 未知': (st) => { st.boar.mode = 'teleport'; },
    'rats[0].mode 未知': (st) => { st.rats[0].mode = 'fly'; },
    'shadow.job 未知': (st) => { st.shadow.job = 'gold'; },
    'hero.palm 未知（review 5635659721）': (st) => { st.people.hero.palm = 'teleport'; },
    'hero.xp 負數': (st) => { st.people.hero.xp = -100; },
    'rats[0].id 未知': (st) => { st.rats[0].id = 999; },
  };
  for (const [name, mut] of Object.entries(cases)) {
    const env = JSON.parse(JSON.stringify(good)); mut(env.state);
    const before = JSON.stringify(m.exportState(Infinity));
    const r = S.loadInto(m, JSON.stringify(env), tpl);
    assert.equal(r.ok, false, `${name} 應被拒絕`);
    assert.equal(JSON.stringify(m.exportState(Infinity)), before, `${name} 拒絕後目前這局不變`);
    const t = m.state.tick; m.step(); assert.equal(m.state.tick, t + 1, `${name} 拒絕後仍能續 tick`);
    assert.ok(m.view().people.hero, `${name} 拒絕後 view 正常`);
  }
  // 合法檔：讀入後與存檔時逐欄相同，並與同一檔另一份重放一致。
  const r = S.loadInto(m, JSON.stringify(good), tpl);
  assert.equal(r.ok, true, r.text);
  assert.deepEqual(m.exportState(S.LOG_KEEP), good.state, '合法讀檔同 tick、原狀態');
  m.view();
  const twin = fresh(); assert.equal(S.loadInto(twin, JSON.stringify(good), tpl).ok, true);
  run(m, 60); run(twin, 60);
  assert.deepEqual(m.exportState(), twin.exportState());
});

test('壞檔（review 5635905946）：進行中清鼠路徑依 mode 驗 from／to／queue 路點與目標；拒絕前後目前這局不變，合法在途檔跨路段續跑一致', async () => {
  const { S, fresh, until } = await setup();
  const tpl = fresh().exportState();
  const a = fresh();
  assert.equal(a.dispatch('clean', 'hero').ok, true);
  assert.ok(until(a, (m) => { const h = m.state.people.hero.motion; return h.mode === 'toRat' && h.steps > 0 && h.queue.length > 0; }, 120), '清鼠走在分段路上');
  const good = S.makeSave(a);
  const cases = {
    'queue=null': (h) => { h.queue = null; },
    'queue=[null]': (h) => { h.queue = [null]; },
    'queue 路點缺 y': (h) => { h.queue[0] = { x: 1 }; },
    'to=null': (h) => { h.to = null; },
    'from.x 非數字': (h) => { h.from.x = 'a'; },
    'steps 超過 need': (h) => { h.steps = h.need + 1; },
  };
  const m = fresh();
  for (const [name, mut] of Object.entries(cases)) {
    const env = JSON.parse(JSON.stringify(good)); mut(env.state.people.hero.motion);
    const before = JSON.stringify(m.exportState(Infinity));
    assert.equal(S.loadInto(m, JSON.stringify(env), tpl).ok, false, `${name} 應被拒絕`);
    assert.equal(JSON.stringify(m.exportState(Infinity)), before, `${name} 拒絕後目前這局不變`);
    m.step(); assert.ok(m.view().people.hero, `${name} 拒絕後 step／view 正常`);
  }
  const w = JSON.parse(JSON.stringify(good)); w.state.people.hero.motion = { ...w.state.people.hero.motion, mode: 'windup', target: 99 };
  assert.equal(S.loadInto(m, JSON.stringify(w), tpl).ok, false, '起手目標不是已知測試鼠應拒絕');
  // 合法在途檔：讀入後與原局同步走過下一路段（queue 減少），逐欄一致。
  const b = fresh(); assert.equal(S.loadInto(b, JSON.stringify(good), tpl).ok, true);
  const q0 = a.state.people.hero.motion.queue.length;
  assert.ok(until(b, (x) => x.state.people.hero.motion.mode !== 'toRat' || x.state.people.hero.motion.queue.length < q0, 120), '跨過下一路段');
  const n = b.state.tick - good.state.tick;
  for (let i = 0; i < n + 60; i++) a.step();
  for (let i = 0; i < 60; i++) b.step();
  assert.deepEqual(b.exportState(), a.exportState());
});
