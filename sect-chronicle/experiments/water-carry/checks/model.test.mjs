// V3 展示模型的局部反例。用法（在 experiments/water-carry 下）：node --test checks/model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel as createLifeModel, createClock, tripSteps, speedsFor, RULES, STEP_MS } from '../demo/model.mjs';

// 保留原一人基線的反例，明確指定單人；預設新局與下方共享容量反例使用雙人。
const createModel = (len, rules) => createLifeModel(len, rules, [{ id: 'hero', initialLevel: 1 }]);

const LEN = JSON.parse(readFileSync(new URL('../spikes/shared/scene.json', import.meta.url))).path.length;
const runUntil = (m, pred, limit = 1e6) => { for (let i = 0; i < limit; i++) { if (pred(m.view())) return; m.step(); } throw new Error('沒有等到條件'); };
// 不讓道館用水干擾的規則（水缸夠大、不用水）
const NO_USE = { ...RULES, vatCapacity: 999, useEveryMs: 1e12 };

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

test('水缸滿了在道館等用水，用掉一擔後自己出發', () => {
  const rules = { ...RULES, vatStart: RULES.vatCapacity, useEveryMs: 10000 };
  const m = createModel(LEN, rules);
  m.step();
  assert.equal(m.view().mode, 'idle');
  assert.match(m.view().status, /水缸已滿/);
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
  const full = createLifeModel(LEN, { ...RULES, vatStart: RULES.vatCapacity });
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
  for (const p of Object.values(v.people)) { assert.equal(p.trips, 1); assert.equal(p.level, 2); assert.equal(p.mode, 'idle'); }
  for (let i = 0; i < 1000; i++) m.step();
  assert.equal(m.view().vat, 2); assert.equal(m.view().inFlight, 0);
  assert.equal(m.state.log.filter((x) => x.kind === 'trip').length, 2);
});

test('容量含在途預約：滿缸等待、用水續工，單一空位輪流出發不餓死另一人', () => {
  const rules = { ...RULES, vatStart: 1, vatCapacity: 1 };
  const m = createLifeModel(LEN, rules);
  m.step();
  assert.equal(m.view().inFlight, 0);
  assert.ok(Object.values(m.view().people).every((p) => /水缸已滿/.test(p.status)));
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
  assert.equal(v.people.cousin.mode, 'idle');
  assert.match(v.people.cousin.status, /藥架已滿/);
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
  const m = createLifeModel({ water: SCENE.path.length, herb: geo.routes.herb.length }, { ...RULES, herbCapacity: 2 });
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
    [(v) => v.herbs >= 2 && v.people.cousin.mode === 'idle', () => order('work:water', 'cousin')], // 藥架滿額閒置時改挑水
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
    const m = createLifeModel(LIFE, rules);
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
  assert.equal(hero(m3).mode, 'idle'); assert.equal(hero(m3).job, 'water'); assert.match(hero(m3).status, /水缸已滿/);
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
