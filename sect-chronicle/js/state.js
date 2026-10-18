/*
 * SG-01：版本化世界狀態（schema）、角色設定驗證、canonical hash 與整數取整契約。
 *
 * SG-03：schemaVersion 升為 2，新增 `schedule`（課表）並為 commandLog／eventLog／pendingEvents 定義項目格式。
 * SG-04：schemaVersion 升為 3：tiles 固定為 `Rules.initialTiles()` 的 25 格；新增 `inventory`（丹藥庫存）；
 *   jobs（建造／煉丹工作，含持久輪候值）與 reservations（進行中工作的預約）有完整內容契約與一致性驗證。
 *
 * 範圍界線（設計 0.2／issue #71、#81）：
 * - 只定義「狀態長什麼樣、怎樣才算合法」；不含規則、指令、結算引擎、UI。
 * - 模板預算／加點上限／性格枚舉、師父屬性、起始數值、ruleVersion 與取整契約的權威來源是 js/rules.js（SG-02 凍結）；
 *   本檔只引用，不再保留第二份定義，避免兩份常數漂移。
 * - 所有數值皆為整數；狀態中不得有小數、NaN、undefined。倍率用基點，取整一律 floor。
 * - 載入策略：Node 以 CommonJS；瀏覽器依序載入 js/rng.js、js/rules.js 再載入本檔（一般 <script>），
 *   掛在 globalThis.SectChronicle.State。
 */
(function (root, factory) {
  'use strict';
  let Rng;
  let Rules;
  if (typeof module === 'object' && module && module.exports) {
    Rng = require('./rng.js');
    Rules = require('./rules.js');
    module.exports = factory(Rng, Rules);
  } else {
    Rng = root.SectChronicle && root.SectChronicle.Rng;
    if (!Rng) throw new Error('state.js 需要先載入 js/rng.js');
    Rules = root.SectChronicle.Rules;
    if (!Rules) throw new Error('state.js 需要先載入 js/rules.js（在 js/rng.js 之後、本檔之前）');
    root.SectChronicle.State = factory(Rng, Rules);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rng, Rules) {
  'use strict';

  // ---------- 版本與常數 ----------
  // 1 = SG-01；2 = SG-03 新增 schedule（課表）並定義 commandLog／eventLog／pendingEvents 項目格式；
  // 3 = SG-04 固定 25 格地圖、新增 inventory、定義 jobs／reservations。
  const SCHEMA_VERSION = 3;
  // ruleVersion 的唯一來源是 js/rules.js（1 = SG-01 暫定值；2 = SG-02 凍結的候選規則基線）。
  const RULE_VERSION = Rules.RULE_VERSION;
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

  // 模板預算、加點上限、性格枚舉由 js/rules.js 凍結；這裡只是同一個物件的引用。
  const CHARACTER_OPTION_LIMITS = Rules.CHARACTER_OPTION_LIMITS;

  const DEFAULT_CHARACTER_OPTIONS = Object.freeze({
    templateId: 'dojo-apprentice',
    allocation: Object.freeze({ rootBone: 1, comprehension: 1, craft: 1 }),
    personality: Object.freeze({ risk: 'cautious', bond: 'independent' }),
  });

  // 師父屬性與起始數值同樣取自 js/rules.js。
  const MASTER_ATTRIBUTES = Rules.MASTER_ATTRIBUTES;
  const START_VALUES = Rules.START_VALUES;
  const RESOURCE_KEYS = Object.freeze(['spiritMaterial', 'spiritHerb', 'spiritStone', 'reputation']);

  const TOP_LEVEL_FIELDS = Object.freeze([
    'schemaVersion', 'ruleVersion', 'rngVersion', 'seed', 'slotIndex', 'phase', 'revision', 'rngState',
    'resources', 'tiles', 'disciples', 'candidates', 'jobs', 'reservations', 'pendingEvents',
    'commandLog', 'eventLog', 'scenarioId', 'characterOptions', 'protagonistId', 'masterId', 'story', 'schedule', 'inventory',
  ]);
  const ARRAY_FIELDS = Object.freeze(['tiles', 'jobs', 'reservations', 'commandLog', 'eventLog']);

  // canonical 不排除任何影響世界的欄位；播放倍率、畫面、動畫、牆鐘本來就不在世界內。
  const CANONICAL_EXCLUDED_FIELDS = Object.freeze([]);

  // ---------- 整數取整契約（權威定義在 js/rules.js） ----------
  const BASIS_POINTS = Rules.BASIS_POINTS;
  const ROUNDING_MODE = Rules.ROUNDING_MODE;
  const mulBp = Rules.mulBp;

  // ---------- 小工具 ----------
  function fail(code, reason, where) {
    const r = { ok: false, code, reason };
    if (where) r.path = where;
    return r;
  }

  // JSON record：只接受普通物件（含 null 原型與跨 realm 的 Object）。Map／Set／Date／RegExp／Error、
  // class 實例、型別陣列、Symbol 鍵、不可列舉屬性、getter 一律不是，因為序列化會靜默遺失它們。
  const objectToString = Object.prototype.toString;
  function isJsonRecord(v) {
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
    if (objectToString.call(v) !== '[object Object]') return false;
    const proto = Object.getPrototypeOf(v);
    if (proto !== null) {
      // 必須是某個 realm 的 Object.prototype：其原型為 null，且自有 hasOwnProperty。
      if (Object.getPrototypeOf(proto) !== null || !Object.prototype.hasOwnProperty.call(proto, 'hasOwnProperty')) return false;
    }
    if (Object.getOwnPropertySymbols(v).length > 0) return false;
    const names = Object.getOwnPropertyNames(v);
    if (names.length !== Object.keys(v).length) return false;
    for (const k of names) {
      const d = Object.getOwnPropertyDescriptor(v, k);
      if (!('value' in d)) return false;
    }
    return true;
  }
  // 陣列必須是稠密的普通陣列：無空洞、無額外屬性、無 Symbol 鍵、元素皆為可列舉的資料屬性（無 accessor）。
  function isJsonArray(v) {
    if (!Array.isArray(v)) return false;
    if (Object.getOwnPropertySymbols(v).length > 0) return false;
    if (Object.getOwnPropertyNames(v).length !== v.length + 1) return false;
    for (let i = 0; i < v.length; i++) {
      // 只讀 descriptor，不讀值：accessor 的 getter／setter 絕不能被執行。
      const d = Object.getOwnPropertyDescriptor(v, i);
      if (!d || !('value' in d) || !d.enumerable) return false;
    }
    return true;
  }
  const isPlainObject = isJsonRecord;
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
      tiles: Rules.initialTiles(),
      disciples: [
        Object.assign({
          id: MASTER_ID, role: 'master', attributes: { ...MASTER_ATTRIBUTES },
        }, START_VALUES, { joinSlotIndex: 0 }),
        Object.assign({
          id: PROTAGONIST_ID, role: 'protagonist', templateId: options.templateId,
          attributes: deriveProtagonistAttributes(options),
        }, START_VALUES, { joinSlotIndex: 0 }),
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
      },
      schedule: { templates: {}, overrides: [] },
      inventory: Object.fromEntries(Object.keys(Rules.RECIPES).map((k) => [k, 0])),
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
      if (!isJsonArray(v)) return fail('bad_type', `${where} 不是稠密的 JSON 陣列（有空洞或額外屬性）`, where);
      for (let i = 0; i < v.length; i++) {
        const r = walkJson(v[i], `${where}[${i}]`, depth + 1);
        if (r) return r;
      }
      return null;
    }
    if (typeof v === 'object') {
      if (!isJsonRecord(v)) {
        return fail('bad_type', `${where} 不是 JSON 物件（Map／Set／Date／class 實例等會在序列化時靜默遺失內容）`, where);
      }
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
    if (!sameKeys(s, ['rescues', 'triggeredEventIds', 'invitations', 'organisationStatus'])) {
      return fail('bad_value', 'story 欄位不符', 'story');
    }
    if (!ORGANISATION_STATUSES.includes(s.organisationStatus)) {
      return fail('bad_value', 'story.organisationStatus 未知', 'story.organisationStatus');
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

  const HEX64 = /^[0-9a-f]{64}$/;
  const ACTION_IDS = Object.freeze(Object.keys(Rules.ACTIONS));

  // 課表：templates（角色 → 三個行動）與 overrides（單格覆寫，依 slotIndex、discipleId 排序以保證 canonical 唯一）。
  // 這裡只驗結構與引用；哪些行動「本版已支援」由 commands.js 決定。
  function validateSchedule(w, total) {
    const sc = w.schedule;
    if (!isPlainObject(sc) || !sameKeys(sc, ['templates', 'overrides'])) {
      return fail('bad_value', 'schedule 必須恰好含 templates 與 overrides', 'schedule');
    }
    const byId = new Map(w.disciples.map((d) => [d.id, d]));
    if (!isPlainObject(sc.templates)) return fail('bad_type', 'schedule.templates 必須是物件', 'schedule.templates');
    for (const id of Object.keys(sc.templates)) {
      if (!byId.has(id)) return fail('bad_value', `schedule.templates 含不在隊的角色：${id}`, 'schedule.templates');
      const t = sc.templates[id];
      if (!Array.isArray(t) || t.length !== 3 || !t.every((a) => typeof a === 'string' && ACTION_IDS.includes(a))) {
        return fail('bad_value', `schedule.templates.${id} 必須是三個已知行動 ID`, 'schedule.templates');
      }
    }
    if (!Array.isArray(sc.overrides)) return fail('bad_type', 'schedule.overrides 必須是陣列', 'schedule.overrides');
    let prev = null;
    for (const o of sc.overrides) {
      if (!isPlainObject(o) || !sameKeys(o, ['discipleId', 'slotIndex', 'action'])) {
        return fail('bad_value', 'schedule.overrides 項目必須恰好含 discipleId、slotIndex、action', 'schedule.overrides');
      }
      const d = typeof o.discipleId === 'string' ? byId.get(o.discipleId) : undefined;
      if (!d) return fail('bad_value', `schedule.overrides 含不在隊的角色：${String(o.discipleId)}`, 'schedule.overrides');
      if (!isNonNegInt(o.slotIndex) || o.slotIndex >= total) {
        return fail('bad_value', `schedule.overrides.slotIndex 必須是 0 到 ${total - 1} 的整數`, 'schedule.overrides');
      }
      if (o.slotIndex < d.joinSlotIndex) {
        return fail('inconsistent_roster', `${d.id} 在加入前（第 ${d.joinSlotIndex} 格）不得有排課`, 'schedule.overrides');
      }
      if (typeof o.action !== 'string' || !ACTION_IDS.includes(o.action)) {
        return fail('bad_value', `schedule.overrides.action 未知：${String(o.action)}`, 'schedule.overrides');
      }
      if (prev && (prev.slotIndex > o.slotIndex || (prev.slotIndex === o.slotIndex && prev.discipleId >= o.discipleId))) {
        return fail('bad_value', 'schedule.overrides 必須依 slotIndex、discipleId 嚴格遞增（無重複）', 'schedule.overrides');
      }
      prev = o;
    }
    return null;
  }


  // ---------- SG-04：地圖、庫存、工作（jobs）與預約（reservations） ----------
  const JOB_KINDS = Object.freeze(['build', 'craft']);
  const JOB_STATUSES = Object.freeze(['queued', 'active', 'done', 'cancelled']);
  const JOB_KEYS = Object.freeze([
    'id', 'kind', 'discipleId', 'status', 'queuedSlotIndex', 'waited', 'startSlotIndex', 'slotsDone',
    'completedSlotIndex', 'cancelledSlotIndex', 'target',
  ]);
  const RESERVATION_KEYS = Object.freeze(['jobId', 'discipleId', 'seat', 'startSlotIndex', 'slotsTotal', 'paid', 'output']);
  const OUTPUT_KEYS = Object.freeze(['itemId', 'amount', 'staminaAtStart', 'craft', 'multiplierBp']);
  const jobIdOf = (index) => `job-${String(index + 1).padStart(4, '0')}`;
  const facilitySeat = (facilityJobId) => `facility:${facilityJobId}`;
  const isNullOrNonNeg = (v) => v === null || isNonNegInt(v);

  function jobDuration(job) {
    return job.kind === 'build' ? Rules.FACILITIES[job.target.facilityType].durationSlots : Rules.RECIPES[job.target.recipeId].durationSlots;
  }
  function jobCost(job) {
    return job.kind === 'build' ? Rules.FACILITIES[job.target.facilityType].cost : Rules.RECIPES[job.target.recipeId].cost;
  }

  function validateTiles(w) {
    if (!Array.isArray(w.tiles) || canonicalize(w.tiles) !== canonicalize(Rules.initialTiles())) {
      return fail('bad_value', 'tiles 必須恰為 rules.initialTiles() 的固定 25 格地圖', 'tiles');
    }
    return null;
  }

  function validateInventory(w) {
    const keys = Object.keys(Rules.RECIPES);
    if (!isPlainObject(w.inventory) || !sameKeys(w.inventory, keys)) {
      return fail('bad_value', `inventory 必須恰好含 ${keys.join('、')}`, 'inventory');
    }
    for (const k of keys) {
      if (!isNonNegInt(w.inventory[k])) return fail('bad_value', `inventory.${k} 必須是非負整數`, 'inventory');
    }
    return null;
  }

  function validateJobs(w) {
    const where = (i) => `jobs[${i}]`;
    const bad = (i, reason) => fail('inconsistent_jobs', reason, where(i));
    const byDisciple = new Map(w.disciples.map((d) => [d.id, d]));
    const tileById = new Map(w.tiles.map((t) => [t.id, t]));
    const builds = []; // 未取消的 build job
    const activeByWorker = new Set();
    let prevQueued = 0;
    for (let i = 0; i < w.jobs.length; i++) {
      const j = w.jobs[i];
      if (!sameKeys(j, JOB_KEYS)) return fail('bad_value', `${where(i)} 欄位不符（需 ${JOB_KEYS.join('、')}）`, where(i));
      if (j.id !== jobIdOf(i)) return bad(i, `${where(i)}.id 必須是依序編號 ${jobIdOf(i)}`);
      if (typeof j.kind !== 'string' || !JOB_KINDS.includes(j.kind)) return fail('bad_value', `${where(i)}.kind 未知`, where(i));
      if (typeof j.status !== 'string' || !JOB_STATUSES.includes(j.status)) return fail('bad_value', `${where(i)}.status 未知`, where(i));
      if (typeof j.discipleId !== 'string') return fail('bad_type', `${where(i)}.discipleId 必須是字串`, where(i));
      const worker = byDisciple.get(j.discipleId);
      if (!worker) return bad(i, `${where(i)}.discipleId 不在隊：${j.discipleId}`);
      for (const k of ['queuedSlotIndex', 'waited', 'slotsDone']) {
        if (!isNonNegInt(j[k])) return fail('bad_value', `${where(i)}.${k} 必須是非負整數`, where(i));
      }
      for (const k of ['startSlotIndex', 'completedSlotIndex', 'cancelledSlotIndex']) {
        if (!isNullOrNonNeg(j[k])) return fail('bad_value', `${where(i)}.${k} 必須是非負整數或 null`, where(i));
      }
      if (j.queuedSlotIndex > w.slotIndex || j.queuedSlotIndex < prevQueued || j.queuedSlotIndex < worker.joinSlotIndex) {
        return bad(i, `${where(i)}.queuedSlotIndex 必須不晚於目前格、不早於前一個 job 與角色加入格`);
      }
      prevQueued = j.queuedSlotIndex;
      // target
      const t = j.target;
      if (!isPlainObject(t)) return fail('bad_type', `${where(i)}.target 必須是物件`, where(i));
      if (j.kind === 'build') {
        if (!sameKeys(t, ['facilityType', 'tileId'])) return fail('bad_value', `${where(i)}.target 必須恰好含 facilityType、tileId`, where(i));
        if (typeof t.facilityType !== 'string' || !hasOwn(Rules.FACILITIES, t.facilityType)) return fail('bad_value', `${where(i)}.target.facilityType 未知`, where(i));
        const tile = typeof t.tileId === 'string' ? tileById.get(t.tileId) : undefined;
        if (!tile || !Rules.TERRAIN[tile.terrain].buildable) return bad(i, `${where(i)}.target.tileId 必須是可建地塊`);
        if (j.status !== 'cancelled') builds.push(j);
      } else {
        if (!sameKeys(t, ['recipeId', 'facilityJobId'])) return fail('bad_value', `${where(i)}.target 必須恰好含 recipeId、facilityJobId`, where(i));
        if (typeof t.recipeId !== 'string' || !hasOwn(Rules.RECIPES, t.recipeId)) return fail('bad_value', `${where(i)}.target.recipeId 未知`, where(i));
        const fac = typeof t.facilityJobId === 'string' ? w.jobs.slice(0, i).find((x) => x.id === t.facilityJobId) : undefined;
        if (!fac || fac.kind !== 'build' || fac.target.facilityType !== 'alchemyRoom') {
          return bad(i, `${where(i)}.target.facilityJobId 必須指向較早排入的丹房工程`);
        }
      }
      // 狀態一致性
      const duration = jobDuration(j);
      const waitedCap = (j.startSlotIndex !== null ? j.startSlotIndex : j.cancelledSlotIndex !== null ? j.cancelledSlotIndex : w.slotIndex) - j.queuedSlotIndex;
      if (j.waited > Math.max(0, waitedCap)) return bad(i, `${where(i)}.waited 不得超過自排隊起經過的格數`);
      if (j.status === 'queued') {
        if (j.startSlotIndex !== null || j.slotsDone !== 0 || j.completedSlotIndex !== null || j.cancelledSlotIndex !== null) {
          return bad(i, `${where(i)} 為 queued 時不得有開工／進度／完工／取消紀錄`);
        }
      } else if (j.status === 'cancelled') {
        if (j.startSlotIndex !== null || j.slotsDone !== 0 || j.completedSlotIndex !== null
          || j.cancelledSlotIndex === null || j.cancelledSlotIndex < j.queuedSlotIndex || j.cancelledSlotIndex > w.slotIndex) {
          return bad(i, `${where(i)} 為 cancelled 時必須有合理的取消格，且從未開工`);
        }
      } else {
        if (j.startSlotIndex === null || j.startSlotIndex < j.queuedSlotIndex || j.cancelledSlotIndex !== null) {
          return bad(i, `${where(i)} 開工格不得早於排隊格，且不得有取消紀錄`);
        }
        if (j.status === 'active') {
          if (j.completedSlotIndex !== null || j.slotsDone !== w.slotIndex - j.startSlotIndex || j.slotsDone < 1 || j.slotsDone >= duration) {
            return bad(i, `${where(i)} 為 active 時進度必須等於已結算格數（1..${duration - 1}）且未完工`);
          }
          if (activeByWorker.has(j.discipleId)) return bad(i, `${j.discipleId} 同時有多個進行中的工作`);
          activeByWorker.add(j.discipleId);
        } else {
          if (j.slotsDone !== duration || j.completedSlotIndex !== j.startSlotIndex + duration - 1 || j.completedSlotIndex >= w.slotIndex) {
            return bad(i, `${where(i)} 為 done 時進度必須等於工期，完工格＝開工格＋工期−1，且已結算`);
          }
        }
        if (j.kind === 'craft') {
          const fac = w.jobs.find((x) => x.id === j.target.facilityJobId);
          if (fac.status !== 'done' || fac.completedSlotIndex >= j.startSlotIndex) {
            return bad(i, `${where(i)} 煉丹開工格必須晚於丹房完工格（完工次格才可用）`);
          }
        }
      }
    }
    // 設施上限與地塊互斥（含排隊／施工／已完工）
    const tilesUsed = new Set();
    const counts = {};
    for (const b of builds) {
      if (tilesUsed.has(b.target.tileId)) return fail('inconsistent_jobs', `同一地塊不可有兩個工程：${b.target.tileId}`, 'jobs');
      tilesUsed.add(b.target.tileId);
      counts[b.target.facilityType] = (counts[b.target.facilityType] || 0) + 1;
      if (counts[b.target.facilityType] > Rules.FACILITIES[b.target.facilityType].maxCount) {
        return fail('inconsistent_jobs', `設施 ${b.target.facilityType} 超過上限 ${Rules.FACILITIES[b.target.facilityType].maxCount}`, 'jobs');
      }
    }
    const seatUse = {};
    for (const j of w.jobs) {
      if (j.status === 'active' && j.kind === 'craft') {
        const fac = w.jobs.find((x) => x.id === j.target.facilityJobId);
        seatUse[fac.id] = (seatUse[fac.id] || 0) + 1;
        if (seatUse[fac.id] > Rules.FACILITIES[fac.target.facilityType].workSlots) {
          return fail('inconsistent_jobs', `設施工作位超過 ${Rules.FACILITIES[fac.target.facilityType].workSlots}`, 'jobs');
        }
      }
    }
    return null;
  }

  function validateReservations(w) {
    const where = (i) => `reservations[${i}]`;
    const bad = (i, reason) => fail('inconsistent_jobs', reason, where(i));
    const active = w.jobs.filter((j) => j.status === 'active');
    for (const r of w.reservations) {
      if (!sameKeys(r, RESERVATION_KEYS)) return fail('bad_value', `reservations 項目欄位不符（需 ${RESERVATION_KEYS.join('、')}）`, 'reservations');
    }
    if (w.reservations.length !== active.length) {
      return fail('inconsistent_jobs', 'reservations 必須與進行中（active）的 job 一一對應', 'reservations');
    }
    for (let i = 0; i < active.length; i++) {
      const j = active[i];
      const r = w.reservations[i];
      if (r.jobId !== j.id) return bad(i, `${where(i)}.jobId 必須依 job 順序對應進行中的工作 ${j.id}`);
      if (r.discipleId !== j.discipleId) return bad(i, `${where(i)}.discipleId 必須與 job 相同`);
      if (r.startSlotIndex !== j.startSlotIndex) return bad(i, `${where(i)}.startSlotIndex 必須與 job 相同`);
      if (r.slotsTotal !== jobDuration(j)) return bad(i, `${where(i)}.slotsTotal 必須等於工期`);
      if (!isPlainObject(r.paid) || canonicalize(r.paid) !== canonicalize(jobCost(j))) return bad(i, `${where(i)}.paid 必須等於開工時一次扣掉的成本`);
      if (j.kind === 'build') {
        if (r.seat !== null || r.output !== null) return bad(i, `${where(i)} 建造沒有工作位與產出`);
        continue;
      }
      const facJob = w.jobs.find((x) => x.id === j.target.facilityJobId);
      if (r.seat !== facilitySeat(facJob.id)) return bad(i, `${where(i)}.seat 必須是 ${facilitySeat(facJob.id)}`);
      const o = r.output;
      if (!isPlainObject(o) || !sameKeys(o, OUTPUT_KEYS)) return fail('bad_value', `${where(i)}.output 欄位不符`, where(i));
      const worker = w.disciples.find((d) => d.id === j.discipleId);
      const mult = Rules.evaluateFacilityPlacement(w.tiles, facJob.target.tileId, 'alchemyRoom').multiplierBp;
      let expected = null;
      if (isNonNegInt(o.staminaAtStart) && o.staminaAtStart <= Rules.VALUE_LIMITS.staminaMax) {
        expected = Rules.brewOutput({ recipeId: j.target.recipeId, craft: worker.attributes.craft, stamina: o.staminaAtStart, tileMultiplierBp: mult }).amount;
      }
      if (o.itemId !== j.target.recipeId || o.craft !== worker.attributes.craft || o.multiplierBp !== mult || expected === null || o.amount !== expected) {
        return bad(i, `${where(i)}.output 必須與開工格格初快照用 rules.js 重算的結果一致`);
      }
    }
    return null;
  }

  // 命令紀錄與事件紀錄：序號連續、revision 一致，才能做冪等重送與回放核對。
  function validateLogs(w) {
    const log = w.commandLog;
    const ev = w.eventLog;
    if (w.revision < log.length) return fail('inconsistent_log', 'revision 不得小於已接受命令數', 'commandLog');
    const ids = new Set();
    let prevAfter = 0;
    for (let i = 0; i < log.length; i++) {
      const c = log[i];
      const where = `commandLog[${i}]`;
      if (!sameKeys(c, ['seq', 'id', 'type', 'payloadHash', 'revisionBefore', 'revisionAfter', 'eventSeqs'])) {
        return fail('bad_value', `${where} 欄位不符`, where);
      }
      if (c.seq !== i + 1) return fail('inconsistent_log', `${where}.seq 必須連續（應為 ${i + 1}）`, where);
      if (typeof c.id !== 'string' || c.id.length === 0) return fail('bad_type', `${where}.id 必須是非空字串`, where);
      if (ids.has(c.id)) return fail('duplicate_id', `命令 ID 重複：${c.id}`, where);
      ids.add(c.id);
      if (typeof c.type !== 'string' || c.type.length === 0) return fail('bad_type', `${where}.type 必須是非空字串`, where);
      if (typeof c.payloadHash !== 'string' || !HEX64.test(c.payloadHash)) return fail('bad_value', `${where}.payloadHash 必須是 64 位小寫十六進位`, where);
      if (!isNonNegInt(c.revisionBefore) || c.revisionAfter !== c.revisionBefore + 1) {
        return fail('inconsistent_log', `${where}.revisionAfter 必須是 revisionBefore + 1`, where);
      }
      if (c.revisionBefore < prevAfter || c.revisionAfter > w.revision) {
        return fail('inconsistent_log', `${where} 的 revision 與前後紀錄或世界不一致`, where);
      }
      prevAfter = c.revisionAfter;
      if (!Array.isArray(c.eventSeqs) || !c.eventSeqs.every((q) => isNonNegInt(q) && q >= 1 && q <= ev.length)) {
        return fail('bad_value', `${where}.eventSeqs 必須是指向 eventLog 的序號陣列`, where);
      }
    }
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      const where = `eventLog[${i}]`;
      if (e.seq !== i + 1) return fail('inconsistent_log', `${where}.seq 必須連續（應為 ${i + 1}）`, where);
      if (typeof e.type !== 'string' || e.type.length === 0) return fail('bad_type', `${where}.type 必須是非空字串`, where);
      if (!isNonNegInt(e.slotIndex) || e.slotIndex > w.slotIndex) {
        return fail('bad_value', `${where}.slotIndex 必須是不晚於目前格的非負整數`, where);
      }
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
    const tilesErr = validateTiles(w);
    if (tilesErr) return tilesErr;
    const invErr = validateInventory(w);
    if (invErr) return invErr;
    if (!Array.isArray(w.pendingEvents)) return fail('bad_type', 'pendingEvents 必須是陣列', 'pendingEvents');
    const seenPending = new Set();
    for (const e of w.pendingEvents) {
      if (!isPlainObject(e) || typeof e.id !== 'string' || e.id.length === 0) {
        return fail('bad_type', 'pendingEvents 項目必須是含非空字串 id 的物件', 'pendingEvents');
      }
      if (!sameKeys(e, ['id', 'raisedSlotIndex'])) {
        return fail('bad_value', 'pendingEvents 項目必須恰好含 id 與 raisedSlotIndex', 'pendingEvents');
      }
      if (!isNonNegInt(e.raisedSlotIndex) || e.raisedSlotIndex > w.slotIndex) {
        return fail('bad_value', 'pendingEvents.raisedSlotIndex 必須是不晚於目前格的非負整數', 'pendingEvents');
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
    const scheduleErr = validateSchedule(w, total);
    if (scheduleErr) return scheduleErr;
    const jobsErr = validateJobs(w);
    if (jobsErr) return jobsErr;
    const resvErr = validateReservations(w);
    if (resvErr) return resvErr;
    const logErr = validateLogs(w);
    if (logErr) return logErr;

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
        if (Array.isArray(value)) {
          if (!isJsonArray(value)) throw new TypeError('canonical 不接受稀疏陣列或帶額外屬性的陣列');
          return `[${value.map(canonicalize).join(',')}]`;
        }
        if (!isJsonRecord(value)) {
          throw new TypeError('canonical 只接受 JSON 物件，不接受 Map／Set／Date／class 實例等');
        }
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
  // 先驗證再輸出：不合法的 world（resolving、未知版本、非 JSON 資料…）不得被序列化，
  // 避免呼叫端（SG-07）把未驗證的字串當成已通過驗證的存檔。
  function serializeState(world) {
    const v = validateWorld(world);
    if (!v.ok) throw new TypeError(`serializeState 拒絕不合法的世界狀態：${v.code}：${v.reason}`);
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
    INVITATION_STATUSES, ACTION_IDS, MASTER_ID, PROTAGONIST_ID, CANDIDATE_IDS, MAX_ROSTER,
    CHARACTER_OPTION_LIMITS, DEFAULT_CHARACTER_OPTIONS, CANONICAL_EXCLUDED_FIELDS,
    BASIS_POINTS, ROUNDING_MODE,
    newWorld, validateCharacterOptions, validateWorld, rosterAt, jobIdOf, jobDuration, jobCost, facilitySeat,
    canonicalize, sha256Hex, hashWorld, serializeState, parseState, mulBp,
  };
});
