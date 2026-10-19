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
  assert.ok(model, 'model 產生成功');
  assert.ok(model.goalStatus, '包含 goalStatus');
  assert.ok(Array.isArray(model.goalStatus.items), 'goalStatus.items 是陣列');
  assert.ok(Array.isArray(model.goalStatus.seats), 'goalStatus.seats 是陣列');
});

test('SG-RT-03b: 開局弟子包含 why 解釋（目標、理由、預估結束）', () => {
  const world = Realtime.createWorld(SEED).state;
  const model = View.describe(world, deps);

  assert.equal(model.people.length, 2);
  for (const p of model.people) {
    assert.ok(p.why, `${p.id} 應包含 why`);
    assert.ok(typeof p.why.goal === 'string', `${p.id} why.goal 為字串`);
    assert.ok(typeof p.why.reason === 'string', `${p.id} why.reason 為字串`);
    assert.ok(p.why.estimatedEnd === null || typeof p.why.estimatedEnd === 'string', `${p.id} why.estimatedEnd 為 null 或字串`);
  }
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

  // 開局：收徒目標應提示第 7 天開放
  const recruit = model.goalStatus.items.find((g) => g.kind === 'recruit');
  assert.ok(recruit, '應包含收徒目標');
  assert.equal(recruit.done, false);
  assert.ok(recruit.statusText.includes('第 7 天'), `應提示第 7 天開放，實際：${recruit.statusText}`);
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

test('SG-RT-03b: pendingOrder 狀態被正確識別而非顯示 decide', () => {
  const world = Realtime.createWorld(SEED).state;
  const disciple = world.disciples[0];
  // 注入 pending 手動指令
  disciple.manualOrder = {
    action: 'rest',
    status: 'pending',
    target: { r: 2, c: 2 },
  };

  const model = View.describe(world, deps);
  const p = model.people.find((x) => x.id === disciple.id);
  assert.equal(p.status.kind, 'pendingOrder');
  assert.equal(p.status.label, '排隊中');
  assert.ok(p.why.reason.includes('手動指令'));
});

test('SG-RT-03b: 推進數十 tick 後，活動與移動中的弟子 why 帶有預估結束時間與目標說明', () => {
  let world = Realtime.createWorld(SEED).state;
  world = advanceTo(world, 100);

  const model = View.describe(world, deps);
  for (const p of model.people) {
    if (p.status.kind === 'activity') {
      assert.ok(p.why.goal.length > 0, '活動中應有具體目標');
      assert.ok(p.why.reason.length > 0, '活動中應有原因');
      assert.ok(p.why.estimatedEnd.includes('約 tick'), `應有預估結束時間，實際為：${p.why.estimatedEnd}`);
    }
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

  // 測試 renderPeople 含 pendingOrder
  const disciple = world.disciples[0];
  disciple.manualOrder = { action: 'rest', status: 'pending' };
  const pendingModel = View.describe(world, deps);
  const peopleHtml = View.renderPeople(pendingModel, disciple.id);
  assert.ok(peopleHtml.includes('state-pendingOrder'), 'renderPeople 應包含 state-pendingOrder 類別');
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

