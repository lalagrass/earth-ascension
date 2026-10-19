'use strict';
// SG-RT-02V：唯讀 viewer 的播放控制器與畫面資料。牆鐘用假時間餵，世界一律和直接呼叫 advanceTicks 的結果比對。
const test = require('node:test');
const assert = require('node:assert/strict');
const Realtime = require('../js/realtime.js');
const Rules = require('../js/rules.js');
const StoryData = require('../js/story-data.js');
const Controller = require('../viewer/controller.js');
const View = require('../viewer/view.js');

const SEED = 'rt-dev-000';
const HORIZON = Rules.OBSERVATION_TICKS;
const deps = { Rules, StoryData };

// 參考推進：和 rt-auto-replay 一樣，突破停住批次後把剩下的 tick 繼續跑完。
function drive(n, seed = SEED) {
  let world = Realtime.createWorld(seed).state;
  let left = n;
  while (left > 0) {
    const r = Realtime.advanceTicks(world, left);
    assert.equal(r.ok, true);
    assert.notEqual(r.stopReason, 'error');
    world = r.state;
    left -= r.advancedTicks;
  }
  return world;
}

const reference = new Map();
function refWorld(n) {
  if (!reference.has(n)) reference.set(n, drive(n));
  return reference.get(n);
}
function refHash(n) {
  return Realtime.hashWorld(refWorld(n));
}

function started(speed = 1, realtime = Realtime) {
  const ctl = Controller.createController(realtime);
  assert.equal(ctl.prepare(SEED).ok, true);
  assert.equal(ctl.setSpeed(speed), true);
  assert.equal(ctl.start(), true);
  return ctl;
}

// 以固定間隔餵幀，回傳總共推進的 tick。
function run(ctl, fromMs, toMs, stepMs) {
  let ticks = 0;
  for (let t = fromMs; t <= toMs; t += stepMs) ticks += ctl.frame(t);
  return ticks;
}

function deepFreeze(v) {
  if (v && typeof v === 'object') {
    Object.freeze(v);
    for (const k of Object.keys(v)) deepFreeze(v[k]);
  }
  return v;
}

test('1×／2×／4× 每秒分別餵 4／8／16 tick', () => {
  for (const [speed, want] of [[1, 4], [2, 8], [4, 16]]) {
    const ctl = started(speed);
    assert.equal(run(ctl, 0, 1000, 50), want, `${speed}×`);
    assert.equal(ctl.world.clock.tick, want);
  }
  assert.deepEqual(Controller.SPEEDS, [1, 2, 4]);
  assert.equal(Controller.TICKS_PER_SECOND, 4);
});

test('不合法倍速不改設定', () => {
  const ctl = started(2);
  for (const bad of [0, 3, 8, '2', null]) assert.equal(ctl.setSpeed(bad), false);
  assert.equal(ctl.speed, 2);
});

test('倍速只改每幀餵量：同一 tick 的世界 hash 與 rng 和直接推進相同', () => {
  const slow = started(1);
  run(slow, 0, 75000, 50); // 75 秒 × 4 = 300 tick
  assert.equal(slow.world.clock.tick, 300);
  assert.equal(Realtime.hashWorld(slow.world), refHash(300));

  // 4× 用不整除 250 ms 的幀距，每幀的 tick 數在 1、2 之間變動；跑過第一次突破（固定 seed 在 tick 1176 前後）。
  const FAST = 1300;
  const fast = started(4);
  let now = 0;
  while (fast.world.clock.tick < FAST) {
    now += 70;
    fast.frame(now);
  }
  // 最後一幀可能略超過目標，參考也推同樣的 tick 再比較。
  const at = fast.world.clock.tick;
  assert.ok(at >= FAST && at < FAST + 4);
  assert.ok(fast.snapshot().totals.breakthroughStops >= 1);
  assert.equal(Realtime.hashWorld(fast.world), refHash(at));
  assert.deepEqual(fast.world.rngState, refWorld(at).rngState);

  const bulk = started(1);
  assert.equal(bulk.advance(HORIZON), HORIZON);
  assert.equal(Realtime.hashWorld(bulk.world), refHash(HORIZON));
});

test('breakthroughResolved 只結束 API 批次：剩下的 tick 照算，不多不少，也不停播', () => {
  const ctl = started(1);
  assert.equal(ctl.advance(HORIZON), HORIZON);
  const s = ctl.snapshot();
  assert.equal(s.mode, 'playing');
  assert.equal(s.world.clock.tick, HORIZON);
  assert.ok(s.totals.breakthroughStops >= 1, '固定 seed 在觀察期內至少有一次突破');
  assert.equal(s.totals.batches, s.totals.breakthroughStops + 1);
  assert.equal(s.lastStep.stops.filter((x) => x === 'breakthroughResolved').length, s.totals.breakthroughStops);
  assert.ok(s.world.eventLog.some((e) => e.type === 'breakthroughResolved'));
  assert.ok(s.world.eventLog.some((e) => e.tick >= 2520), '跨過第 14 天邊界後世界仍繼續');
  // 跨界後還能繼續播放。
  assert.equal(run(ctl, 0, 1000, 50), 4);
  assert.equal(ctl.world.clock.tick, HORIZON + 4);
});

test('開始前、暫停中與 render 都不推進世界', () => {
  const ctl = Controller.createController(Realtime);
  assert.equal(ctl.prepare(SEED).ok, true);
  assert.equal(run(ctl, 0, 5000, 50), 0, '開始前不推進');
  assert.equal(ctl.world.clock.tick, 0);
  ctl.start();
  run(ctl, 0, 2000, 50);
  assert.equal(ctl.pause(), true);
  const before = ctl.world;
  const hash = Realtime.hashWorld(before);
  assert.equal(run(ctl, 2000, 60000, 50), 0);
  assert.equal(ctl.world, before);
  // render 用的資料只讀世界：凍結後照樣可以描述，hash 不變。
  const model = View.describe(deepFreeze(JSON.parse(JSON.stringify(before))), deps);
  assert.equal(model.clock.tick, before.clock.tick);
  View.describe(before, deps);
  assert.equal(Realtime.hashWorld(ctl.world), hash);
});

test('背景自動暫停並丟掉待補時間；回前景仍暫停，恢復後不追趕離線時長', () => {
  const ctl = started(1);
  run(ctl, 0, 1000, 50); // 4 tick
  ctl.frame(1200); // 累積 200 ms，還不到一個 tick
  assert.equal(ctl.world.clock.tick, 4);
  assert.equal(ctl.hide(), true);
  let s = ctl.snapshot();
  assert.equal(s.mode, 'paused');
  assert.equal(s.autoPaused, true);
  // 背景期間與回前景後都不推進。
  assert.equal(run(ctl, 1250, 120000, 1000), 0);
  assert.equal(ctl.world.clock.tick, 4);
  assert.equal(ctl.resume(), true);
  s = ctl.snapshot();
  assert.equal(s.autoPaused, false);
  // 恢復後的第一幀只建立時間基準；之前的 200 ms 與離線時長都不補。
  assert.equal(ctl.frame(600000), 0);
  assert.equal(ctl.frame(600200), 0);
  assert.equal(ctl.frame(600250), 1);
  assert.equal(ctl.world.clock.tick, 5);
  // 已暫停時再進背景，不會被標成自動暫停。
  ctl.pause();
  assert.equal(ctl.hide(), false);
  assert.equal(ctl.snapshot().autoPaused, false);
});

test('播放中單幀空檔過長時只計入上限，不一次補一大批 tick', () => {
  const ctl = started(4);
  ctl.frame(0);
  const got = ctl.frame(30000);
  assert.equal(got, Math.floor((Controller.MAX_FRAME_MS * 4) / 250));
  assert.equal(ctl.world.clock.tick, got);
});

// 假引擎：推到 failAt 這個 tick 時失敗。和正式 advanceTicks 一樣，advancedTicks 只算失敗前已提交的 tick；
// 回傳的 state 故意帶著失敗 tick 的改動（時鐘多一格、資源被改），控制器不能採用。
function failingAt(failAt) {
  let calls = 0;
  const api = Object.assign({}, Realtime, {
    advanceTicks(world, n) {
      calls += 1;
      const t = world.clock.tick;
      if (t + n <= failAt) return Realtime.advanceTicks(world, n);
      let state = world;
      let done = 0;
      while (state.clock.tick < failAt) {
        const r = Realtime.advanceTicks(state, failAt - state.clock.tick);
        state = r.state;
        done += r.advancedTicks;
      }
      const dirty = JSON.parse(JSON.stringify(state));
      dirty.clock.tick += 1;
      dirty.resources.spiritMaterial += 99;
      return { ok: true, state: dirty, events: [], advancedTicks: done, stopReason: 'error', error: { code: 'invalid_world', reason: '測試注入' } };
    },
  });
  return { api, calls: () => calls };
}

test('批次中途出錯：保留已提交的成功前綴，停在最後合法 tick，不採用失敗 tick 的狀態', () => {
  const fake = failingAt(2);
  const ctl = started(1, fake.api);
  assert.equal(ctl.advance(4), 2, '要求 4 tick，前 2 tick 已提交');
  const s = ctl.snapshot();
  assert.equal(s.mode, 'error');
  assert.equal(s.world.clock.tick, 2);
  assert.equal(Realtime.hashWorld(s.world), refHash(2), '停在成功前綴，和直接推進 2 tick 相同');
  assert.deepEqual(s.error, { code: 'invalid_world', reason: '測試注入', kind: 'failed', committedTicks: 2, tick: 2 });
  assert.equal(s.totals.ticks, 2);
  assert.deepEqual(s.lastStep, { requested: 4, advanced: 2, stops: ['completed'] });
  // 出錯後不再推進，也不能繼續播放。
  const before = fake.calls();
  assert.equal(run(ctl, 0, 5000, 50), 0);
  assert.equal(ctl.advance(5), 0);
  assert.equal(ctl.toggle(), false);
  assert.equal(fake.calls(), before);
});

test('批次中途出錯也能跨過突破停批：前綴裡的 breakthroughResolved 照常續推', () => {
  // rt-dev-000 第一次突破停在 tick 1176；在它之後幾個 tick 失敗，前綴要跨過那次停批。
  const failAt = 1180;
  const fake = failingAt(failAt);
  const ctl = started(1, fake.api);
  assert.equal(ctl.advance(1100), 1100);
  assert.equal(ctl.advance(200), failAt - 1100);
  const s = ctl.snapshot();
  assert.equal(s.world.clock.tick, failAt);
  assert.equal(Realtime.hashWorld(s.world), refHash(failAt));
  assert.equal(s.error.committedTicks, failAt - 1100);
  assert.ok(s.lastStep.stops.includes('breakthroughResolved'));
});

test('出錯在批次第一個 tick，或引擎直接拒絕：世界都不動，錯誤標明種類', () => {
  const ctl = started(1, failingAt(0).api);
  assert.equal(ctl.advance(3), 0);
  let s = ctl.snapshot();
  assert.equal(s.world.clock.tick, 0);
  assert.equal(Realtime.hashWorld(s.world), refHash(0));
  assert.equal(s.error.kind, 'failed');
  assert.equal(s.error.committedTicks, 0);

  const rejecting = Object.assign({}, Realtime, { advanceTicks: () => ({ ok: false, code: 'bad_ticks', reason: '拒絕' }) });
  const ctl2 = started(1, rejecting);
  const world = ctl2.world;
  assert.equal(ctl2.advance(3), 0);
  s = ctl2.snapshot();
  assert.equal(s.world, world);
  assert.deepEqual(s.error, { code: 'bad_ticks', reason: '拒絕', kind: 'rejected', committedTicks: 0, tick: 0 });
});

test('不合法 seed 不建立世界，也不能開始', () => {
  const ctl = Controller.createController(Realtime);
  const r = ctl.prepare('');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'bad_seed');
  assert.equal(ctl.start(), false);
});

test('畫面資料：開局政策與目標可見，剛空出來的人顯示待決策，等待原因取自世界', () => {
  const ctl = Controller.createController(Realtime);
  ctl.prepare(SEED);
  const opening = View.describe(ctl.world, deps);
  assert.deepEqual(Object.fromEntries(opening.policy.map((p) => [p.key, p.value])), Realtime.DEFAULT_POLICY);
  assert.deepEqual(opening.goals.map((g) => g.id), ctl.world.goals.map((g) => g.id));
  assert.equal(opening.people.length, ctl.world.disciples.length);
  assert.deepEqual(opening.people.map((p) => p.id), [ctl.world.masterId, ctl.world.protagonistId], '學徒入隊前不在世界裡');

  ctl.start();
  let decide = null;
  let travel = null;
  while (ctl.world.clock.tick < HORIZON && !(decide && travel)) {
    ctl.advance(1);
    const m = View.describe(ctl.world, deps);
    for (const p of m.people) {
      const d = ctl.world.disciples.find((x) => x.id === p.id);
      if (!decide && p.status.kind === 'decide') {
        assert.equal(d.activityId, null);
        assert.equal(d.autonomy.wait, null);
        decide = ctl.world.clock.tick;
      }
      if (!travel && p.status.kind === 'activity' && p.status.status === '移動中') travel = ctl.world.clock.tick;
    }
  }
  assert.ok(decide !== null, '觀察期內應出現待決策');
  assert.ok(travel !== null, '觀察期內應出現移動');

  const end = View.describe(refWorld(HORIZON), deps);
  const waits = end.people.filter((p) => p.status.kind === 'wait');
  assert.ok(waits.length > 0);
  for (const p of waits) assert.ok(Object.prototype.hasOwnProperty.call(View.WAIT_LABELS, p.status.code), p.status.code);
  assert.ok(end.facilities.some((f) => f.done));
  assert.ok(end.events.length > 0 && end.events[0].seq === end.eventCount);
  for (const e of end.events) assert.ok(e.text.length > 0);
  // 地圖：5×5 加村口欄，人物都落在某一格。
  assert.equal(end.map.length, Rules.MAP_SIZE);
  for (const row of end.map) assert.equal(row.length, Rules.MAP_SIZE + 1);
  const placed = end.map.flat().flatMap((c) => c.people || []);
  assert.deepEqual(placed.sort(), end.people.filter((p) => p.joined).map((p) => p.id).sort());
});

// SG-RT-03a：保存點只在幀末依實際推進範圍通知，不切批次。
test('保存點：跨日看推進範圍、突破停批續推後、播放中暫停或轉背景；load 保持暫停', () => {
  assert.equal(Controller.TICKS_PER_DAY, Rules.TICKS_PER_DAY);
  const calls = [];
  const ctl = Controller.createController(Realtime, { onSavePoint: (reasons) => calls.push({ tick: ctl.world.clock.tick, reasons }) });
  assert.equal(ctl.load(refWorld(170)).ok, true);
  assert.equal(ctl.mode, 'paused');
  assert.equal(ctl.world.clock.tick, 170);
  assert.deepEqual(calls, [], 'load 不觸發保存');

  ctl.advance(15); // 170 → 185：跨過 180，落點不是 180
  assert.deepEqual(calls.pop(), { tick: 185, reasons: ['day'] });
  assert.equal(Realtime.hashWorld(ctl.world), refHash(185), '保存點不改變推進');
  ctl.advance(10); // 185 → 195：沒有跨日
  assert.deepEqual(calls, []);
  ctl.load(refWorld(356));
  ctl.advance(4); // 356 → 360：落點剛好是日界
  assert.deepEqual(calls.pop(), { tick: 360, reasons: ['day'] });

  ctl.load(refWorld(1170));
  ctl.advance(10); // 1176 突破停批，同一幀續推到 1180 後才通知
  assert.deepEqual(calls.pop(), { tick: 1180, reasons: ['breakthrough'] });
  assert.equal(Realtime.hashWorld(ctl.world), refHash(1180));

  assert.equal(ctl.resume(), true);
  assert.equal(ctl.pause(), true);
  assert.deepEqual(calls.pop(), { tick: 1180, reasons: ['pause'] });
  assert.equal(ctl.pause(), false);
  assert.equal(ctl.hide(), false);
  assert.deepEqual(calls, [], '已暫停時再暫停或轉背景不重複通知');
  ctl.resume();
  assert.equal(ctl.hide(), true);
  assert.deepEqual(calls.pop(), { tick: 1180, reasons: ['pause'] });

  const bad = ctl.load({ not: 'a world' });
  assert.equal(bad.ok, false);
  assert.equal(ctl.world.clock.tick, 1180, '不合法的世界不替換');
});

test('保存點：批次中途出錯時只在成功前綴跨日才通知，世界是最後合法 tick', () => {
  const calls = [];
  const failing = {
    createWorld: Realtime.createWorld,
    validateWorld: Realtime.validateWorld,
    advanceTicks(world, n) {
      const target = 182;
      if (world.clock.tick + n <= target) return Realtime.advanceTicks(world, n);
      const ok = Realtime.advanceTicks(world, target - world.clock.tick);
      return { ok: true, state: ok.state, events: [], advancedTicks: target - world.clock.tick, stopReason: 'error', error: { code: 'boom', reason: 'x' } };
    },
  };
  const ctl = Controller.createController(failing, { onSavePoint: (reasons) => calls.push({ tick: ctl.world.clock.tick, reasons }) });
  ctl.load(refWorld(176));
  ctl.advance(10);
  assert.equal(ctl.mode, 'error');
  assert.equal(ctl.world.clock.tick, 182);
  assert.deepEqual(calls, [{ tick: 182, reasons: ['day'] }]);
  assert.equal(Realtime.hashWorld(ctl.world), refHash(182));
});
