// V3 展示模型的局部反例。用法（在 experiments/water-carry 下）：node --test checks/model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel as createLifeModel, createClock, tripSteps, speedsFor, RULES as RULES_D45, STEP_MS } from '../demo/model.mjs';
// HOME-01／D45：新局已無口渴；本檔舊節奏（喝水耗缸、口渴自理）只作舊行為 fixture，明示 thirst:true。新局 D45 斷言見 tea.test.mjs。
const RULES = { ...RULES_D45, thirst: true };

// 保留原一人基線的反例，明確指定單人；預設新局與下方共享容量反例使用雙人。
const createModel = (len, rules) => createLifeModel(len, rules, [{ id: 'hero', initialLevel: 1 }]);

const LEN = JSON.parse(readFileSync(new URL('../spikes/shared/scene.json', import.meta.url))).path.length;
const runUntil = (m, pred, limit = 1e6) => { for (let i = 0; i < limit; i++) { if (pred(m.view())) return; m.step(); } throw new Error('沒有等到條件'); };
// 不讓道館用水干擾的規則（水缸夠大、不用水）
// SG-LIFE-01：正式規則改為「兩人真喝水才扣缸」；以下沿用舊定時用水（或不用水）的 LP 回歸 fixture 一律加 drink: null，
// 明確關掉飲水，讓它們繼續只驗原本的停工／休閒／容量語意（飲水另由 test/life01-demo.test.js 與 design/life01 反例驗）。
const NO_USE = { ...RULES, vatCapacity: 999, useEveryMs: 1e12, drink: null };

test('每趟只在倒水完成時入帳一次，並且只成長一次', () => {
  const m = createModel(LEN, NO_USE);
  const vat0 = m.view().vat;
  let prev = m.view();
  let changes = 0;
  runUntil(m, (v) => {
    if (v.vat !== prev.vat) {
      changes++;
      assert.equal(v.vat, prev.vat + 1, '一次只入一擔');
      assert.equal(v.trips, prev.trips + 1, '入帳和趟數同一步');
    }
    if (v.trips === prev.trips) assert.equal(v.xp + v.level * 100, prev.xp + prev.level * 100, '趟中不成長');
    prev = v;
    return v.trips === 3;
  });
  assert.equal(changes, 3);
  assert.equal(m.view().vat, vat0 + 3);
});

test('成長在倒完水才生效：當趟維持出發時的速度，下一趟同倍率真的更快', () => {
  const m = createModel(LEN, NO_USE);
  runUntil(m, (v) => v.mode === 'carry' && v.phase.name === 'up');
  assert.equal(m.view().tripLevel, 1);
  runUntil(m, (v) => v.trips === 1);
  const first = m.view().lastTrip;
  assert.equal(first.level, 1);
  assert.equal(m.view().level, 2, '第一趟完成升 Lv 2');
  runUntil(m, (v) => v.trips === 2);
  const second = m.view().lastTrip;
  assert.equal(second.level, 2);
  assert.ok(second.seconds < first.seconds, `第二趟 ${second.seconds}s 應短於第一趟 ${first.seconds}s`);
  assert.ok(Math.abs(first.seconds - tripSteps(1, LEN) * STEP_MS / 1000) < 1e-9, '實際步數等於公式');
});

test('速度有上限：滿級後再挑不會更快，也不再成長', () => {
  const m = createModel(LEN, NO_USE);
  const need = RULES.tripsToNext.reduce((a, b) => a + b, 0);
  runUntil(m, (v) => v.trips === need);
  assert.equal(m.view().level, RULES.maxLevel);
  assert.ok(m.view().atCap);
  runUntil(m, (v) => v.trips === need + 2);
  assert.equal(m.view().level, RULES.maxLevel);
  assert.deepEqual(speedsFor(RULES.maxLevel + 3), speedsFor(RULES.maxLevel));
  assert.equal(speedsFor(RULES.maxLevel).load, RULES.loadSpeed.cap);
  assert.equal(m.view().lastTrip.seconds, tripSteps(RULES.maxLevel, LEN) * STEP_MS / 1000);
});

test('本趟後停工：倒完水才停，走去座位後不自己出發；開始挑水才返院再出發', () => {
  const m = createModel(LEN, NO_USE);
  runUntil(m, (v) => v.mode === 'carry' && v.phase.name === 'down');
  assert.equal(m.dispatch('restAfterTrip').ok, true);
  assert.equal(m.dispatch('restAfterTrip').ok, false, '不能重複下');
  assert.equal(m.view().mode, 'carry', '下令當下不停工');
  runUntil(m, (v) => v.trips === 1);
  assert.equal(m.view().resting, true);
  assert.equal(m.view().mode, 'toSeat', 'LP-04：停工改為走去座位');
  for (let i = 0; i < 5000; i++) m.step();
  assert.equal(m.view().trips, 1, '休息期間不挑水、不入帳');
  assert.equal(m.view().mode, 'seated');
  assert.equal(m.view().energy, 100, '停工可坐到滿');
  const r = m.dispatch('start');
  assert.equal(r.ok, true);
  assert.equal(m.view().mode, 'back', '精力≥80：先返院');
  runUntil(m, (v) => v.mode === 'carry');
  assert.equal(m.view().trips, 1);
});

test('取消待執行：倒完水後繼續挑', () => {
  const m = createModel(LEN, NO_USE);
  m.step();
  m.dispatch('restAfterTrip');
  assert.equal(m.dispatch('cancel').ok, true);
  runUntil(m, (v) => v.trips === 1);
  m.step();
  assert.equal(m.view().resting, false);
  assert.equal(m.view().mode, 'carry');
});

test('做不到的選項回原因，不改狀態', () => {
  const m = createModel(LEN, NO_USE);
  m.step();
  const before = JSON.stringify(m.state);
  for (const id of ['start', 'pourNow', 'helper', 'cancel', 'nope']) {
    const r = m.dispatch(id);
    assert.equal(r.ok, false, id);
    assert.ok(r.reason, `${id} 要有原因`);
  }
  assert.equal(JSON.stringify(m.state), before);
});

// LP-05 改語義：前＝滿缸在院中 idle 等用水；後＝實存滿先去偏好活動（主角看山），用掉一擔後自己回院出發。
test('水缸滿了去看山，用掉一擔後自己回院出發', () => {
  const rules = { ...RULES, vatStart: RULES.vatCapacity, useEveryMs: 10000 };
  const m = createModel(LEN, rules);
  m.step();
  assert.equal(m.view().mode, 'toFun');
  assert.match(m.view().status, /看山/);
  runUntil(m, (v) => v.mode === 'carry');
  assert.equal(m.view().vat, RULES.vatCapacity - 1);
});

test('初始腳力影子用 Lv 1 速度走，永遠不產水', () => {
  const m = createModel(LEN, NO_USE);
  runUntil(m, (v) => v.trips === 1);
  m.step();
  assert.ok(m.view().shadow, '影子和主角一起出發');
  const vat = m.view().vat;
  // 第二趟主角 Lv2、影子 Lv1：主角倒完水時影子還在路上，水缸只多主角那一擔
  runUntil(m, (v) => v.trips === 2);
  assert.equal(m.view().vat, vat + 1);
  assert.ok(m.view().shadow, '影子還沒走完這一趟');
});

test('view() 只讀：重複呼叫不改狀態', () => {
  const m = createModel(LEN);
  for (let i = 0; i < 1234; i++) m.step();
  const before = JSON.stringify(m.state);
  for (let i = 0; i < 50; i++) { m.view(); m.actions(); }
  assert.equal(JSON.stringify(m.state), before);
});

test('雙人畫面幀率與分段不影響結果：60fps、144fps、不規則幀與 4 倍速得到同一世界', () => {
  const run = (frames, speed) => {
    const m = createLifeModel(LEN);
    const c = createClock();
    for (const dt of frames) { const n = c.feed(dt, speed); for (let i = 0; i < n; i++) m.step(); }
    return JSON.stringify(m.state);
  };
  const total = 120000; // 兩分鐘遊戲時間
  const even = (fps) => Array.from({ length: total / 1000 * fps }, () => 1000 / fps);
  const ragged = []; for (let t = 0, i = 0; t < total; i++) { const d = Math.min(total - t, [7, 33, 16, 50, 3][i % 5]); ragged.push(d); t += d; }
  const quarter = Array.from({ length: total / 4 / 25 }, () => 25);
  const a = run(even(60), 1);
  assert.equal(run(even(144), 1), a);
  assert.equal(run(ragged, 1), a);
  assert.equal(run(quarter, 4), a, '4 倍速 30 秒＝1 倍速 2 分鐘');
});

test('長空檔不追趕：一次 10 秒的空檔只算 250ms', () => {
  const c = createClock();
  assert.equal(c.feed(10000, 1), Math.floor(250 / STEP_MS + 1e-9));
});

test('兩人以不同起始腳力同時真移動，世界時間與用水只算一次', () => {
  const m = createLifeModel(LEN, NO_USE);
  for (let i = 0; i < 301; i++) m.step();
  const v = m.view();
  assert.equal(v.tick, 301);
  assert.equal(v.inFlight, 2);
  assert.equal(v.vat, NO_USE.vatStart, '路上不先產水');
  assert.equal(v.people.hero.initialLevel, 1);
  assert.equal(v.people.cousin.initialLevel, 3);
  assert.ok(v.people.cousin.phase.k > v.people.hero.phase.k, '同時出發／同時間，熟手走得更遠');
  assert.deepEqual(v.people.cousin.tripSpeeds, speedsFor(3));
  const before = JSON.stringify(m.state);
  for (let i = 0; i < 10; i++) { m.view(); m.actions('cousin'); }
  assert.equal(JSON.stringify(m.state), before, '讀取人物或選單不改世界');
  const full = createLifeModel(LEN, { ...RULES, vatStart: RULES.vatCapacity, drink: null });
  runUntil(full, (v) => v.inFlight > 0);
  assert.equal(full.view().vat, RULES.vatCapacity - 1, '兩人共用每60秒一擔用水，不每人扣一擔');
  assert.equal(full.view().inFlight, 1, '一擔空位只准一人出發');
});

test('兩人同刻倒完：各一次釋約／入帳／成長，滿缸不重複結算', () => {
  const rules = { ...NO_USE, vatStart: 0, vatCapacity: 2 };
  const m = createLifeModel(LEN, rules, [{ id: 'hero', initialLevel: 1 }, { id: 'cousin', initialLevel: 1 }]);
  m.step();
  assert.equal(m.view().inFlight, 2);
  runUntil(m, (v) => v.people.hero.trips === 1);
  const v = m.view(), credits = m.state.log.filter((x) => x.kind === 'trip');
  assert.equal(v.vat, 2); assert.equal(v.inFlight, 0);
  assert.equal(credits.length, 2); assert.equal(credits[0].tick, credits[1].tick);
  // LP-05：交付後滿缸，同一步去偏好活動（前：院中 idle）；仍不重複結算。
  for (const p of Object.values(v.people)) { assert.equal(p.trips, 1); assert.equal(p.level, 2); assert.equal(p.mode, 'toFun'); }
  for (let i = 0; i < 1000; i++) m.step();
  assert.equal(m.view().vat, 2); assert.equal(m.view().inFlight, 0);
  assert.equal(m.state.log.filter((x) => x.kind === 'trip').length, 2);
});

test('容量含在途預約：滿缸等待、用水續工，單一空位輪流出發不餓死另一人', () => {
  const rules = { ...RULES, vatStart: 1, vatCapacity: 1 };
  const m = createLifeModel(LEN, rules);
  m.step();
  assert.equal(m.view().inFlight, 0);
  assert.ok(Object.values(m.view().people).every((p) => p.mode === 'toFun'), 'LP-05：實存滿去休閒（前：院中等）');
  for (let i = 0; i < 30000; i++) {
    m.step();
    const v = m.view();
    assert.ok(v.vat >= 0 && v.inFlight >= 0 && v.vat + v.inFlight <= 1, '任何一步都沒有超額預約／丟水');
    assert.equal(v.inFlight, Object.values(v.people).filter((p) => p.mode === 'carry').length);
  }
  const v = m.view();
  assert.ok(v.people.hero.trips >= 2 && v.people.cousin.trips >= 2, '耗水後兩人都有後續工作');
  assert.ok(Math.abs(v.people.hero.trips - v.people.cousin.trips) <= 1);
});

test('對主角下休息與取消只改該人意圖；熟手繼續入帳，休息保留當趟預約至倒完', () => {
  const m = createLifeModel(LEN, NO_USE);
  m.step();
  const other = JSON.stringify(m.state.people.cousin);
  assert.equal(m.dispatch('restAfterTrip', 'hero').ok, true);
  assert.equal(JSON.stringify(m.state.people.cousin), other);
  assert.equal(m.view().inFlight, 2);
  runUntil(m, (v) => v.people.hero.resting);
  assert.equal(m.view().people.hero.trips, 1);
  assert.equal(m.view().inFlight, 1);
  runUntil(m, (v) => v.people.cousin.trips === 3);
  assert.equal(m.view().people.hero.trips, 1);
  assert.equal(m.dispatch('start', 'hero').ok, true);
  runUntil(m, (v) => v.people.hero.mode === 'carry');
  assert.equal(m.dispatch('restAfterTrip', 'hero').ok, true);
  assert.equal(m.dispatch('cancel', 'hero').ok, true);
  assert.equal(m.view().people.hero.mode, 'carry');
  assert.equal(m.view().inFlight, Object.values(m.view().people).filter((p) => p.mode === 'carry').length, '取消停工意圖不釋放工作預約（熟手此時可能在恢復）');
  const before = JSON.stringify(m.state);
  assert.equal(m.dispatch('start', 'missing').ok, false);
  assert.equal(m.dispatch('pourNow', 'cousin').ok, false);
  assert.equal(JSON.stringify(m.state), before, '拒絕指令不改預約或人物');
});

test('熟手也只在倒完才成長，當趟鎖腳力，下一趟採新速度', () => {
  const m = createLifeModel(LEN, NO_USE);
  runUntil(m, (v) => {
    const p = v.people.cousin;
    if (p.trips < 3 && p.mode === 'carry') { assert.equal(p.tripLevel, 3); assert.deepEqual(p.tripSpeeds, speedsFor(3)); }
    return p.trips === 3;
  });
  let p = m.view().people.cousin;
  assert.equal(p.level, 4); assert.equal(p.tripLevel, 4); assert.equal(p.lastTrip.level, 3);
  const third = p.lastTrip.seconds;
  runUntil(m, (v) => v.people.cousin.trips === 4);
  p = m.view().people.cousin;
  assert.equal(p.lastTrip.level, 4); assert.ok(p.lastTrip.seconds < third);
});

test('重建新局清除兩人的意圖、成長、在途預約及分配順序', () => {
  let m = createLifeModel(LEN);
  m.step(); m.dispatch('restAfterTrip', 'cousin');
  runUntil(m, (v) => v.people.hero.trips === 1);
  m = createLifeModel(LEN);
  const v = m.view();
  assert.equal(v.tick, 0); assert.equal(v.vat, RULES.vatStart); assert.equal(v.inFlight, 0);
  for (const p of Object.values(v.people)) {
    assert.equal(p.level, p.initialLevel); assert.equal(p.trips, 0); assert.equal(p.xp, 0);
    assert.equal(p.restOrder, false); assert.equal(p.resting, false); assert.equal(p.mode, 'idle');
  }
  m.step(); assert.equal(m.view().inFlight, 2);
});

// ---------- LP-03 採藥與工作切換 ----------
const ROUTES = { water: LEN, herb: 540 };
const sumLog = (m, job) => m.state.log.filter((x) => x.kind === 'trip' && x.job === job).length;
const conserved = (v) => {
  const carrying = (job) => Object.values(v.people).filter((p) => p.mode === 'carry' && p.job === job).length;
  assert.equal(v.inFlight, carrying('water'), '水的在途預約＝正在挑水的人數');
  assert.equal(v.herbInFlight, carrying('herb'), '藥的在途預約＝正在採藥的人數');
  assert.ok(v.herbs + v.herbInFlight <= v.herbCapacity, '藥架＋在途不超額');
};

test('途中改採藥：當趟挑水交付後才換；重複改令只留最新，可取消；不瞬移、不重複產出', () => {
  const m = createLifeModel(ROUTES, NO_USE);
  m.step();
  assert.equal(m.dispatch('work:herb', 'hero').ok, true);
  assert.equal(m.view().people.hero.pending, 'herb');
  assert.equal(m.dispatch('work:herb', 'hero').ok, false, '同一待執行不重下');
  assert.equal(m.dispatch('restAfterTrip', 'hero').ok, true);
  assert.equal(m.view().people.hero.pending, 'rest', '最新意圖取代');
  assert.equal(m.dispatch('work:water', 'hero').ok, true);
  assert.equal(m.view().people.hero.pending, null, '改回當趟工作＝取消待執行');
  m.dispatch('work:herb', 'hero');
  let prev = m.view();
  runUntil(m, (v) => {
    const h = v.people.hero;
    if (h.trips === 0) { assert.equal(h.job, 'water'); assert.equal(v.herbInFlight, 0); }
    conserved(v);
    prev = v;
    return h.trips === 1;
  });
  let h = m.view().people.hero;
  assert.equal(h.done.water, 1); assert.equal(h.done.herb, 0); assert.equal(h.pending, null);
  assert.equal(h.job, 'herb'); assert.equal(h.mode, 'carry', '交付同一步改採藥並出發');
  assert.equal(m.view().herbInFlight, 1);
  assert.equal(m.view().people.cousin.job, 'water', '熟手不受影響');
  runUntil(m, (v) => { conserved(v); return v.people.hero.trips === 2; });
  h = m.view().people.hero;
  assert.equal(m.view().herbs, 1); assert.equal(h.done.herb, 1);
  assert.equal(sumLog(m, 'herb'), 1); assert.equal(h.lastTrip.job, 'herb');
});

test('閒置或休息時改工作立即生效；本趟後休息獨立，另一人照做', () => {
  const m = createLifeModel(ROUTES, NO_USE);
  m.step();
  m.dispatch('restAfterTrip', 'hero');
  runUntil(m, (v) => v.people.hero.resting);
  const before = m.view();
  assert.equal(before.people.cousin.mode, 'carry');
  assert.equal(m.dispatch('work:herb', 'hero').ok, true);
  const v = m.view();
  assert.equal(v.people.hero.job, 'herb'); assert.equal(v.people.hero.resting, false);
  assert.equal(v.people.hero.mode, 'toSeat', 'LP-04：已進休息流程，先恢復至 80、返院才出發');
  runUntil(m, (x) => x.people.hero.mode === 'carry');
  assert.equal(m.view().people.hero.job, 'herb'); assert.equal(m.view().herbInFlight, 1);
  // 採藥途中下休息：交付後停工，入帳一次
  m.dispatch('restAfterTrip', 'hero');
  runUntil(m, (x) => x.people.hero.resting);
  assert.equal(m.view().herbs, 1); assert.equal(m.view().herbInFlight, 0);
  // 休息時可直接切回挑水
  assert.equal(m.dispatch('work:water', 'hero').ok, true);
  assert.equal(m.view().people.hero.job, 'water');
});

test('兩人不同工作同時進行：各自入帳／成長一次，容量與在途預約守恆，滿額清楚等待', () => {
  const m = createLifeModel(ROUTES, { ...NO_USE, herbCapacity: 2 });
  m.dispatch('work:herb', 'cousin');
  let last = m.view();
  runUntil(m, (v) => {
    conserved(v);
    for (const id of ['hero', 'cousin']) {
      const a = last.people[id], b = v.people[id];
      if (b.trips !== a.trips) {
        assert.equal(b.trips, a.trips + 1, '一次只完成一趟');
        const job = b.lastTrip.job;
        assert.equal(b.done[job], a.done[job] + 1);
        assert.equal(job === 'herb' ? v.herbs : v.vat, (job === 'herb' ? last.herbs : last.vat) + 1, '交付同一步入帳一次');
      }
    }
    last = v;
    return v.people.cousin.done.herb === 2 && v.people.hero.done.water >= 2;
  });
  for (let i = 0; i < 600; i++) m.step();
  const v = m.view();
  assert.equal(v.herbs, 2); assert.equal(v.herbInFlight, 0);
  assert.equal(v.people.cousin.mode, 'fun', 'LP-05：藥架實存滿，熟手去舒展筋骨（前：院中 idle）');
  assert.match(v.people.cousin.next, /藥架有空位就回去採藥/);
  assert.equal(sumLog(m, 'herb'), 2);
});

test('採藥完成整趟才成長，出發鎖能力，下一趟同路真的更快', () => {
  const m = createLifeModel(ROUTES, NO_USE, [{ id: 'hero', initialLevel: 1 }]);
  m.dispatch('work:herb', 'hero');
  runUntil(m, (v) => v.mode === 'carry' && v.job === 'herb' && v.phase.name === 'herbBack');
  assert.equal(m.view().level, 1);
  runUntil(m, (v) => v.trips === 1);
  const first = m.view().lastTrip;
  assert.equal(first.job, 'herb'); assert.equal(first.level, 1); assert.equal(m.view().level, 2);
  runUntil(m, (v) => v.trips === 2);
  const second = m.view().lastTrip;
  assert.equal(second.level, 2); assert.ok(second.seconds < first.seconds, `${second.seconds} < ${first.seconds}`);
  assert.equal(first.seconds, tripSteps(1, 540) * STEP_MS / 1000);
});

test('採藥時不同 render 頻率與播放倍率，在同一固定模擬時間結果一致；重來清意圖、藥架與預約', () => {
  const run = (frameMs, speed) => {
    const m = createLifeModel(ROUTES), c = createClock();
    m.dispatch('work:herb', 'cousin');
    let fed = 0;
    while (fed < 7200) { const n = Math.min(7200 - fed, c.feed(frameMs, speed)); for (let i = 0; i < n; i++) m.step(); fed += n; }
    return JSON.stringify(m.state);
  };
  const a = run(1000 / 60, 1);
  assert.equal(run(1000 / 30, 2), a); assert.equal(run(1000 / 144, 4), a); assert.equal(run(250, 1), a);
  const m = createLifeModel(ROUTES);
  const v = m.view();
  assert.equal(v.herbs, RULES.herbStart); assert.equal(v.herbInFlight, 0);
  for (const p of Object.values(v.people)) { assert.equal(p.job, 'water'); assert.equal(p.pending, null); }
});

// ---------- LP-03 補修：工作切換不瞬移（審查 P2） ----------
import { createRoutes } from '../demo/routes.mjs';
const SCENE = JSON.parse(readFileSync(new URL('../spikes/shared/scene.json', import.meta.url)));
const geo = createRoutes(SCENE.path.points);
const posOf = (p) => geo.of(p.id, p);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('兩條路共用院中端點：閒置、休息、交付、出發都在同一點', () => {
  const home = geo.place('idle', 0, 'water');
  for (const [ph, k, job] of [['idle', 0, 'herb'], ['rest', 0, 'herb'], ['rest', 0, 'water'], ['pour', 0.5, 'water'], ['herbDeliver', 0.5, 'herb'],
    ['down', 0, 'water'], ['herbOut', 0, 'herb'], ['up', 1, 'water'], ['herbBack', 1, 'herb']]) {
    assert.ok(dist(geo.place(ph, k, job), home) < 1e-9, `${ph}/${job} 應在院中端點`);
  }
});

test('逐 tick 位置連續：雙向切換、休息後改令、滿額閒置改令；暫停（不 step）下令位置不變', () => {
  // LP-05：藥架滿額時熟手會去休閒，模型路程長度須與畫面路線一致（含座位與休閒點），否則換算位置會跳。
  const m = createLifeModel({ water: SCENE.path.length, herb: geo.routes.herb.length, seat: geo.seatLengths, fun: geo.funLengths }, { ...RULES, herbCapacity: 2 });
  const maxStep = RULES.emptySpeed.cap * STEP_MS / 1000 + 1e-6;
  let prev = Object.fromEntries(Object.entries(m.view().people).map(([id, p]) => [id, posOf(p)]));
  const order = (cmd, id) => {
    const before = posOf(m.view().people[id]);
    m.dispatch(cmd, id);
    assert.ok(dist(posOf(m.view().people[id]), before) < 1e-9, `${id} 下 ${cmd} 當下（未推進）不移動`);
  };
  const script = [
    [1, () => order('work:herb', 'hero')],                     // 挑水途中改採藥（交付後生效）
    [2, () => order('restAfterTrip', 'cousin')],               // 熟手挑完休息
    [(v) => v.people.cousin.resting, () => order('work:herb', 'cousin')], // 休息時直接改採藥
    [(v) => v.people.hero.job === 'herb' && v.people.hero.done.herb >= 1, () => order('work:water', 'hero')], // 採藥途中改回挑水
    [(v) => v.herbs >= 2 && v.people.cousin.mode === 'fun', () => order('work:water', 'cousin')], // 藥架滿額、熟手在休閒時改挑水（LP-05 前為院中閒置）
  ];
  let i = 0;
  for (let t = 0; t < 60 * 60 * 6 && i < script.length; t++) {
    const v = m.view();
    const [when, act] = script[i];
    if (typeof when === 'number' ? v.tick >= when : when(v)) { act(); i++; }
    m.step();
    for (const [id, p] of Object.entries(m.view().people)) {
      const now = posOf(p);
      assert.ok(dist(now, prev[id]) <= maxStep, `${id} tick ${m.view().tick} 跳了 ${dist(now, prev[id]).toFixed(2)}（${p.job}/${p.phase?.name || p.mode}）`);
      prev[id] = now;
    }
  }
  assert.equal(i, script.length, '每個切換情境都有發生');
});

// ---------- LP-04 精力、可見休息與自主續工（#205） ----------
const E = RULES.energy, W = E.workPerSec * STEP_MS / 1000, U = E.restPerSec * STEP_MS / 1000;
const LIFE = { water: SCENE.path.length, herb: geo.routes.herb.length, seat: geo.seatLengths };
const hero = (m) => m.view().people.hero;

test('精力每 tick 只依步前活動計一次：工作扣、坐下回、走路與等待不變；交付與到座位的那步不雙算；clamp 0～100', () => {
  const m = createLifeModel(LIFE, NO_USE);
  let prev = m.view().people;
  assert.equal(prev.hero.energy, 100); assert.equal(prev.cousin.energy, 100);
  let sawSeat = 0, sawWalk = 0;
  runUntil(m, (v) => {
    for (const id of ['hero', 'cousin']) {
      const a = prev[id], b = v.people[id], d = b.energy - a.energy;
      if (v.tick === 0) continue;
      if (a.mode === 'carry') assert.ok(Math.abs(d + Math.min(W, a.energy)) < 1e-9, `${id} 工作步只扣一次`);
      else if (a.mode === 'seated') { sawSeat++; assert.ok(Math.abs(d - Math.min(U, 100 - a.energy)) < 1e-9, `${id} 坐下步只回一次`); }
      else { if (a.mode !== 'idle') sawWalk++; assert.equal(d, 0, `${id} ${a.mode} 不扣不回`); }
      assert.ok(b.energy >= 0 && b.energy <= 100);
    }
    prev = v.people;
    return v.people.hero.trips >= 4 && v.people.cousin.trips >= 5;
  });
  assert.ok(sawSeat > 0 && sawWalk > 0, '跑過坐下與往返');
  // 紙上節奏：主角兩趟挑水後 ≈26.78、熟手三趟 ≈4.35（只驗公式推算一致）
  const m2 = createLifeModel(LIFE, NO_USE);
  runUntil(m2, (v) => v.people.hero.mode === 'toSeat');
  assert.equal(hero(m2).trips, 2); assert.ok(Math.abs(hero(m2).energy - 26.78) < 0.02);
  runUntil(m2, (v) => v.people.cousin.mode === 'toSeat');
  assert.equal(m2.view().people.cousin.trips, 3); assert.ok(Math.abs(m2.view().people.cousin.energy - 4.35) < 0.02);
});

test('門檻：院中 30 去恢復、略高不去；坐下自主恢復一到 80 就起身，之前不走', () => {
  const rules = { ...RULES, vatStart: RULES.vatCapacity, useEveryMs: 1e12 };
  for (const [e, goes] of [[30, true], [30.01, false]]) {
    const m = createLifeModel(LIFE, rules, undefined, {}); // 不帶偏好：隔離 LP-04 院中門檻（有偏好時滿缸會去休閒）
    m.step();
    assert.equal(hero(m).mode, 'idle', '滿缸等待');
    m.state.people.hero.energy = e;
    m.step();
    assert.equal(hero(m).mode, goes ? 'toSeat' : 'idle', `精力 ${e}`);
    if (goes) { assert.equal(hero(m).rest, 'auto'); assert.equal(hero(m).energy, e, '走去不回'); }
  }
  const m = createLifeModel(LIFE, NO_USE);
  runUntil(m, (v) => v.people.hero.mode === 'seated');
  runUntil(m, (v) => {
    const h = v.people.hero;
    if (h.mode === 'seated') assert.ok(h.energy < E.backAt, '未到 80 不起身');
    return h.mode === 'back';
  });
  assert.ok(hero(m).energy >= E.backAt && hero(m).energy < E.backAt + U + 1e-9, '到 80 那步起身');
  assert.equal(hero(m).rest, null);
});

test('精力到 0 仍完整交付一次、釋約／成長一次，不搶開下一趟；休息不產出、不占預約，返院重查容量；兩人同時恢復不串狀態', () => {
  const m = createLifeModel(LIFE, { ...NO_USE, herbCapacity: 999 });
  runUntil(m, (v) => v.people.hero.mode === 'carry' && v.people.hero.phase.name === 'up');
  m.state.people.hero.energy = 0.5;
  m.dispatch('work:herb', 'hero'); // 改工作不能跳過必要恢復
  const before = hero(m);
  runUntil(m, (v) => v.people.hero.trips === before.trips + 1);
  let h = hero(m);
  assert.equal(h.energy, 0); assert.equal(h.mode, 'toSeat', '交付後去恢復，不另開一趟');
  assert.equal(h.job, 'herb'); assert.equal(h.pending, null); assert.equal(m.view().herbInFlight, 0);
  assert.equal(h.done.water, before.done.water + 1); assert.equal(m.state.log.filter((x) => x.kind === 'trip' && x.person === 'hero').length, before.trips + 1);
  assert.equal(m.view().inFlight, Object.values(m.view().people).filter((p) => p.mode === 'carry').length, '休息者不持有預約');
  // 兩人同時在座位；休息中不產出、不成長、不占預約
  m.state.people.cousin.energy = 0.2;
  runUntil(m, (v) => v.people.hero.mode === 'seated' && v.people.cousin.mode === 'seated');
  m.state.people.hero.energy = 10; m.state.people.cousin.energy = 20; // 讓兩人在觀察窗內都還坐著
  const snap = m.view();
  for (let i = 0; i < 120; i++) m.step();
  const v = m.view();
  for (const id of ['hero', 'cousin']) {
    assert.equal(v.people[id].trips, snap.people[id].trips); assert.equal(v.people[id].xp, snap.people[id].xp); assert.equal(v.people[id].level, snap.people[id].level);
    assert.ok(Math.abs(v.people[id].energy - snap.people[id].energy - 120 * U) < 1e-6, `${id} 各回各的`);
  }
  assert.equal(v.inFlight, 0); assert.equal(v.vat, snap.vat);
  // 返院到端點那一步才按最新工作（採藥）重查容量並預約出發
  runUntil(m, (x) => x.people.hero.mode === 'back');
  assert.equal(m.view().herbInFlight, 0, '返院途中不預約');
  runUntil(m, (x) => x.people.hero.mode !== 'back');
  h = hero(m);
  assert.equal(h.mode, 'carry'); assert.equal(h.job, 'herb'); assert.equal(m.view().herbInFlight, 1, '返院後按最新工作預約出發');
  // 返院時存放處已滿：明示等待，不強制改做別的
  const m3 = createLifeModel(LIFE, NO_USE, [{ id: 'hero', initialLevel: 1 }]);
  runUntil(m3, (x) => x.people.hero.mode === 'seated');
  m3.state.vat = NO_USE.vatCapacity; // 坐著時水缸被填滿（休息者本身不持有預約）
  runUntil(m3, (x) => x.people.hero.mode !== 'seated' && x.people.hero.mode !== 'back');
  // LP-05：返院時實存已滿不強制換工作，去偏好活動（前：院中 idle 等）
  assert.equal(hero(m3).mode, 'toFun'); assert.equal(hero(m3).job, 'water'); assert.match(hero(m3).status, /看山/);
});

test('自主轉手動停工、回滿仍停；低精力時下令開始先恢復到 80；返院途中叫停回座位、再開始覆蓋；取消不能抹掉停工', () => {
  const m = createLifeModel(LIFE, NO_USE);
  runUntil(m, (v) => v.people.hero.mode === 'toSeat');
  assert.equal(hero(m).rest, 'auto'); assert.equal(hero(m).next, '恢復至 80 後返回挑水');
  assert.equal(m.dispatch('work:herb', 'hero').ok, true, '自主恢復中改工作只更新種類');
  assert.equal(hero(m).rest, 'auto'); assert.equal(hero(m).job, 'herb'); assert.equal(hero(m).mode, 'toSeat');
  assert.equal(m.dispatch('restAfterTrip', 'hero').ok, true, '自主途中叫停');
  assert.equal(hero(m).rest, 'manual'); assert.equal(hero(m).mode, 'toSeat', '繼續走到座位');
  assert.equal(m.dispatch('cancel', 'hero').ok, false, '已生效的停工不能用取消解除');
  runUntil(m, (v) => v.people.hero.energy === 100);
  for (let i = 0; i < 600; i++) m.step();
  assert.equal(hero(m).mode, 'seated'); assert.equal(hero(m).resting, true); assert.match(hero(m).status, /已停工，需下令開始/);
  // 低精力時解除停工：強制回到 50 驗「先恢復到 80」
  m.state.people.hero.energy = 50;
  assert.equal(m.dispatch('start', 'hero').ok, true);
  assert.equal(hero(m).rest, 'auto'); assert.equal(hero(m).mode, 'seated', '下令當下不移動');
  runUntil(m, (v) => v.people.hero.mode === 'back');
  assert.ok(hero(m).energy >= 80);
  // 返院途中叫停：走完這段回座位；再開始覆蓋舊停工，最後只做最新工作
  m.dispatch('restAfterTrip', 'hero');
  assert.equal(hero(m).mode, 'back'); assert.match(hero(m).next, /回座位停工/);
  assert.equal(m.dispatch('work:water', 'hero').ok, true);
  assert.equal(hero(m).rest, null);
  runUntil(m, (v) => v.people.hero.mode !== 'back');
  assert.equal(hero(m).mode, 'carry'); assert.equal(hero(m).job, 'water');
  // 返院途中叫停且不再改令：回座位停工
  const m2 = createLifeModel(LIFE, NO_USE);
  runUntil(m2, (v) => v.people.hero.mode === 'back');
  m2.dispatch('restAfterTrip', 'hero');
  runUntil(m2, (v) => v.people.hero.mode !== 'back');
  assert.equal(hero(m2).mode, 'toSeat'); assert.equal(hero(m2).rest, 'manual');
  // 庫存滿也不解除停工
  m2.state.vat = 0;
  for (let i = 0; i < 3000; i++) m2.step();
  assert.equal(hero(m2).mode, 'seated'); assert.equal(hero(m2).rest, 'manual');
});

test('休息往返逐 tick 連續、速度受出發時空手速度限制；暫停（不 step）改令位置／精力不動', () => {
  const m = createLifeModel(LIFE, NO_USE);
  const maxStep = RULES.emptySpeed.cap * STEP_MS / 1000 + 1e-6;
  let prev = Object.fromEntries(Object.entries(m.view().people).map(([id, p]) => [id, posOf(p)]));
  const order = (cmd, id) => {
    const b = m.view().people[id], before = posOf(b);
    m.dispatch(cmd, id);
    const a = m.view().people[id];
    assert.ok(dist(posOf(a), before) < 1e-9, `${id} 下 ${cmd} 當下不移動`);
    assert.equal(a.energy, b.energy, '下令不改精力');
  };
  const script = [
    [(v) => v.people.hero.mode === 'toSeat' && v.people.hero.restLeg.k > 0.4, () => order('work:herb', 'hero')],
    [(v) => v.people.hero.mode === 'seated', () => order('restAfterTrip', 'hero')],
    [(v) => v.people.hero.energy >= 90, () => order('start', 'hero')],
    [(v) => v.people.cousin.mode === 'back' && v.people.cousin.restLeg.k > 0.5, () => order('restAfterTrip', 'cousin')],
    [(v) => v.people.cousin.mode === 'toSeat' && v.people.cousin.restLeg.k > 0.3, () => order('work:herb', 'cousin')],
    [(v) => v.people.hero.mode === 'carry' && v.people.hero.job === 'herb', () => order('restAfterTrip', 'hero')],
  ];
  let i = 0;
  for (let t = 0; t < 60 * 60 * 8 && i < script.length; t++) {
    const v = m.view();
    if (script[i][0](v)) { script[i][1](); i++; }
    m.step();
    for (const [id, p] of Object.entries(m.view().people)) {
      const now = posOf(p);
      assert.ok(dist(now, prev[id]) <= maxStep, `${id} tick ${m.view().tick} 跳了 ${dist(now, prev[id]).toFixed(2)}（${p.mode}/${p.phase?.name || ''}）`);
      prev[id] = now;
    }
  }
  assert.equal(i, script.length, '每個情境都有發生');
  // 座位與端點：走完去程在座位、走完回程在共同院中端點
  const home = geo.place('idle', 0, 'water');
  for (const id of ['hero', 'cousin']) {
    assert.ok(dist(geo.of(id, { mode: 'toSeat', restLeg: { k: 0 } }), home) < 1e-9);
    assert.ok(dist(geo.of(id, { mode: 'back', restLeg: { k: 1 } }), home) < 1e-9);
    assert.ok(dist(geo.of(id, { mode: 'seated' }), geo.of(id, { mode: 'toSeat', restLeg: { k: 1 } })) < 1e-9);
  }
  assert.ok(dist(geo.of('hero', { mode: 'seated' }), geo.of('cousin', { mode: 'seated' })) > 20, '兩個固定座位分開');
});

test('含休息循環時不同 render 分段／1、2、4 倍得同一世界；新局清精力／來源／路程／意圖／預約', () => {
  const run = (frameMs, speed) => {
    const m = createLifeModel(LIFE), c = createClock();
    let fed = 0;
    while (fed < 60 * 200) {
      const n = Math.min(60 * 200 - fed, c.feed(frameMs, speed));
      for (let i = 0; i < n; i++) { m.step(); if (m.state.tick === 4000) m.dispatch('restAfterTrip', 'cousin'); }
      fed += n;
    }
    return m;
  };
  const a = run(1000 / 60, 1);
  assert.ok(a.state.log.some((x) => x.kind === 'seated'), '分段區間內真的跑過休息');
  const ref = JSON.stringify(a.state);
  assert.equal(JSON.stringify(run(1000 / 30, 2).state), ref); assert.equal(JSON.stringify(run(1000 / 144, 4).state), ref); assert.equal(JSON.stringify(run(250, 1).state), ref);
  const v = createLifeModel(LIFE).view();
  assert.equal(v.vat, RULES.vatStart); assert.equal(v.herbs, RULES.herbStart); assert.equal(v.inFlight + v.herbInFlight, 0);
  for (const p of Object.values(v.people)) {
    assert.equal(p.energy, 100); assert.equal(p.rest, null); assert.equal(p.restLeg, null); assert.equal(p.pending, null);
    assert.equal(p.mode, 'idle'); assert.equal(p.job, 'water'); assert.equal(p.level, p.initialLevel);
  }
});

// ---------- LP-05 滿庫後的偏好休閒與玩家叫回（#208） ----------
const FUNL = { ...LIFE, fun: geo.funLengths };
const FULLV = { ...RULES, vatStart: RULES.vatCapacity, useEveryMs: 1e12 }; // 開局實存滿、不用水
const who = (m, id) => m.view().people[id];
const MODES_FUN = ['toFun', 'fun', 'fromFun'];

test('啟動與優先：實存滿才去、僅在途滿留院中；低精力先恢復；停工不去玩；可工作先工作；兩人不同偏好、不每 tick 重啟', () => {
  // 僅在途占滿：1 空位被同伴預約，另一人院中明示等，不去玩；同伴交付後實存滿，兩人各去偏好點
  const m = createLifeModel(FUNL, { ...NO_USE, vatCapacity: 2, vatStart: 1 });
  m.step();
  const waiting = Object.values(m.view().people).find((p) => p.mode !== 'carry');
  assert.equal(waiting.mode, 'idle'); assert.match(waiting.next, /有人在補位/);
  runUntil(m, (v) => v.vat === 2);
  m.step();
  assert.deepEqual(Object.values(m.view().people).map((p) => p.mode), ['toFun', 'toFun']);
  const kinds = m.state.log.filter((x) => x.kind === 'toFun');
  assert.deepEqual(kinds.map((x) => [x.person, x.fun]).sort(), [['cousin', 'stretch'], ['hero', 'view']]);
  for (let i = 0; i < 3000; i++) m.step();
  assert.equal(m.state.log.filter((x) => x.kind === 'toFun').length, 2, '持續休閒期間不重啟路程或活動');
  assert.deepEqual(Object.values(m.view().people).map((p) => p.mode), ['fun', 'fun']);
  // 低精力先沿 LP-04 恢復，回到院中才去休閒
  const m2 = createLifeModel(FUNL, FULLV);
  m2.state.people.hero.energy = 20;
  m2.step();
  assert.equal(who(m2, 'hero').mode, 'toSeat'); assert.equal(who(m2, 'cousin').mode, 'toFun');
  runUntil(m2, (v) => v.people.hero.mode === 'back');
  runUntil(m2, (v) => v.people.hero.mode !== 'back');
  assert.equal(who(m2, 'hero').mode, 'toFun'); assert.ok(who(m2, 'hero').energy >= E.backAt);
  // 玩家停工：坐到 100 也不去玩
  const m3 = createLifeModel(FUNL, FULLV);
  m3.dispatch('restAfterTrip', 'hero');
  for (let i = 0; i < 60 * 60; i++) { m3.step(); assert.ok(!MODES_FUN.includes(who(m3, 'hero').mode), '停工不去休閒'); }
  assert.equal(who(m3, 'hero').mode, 'seated'); assert.equal(who(m3, 'hero').energy, 100);
  // 有合法容量就工作：未滿的工作不會去休閒
  const m4 = createLifeModel(FUNL, NO_USE);
  for (let i = 0; i < 60 * 60; i++) { m4.step(); assert.ok(Object.values(m4.view().people).every((p) => !p.leisure)); }
});

test('守恆：休閒往返與活動不改精力、產出、XP、趟次或預約；不佔容量', () => {
  const m = createLifeModel(FUNL, FULLV);
  m.state.people.hero.energy = 55.5; m.state.people.cousin.energy = 40.25;
  m.step();
  const a = m.view();
  runUntil(m, (v) => v.people.hero.mode === 'fun' && v.people.cousin.mode === 'fun');
  for (let i = 0; i < 1200; i++) m.step();
  const b = m.view();
  assert.equal(b.vat, a.vat); assert.equal(b.inFlight, 0); assert.equal(b.herbs, a.herbs); assert.equal(b.herbInFlight, 0);
  for (const id of ['hero', 'cousin']) {
    for (const k of ['energy', 'trips', 'xp', 'level']) assert.equal(b.people[id][k], a.people[id][k], `${id} ${k}`);
    assert.deepEqual(b.people[id].done, a.people[id].done);
  }
  assert.equal(m.state.log.filter((x) => x.kind === 'trip').length, 0);
});

test('意圖與控制：叫回滿庫待命至返院後一趟完成；改工作留最新；恢復自主只解叫回；停工仍需明確開始；兩人互不串', () => {
  const m = createLifeModel(FUNL, { ...FULLV, herbStart: RULES.herbCapacity }); // 水、藥都滿
  runUntil(m, (v) => v.people.hero.mode === 'fun' && v.people.cousin.mode === 'fun');
  assert.ok(m.dispatch('recall', 'hero').ok);
  assert.equal(who(m, 'hero').recall, true); assert.equal(who(m, 'cousin').recall, false);
  assert.equal(m.dispatch('cancel', 'hero').ok, false, '取消待執行不能抹掉叫回');
  m.step();
  assert.equal(who(m, 'hero').mode, 'fromFun', '活動點下一 tick 起身');
  runUntil(m, (v) => v.people.hero.mode !== 'fromFun');
  let h = who(m, 'hero');
  assert.equal(h.mode, 'idle'); assert.match(h.status, /玩家叫回，等水缸空位/); assert.match(h.next, /恢復自主/);
  for (let i = 0; i < 1200; i++) m.step();
  assert.equal(who(m, 'hero').mode, 'idle', '叫回待命不去玩、不自動換工作'); assert.equal(who(m, 'hero').job, 'water');
  assert.equal(who(m, 'cousin').mode, 'fun', '同伴繼續生活');
  // 恢復自主只清叫回：滿庫下一決策點就回去休閒
  assert.ok(m.dispatch('resume', 'hero').ok); m.step();
  assert.equal(who(m, 'hero').recall, false); assert.equal(who(m, 'hero').mode, 'toFun');
  // 去程中改工作＝叫回並換最新工作：走完這段才回，不瞬移；水還滿，改採藥後藥架騰空才出發
  m.dispatch('work:herb', 'hero');
  h = who(m, 'hero');
  assert.equal(h.job, 'herb'); assert.equal(h.recall, true);
  const need = m.state.people.hero.motion.need, left = need - m.state.people.hero.motion.steps;
  for (let i = 0; i < left - 1; i++) { m.step(); assert.equal(who(m, 'hero').mode, 'toFun', '走完去程'); }
  m.step(); assert.equal(who(m, 'hero').mode, 'fromFun');
  runUntil(m, (v) => v.people.hero.mode === 'idle');
  assert.match(who(m, 'hero').status, /玩家叫回，等藥架空位/);
  m.state.herbs = RULES.herbCapacity - 1; // 藥架騰出一格（藥草沒有用途，這裡只模擬容量開放）
  m.step();
  assert.equal(who(m, 'hero').mode, 'carry'); assert.equal(who(m, 'hero').job, 'herb'); assert.equal(who(m, 'hero').recall, true, '出發不等於解除');
  runUntil(m, (v) => v.people.hero.trips === 1);
  assert.equal(who(m, 'hero').recall, false, '返院後新開始的一趟完成才解除');
  assert.ok(m.state.log.some((x) => x.kind === 'recallDone' && x.person === 'hero'));
  // 停工：活動中叫停→返院→座位，回滿仍停；恢復自主不可用；明確開始才解除
  const m2 = createLifeModel(FUNL, FULLV);
  runUntil(m2, (v) => v.people.cousin.mode === 'fun');
  m2.dispatch('restAfterTrip', 'cousin');
  assert.equal(m2.actions('cousin').find((a) => a.id === 'recall').enabled, false);
  runUntil(m2, (v) => v.people.cousin.mode === 'seated');
  for (let i = 0; i < 60 * 30; i++) m2.step();
  assert.equal(who(m2, 'cousin').mode, 'seated'); assert.equal(who(m2, 'cousin').energy, 100);
  assert.ok(m2.dispatch('start', 'cousin').ok);
  runUntil(m2, (v) => v.people.cousin.mode !== 'seated' && v.people.cousin.mode !== 'back');
  assert.equal(who(m2, 'cousin').mode, 'toFun', '解除停工後滿庫照常去休閒');
  // 去程中叫停：走完去程→返院→座位（不從休閒點跳去石凳）
  m2.dispatch('restAfterTrip', 'cousin');
  assert.equal(who(m2, 'cousin').mode, 'toFun');
  runUntil(m2, (v) => v.people.cousin.mode !== 'toFun');
  assert.equal(who(m2, 'cousin').mode, 'fromFun');
  runUntil(m2, (v) => v.people.cousin.mode !== 'fromFun');
  assert.equal(who(m2, 'cousin').mode, 'toSeat');
});

// 審查 P2：休閒中停工後，精力未到 80 時明確開始／改工作，仍須返院後先沿 LP-04 恢復到 80，不能直接出發。
test('休閒中停工後低精力重啟：去程／活動點／返程都走完本段→返院→座位恢復到 80→做最新工作；位置連續、收益守恆', () => {
  const legs = [
    ['toFun', (p) => p.mode === 'toFun' && p.funLeg.k > 0.3, 'start'],
    ['fun', (p) => p.mode === 'fun', 'work:herb'],
    ['fromFun', (p) => p.mode === 'fromFun' && p.funLeg.k > 0.3, 'start'],
  ];
  for (const [leg, at, restart] of legs) {
    const m = createLifeModel(FUNL, { ...FULLV, useEveryMs: 20000, drink: null }); // 開局滿缸，之後照常用水讓工作有容量
    m.state.people.hero.energy = 45.25; // 主角帶著 30<E<80 去看山
    if (leg === 'fromFun') { runUntil(m, (v) => v.people.hero.mode === 'fun'); m.dispatch('recall', 'hero'); }
    runUntil(m, (v) => at(v.people.hero));
    const before = m.view();
    m.dispatch('restAfterTrip', 'hero');
    assert.equal(who(m, 'hero').rest, 'manual');
    const r = m.dispatch(restart, 'hero');
    assert.ok(r.ok, `${leg} ${restart}`);
    let h = who(m, 'hero');
    assert.equal(h.rest, 'auto', `${leg}：解除停工但精力未到 80，轉為自主恢復`); assert.equal(h.recall, true);
    assert.equal(h.mode, before.people.hero.mode, '下令當下不換段'); assert.ok(dist(posOf(h), posOf(before.people.hero)) < 1e-9); assert.equal(h.energy, 45.25);
    assert.match(h.next, /先去座位恢復至 80/);
    const want = restart === 'work:herb' ? 'herb' : 'water';
    let prev = posOf(h), path = [h.mode];
    runUntil(m, (v) => {
      const p = v.people.hero;
      assert.ok(dist(posOf(p), prev) <= RULES.emptySpeed.cap * STEP_MS / 1000 + 1e-6, `${leg} 連續`); prev = posOf(p);
      if (path.at(-1) !== p.mode) path.push(p.mode);
      if (p.mode === 'carry') assert.ok(p.energy >= E.backAt - W * 2, `${leg} 出發前已恢復到 80（${p.energy.toFixed(2)}）`);
      return p.mode === 'carry';
    });
    h = who(m, 'hero');
    const exp = leg === 'toFun' ? ['toFun', 'fromFun', 'idle', 'toSeat', 'seated', 'back', 'carry'] : leg === 'fun' ? ['fun', 'fromFun', 'idle', 'toSeat', 'seated', 'back', 'carry'] : ['fromFun', 'idle', 'toSeat', 'seated', 'back', 'carry'];
    assert.deepEqual(path.filter((x) => x !== 'idle'), exp.filter((x) => x !== 'idle'), `${leg} 路徑 ${path.join('→')}`);
    assert.equal(h.job, want); assert.equal(h.trips, before.people.hero.trips); assert.deepEqual(h.done, before.people.hero.done, '休閒／恢復不產出');
    assert.equal(h.recall, true, '叫回到返院後一趟完成才解除');
  }
});

// 審查 P2（第二輪）：低精力停工→開始後再按「恢復自主」，只清叫回；待恢復仍要走完本段→返院→座位到 80，不能卡在活動點。
test('休閒中停工→開始／改工作→恢復自主：叫回解除但必要恢復照走，不卡活動點、不跳過 80', () => {
  const legs = [['toFun', (p) => p.mode === 'toFun' && p.funLeg.k > 0.3, 'start'], ['fun', (p) => p.mode === 'fun', 'work:herb']];
  for (const [leg, at, restart] of legs) {
    const m = createLifeModel(FUNL, { ...FULLV, useEveryMs: 20000 });
    m.state.people.hero.energy = 45.25;
    runUntil(m, (v) => at(v.people.hero));
    const before = m.view();
    m.dispatch('restAfterTrip', 'hero');
    assert.ok(m.dispatch(restart, 'hero').ok);
    const r = m.dispatch('resume', 'hero');
    assert.ok(r.ok); assert.match(r.text, /先恢復到 80/);
    let h = who(m, 'hero');
    assert.equal(h.recall, false, '恢復自主清叫回'); assert.equal(h.rest, 'auto', '不清必要恢復');
    assert.equal(h.mode, before.people.hero.mode); assert.ok(dist(posOf(h), posOf(before.people.hero)) < 1e-9); assert.equal(h.energy, 45.25);
    assert.match(h.next, /先去座位恢復至 80/);
    let prev = posOf(h), path = [h.mode];
    runUntil(m, (v) => {
      const p = v.people.hero;
      assert.ok(dist(posOf(p), prev) <= RULES.emptySpeed.cap * STEP_MS / 1000 + 1e-6, `${leg} 連續`); prev = posOf(p);
      if (path.at(-1) !== p.mode) path.push(p.mode);
      if (p.mode === 'back') assert.ok(p.energy >= E.backAt, `${leg} 起身前已恢復到 80（${p.energy.toFixed(2)}）`);
      return path.includes('back') && p.mode !== 'back' && p.mode !== 'idle';
    }, 60000); // 卡在活動點會在這裡逾時
    // 恢復後叫回已解除，回院中照自主規則重評：有空位就出發，仍滿就再去休閒（不是被叫回待命）
    const after = path.pop();
    assert.deepEqual(path.filter((x) => x !== 'idle'), [leg, 'fromFun', 'toSeat', 'seated', 'back'], `${leg} 路徑 ${path.join('→')}`);
    assert.ok(after === 'carry' || after === 'toFun', `${leg} 恢復後自主：${after}`);
    h = who(m, 'hero');
    assert.equal(h.recall, false); assert.equal(h.rest, null);
    assert.equal(h.job, restart === 'work:herb' ? 'herb' : 'water', '保留最新工作');
    assert.equal(h.trips, before.people.hero.trips); assert.deepEqual(h.done, before.people.hero.done, '休閒／恢復不產出');
  }
});

test('路程與容量：逐 tick 連續、受出發空手速度上限；暫停改令不動；單一空位只回輪到的人、不超額、不餓死', () => {
  const m = createLifeModel(FUNL, { ...RULES, vatStart: RULES.vatCapacity, useEveryMs: 20000, drink: null });
  const lim = (id) => speedsFor(m.state.people[id].motion.tripLevel).empty * STEP_MS / 1000 + 1e-6;
  let prev = Object.fromEntries(Object.entries(m.view().people).map(([id, p]) => [id, posOf(p)]));
  const order = (cmd, id) => { const b = posOf(who(m, id)), e = who(m, id).energy; m.dispatch(cmd, id); assert.ok(dist(posOf(who(m, id)), b) < 1e-9); assert.equal(who(m, id).energy, e); };
  const script = [
    [(v) => v.people.hero.mode === 'toFun' && v.people.hero.funLeg.k > 0.4, () => order('recall', 'hero')],
    [(v) => v.people.hero.mode === 'idle' && v.people.hero.recall, () => order('resume', 'hero')],
    [(v) => v.people.hero.mode === 'fun', () => order('work:herb', 'hero')],
    [(v) => v.people.cousin.mode === 'fun', () => order('restAfterTrip', 'cousin')],
    [(v) => v.people.cousin.mode === 'seated', () => order('work:water', 'cousin')],
  ];
  let i = 0;
  for (let t = 0; t < 60 * 60 * 8; t++) {
    const v = m.view();
    if (i < script.length && script[i][0](v)) { script[i][1](); i++; }
    m.step();
    const w = m.view();
    assert.ok(w.vat + w.inFlight <= w.vatCapacity && w.inFlight >= 0 && w.herbs + w.herbInFlight <= w.herbCapacity, '不超額');
    assert.equal(w.inFlight, Object.values(w.people).filter((p) => p.mode === 'carry' && p.phase && JOBS_WATER.has(p.phase.name)).length);
    for (const [id, p] of Object.entries(w.people)) {
      const now = posOf(p), d = dist(now, prev[id]);
      if (p.leisure) assert.ok(d <= lim(id), `${id} tick ${w.tick} 休閒路程跳 ${d.toFixed(2)}`);
      else assert.ok(d <= RULES.emptySpeed.cap * STEP_MS / 1000 + 1e-6, `${id} tick ${w.tick} 跳 ${d.toFixed(2)}`);
      prev[id] = now;
    }
  }
  assert.equal(i, script.length, '每個介入情境都有發生');
  // 單一空位：只輪到的人回去，另一人留在活動點；長跑兩人都有後續工作、不餓死
  const m2 = createLifeModel(FUNL, { ...RULES, vatStart: 1, vatCapacity: 1, useEveryMs: 20000, drink: null });
  let bothLeft = 0;
  for (let t = 0; t < 60 * 60 * 20; t++) {
    m2.step();
    const v = m2.view();
    assert.ok(v.vat + v.inFlight <= 1);
    if (Object.values(v.people).every((p) => p.mode === 'fromFun')) bothLeft++;
  }
  const v = m2.view();
  assert.equal(bothLeft, 0, '一個空位不叫兩人一起跑回來');
  assert.ok(v.people.hero.trips >= 3 && v.people.cousin.trips >= 3, `兩人都有後續工作 ${v.people.hero.trips}/${v.people.cousin.trips}`);
  assert.ok(Math.abs(v.people.hero.trips - v.people.cousin.trips) <= 1, '輪流');
});
const JOBS_WATER = new Set(['down', 'dip', 'up', 'pour']);

test('單一時間與新局：含休閒／叫回時分段與 1、2、4× 得同一世界；新局清休閒路程／叫回', () => {
  const run = (frameMs, speed) => {
    const m = createLifeModel(FUNL), c = createClock();
    let fed = 0;
    while (fed < 60 * 480) {
      const n = Math.min(60 * 480 - fed, c.feed(frameMs, speed));
      for (let i = 0; i < n; i++) {
        m.step();
        // 世界時間決定的事件：第一次有人在活動點時叫回他，3000 步後恢復自主（各分段都在同一 tick 發生）
        if (!m.recallAt) for (const id of ['hero', 'cousin']) if (m.state.people[id].motion.mode === 'fun') { m.dispatch('recall', id); m.recallAt = [m.state.tick, id]; break; }
        if (m.recallAt && m.state.tick === m.recallAt[0] + 3000) m.dispatch('resume', m.recallAt[1]);
      }
      fed += n;
    }
    return m;
  };
  const a = run(1000 / 60, 1);
  assert.ok(a.state.log.some((x) => x.kind === 'fun') && a.state.log.some((x) => x.kind === 'recall'), '區間內真的有休閒與叫回');
  const ref = JSON.stringify([a.state, a.recallAt]);
  for (const [f, s] of [[1000 / 30, 2], [1000 / 144, 4], [250, 1]]) { const b = run(f, s); assert.equal(JSON.stringify([b.state, b.recallAt]), ref); }
  const v = createLifeModel(FUNL).view();
  for (const p of Object.values(v.people)) { assert.equal(p.recall, false); assert.equal(p.leisure, false); assert.equal(p.funLeg, null); assert.equal(p.mode, 'idle'); }
  assert.equal(v.vat, 3); assert.equal(v.herbs, 0);
});

test('畫面換算：休閒往返從院中端點出發、活動點分開且不與石凳混淆', () => {
  const home = geo.place('idle', 0, 'water');
  for (const id of ['hero', 'cousin']) {
    assert.ok(dist(geo.of(id, { mode: 'toFun', funLeg: { k: 0 } }), home) < 1e-9);
    assert.ok(dist(geo.of(id, { mode: 'fromFun', funLeg: { k: 1 } }), home) < 1e-9);
    assert.ok(dist(geo.of(id, { mode: 'fun' }), geo.of(id, { mode: 'seated' })) > 80, `${id} 活動點離座位夠遠`);
  }
  assert.ok(dist(geo.of('hero', { mode: 'fun' }), geo.of('cousin', { mode: 'fun' })) > 200);
});
