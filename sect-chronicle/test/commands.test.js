'use strict';
// SG-03 指令層測試：封套、去重／revision 順序、課表命令、chooseEvent 核心。
// 只證明「命令驗證與套用」；時間推進與每格結算見 engine.test.js。後續命令（建造、煉丹、突破、
// 防禦、acceptCandidate）必須明確回 not_supported_yet，不得假成功。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Rules = require('../js/rules.js');
const State = require('../js/state.js');
const SD = require('../js/story-data.js');
const C = require('../js/commands.js');

const clone = (x) => JSON.parse(JSON.stringify(x));
const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
};
const world = (seed = 'cmd-seed', opts) => {
  const r = State.newWorld(seed, 'slice-14', opts);
  assert.equal(r.ok, true);
  return r.state;
};
const cmd = (id, expectedRevision, type, payload) => ({ id, expectedRevision, type, payload });
const hash = (w) => State.hashWorld(w);

// 合法的待選世界（手工建立；引擎推進到這裡的路徑在 engine.test.js 驗證）
function pendingWorld(pendingIds, slotIndex, extra = {}) {
  const w = world();
  w.slotIndex = slotIndex;
  w.revision = slotIndex;
  w.phase = 'awaitingChoice';
  w.pendingEvents = pendingIds.map((id) => ({ id, raisedSlotIndex: slotIndex }));
  w.story.triggeredEventIds = [...pendingIds];
  Object.assign(w, extra);
  const v = C.validateEngineWorld(w);
  assert.deepEqual(v, { ok: true }, JSON.stringify(v));
  return w;
}
function rescuedStory(w) {
  w.story.rescues = [{ id: Rules.AID_ID, completedSlotIndex: 12, rewardClaimed: true }];
  w.story.triggeredEventIds.push('evt-aid-complete');
  return w;
}
// 手工建立「第 20 格已收 cand-1」的中途世界
function withApprentice() {
  const w = world();
  w.slotIndex = 20;
  w.revision = 20;
  rescuedStory(w);
  w.story.invitations['cand-1'] = { status: 'accepted', joinSlotIndex: 20 };
  w.disciples.push({
    id: 'cand-1', role: 'apprentice', attributes: { rootBone: 3, comprehension: 3, craft: 3 },
    stamina: 100, mind: 60, cultivation: 0, injury: 0, joinSlotIndex: 20,
  });
  assert.deepEqual(C.validateEngineWorld(w), { ok: true });
  return w;
}

function assertRejected(w, command, code) {
  const frozen = deepFreeze(clone(w));
  const before = hash(frozen);
  const r = C.dispatch(frozen, command);
  assert.equal(r.ok, false, JSON.stringify(r));
  assert.equal(r.code, code, JSON.stringify(r));
  assert.equal(typeof r.reason, 'string');
  assert.ok(r.reason.length > 0);
  assert.equal(hash(frozen), before, '拒絕後世界（含 revision、RNG、紀錄）完全不變');
  return r;
}

// ---------- 載入與純度 ----------

test('commands.js 不用 RNG／牆鐘／eval，只 require rules、state、story-data；瀏覽器載入順序與錯誤', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'commands.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.equal(/Math\.random|Date\.now|new Date|performance\.now|nextInt|nextUint32|eval\(|new Function/.test(src), false);
  const requires = [...src.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1]).sort();
  assert.deepEqual(requires, ['./rules.js', './state.js', './story-data.js']);
  const load = (names) => {
    const ctx = vm.createContext({});
    for (const f of names) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
    return ctx;
  };
  const ctx = load(['rng.js', 'rules.js', 'state.js', 'story-data.js', 'commands.js']);
  const B = ctx.SectChronicle.Commands;
  assert.ok(B);
  const w = world();
  const r = B.dispatch(w, cmd('c-1', 0, 'assignSlot', { discipleId: State.PROTAGONIST_ID, slotIndex: 0, action: 'cultivate' }));
  assert.equal(r.ok, true);
  assert.equal(State.hashWorld(r.state), hash(C.dispatch(w, cmd('c-1', 0, 'assignSlot', { discipleId: State.PROTAGONIST_ID, slotIndex: 0, action: 'cultivate' })).state));
  assert.throws(() => load(['rng.js', 'rules.js', 'state.js', 'commands.js']), /story-data\.js/);
  assert.throws(() => load(['rng.js', 'rules.js', 'commands.js']), /state\.js/);
  assert.throws(() => load(['rng.js', 'commands.js']), /rules\.js/);
});

test('已支援與尚未支援的命令／行動清單明確且互不重疊，並對應後續任務', () => {
  assert.deepEqual([...C.SUPPORTED_COMMANDS].sort(), ['assignSlot', 'chooseEvent', 'setDailyTemplate']);
  assert.deepEqual(Object.keys(C.DEFERRED_COMMANDS).sort(),
    ['acceptCandidate', 'cancelQueuedJob', 'queueBreakthrough', 'queueBuild', 'queueCraft', 'setDefense']);
  for (const t of C.SUPPORTED_COMMANDS) assert.equal(t in C.DEFERRED_COMMANDS, false);
  assert.deepEqual([...C.SUPPORTED_ACTIONS].sort(), ['cultivate', 'gather-herb', 'gather-material', 'rest', 'tune-mind']);
  assert.deepEqual(Object.keys(C.DEFERRED_ACTIONS).sort(), ['aid', 'breakthrough', 'brew', 'build', 'support']);
  for (const a of [...C.SUPPORTED_ACTIONS, ...Object.keys(C.DEFERRED_ACTIONS)]) assert.ok(a in Rules.ACTIONS, a);
  assert.equal(C.SUPPORTED_ACTIONS.length + Object.keys(C.DEFERRED_ACTIONS).length, Object.keys(Rules.ACTIONS).length);
});

// ---------- 封套 ----------

test('封套形狀錯誤一律 bad_command，世界不變', () => {
  const w = world();
  const ok = { discipleId: State.PROTAGONIST_ID, slotIndex: 0, action: 'rest' };
  for (const bad of [null, undefined, 5, 'x', [], cmd('', 0, 'assignSlot', ok), cmd(5, 0, 'assignSlot', ok),
    cmd('a'.repeat(65), 0, 'assignSlot', ok), cmd('c', -1, 'assignSlot', ok), cmd('c', 0.5, 'assignSlot', ok),
    cmd('c', '0', 'assignSlot', ok), cmd('c', -0, 'assignSlot', ok), cmd('c', 0, 7, ok), cmd('c', 0, 'assignSlot', null),
    cmd('c', 0, 'assignSlot', [ok]), cmd('c', 0, 'assignSlot', { ...ok, slotIndex: NaN }),
    cmd('c', 0, 'assignSlot', { ...ok, extra: new Map() }), { id: 'c', type: 'assignSlot', payload: ok },
    { ...cmd('c', 0, 'assignSlot', ok), extra: 1 }]) {
    assertRejected(w, bad, 'bad_command');
  }
});

test('不合法的世界被明確拒絕（invalid_world），不嘗試修補', () => {
  const w = world();
  w.schemaVersion = 1;
  const r = C.dispatch(w, cmd('c', 0, 'assignSlot', { discipleId: State.PROTAGONIST_ID, slotIndex: 0, action: 'rest' }));
  assert.equal(r.ok, false);
  assert.equal(r.code, 'invalid_world');
  assert.match(r.reason, /unknown_schema_version/);
  assert.equal(C.dispatch(null, cmd('c', 0, 'assignSlot', {})).code, 'invalid_world');
});

test('未知命令 unknown_command；後續任務的命令 not_supported_yet 並指出負責任務，世界不變', () => {
  const w = world();
  assertRejected(w, cmd('c', 0, 'castSpell', {}), 'unknown_command');
  const owners = { queueBuild: 'SG-04', cancelQueuedJob: 'SG-04', queueCraft: 'SG-04', queueBreakthrough: 'SG-05', setDefense: 'SG-06', acceptCandidate: 'SG-04A' };
  for (const [type, owner] of Object.entries(owners)) {
    const r = assertRejected(w, cmd(`c-${type}`, 0, type, { anything: 1 }), 'not_supported_yet');
    assert.ok(r.reason.includes(owner), r.reason);
  }
  // acceptCandidate 即使世界與 payload 合法也不假成功：候選不會入隊、不會發資源
  const aw = pendingWorld(['evt-invite-cand-1'], 18);
  rescuedStory(aw);
  aw.phase = 'planning';
  aw.pendingEvents = [];
  assertRejected(aw, cmd('c-acc', aw.revision, 'acceptCandidate', { candidateId: 'cand-1' }), 'not_supported_yet');
});

// ---------- assignSlot ----------

test('assignSlot 成功：只改課表與紀錄，不推時間、不產生成果、不消耗 RNG；深凍結輸入可執行', () => {
  const w = deepFreeze(world());
  const r = C.dispatch(w, cmd('c-1', 0, 'assignSlot', { discipleId: State.PROTAGONIST_ID, slotIndex: 3, action: 'gather-material' }));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.duplicate, false);
  const s = r.state;
  assert.notEqual(s, w);
  assert.equal(s.revision, 1);
  assert.equal(s.slotIndex, 0);
  assert.equal(s.phase, 'planning');
  assert.deepEqual(s.rngState, w.rngState);
  assert.deepEqual(s.resources, w.resources);
  assert.deepEqual(s.disciples, w.disciples);
  assert.deepEqual(s.schedule.overrides, [{ discipleId: State.PROTAGONIST_ID, slotIndex: 3, action: 'gather-material' }]);
  assert.equal(s.commandLog.length, 1);
  const log = s.commandLog[0];
  assert.deepEqual({ ...log, payloadHash: undefined }, {
    seq: 1, id: 'c-1', type: 'assignSlot', payloadHash: undefined, revisionBefore: 0, revisionAfter: 1, eventSeqs: [1],
  });
  assert.equal(log.payloadHash, C.payloadHash('assignSlot', { discipleId: State.PROTAGONIST_ID, slotIndex: 3, action: 'gather-material' }));
  assert.equal(r.events.length, 1);
  assert.deepEqual(r.events[0], {
    seq: 1, type: 'slotAssigned', slotIndex: 0, commandId: 'c-1', discipleId: State.PROTAGONIST_ID, targetSlotIndex: 3, action: 'gather-material',
  });
  assert.deepEqual(s.eventLog, r.events);
  assert.deepEqual(State.validateWorld(s), { ok: true });
  // 回傳值是新物件：改它不會影響輸入
  s.schedule.overrides[0].action = 'rest';
  assert.equal(w.schedule.overrides.length, 0);
});

test('assignSlot：覆寫依 slotIndex、角色 ID 排序；同格同人是取代；action:null 清除覆寫', () => {
  let w = world();
  const send = (id, payload) => {
    const r = C.dispatch(w, cmd(id, w.revision, 'assignSlot', payload));
    assert.equal(r.ok, true, JSON.stringify(r));
    w = r.state;
  };
  send('a', { discipleId: State.PROTAGONIST_ID, slotIndex: 5, action: 'cultivate' });
  send('b', { discipleId: State.MASTER_ID, slotIndex: 5, action: 'rest' });
  send('c', { discipleId: State.PROTAGONIST_ID, slotIndex: 2, action: 'tune-mind' });
  assert.deepEqual(w.schedule.overrides.map((o) => `${o.slotIndex}:${o.discipleId}`),
    [`2:${State.PROTAGONIST_ID}`, `5:${State.MASTER_ID}`, `5:${State.PROTAGONIST_ID}`]);
  send('d', { discipleId: State.PROTAGONIST_ID, slotIndex: 5, action: 'gather-material' });
  assert.equal(w.schedule.overrides.length, 3);
  assert.equal(w.schedule.overrides.find((o) => o.slotIndex === 5 && o.discipleId === State.PROTAGONIST_ID).action, 'gather-material');
  send('e', { discipleId: State.PROTAGONIST_ID, slotIndex: 5, action: null });
  assert.equal(w.schedule.overrides.length, 2);
  assert.equal(w.revision, 5);
  assert.equal(w.commandLog.length, 5);
});

test('assignSlot 拒絕：未知／候選／未加入角色、已結算格、超出範圍、未知／未支援／鎖定行動、非 planning、payload 錯誤', () => {
  const P = State.PROTAGONIST_ID;
  const w = world();
  const a = (payload) => cmd('c', w.revision, 'assignSlot', payload);
  assertRejected(w, a({ discipleId: 'disc-ghost', slotIndex: 1, action: 'rest' }), 'unknown_disciple');
  // 候選尚未入隊：不能排課
  assertRejected(w, a({ discipleId: 'cand-1', slotIndex: 1, action: 'gather-material' }), 'candidate_not_member');
  assertRejected(w, a({ discipleId: 'cand-2', slotIndex: 1, action: 'rest' }), 'candidate_not_member');
  for (const [slotIndex, code] of [[42, 'slot_out_of_range'], [43, 'slot_out_of_range'], [-1, 'slot_already_resolved'],
    [1.5, 'bad_command'], ['3', 'bad_payload'], [null, 'bad_payload']]) { // 小數不是合法的 canonical 資料
    assertRejected(w, a({ discipleId: P, slotIndex, action: 'rest' }), code);
  }
  assertRejected(w, a({ discipleId: P, slotIndex: 1, action: 'teleport' }), 'unknown_action');
  for (const [action, owner] of Object.entries(C.DEFERRED_ACTIONS)) {
    const r = assertRejected(w, a({ discipleId: P, slotIndex: 1, action }), 'not_supported_yet');
    assert.ok(r.reason.includes(owner), r.reason);
  }
  // 階段鎖定：靈草在日 4（slot 9）前不可採；slot 8 拒絕、slot 9 接受
  assertRejected(w, a({ discipleId: P, slotIndex: 8, action: 'gather-herb' }), 'action_locked');
  assert.equal(C.dispatch(w, a({ discipleId: P, slotIndex: 9, action: 'gather-herb' })).ok, true);
  // payload 形狀
  assertRejected(w, a({ discipleId: P, slotIndex: 1 }), 'bad_payload');
  assertRejected(w, a({ discipleId: P, slotIndex: 1, action: 'rest', effects: [{ type: 'grantAidReward' }] }), 'bad_payload');
  assertRejected(w, a({ discipleId: 5, slotIndex: 1, action: 'rest' }), 'bad_payload');
  assertRejected(w, a({ discipleId: P, slotIndex: 1, action: 5 }), 'bad_payload');
  // 已結算的格
  const mid = withApprentice();
  assertRejected(mid, cmd('c', mid.revision, 'assignSlot', { discipleId: P, slotIndex: 19, action: 'rest' }), 'slot_already_resolved');
  assert.equal(C.dispatch(mid, cmd('c', mid.revision, 'assignSlot', { discipleId: P, slotIndex: 20, action: 'rest' })).ok, true);
  // 學徒加入前的格不能排課（已結算亦不行；順序上先判角色再判格）
  assertRejected(mid, cmd('c2', mid.revision, 'assignSlot', { discipleId: 'cand-1', slotIndex: 19, action: 'rest' }), 'slot_already_resolved');
  // 非 planning
  const pw = pendingWorld(['evt-village-plea'], 9);
  assertRejected(pw, cmd('c', pw.revision, 'assignSlot', { discipleId: P, slotIndex: 10, action: 'rest' }), 'not_planning');
});

test('學徒入隊後可排課；joinSlotIndex 之後的格才可排', () => {
  const w = withApprentice();
  const r = C.dispatch(w, cmd('c', w.revision, 'assignSlot', { discipleId: 'cand-1', slotIndex: 20, action: 'gather-material' }));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.state.schedule.overrides[0].discipleId, 'cand-1');
});

// ---------- setDailyTemplate ----------

test('setDailyTemplate：設定、取代、清除；本版支援的行動才可放入；不推時間不消耗 RNG', () => {
  const P = State.PROTAGONIST_ID;
  let w = world();
  const t = (id, payload) => C.dispatch(w, cmd(id, w.revision, 'setDailyTemplate', payload));
  let r = t('t1', { discipleId: P, parts: ['gather-material', 'cultivate', 'rest'] });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.state.schedule.templates[P], ['gather-material', 'cultivate', 'rest']);
  assert.equal(r.state.slotIndex, 0);
  assert.deepEqual(r.state.rngState, w.rngState);
  assert.equal(r.events[0].type, 'templateSet');
  w = r.state;
  // 靈草鎖定只在套用到該格時判斷（範本本身可含 gather-herb）
  r = t('t2', { discipleId: P, parts: ['gather-herb', 'rest', 'rest'] });
  assert.equal(r.ok, true);
  w = r.state;
  r = t('t3', { discipleId: P, parts: null });
  assert.equal(r.ok, true);
  assert.equal('templates' in r.state.schedule && P in r.state.schedule.templates, false);
  const base = world();
  const bad = (payload, code) => assertRejected(base, cmd('tb', 0, 'setDailyTemplate', payload), code);
  bad({ discipleId: P, parts: ['rest', 'rest'] }, 'bad_payload');
  bad({ discipleId: P, parts: ['rest', 'rest', 'rest', 'rest'] }, 'bad_payload');
  bad({ discipleId: P, parts: ['rest', 'rest', 7] }, 'bad_payload');
  bad({ discipleId: P }, 'bad_payload');
  bad({ discipleId: P, parts: ['rest', 'rest', 'teleport'] }, 'unknown_action');
  bad({ discipleId: P, parts: ['rest', 'build', 'rest'] }, 'not_supported_yet');
  bad({ discipleId: 'cand-1', parts: ['rest', 'rest', 'rest'] }, 'candidate_not_member');
  bad({ discipleId: 'ghost', parts: ['rest', 'rest', 'rest'] }, 'unknown_disciple');
  bad({ discipleId: P, parts: ['rest', 'rest', 'rest'], extra: 1 }, 'bad_payload');
  const pw = pendingWorld(['evt-village-plea'], 9);
  assertRejected(pw, cmd('tn', pw.revision, 'setDailyTemplate', { discipleId: P, parts: ['rest', 'rest', 'rest'] }), 'not_planning');
});

// ---------- 去重與 revision 順序 ----------

test('重送已接受的命令：回已處理結果、不增 revision、不重複紀錄、不覆蓋較新世界', () => {
  const P = State.PROTAGONIST_ID;
  const w0 = world();
  const first = C.dispatch(w0, cmd('c-1', 0, 'assignSlot', { discipleId: P, slotIndex: 3, action: 'gather-material' }));
  const second = C.dispatch(first.state, cmd('c-2', 1, 'assignSlot', { discipleId: P, slotIndex: 4, action: 'cultivate' }));
  const newest = second.state;
  assert.equal(newest.revision, 2);
  // 以過期 revision 重送 c-1（客戶端沒收到回應）：不是 stale_revision，而是已處理結果
  const frozen = deepFreeze(clone(newest));
  const h = hash(frozen);
  const again = C.dispatch(frozen, cmd('c-1', 0, 'assignSlot', { discipleId: P, slotIndex: 3, action: 'gather-material' }));
  assert.equal(again.ok, true);
  assert.equal(again.duplicate, true);
  assert.deepEqual(again.events, first.events, '回傳原本的事件');
  assert.equal(hash(again.state), h, '回傳目前（較新）世界，不倒退');
  assert.equal(again.state.revision, 2);
  assert.equal(again.state.commandLog.length, 2);
  // 重送也不能被用來「還原」：目前世界的課表仍含兩筆
  assert.equal(again.state.schedule.overrides.length, 2);
  // 以目前 revision 重送同命令也一樣
  const again2 = C.dispatch(frozen, cmd('c-1', 2, 'assignSlot', { discipleId: P, slotIndex: 3, action: 'gather-material' }));
  assert.equal(again2.duplicate, true);
  assert.equal(hash(again2.state), h);
});

test('同 id 異 payload 或異 type 不得成為新操作（command_id_conflict）', () => {
  const P = State.PROTAGONIST_ID;
  const first = C.dispatch(world(), cmd('c-1', 0, 'assignSlot', { discipleId: P, slotIndex: 3, action: 'gather-material' }));
  const w = first.state;
  assertRejected(w, cmd('c-1', 1, 'assignSlot', { discipleId: P, slotIndex: 3, action: 'cultivate' }), 'command_id_conflict');
  assertRejected(w, cmd('c-1', 1, 'assignSlot', { discipleId: P, slotIndex: 4, action: 'gather-material' }), 'command_id_conflict');
  assertRejected(w, cmd('c-1', 1, 'setDailyTemplate', { discipleId: P, parts: ['rest', 'rest', 'rest'] }), 'command_id_conflict');
  // key 順序不同的同一 payload 仍視為同一個命令
  const same = C.dispatch(w, cmd('c-1', 1, 'assignSlot', { action: 'gather-material', slotIndex: 3, discipleId: P }));
  assert.equal(same.ok, true);
  assert.equal(same.duplicate, true);
});

test('expectedRevision 過期或超前都被拒絕；被拒絕的命令不寫紀錄，id 之後仍可使用', () => {
  const P = State.PROTAGONIST_ID;
  const first = C.dispatch(world(), cmd('c-1', 0, 'assignSlot', { discipleId: P, slotIndex: 3, action: 'rest' }));
  const w = first.state;
  const payload = { discipleId: P, slotIndex: 4, action: 'rest' };
  assertRejected(w, cmd('c-2', 0, 'assignSlot', payload), 'stale_revision');
  assertRejected(w, cmd('c-2', 5, 'assignSlot', payload), 'revision_ahead');
  assert.equal(w.commandLog.length, 1);
  const ok = C.dispatch(w, cmd('c-2', 1, 'assignSlot', payload));
  assert.equal(ok.ok, true, '被拒絕過的 id 之後可正常使用（拒絕不佔 id）');
  assert.equal(ok.duplicate, false);
});

test('順序：世界驗證 → 封套 → 去重 → revision → 命令類型 → 命令內容', () => {
  const P = State.PROTAGONIST_ID;
  const w = C.dispatch(world(), cmd('c-1', 0, 'assignSlot', { discipleId: P, slotIndex: 3, action: 'rest' })).state;
  // 去重在 revision 之前
  assert.equal(C.dispatch(w, cmd('c-1', 0, 'assignSlot', { discipleId: P, slotIndex: 3, action: 'rest' })).duplicate, true);
  // revision 在命令類型之前：過期的未知命令回 stale_revision
  assertRejected(w, cmd('c-9', 0, 'castSpell', {}), 'stale_revision');
  assertRejected(w, cmd('c-9', 1, 'castSpell', {}), 'unknown_command');
  // 命令類型在命令內容之前
  assertRejected(w, cmd('c-9', 1, 'queueBuild', { garbage: true }), 'not_supported_yet');
  // 封套在去重之前
  assertRejected(w, cmd('c-1', -1, 'assignSlot', { discipleId: P, slotIndex: 3, action: 'rest' }), 'bad_command');
});

test('每個被接受的命令 revision 恰好 +1，commandLog 序號連續，整個序列可由初始世界重播得到同一 hash', () => {
  const P = State.PROTAGONIST_ID;
  const M = State.MASTER_ID;
  const script = [
    ['a1', 'assignSlot', { discipleId: P, slotIndex: 0, action: 'cultivate' }],
    ['a2', 'setDailyTemplate', { discipleId: M, parts: ['cultivate', 'rest', 'tune-mind'] }],
    ['a3', 'assignSlot', { discipleId: M, slotIndex: 4, action: 'gather-material' }],
    ['a4', 'assignSlot', { discipleId: P, slotIndex: 0, action: null }],
  ];
  const run = () => {
    let w = world('replay');
    for (const [id, type, payload] of script) {
      const r = C.dispatch(w, cmd(id, w.revision, type, payload));
      assert.equal(r.ok, true, JSON.stringify(r));
      assert.equal(r.state.revision, w.revision + 1);
      w = r.state;
    }
    return w;
  };
  const a = run();
  const b = run();
  assert.equal(hash(a), hash(b));
  assert.deepEqual(a.commandLog.map((c) => c.seq), [1, 2, 3, 4]);
  assert.deepEqual(a.rngState, world('replay').rngState, '課表編輯不消耗 RNG');
  const back = State.parseState(State.serializeState(a));
  assert.equal(back.ok, true);
  assert.equal(hash(back.state), hash(a));
});

// ---------- chooseEvent ----------

test('chooseEvent：援村求援「我去幫忙」只出現提示，不發資源、不完成援村、不新增角色，回 planning', () => {
  const w = pendingWorld(['evt-village-plea'], 9);
  const r = C.dispatch(deepFreeze(clone(w)), cmd('c-1', w.revision, 'chooseEvent', { eventId: 'evt-village-plea', optionId: 'opt-aid-accept' }));
  assert.equal(r.ok, true, JSON.stringify(r));
  const s = r.state;
  assert.equal(s.phase, 'planning');
  assert.deepEqual(s.pendingEvents, []);
  assert.deepEqual(s.resources, w.resources);
  assert.deepEqual(s.disciples, w.disciples);
  assert.deepEqual(s.story.rescues, []);
  assert.equal(s.story.organisationStatus, 'dojo');
  assert.equal(s.slotIndex, 9);
  assert.equal(s.revision, w.revision + 1);
  assert.deepEqual(s.rngState, w.rngState);
  assert.deepEqual(r.events.map((e) => e.type), ['eventChosen', 'aidPromptShown']);
  assert.equal(r.events[1].aidId, Rules.AID_ID);
  assert.deepEqual(State.validateWorld(s), { ok: true });
  // 「稍後再說」沒有任何效果事件
  const later = C.dispatch(w, cmd('c-2', w.revision, 'chooseEvent', { eventId: 'evt-village-plea', optionId: 'opt-aid-later' }));
  assert.equal(later.ok, true);
  assert.deepEqual(later.events.map((e) => e.type), ['eventChosen']);
  assert.equal(later.state.phase, 'planning');
});

test('chooseEvent 只處理目前合法的待選事件；已處理的事件即使換新命令 id 也不再套用', () => {
  const w = pendingWorld(['evt-village-plea'], 9);
  const pick = (cw, id, payload) => cmd(id, cw.revision, 'chooseEvent', payload);
  assertRejected(w, pick(w, 'x1', { eventId: 'evt-ghost', optionId: 'opt-aid-accept' }), 'not_pending');
  assertRejected(w, pick(w, 'x2', { eventId: 'evt-phase-omen', optionId: 'opt-aid-accept' }), 'not_pending');
  assertRejected(w, pick(w, 'x3', { eventId: 'evt-village-plea', optionId: 'opt-x' }), 'unknown_option');
  assertRejected(w, pick(w, 'x4', { eventId: 'evt-village-plea', optionId: 'opt-invite-cand-1-accept' }), 'unknown_option');
  assertRejected(w, pick(w, 'x5', { eventId: 'evt-village-plea' }), 'bad_payload');
  assertRejected(w, pick(w, 'x6', { eventId: 'evt-village-plea', optionId: 'opt-aid-accept', effects: [{ type: 'grantAidReward' }] }), 'bad_payload');
  assertRejected(w, pick(w, 'x7', { eventId: 5, optionId: 'opt-aid-accept' }), 'bad_payload');
  const done = C.dispatch(w, pick(w, 'ok', { eventId: 'evt-village-plea', optionId: 'opt-aid-accept' })).state;
  // 已不在待選：換新 id、同選項再送 → 拒絕（不是重複發效果）；沒有待選時整體回 no_pending_event
  assertRejected(done, pick(done, 'again', { eventId: 'evt-village-plea', optionId: 'opt-aid-accept' }), 'no_pending_event');
  // 兩個待選：處理其一後另一個仍待選、仍是 awaitingChoice
  const two = rescuedStory(pendingWorld(['evt-village-plea', 'evt-invite-cand-1'], 18));
  const r1 = C.dispatch(two, pick(two, 'p', { eventId: 'evt-village-plea', optionId: 'opt-aid-later' }));
  assert.equal(r1.ok, true);
  assert.equal(r1.state.phase, 'awaitingChoice');
  assert.deepEqual(r1.state.pendingEvents.map((e) => e.id), ['evt-invite-cand-1']);
  assertRejected(r1.state, pick(r1.state, 'p2', { eventId: 'evt-village-plea', optionId: 'opt-aid-later' }), 'not_pending');
});

test('chooseEvent 沒有待選（planning／ending）回 no_pending_event', () => {
  const w = world();
  assertRejected(w, cmd('c', 0, 'chooseEvent', { eventId: 'evt-village-plea', optionId: 'opt-aid-accept' }), 'no_pending_event');
  const e = world();
  e.slotIndex = 42;
  e.revision = 42;
  e.phase = 'ending';
  e.story.organisationStatus = 'sectFounded';
  e.story.rescues = [{ id: Rules.AID_ID, completedSlotIndex: 12, rewardClaimed: true }];
  assert.deepEqual(State.validateWorld(e), { ok: true });
  assertRejected(e, cmd('c', 42, 'chooseEvent', { eventId: 'evt-ending-victory', optionId: 'opt-x' }), 'no_pending_event');
});

test('招募確認／稍後只改邀請狀態，不新增角色、不發資源；cand-1 一次只一個狀態轉移', () => {
  const w = rescuedStory(pendingWorld(['evt-invite-cand-1'], 18));
  const yes = C.dispatch(w, cmd('c1', w.revision, 'chooseEvent', { eventId: 'evt-invite-cand-1', optionId: 'opt-invite-cand-1-accept' }));
  assert.equal(yes.ok, true, JSON.stringify(yes));
  assert.deepEqual(yes.state.story.invitations['cand-1'], { status: 'invited', joinSlotIndex: null });
  assert.equal(yes.state.disciples.length, 2, '確認不會直接新增角色');
  assert.deepEqual(yes.state.resources, w.resources);
  assert.deepEqual(yes.events.map((e) => e.type), ['eventChosen', 'invitationStatusSet']);
  assert.equal(yes.state.phase, 'planning');
  const no = C.dispatch(w, cmd('c2', w.revision, 'chooseEvent', { eventId: 'evt-invite-cand-1', optionId: 'opt-invite-cand-1-later' }));
  assert.equal(no.ok, true);
  assert.equal(no.state.story.invitations['cand-1'].status, 'deferred');
  assert.equal(no.state.disciples.length, 2);
  // 第二位候選不能先於第一位（驗證器與事件資料雙重保證）
  const bad = rescuedStory(pendingWorld(['evt-invite-cand-2'], 18));
  const r = C.dispatch(bad, cmd('c3', bad.revision, 'chooseEvent', { eventId: 'evt-invite-cand-2', optionId: 'opt-invite-cand-2-accept' }));
  assert.equal(r.ok, false);
});

test('邀請已不是 locked 時不能再次套用邀請選擇（只提示一次）：invalid_state、世界不變', () => {
  const w = rescuedStory(pendingWorld(['evt-invite-cand-1'], 18));
  w.story.invitations['cand-1'] = { status: 'deferred', joinSlotIndex: null };
  assert.deepEqual(C.validateEngineWorld(w), { ok: true });
  assertRejected(w, cmd('c', w.revision, 'chooseEvent', { eventId: 'evt-invite-cand-1', optionId: 'opt-invite-cand-1-accept' }), 'invalid_state');
});

test('危機待選的 chooseEvent 回 not_supported_yet（屬 SG-06）：不寫 ending、不假勝利、世界不變', () => {
  const w = pendingWorld(['evt-beast-crisis'], 42);
  const r = assertRejected(w, cmd('c', w.revision, 'chooseEvent', { eventId: 'evt-beast-crisis', optionId: 'opt-crisis-submit' }), 'not_supported_yet');
  assert.ok(r.reason.includes('SG-06'), r.reason);
  assert.equal(w.phase, 'awaitingChoice');
  assert.equal(w.story.organisationStatus, 'dojo');
});

// ---------- 引擎層世界驗證 ----------

test('validateEngineWorld：未知待選事件、未支援的排課行動、待選未登記為已觸發都被拒絕', () => {
  const base = pendingWorld(['evt-village-plea'], 9);
  const mk = (fn) => { const w = clone(base); fn(w); return C.validateEngineWorld(w); };
  assert.equal(mk((w) => { w.pendingEvents[0].id = 'evt-ghost'; w.story.triggeredEventIds = ['evt-ghost']; }).code, 'unknown_pending_event');
  assert.equal(mk((w) => { w.pendingEvents[0].id = 'evt-phase-omen'; w.story.triggeredEventIds = ['evt-phase-omen']; }).code, 'unknown_pending_event');
  assert.equal(mk((w) => { w.story.triggeredEventIds = []; }).code, 'pending_not_triggered');
  assert.equal(mk((w) => { w.schedule.templates[State.MASTER_ID] = ['rest', 'build', 'rest']; }).code, 'unsupported_scheduled_action');
  assert.equal(mk((w) => { w.schedule.overrides.push({ discipleId: State.MASTER_ID, slotIndex: 20, action: 'brew' }); }).code, 'unsupported_scheduled_action');
  assert.equal(mk((w) => { w.story.triggeredEventIds.push('evt-ghost'); }).code, 'unknown_triggered_event');
  assert.equal(mk((w) => { w.schema = 1; w.schemaVersion = 1; }).code, 'unknown_schema_version');
  assert.deepEqual(C.validateEngineWorld(base), { ok: true });
});

test('scheduledAction：覆寫優先於範本，範本優先於預設休養；每日三格以 slotIndex % 3 對應', () => {
  const P = State.PROTAGONIST_ID;
  let w = world();
  assert.deepEqual(C.scheduledAction(w, P, 4), { action: 'rest', source: 'default' });
  w = C.dispatch(w, cmd('t', 0, 'setDailyTemplate', { discipleId: P, parts: ['gather-material', 'cultivate', 'tune-mind'] })).state;
  assert.deepEqual(C.scheduledAction(w, P, 3), { action: 'gather-material', source: 'template' });
  assert.deepEqual(C.scheduledAction(w, P, 4), { action: 'cultivate', source: 'template' });
  assert.deepEqual(C.scheduledAction(w, P, 5), { action: 'tune-mind', source: 'template' });
  w = C.dispatch(w, cmd('o', 1, 'assignSlot', { discipleId: P, slotIndex: 4, action: 'rest' })).state;
  assert.deepEqual(C.scheduledAction(w, P, 4), { action: 'rest', source: 'override' });
  assert.deepEqual(C.scheduledAction(w, P, 7), { action: 'cultivate', source: 'template' });
  assert.deepEqual(C.scheduledAction(w, State.MASTER_ID, 4), { action: 'rest', source: 'default' });
});

test('payloadHash 與 key 順序無關，對不同內容不同', () => {
  const a = C.payloadHash('assignSlot', { x: 1, y: [1, 2] });
  assert.equal(a, C.payloadHash('assignSlot', { y: [1, 2], x: 1 }));
  assert.notEqual(a, C.payloadHash('assignSlot', { x: 1, y: [2, 1] }));
  assert.notEqual(a, C.payloadHash('setDailyTemplate', { x: 1, y: [1, 2] }));
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('命令層不改版本：ruleVersion 2／schema 2／rng 1，story-data 內容版本不變', () => {
  assert.equal(State.RULE_VERSION, 2);
  assert.equal(State.SCHEMA_VERSION, 2);
  assert.equal(SD.STORY_DATA.requiresRuleVersion, Rules.RULE_VERSION);
});
