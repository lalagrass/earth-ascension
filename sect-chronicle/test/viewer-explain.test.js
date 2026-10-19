'use strict';
// SG-RT-03b：因果 selectors 與理由查詢單元測試。
// 驗證 View.describe 產生的 why 理由、goalStatus 目標狀態與工作位容量，
// 以及唯讀不變性（deepFreeze、hash 相同）與畫面渲染輸出。
const test = require('node:test');
const assert = require('node:assert/strict');
const Realtime = require('../js/realtime.js');
const Rules = require('../js/rules.js');
const StoryData = require('../js/story-data.js');
const View = require('../viewer/view.js');

const SEED = 'rt-dev-000';
const deps = { Rules, StoryData };

function deepFreeze(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v)) deepFreeze(v[k]);
  }
  return v;
}

function advanceTo(world, targetTick) {
  let cur = world;
  while (cur.clock.tick < targetTick) {
    const left = targetTick - cur.clock.tick;
    const r = Realtime.advanceTicks(cur, left);
    assert.equal(r.ok, true);
    assert.notEqual(r.stopReason, 'error');
    cur = r.state;
  }
  return cur;
}

test('SG-RT-03b: describe 保持唯讀性與深凍結相容性', () => {
  const world = Realtime.createWorld(SEED).state;
  const hashBefore = Realtime.hashWorld(world);

  // 凍結狀態下調用 describe
  const frozen = deepFreeze(JSON.parse(JSON.stringify(world)));
  const model = View.describe(frozen, deps);

  assert.equal(Realtime.hashWorld(world), hashBefore, 'describe 後世界 hash 不變');
  assert.deepEqual(world.rngState, frozen.rngState, 'rngState 不變');
  assert.ok(model, 'model 產生成功');
  assert.ok(model.goalStatus, '包含 goalStatus');
  assert.ok(Array.isArray(model.goalStatus.items), 'goalStatus.items 是陣列');
  assert.ok(Array.isArray(model.goalStatus.seats), 'goalStatus.seats 是陣列');
});

test('SG-RT-03b R1: 旅行 ETA 精確折算 STEP_TICKS 並扣除當前格進度，完成點固定', () => {
  let world = Realtime.createWorld(SEED).state;

  // rt-dev-000 在 tick 1：第一個採集活動出發，path 長度 4，pathIndex 0，stepTicks 1，預計在 tick 84 完成
  world = advanceTo(world, 1);
  const m1 = View.describe(world, deps);
  const p1 = m1.people.find((x) => x.id === world.masterId);
  assert.equal(p1.status.kind, 'activity');
  assert.equal(p1.status.status, '移動中');
  assert.equal(p1.why.estimatedEnd, '若不中斷，約 tick 84 結束');

  // 推進至 tick 15（同一旅行途中，格內進度推進）
  world = advanceTo(world, 15);
  const m15 = View.describe(world, deps);
  const p15 = m15.people.find((x) => x.id === world.masterId);
  assert.equal(p15.status.kind, 'activity');
  assert.equal(p15.status.status, '移動中');
  assert.equal(p15.why.estimatedEnd, '若不中斷，約 tick 84 結束', '同一段旅行不同進度預估完成 tick 應固定在 84');
});

test('SG-RT-03b R2: 突破目標依真實 eligibility 與在途活動投影，不含假階段限制', () => {
  let world = Realtime.createWorld(SEED).state;
  // rt-dev-000 推進至 tick 1160（主角正在進行突破活動）
  world = advanceTo(world, 1160);
  const model = View.describe(world, deps);
  const btGoal = model.goalStatus.items.find((g) => g.kind === 'breakthrough');
  assert.ok(btGoal, '應有突破目標');
  assert.equal(btGoal.done, false);
  assert.ok(!btGoal.statusText.includes('目前靈氣階段不可突破'), '不應包含假階段限制');
  assert.ok(btGoal.statusText.includes('突破進行中') || btGoal.statusText.includes('可突破'), `應反映真實進度，實際為：${btGoal.statusText}`);
});

test('SG-RT-03b R3: 工作中的 pending 手動令明示排隊，保留當前活動與下一令雙層資訊', () => {
  let world = Realtime.createWorld(SEED).state;
  world = advanceTo(world, 700);
  const prot = world.disciples.find((d) => d.id === world.protagonistId);

  // 主角正在煉丹中，dispatch orderActivity(rest, units: 1)
  const cmd = {
    id: 'cmd-order-test',
    expectedRevision: world.revision,
    type: 'orderActivity',
    payload: {
      discipleId: prot.id,
      kind: 'rest',
      target: {},
      units: 1,
    },
  };
  const res = Realtime.dispatch(world, cmd);
  assert.equal(res.ok, true, 'dispatch 成功');
  world = res.state;

  const model = View.describe(world, deps);
  const p = model.people.find((x) => x.id === prot.id);
  // 當前活動維持 activity，但包含排隊中手動令
  assert.equal(p.status.kind, 'activity');
  assert.ok(p.status.pendingOrder, '活動中弟子應持有 pendingOrder 資訊');
  assert.equal(p.status.pendingOrder.kind, 'rest');
  assert.ok(p.status.text.includes('下一手動令：休養 排隊中'), `status.text 應包含下一手動令，實際：${p.status.text}`);
  assert.ok(p.why.reason.includes('手動指令排隊中（休養）'), `why.reason 應包含排隊令，實際：${p.why.reason}`);

  // renderDetail 正確輸出當前與排隊說明
  const detail = View.renderDetail(model, p.id);
  assert.ok(detail.includes('休養（排隊中，待當前活動完成後接續）'), `detail 應展示排隊接續說明，實際：${detail}`);
});

test('SG-RT-03b R4: 收徒缺口真實投影援村前置阻擋與邀請待回覆', () => {
  // 反例 1：aid: 'off' 推至 tick 1081（未完成援村，收徒應被前置阻擋）
  let w1 = Realtime.createWorld(SEED).state;
  const pol1 = Object.assign({}, w1.policy, { aid: 'off' });
  w1 = Realtime.dispatch(w1, { id: 'p-aid-off', expectedRevision: w1.revision, type: 'setPolicy', payload: { policy: pol1 } }).state;
  w1 = advanceTo(w1, 1081);
  const m1 = View.describe(w1, deps);
  const recruit1 = m1.goalStatus.items.find((g) => g.kind === 'recruit');
  assert.ok(recruit1);
  assert.equal(recruit1.done, false);
  assert.equal(recruit1.deficit, true);
  assert.ok(recruit1.statusText.includes('需先完成援助村落'), `未援村時應指出前置未達成，實際：${recruit1.statusText}`);

  // 反例 2：recruit: 'ask' 推至 tick 1081（已完成援村，進入顯化日 7，但邀請待回覆）
  let w2 = Realtime.createWorld(SEED).state;
  const pol2 = Object.assign({}, w2.policy, { recruit: 'ask' });
  w2 = Realtime.dispatch(w2, { id: 'p-rec-ask', expectedRevision: w2.revision, type: 'setPolicy', payload: { policy: pol2 } }).state;
  w2 = advanceTo(w2, 1081);
  const m2 = View.describe(w2, deps);
  const recruit2 = m2.goalStatus.items.find((g) => g.kind === 'recruit');
  assert.ok(recruit2);
  assert.equal(recruit2.done, false);
  assert.equal(recruit2.deficit, true);
  assert.ok(recruit2.statusText.includes('待回覆'), `邀請已發出時應提示待回覆，實際：${recruit2.statusText}`);
});

test('SG-RT-03b: 目標狀態與缺口 (goalStatus) 正確識別建材缺口與丹房狀態', () => {
  const world = Realtime.createWorld(SEED).state;
  const model = View.describe(world, deps);

  // 開局：建造丹房目標應該顯示缺靈材
  const alchemy = model.goalStatus.items.find((g) => g.kind === 'buildFacility' && g.text.includes('丹房'));
  assert.ok(alchemy, '應包含建造丹房目標');
  assert.equal(alchemy.done, false);
  assert.equal(alchemy.deficit, true);
  assert.ok(alchemy.statusText.includes('缺靈材 12'), `應提示缺靈材 12，實際：${alchemy.statusText}`);

  // 開局：凝氣丹目標應提示丹房尚未完工
  const pill = model.goalStatus.items.find((g) => g.kind === 'stockPills' || g.text.includes('凝氣丹'));
  assert.ok(pill, '應包含凝氣丹目標');
  assert.equal(pill.done, false);
  assert.equal(pill.deficit, true);
  assert.ok(pill.statusText.includes('丹房尚未完工'), `應提示丹房尚未完工，實際：${pill.statusText}`);

  // 開局：援村目標應提示第 4 天開放
  const aid = model.goalStatus.items.find((g) => g.kind === 'aid');
  assert.ok(aid, '應包含援村目標');
  assert.equal(aid.done, false);
  assert.ok(aid.statusText.includes('第 4 天'), `應提示第 4 天開放，實際：${aid.statusText}`);
});

test('SG-RT-03b: 工作位容量與佔用統計', () => {
  const world = Realtime.createWorld(SEED).state;
  const model = View.describe(world, deps);

  assert.ok(model.goalStatus.seats.length >= 2, '開局應至少包含採靈材與採靈草位');
  const matSeat = model.goalStatus.seats.find((s) => s.name === '採靈材位');
  assert.ok(matSeat);
  assert.ok(matSeat.capacity > 0);
  assert.equal(typeof matSeat.occupied, 'number');

  const herbSeat = model.goalStatus.seats.find((s) => s.name === '採靈草位');
  assert.ok(herbSeat);
  assert.ok(herbSeat.capacity > 0);
});

test('SG-RT-03b: 休養活動與 fallback 的理由和門檻解釋', () => {
  const world = Realtime.createWorld(SEED).state;
  const d = world.disciples[0];

  // 1. 傷勢門檻休養
  d.injury = 35;
  d.activityId = 'act-rest-1';
  world.activities.push({
    id: 'act-rest-1',
    discipleId: d.id,
    kind: 'rest',
    origin: 'auto',
    status: 'working',
    units: 1,
    workTicks: 10,
    target: {},
  });
  let model = View.describe(world, deps);
  let p = model.people.find((x) => x.id === d.id);
  assert.ok(p.why.goal.includes('傷勢 35'));
  assert.ok(p.why.goal.includes('門檻 ≥ 30'));

  // 2. 體力門檻休養
  d.injury = 0;
  d.stamina = 45;
  model = View.describe(world, deps);
  p = model.people.find((x) => x.id === d.id);
  assert.ok(p.why.goal.includes('體力 45'));
  assert.ok(p.why.goal.includes('門檻 < 60'));

  // 3. Fallback 轉來休養
  const act = world.activities.find((a) => a.id === 'act-rest-1');
  act.fallback = { from: 'gather-material', reason: 'no_seat' };
  model = View.describe(world, deps);
  p = model.people.find((x) => x.id === d.id);
  assert.ok(p.why.goal.includes('採集靈材'));
  assert.ok(p.why.goal.includes('沒有空位'));
  assert.ok(p.why.reason.includes('採集靈材'));
  assert.ok(p.why.reason.includes('沒有空位'));
});

test('SG-RT-03b: 自主等待 (autonomy.wait) 的各類理由映射', () => {
  const world = Realtime.createWorld(SEED).state;
  const d = world.disciples[0];
  d.activityId = null;

  const reasons = [
    ['goals_done', '目標都已完成'],
    ['blocked:herb_locked', '靈草尚未解鎖'],
    ['breakthrough_ask_open', '詢問待回覆'],
    ['breakthrough_later', '稍後再問冷卻中'],
    ['cultivation_full', '修為已滿'],
  ];

  for (const [code, text] of reasons) {
    d.autonomy.wait = { reason: code, sinceTick: 10, recheckTick: 70 };
    const model = View.describe(world, deps);
    const p = model.people.find((x) => x.id === d.id);
    assert.ok(p.why.goal.includes(text), `理由碼 ${code} 應包含 ${text}，實際：${p.why.goal}`);
  }
});

test('SG-RT-03b: renderDetail 與 renderSettings 渲染包含因果解釋與目標狀態', () => {
  const world = Realtime.createWorld(SEED).state;
  const model = View.describe(world, deps);

  // 測試 renderDetail
  const discipleId = model.people[0].id;
  const detailHtml = View.renderDetail(model, discipleId);
  assert.ok(detailHtml.includes('為了哪個目標'), 'renderDetail 應包含「為了哪個目標」');
  assert.ok(detailHtml.includes('動機／理由'), 'renderDetail 應包含「動機／理由」');
  assert.ok(detailHtml.includes('預估結束'), 'renderDetail 應包含「預估結束」');

  // 測試 renderSettings
  const settingsHtml = View.renderSettings(model);
  assert.ok(settingsHtml.includes('目標狀態與缺口'), 'renderSettings 應包含「目標狀態與缺口」');
  assert.ok(settingsHtml.includes('工作位容量'), 'renderSettings 應包含「工作位容量」');
  assert.ok(settingsHtml.includes('採靈材位'), 'renderSettings 應列出採靈材位容量');

  // 測試 renderPeople 空閒排隊時的 pendingOrder
  const disciple = world.disciples[0];
  disciple.manualOrder = { kind: 'rest', status: 'pending' };
  const pendingModel = View.describe(world, deps);
  const peopleHtml = View.renderPeople(pendingModel, disciple.id);
  assert.ok(peopleHtml.includes('state-pendingOrder'), 'renderPeople 應包含 state-pendingOrder 類別');
});
