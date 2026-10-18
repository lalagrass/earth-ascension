'use strict';
// SG-RT-02：自主生活、非凍結詢問與無人介入。不把 rt-manual-core-v1 的舊數字當成這裡的結果。
const test = require('node:test');
const assert = require('node:assert/strict');
const Autonomy = require('../js/autonomy.js');
const Realtime = require('../js/realtime.js');
const Rules = require('../js/rules.js');
const Engine = require('../js/engine.js');
const StoryData = require('../js/story-data.js');
const State = require('../js/state.js');
const Auto = require('../tools/rt-auto-replay.js');

const PID = State.PROTAGONIST_ID;
const MID = State.MASTER_ID;
const PILL = 'breakthrough-pill';

function world(seed = 'rt-auto') {
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
  assert.equal(result.ok, true, `${type} ${result.code || ''} ${result.reason || ''}`);
  return result.state;
}
function drive(w, n) {
  let left = n;
  while (left > 0) {
    const step = Realtime.advanceTicks(w, left);
    assert.equal(step.ok, true, (step.error && step.error.reason) || step.reason);
    assert.notEqual(step.stopReason, 'error', step.error && step.error.reason);
    w = step.state;
    left -= step.advancedTicks;
  }
  return w;
}
function hero(w) {
  return w.disciples.find((d) => d.id === PID);
}
function disciple(id, extra) {
  return Object.assign({
    id,
    attributes: { craft: 3 },
    stamina: 100,
    injury: 0,
    cultivation: 0,
    breakthroughs: 0,
    pos: { r: 2, c: 2 },
    joined: true,
    idle: true,
    manualLock: false,
    decide: true,
    askOpen: false,
    askCooldownUntil: null,
  }, extra);
}
function snapshot(extra) {
  return Object.assign({
    tick: 0,
    tiles: Rules.initialTiles(),
    resources: { spiritMaterial: 30, spiritHerb: 0, spiritStone: 0, reputation: 0 },
    pills: 0,
    pillsFree: 0,
    inbound: { spiritMaterial: 0, spiritHerb: 0, pills: 0 },
    seats: { 'build:t-0-1': 1, 'gather:t-0-0': 2, 'work:alchemyRoom': 1, 'aid:village': 1 },
    facilitiesDone: { alchemyRoom: false },
    buildOpen: {},
    brewInFlight: false,
    aidInFlight: false,
    aidDone: false,
    openBreakthrough: false,
    goals: [{ id: 'goal-alchemy', kind: 'buildFacility', facilityType: 'alchemyRoom' }],
    policy: Realtime.DEFAULT_POLICY,
    disciples: [disciple(MID), disciple(PID)],
  }, extra);
}

test('決策函式不改快照；疲勞先於建造，一座設施只派一個人', () => {
  const tired = snapshot();
  tired.disciples[0].stamina = 40;
  const before = JSON.stringify(tired);
  const rested = Autonomy.plan(tired);
  assert.equal(JSON.stringify(tired), before);
  assert.equal(rested.assignments.find((a) => a.discipleId === MID).kind, 'rest');
  assert.notEqual(rested.assignments.find((a) => a.discipleId === MID).kind, 'build');
  const both = Autonomy.plan(snapshot());
  const builds = both.assignments.filter((a) => a.kind === 'build');
  assert.equal(builds.length, 1);
  assert.equal(builds[0].target.tileId, 't-0-1');
  assert.equal(Autonomy.plan(snapshot()).assignments.map((a) => a.discipleId + a.kind).join(), both.assignments.map((a) => a.discipleId + a.kind).join());
});

test('靈草未解鎖時，還能修行的人去修行；滿修為且不能突破的人等待', () => {
  // 丹房已好、靈材夠一爐，只差尚未解鎖的靈草。契約不派人去採靈草，也不把這座爐當成可做的需求。
  const planned = Autonomy.plan(snapshot({
    tick: 0,
    resources: { spiritMaterial: 2, spiritHerb: 0, spiritStone: 0, reputation: 0 },
    facilitiesDone: { alchemyRoom: true },
    goals: [{ id: 'pills', kind: 'stockPills', count: 1 }],
    policy: Object.assign({}, Realtime.DEFAULT_POLICY, { breakthrough: 'off' }),
    disciples: [disciple('low', { cultivation: 0 }), disciple('full', { cultivation: 100 })],
  }));
  assert.equal(planned.assignments.find((a) => a.discipleId === 'low').kind, 'cultivate');
  assert.equal(planned.assignments.find((a) => a.discipleId === 'full').reason, 'blocked:herb_locked');
});

test('目標順序先於工作種類：能煉丹就不先建下一座', () => {
  function planned(goals) {
    return Autonomy.plan(snapshot({
      tick: 600,
      resources: { spiritMaterial: 10, spiritHerb: 6, spiritStone: 0, reputation: 0 },
      facilitiesDone: { alchemyRoom: true },
      buildOpen: { alchemyRoom: 1 },
      seats: Object.assign(
        Object.fromEntries(Rules.initialTiles().filter((t) => Rules.TERRAIN[t.terrain].buildable).map((t) => [`build:${t.id}`, 1])),
        { 'work:alchemyRoom': 1, 'aid:village': 1 },
      ),
      goals,
      disciples: [disciple(MID, { attributes: { craft: 5 } })],
    }));
  }
  const brewFirst = planned([
    { id: 'first', kind: 'stockPills', count: 1 },
    { id: 'second', kind: 'buildFacility', facilityType: 'residence' },
  ]);
  assert.equal(brewFirst.assignments[0].kind, 'brew');
  const buildFirst = planned([
    { id: 'first', kind: 'buildFacility', facilityType: 'residence' },
    { id: 'second', kind: 'stockPills', count: 1 },
  ]);
  assert.equal(buildFirst.assignments[0].kind, 'build');
  assert.equal(buildFirst.assignments[0].target.facilityType, 'residence');
});

test('手動請求的 priority 先於等待更久的自主請求；缺欄仍按等待值', () => {
  const ranked = Engine.arbitrate({
    requests: [
      { id: 'auto', discipleId: 'a', waited: 9, cost: {}, seats: { s: 1 }, participants: ['a'], priority: 1 },
      { id: 'manual', discipleId: 'b', waited: 0, cost: {}, seats: { s: 1 }, participants: ['b'], priority: 0 },
    ],
    resources: {},
    seats: { s: 1 },
  });
  assert.deepEqual(ranked.granted, ['manual']);
  const legacy = Engine.arbitrate({
    requests: [
      { id: 'new', discipleId: 'a', waited: 0, cost: {}, seats: { s: 1 }, participants: ['a'] },
      { id: 'old', discipleId: 'b', waited: 4, cost: {}, seats: { s: 1 }, participants: ['b'] },
    ],
    resources: {},
    seats: { s: 1 },
  });
  assert.deepEqual(legacy.granted, ['old']);
});

test('突破詢問不在舊故事表；模板沒有數字、onceKey 或危機', () => {
  assert.equal(StoryData.getEvent('evt-breakthrough-ask'), null);
  const ask = Realtime.BREAKTHROUGH_ASK;
  assert.equal(ask.narrativeOnly, true);
  assert.equal(Object.hasOwn(ask, 'onceKey'), false);
  assert.equal(Object.hasOwn(ask, 'claims'), false);
  assert.equal(/\d/.test(`${ask.text.title}${ask.text.body}`), false);
  assert.equal(ask.options[1].effects.length, 0);
  assert.deepEqual(ask.options[0].effects, [{ type: 'orderBreakthrough' }]);
});

test('手動鎖不被自主抢走；體力不足時先正式休養', () => {
  let w = world('rt-lock');
  w.resources.spiritMaterial = 20;
  w.disciples.forEach((d) => { d.stamina = 40; });
  w = must(w, 'orderActivity', { discipleId: PID, kind: 'gather-material', target: { tileId: 't-0-0' }, units: 1 });
  const seq = hero(w).manualOrder.seq;
  w = drive(w, 1);
  assert.equal(hero(w).manualOrder.seq, seq);
  assert.equal(hero(w).manualOrder.kind, 'gather-material');
  const master = w.disciples[0];
  const rest = w.activities.find((a) => a.id === master.activityId);
  assert.equal(rest.kind, 'rest');
  assert.equal(rest.origin, 'auto');
  assert.equal(w.activities.filter((a) => a.kind === 'build').length, 0);
});

test('工作完成的同一 tick 不開下一件，材料要等下一 tick', () => {
  const w = drive(world('rt02-po-review'), 180);
  const byDisc = new Map();
  for (const act of w.activities) {
    if (!byDisc.has(act.discipleId)) byDisc.set(act.discipleId, []);
    byDisc.get(act.discipleId).push(act);
  }
  for (const list of byDisc.values()) {
    const ordered = list.filter((a) => a.departTick !== null).sort((a, b) => a.departTick - b.departTick || (a.id < b.id ? -1 : 1));
    for (let i = 1; i < ordered.length; i += 1) {
      const prev = ordered[i - 1];
      const next = ordered[i];
      if (prev.completedTick === null) continue;
      const converted = next.fallback && next.departTick + 1 === prev.completedTick;
      if (converted) continue;
      assert.ok(
        next.departTick >= prev.completedTick,
        `${prev.id} 在 ${prev.completedTick} 完成，${next.id} 卻在 ${next.departTick} 出發`,
      );
    }
  }
});

test('承諾型建造中同意突破會留下 pending，完工後才用凍結的丹與支援者', () => {
  let w = must(world('rt-promise-ask'), 'setPolicy', { policy: Realtime.ASK_POLICY });
  w = must(w, 'setGoals', { goals: [] });
  w.resources.spiritMaterial = 30;
  w.inventory[PILL] = 1;
  w.disciples.forEach((d) => { d.cultivation = 100; });
  w = must(w, 'orderActivity', {
    discipleId: PID, kind: 'build', target: { facilityType: 'residence', tileId: 't-2-2' }, units: 2,
  });
  w = drive(w, 1);
  const build = w.activities.find((a) => a.discipleId === PID && a.kind === 'build');
  assert.equal(build.status, 'working');
  assert.equal(Realtime.validateWorld(w).ok, true);
  const event = w.pendingEvents.find((e) => e.discipleId === PID);
  w = must(w, 'chooseEvent', { eventId: event.id, optionId: 'opt-breakthrough-agree' });
  assert.equal(w.story.breakthroughAsks[PID].lastDisposition, 'agree');
  assert.equal(hero(w).manualOrder.kind, 'breakthrough');
  assert.equal(hero(w).manualOrder.status, 'pending');
  assert.equal(hero(w).manualOrder.usePill, true);
  assert.equal(hero(w).manualOrder.supporterId, MID);
  assert.equal(w.activities.find((a) => a.id === build.id).status, 'working');
  w = must(w, 'setPolicy', { policy: Object.assign({}, Realtime.ASK_POLICY, { breakthroughPill: 'never', breakthroughSupport: 'never' }) });
  const frozen = { usePill: hero(w).manualOrder.usePill, supporterId: hero(w).manualOrder.supporterId };
  const loaded = Realtime.parseState(Realtime.serializeState(w));
  assert.equal(loaded.ok, true, loaded.reason);
  w = loaded.state;
  assert.equal(hero(w).manualOrder.usePill, frozen.usePill);
  assert.equal(hero(w).manualOrder.supporterId, frozen.supporterId);
  const rngBefore = JSON.stringify(w.rngState);
  let started = null;
  for (let i = 0; i < 200 && !started; i += 1) {
    w = drive(w, 1);
    started = w.activities.find((a) => a.kind === 'breakthrough' && a.discipleId === PID && a.status !== 'cancelled');
  }
  assert.ok(started, '承諾結束後沒有開始突破');
  assert.equal(started.usePill, true);
  assert.equal(started.supporterId, MID);
  assert.equal(JSON.stringify(w.rngState), rngBefore);
  assert.equal(w.inventory[PILL], 0);
  let resolved = w;
  for (let i = 0; i < 80 && resolved.clock.tick === w.clock.tick; i += 1) {
    const step = Realtime.advanceTicks(resolved, 80);
    assert.equal(step.ok, true, step.reason);
    resolved = step.state;
    if (step.stopReason === 'breakthroughResolved') break;
  }
  assert.equal(resolved.eventLog.filter((e) => e.type === 'breakthroughResolved' && e.discipleId === PID).length, 1);
  assert.notEqual(JSON.stringify(resolved.rngState), rngBefore);
});

test('同一 tick 不會把同一座丹房派給兩個人', () => {
  let w = world('rt-one-build');
  w.resources.spiritMaterial = 30;
  w = drive(w, 1);
  const builds = w.activities.filter((a) => a.kind === 'build' && a.status !== 'cancelled');
  assert.equal(builds.length, 1);
  assert.equal(builds[0].target.facilityType, 'alchemyRoom');
  assert.equal(w.resources.spiritMaterial, 18);
});

test('auto、ask、off 各有合法去向，詢問逾期是稍後且不扣資源', () => {
  let auto = must(world('rt-auto-go'), 'setGoals', {
    goals: [{ id: 'goal-breakthrough', kind: 'breakthrough', discipleId: 'all' }],
  });
  auto.disciples.forEach((d) => { d.cultivation = 100; });
  auto = drive(auto, 1);
  assert.equal(auto.activities.filter((a) => a.kind === 'breakthrough').length, 1);
  assert.equal(auto.activities.filter((a) => a.kind === 'support').length, 1);
  assert.equal(auto.pendingEvents.length, 0);

  let ask = must(world('rt-ask-go'), 'setPolicy', { policy: Realtime.ASK_POLICY });
  ask = must(ask, 'setGoals', { goals: [] });
  ask.disciples.forEach((d) => { d.cultivation = 100; });
  const resources = JSON.stringify(ask.resources);
  const rng = JSON.stringify(ask.rngState);
  ask = drive(ask, 1);
  assert.equal(ask.activities.some((a) => a.kind === 'breakthrough'), false);
  assert.equal(ask.pendingEvents.filter((e) => e.kind === 'breakthroughAsk').length, 2);
  assert.equal(ask.eventLog.some((e) => e.phase === 'awaitingChoice'), false);
  const raised = ask.pendingEvents.map((e) => e.id);
  ask = drive(ask, 180);
  assert.equal(ask.pendingEvents.some((e) => raised.includes(e.id)), false);
  assert.equal(JSON.stringify(ask.resources), resources);
  assert.equal(JSON.stringify(ask.rngState), rng);
  assert.ok(ask.eventLog.some((e) => e.type === 'askExpired'));
  assert.equal(ask.story.breakthroughAsks[PID].lastDisposition, 'expired');

  let off = must(world('rt-off-go'), 'setGoals', { goals: [] });
  off = must(off, 'setPolicy', { policy: Object.assign({}, Realtime.DEFAULT_POLICY, { breakthrough: 'off' }) });
  off.disciples.forEach((d) => { d.cultivation = 100; });
  off = drive(off, 1);
  assert.equal(hero(off).autonomy.wait.reason, 'cultivation_full');
  assert.equal(off.pendingEvents.length, 0);
  assert.equal(off.activities.some((a) => a.kind === 'breakthrough'), false);
});

test('同意凍結當下的丹與支援者；事後改政策不改寫，存讀後仍在', () => {
  let w = must(world('rt-agree'), 'setPolicy', { policy: Realtime.ASK_POLICY });
  w = must(w, 'setGoals', { goals: [] });
  w.inventory[PILL] = 1;
  w.disciples.forEach((d) => { d.cultivation = 100; });
  w = drive(w, 1);
  const event = w.pendingEvents.find((e) => e.discipleId === PID);
  const rng = JSON.stringify(w.rngState);
  w = must(w, 'chooseEvent', { eventId: event.id, optionId: 'opt-breakthrough-agree' });
  assert.equal(JSON.stringify(w.rngState), rng);
  assert.equal(hero(w).manualOrder.usePill, true);
  assert.equal(hero(w).manualOrder.supporterId, MID);
  assert.equal(hero(w).manualOrder.commandId, `agree-${event.id}`);
  const smuggle = dispatch(w, 'chooseEvent', { eventId: 'evt-breakthrough-ask/x/1', optionId: 'opt-breakthrough-agree', usePill: true });
  assert.equal(smuggle.ok, false);
  assert.equal(smuggle.code, 'bad_payload');
  w = must(w, 'setPolicy', { policy: Object.assign({}, Realtime.ASK_POLICY, { breakthroughPill: 'never', breakthroughSupport: 'never' }) });
  assert.equal(hero(w).manualOrder.usePill, true);
  assert.equal(hero(w).manualOrder.supporterId, MID);
  const loaded = Realtime.parseState(Realtime.serializeState(w));
  assert.equal(loaded.ok, true, loaded.reason);
  assert.equal(loaded.state.disciples.find((d) => d.id === PID).manualOrder.usePill, true);
  assert.equal(loaded.state.disciples.find((d) => d.id === PID).manualOrder.supporterId, MID);
  const closed = dispatch(loaded.state, 'chooseEvent', { eventId: event.id, optionId: 'opt-breakthrough-later' });
  assert.equal(closed.code, 'closed_event');
});

test('資格已失效的同意不建指令、不抽樣，並進入 cooldown', () => {
  let w = must(world('rt-invalid'), 'setPolicy', { policy: Realtime.ASK_POLICY });
  w = must(w, 'setGoals', { goals: [] });
  w.disciples.forEach((d) => { d.cultivation = 100; });
  w = drive(w, 1);
  const event = w.pendingEvents.find((e) => e.discipleId === PID);
  hero(w).cultivation = 70;
  const rng = JSON.stringify(w.rngState);
  const resources = JSON.stringify(w.resources);
  w = must(w, 'chooseEvent', { eventId: event.id, optionId: 'opt-breakthrough-agree' });
  assert.equal(hero(w).manualOrder, null);
  assert.equal(w.story.breakthroughAsks[PID].lastDisposition, 'agree_invalid');
  assert.equal(w.story.breakthroughAsks[PID].cooldownUntilTick, w.clock.tick + Rules.ASK_EXPIRY_TICKS);
  assert.equal(JSON.stringify(w.rngState), rng);
  assert.equal(JSON.stringify(w.resources), resources);
  assert.equal(w.inventory[PILL], 0);
});

test('目標做完且不需恢復時，等待 60 tick 不移動、不回復、不發休養', () => {
  let w = must(world('rt-wait'), 'setGoals', { goals: [] });
  w = must(w, 'setPolicy', { policy: Object.assign({}, Realtime.DEFAULT_POLICY, { breakthrough: 'off' }) });
  w.disciples.forEach((d) => { d.cultivation = 100; });
  w = drive(w, 1);
  const before = {
    pos: Object.assign({}, hero(w).pos),
    stamina: hero(w).stamina,
    mind: hero(w).mind,
    injury: hero(w).injury,
    since: hero(w).autonomy.wait.sinceTick,
    material: w.resources.spiritMaterial,
  };
  assert.equal(hero(w).autonomy.wait.reason, 'cultivation_full');
  assert.equal(hero(w).activityId, null);
  w = drive(w, 59);
  assert.equal(hero(w).autonomy.wait.reason, 'cultivation_full');
  assert.equal(hero(w).autonomy.wait.sinceTick, before.since);
  assert.deepEqual(hero(w).pos, before.pos);
  assert.equal(hero(w).stamina, before.stamina);
  assert.equal(hero(w).mind, before.mind);
  assert.equal(hero(w).injury, before.injury);
  assert.equal(hero(w).activityId, null);
  assert.equal(w.resources.spiritMaterial, before.material);
  assert.equal(w.eventLog.some((e) => e.type === 'unitCompleted' && e.kind === 'rest'), false);
});

test('未知事件、重複詢問與帶 onceKey 的待選不能載入', () => {
  const w = world('rt-ask-shape');
  const text = Realtime.serializeState(w);
  const extra = JSON.parse(text);
  extra.pendingEvents.push({ id: 'evt-village-plea', templateId: 'evt-village-plea', kind: 'plea', raisedTick: 0, expiresTick: 180, onceKey: 'plea' });
  assert.equal(Realtime.parseState(JSON.stringify(extra)).code, 'bad_value');
  const dup = JSON.parse(text);
  const ask = {
    id: 'evt-breakthrough-ask/disc-protagonist/1',
    templateId: 'evt-breakthrough-ask',
    kind: 'breakthroughAsk',
    discipleId: PID,
    generation: 1,
    raisedTick: 0,
    expiresTick: 180,
  };
  dup.pendingEvents.push(ask, Object.assign({}, ask));
  dup.story.breakthroughAsks[PID] = { generation: 1, openEventId: ask.id, lastDisposition: null, cooldownUntilTick: null };
  assert.equal(Realtime.parseState(JSON.stringify(dup)).ok, false);
});

test('回放 until 停在突破結果的 tick，而不是下一個固定檢查點', () => {
  const baseline = Auto.play(0, 'full');
  assert.equal(baseline.ok, true, baseline.reason);
  assert.equal(typeof baseline.breakthroughTick, 'number');
  const mid = Auto.play(0, 'step', { until: baseline.breakthroughTick });
  assert.equal(mid.ok, true, mid.reason);
  assert.equal(mid.clock, baseline.breakthroughTick);
});

test('rt-auto-life-v1：20 seed × 2700 tick，三種政策、分塊、存讀與一次固定介入', { timeout: 600000 }, () => {
  const result = Auto.replayMatrix();
  assert.equal(result.ok, true, JSON.stringify(result.failures, null, 2));
  assert.equal(result.script, 'rt-auto-life-v1');
  assert.equal(result.rows.length, 20);
  assert.deepEqual(result.rows.map((row) => row.policy), [
    ...Array(10).fill('安穩發展'),
    ...Array(5).fill('全部詢問'),
    ...Array(5).fill('自訂'),
  ]);
  assert.equal(result.rows.every((row) => row.breakthroughTick === 2148), false);
});
