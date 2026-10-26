'use strict';
// SG-RT-04：畫面列出的操作都要對得上正式 API。每個可按的選項直接送 Realtime.dispatch 驗證，不另寫一套規則。
const test = require('node:test');
const assert = require('node:assert/strict');
const Realtime = require('../js/realtime.js');
const Rules = require('../js/rules.js');
const StoryData = require('../js/story-data.js');
const Story = require('../js/story.js');
const Progression = require('../js/progression.js');
const Actions = require('../viewer/actions.js');

const SEED = 'rt-dev-000';
const deps = { Rules, StoryData, Story, Progression, Realtime };
let seq = 0;

function send(world, command) {
  seq += 1;
  return Realtime.dispatch(world, { id: `t-${seq}`, expectedRevision: world.revision, type: command.type, payload: command.payload });
}
function withPolicy(policy) {
  const w = Realtime.createWorld(SEED).state;
  return send(w, { type: 'setPolicy', payload: { policy } }).state;
}
function advance(world, n) {
  let w = world;
  let left = n;
  while (left > 0) {
    const r = Realtime.advanceTicks(w, left);
    assert.equal(r.ok, true);
    assert.notEqual(r.stopReason, 'error');
    w = r.state;
    left -= r.advancedTicks;
  }
  return w;
}
function until(world, pred, limit = 3000) {
  let w = world;
  for (let i = 0; i < limit && !pred(w); i += 1) w = advance(w, 1);
  assert.ok(pred(w), '在上限內沒等到條件');
  return w;
}
const prot = (w) => w.disciples.find((d) => d.id === w.protagonistId);
const actOf = (w, d) => w.activities.find((a) => a.id === d.activityId) || null;

test('每個地點：可按的操作都被正式 API 接受；不能按的都有原因；選了別人時一律不能下令', () => {
  for (const tick of [0, 600]) {
    const world = advance(Realtime.createWorld(SEED).state, tick);
    const keys = Actions.places(Rules, world).map((p) => p.key);
    assert.equal(keys.length, world.tiles.length + 1);
    let enabled = 0;
    for (const key of keys) {
      const spec = Actions.placeActions(deps, world, key, world.protagonistId);
      assert.equal(typeof spec.title, 'string');
      assert.equal(new Set(spec.actions.map((a) => a.key)).size, spec.actions.length, `${key} 的操作 key 不重複`);
      for (const a of spec.actions) {
        const r = send(world, a.command);
        if (a.disabled) {
          assert.equal(typeof a.disabled, 'string');
        } else {
          enabled += 1;
          assert.equal(r.ok, true, `tick ${tick} ${key} ${a.key}：${r.code} ${r.reason}`);
        }
      }
      const other = Actions.placeActions(deps, world, key, world.masterId);
      assert.ok(other.actions.every((a) => a.disabled), '選師父時不能替他下令');
      if (other.actions.length) assert.match(other.who, /只能下給主角/);
    }
    assert.ok(enabled > 5);
  }
  // 靈草未長：畫面不給按，引擎也同樣拒絕。
  const w0 = Realtime.createWorld(SEED).state;
  const herb = w0.tiles.find((t) => t.terrain === 'herb');
  const a = Actions.placeActions(deps, w0, herb.id, null).actions[0];
  assert.match(a.disabled, /靈草/);
  assert.equal(send(w0, a.command).code, 'blocked');
});

test('取消手動指令：排隊、旅行、可打斷工作、已開工承諾四種說法對得上引擎實際結果', () => {
  const pid = (w) => w.protagonistId;
  const cancel = (w) => {
    const spec = Actions.personActions(deps, w, pid(w));
    assert.equal(spec.actions.length, 1);
    const act = spec.actions[0];
    const r = send(w, act.command);
    assert.equal(r.ok, true, `${r.code} ${r.reason}`);
    return { act, r, fb: Actions.commandFeedback(deps, w, r.state, act.command, r.events) };
  };
  const base = Realtime.createWorld(SEED).state;
  const far = base.tiles.find((t) => t.terrain === 'material' && Math.abs(t.row - Rules.DOJO.r) + Math.abs(t.col - Rules.DOJO.c) >= 2);

  // 排隊中（還沒出發）
  let w = send(base, { type: 'orderActivity', payload: { discipleId: pid(base), kind: 'gather-material', target: { tileId: far.id }, units: 1 } }).state;
  let c = cancel(w);
  assert.match(c.act.label, /排隊/);
  assert.equal(c.r.events[0].type, 'manualCancelled');

  // 旅行中：走完這一步就停
  w = until(w, (x) => { const a = actOf(x, prot(x)); return a && a.status === 'traveling' && a.origin === 'manual'; });
  c = cancel(w);
  assert.match(c.act.why, /這一步/);
  assert.deepEqual([c.r.events[0].type, c.r.events[0].halt], ['cancelArmed', 'step']);
  assert.match(c.fb.text, /這一步/);

  // 可打斷工作：做到一半的單位不算
  w = send(base, { type: 'orderActivity', payload: { discipleId: pid(base), kind: 'cultivate', target: {}, units: 3 } }).state;
  w = until(w, (x) => { const a = actOf(x, prot(x)); return a && a.status === 'working' && a.kind === 'cultivate' && a.origin === 'manual'; });
  c = cancel(w);
  assert.deepEqual([c.r.events[0].type, c.r.events[0].halt], ['cancelArmed', 'drop']);
  assert.match(c.fb.text, /停下/);

  // 已開工承諾（援村）：回 ok、解除手動鎖，工作照樣做完
  let a = withPolicy(Object.assign({}, Realtime.ASK_POLICY));
  a = advance(a, Rules.AID_AVAILABLE_FROM_SLOT * Rules.TICKS_PER_SLOT);
  const gate = Actions.placeActions(deps, a, 'gate', pid(a)).actions.find((x) => x.key === 'aid-free');
  assert.equal(gate.disabled, null);
  a = send(a, gate.command).state;
  a = until(a, (x) => { const t = actOf(x, prot(x)); return t && t.kind === 'aid' && t.status === 'working'; });
  const promiseId = prot(a).activityId;
  c = cancel(a);
  assert.match(c.act.why, /仍會做完/);
  assert.equal(c.r.events[0].type, 'manualLockReleased');
  assert.equal(c.r.events[0].reason, 'promise-continues');
  assert.match(c.fb.text, /仍會完成/);
  assert.doesNotMatch(c.fb.text, /拒絕|停工/);
  const done = until(c.r.state, (x) => x.activities.find((t) => t.id === promiseId).status === 'done');
  assert.ok(done.story.rescues.some((r) => r.id === Rules.AID_ID), '援村照樣完成');

  // 非主角、沒有手動令：沒有可按的取消
  assert.equal(Actions.personActions(deps, base, base.masterId).actions.length, 0);
  assert.equal(Actions.personActions(deps, base, pid(base)).actions.length, 0);
});

test('三類詢問：選項取自待選事件與模板，每個選項恰好一條正式命令；收徒接受走 acceptCandidate', () => {
  // 求援（援村政策為詢問）
  let w = until(withPolicy(Object.assign({}, Realtime.ASK_POLICY)), (x) => x.pendingEvents.some((e) => e.kind === 'plea'));
  let asks = Actions.pendingAsks(deps, w);
  const plea = asks.find((q) => q.kind === 'plea');
  assert.deepEqual(plea.options.map((o) => o.key), StoryData.getEvent('evt-village-plea').options.map((o) => o.id));
  assert.ok(plea.left > 0 && plea.left <= Rules.ASK_EXPIRY_TICKS);
  const help = plea.options.find((o) => o.key === 'opt-aid-accept');
  let r = send(w, help.command);
  assert.equal(r.ok, true);
  assert.equal(r.state.pendingEvents.some((e) => e.kind === 'plea'), false);
  assert.equal(Actions.commandFeedback(deps, w, r.state, help.command, r.events).openPlace, 'gate', '答應後接著打開村口');

  // 收徒（收徒政策為詢問）：接受直接入隊、關閉事件；再想想改成暫不收，之後仍可收
  const mixed = Object.assign({}, Realtime.DEFAULT_POLICY, { recruit: 'ask', breakthrough: 'ask' });
  w = until(withPolicy(mixed), (x) => x.pendingEvents.filter((e) => e.kind === 'invitation').length === 2);
  asks = Actions.pendingAsks(deps, w);
  const inv1 = asks.find((q) => q.eventId === 'evt-invite-cand-1');
  const inv2 = asks.find((q) => q.eventId === 'evt-invite-cand-2');
  assert.match(inv1.title, /採藥童/);
  assert.deepEqual(inv1.options.map((o) => o.command.type), ['acceptCandidate', 'chooseEvent']);
  r = send(w, inv1.options[0].command);
  assert.equal(r.ok, true);
  assert.equal(r.state.story.invitations['cand-1'].status, 'accepted');
  assert.equal(r.state.pendingEvents.some((e) => e.id === 'evt-invite-cand-1'), false);
  assert.match(Actions.commandFeedback(deps, w, r.state, inv1.options[0].command, r.events).text, /入隊/);
  w = r.state;
  r = send(w, inv2.options.find((o) => o.key.endsWith('-later')).command);
  assert.equal(r.ok, true);
  assert.equal(r.state.story.invitations['cand-2'].status, 'deferred');
  const deferred = Actions.pendingAsks(deps, r.state).find((q) => q.kind === 'deferred');
  assert.equal(deferred.options.length, 1);
  const r2 = send(r.state, deferred.options[0].command);
  assert.equal(r2.ok, true);
  assert.equal(r2.state.story.invitations['cand-2'].status, 'accepted');

  // 突破：選項取自 BREAKTHROUGH_ASK；同意只排進突破，回饋不說成功
  w = until(w, (x) => x.pendingEvents.some((e) => e.kind === 'breakthroughAsk'));
  const ask = Actions.pendingAsks(deps, w).find((q) => q.kind === 'breakthroughAsk');
  assert.deepEqual(ask.options.map((o) => o.key), Realtime.BREAKTHROUGH_ASK.options.map((o) => o.id));
  const agree = ask.options[0];
  r = send(w, agree.command);
  assert.equal(r.ok, true);
  const fb = Actions.commandFeedback(deps, w, r.state, agree.command, r.events);
  assert.doesNotMatch(fb.text, /成功！|突破成功/);
  assert.match(fb.text, /成敗/);
  const d = r.state.disciples.find((x) => x.id === w.pendingEvents.find((e) => e.kind === 'breakthroughAsk').discipleId);
  assert.equal(d.manualOrder.kind, 'breakthrough');

  // 逾期：事件消失後畫面不再列，舊選項送出被拒且世界不動
  const later = until(w, (x) => !x.pendingEvents.some((e) => e.id === ask.eventId));
  assert.equal(Actions.pendingAsks(deps, later).some((q) => q.eventId === ask.eventId), false);
  const stale = send(later, agree.command);
  assert.equal(stale.ok, false);
  assert.match(Actions.rejectText(stale), /沒有接受/);
});

test('推進回饋只讀事件：自己下的令開工、改成休養、設施完工與突破結果各有一句', () => {
  let w = Realtime.createWorld(SEED).state;
  const before = w.eventLog.length;
  w = send(w, { type: 'orderActivity', payload: { discipleId: w.protagonistId, kind: 'rest', target: {}, units: 1 } }).state;
  w = advance(w, 2);
  const fb = Actions.tickFeedback(deps, w, w.eventLog.slice(before), { [w.protagonistId]: '主角' });
  assert.ok(fb.some((f) => f.kind === 'toast' && /主角開始執行你下的令：休養/.test(f.text)));
  // 長跑：至少出現完工、突破結果與靈氣轉換的橫幅
  const long = advance(Realtime.createWorld(SEED).state, 1200);
  const banners = Actions.tickFeedback(deps, long, long.eventLog, {}).filter((f) => f.kind === 'banner').map((f) => f.text);
  assert.ok(banners.some((t) => /丹房完工/.test(t)), JSON.stringify(banners));
  assert.ok(banners.some((t) => /突破/.test(t)));
  assert.ok(banners.some((t) => /靈氣轉為/.test(t)));
});

test('畫面自己的拒絕有中文說明；引擎的拒絕沿用引擎原因', () => {
  for (const code of ['stale_revision', 'stale_generation', 'intent_spent', 'world_stopped']) {
    assert.match(Actions.rejectText({ ok: false, code, reason: 'x' }), /[一-鿿]{4}/);
  }
  assert.equal(Actions.rejectText({ ok: false, code: 'not_protagonist', reason: '手動指令只下給主角' }), '沒有接受：手動指令只下給主角');
  const c = Actions.characterChoices(Rules, StoryData);
  assert.deepEqual(c.templates.map((t) => t.id), Object.keys(Rules.CHARACTER_OPTION_LIMITS.templates));
  assert.equal(c.freePoints, 3);
  for (const t of c.templates) {
    assert.equal(t.blurb, StoryData.STORY_DATA.templates[t.id].blurb);
    assert.equal(t.background, StoryData.STORY_DATA.templates[t.id].background);
    assert.doesNotMatch(`${t.blurb}${t.background}`, /[0-9０-９]/);
  }
});
