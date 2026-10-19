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

test('advanceTicks 出錯時停在上一個合法世界並顯示錯誤，不再推進', () => {
  let calls = 0;
  const broken = Object.assign({}, Realtime, {
    advanceTicks(world, n) {
      calls += 1;
      if (calls < 3) return Realtime.advanceTicks(world, n);
      const r = Realtime.advanceTicks(world, 1);
      return Object.assign({}, r, { stopReason: 'error', error: { code: 'invalid_world', reason: '測試注入' } });
    },
  });
  const ctl = started(1, broken);
  assert.equal(ctl.advance(10), 10);
  assert.equal(ctl.advance(10), 10);
  const last = ctl.world;
  assert.equal(ctl.advance(10), 0);
  const s = ctl.snapshot();
  assert.equal(s.mode, 'error');
  assert.equal(s.world, last, '出錯那一批的狀態不採用');
  assert.deepEqual(s.error, { code: 'invalid_world', reason: '測試注入', tick: 20 });
  assert.equal(run(ctl, 0, 5000, 50), 0);
  assert.equal(ctl.toggle(), false);
  assert.equal(ctl.advance(5), 0);

  const rejecting = Object.assign({}, Realtime, { advanceTicks: () => ({ ok: false, code: 'bad_ticks', reason: '拒絕' }) });
  const ctl2 = started(1, rejecting);
  assert.equal(ctl2.advance(3), 0);
  assert.equal(ctl2.snapshot().error.code, 'bad_ticks');
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
