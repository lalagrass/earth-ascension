/*
 * SG-01：版本化世界狀態（schema）、角色設定驗證、canonical hash 與整數取整契約。
 *
 * 範圍界線（設計 0.2／issue #71）：
 * - 只定義「狀態長什麼樣、怎樣才算合法」；不含規則、指令、結算引擎、UI。
 * - characterOptions 只驗證結構與型別，使用下方「先宣告的暫定常數」CHARACTER_OPTION_LIMITS 與
 *   PROVISIONAL_*。SG-02 才凍結正式的模板預算／加點上限／性格枚舉與初始數值，移入 js/rules.js
 *   並升 RULE_VERSION；屆時 fixture 的變化須在 PR 說明，不可只換常數。
 * - 所有數值皆為整數；狀態中不得有小數、NaN、undefined。倍率用基點，取整一律 floor。
 * - 載入策略：Node 以 CommonJS；瀏覽器先載入 js/rng.js 再載入本檔（一般 <script>），
 *   掛在 globalThis.SectChronicle.State。
 */
(function (root, factory) {
  'use strict';
  let Rng;
  if (typeof module === 'object' && module && module.exports) {
    Rng = require('./rng.js');
    module.exports = factory(Rng);
  } else {
    Rng = root.SectChronicle && root.SectChronicle.Rng;
    if (!Rng) throw new Error('state.js 需要先載入 js/rng.js');
    root.SectChronicle.State = factory(Rng);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rng) {
  'use strict';

  // ---------- 版本與常數 ----------
  const SCHEMA_VERSION = 1;
  // 1 = SG-01 暫定規則常數；SG-02 凍結正式數值時升版。
  const RULE_VERSION = 1;
  const RNG_VERSION = Rng.RNG_VERSION;

  const SCENARIOS = Object.freeze({ 'slice-14': Object.freeze({ totalSlots: 42 }) });
  const DEFAULT_SCENARIO_ID = 'slice-14';
  const PHASES = Object.freeze(['planning', 'resolving', 'awaitingChoice', 'ending']);
  const ORGANISATION_STATUSES = Object.freeze(['dojo', 'sectFounded', 'foundingDeferred']);
  const INVITATION_STATUSES = Object.freeze(['locked', 'invited', 'deferred', 'accepted']);
  const ROLES = Object.freeze(['master', 'protagonist', 'apprentice']);

  const MASTER_ID = 'disc-master';
  const PROTAGONIST_ID = 'disc-protagonist';
  const CANDIDATE_IDS = Object.freeze(['cand-1', 'cand-2']);
  const MAX_ROSTER = 4;
  const SEED_MAX_LENGTH = 64;
  const ATTRIBUTES = Object.freeze(['rootBone', 'comprehension', 'craft']); // 根骨、悟性、技藝

  // 暫定常數（SG-02 凍結）：三個模板總和相同（9）、自由配點 3、最終單項 1..6。
  const CHARACTER_OPTION_LIMITS = Object.freeze({
    templates: Object.freeze({
      'herb-child': Object.freeze({ rootBone: 2, comprehension: 3, craft: 4 }), // 採藥童
      'farmer-child': Object.freeze({ rootBone: 4, comprehension: 2, craft: 3 }), // 農家子
      'dojo-apprentice': Object.freeze({ rootBone: 3, comprehension: 4, craft: 2 }), // 道館學徒
    }),
    freePoints: 3,
    attributeMin: 1,
    attributeMax: 6,
    personality: Object.freeze({
      risk: Object.freeze(['cautious', 'bold']), // 謹慎／果敢
      bond: Object.freeze(['independent', 'caring']), // 獨立／重情
    }),
  });

  const DEFAULT_CHARACTER_OPTIONS = Object.freeze({
    templateId: 'dojo-apprentice',
    allocation: Object.freeze({ rootBone: 1, comprehension: 1, craft: 1 }),
    personality: Object.freeze({ risk: 'cautious', bond: 'independent' }),
  });

  // 暫定初始值（SG-02 凍結）。
  const PROVISIONAL_MASTER_ATTRIBUTES = Object.freeze({ rootBone: 5, comprehension: 5, craft: 5 });
  const PROVISIONAL_START = Object.freeze({ stamina: 100, mind: 60, cultivation: 0, injury: 0 });
  const RESOURCE_KEYS = Object.freeze(['spiritMaterial', 'spiritHerb', 'spiritStone', 'reputation']);

  const TOP_LEVEL_FIELDS = Object.freeze([
    'schemaVersion', 'ruleVersion', 'rngVersion', 'seed', 'slotIndex', 'phase', 'revision', 'rngState',
    'resources', 'tiles', 'disciples', 'candidates', 'jobs', 'reservations', 'pendingEvents',
    'commandLog', 'eventLog', 'scenarioId', 'characterOptions', 'protagonistId', 'masterId', 'story',
  ]);
  const ARRAY_FIELDS = Object.freeze(['tiles', 'jobs', 'reservations', 'commandLog', 'eventLog']);

  // canonical 不排除任何影響世界的欄位；播放倍率、畫面、動畫、牆鐘本來就不在世界內。
  const CANONICAL_EXCLUDED_FIELDS = Object.freeze([]);

  // ---------- 整數取整契約 ----------
  const BASIS_POINTS = 10000;
  const ROUNDING_MODE = 'floor';

  function mulBp(value, bp) {
    if (!Number.isInteger(value) || !Number.isInteger(bp)) {
      throw new TypeError('mulBp 只接受整數');
    }
    const product = value * bp;
    if (!Number.isSafeInteger(product)) throw new RangeError('mulBp 乘積超出安全整數');
    return Math.floor(product / BASIS_POINTS) + 0; // + 0 把 -0 正規化成 0
  }

  // ---------- 小工具 ----------
  function fail(code, reason, where) {
    const r = { ok: false, code, reason };
    if (where) r.path = where;
    return r;
  }

  const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isInt = (v) => typeof v === 'number' && Number.isSafeInteger(v) && !Object.is(v, -0);
  const isNonNegInt = (v) => isInt(v) && v >= 0;
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const sameKeys = (o, keys) => {
    const a = Object.keys(o).sort();
    const b = [...keys].sort();
    return a.length === b.length && a.every((k, i) => k === b[i]);
  };
  const totalSlots = (scenarioId) => SCENARIOS[scenarioId].totalSlots;

  function cloneJson(v) {
    return JSON.parse(JSON.stringify(v));
  }

  // ---------- 角色設定（只驗結構與型別） ----------
  function badOpt(reason) {
    return fail('bad_character_options', reason);
  }

  function validateCharacterOptions(opts) {
    const L = CHARACTER_OPTION_LIMITS;
    if (!isPlainObject(opts)) return badOpt('characterOptions 必須是物件');
    if (!sameKeys(opts, ['templateId', 'allocation', 'personality'])) {
      return badOpt('characterOptions 只能含 templateId、allocation、personality');
    }
    if (typeof opts.templateId !== 'string' || !hasOwn(L.templates, opts.templateId)) {
      return badOpt('templateId 不是已宣告的模板');
    }
    const alloc = opts.allocation;
    if (!isPlainObject(alloc) || !sameKeys(alloc, ATTRIBUTES)) {
      return badOpt('allocation 必須恰好含 rootBone、comprehension、craft');
    }
    let sum = 0;
    for (const a of ATTRIBUTES) {
      if (!isInt(alloc[a])) return badOpt(`allocation.${a} 必須是整數`);
      if (alloc[a] < 0) return badOpt(`allocation.${a} 不可為負`);
      sum += alloc[a];
    }
    if (sum !== L.freePoints) {
      return badOpt(`配點總和必須等於 ${L.freePoints}（目前 ${sum}）`);
    }
    const base = L.templates[opts.templateId];
    for (const a of ATTRIBUTES) {
      const finalValue = base[a] + alloc[a];
      if (finalValue < L.attributeMin || finalValue > L.attributeMax) {
        return badOpt(`${a} 最終值 ${finalValue} 超出 ${L.attributeMin}..${L.attributeMax}`);
      }
    }
    const p = opts.personality;
    if (!isPlainObject(p) || !sameKeys(p, ['risk', 'bond'])) {
      return badOpt('personality 必須恰好含 risk、bond');
    }
    if (!L.personality.risk.includes(p.risk)) return badOpt('personality.risk 不是已宣告的值');
    if (!L.personality.bond.includes(p.bond)) return badOpt('personality.bond 不是已宣告的值');
    return {
      ok: true,
      value: {
        templateId: opts.templateId,
        allocation: { rootBone: alloc.rootBone, comprehension: alloc.comprehension, craft: alloc.craft },
        personality: { risk: p.risk, bond: p.bond },
      },
    };
  }

  function deriveProtagonistAttributes(opts) {
    const base = CHARACTER_OPTION_LIMITS.templates[opts.templateId];
    return {
      rootBone: base.rootBone + opts.allocation.rootBone,
      comprehension: base.comprehension + opts.allocation.comprehension,
      craft: base.craft + opts.allocation.craft,
    };
  }

  // ---------- 新局 ----------
  function newWorld(seed, scenarioId, characterOptions) {
    if (typeof seed !== 'string' || seed.length < 1 || seed.length > SEED_MAX_LENGTH) {
      return fail('bad_seed', `seed 必須是 1 到 ${SEED_MAX_LENGTH} 字元的字串`);
    }
    const sid = scenarioId === undefined ? DEFAULT_SCENARIO_ID : scenarioId;
    if (typeof sid !== 'string' || !hasOwn(SCENARIOS, sid)) {
      return fail('unknown_scenario', `未知情境：${String(sid)}`);
    }
    let options;
    if (characterOptions === undefined) {
      options = cloneJson(DEFAULT_CHARACTER_OPTIONS);
    } else {
      const v = validateCharacterOptions(characterOptions);
      if (!v.ok) return v;
      options = v.value;
    }
    const state = {
      schemaVersion: SCHEMA_VERSION,
      ruleVersion: RULE_VERSION,
      rngVersion: RNG_VERSION,
      seed,
      slotIndex: 0,
      phase: 'planning',
      revision: 0,
      rngState: Rng.create(seed),
      resources: Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 0])),
      tiles: [],
      disciples: [
        Object.assign({
          id: MASTER_ID, role: 'master', attributes: { ...PROVISIONAL_MASTER_ATTRIBUTES },
        }, PROVISIONAL_START, { joinSlotIndex: 0 }),
        Object.assign({
          id: PROTAGONIST_ID, role: 'protagonist', templateId: options.templateId,
          attributes: deriveProtagonistAttributes(options),
        }, PROVISIONAL_START, { joinSlotIndex: 0 }),
      ],
      candidates: CANDIDATE_IDS.map((id, i) => ({ id, order: i + 1 })),
      jobs: [],
      reservations: [],
      pendingEvents: [],
      commandLog: [],
      eventLog: [],
      scenarioId: sid,
      characterOptions: options,
      protagonistId: PROTAGONIST_ID,
      masterId: MASTER_ID,
      story: {
        rescues: [],
        triggeredEventIds: [],
        invitations: Object.fromEntries(CANDIDATE_IDS.map((id) => [id, { status: 'locked', joinSlotIndex: null }])),
        organisationStatus: 'dojo',
        defensePrepPoints: 0,
      },
    };
    const check = validateWorld(state);
    if (!check.ok) throw new Error(`newWorld 產生了不合法狀態：${check.code} ${check.reason}`);
    return { ok: true, state };
  }

  // ---------- 驗證 ----------
  // 整棵樹只能有 JSON 型別、整數、不得有 undefined／函式／-0／循環。
  function walkJson(v, where, depth) {
    if (depth > 24) return fail('bad_type', '巢狀過深或有循環', where);
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return null;
    if (typeof v === 'number') {
      return isInt(v) ? null : fail('non_integer', `${where} 必須是安全整數（含不得為 -0、NaN、小數）`, where);
    }
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const r = walkJson(v[i], `${where}[${i}]`, depth + 1);
        if (r) return r;
      }
      return null;
    }
    if (typeof v === 'object') {
      for (const k of Object.keys(v)) {
        const r = walkJson(v[k], `${where}.${k}`, depth + 1);
        if (r) return r;
      }
      return null;
    }
    return fail('bad_type', `${where} 型別 ${typeof v} 不可保存`, where);
  }

  function validateDisciple(d, i, w, opts) {
    const where = `disciples[${i}]`;
    if (!isPlainObject(d)) return fail('bad_type', `${where} 必須是物件`, where);
    const isProtagonist = d.role === 'protagonist';
    const keys = ['id', 'role', 'attributes', 'stamina', 'mind', 'cultivation', 'injury', 'joinSlotIndex'];
    if (isProtagonist) keys.push('templateId');
    if (!sameKeys(d, keys)) return fail('bad_value', `${where} 欄位不符（需 ${keys.join('、')}）`, where);
    if (typeof d.id !== 'string' || d.id.length === 0) return fail('bad_type', `${where}.id 必須是非空字串`, where);
    if (!ROLES.includes(d.role)) return fail('bad_value', `${where}.role 未知`, where);
    if (!isPlainObject(d.attributes) || !sameKeys(d.attributes, ATTRIBUTES)) {
      return fail('bad_value', `${where}.attributes 必須恰好含三屬性`, where);
    }
    for (const a of ATTRIBUTES) {
      if (!isNonNegInt(d.attributes[a])) return fail('bad_value', `${where}.attributes.${a} 必須是非負整數`, where);
    }
    for (const k of ['stamina', 'mind', 'cultivation', 'injury', 'joinSlotIndex']) {
      if (!isNonNegInt(d[k])) return fail('bad_value', `${where}.${k} 必須是非負整數`, where);
    }
    if (d.joinSlotIndex > w.slotIndex) {
      return fail('inconsistent_roster', `${where}.joinSlotIndex 不得晚於目前 slotIndex`, where);
    }
    if (d.role !== 'apprentice' && d.joinSlotIndex !== 0) {
      return fail('inconsistent_roster', `${where} 師父與主角必須從第 0 格起在隊`, where);
    }
    if (isProtagonist) {
      if (d.templateId !== opts.templateId) {
        return fail('inconsistent_roster', 'protagonist.templateId 與 characterOptions 不一致', where);
      }
      const expected = deriveProtagonistAttributes(opts);
      for (const a of ATTRIBUTES) {
        if (d.attributes[a] !== expected[a]) {
          return fail('inconsistent_roster', `主角 ${a} 與 characterOptions 推導值不一致`, where);
        }
      }
    }
    return null;
  }

  function validateStory(w) {
    const s = w.story;
    if (!isPlainObject(s)) return fail('bad_type', 'story 必須是物件', 'story');
    if (!sameKeys(s, ['rescues', 'triggeredEventIds', 'invitations', 'organisationStatus', 'defensePrepPoints'])) {
      return fail('bad_value', 'story 欄位不符', 'story');
    }
    if (!ORGANISATION_STATUSES.includes(s.organisationStatus)) {
      return fail('bad_value', 'story.organisationStatus 未知', 'story.organisationStatus');
    }
    if (!isNonNegInt(s.defensePrepPoints)) {
      return fail('bad_value', 'story.defensePrepPoints 必須是非負整數', 'story.defensePrepPoints');
    }
    if (!Array.isArray(s.triggeredEventIds)) return fail('bad_type', 'story.triggeredEventIds 必須是陣列', 'story.triggeredEventIds');
    const seenEvt = new Set();
    for (const id of s.triggeredEventIds) {
      if (typeof id !== 'string' || id.length === 0) return fail('bad_type', 'triggeredEventIds 只能是非空字串', 'story.triggeredEventIds');
      if (seenEvt.has(id)) return fail('duplicate_id', `事件 ID 重複：${id}`, 'story.triggeredEventIds');
      seenEvt.add(id);
    }
    if (!Array.isArray(s.rescues)) return fail('bad_type', 'story.rescues 必須是陣列', 'story.rescues');
    const seenRescue = new Set();
    for (const r of s.rescues) {
      if (!isPlainObject(r) || !sameKeys(r, ['id', 'completedSlotIndex', 'rewardClaimed'])) {
        return fail('bad_value', 'rescues 項目欄位不符', 'story.rescues');
      }
      if (typeof r.id !== 'string' || r.id.length === 0) return fail('bad_type', 'rescue.id 必須是非空字串', 'story.rescues');
      if (seenRescue.has(r.id)) return fail('duplicate_id', `援村紀錄重複：${r.id}`, 'story.rescues');
      seenRescue.add(r.id);
      if (!isNonNegInt(r.completedSlotIndex) || r.completedSlotIndex > w.slotIndex) {
        return fail('bad_value', 'rescue.completedSlotIndex 必須是不晚於目前格的非負整數', 'story.rescues');
      }
      if (typeof r.rewardClaimed !== 'boolean') return fail('bad_type', 'rescue.rewardClaimed 必須是布林', 'story.rescues');
    }
    const inv = s.invitations;
    if (!isPlainObject(inv) || !sameKeys(inv, CANDIDATE_IDS)) {
      return fail('bad_value', 'story.invitations 必須恰好含所有候選 ID', 'story.invitations');
    }
    const byId = new Map(w.disciples.map((d) => [d.id, d]));
    for (const id of CANDIDATE_IDS) {
      const e = inv[id];
      if (!isPlainObject(e) || !sameKeys(e, ['status', 'joinSlotIndex'])) {
        return fail('bad_value', `invitations.${id} 欄位不符`, 'story.invitations');
      }
      if (!INVITATION_STATUSES.includes(e.status)) return fail('bad_value', `invitations.${id}.status 未知`, 'story.invitations');
      const member = byId.get(id);
      if (e.status === 'accepted') {
        if (!isNonNegInt(e.joinSlotIndex) || e.joinSlotIndex > w.slotIndex) {
          return fail('inconsistent_roster', `invitations.${id}.joinSlotIndex 必須是不晚於目前格的整數`, 'story.invitations');
        }
        if (!member || member.role !== 'apprentice' || member.joinSlotIndex !== e.joinSlotIndex) {
          return fail('inconsistent_roster', `已接受的 ${id} 必須有對應且 joinSlotIndex 相同的學徒`, 'story.invitations');
        }
      } else {
        if (e.joinSlotIndex !== null) return fail('inconsistent_roster', `未接受的 ${id} 其 joinSlotIndex 必須為 null`, 'story.invitations');
        if (member) return fail('inconsistent_roster', `${id} 尚未接受卻已在隊`, 'story.invitations');
      }
      if (e.status !== 'locked' && s.rescues.length === 0) {
        return fail('inconsistent_story', `${id} 在尚未完成援村時不得有邀請進度`, 'story.invitations');
      }
    }
    if (inv['cand-2'].status !== 'locked' && inv['cand-1'].status === 'locked') {
      return fail('inconsistent_story', '第二位候選不得先於第一位進入邀請流程', 'story.invitations');
    }
    return null;
  }

  function validateWorld(w) {
    if (!isPlainObject(w)) return fail('not_object', '世界狀態必須是物件');
    const versionChecks = [
      ['schemaVersion', SCHEMA_VERSION, 'unknown_schema_version'],
      ['ruleVersion', RULE_VERSION, 'unknown_rule_version'],
      ['rngVersion', RNG_VERSION, 'unknown_rng_version'],
    ];
    for (const [k, expected, code] of versionChecks) {
      if (!hasOwn(w, k)) return fail('missing_field', `缺少欄位 ${k}`, k);
      if (w[k] !== expected) return fail(code, `${k} 為 ${JSON.stringify(w[k])}，本程式只支援 ${expected}`, k);
    }
    for (const k of Object.keys(w)) {
      if (!TOP_LEVEL_FIELDS.includes(k)) return fail('unknown_field', `未知欄位 ${k}`, k);
    }
    for (const k of TOP_LEVEL_FIELDS) {
      if (!hasOwn(w, k)) return fail('missing_field', `缺少欄位 ${k}`, k);
    }
    const walked = walkJson(w, 'world', 0);
    if (walked) return walked;

    if (typeof w.seed !== 'string' || w.seed.length < 1 || w.seed.length > SEED_MAX_LENGTH) {
      return fail('bad_seed', 'seed 必須是 1 到 64 字元的字串', 'seed');
    }
    if (typeof w.scenarioId !== 'string' || !hasOwn(SCENARIOS, w.scenarioId)) {
      return fail('unknown_scenario', `未知情境：${String(w.scenarioId)}`, 'scenarioId');
    }
    const total = totalSlots(w.scenarioId);
    if (!isNonNegInt(w.slotIndex) || w.slotIndex > total) {
      return fail('bad_value', `slotIndex 必須是 0 到 ${total} 的整數`, 'slotIndex');
    }
    if (!isNonNegInt(w.revision)) return fail('bad_value', 'revision 必須是非負整數', 'revision');
    if (typeof w.phase !== 'string' || !PHASES.includes(w.phase)) return fail('bad_value', 'phase 未知', 'phase');
    if (w.phase === 'resolving') {
      return fail('phase_not_persistable', 'resolving 是同步原子運算，不得保存', 'phase');
    }
    const rs = Rng.validateState(w.rngState);
    if (!rs.ok) return fail(rs.code, rs.reason, 'rngState');

    if (!isPlainObject(w.resources) || !sameKeys(w.resources, RESOURCE_KEYS)) {
      return fail('bad_value', 'resources 必須恰好含已宣告的資源', 'resources');
    }
    for (const k of RESOURCE_KEYS) {
      if (!isNonNegInt(w.resources[k])) return fail('bad_value', `resources.${k} 必須是非負整數`, 'resources');
    }
    for (const k of ARRAY_FIELDS) {
      if (!Array.isArray(w[k])) return fail('bad_type', `${k} 必須是陣列`, k);
      for (let i = 0; i < w[k].length; i++) {
        if (!isPlainObject(w[k][i])) return fail('bad_type', `${k}[${i}] 必須是物件`, k);
      }
    }
    if (!Array.isArray(w.pendingEvents)) return fail('bad_type', 'pendingEvents 必須是陣列', 'pendingEvents');
    const seenPending = new Set();
    for (const e of w.pendingEvents) {
      if (!isPlainObject(e) || typeof e.id !== 'string' || e.id.length === 0) {
        return fail('bad_type', 'pendingEvents 項目必須是含非空字串 id 的物件', 'pendingEvents');
      }
      if (seenPending.has(e.id)) return fail('duplicate_id', `待選事件重複：${e.id}`, 'pendingEvents');
      seenPending.add(e.id);
    }

    const co = validateCharacterOptions(w.characterOptions);
    if (!co.ok) return fail(co.code, co.reason, 'characterOptions');

    if (w.masterId !== MASTER_ID || w.protagonistId !== PROTAGONIST_ID) {
      return fail('inconsistent_roster', 'masterId／protagonistId 必須是固定的不可變 ID 且不得相同', 'masterId');
    }
    if (!Array.isArray(w.candidates) || w.candidates.length !== CANDIDATE_IDS.length
      || !w.candidates.every((c, i) => isPlainObject(c) && sameKeys(c, ['id', 'order'])
        && c.id === CANDIDATE_IDS[i] && c.order === i + 1)) {
      return fail('bad_value', 'candidates 必須恰好是依序的 cand-1、cand-2', 'candidates');
    }
    if (!Array.isArray(w.disciples)) return fail('bad_type', 'disciples 必須是陣列', 'disciples');
    if (w.disciples.length > MAX_ROSTER) {
      return fail('inconsistent_roster', `隊伍不得超過 ${MAX_ROSTER} 人`, 'disciples');
    }
    for (let i = 0; i < w.disciples.length; i++) {
      const r = validateDisciple(w.disciples[i], i, w, co.value);
      if (r) return r;
    }
    const ids = w.disciples.map((d) => d.id);
    if (new Set(ids).size !== ids.length) return fail('inconsistent_roster', 'disciples 有重複 ID', 'disciples');
    const count = (role) => w.disciples.filter((d) => d.role === role).length;
    const masterOk = w.disciples.some((d) => d.id === MASTER_ID && d.role === 'master');
    const protagonistOk = w.disciples.some((d) => d.id === PROTAGONIST_ID && d.role === 'protagonist');
    if (!masterOk || !protagonistOk || count('master') !== 1 || count('protagonist') !== 1) {
      return fail('inconsistent_roster', '必須恰有一位師父與一位主角，且使用固定 ID', 'disciples');
    }
    for (const d of w.disciples) {
      if (d.role === 'apprentice' && !CANDIDATE_IDS.includes(d.id)) {
        return fail('inconsistent_roster', `學徒 ID 必須是候選 ID：${d.id}`, 'disciples');
      }
    }
    const storyErr = validateStory(w);
    if (storyErr) return storyErr;

    const org = w.story.organisationStatus;
    if (w.phase === 'planning') {
      if (w.slotIndex >= total) return fail('inconsistent_phase', `slotIndex ${total} 後必須先待選，不可處於 planning`, 'phase');
      if (w.pendingEvents.length > 0) return fail('inconsistent_phase', 'planning 不得有待選事件', 'pendingEvents');
      if (org !== 'dojo') return fail('inconsistent_phase', '立派結果只能在 ending 出現', 'story.organisationStatus');
    } else if (w.phase === 'awaitingChoice') {
      if (w.pendingEvents.length === 0) return fail('inconsistent_phase', 'awaitingChoice 需要至少一個待選事件', 'pendingEvents');
      if (org !== 'dojo') return fail('inconsistent_phase', '立派結果只能在 ending 出現', 'story.organisationStatus');
    } else if (w.phase === 'ending') {
      if (w.slotIndex !== total) return fail('inconsistent_phase', `ending 只能出現在 slotIndex ${total}`, 'phase');
      if (w.pendingEvents.length > 0) return fail('inconsistent_phase', 'ending 不得有待選事件', 'pendingEvents');
      if (org === 'dojo') return fail('inconsistent_phase', 'ending 必須已決定立派或暫緩', 'story.organisationStatus');
    }
    return { ok: true };
  }

  // ---------- roster ----------
  const ROLE_RANK = { master: 0, protagonist: 1, apprentice: 2 };

  // 在第 slotIndex 格「可被排課與結算」的角色：joinSlotIndex ≤ slotIndex。
  // 候選與未接受者不在 disciples，永不入列。排序與陣列順序無關。
  function rosterAt(world, slotIndex) {
    return world.disciples
      .filter((d) => d.joinSlotIndex <= slotIndex)
      .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  // ---------- canonical／hash ----------
  function canonicalize(value) {
    if (value === null) return 'null';
    switch (typeof value) {
      case 'string': return JSON.stringify(value);
      case 'boolean': return value ? 'true' : 'false';
      case 'number':
        if (!isInt(value)) throw new TypeError(`canonical 只接受安全整數，收到 ${String(value)}`);
        return String(value);
      case 'object': {
        if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
        const keys = Object.keys(value).sort();
        return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
      }
      default:
        throw new TypeError(`canonical 不接受型別 ${typeof value}`);
    }
  }

  function utf8Bytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        const n = str.charCodeAt(i + 1);
        if (n >= 0xdc00 && n <= 0xdfff) {
          c = 0x10000 + ((c - 0xd800) << 10) + (n - 0xdc00);
          i++;
        }
      }
      if (c >= 0xd800 && c <= 0xdfff) c = 0xfffd; // 孤立代理對 → U+FFFD（與 Node 相同）
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  const SHA_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  // 純 JS SHA-256，讓瀏覽器與 Node 得到同一 hash（不依賴 crypto／TextEncoder）。
  function sha256Hex(str) {
    const bytes = utf8Bytes(str);
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    const hi = Math.floor(bitLen / 4294967296);
    const lo = bitLen >>> 0;
    bytes.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255,
      (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const W = new Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < bytes.length; off += 64) {
      for (let i = 0; i < 16; i++) {
        W[i] = ((bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16)
          | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3]) | 0;
      }
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
        const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + SHA_K[i] + W[i]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }

  function hashWorld(world) {
    return sha256Hex(canonicalize(world));
  }

  // ---------- 存讀（純函式；真正的 localStorage 屬 SG-07） ----------
  function serializeState(world) {
    return canonicalize(world);
  }

  function parseState(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return fail('invalid_json', `不是合法 JSON：${e.message}`);
    }
    const v = validateWorld(parsed);
    if (!v.ok) return v;
    return { ok: true, state: parsed };
  }

  return {
    SCHEMA_VERSION, RULE_VERSION, RNG_VERSION, SCENARIOS, PHASES, ORGANISATION_STATUSES,
    INVITATION_STATUSES, MASTER_ID, PROTAGONIST_ID, CANDIDATE_IDS, MAX_ROSTER,
    CHARACTER_OPTION_LIMITS, DEFAULT_CHARACTER_OPTIONS, CANONICAL_EXCLUDED_FIELDS,
    BASIS_POINTS, ROUNDING_MODE,
    newWorld, validateCharacterOptions, validateWorld, rosterAt,
    canonicalize, sha256Hex, hashWorld, serializeState, parseState, mulBp,
  };
});
