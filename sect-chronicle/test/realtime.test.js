'use strict';
// SG-RT-01：即時世界、移動、工作與存檔。預期時間由 STEP_TICKS 與單位長度手算，不看 RNG 回推。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Realtime = require('../js/realtime.js');
const Rules = require('../js/rules.js');
const State = require('../js/state.js');
const Engine = require('../js/engine.js');
const Commands = require('../js/commands.js');
const Progression = require('../js/progression.js');
const Rng = require('../js/rng.js');
const Smoke = require('../tools/smoke.js');
const Replay = require('../tools/rt-replay.js');

const PID = State.PROTAGONIST_ID;
const MID = State.MASTER_ID;
const PILL = 'breakthrough-pill';
const canon = (v) => State.canonicalize(v);
const clone = (v) => JSON.parse(JSON.stringify(v));
const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
};
const hero = (w) => w.disciples.find((d) => d.id === PID);
const activity = (w, id) => w.activities.find((a) => a.id === id);

function world(seed = 'rt-unit') {
  const created = Realtime.createWorld(seed);
  assert.equal(created.ok, true, created.reason);
  return created.state;
}

function dispatch(w, type, payload, id) {
  return Realtime.dispatch(w, {
    id: id || `c-${w.commandLog.length + 1}-${type}`,
    type,
    expectedRevision: w.revision,
    payload,
  });
}

function must(w, type, payload, id) {
  const result = dispatch(w, type, payload, id);
  assert.equal(result.ok, true, `${type} ${result.code || ''} ${result.reason || ''} @${w.clock.tick}`);
  return result.state;
}

function advance(w, n) {
  const result = Realtime.advanceTicks(w, n);
  assert.equal(result.ok, true, result.reason);
  assert.notEqual(result.stopReason, 'error', result.error && result.error.reason);
  return result;
}

function order(w, kind, target, units, extra, id) {
  return must(w, 'orderActivity', Object.assign({ discipleId: PID, kind, target, units }, extra || {}), id);
}

function untilIdle(w, limit = 8000) {
  let guard = 0;
  while (hero(w).activityId || hero(w).manualOrder) {
    assert.ok(++guard < limit, `活動沒有結束，tick ${w.clock.tick}`);
    const step = advance(w, 1);
    w = step.state;
    if (step.stopReason === 'breakthroughResolved') break;
  }
  return w;
}

function runOrder(w, kind, target, units, extra) {
  return untilIdle(order(w, kind, target, units, extra));
}

let richCache = null;
function richWorld() {
  if (richCache) return clone(richCache);
  let w = world('rt-rich');
  w = runOrder(w, 'gather-material', { tileId: 't-0-0' }, 6);
  assert.ok(w.resources.spiritMaterial >= 12, '六次採集應夠蓋丹房');
  w = runOrder(w, 'build', { facilityType: 'alchemyRoom', tileId: 't-0-1' }, 3);
  assert.ok(w.clock.tick >= 540, '丹房完工時靈草已解鎖');
  let herbs = 0;
  while (w.resources.spiritHerb < 6) {
    herbs += 1;
    assert.ok(herbs < 6, '靈草採不夠');
    w = runOrder(w, 'gather-herb', { tileId: 't-2-0' }, 2);
  }
  while (hero(w).cultivation < 100) {
    const d = hero(w);
    if (d.stamina < 40) w = runOrder(w, 'rest', {}, 1);
    else {
      const gain = Rules.cultivationGainAtEq({
        slotEq: Math.floor(w.clock.tick / 60),
        comprehension: d.attributes.comprehension,
        stamina: d.stamina,
        mind: d.mind,
        injury: d.injury,
      }).gain;
      if (d.cultivation + gain >= 100) break;
      w = runOrder(w, 'cultivate', {}, 1);
    }
  }
  assert.ok(hero(w).cultivation < 100, '應停在還差一個修行單位就滿的狀態');
  richCache = clone(w);
  return clone(w);
}

test('新 RT 世界是 life-rt／schema 5／rule 4，沒有 slot 欄位，建局不消耗 RNG', () => {
  const w = world('rt-dev-000');
  assert.equal(w.schemaVersion, 5);
  assert.equal(w.ruleVersion, 4);
  assert.equal(w.rngVersion, 1);
  assert.equal(w.scenarioId, 'life-rt');
  assert.equal(Rules.RULE_VERSION, 3);
  assert.deepEqual(w.clock, { tick: 0 });
  assert.equal(w.revision, 0);
  assert.deepEqual(w.rngState, Rng.create('rt-dev-000'));
  assert.equal(Object.hasOwn(w, 'slotIndex'), false);
  assert.equal(Object.hasOwn(w, 'jobs'), false);
  assert.equal(w.story.organisationStatus, 'dojo');
  assert.deepEqual(w.story.breakthroughAsks, {});
  assert.deepEqual(w.pendingEvents, []);
  assert.equal(hero(w).templateId, 'dojo-apprentice');
  assert.deepEqual(hero(w).pos, { r: 2, c: 2 });
  assert.equal(Realtime.createWorld('').code, 'bad_seed');
  const opts = deepFreeze({
    templateId: 'herb-child',
    allocation: { rootBone: 1, comprehension: 1, craft: 1 },
    personality: { risk: 'bold', bond: 'caring' },
  });
  const custom = Realtime.createWorld('herb', opts);
  assert.equal(custom.ok, true, custom.reason);
  assert.equal(hero(custom.state).attributes.craft, 5);
  assert.equal(canon(opts), canon({
    templateId: 'herb-child', allocation: { rootBone: 1, comprehension: 1, craft: 1 }, personality: { risk: 'bold', bond: 'caring' },
  }));
});

test('路徑先行後列，村口只經 (2,0)', () => {
  const fromDojo = Realtime.pathBetween({ r: 2, c: 2 }, { r: 0, c: 0 });
  assert.deepEqual(fromDojo, [{ r: 1, c: 2 }, { r: 0, c: 2 }, { r: 0, c: 1 }, { r: 0, c: 0 }]);
  assert.equal(fromDojo.length * Rules.STEP_TICKS, 24);
  assert.deepEqual(Realtime.pathBetween({ r: 2, c: 1 }, Rules.VILLAGE_GATE), [{ r: 2, c: 0 }, { r: 2, c: -1 }]);
  assert.deepEqual(Realtime.pathBetween(Rules.VILLAGE_GATE, { r: 2, c: 2 }), [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }]);
  assert.deepEqual(Realtime.pathBetween({ r: 2, c: 2 }, { r: 2, c: 2 }), []);
});

test('暫停接受指令且零推進；拒絕、衝突與過期 revision 都不改世界', () => {
  const w = world();
  const before = canon(w);
  const ordered = dispatch(w, 'orderActivity', { discipleId: PID, kind: 'rest', target: {}, units: 1 });
  assert.equal(ordered.ok, true, ordered.reason);
  assert.equal(ordered.state.clock.tick, 0);
  assert.equal(ordered.state.revision, 1);
  assert.deepEqual(ordered.state.rngState, w.rngState);
  assert.equal(canon(w), before);
  const again = dispatch(ordered.state, 'orderActivity', { discipleId: PID, kind: 'rest', target: {}, units: 1 }, 'c-1-orderActivity');
  assert.equal(again.duplicate, true);
  assert.equal(again.state.revision, 1);
  const conflict = dispatch(ordered.state, 'orderActivity', { discipleId: PID, kind: 'rest', target: {}, units: 2 }, 'c-1-orderActivity');
  assert.equal(conflict.code, 'command_id_conflict');
  const omitted = dispatch(w, 'orderActivity', { discipleId: PID, kind: 'breakthrough', target: {}, units: 1 });
  assert.equal(omitted.code, 'bad_payload');
  const stale = Realtime.dispatch(ordered.state, {
    id: 'later', type: 'setPolicy', expectedRevision: 0, payload: { policy: Realtime.DEFAULT_POLICY },
  });
  assert.equal(stale.code, 'stale_revision');
  const ahead = dispatch(w, 'setGoals', { goals: [] }, 'ahead');
  assert.equal(ahead.ok, true, ahead.reason);
  const future = Realtime.dispatch(w, { id: 'future', type: 'setGoals', expectedRevision: 9, payload: { goals: [] } });
  assert.equal(future.code, 'revision_ahead');
  for (const result of [conflict, omitted, stale, future]) assert.equal(result.ok, false);
  assert.equal(canon(w), before);
  assert.equal(canon(ordered.state), canon(again.state));
  const badN = Realtime.advanceTicks(deepFreeze(clone(ordered.state)), 0);
  assert.equal(badN.code, 'bad_ticks');
});

test('目標與政策只保存；不自動開工，非法值不改世界', () => {
  let w = world();
  const before = canon(w);
  const bad = dispatch(w, 'setPolicy', { policy: Object.assign({}, Realtime.DEFAULT_POLICY, { breakthrough: 'never' }) });
  assert.equal(bad.code, 'bad_policy');
  assert.equal(canon(w), before);
  w = must(w, 'setGoals', { goals: [{ id: 'only-aid', kind: 'aid' }] });
  assert.equal(w.goalsRevision, 1);
  w = must(w, 'setPolicy', { policy: Replay.CUSTOM_POLICY });
  assert.equal(w.policy.breakthrough, 'off');
  const moved = advance(w, 5);
  assert.equal(moved.state.clock.tick, 5);
  assert.equal(hero(moved.state).activityId, null);
  assert.equal(moved.state.activities.length, 0);
  assert.equal(w.clock.tick, 0);
});

test('缺欄、固定工期、鎖定與非主角都拒絕，且不改輸入', () => {
  const w = deepFreeze(world());
  const before = canon(w);
  const cases = [
    [{ discipleId: PID, kind: 'build', target: { facilityType: 'alchemyRoom', tileId: 't-0-1' } }, 'bad_payload'],
    [{ discipleId: PID, kind: 'gather-herb', target: { tileId: 't-2-0' }, units: 1 }, 'blocked'],
    [{ discipleId: PID, kind: 'aid', target: { optionId: 'free' }, units: 1 }, 'blocked'],
    [{ discipleId: PID, kind: 'brew', target: { recipeId: 'breakthrough-pill' }, units: 2 }, 'facility_not_ready'],
    [{ discipleId: PID, kind: 'build', target: { facilityType: 'alchemyRoom', tileId: 't-0-0' }, units: 3 }, 'not_buildable'],
    [{ discipleId: MID, kind: 'rest', target: {}, units: 1 }, 'not_protagonist'],
    [{ discipleId: PID, kind: 'breakthrough', target: {}, units: 1, usePill: false, supporterId: null }, 'not_ready'],
  ];
  for (const [payload, code] of cases) {
    const result = dispatch(w, 'orderActivity', payload);
    assert.equal(result.ok, false, JSON.stringify(payload));
    assert.equal(result.code, code, result.reason);
  }
  assert.equal(canon(w), before);
  assert.equal(dispatch(w, 'cancelManualOrder', { discipleId: PID }).code, 'no_manual_order');
});

test('材料不足的建造被接受，開工時落敗並轉成一次休養，資源與 RNG 不變', () => {
  const w = world();
  const rng = clone(w.rngState);
  const ordered = order(w, 'build', { facilityType: 'alchemyRoom', tileId: 't-0-1' }, 3);
  assert.equal(ordered.clock.tick, 0);
  assert.equal(hero(ordered).manualOrder.kind, 'build');
  const step = advance(ordered, 1);
  const live = step.state;
  const act = activity(live, hero(live).activityId);
  assert.equal(act.kind, 'rest');
  assert.deepEqual(act.fallback, { from: 'build', reason: 'insufficient_resource' });
  assert.equal(hero(live).manualOrder.kind, 'build');
  assert.deepEqual(live.resources, w.resources);
  assert.equal(live.inventory[PILL], 0);
  assert.deepEqual(live.rngState, rng);
  assert.equal(live.clock.tick, 1);
});

test('兩人爭工作位、參與者與資源時，落敗者帶休養備案', () => {
  const seat = Realtime.arbitrateDepartures({
    requests: [
      { id: 'slow', discipleId: PID, kind: 'gather-material', waited: 0, cost: {}, seats: { 'gather:t-0-0': 1 }, participants: [PID] },
      { id: 'fast', discipleId: MID, kind: 'gather-material', waited: 3, cost: {}, seats: { 'gather:t-0-0': 1 }, participants: [MID] },
    ],
    resources: { spiritMaterial: 0 },
    seats: { 'gather:t-0-0': 1 },
  });
  assert.deepEqual(seat.granted, ['fast']);
  assert.equal(seat.denied[0].code, 'no_seat');
  assert.deepEqual(seat.denied[0].fallback, { kind: 'rest', from: 'gather-material', reason: 'no_seat' });
  const people = Realtime.arbitrateDepartures({
    requests: [
      { id: 'a', discipleId: PID, kind: 'breakthrough', waited: 1, cost: { pills: 1 }, seats: {}, participants: [PID, MID] },
      { id: 'b', discipleId: 'disc-other', kind: 'breakthrough', waited: 0, cost: { pills: 1 }, seats: {}, participants: ['disc-other', MID] },
    ],
    resources: { pills: 1 },
    seats: {},
  });
  assert.deepEqual(people.granted, ['a']);
  assert.equal(people.denied[0].code, 'participant_busy');
  assert.equal(people.remaining.resources.pills, 0);
});

test('趕路取消在步邊界退回材料；可中斷的半個單位不產出', () => {
  let w = runOrder(world('rt-cancel'), 'gather-material', { tileId: 't-0-0' }, 6);
  const packed = w.resources.spiritMaterial;
  assert.ok(packed >= 12);
  w = order(w, 'build', { facilityType: 'alchemyRoom', tileId: 't-0-2' }, 3);
  w = advance(w, 1).state;
  assert.equal(activity(w, hero(w).activityId).status, 'traveling');
  assert.equal(w.resources.spiritMaterial, packed - 12);
  w = must(w, 'cancelManualOrder', { discipleId: PID });
  let guard = 0;
  while (w.activities.some((a) => a.kind === 'build' && a.status === 'traveling')) {
    assert.ok(++guard < 8);
    w = advance(w, 1).state;
  }
  const built = w.activities.find((a) => a.kind === 'build');
  assert.equal(built.status, 'cancelled');
  assert.equal(built.refunded, true);
  assert.equal(w.resources.spiritMaterial, packed);
  assert.deepEqual(hero(w).pos, { r: 0, c: 1 });
  let fresh = order(world('rt-partial'), 'gather-material', { tileId: 't-0-0' }, 6);
  fresh = advance(fresh, 100).state;
  // 趕路 24 tick，工作從 clock 24 起；clock 100 時已完成 1 單位（起始體力 100、技藝 3 → 3）。
  assert.equal(fresh.resources.spiritMaterial, 3);
  fresh = must(fresh, 'cancelManualOrder', { discipleId: PID });
  fresh = advance(fresh, 1).state;
  assert.equal(fresh.resources.spiritMaterial, 3);
  const gather = fresh.activities.filter((a) => a.kind === 'gather-material').pop();
  assert.equal(gather.status, 'done');
  assert.equal(gather.units, 1);
  assert.equal(hero(fresh).activityId, null);
});

test('普通活動可覆寫趕路；已經開工的承諾取消只放開手動鎖', () => {
  let w = order(world('rt-overwrite'), 'gather-material', { tileId: 't-0-0' }, 2);
  w = advance(w, 1).state;
  w = order(w, 'rest', {}, 1);
  let guard = 0;
  while (!w.activities.some((a) => a.kind === 'rest')) {
    assert.ok(++guard < 10);
    w = advance(w, 1).state;
  }
  assert.equal(w.activities.find((a) => a.kind === 'gather-material').status, 'cancelled');
  assert.equal(w.resources.spiritMaterial, 0);
  w = runOrder(world('rt-promise'), 'gather-material', { tileId: 't-0-0' }, 6);
  const packed = w.resources.spiritMaterial;
  w = order(w, 'build', { facilityType: 'alchemyRoom', tileId: 't-0-1' }, 3);
  guard = 0;
  while (!w.activities.some((a) => a.kind === 'build' && a.status === 'working' && a.workTicks > 0)) {
    assert.ok(++guard < 20);
    w = advance(w, 1).state;
  }
  const spent = w.resources.spiritMaterial;
  assert.equal(spent, packed - 12);
  w = must(w, 'cancelManualOrder', { discipleId: PID });
  assert.equal(hero(w).manualOrder, null);
  assert.equal(w.activities.find((a) => a.kind === 'build').status, 'working');
  w = untilIdle(w);
  assert.equal(w.resources.spiritMaterial, spent);
  assert.ok(w.activities.some((a) => a.kind === 'build' && a.status === 'done'));
});

test('空窗推進 2700 tick 跨過第 14 日，沒有危機或結局', () => {
  const idle = advance(world('rt-idle'), 2700);
  assert.equal(idle.stopReason, 'completed');
  assert.equal(idle.advancedTicks, 2700);
  assert.equal(idle.state.clock.tick, 2700);
  assert.equal(idle.state.revision, 2700);
  assert.equal(idle.state.story.organisationStatus, 'dojo');
  assert.equal(idle.state.eventLog.some((e) => e.type === 'ending' || e.type === 'evt-beast-crisis'), false);
  assert.deepEqual(
    idle.state.eventLog.filter((e) => e.type === 'phaseNotice').map((e) => [e.tick, e.phaseId]),
    [[540, 'omen'], [1080, 'manifest'], [1800, 'surge']],
  );
  assert.equal(idle.state.eventLog.filter((e) => e.type === 'dayReport').length, 15);
  let stepped = world('rt-idle');
  for (let i = 0; i < 2700; i += 1) stepped = advance(stepped, 1).state;
  assert.equal(Realtime.hashWorld(stepped), Realtime.hashWorld(idle.state));
});

test('滿修為轉休養、用丹失敗不抽樣、承諾中的突破選項跨過政策與存檔', () => {
  let w = richWorld();
  const crossing = order(w, 'cultivate', {}, 3);
  w = untilIdle(crossing);
  const seq = hero(crossing).manualOrder.seq;
  const crossed = w.activities.find((a) => a.manualSeq === seq);
  const units = w.eventLog.filter((e) => e.type === 'unitCompleted' && e.activityId === crossed.id);
  assert.ok(units.some((e) => e.kind === 'cultivate' && e.after.cultivation === 100));
  assert.ok(units.some((e) => e.kind === 'rest' && e.fallback && e.fallback.reason === 'cultivation_full'));
  assert.equal(units.every((e) => e.after.cultivation <= 100), true);
  assert.equal(hero(w).cultivation, 100);
  assert.equal(hero(w).breakthroughs, 0);

  const noPill = clone(w);
  const rngBefore = clone(noPill.rngState);
  let denied = order(noPill, 'breakthrough', {}, 1, { usePill: true, supporterId: null });
  assert.equal(denied.inventory[PILL], 0);
  denied = advance(denied, 1).state;
  const rest = activity(denied, hero(denied).activityId);
  assert.equal(rest.kind, 'rest');
  assert.equal(rest.fallback.reason, 'insufficient_resource');
  assert.equal(denied.inventory[PILL], 0);
  assert.deepEqual(denied.rngState, rngBefore);

  while (w.resources.spiritMaterial < 2 || w.resources.spiritHerb < 6) {
    w = runOrder(w, 'gather-material', { tileId: 't-0-0' }, 2);
    w = runOrder(w, 'gather-herb', { tileId: 't-2-0' }, 2);
  }
  w = runOrder(w, 'brew', { recipeId: 'breakthrough-pill' }, 2);
  assert.ok(w.inventory[PILL] >= 1);
  const pills = w.inventory[PILL];
  const control = must(clone(w), 'setPolicy', { policy: Realtime.DEFAULT_POLICY });
  const omitted = dispatch(control, 'orderActivity', { discipleId: PID, kind: 'breakthrough', target: {}, units: 1 });
  assert.equal(omitted.code, 'bad_payload');
  assert.equal(canon(control), canon(must(clone(w), 'setPolicy', { policy: Realtime.DEFAULT_POLICY })));
  let plain = order(control, 'breakthrough', {}, 1, { usePill: false, supporterId: null });
  assert.equal(plain.commandLog.at(-1).payload.usePill, false);
  assert.equal(plain.commandLog.at(-1).payload.supporterId, null);
  const rngPlain = clone(plain.rngState);
  plain = untilIdle(plain);
  assert.equal(plain.inventory[PILL], pills);
  assert.notDeepEqual(plain.rngState, rngPlain);
  assert.equal(plain.eventLog.filter((e) => e.type === 'breakthroughResolved').length, 1);

  const self = dispatch(w, 'orderActivity', { discipleId: PID, kind: 'breakthrough', target: {}, units: 1, usePill: false, supporterId: PID });
  assert.equal(self.code, 'self_support');
  const missing = dispatch(w, 'orderActivity', { discipleId: PID, kind: 'breakthrough', target: {}, units: 1, usePill: false, supporterId: 'disc-missing' });
  assert.equal(missing.code, 'unknown_disciple');
  assert.equal(w.inventory[PILL], pills);

  while (w.resources.spiritMaterial < 8) w = runOrder(w, 'gather-material', { tileId: 't-0-0' }, 2);
  if (hero(w).cultivation < 100) {
    while (hero(w).cultivation < 100) {
      if (hero(w).stamina < 40) w = runOrder(w, 'rest', {}, 1);
      else w = runOrder(w, 'cultivate', {}, 1);
    }
  }
  w = order(w, 'build', { facilityType: 'residence', tileId: 't-0-2' }, 2);
  let guard = 0;
  while (!w.activities.some((a) => a.kind === 'build' && a.target.facilityType === 'residence' && a.status === 'working')) {
    assert.ok(++guard < 30);
    w = advance(w, 1).state;
  }
  const beforeOrder = w.inventory[PILL];
  w = order(w, 'breakthrough', {}, 1, { usePill: true, supporterId: MID });
  assert.equal(hero(w).manualOrder.kind, 'breakthrough');
  assert.equal(hero(w).manualOrder.status, 'pending');
  assert.equal(hero(w).manualOrder.usePill, true);
  assert.equal(hero(w).manualOrder.supporterId, MID);
  assert.equal(w.inventory[PILL], beforeOrder);
  w = must(w, 'setPolicy', { policy: Replay.CUSTOM_POLICY });
  assert.equal(hero(w).manualOrder.usePill, true);
  assert.equal(hero(w).manualOrder.supporterId, MID);
  const saved = Realtime.serializeState(w);
  const loaded = Realtime.parseState(saved);
  assert.equal(loaded.ok, true, loaded.reason);
  w = loaded.state;
  assert.equal(hero(w).manualOrder.usePill, true);
  assert.equal(hero(w).manualOrder.supporterId, MID);
  const departed = { rng: null, pills: null };
  guard = 0;
  while (!w.activities.some((a) => a.kind === 'breakthrough' && (a.status === 'traveling' || a.status === 'working'))) {
    assert.ok(++guard < 400);
    const step = advance(w, 1);
    w = step.state;
  }
  const bt = w.activities.find((a) => a.kind === 'breakthrough' && a.status !== 'cancelled');
  departed.rng = clone(w.rngState);
  departed.pills = w.inventory[PILL];
  assert.equal(bt.usePill, true);
  assert.equal(bt.supporterId, MID);
  assert.equal(bt.paid.pills, 1);
  assert.equal(departed.pills, beforeOrder - 1);
  assert.ok(w.activities.some((a) => a.kind === 'support' && a.discipleId === MID));
  guard = 0;
  while (!w.eventLog.some((e) => e.type === 'breakthroughResolved')) {
    assert.ok(++guard < 80);
    w = advance(w, 1).state;
  }
  const done = w.activities.find((a) => a.kind === 'breakthrough' && a.status === 'done');
  const sim = Progression.resolve(
    { mind: done.outcome.mindAtStart, cultivation: 100, injury: done.outcome.injuryBefore },
    { pill: true, supporter: true },
    departed.rng,
  );
  assert.deepEqual(w.rngState, sim.rngState);
  assert.deepEqual(done.outcome, sim.outcome);
  assert.equal(w.inventory[PILL], departed.pills);
  if (done.outcome.result === 'success') {
    assert.equal(hero(w).cultivation, 100);
    assert.equal(hero(w).breakthroughs, 1);
  }
  const succeeded = Replay.play(0, 'full');
  assert.equal(succeeded.ok, true, succeeded.reason);
  assert.equal(succeeded.breakthroughs, 1);
  assert.equal(succeeded.cultivation, 100);
  const second = dispatch(succeeded.world, 'orderActivity', {
    discipleId: PID, kind: 'breakthrough', target: {}, units: 1, usePill: false, supporterId: null,
  });
  assert.equal(second.code, 'already_breakthrough');
  const again = order(succeeded.world, 'cultivate', {}, 1);
  const started = advance(again, 1).state;
  const restAct = activity(started, hero(started).activityId);
  assert.equal(restAct.kind, 'rest');
  assert.equal(restAct.fallback.reason, 'breakthrough_done');
  assert.equal(hero(started).cultivation, 100);
  assert.equal(hero(started).breakthroughs, 1);
});

test('支援者若已在活動中，突破落敗並休養，不會雙重開工', () => {
  const w = world('rt-busy');
  hero(w).cultivation = 100;
  const master = w.disciples[0];
  master.activityId = 'act-0001';
  w.activities.push({
    id: 'act-0001', discipleId: MID, kind: 'rest', target: {}, units: 1, unitsDone: 0, workTicks: 0,
    status: 'traveling', origin: 'manual', manualSeq: null, requestedTick: 0, departTick: 0,
    arriveTick: null, startTick: null, completedTick: null, waited: 0,
    paid: { spiritMaterial: 0, spiritHerb: 0, spiritStone: 0, reputation: 0, pills: 0 },
    refunded: false, snapshot: null, anchorSnapshot: null, fallback: null,
    originPos: { r: 2, c: 2 }, dest: { r: 2, c: 2 }, path: [], pathIndex: 0, stepTicks: 0,
    halt: null, partnerWait: false, seatKey: null,
  });
  assert.equal(Realtime.validateWorld(w).ok, true, Realtime.validateWorld(w).reason);
  const ordered = order(w, 'breakthrough', {}, 1, { usePill: false, supporterId: MID });
  const step = advance(ordered, 1).state;
  const mine = activity(step, hero(step).activityId);
  assert.equal(mine.kind, 'rest');
  assert.equal(mine.fallback.reason, 'participant_busy');
  assert.equal(master.activityId, 'act-0001');
  assert.equal(step.disciples[0].activityId, 'act-0001');
  assert.equal(step.activities.filter((a) => a.kind === 'support').length, 0);
  assert.deepEqual(step.rngState, w.rngState);
});

test('請求 tick 早於入隊 tick 的支援者在開工時被拒絕', () => {
  let w = advance(world('rt-join'), 5).state;
  w.disciples.push({
    id: 'cand-1', role: 'apprentice', attributes: { rootBone: 3, comprehension: 3, craft: 3 },
    stamina: 100, mind: 60, cultivation: 0, injury: 0, joinTick: 5, breakthroughs: 0,
    pos: { r: 2, c: 2 }, activityId: null, manualOrder: null,
    autonomy: { decisionSeq: 0, wait: null, resumeReason: null },
  });
  hero(w).cultivation = 100;
  hero(w).manualOrder = {
    seq: 1, commandId: 'old', status: 'pending', kind: 'breakthrough', target: {}, units: 1,
    requestedTick: 0, activityId: null, usePill: false, supporterId: 'cand-1',
  };
  assert.equal(Realtime.validateWorld(w).ok, true, Realtime.validateWorld(w).reason);
  const step = advance(w, 1).state;
  assert.equal(step.eventLog.some((e) => e.type === 'manualInvalid'), true);
  assert.equal(hero(step).manualOrder, null);
  assert.equal(hero(step).activityId, null);
  assert.equal(step.disciples[2].activityId, null);
  assert.deepEqual(step.rngState, w.rngState);
});

test('slot 與 RT 互叫回 wrong_mode；舊檔與交叉版本不改寫輸入', () => {
  const rt = deepFreeze(world('rt-mode'));
  const rtText = canon(rt);
  assert.equal(Engine.advance(rt, 1).code, 'wrong_mode');
  assert.equal(Commands.dispatch(rt, { id: 's', type: 'assignSlot', expectedRevision: 0, payload: {} }).code, 'wrong_mode');
  assert.equal(canon(rt), rtText);
  const slot = deepFreeze(State.newWorld('demo').state);
  const slotText = canon(slot);
  assert.equal(Realtime.advanceTicks(slot, 1).code, 'wrong_mode');
  assert.equal(Realtime.dispatch(slot, { id: 's', type: 'assignSlot', expectedRevision: 0, payload: {} }).code, 'wrong_mode');
  assert.equal(Realtime.validateWorld(slot).code, 'old_mode_unsupported');
  assert.equal(canon(slot), slotText);
  const file = path.join(__dirname, 'fixtures', 'new-world.json');
  const bytes = fs.readFileSync(file);
  const parsed = Realtime.parseState(bytes.toString('utf8'));
  assert.equal(parsed.code, 'old_mode_unsupported');
  assert.deepEqual(fs.readFileSync(file), bytes);
  const mixed = clone(world('rt-mode'));
  mixed.schemaVersion = 4;
  assert.equal(Realtime.validateWorld(mixed).code, 'mode_mismatch');
  const foreign = { schemaVersion: 9, ruleVersion: 9, scenarioId: 'x' };
  assert.equal(Realtime.validateWorld(foreign).code, 'unknown_schema_version');
  const badRng = clone(world('rt-mode'));
  badRng.rngVersion = 2;
  assert.equal(Realtime.validateWorld(badRng).code, 'unknown_rng_version');
  assert.equal(Realtime.parseState('{').code, 'invalid_json');
  assert.throws(() => Realtime.serializeState({ scenarioId: 'life-rt' }), TypeError);
});

test('新局 fixture 與 createWorld 的正式存檔一致，且不是舊 slot golden', () => {
  const options = Replay.optionsForIndex(0);
  assert.deepEqual(options, Smoke.optionsForIndex(0, Object.keys(Rules.CHARACTER_OPTION_LIMITS.templates)));
  const live = Realtime.createWorld('rt-dev-000', options);
  const file = path.join(__dirname, 'fixtures', 'rt-new-world.json');
  const text = fs.readFileSync(file, 'utf8');
  const parsed = Realtime.parseState(text);
  assert.equal(parsed.ok, true, parsed.reason);
  assert.equal(Realtime.serializeState(parsed.state), Realtime.serializeState(live.state));
  assert.notEqual(parsed.state.schemaVersion, JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'new-world.json'), 'utf8')).schemaVersion);
});

test('rt-manual-core-v1：20 seed × 2700 tick，分塊、突破後續與存讀 hash 相同', { timeout: 240000 }, () => {
  const result = Replay.replayMatrix();
  assert.equal(result.ok, true, JSON.stringify(result.failures, null, 2));
  assert.equal(result.rows.length, 20);
  assert.deepEqual(result.rows.map((r) => [r.cultivation, r.breakthroughs, r.injury, r.material]), [
    [100, 1, 0, 8], [70, 0, 15, 8], [70, 0, 15, 8], [100, 1, 0, 8], [70, 0, 15, 8],
    [70, 0, 15, 8], [70, 0, 15, 8], [100, 1, 0, 8], [70, 0, 15, 4], [100, 1, 0, 8],
    [100, 1, 0, 4], [100, 1, 0, 8], [100, 1, 0, 8], [100, 1, 0, 8], [100, 1, 0, 4],
    [100, 1, 0, 8], [70, 0, 15, 8], [100, 1, 0, 2], [70, 0, 15, 8], [70, 0, 15, 4],
  ]);
  assert.ok(result.rows.some((r) => r.breakthroughs === 0));
  assert.ok(result.rows.some((r) => r.breakthroughs === 1));
  assert.equal(result.rows.every((r) => r.breakthroughTick === 2148), true);
});
