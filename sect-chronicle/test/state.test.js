'use strict';
// SG-01 state schema／canonical hash 測試。
// AC-C11 在 SG-01 範圍內只證明「結構層級」：欄位、型別、已宣告暫定常數、存讀與 hash；
// 正式的模板預算、加點上限、性格枚舉數值待 SG-02 凍結後補驗。
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Rng = require('../js/rng.js');
const S = require('../js/state.js');
const Rules = require('../js/rules.js');

const clone = (x) => JSON.parse(JSON.stringify(x));
const world = (seed = 'seed-a', opts) => {
  const r = S.newWorld(seed, 'slice-14', opts);
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.state;
};
const L = S.CHARACTER_OPTION_LIMITS;
const optionsFor = (templateId, allocation = { rootBone: 1, comprehension: 1, craft: 1 },
  personality = { risk: 'cautious', bond: 'independent' }) => ({ templateId, allocation, personality });

// 手工建立「已收一名學徒、第 21 格」的合法中途狀態
function withApprentice() {
  const w = world();
  w.slotIndex = 21;
  w.revision = 21;
  w.story.rescues = [{ id: 'rescue-1', completedSlotIndex: 12, rewardClaimed: true }];
  w.story.invitations['cand-1'] = { status: 'accepted', joinSlotIndex: 20 };
  w.disciples.push({
    id: 'cand-1', role: 'apprentice',
    attributes: { rootBone: 3, comprehension: 3, craft: 3 },
    stamina: 100, mind: 60, cultivation: 0, injury: 0, joinSlotIndex: 20,
  });
  return w;
}

test('版本常數：SG-04 schema 3、SG-02 凍結 ruleVersion 2、rng 1', () => {
  assert.equal(S.SCHEMA_VERSION, 3);
  assert.equal(S.RULE_VERSION, 2);
  assert.equal(S.RNG_VERSION, Rng.RNG_VERSION);
  assert.equal(S.SCENARIOS['slice-14'].totalSlots, 42);
});

test('預設新局：欄位齊全、師徒兩人、候選另存、story 初值', () => {
  const w = world('seed-a');
  assert.equal(w.schemaVersion, 3);
  assert.equal(w.ruleVersion, 2);
  assert.deepEqual(w.schedule, { templates: {}, overrides: [] });
  assert.equal(w.rngVersion, 1);
  assert.equal(w.seed, 'seed-a');
  assert.equal(w.scenarioId, 'slice-14');
  assert.equal(w.slotIndex, 0);
  assert.equal(w.phase, 'planning');
  assert.equal(w.revision, 0);
  assert.deepEqual(w.rngState, Rng.create('seed-a'));
  assert.deepEqual(w.characterOptions, S.DEFAULT_CHARACTER_OPTIONS);
  assert.equal(w.protagonistId, S.PROTAGONIST_ID);
  assert.equal(w.masterId, S.MASTER_ID);
  assert.notEqual(w.protagonistId, w.masterId);
  assert.deepEqual(w.disciples.map((d) => [d.id, d.role]),
    [[S.MASTER_ID, 'master'], [S.PROTAGONIST_ID, 'protagonist']]);
  assert.deepEqual(w.candidates.map((c) => c.id), ['cand-1', 'cand-2']);
  for (const k of ['jobs', 'reservations', 'pendingEvents', 'commandLog', 'eventLog']) {
    assert.deepEqual(w[k], [], k);
  }
  assert.equal(w.tiles.length, 25, 'SG-04 起新局帶固定 25 格地圖');
  assert.deepEqual(w.inventory, { 'breakthrough-pill': 0 });
  assert.deepEqual(w.resources, { spiritMaterial: 0, spiritHerb: 0, spiritStone: 0, reputation: 0 });
  assert.deepEqual(w.story, {
    rescues: [],
    triggeredEventIds: [],
    invitations: {
      'cand-1': { status: 'locked', joinSlotIndex: null },
      'cand-2': { status: 'locked', joinSlotIndex: null },
    },
    organisationStatus: 'dojo',
  });
  assert.deepEqual(S.validateWorld(w), { ok: true });
  for (const d of w.disciples) assert.equal(d.joinSlotIndex, 0);
});

test('候選不在 disciples、不參與 roster；預設只有兩人', () => {
  const w = world();
  assert.equal(w.disciples.some((d) => d.id.startsWith('cand-')), false);
  assert.deepEqual(S.rosterAt(w, 0).map((d) => d.id), [S.MASTER_ID, S.PROTAGONIST_ID]);
  assert.equal(S.MAX_ROSTER, 4);
});

test('所有模板同預算；主角屬性＝模板基底＋配點', () => {
  const totals = new Set();
  for (const [id, base] of Object.entries(L.templates)) {
    totals.add(base.rootBone + base.comprehension + base.craft);
    const w = world('t', optionsFor(id, { rootBone: 1, comprehension: 1, craft: 1 }));
    const p = w.disciples.find((d) => d.id === S.PROTAGONIST_ID);
    assert.deepEqual(p.attributes, {
      rootBone: base.rootBone + 1, comprehension: base.comprehension + 1, craft: base.craft + 1,
    });
    assert.equal(p.templateId, id);
  }
  assert.equal(totals.size, 1, '暫定模板基底總和必須相同');
  assert.equal(Object.keys(L.templates).length, 3);
  assert.equal(L.freePoints, 3);
});

test('配點可偏向單一屬性，且每項不超過暫定上限', () => {
  const w = world('t', optionsFor('dojo-apprentice', { rootBone: 3, comprehension: 0, craft: 0 }));
  const p = w.disciples.find((d) => d.id === S.PROTAGONIST_ID);
  assert.equal(p.attributes.rootBone, L.templates['dojo-apprentice'].rootBone + 3);
  assert.ok(p.attributes.rootBone <= L.attributeMax);
});

test('兩軸性格四種組合皆可建局，且各自改變 canonical hash（不被排除）', () => {
  const hashes = new Set();
  for (const risk of L.personality.risk) {
    for (const bond of L.personality.bond) {
      const w = world('p', optionsFor('dojo-apprentice', { rootBone: 1, comprehension: 1, craft: 1 }, { risk, bond }));
      assert.deepEqual(w.characterOptions.personality, { risk, bond });
      hashes.add(S.hashWorld(w));
    }
  }
  assert.equal(hashes.size, 4);
  assert.deepEqual(L.personality.risk, ['cautious', 'bold']);
  assert.deepEqual(L.personality.bond, ['independent', 'caring']);
});

test('性格不改變任何屬性或效率欄位（無隱藏倍率）', () => {
  const a = world('p', optionsFor('dojo-apprentice', undefined, { risk: 'cautious', bond: 'independent' }));
  const b = world('p', optionsFor('dojo-apprentice', undefined, { risk: 'bold', bond: 'caring' }));
  assert.deepEqual(a.disciples, b.disciples);
  assert.deepEqual(a.resources, b.resources);
  assert.deepEqual(a.rngState, b.rngState);
});

test('非法 characterOptions 全部拒絕，不建立部分世界', () => {
  const ok = optionsFor('dojo-apprentice');
  const mut = (fn) => { const o = clone(ok); fn(o); return o; };
  const cases = {
    '負點': mut((o) => { o.allocation.rootBone = -1; o.allocation.craft = 3; }),
    '超額': mut((o) => { o.allocation.rootBone = 2; }),
    '不足': mut((o) => { o.allocation.craft = 0; }),
    '單項超過上限': optionsFor('herb-child', { rootBone: 0, comprehension: 0, craft: 3 }),
    '未知模板': mut((o) => { o.templateId = 'god-mode'; }),
    '模板非字串': mut((o) => { o.templateId = 7; }),
    '未知性格值': mut((o) => { o.personality.risk = 'reckless'; }),
    '缺性格軸': mut((o) => { delete o.personality.bond; }),
    '缺配點欄': mut((o) => { delete o.allocation.craft; }),
    '缺 allocation': mut((o) => { delete o.allocation; }),
    '多餘配點鍵': mut((o) => { o.allocation.luck = 0; }),
    '多餘頂層鍵': mut((o) => { o.bonus = 1; }),
    '小數點': mut((o) => { o.allocation.rootBone = 1.5; o.allocation.comprehension = 0.5; o.allocation.craft = 1; }),
    'NaN': mut((o) => { o.allocation.rootBone = NaN; }),
    '字串點數': mut((o) => { o.allocation.rootBone = '1'; }),
    'null': null,
    '陣列': [],
    '字串': 'default',
  };
  for (const [name, o] of Object.entries(cases)) {
    const r = S.newWorld('seed-a', 'slice-14', o);
    assert.equal(r.ok, false, name);
    assert.equal(r.code, 'bad_character_options', name);
    assert.ok(typeof r.reason === 'string' && r.reason.length > 0, name);
    assert.equal('state' in r, false, name);
    assert.equal(S.validateCharacterOptions(o).ok, false, name);
  }
});

test('newWorld 不修改傳入的 characterOptions，也不與常數共用參考', () => {
  const o = Object.freeze({
    templateId: 'farmer-child',
    allocation: Object.freeze({ rootBone: 1, comprehension: 1, craft: 1 }),
    personality: Object.freeze({ risk: 'bold', bond: 'caring' }),
  });
  const w = world('seed-a', o);
  w.characterOptions.allocation.craft = 99;
  w.disciples[0].attributes.craft = 99;
  w.story.invitations['cand-1'].status = 'accepted';
  const w2 = world('seed-a', o);
  assert.equal(w2.characterOptions.allocation.craft, 1);
  assert.notEqual(w2.disciples[0].attributes.craft, 99);
  assert.equal(w2.story.invitations['cand-1'].status, 'locked');
  assert.equal(world().characterOptions.allocation.craft, S.DEFAULT_CHARACTER_OPTIONS.allocation.craft);
});

test('seed 與 scenarioId 驗證', () => {
  for (const bad of ['', 12, null, undefined, {}, 'x'.repeat(65)]) {
    const r = S.newWorld(bad, 'slice-14');
    assert.equal(r.ok, false, String(bad));
    assert.equal(r.code, 'bad_seed');
  }
  const r = S.newWorld('ok', 'slice-28');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'unknown_scenario');
  assert.equal(S.newWorld('ok').ok, true, 'scenarioId 預設為 slice-14');
  assert.equal(S.newWorld('ok', undefined, undefined).state.scenarioId, 'slice-14');
});

test('決定性：同 seed＋同設定相同；換 seed 或設定即不同（回放輸入包含角色設定）', () => {
  const a = world('seed-a');
  const b = world('seed-a');
  assert.deepEqual(a, b);
  assert.equal(S.hashWorld(a), S.hashWorld(b));
  assert.notEqual(S.hashWorld(a), S.hashWorld(world('seed-b')));
  assert.notEqual(S.hashWorld(a), S.hashWorld(world('seed-a', optionsFor('herb-child'))));
  assert.notEqual(S.hashWorld(a),
    S.hashWorld(world('seed-a', optionsFor('dojo-apprentice', { rootBone: 3, comprehension: 0, craft: 0 }))));
});

test('不可變角色 ID 不隨 seed／設定改變', () => {
  for (let i = 0; i < 10; i++) {
    const w = world(`s${i}`, optionsFor(Object.keys(L.templates)[i % 3]));
    assert.equal(w.masterId, 'disc-master');
    assert.equal(w.protagonistId, 'disc-protagonist');
    assert.deepEqual(w.candidates.map((c) => c.id), ['cand-1', 'cand-2']);
  }
});

test('20 seed × 42 次 RNG 回放：世界內 rngState 可接續且重現', () => {
  for (let i = 0; i < 20; i++) {
    const w1 = world(`sg-bal-${i}`);
    const w2 = world(`sg-bal-${i}`);
    let s1 = w1.rngState; let s2 = w2.rngState;
    for (let k = 0; k < 42; k++) { s1 = Rng.nextUint32(s1).state; s2 = Rng.nextUint32(s2).state; }
    assert.deepEqual(s1, s2);
    assert.deepEqual(w1.rngState, Rng.create(`sg-bal-${i}`), '建局本身不消耗抽樣');
  }
});

// ---------- validateWorld：版本與結構 ----------

test('未知版本明確拒絕且不修改輸入', () => {
  for (const [field, code] of [['schemaVersion', 'unknown_schema_version'],
    ['ruleVersion', 'unknown_rule_version'], ['rngVersion', 'unknown_rng_version']]) {
    const w = world();
    w[field] = 99;
    const before = clone(w);
    const r = S.validateWorld(w);
    assert.equal(r.ok, false, field);
    assert.equal(r.code, code, field);
    assert.ok(r.reason.includes(field), r.reason);
    assert.deepEqual(w, before);
  }
});

test('缺欄位／型別錯誤／非物件', () => {
  for (const bad of [null, undefined, 5, 'x', [], true]) {
    const r = S.validateWorld(bad);
    assert.equal(r.ok, false);
    assert.equal(r.code, 'not_object');
  }
  const required = ['schemaVersion', 'ruleVersion', 'rngVersion', 'seed', 'slotIndex', 'phase', 'revision',
    'rngState', 'resources', 'tiles', 'disciples', 'candidates', 'jobs', 'reservations', 'pendingEvents',
    'commandLog', 'eventLog', 'scenarioId', 'characterOptions', 'protagonistId', 'masterId', 'story', 'schedule'];
  for (const k of required) {
    const w = world();
    delete w[k];
    const r = S.validateWorld(w);
    assert.equal(r.ok, false, k);
    assert.ok(['missing_field', 'unknown_schema_version', 'unknown_rule_version', 'unknown_rng_version'].includes(r.code), `${k}:${r.code}`);
    assert.ok(r.reason.includes(k), r.reason);
  }
  const typeBad = [['seed', 5], ['slotIndex', '3'], ['phase', 7], ['jobs', {}], ['tiles', null],
    ['disciples', 'x'], ['resources', []], ['story', 3], ['commandLog', {}], ['protagonistId', 5]];
  for (const [k, v] of typeBad) {
    const w = world();
    w[k] = v;
    const r = S.validateWorld(w);
    assert.equal(r.ok, false, k);
    assert.ok(r.reason.length > 0);
  }
});

test('未知頂層欄位被拒絕（不可夾帶不入 hash 的資料）', () => {
  const w = world();
  w.extra = 1;
  const r = S.validateWorld(w);
  assert.equal(r.ok, false);
  assert.equal(r.code, 'unknown_field');
});

test('數值必須是安全整數：小數、NaN、Infinity、負值、-0 一律拒絕', () => {
  const muts = [
    (w) => { w.slotIndex = 1.5; },
    (w) => { w.revision = NaN; },
    (w) => { w.resources.spiritHerb = Infinity; },
    (w) => { w.resources.spiritMaterial = -1; },
    (w) => { w.resources.reputation = 0.1; },
    (w) => { w.disciples[0].stamina = 50.5; },
    (w) => { w.disciples[0].injury = -1; },
    (w) => { w.revision = -0; },
    (w) => { w.revision = 2 ** 53; },
  ];
  for (const m of muts) {
    const w = world();
    m(w);
    const r = S.validateWorld(w);
    assert.equal(r.ok, false, m.toString());
    assert.ok(['non_integer', 'bad_value'].includes(r.code), r.code);
  }
});

test('slotIndex ≤ 42，且 phase 與 slotIndex／待選事件一致', () => {
  const mk = (fn) => { const w = world(); fn(w); return S.validateWorld(w); };
  assert.equal(mk((w) => { w.slotIndex = 43; w.phase = 'ending'; w.story.organisationStatus = 'sectFounded'; }).ok, false);
  assert.equal(mk((w) => { w.slotIndex = -1; }).ok, false);
  // planning 不得在 42（42 後必須先待選）
  assert.equal(mk((w) => { w.slotIndex = 42; }).ok, false);
  assert.equal(mk((w) => { w.slotIndex = 41; w.revision = 41; }).ok, true);
  // awaitingChoice 需有待選事件；planning 不得有待選事件
  assert.equal(mk((w) => { w.phase = 'awaitingChoice'; }).ok, false);
  assert.equal(mk((w) => { w.pendingEvents = [{ id: 'evt-x', raisedSlotIndex: 0 }]; }).ok, false);
  assert.equal(mk((w) => { w.phase = 'awaitingChoice'; w.pendingEvents = [{ id: 'evt-x', raisedSlotIndex: 0 }]; }).ok, true);
  // 獸患待選：slotIndex = 42、awaitingChoice
  assert.equal(mk((w) => { w.slotIndex = 42; w.revision = 42; w.phase = 'awaitingChoice'; w.pendingEvents = [{ id: 'crisis-beast', raisedSlotIndex: 42 }]; }).ok, true);
  // resolving 不可被保存
  const r = mk((w) => { w.phase = 'resolving'; });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'phase_not_persistable');
  // 未知 phase
  assert.equal(mk((w) => { w.phase = 'dreaming'; }).ok, false);
});

test('ending 只在 slotIndex = 42，且必須已決定 organisationStatus；非 ending 不得為已立派／暫緩', () => {
  const mk = (fn) => { const w = world(); fn(w); return S.validateWorld(w); };
  for (const status of ['sectFounded', 'foundingDeferred']) {
    assert.equal(mk((w) => { w.slotIndex = 42; w.revision = 43; w.phase = 'ending'; w.story.organisationStatus = status; }).ok, true, status);
    assert.equal(mk((w) => { w.slotIndex = 10; w.phase = 'ending'; w.story.organisationStatus = status; }).ok, false, status);
    assert.equal(mk((w) => { w.story.organisationStatus = status; }).ok, false, status);
  }
  assert.equal(mk((w) => { w.slotIndex = 42; w.phase = 'ending'; }).ok, false, 'ending 不可仍是 dojo');
  assert.equal(mk((w) => { w.story.organisationStatus = 'chief'; }).ok, false);
});

test('roster 一致性：身分、重複 ID、學徒須有已接受邀請、上限四人', () => {
  const mk = (fn, base = world) => { const w = base(); fn(w); return S.validateWorld(w); };
  assert.equal(mk((w) => { w.protagonistId = w.masterId; }).ok, false);
  assert.equal(mk((w) => { w.disciples[1].id = w.disciples[0].id; }).ok, false);
  assert.equal(mk((w) => { w.disciples[0].role = 'protagonist'; }).ok, false);
  assert.equal(mk((w) => { w.disciples.pop(); }).ok, false);
  assert.equal(mk((w) => { w.masterId = 'someone'; }).ok, false);
  // 無已接受邀請的學徒
  assert.equal(mk((w) => {
    w.disciples.push({ id: 'cand-1', role: 'apprentice', attributes: { rootBone: 3, comprehension: 3, craft: 3 },
      stamina: 100, mind: 60, cultivation: 0, injury: 0, joinSlotIndex: 0 });
  }).ok, false);
  // 已接受邀請但沒有學徒
  assert.equal(mk((w) => { w.story.invitations['cand-1'] = { status: 'accepted', joinSlotIndex: 0 }; }).ok, false);
  // 合法的一人與兩人
  assert.deepEqual(S.validateWorld(withApprentice()), { ok: true });
  const two = withApprentice();
  two.story.invitations['cand-2'] = { status: 'accepted', joinSlotIndex: 21 };
  two.disciples.push({ id: 'cand-2', role: 'apprentice', attributes: { rootBone: 2, comprehension: 4, craft: 3 },
    stamina: 100, mind: 60, cultivation: 0, injury: 0, joinSlotIndex: 21 });
  assert.deepEqual(S.validateWorld(two), { ok: true });
  // 超過四人
  const five = clone(two);
  five.disciples.push({ id: 'cand-3', role: 'apprentice', attributes: { rootBone: 2, comprehension: 4, craft: 3 },
    stamina: 100, mind: 60, cultivation: 0, injury: 0, joinSlotIndex: 21 });
  assert.equal(S.validateWorld(five).ok, false);
});

test('邀請狀態：joinSlotIndex 與接受狀態對應、不得晚於目前 slotIndex、需先完成援村、依序', () => {
  const mk = (fn) => { const w = withApprentice(); fn(w); return S.validateWorld(w); };
  assert.equal(mk((w) => { w.story.invitations['cand-1'].joinSlotIndex = 19; }).ok, false, '與 disciple 不一致');
  assert.equal(mk((w) => { w.story.invitations['cand-1'].joinSlotIndex = null; }).ok, false);
  assert.equal(mk((w) => { w.disciples[2].joinSlotIndex = 22; w.story.invitations['cand-1'].joinSlotIndex = 22; }).ok, false, '加入格不得在未來');
  assert.equal(mk((w) => { w.story.invitations['cand-1'] = { status: 'invited', joinSlotIndex: 20 }; }).ok, false);
  assert.equal(mk((w) => { w.story.rescues = []; }).ok, false, '未援村不得有邀請進度');
  assert.equal(mk((w) => { w.story.invitations['cand-1'] = { status: 'locked', joinSlotIndex: null };
    w.disciples.pop(); w.story.invitations['cand-2'] = { status: 'invited', joinSlotIndex: null }; }).ok, false, '第二位不可先於第一位');
  assert.equal(mk((w) => { w.story.invitations['cand-1'] = { status: 'deferred', joinSlotIndex: null }; w.disciples.pop(); }).ok, true);
  assert.equal(mk((w) => { w.story.invitations['cand-1'] = { status: 'weird', joinSlotIndex: null }; w.disciples.pop(); }).ok, false);
});

test('援村紀錄與事件 ID 去重', () => {
  const mk = (fn) => { const w = withApprentice(); fn(w); return S.validateWorld(w); };
  assert.equal(mk((w) => { w.story.rescues.push({ id: 'rescue-1', completedSlotIndex: 13, rewardClaimed: true }); }).ok, false, '同一援村不可重複記錄');
  assert.equal(mk((w) => { w.story.rescues[0].completedSlotIndex = 30; }).ok, false, '完成格不得在未來');
  assert.equal(mk((w) => { w.story.rescues[0].rewardClaimed = 'yes'; }).ok, false);
  assert.equal(mk((w) => { w.story.triggeredEventIds = ['a', 'a']; }).ok, false);
  assert.equal(mk((w) => { w.story.triggeredEventIds = ['a', 'b']; }).ok, true);
  assert.equal(mk((w) => { w.story.triggeredEventIds = [3]; }).ok, false);
});

test('characterOptions 與主角屬性必須一致；rngState 驗證', () => {
  const mk = (fn) => { const w = world(); fn(w); return S.validateWorld(w); };
  assert.equal(mk((w) => { w.disciples[1].attributes.craft += 1; }).ok, false);
  assert.equal(mk((w) => { w.characterOptions.templateId = 'herb-child'; }).ok, false);
  assert.equal(mk((w) => { w.characterOptions.allocation.rootBone = 9; }).ok, false);
  assert.equal(mk((w) => { w.rngState = [1, 2, 3]; }).ok, false);
  assert.equal(mk((w) => { w.rngState[0] = -5; }).ok, false);
  assert.equal(mk((w) => { w.scenarioId = 'slice-28'; }).ok, false);
});

test('validateWorld 不修改輸入', () => {
  const w = withApprentice();
  const before = clone(w);
  S.validateWorld(w);
  assert.deepEqual(w, before);
});

// ---------- roster ----------

test('rosterAt：學徒從 joinSlotIndex 起才算工作者；候選與未接受者永不入列', () => {
  const w = withApprentice();
  assert.deepEqual(S.rosterAt(w, 19).map((d) => d.id), [S.MASTER_ID, S.PROTAGONIST_ID]);
  assert.deepEqual(S.rosterAt(w, 20).map((d) => d.id), [S.MASTER_ID, S.PROTAGONIST_ID, 'cand-1']);
  assert.deepEqual(S.rosterAt(w, 41).map((d) => d.id), [S.MASTER_ID, S.PROTAGONIST_ID, 'cand-1']);
  assert.equal(S.rosterAt(w, 30).some((d) => d.id === 'cand-2'), false);
  assert.equal(S.rosterAt(w, 30).length <= S.MAX_ROSTER, true);
});

test('rosterAt 排序穩定：與 disciples 陣列順序無關', () => {
  const w = withApprentice();
  const shuffled = clone(w);
  shuffled.disciples.reverse();
  assert.deepEqual(S.rosterAt(shuffled, 30).map((d) => d.id), S.rosterAt(w, 30).map((d) => d.id));
});

// ---------- canonical／hash ----------

test('canonicalize：key 順序無關、拒絕 undefined／小數／NaN／函式', () => {
  assert.equal(S.canonicalize({ b: 1, a: [2, { d: 1, c: 2 }] }), '{"a":[2,{"c":2,"d":1}],"b":1}');
  assert.equal(S.canonicalize({ a: 1, b: 2 }), S.canonicalize({ b: 2, a: 1 }));
  for (const bad of [{ a: undefined }, { a: 1.5 }, { a: NaN }, { a: () => 1 }, { a: -0 }, { a: Infinity }]) {
    assert.throws(() => S.canonicalize(bad), TypeError, JSON.stringify(Object.keys(bad)));
  }
  assert.throws(() => S.canonicalize([undefined]), TypeError);
});

test('hashWorld = SHA-256(canonical JSON)，與 Node crypto 交叉核對', () => {
  const w = withApprentice();
  const expected = crypto.createHash('sha256').update(S.canonicalize(w), 'utf8').digest('hex');
  assert.equal(S.hashWorld(w), expected);
  assert.match(S.hashWorld(w), /^[0-9a-f]{64}$/);
  assert.equal(S.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(S.sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  for (const s of ['世界', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'a'.repeat(1000)]) {
    assert.equal(S.sha256Hex(s), crypto.createHash('sha256').update(s, 'utf8').digest('hex'), s.slice(0, 5));
  }
});

test('canonical 不排除任何影響世界的欄位：改動任一頂層欄位 hash 皆改變', () => {
  assert.deepEqual(S.CANONICAL_EXCLUDED_FIELDS, []);
  const w = withApprentice();
  const base = S.hashWorld(w);
  const changers = {
    schemaVersion: (x) => { x.schemaVersion = 4; },
    ruleVersion: (x) => { x.ruleVersion = 3; },
    rngVersion: (x) => { x.rngVersion = 2; },
    seed: (x) => { x.seed = 'other'; },
    slotIndex: (x) => { x.slotIndex += 1; },
    phase: (x) => { x.phase = 'awaitingChoice'; },
    revision: (x) => { x.revision += 1; },
    rngState: (x) => { x.rngState[3] ^= 1; },
    resources: (x) => { x.resources.spiritHerb += 1; },
    tiles: (x) => { x.tiles[0].element = 'metal'; },
    inventory: (x) => { x.inventory['breakthrough-pill'] += 1; },
    disciples: (x) => { x.disciples[0].stamina -= 1; },
    candidates: (x) => { x.candidates.reverse(); },
    jobs: (x) => { x.jobs.push({ id: 'j' }); },
    reservations: (x) => { x.reservations.push({ id: 'r' }); },
    pendingEvents: (x) => { x.pendingEvents.push({ id: 'e', raisedSlotIndex: 0 }); },
    commandLog: (x) => { x.commandLog.push({ id: 'c' }); },
    eventLog: (x) => { x.eventLog.push({ id: 'l' }); },
    schedule: (x) => { x.schedule.templates[S.MASTER_ID] = ['rest', 'rest', 'rest']; },
    scenarioId: (x) => { x.scenarioId = 'slice-28'; },
    characterOptions: (x) => { x.characterOptions.personality.risk = 'bold'; },
    protagonistId: (x) => { x.protagonistId = 'p2'; },
    masterId: (x) => { x.masterId = 'm2'; },
    story: (x) => { x.story.triggeredEventIds.push('evt-z'); },
  };
  assert.deepEqual(Object.keys(changers).sort(), Object.keys(w).sort(), '每個欄位都要有測試');
  for (const [k, fn] of Object.entries(changers)) {
    const x = clone(w);
    fn(x);
    assert.notEqual(S.hashWorld(x), base, k);
  }
});

test('hashWorld 與 key 插入順序無關（JSON 往返、重排）', () => {
  const w = withApprentice();
  const reordered = {};
  for (const k of Object.keys(w).reverse()) reordered[k] = w[k];
  assert.equal(S.hashWorld(reordered), S.hashWorld(w));
  assert.equal(S.hashWorld(JSON.parse(S.serializeState(w))), S.hashWorld(w));
});

// ---------- 存讀 ----------

test('serializeState／parseState 往返；壞 JSON 與未知版本明確拒絕', () => {
  const w = withApprentice();
  const text = S.serializeState(w);
  const r = S.parseState(text);
  assert.equal(r.ok, true);
  assert.deepEqual(r.state, w);
  assert.equal(S.hashWorld(r.state), S.hashWorld(w));

  const bad = S.parseState('{not json');
  assert.equal(bad.ok, false);
  assert.equal(bad.code, 'invalid_json');
  assert.equal(S.parseState('123').ok, false);

  const unk = clone(w);
  unk.schemaVersion = 7;
  const u = S.parseState(JSON.stringify(unk));
  assert.equal(u.ok, false);
  assert.equal(u.code, 'unknown_schema_version');

  const broken = clone(w);
  broken.slotIndex = 99;
  assert.equal(S.parseState(JSON.stringify(broken)).ok, false);
  assert.throws(() => S.serializeState({ nope: 1.5 }), TypeError);
});

test('各設定組合皆可存讀且 hash 不變（設定可存讀）', () => {
  for (const tid of Object.keys(L.templates)) {
    for (const risk of L.personality.risk) {
      const w = world('persist', optionsFor(tid, { rootBone: 0, comprehension: 1, craft: 2 }, { risk, bond: 'caring' }));
      const r = S.parseState(S.serializeState(w));
      assert.equal(r.ok, true);
      assert.deepEqual(r.state.characterOptions, w.characterOptions);
      assert.equal(S.hashWorld(r.state), S.hashWorld(w));
    }
  }
});

// ---------- 取整契約 ----------

test('整數取整契約：基點倍率、全程 floor、拒絕非整數', () => {
  assert.equal(S.BASIS_POINTS, 10000);
  assert.equal(S.ROUNDING_MODE, 'floor');
  assert.equal(S.mulBp(100, 12500), 125);
  assert.equal(S.mulBp(7, 3333), 2);
  assert.equal(S.mulBp(-7, 3333), -3);
  assert.equal(S.mulBp(0, 99999), 0);
  assert.equal(S.mulBp(10, 10000), 10);
  for (const [a, b] of [[1.5, 100], [1, 1.5], [NaN, 1], [1, Infinity], ['1', 1]]) {
    assert.throws(() => S.mulBp(a, b), TypeError);
  }
});

// ---------- 載入策略與禁止事項 ----------

test('瀏覽器載入策略：一般 script 載入後取得相同結果（無 module／require）', () => {
  const ctx = vm.createContext({});
  for (const f of ['rng.js', 'rules.js', 'state.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
    vm.runInContext(src, ctx, { filename: f });
  }
  const B = ctx.SectChronicle;
  assert.ok(B && B.Rng && B.Rules && B.State, '應掛在 SectChronicle 命名空間');
  assert.equal(B.State.RULE_VERSION, 2);
  const r = B.State.newWorld('seed-a');
  assert.equal(r.ok, true);
  assert.equal(B.State.hashWorld(r.state), S.hashWorld(world('seed-a')));
  assert.deepEqual([...B.Rng.create('sg-vector-1')], Rng.create('sg-vector-1'));
});

test('瀏覽器若漏載 rules.js，state.js 給出明確錯誤而不是靜默壞掉', () => {
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'rng.js'), 'utf8'), ctx);
  assert.throws(
    () => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'state.js'), 'utf8'), ctx),
    /rules\.js/,
  );
});

test('權威程式碼不使用 Math.random、牆鐘、Date', () => {
  for (const f of ['rng.js', 'rules.js', 'state.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.equal(/Math\.random|Date\.now|new Date|performance\.now/.test(src), false, f);
  }
});

// ---------- 固定 seed fixture ----------

test('固定 seed fixture：hash 與 rngState 與已提交檔案相同', () => {
  const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'new-world.json'), 'utf8'));
  assert.equal(fx.schemaVersion, S.SCHEMA_VERSION);
  assert.equal(fx.ruleVersion, S.RULE_VERSION);
  assert.equal(fx.rngVersion, S.RNG_VERSION);
  assert.ok(fx.cases.length >= 5);
  for (const c of fx.cases) {
    const r = S.newWorld(c.seed, c.scenarioId, c.characterOptions);
    assert.equal(r.ok, true, c.name);
    assert.equal(S.hashWorld(r.state), c.hash, c.name);
    assert.deepEqual(r.state.rngState, c.rngState, c.name);
    assert.equal(S.canonicalize(r.state), c.canonical, c.name);
  }
});

// ---------- PR #74 審查 R1：非 JSON 物件不得被靜默接受 ----------

class Custom { constructor() { this.a = 1; } }
function nonJsonSamples() {
  const nonEnum = {};
  Object.defineProperty(nonEnum, 'hidden', { value: 1, enumerable: false });
  const sym = { a: 1 };
  sym[Symbol('s')] = 2;
  const accessor = {};
  Object.defineProperty(accessor, 'x', { get() { return 1; }, enumerable: true });
  const sparse = [1, , 3]; // eslint-disable-line no-sparse-arrays
  const arrExtra = [1, 2];
  arrExtra.note = 'x';
  return {
    Map: new Map([['cost', 99]]),
    Set: new Set([1]),
    Date: new Date(0),
    RegExp: /x/,
    Error: new Error('x'),
    class實例: new Custom(),
    Uint8Array: new Uint8Array(2),
    WeakMap: new WeakMap(),
    Promise: Promise.resolve(1),
    不可列舉屬性: nonEnum,
    Symbol鍵: sym,
    getter: accessor,
    稀疏陣列: sparse,
    陣列額外屬性: arrExtra,
  };
}

test('審查 R1 重現：eventLog 項目內含 Map 的 world 被 validateWorld 拒絕，序列化也不會靜默遺失', () => {
  const w = world('review-json');
  w.eventLog = [{ seq: 1, type: 'x', slotIndex: 0, payload: new Map([['cost', 99]]) }];
  const rngBefore = [...w.rngState];
  const r = S.validateWorld(w);
  assert.equal(r.ok, false);
  assert.equal(r.code, 'bad_type');
  assert.match(r.reason, /JSON/);
  assert.deepEqual(w.rngState, rngBefore, '拒絕時 RNG 不變');
  assert.throws(() => S.serializeState(w), TypeError);
  assert.throws(() => S.hashWorld(w), TypeError, 'hash 不可與空物件相同');
  const other = world('review-json');
  other.eventLog = [{ seq: 1, type: 'x', slotIndex: 0, payload: {} }];
  assert.equal(S.validateWorld(other).ok, true);
});

test('各種非 JSON 值放在任何位置都被拒絕（巢狀、頂層欄位、story、disciples）', () => {
  const places = {
    jobs巢狀: (w, v) => { w.jobs = [{ id: 'j', deep: { list: [v] } }]; },
    reservations: (w, v) => { w.reservations = [{ id: 'r', v }]; },
    pendingEvents: (w, v) => { w.phase = 'awaitingChoice'; w.pendingEvents = [{ id: 'e', v }]; },
    eventLog: (w, v) => { w.eventLog = [{ seq: 1, type: 't', slotIndex: 0, v }]; },
    resources整個: (w, v) => { w.resources = v; },
    story整個: (w, v) => { w.story = v; },
    story內: (w, v) => { w.story.rescues = [v]; },
    disciple: (w, v) => { w.disciples[0] = v; },
    characterOptions: (w, v) => { w.characterOptions.allocation = v; },
  };
  for (const [vname, v] of Object.entries(nonJsonSamples())) {
    for (const [pname, put] of Object.entries(places)) {
      const w = world('review-json');
      put(w, v);
      const r = S.validateWorld(w);
      assert.equal(r.ok, false, `${vname} @ ${pname}`);
    }
    // 內層位置必須因「非 JSON」被拒絕，而不是因別的原因巧合失敗
    const w = world('review-json');
    w.jobs = [{ id: 'j', deep: { list: [v] } }];
    const r = S.validateWorld(w);
    assert.equal(r.code, 'bad_type', vname);
  }
});

test('canonicalize 與 serializeState 對非 JSON 值丟 TypeError，而不是輸出空物件', () => {
  for (const [name, v] of Object.entries(nonJsonSamples())) {
    assert.throws(() => S.canonicalize({ a: v }), TypeError, name);
    assert.throws(() => S.canonicalize([v]), TypeError, name);
  }
  assert.throws(() => S.canonicalize({ a: [1, , 3] }), TypeError); // eslint-disable-line no-sparse-arrays
});

test('正常 JSON record 仍被接受：巢狀、陣列、null 原型物件、空物件', () => {
  const w = world('review-json');
  const nullProto = Object.create(null);
  nullProto.k = 1;
  w.eventLog = [{ seq: 1, type: 'x', slotIndex: 0, payload: { list: [1, 2, { z: [] }], empty: {}, nothing: null, flag: true, s: '字串' } },
    { seq: 2, type: 'x', slotIndex: 0, payload: nullProto }];
  assert.deepEqual(S.validateWorld(w), { ok: true });
  assert.equal(S.canonicalize(nullProto), '{"k":1}');
  const r = S.parseState(S.serializeState(w));
  assert.equal(r.ok, true);
  assert.equal(S.hashWorld(r.state), S.hashWorld(w), '合法 state 存讀 hash 不變');
  assert.deepEqual(r.state.eventLog[0].payload, w.eventLog[0].payload);
});

test('跨 realm（vm）建立的 JSON record 被接受，跨 realm 的 Map 仍被拒絕', () => {
  const ctx = vm.createContext({});
  for (const f of ['rng.js', 'rules.js', 'state.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
  }
  const B = ctx.SectChronicle.State;
  const foreignRecord = vm.runInContext('({ a: [1, { b: 2 }], c: {} })', ctx);
  const foreignMap = vm.runInContext('new Map([["x", 1]])', ctx);
  // vm 內的狀態含主 realm 的物件，反之亦然
  const w1 = B.newWorld('seed-a').state;
  w1.eventLog = [{ seq: 1, type: 'x', slotIndex: 0, payload: { a: [1, { b: 2 }], c: {} } }];
  assert.equal(B.validateWorld(w1).ok, true);
  const w2 = world('seed-a');
  w2.eventLog = [{ seq: 1, type: 'x', slotIndex: 0, payload: foreignRecord }];
  assert.equal(S.validateWorld(w2).ok, true);
  assert.equal(S.canonicalize(foreignRecord), '{"a":[1,{"b":2}],"c":{}}');
  const w3 = world('seed-a');
  w3.eventLog = [{ seq: 1, type: 'x', slotIndex: 0, payload: foreignMap }];
  assert.equal(S.validateWorld(w3).ok, false);
  assert.throws(() => S.canonicalize(foreignMap), TypeError);
  const w4 = B.newWorld('seed-a').state;
  w4.eventLog = [{ seq: 1, type: 'x', slotIndex: 0, payload: new Map() }];
  assert.equal(B.validateWorld(w4).ok, false);
});

test('serializeState 先驗證：不合法 world（resolving、未知版本、非 JSON）拒絕輸出', () => {
  const resolving = world();
  resolving.phase = 'resolving';
  assert.throws(() => S.serializeState(resolving), (e) => e instanceof TypeError && /phase_not_persistable/.test(e.message));
  const badVersion = world();
  badVersion.schemaVersion = 9;
  assert.throws(() => S.serializeState(badVersion), (e) => e instanceof TypeError && /unknown_schema_version/.test(e.message));
  assert.throws(() => S.serializeState(null), TypeError);
  const ok = world();
  assert.equal(typeof S.serializeState(ok), 'string');
  assert.equal(S.parseState(S.serializeState(ok)).ok, true);
});

// ---------- PR #74 複核 R1 剩餘：陣列元素 accessor 不得被呼叫 ----------

function arrayWithAccessor(kind, onGet) {
  const arr = [];
  if (kind === 'getter') {
    Object.defineProperty(arr, '0', { enumerable: true, configurable: true, get() { return onGet(); } });
  } else if (kind === 'setter-only') {
    Object.defineProperty(arr, '0', { enumerable: true, configurable: true, set() { onGet(); } });
  } else if (kind === 'getter-中間') {
    arr.push(1, 2);
    Object.defineProperty(arr, '2', { enumerable: true, configurable: true, get() { return onGet(); } });
  }
  return arr;
}

test('複核 R1 重現：陣列元素 getter 被拒絕、getter 呼叫 0 次、輸入與 RNG 不變、hash 不再不穩定', () => {
  for (const kind of ['getter', 'setter-only', 'getter-中間']) {
    let calls = 0;
    const w = world('array-getter');
    w.eventLog = [{ seq: 1, type: 'x', slotIndex: 0, payload: arrayWithAccessor(kind, () => { calls++; return calls; }) }];
    const rngBefore = [...w.rngState];
    const r = S.validateWorld(w);
    assert.equal(r.ok, false, kind);
    assert.equal(r.code, 'bad_type', kind);
    assert.throws(() => S.hashWorld(w), TypeError, kind);
    assert.throws(() => S.serializeState(w), TypeError, kind);
    assert.throws(() => S.canonicalize(w.eventLog), TypeError, kind);
    assert.equal(calls, 0, `${kind}：getter／setter 不得被呼叫`);
    assert.deepEqual(w.rngState, rngBefore, kind);
  }
});

test('getter 若會改動 rngState，validateWorld 也不得執行它', () => {
  const w = world('array-getter');
  const before = [...w.rngState];
  const payload = [];
  Object.defineProperty(payload, '0', {
    enumerable: true,
    get() { w.rngState[0] = (w.rngState[0] + 1) >>> 0; return 1; },
  });
  w.eventLog = [{ seq: 1, type: 'x', slotIndex: 0, payload }];
  assert.equal(S.validateWorld(w).ok, false);
  assert.deepEqual(w.rngState, before);
  assert.throws(() => S.canonicalize(w), TypeError);
  assert.deepEqual(w.rngState, before);
});

test('物件屬性 getter 同樣不被呼叫；普通稠密與跨 realm 陣列仍可存讀且 hash 一致', () => {
  let calls = 0;
  const rec = {};
  Object.defineProperty(rec, 'x', { enumerable: true, get() { calls++; return 1; } });
  const w = world('array-getter');
  w.eventLog = [{ seq: 1, type: 'x', slotIndex: 0, payload: rec }];
  assert.equal(S.validateWorld(w).ok, false);
  assert.throws(() => S.canonicalize(rec), TypeError);
  assert.equal(calls, 0);

  const ctx = vm.createContext({});
  const foreignArr = vm.runInContext('[1, [2, { a: [3] }], []]', ctx);
  const good = world('array-getter');
  good.eventLog = [{ seq: 1, type: 'x', slotIndex: 0, payload: [1, [2, { a: [3] }], []] }, { seq: 2, type: 'x', slotIndex: 0, payload: foreignArr }];
  assert.deepEqual(S.validateWorld(good), { ok: true });
  const h1 = S.hashWorld(good);
  assert.equal(S.hashWorld(good), h1, '同一 world 連續 hash 必須相同');
  const back = S.parseState(S.serializeState(good));
  assert.equal(back.ok, true);
  assert.equal(S.hashWorld(back.state), h1);
});

// ---------- SG-02：ruleVersion 1 → 2 的升版影響 ----------

const legacy = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'new-world.v1.json'), 'utf8'));

test('舊版（ruleVersion 1）存檔被明確拒絕、原資料不被修改或默默重解', () => {
  assert.equal(legacy.ruleVersion, 1);
  for (const c of legacy.cases) {
    const before = c.canonical;
    const r = S.parseState(c.canonical);
    assert.equal(r.ok, false, c.name);
    // SG-03 起 schemaVersion 先於 ruleVersion 檢查；舊檔兩者都不符，一律明確拒絕
    assert.equal(r.code, 'unknown_schema_version', c.name);
    assert.ok(r.reason.includes('schemaVersion'), r.reason);
    assert.equal(c.canonical, before, '輸入字串不變');
    const obj = JSON.parse(c.canonical);
    const snapshot = clone(obj);
    assert.equal(S.validateWorld(obj).code, 'unknown_schema_version', c.name);
    assert.deepEqual(obj, snapshot, '輸入物件不變（沒有被就地升版）');
    assert.throws(() => S.serializeState(obj), TypeError, c.name);
  }
});

const legacyS1R2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'new-world.schema1-rule2.json'), 'utf8'));

test('SG-02 的 schema 1／ruleVersion 2 golden 也被明確拒絕、輸入不變，且 golden 沒被動過', () => {
  assert.equal(legacyS1R2.schemaVersion, 1);
  assert.equal(legacyS1R2.ruleVersion, 2);
  for (const c of legacyS1R2.cases) {
    const obj = JSON.parse(c.canonical);
    const snapshot = clone(obj);
    const r = S.parseState(c.canonical);
    assert.equal(r.ok, false, c.name);
    assert.equal(r.code, 'unknown_schema_version', c.name);
    assert.deepEqual(obj, snapshot);
    assert.equal(S.validateWorld(obj).code, 'unknown_schema_version', c.name);
    assert.throws(() => S.serializeState(obj), TypeError, c.name);
    assert.equal(S.sha256Hex(c.canonical), c.hash, `${c.name}：歷史 hash 可重算`);
  }
});

test('SG-04 升 schema 3 後，每個固定 seed 與 schema 1／rule 2 golden 的差異只有 schemaVersion、schedule、tiles 與 inventory', () => {
  const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'new-world.json'), 'utf8'));
  assert.equal(fx.schemaVersion, 3);
  assert.equal(fx.cases.length, legacyS1R2.cases.length);
  assert.equal(legacyS1R2.ruleVersion, fx.ruleVersion);
  assert.equal(legacyS1R2.rngVersion, fx.rngVersion);
  for (let i = 0; i < legacyS1R2.cases.length; i++) {
    const o = legacyS1R2.cases[i];
    const n = fx.cases[i];
    assert.equal(n.name, o.name);
    assert.equal(n.seed, o.seed);
    assert.deepEqual(n.rngState, o.rngState, `${o.name}：RNG 狀態（原向量）不變`);
    assert.notEqual(n.hash, o.hash, `${o.name}：hash 必然不同`);
    const a = JSON.parse(o.canonical);
    const b = JSON.parse(n.canonical);
    assert.equal(a.schemaVersion, 1);
    assert.equal(b.schemaVersion, 3);
    assert.deepEqual(b.schedule, { templates: {}, overrides: [] });
    a.schemaVersion = 3;
    a.schedule = { templates: {}, overrides: [] };
    a.tiles = Rules.initialTiles();
    a.inventory = { 'breakthrough-pill': 0 };
    assert.deepEqual(b, a, `${o.name}：除 schemaVersion、schedule、tiles、inventory 外世界內容完全相同`);
  }
});

test('升版後每個固定 seed 與 SG-01 golden（schema 1／rule 1）的差異只有 ruleVersion、schemaVersion、schedule、tiles 與 inventory', () => {
  const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'new-world.json'), 'utf8'));
  assert.equal(fx.cases.length, legacy.cases.length);
  assert.equal(legacy.rngVersion, fx.rngVersion);
  for (let i = 0; i < legacy.cases.length; i++) {
    const o = legacy.cases[i];
    const n = fx.cases[i];
    assert.equal(n.name, o.name);
    assert.deepEqual(n.rngState, o.rngState, `${o.name}：RNG 狀態（原向量）不變`);
    const a = JSON.parse(o.canonical);
    const b = JSON.parse(n.canonical);
    assert.equal(a.ruleVersion, 1);
    a.ruleVersion = 2;
    a.schemaVersion = 3;
    a.schedule = { templates: {}, overrides: [] };
    a.tiles = Rules.initialTiles();
    a.inventory = { 'breakthrough-pill': 0 };
    assert.deepEqual(b, a, o.name);
    assert.equal(S.sha256Hex(o.canonical), o.hash, o.name);
  }
});

test('升版後的合法設定仍可存讀且 hash 不變；ruleVersion 只有 rules.js 一個來源', () => {
  for (const t of Object.keys(L.templates)) {
    for (const risk of L.personality.risk) for (const bond of L.personality.bond) {
      const w = world('upgrade-seed', optionsFor(t, { rootBone: 1, comprehension: 1, craft: 1 }, { risk, bond }));
      const back = S.parseState(S.serializeState(w));
      assert.equal(back.ok, true);
      assert.equal(S.hashWorld(back.state), S.hashWorld(w));
      assert.equal(w.ruleVersion, require('../js/rules.js').RULE_VERSION);
    }
  }
});

test('新局的起始數值與師父屬性取自 rules.js 的凍結表', () => {
  const Rules = require('../js/rules.js');
  const w = world('rules-link');
  const m = w.disciples.find((d) => d.id === S.MASTER_ID);
  assert.deepEqual(m.attributes, Rules.MASTER_ATTRIBUTES);
  for (const d of w.disciples) {
    for (const k of ['stamina', 'mind', 'cultivation', 'injury']) assert.equal(d[k], Rules.START_VALUES[k], `${d.id}.${k}`);
  }
  assert.deepEqual(w.resources, { spiritMaterial: 0, spiritHerb: 0, spiritStone: 0, reputation: 0 }, '從零材料開局');
});

// ---------- SG-03：schedule／commandLog／eventLog／pendingEvents 的內容契約 ----------

const HASH_A = 'a'.repeat(64);
function midWorld() {
  const w = withApprentice(); // slotIndex 21、revision 21、cand-1 於第 20 格加入
  w.eventLog = [{ seq: 1, type: 'commandAccepted', slotIndex: 3 }, { seq: 2, type: 'commandAccepted', slotIndex: 4 }];
  w.commandLog = [
    { seq: 1, id: 'c-1', type: 'assignSlot', payloadHash: HASH_A, revisionBefore: 3, revisionAfter: 4, eventSeqs: [1] },
    { seq: 2, id: 'c-2', type: 'setDailyTemplate', payloadHash: HASH_A, revisionBefore: 4, revisionAfter: 5, eventSeqs: [2] },
  ];
  w.schedule = {
    templates: { [S.MASTER_ID]: ['cultivate', 'rest', 'tune-mind'], 'cand-1': ['gather-material', 'rest', 'rest'] },
    overrides: [
      { discipleId: S.MASTER_ID, slotIndex: 22, action: 'rest' },
      { discipleId: S.PROTAGONIST_ID, slotIndex: 22, action: 'cultivate' },
      { discipleId: 'cand-1', slotIndex: 25, action: 'gather-herb' },
    ],
  };
  return w;
}
const bad = (fn, code) => {
  const w = midWorld();
  fn(w);
  const before = clone(w);
  const r = S.validateWorld(w);
  assert.equal(r.ok, false, JSON.stringify(r));
  if (code) assert.equal(r.code, code, JSON.stringify(r));
  assert.deepEqual(w, before, '驗證不修改輸入');
  return r;
};

test('合法的中途世界（課表、命令紀錄、事件紀錄）通過驗證並可存讀、hash 不變', () => {
  const w = midWorld();
  assert.deepEqual(S.validateWorld(w), { ok: true });
  const back = S.parseState(S.serializeState(w));
  assert.equal(back.ok, true);
  assert.equal(S.hashWorld(back.state), S.hashWorld(w));
});

test('schedule 驗證：結構、引用、排序、加入前不得排課', () => {
  bad((w) => { delete w.schedule; }, 'missing_field');
  bad((w) => { w.schedule = []; });
  bad((w) => { w.schedule.extra = 1; });
  bad((w) => { w.schedule.templates = []; });
  bad((w) => { w.schedule.templates['cand-2'] = ['rest', 'rest', 'rest']; });
  bad((w) => { w.schedule.templates[S.MASTER_ID] = ['rest', 'rest']; });
  bad((w) => { w.schedule.templates[S.MASTER_ID] = ['rest', 'rest', 'teleport']; });
  bad((w) => { w.schedule.templates[S.MASTER_ID] = ['rest', 'rest', 5]; });
  bad((w) => { w.schedule.overrides = {}; });
  bad((w) => { w.schedule.overrides[0] = null; });
  bad((w) => { w.schedule.overrides[0].extra = 1; });
  bad((w) => { w.schedule.overrides[0].discipleId = 'cand-2'; });
  bad((w) => { w.schedule.overrides[0].slotIndex = 42; });
  bad((w) => { w.schedule.overrides[0].slotIndex = -1; });
  bad((w) => { w.schedule.overrides[0].slotIndex = 22.5; });
  bad((w) => { w.schedule.overrides[0].action = 'teleport'; });
  bad((w) => { w.schedule.overrides.reverse(); }); // 未排序
  bad((w) => { w.schedule.overrides.push({ ...w.schedule.overrides[2] }); }); // 重複
  bad((w) => { w.schedule.overrides[2] = { discipleId: 'cand-1', slotIndex: 19, action: 'rest' }; w.schedule.overrides.sort((a, b) => a.slotIndex - b.slotIndex); }, 'inconsistent_roster');
});

test('commandLog 驗證：序號連續、ID 唯一、revision 銜接、eventSeqs 指向 eventLog', () => {
  bad((w) => { w.commandLog[1].seq = 5; }, 'inconsistent_log');
  bad((w) => { w.commandLog[1].id = 'c-1'; }, 'duplicate_id');
  bad((w) => { w.commandLog[0].id = ''; });
  bad((w) => { w.commandLog[0].type = 7; });
  bad((w) => { w.commandLog[0].payloadHash = 'xyz'; });
  bad((w) => { w.commandLog[0].payloadHash = 'A'.repeat(64); });
  bad((w) => { w.commandLog[0].revisionAfter = 9; }, 'inconsistent_log');
  bad((w) => { w.commandLog[1].revisionBefore = 2; w.commandLog[1].revisionAfter = 3; }, 'inconsistent_log'); // 倒退
  bad((w) => { w.commandLog[1].revisionBefore = 30; w.commandLog[1].revisionAfter = 31; }, 'inconsistent_log'); // 超過世界 revision
  bad((w) => { w.revision = 1; }, 'inconsistent_log');
  bad((w) => { w.commandLog[0].eventSeqs = [3]; });
  bad((w) => { w.commandLog[0].eventSeqs = [0]; });
  bad((w) => { w.commandLog[0].eventSeqs = 'x'; });
  bad((w) => { delete w.commandLog[0].eventSeqs; });
  bad((w) => { w.commandLog[0].extra = true; });
});

test('eventLog 與 pendingEvents 驗證', () => {
  bad((w) => { w.eventLog[1].seq = 9; }, 'inconsistent_log');
  bad((w) => { w.eventLog[0].type = ''; });
  bad((w) => { delete w.eventLog[0].type; });
  bad((w) => { w.eventLog[0].slotIndex = 22; }); // 晚於目前格
  bad((w) => { w.eventLog[0].slotIndex = -1; });
  bad((w) => { w.phase = 'awaitingChoice'; w.pendingEvents = [{ id: 'evt-x' }]; });
  bad((w) => { w.phase = 'awaitingChoice'; w.pendingEvents = [{ id: 'evt-x', raisedSlotIndex: 22 }]; });
  bad((w) => { w.phase = 'awaitingChoice'; w.pendingEvents = [{ id: 'evt-x', raisedSlotIndex: 3, extra: 1 }]; });
  bad((w) => { w.phase = 'awaitingChoice'; w.pendingEvents = [{ id: 'evt-x', raisedSlotIndex: 1.5 }]; });
  const ok = midWorld();
  ok.phase = 'awaitingChoice';
  ok.pendingEvents = [{ id: 'evt-x', raisedSlotIndex: 21 }];
  assert.deepEqual(S.validateWorld(ok), { ok: true });
});
