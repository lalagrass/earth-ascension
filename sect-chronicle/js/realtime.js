/*
 * SG-RT-01：即時世界、移動與工作核心。
 *
 * 一個 RT 世界只由本模組推進。slot 的 Engine.advance／Commands.dispatch 對 RT 世界回 wrong_mode；
 * advanceTicks 對 slot 世界回 wrong_mode。不實作自主決策、突破詢問、瀏覽器存檔或播放控制器。
 * setGoals／setPolicy 只驗證並保存凍結形狀。效果沿用 rules.js 純函式，在工作單位完成時結算一次。
 */
(function (root, factory) {
  'use strict';
  let Rng;
  let Rules;
  let State;
  let Progression;
  let Engine;
  let Story;
  if (typeof module === 'object' && module && module.exports) {
    Rng = require('./rng.js');
    Rules = require('./rules.js');
    State = require('./state.js');
    Progression = require('./progression.js');
    Engine = require('./engine.js');
    Story = require('./story.js');
    module.exports = factory(Rng, Rules, State, Progression, Engine, Story);
  } else {
    const ns = root.SectChronicle || {};
    Rng = ns.Rng;
    Rules = ns.Rules;
    State = ns.State;
    Progression = ns.Progression;
    Engine = ns.Engine;
    Story = ns.Story;
    if (!Rng || !Rules || !State || !Progression || !Engine || !Story) {
      throw new Error('realtime.js 需要先載入 rng、rules、state、story-data、story、progression、commands、engine');
    }
    ns.Realtime = factory(Rng, Rules, State, Progression, Engine, Story);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rng, Rules, State, Progression, Engine, Story) {
  'use strict';

  const SCHEMA_VERSION = 5;
  const RULE_VERSION = Rules.RT_RULE_VERSION;
  const RNG_VERSION = Rng.RNG_VERSION;
  const SCENARIO_ID = 'life-rt';
  const PILL_ID = 'breakthrough-pill';
  const TICK = Rules.TICKS_PER_SLOT;
  const STEP = Rules.STEP_TICKS;
  const RESOURCE_KEYS = Object.freeze(['spiritMaterial', 'spiritHerb', 'spiritStone', 'reputation']);
  const PAID_KEYS = Object.freeze([...RESOURCE_KEYS, 'pills']);
  const INTERRUPTIBLE = new Set(['gather-material', 'gather-herb', 'cultivate', 'rest', 'tune-mind']);
  const PROMISE = new Set(['build', 'brew', 'aid', 'breakthrough', 'support']);
  const ORDER_KINDS = Object.freeze(['gather-material', 'gather-herb', 'cultivate', 'rest', 'tune-mind', 'build', 'brew', 'aid', 'breakthrough']);
  const POLICY_ENUM = Object.freeze({
    aid: Object.freeze(['auto-free', 'auto-supplied', 'ask', 'off']),
    recruit: Object.freeze(['auto-accept', 'ask', 'off']),
    breakthrough: Object.freeze(['auto', 'ask', 'off']),
    breakthroughPill: Object.freeze(['use', 'never']),
    breakthroughSupport: Object.freeze(['auto', 'never']),
  });
  const DEFAULT_POLICY = Object.freeze({
    aid: 'auto-free', recruit: 'auto-accept', breakthrough: 'auto', breakthroughPill: 'use', breakthroughSupport: 'auto',
  });
  const ASK_POLICY = Object.freeze({
    aid: 'ask', recruit: 'ask', breakthrough: 'ask', breakthroughPill: 'use', breakthroughSupport: 'auto',
  });
  const TOP_FIELDS = Object.freeze([
    'schemaVersion', 'ruleVersion', 'rngVersion', 'seed', 'scenarioId', 'clock', 'revision', 'rngState',
    'resources', 'inventory', 'tiles', 'disciples', 'candidates', 'activities', 'reservations', 'seatWaits',
    'pendingEvents', 'commandLog', 'eventLog', 'characterOptions', 'protagonistId', 'masterId', 'story',
    'policy', 'goals', 'goalsRevision',
  ]);
  const ACTIVITY_KEYS = Object.freeze([
    'id', 'discipleId', 'kind', 'target', 'units', 'unitsDone', 'workTicks', 'status', 'origin', 'manualSeq',
    'requestedTick', 'departTick', 'arriveTick', 'startTick', 'completedTick', 'waited', 'paid', 'refunded',
    'snapshot', 'anchorSnapshot', 'fallback', 'originPos', 'dest', 'path', 'pathIndex', 'stepTicks', 'halt',
    'partnerWait', 'seatKey', 'partner', 'partnerActivityId', 'usePill', 'supporterId', 'outcome',
  ]);
  const BT_ONLY = new Set(['usePill', 'supporterId', 'outcome']);
  const PARTNER_KINDS = new Set(['breakthrough', 'support']);

  const isInt = (v) => typeof v === 'number' && Number.isSafeInteger(v) && !Object.is(v, -0);
  const isNonNeg = (v) => isInt(v) && v >= 0;
  const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const reject = (code, reason) => ({ ok: false, code, reason });
  const fail = (code, reason, path) => {
    const r = reject(code, reason);
    if (path) r.path = path;
    return r;
  };
  const sameKeys = (o, keys) => {
    const a = Object.keys(o).sort();
    const b = [...keys].sort();
    return a.length === b.length && a.every((k, i) => k === b[i]);
  };
  const samePos = (a, b) => !!a && !!b && a.r === b.r && a.c === b.c;
  const pos = (r, c) => ({ r, c });
  const dojo = () => pos(Rules.DOJO.r, Rules.DOJO.c);
  const gate = () => pos(Rules.VILLAGE_GATE.r, Rules.VILLAGE_GATE.c);
  const slotEqOf = (tick) => Math.floor(tick / TICK);
  const zeroPaid = () => ({ spiritMaterial: 0, spiritHerb: 0, spiritStone: 0, reputation: 0, pills: 0 });
  const actId = (n) => `act-${String(n).padStart(4, '0')}`;

  function pathBetween(from, to) {
    if (samePos(from, to)) return [];
    const g = gate();
    const mouth = pos(2, 0);
    if (samePos(from, g)) return [mouth].concat(pathBetween(mouth, to));
    if (samePos(to, g)) return pathBetween(from, mouth).concat([g]);
    const steps = [];
    let r = from.r;
    let c = from.c;
    const dr = Math.sign(to.r - r);
    while (r !== to.r) {
      r += dr;
      steps.push(pos(r, c));
    }
    const dc = Math.sign(to.c - c);
    while (c !== to.c) {
      c += dc;
      steps.push(pos(r, c));
    }
    return steps;
  }

  function onBoard(p) {
    return isRecord(p) && sameKeys(p, ['r', 'c']) && isInt(p.r) && isInt(p.c)
      && ((p.r >= 0 && p.r < 5 && p.c >= 0 && p.c < 5) || (p.r === 2 && p.c === -1));
  }

  function tileById(world, id) {
    return world.tiles.find((t) => t.id === id) || null;
  }
  function tilePos(tile) {
    return pos(tile.row, tile.col);
  }
  function doneBuild(world, facilityType) {
    return world.activities.find((a) => a.kind === 'build' && a.status === 'done' && a.target.facilityType === facilityType) || null;
  }
  function openBuildCount(world, facilityType) {
    return world.activities.filter((a) => a.kind === 'build' && a.status !== 'cancelled' && a.target.facilityType === facilityType).length;
  }
  function disciple(world, id) {
    return world.disciples.find((d) => d.id === id) || null;
  }
  function activeOf(world, id) {
    const d = disciple(world, id);
    if (!d || d.activityId === null) return null;
    return world.activities.find((a) => a.id === d.activityId) || null;
  }
  function activeActivities(world) {
    return world.activities.filter((a) => a.status === 'traveling' || a.status === 'working');
  }
  function pushEvent(world, event) {
    const row = Object.assign({ seq: world.eventLog.length + 1, tick: world.clock.tick }, event);
    world.eventLog.push(row);
    return row;
  }

  function defaultGoals() {
    return [
      { id: 'goal-alchemy', kind: 'buildFacility', facilityType: 'alchemyRoom' },
      { id: 'goal-pills', kind: 'stockPills', count: 2 },
      { id: 'goal-aid', kind: 'aid' },
      { id: 'goal-recruit', kind: 'recruit' },
      { id: 'goal-cultivate', kind: 'cultivateTo100', discipleId: 'all' },
      { id: 'goal-breakthrough', kind: 'breakthrough', discipleId: 'all' },
    ];
  }

  function blankDisciple(id, role, attributes, templateId) {
    const row = {
      id, role, attributes: { rootBone: attributes.rootBone, comprehension: attributes.comprehension, craft: attributes.craft },
      stamina: Rules.START_VALUES.stamina, mind: Rules.START_VALUES.mind,
      cultivation: Rules.START_VALUES.cultivation, injury: Rules.START_VALUES.injury,
      joinTick: 0, breakthroughs: 0, pos: dojo(), activityId: null, manualOrder: null,
      autonomy: { decisionSeq: 0, wait: null, resumeReason: null },
    };
    if (templateId) row.templateId = templateId;
    return row;
  }

  function createWorld(seed, characterOptions) {
    if (typeof seed !== 'string' || seed.length < 1 || seed.length > 64) {
      return reject('bad_seed', 'seed 必須是 1 到 64 字元的字串');
    }
    let options;
    if (characterOptions === undefined) options = clone(State.DEFAULT_CHARACTER_OPTIONS);
    else {
      const v = State.validateCharacterOptions(characterOptions);
      if (!v.ok) return v;
      options = v.value;
    }
    const base = Rules.CHARACTER_OPTION_LIMITS.templates[options.templateId];
    const attributes = {
      rootBone: base.rootBone + options.allocation.rootBone,
      comprehension: base.comprehension + options.allocation.comprehension,
      craft: base.craft + options.allocation.craft,
    };
    const state = {
      schemaVersion: SCHEMA_VERSION,
      ruleVersion: RULE_VERSION,
      rngVersion: RNG_VERSION,
      seed,
      scenarioId: SCENARIO_ID,
      clock: { tick: 0 },
      revision: 0,
      rngState: Rng.create(seed),
      resources: { spiritMaterial: 0, spiritHerb: 0, spiritStone: 0, reputation: 0 },
      inventory: { [PILL_ID]: 0 },
      tiles: Rules.initialTiles(),
      disciples: [
        blankDisciple(State.MASTER_ID, 'master', Rules.MASTER_ATTRIBUTES, null),
        blankDisciple(State.PROTAGONIST_ID, 'protagonist', attributes, options.templateId),
      ],
      candidates: State.CANDIDATE_IDS.map((id, i) => ({ id, order: i + 1 })),
      activities: [],
      reservations: [],
      seatWaits: [],
      pendingEvents: [],
      commandLog: [],
      eventLog: [],
      characterOptions: options,
      protagonistId: State.PROTAGONIST_ID,
      masterId: State.MASTER_ID,
      story: {
        rescues: [],
        triggeredEventIds: [],
        invitations: {
          'cand-1': { status: 'locked', joinTick: null },
          'cand-2': { status: 'locked', joinTick: null },
        },
        organisationStatus: 'dojo',
        breakthroughAsks: {},
      },
      policy: clone(DEFAULT_POLICY),
      goals: defaultGoals(),
      goalsRevision: 0,
    };
    const check = validateWorld(state);
    if (!check.ok) throw new Error(`createWorld 產生了不合法狀態：${check.code} ${check.reason}`);
    return { ok: true, state };
  }

  function versionGate(w) {
    if (!isRecord(w)) return fail('not_object', '世界狀態必須是物件');
    const slotLegal = w.scenarioId === 'slice-14' && w.schemaVersion === 4 && w.ruleVersion === 3;
    if (slotLegal) return fail('old_mode_unsupported', '舊 slot 存檔不能從 RT 入口載入；原檔與現有世界都未改寫');
    const rtShape = w.scenarioId === 'life-rt' || w.schemaVersion === 5 || w.ruleVersion === 4;
    const slotShape = w.scenarioId === 'slice-14' || w.schemaVersion === 4 || w.ruleVersion === 3 || has(w, 'slotIndex');
    if (rtShape && (w.scenarioId !== 'life-rt' || w.schemaVersion !== 5 || w.ruleVersion !== 4)) {
      return fail('mode_mismatch', 'life-rt 只接受 schemaVersion 5 與 ruleVersion 4，不換算、不升級');
    }
    if (!rtShape && slotShape) return fail('old_mode_unsupported', '舊 slot 存檔不能從 RT 入口載入；原檔與現有世界都未改寫');
    if (w.schemaVersion !== 5) return fail('unknown_schema_version', `schemaVersion 為 ${JSON.stringify(w.schemaVersion)}，RT 只支援 5`, 'schemaVersion');
    if (w.ruleVersion !== 4) return fail('unknown_rule_version', `ruleVersion 為 ${JSON.stringify(w.ruleVersion)}，RT 只支援 4`, 'ruleVersion');
    if (w.rngVersion !== 1) return fail('unknown_rng_version', `rngVersion 為 ${JSON.stringify(w.rngVersion)}，只支援 1`, 'rngVersion');
    if (w.scenarioId !== SCENARIO_ID) return fail('unknown_scenario', `未知情境：${String(w.scenarioId)}`, 'scenarioId');
    return null;
  }

  function validateGoal(g, where) {
    if (!isRecord(g) || typeof g.id !== 'string' || g.id.length === 0 || typeof g.kind !== 'string') {
      return fail('bad_goal', `${where} 需要 id 與 kind`, where);
    }
    if (g.kind === 'buildFacility') {
      if (!sameKeys(g, ['id', 'kind', 'facilityType']) || !has(Rules.FACILITIES, g.facilityType)) {
        return fail('bad_goal', `${where} buildFacility 需要已宣告的 facilityType`, where);
      }
    } else if (g.kind === 'stockPills') {
      if (!sameKeys(g, ['id', 'kind', 'count']) || !isInt(g.count) || g.count < 1) {
        return fail('bad_goal', `${where} stockPills.count 必須是正整數`, where);
      }
    } else if (g.kind === 'aid' || g.kind === 'recruit') {
      if (!sameKeys(g, ['id', 'kind'])) return fail('bad_goal', `${where} 只能含 id、kind`, where);
    } else if (g.kind === 'cultivateTo100' || g.kind === 'breakthrough') {
      if (!sameKeys(g, ['id', 'kind', 'discipleId']) || typeof g.discipleId !== 'string' || g.discipleId.length === 0) {
        return fail('bad_goal', `${where} 需要 discipleId`, where);
      }
    } else return fail('bad_goal', `${where} 未知目標種類 ${g.kind}`, where);
    return null;
  }

  function validatePolicy(p, where) {
    if (!isRecord(p) || !sameKeys(p, Object.keys(POLICY_ENUM))) return fail('bad_policy', `${where} 欄位必須恰好是政策五欄`, where);
    for (const k of Object.keys(POLICY_ENUM)) {
      if (!POLICY_ENUM[k].includes(p[k])) return fail('bad_policy', `${where}.${k} 不是合法值`, where);
    }
    return null;
  }

  function expectedActivityKeys(kind) {
    const ban = new Set(BT_ONLY);
    if (!PARTNER_KINDS.has(kind)) {
      ban.add('partner');
      ban.add('partnerActivityId');
    }
    if (kind === 'breakthrough') ban.clear();
    if (kind === 'support') {
      ban.delete('partner');
      ban.delete('partnerActivityId');
    }
    return ACTIVITY_KEYS.filter((k) => !ban.has(k));
  }

  function validateWorld(w) {
    const gateErr = versionGate(w);
    if (gateErr) return gateErr;
    for (const k of Object.keys(w)) {
      if (!TOP_FIELDS.includes(k)) return fail('unknown_field', `未知欄位 ${k}`, k);
    }
    for (const k of TOP_FIELDS) {
      if (!has(w, k)) return fail('missing_field', `缺少欄位 ${k}`, k);
    }
    if (has(w, 'slotIndex') || has(w, 'schedule') || has(w, 'jobs') || has(w, 'phase')) {
      return fail('mixed_mode', 'RT 世界不能同時含 slot 欄位');
    }
    if (typeof w.seed !== 'string' || w.seed.length < 1 || w.seed.length > 64) return fail('bad_seed', 'seed 不合法', 'seed');
    if (!isRecord(w.clock) || !sameKeys(w.clock, ['tick']) || !isNonNeg(w.clock.tick)) {
      return fail('bad_clock', 'clock 只能是 { tick } 非負整數', 'clock');
    }
    if (!Array.isArray(w.commandLog)) return fail('bad_type', 'commandLog 必須是陣列', 'commandLog');
    if (!Array.isArray(w.eventLog)) return fail('bad_type', 'eventLog 必須是陣列', 'eventLog');
    if (!isNonNeg(w.revision) || w.revision !== w.clock.tick + w.commandLog.length) {
      return fail('inconsistent_revision', 'revision 必須等於已提交 tick 數加已接受命令數', 'revision');
    }
    const rs = Rng.validateState(w.rngState);
    if (!rs.ok) return fail(rs.code, rs.reason, 'rngState');
    if (!isRecord(w.resources) || !sameKeys(w.resources, RESOURCE_KEYS)) return fail('bad_value', 'resources 欄位不完整', 'resources');
    for (const k of RESOURCE_KEYS) {
      if (!isNonNeg(w.resources[k])) return fail('bad_value', `resources.${k} 必須是非負整數`, 'resources');
    }
    if (!isRecord(w.inventory) || !sameKeys(w.inventory, [PILL_ID]) || !isNonNeg(w.inventory[PILL_ID])) {
      return fail('bad_value', 'inventory 只能含非負的凝氣丹', 'inventory');
    }
    if (!Array.isArray(w.tiles) || State.canonicalize(w.tiles) !== State.canonicalize(Rules.initialTiles())) {
      return fail('bad_value', 'tiles 必須是固定 25 格地圖', 'tiles');
    }
    if (!Array.isArray(w.disciples) || w.disciples.length < 2 || w.disciples.length > State.MAX_ROSTER) {
      return fail('bad_value', '弟子人數不合法', 'disciples');
    }
    const ids = new Set();
    for (let i = 0; i < w.disciples.length; i += 1) {
      const d = w.disciples[i];
      const where = `disciples[${i}]`;
      if (!isRecord(d)) return fail('bad_type', `${where} 必須是物件`, where);
      if (ids.has(d.id)) return fail('bad_value', `${where} id 重複`, where);
      ids.add(d.id);
      if (!onBoard(d.pos)) return fail('bad_position', `${where}.pos 超出棋盤與村口`, where);
      if (d.activityId !== null && typeof d.activityId !== 'string') return fail('bad_value', `${where}.activityId 不合法`, where);
      if (!isRecord(d.autonomy) || !sameKeys(d.autonomy, ['decisionSeq', 'wait', 'resumeReason'])) {
        return fail('bad_value', `${where}.autonomy 欄位不合法`, where);
      }
      if (d.autonomy.wait !== null) return fail('not_supported', '等待狀態屬 RT-02，本包拒絕非空 wait', `${where}.autonomy.wait`);
      if (d.autonomy.resumeReason !== null && typeof d.autonomy.resumeReason !== 'string') {
        return fail('bad_value', `${where}.autonomy.resumeReason 不合法`, where);
      }
      if (!isNonNeg(d.autonomy.decisionSeq)) return fail('bad_value', `${where}.autonomy.decisionSeq 不合法`, where);
      if (d.activityId !== null && d.autonomy.wait !== null) return fail('inconsistent_state', '活動與等待互斥', where);
      for (const stat of ['stamina', 'mind', 'injury']) {
        if (!isInt(d[stat]) || d[stat] < 0 || d[stat] > 100) return fail('bad_value', `${where}.${stat} 超出 0..100`, where);
      }
      if (!isInt(d.cultivation) || d.cultivation < 0 || d.cultivation > 100) return fail('bad_value', `${where}.cultivation 超出 0..100`, where);
      if (d.breakthroughs !== 0 && d.breakthroughs !== 1) return fail('bad_value', `${where}.breakthroughs 只能是 0 或 1`, where);
      if (!isNonNeg(d.joinTick) || d.joinTick > w.clock.tick) return fail('bad_value', `${where}.joinTick 晚於現在`, where);
      const attrErr = validateAttributes(d, where);
      if (attrErr) return attrErr;
      const orderErr = validateManualOrder(w, d, where);
      if (orderErr) return orderErr;
    }
    if (w.disciples[0].id !== State.MASTER_ID || w.disciples[0].role !== 'master') return fail('bad_value', '第一位必須是師父', 'disciples');
    if (w.disciples[1].id !== State.PROTAGONIST_ID || w.disciples[1].role !== 'protagonist') return fail('bad_value', '第二位必須是主角', 'disciples');
    if (w.protagonistId !== State.PROTAGONIST_ID || w.masterId !== State.MASTER_ID) return fail('bad_value', '主角或師父 id 不符', 'protagonistId');
    if (!Array.isArray(w.activities)) return fail('bad_type', 'activities 必須是陣列', 'activities');
    const actIds = new Set();
    let openBreakthroughs = 0;
    const successes = new Map();
    for (let i = 0; i < w.activities.length; i += 1) {
      const a = w.activities[i];
      const where = `activities[${i}]`;
      if (!isRecord(a) || a.id !== actId(i + 1)) return fail('bad_value', `${where}.id 必須連續`, where);
      actIds.add(a.id);
      const keys = expectedActivityKeys(a.kind);
      if (!sameKeys(a, keys)) return fail('bad_value', `${where} 欄位與種類 ${a.kind} 不符`, where);
      if (!['traveling', 'working', 'done', 'cancelled'].includes(a.status)) return fail('bad_value', `${where}.status 不合法`, where);
      if (!isNonNeg(a.units) || a.units < 1 || !isNonNeg(a.unitsDone) || a.unitsDone > a.units) {
        return fail('bad_work', `${where} 單位數不合法`, where);
      }
      if (!isNonNeg(a.workTicks) || a.workTicks !== a.unitsDone * TICK + (a.status === 'working' ? a.workTicks % TICK : 0)) {
        if (a.status === 'working') {
          const extra = a.workTicks - a.unitsDone * TICK;
          if (extra < 0 || extra >= TICK) return fail('bad_work', `${where}.workTicks 與 unitsDone 不合`, where);
        } else if (a.workTicks !== a.unitsDone * TICK) {
          return fail('bad_work', `${where}.workTicks 與 unitsDone 不合`, where);
        }
      }
      if (a.fallback !== null) {
        if (a.kind !== 'rest' || !isRecord(a.fallback) || !sameKeys(a.fallback, ['from', 'reason'])
          || typeof a.fallback.from !== 'string' || typeof a.fallback.reason !== 'string') {
          return fail('bad_fallback', `${where} fallback 只能出現在休養活動`, where);
        }
      }
      if (a.kind === 'breakthrough') {
        if (typeof a.usePill !== 'boolean' || !(a.supporterId === null || typeof a.supporterId === 'string')) {
          return fail('bad_breakthrough', `${where} 必須有明確的 usePill 與 supporterId`, where);
        }
        if (a.usePill === true && a.paid.pills !== 1) return fail('bad_breakthrough', `${where} usePill 為 true 時 paid.pills 必須是 1`, where);
        if (a.usePill === false && a.paid.pills !== 0) return fail('bad_breakthrough', `${where} 不用丹卻扣了丹`, where);
        if (a.status === 'traveling' || a.status === 'working') openBreakthroughs += 1;
        if (a.status === 'done') {
          if (!isRecord(a.outcome)) return fail('bad_breakthrough', `${where} 完成的突破缺少 outcome`, where);
          const o = a.outcome;
          if (o.cultivationBefore !== 100) return fail('bad_breakthrough', `${where}.outcome.cultivationBefore 必須是 100`, where);
          const chance = Rules.breakthroughChance({ mind: o.mindAtStart, pill: a.usePill, supporter: a.supporterId !== null });
          if (o.chanceBp !== chance.chanceBp) return fail('bad_breakthrough', `${where}.outcome.chanceBp 與規則不符`, where);
          if (o.result !== Progression.judge(o.roll, o.chanceBp)) return fail('bad_breakthrough', `${where}.outcome.result 與抽樣不符`, where);
          const expectCult = o.result === 'success' ? 100 : Rules.breakthroughFailure(100).cultivation;
          if (o.cultivationAfter !== expectCult) return fail('bad_breakthrough', `${where} 突破後修為與規則不符`, where);
          if (o.result === 'success') successes.set(a.discipleId, (successes.get(a.discipleId) || 0) + 1);
        } else if (a.outcome !== null) return fail('bad_breakthrough', `${where} 未完成的突破不能有 outcome`, where);
        if (a.supporterId !== null) {
          const sup = disciple(w, a.supporterId);
          if (!sup || sup.joinTick > a.requestedTick) return fail('bad_breakthrough', `${where} 支援者入隊 tick 晚於請求`, where);
        }
      }
      if ((a.status === 'traveling' || a.status === 'working') && a.refunded !== false) {
        return fail('inconsistent_state', `${where} 進行中的活動不能已退款`, where);
      }
      if (a.status === 'cancelled' && a.refunded !== true) return fail('inconsistent_state', `${where} 取消必須已退款`, where);
      if (!onBoard(a.originPos) || !onBoard(a.dest)) return fail('bad_position', `${where} 起點或終點不合法`, where);
      const again = pathBetween(a.originPos, a.dest);
      if (State.canonicalize(again) !== State.canonicalize(a.path)) return fail('bad_position', `${where}.path 與起終點不符`, where);
      if (a.status === 'traveling' && !a.partnerWait) {
        if (!isNonNeg(a.pathIndex) || a.pathIndex > a.path.length) return fail('bad_position', `${where}.pathIndex 不合法`, where);
        if (!isInt(a.stepTicks) || a.stepTicks < 0 || a.stepTicks >= STEP) return fail('bad_position', `${where}.stepTicks 不合法`, where);
      }
      if (a.status === 'traveling' || a.status === 'working') {
        const progressErr = activeProgressError(w, a);
        if (progressErr) return progressErr;
      }
    }
    for (const d of w.disciples) {
      const n = successes.get(d.id) || 0;
      if (d.breakthroughs !== n) return fail('inconsistent_progression', `${d.id}.breakthroughs 必須等於成功突破次數`, 'disciples');
      if (d.breakthroughs === 1 && d.cultivation !== 100) return fail('inconsistent_progression', `${d.id} 成功提升後修為必須是 100`, 'disciples');
      if (d.activityId !== null) {
        const a = w.activities.find((x) => x.id === d.activityId);
        if (!a || a.discipleId !== d.id || (a.status !== 'traveling' && a.status !== 'working')) {
          return fail('inconsistent_state', `${d.id}.activityId 沒有對應的進行中活動`, 'disciples');
        }
      }
    }
    if (openBreakthroughs > 1) return fail('inconsistent_state', '同時最多一個進行中的突破', 'activities');
    if (!Array.isArray(w.reservations) || !Array.isArray(w.seatWaits) || !Array.isArray(w.pendingEvents)) {
      return fail('bad_type', 'reservations、seatWaits、pendingEvents 必須是陣列');
    }
    if (w.pendingEvents.length !== 0) return fail('not_supported', '待選事件屬 RT-02；RT 世界不能出現 awaitingChoice', 'pendingEvents');
    const storyErr = validateStory(w.story);
    if (storyErr) return storyErr;
    for (const e of w.eventLog) {
      if (!isRecord(e) || !isNonNeg(e.seq) || !isNonNeg(e.tick) || e.tick > w.clock.tick) {
        return fail('bad_event', '事件 tick 不能晚於已提交時鐘', 'eventLog');
      }
      if (e.type === 'ending' || e.type === 'evt-beast-crisis' || (typeof e.type === 'string' && e.type.indexOf('evt-ending') === 0)) {
        return fail('bad_event', 'RT 世界沒有危機或結局事件', 'eventLog');
      }
      if (has(e, 'slotIndex') || e.phase === 'awaitingChoice') return fail('mixed_mode', 'RT 事件不能含 slot 欄位', 'eventLog');
    }
    for (let i = 0; i < w.eventLog.length; i += 1) {
      if (w.eventLog[i].seq !== i + 1) return fail('inconsistent_log', 'eventLog.seq 必須連續', 'eventLog');
      if (i > 0 && w.eventLog[i].tick < w.eventLog[i - 1].tick) return fail('bad_event', '事件 tick 必須單調', 'eventLog');
    }
    for (let i = 0; i < w.commandLog.length; i += 1) {
      const c = w.commandLog[i];
      const where = `commandLog[${i}]`;
      if (!isRecord(c) || c.seq !== i + 1) return fail('inconsistent_log', `${where}.seq 不連續`, where);
      if (c.revisionAfter !== c.revisionBefore + 1 || c.revisionBefore !== c.tick + i) {
        return fail('inconsistent_log', `${where} 的 revision 與 tick 不合`, where);
      }
      if (c.origin !== 'manual' || !isRecord(c.payload)) return fail('bad_value', `${where} 必須保存完整 payload`, where);
      if (c.payloadHash !== State.sha256Hex(State.canonicalize({ type: c.type, payload: c.payload }))) {
        return fail('inconsistent_log', `${where}.payloadHash 與 payload 不符`, where);
      }
    }
    const pol = validatePolicy(w.policy, 'policy');
    if (pol) return pol;
    if (!Array.isArray(w.goals) || !isNonNeg(w.goalsRevision)) return fail('bad_goal', 'goals 不合法', 'goals');
    const goalIds = new Set();
    for (let i = 0; i < w.goals.length; i += 1) {
      const gErr = validateGoal(w.goals[i], `goals[${i}]`);
      if (gErr) return gErr;
      if (goalIds.has(w.goals[i].id)) return fail('bad_goal', '目標 id 重複', 'goals');
      goalIds.add(w.goals[i].id);
    }
    const opt = State.validateCharacterOptions(w.characterOptions);
    if (!opt.ok) return opt;
    const hero = w.disciples.find((d) => d.role === 'protagonist');
    const base = Rules.CHARACTER_OPTION_LIMITS.templates[opt.value.templateId];
    const expectedAttr = {
      rootBone: base.rootBone + opt.value.allocation.rootBone,
      comprehension: base.comprehension + opt.value.allocation.comprehension,
      craft: base.craft + opt.value.allocation.craft,
    };
    if (!hero || hero.templateId !== opt.value.templateId) {
      return fail('inconsistent_roster', '主角 templateId 與 characterOptions 不一致', 'disciples');
    }
    for (const a of ['rootBone', 'comprehension', 'craft']) {
      if (hero.attributes[a] !== expectedAttr[a]) {
        return fail('inconsistent_roster', `主角 ${a} 與 characterOptions 推導值不一致`, 'disciples');
      }
    }
    for (const rsv of w.reservations) {
      if (!isRecord(rsv) || !actIds.has(rsv.activityId)) return fail('bad_value', '預約指向不存在的活動', 'reservations');
      const a = w.activities.find((x) => x.id === rsv.activityId);
      if (a.status !== 'traveling' && a.status !== 'working') return fail('inconsistent_state', '已結束的活動仍占預約', 'reservations');
    }
    const reservedActs = new Set(w.reservations.map((r) => r.activityId));
    for (const a of activeActivities(w)) {
      if (!reservedActs.has(a.id) && a.kind !== 'support') {
        if (a.seatKey !== null || paidPositive(a.paid) || a.kind === 'breakthrough') {
          return fail('inconsistent_state', `${a.id} 進行中卻沒有預約`, 'reservations');
        }
      }
      if (a.seatKey !== null) {
        const rsv = w.reservations.find((r) => r.activityId === a.id);
        if (!rsv || !isRecord(rsv.seats) || rsv.seats[a.seatKey] !== 1) {
          return fail('inconsistent_state', `${a.id} 的工作位與預約不一致`, 'reservations');
        }
      }
    }
    return { ok: true };
  }

  function validateAttributes(d, where) {
    const names = ['rootBone', 'comprehension', 'craft'];
    if (!isRecord(d.attributes) || !sameKeys(d.attributes, names)) {
      return fail('bad_value', `${where}.attributes 必須恰好含根骨、悟性、技藝`, where);
    }
    const lim = Rules.CHARACTER_OPTION_LIMITS;
    for (const a of names) {
      if (!isInt(d.attributes[a]) || d.attributes[a] < lim.attributeMin || d.attributes[a] > lim.attributeMax) {
        return fail('bad_value', `${where}.attributes.${a} 必須是 ${lim.attributeMin}..${lim.attributeMax} 的整數`, where);
      }
    }
    if (d.role === 'master') {
      for (const a of names) {
        if (d.attributes[a] !== Rules.MASTER_ATTRIBUTES[a]) {
          return fail('inconsistent_roster', `${where} 師父的 ${a} 必須是規則表的 ${Rules.MASTER_ATTRIBUTES[a]}`, where);
        }
      }
    }
    return null;
  }

  function activeProgressError(world, act) {
    const tick = world.clock.tick;
    if (!isNonNeg(act.departTick) || act.departTick > tick) {
      return fail('inconsistent_state', `${act.id} 的出發 tick 與時鐘不合`, act.id);
    }
    const elapsed = tick - act.departTick;
    const span = act.path.length * STEP;
    if (act.status === 'traveling' && !act.partnerWait) {
      if (span === 0 || elapsed < 1 || elapsed >= span
        || act.pathIndex !== Math.floor(elapsed / STEP) || act.stepTicks !== elapsed % STEP
        || act.arriveTick !== null || act.startTick !== null) {
        return fail('inconsistent_state', `${act.id} 的趕路進度與出發 tick、路線長度不合`, act.id);
      }
    } else if (act.pathIndex !== act.path.length || act.stepTicks !== 0 || act.arriveTick !== act.departTick + span) {
      return fail('inconsistent_state', `${act.id} 的到達進度與路線、出發 tick 不合`, act.id);
    } else if (act.partnerWait && elapsed < span) {
      return fail('inconsistent_state', `${act.id} 尚未走完卻在等同伴`, act.id);
    } else if (act.status === 'working') {
      if (!isNonNeg(act.startTick) || act.startTick < act.arriveTick || act.startTick > tick || act.workTicks !== tick - act.startTick) {
        return fail('inconsistent_state', `${act.id} 的工時與開工 tick 不合`, act.id);
      }
    }
    const d = disciple(world, act.discipleId);
    if (d && d.activityId === act.id) {
      let expected = act.dest;
      if (act.pathIndex === 0) expected = act.originPos;
      else if (act.pathIndex < act.path.length) expected = act.path[act.pathIndex - 1];
      if (!samePos(d.pos, expected)) {
        return fail('inconsistent_state', `${d.id} 的位置與 ${act.id} 的路線進度不一致`, d.id);
      }
    }
    return null;
  }

  function paidPositive(paid) {
    return PAID_KEYS.some((k) => paid[k] > 0);
  }

  function validateStory(story) {
    if (!isRecord(story)) return fail('bad_type', 'story 必須是物件', 'story');
    if (!Array.isArray(story.rescues)) return fail('bad_type', 'story.rescues 必須是陣列', 'story.rescues');
    if (!Array.isArray(story.triggeredEventIds)) return fail('bad_type', 'story.triggeredEventIds 必須是陣列', 'story.triggeredEventIds');
    for (const id of story.triggeredEventIds) {
      if (typeof id !== 'string' || id.length === 0) {
        return fail('bad_value', 'story.triggeredEventIds 必須是非空字串', 'story.triggeredEventIds');
      }
    }
    if (!isRecord(story.invitations)) return fail('bad_type', 'story.invitations 必須是物件', 'story.invitations');
    if (!isRecord(story.breakthroughAsks)) return fail('bad_type', 'story.breakthroughAsks 必須是物件', 'story.breakthroughAsks');
    if (Object.keys(story.breakthroughAsks).length !== 0) {
      return fail('not_supported', '突破詢問資料屬 RT-02', 'story.breakthroughAsks');
    }
    if (story.organisationStatus !== 'dojo') return fail('inconsistent_state', 'RT 世界沒有結局', 'story.organisationStatus');
    const seenRescue = new Set();
    for (const rescue of story.rescues) {
      if (!isRecord(rescue) || typeof rescue.id !== 'string' || rescue.id.length === 0 || rescue.rewardClaimed !== true || seenRescue.has(rescue.id)) {
        return fail('inconsistent_state', '援村紀錄不合法', 'story.rescues');
      }
      seenRescue.add(rescue.id);
    }
    return null;
  }

  function orderStructureError(world, kind, target, units, where) {
    if (!isRecord(target) || !targetShape(kind, target)) {
      return fail('bad_value', `${where} 的 target 形狀與種類不符`, where);
    }
    if (kind === 'build' && !has(Rules.FACILITIES, target.facilityType)) {
      return fail('bad_value', `${where} 的設施不存在`, where);
    }
    if (kind === 'brew' && !has(Rules.RECIPES, target.recipeId)) {
      return fail('bad_value', `${where} 的配方不存在`, where);
    }
    const fixed = fixedUnits(kind, target);
    if (fixed !== null && units !== fixed) {
      return fail('bad_value', `${where} 的單位數與固定工量不符`, where);
    }
    if ((kind === 'gather-material' || kind === 'gather-herb' || kind === 'build') && !tileById(world, target.tileId)) {
      return fail('bad_value', `${where} 指向未知地塊 ${target.tileId}`, where);
    }
    return null;
  }

  function validateManualOrder(world, d, where) {
    const m = d.manualOrder;
    if (m === null) return null;
    if (!isRecord(m)) return fail('bad_value', `${where}.manualOrder 不合法`, where);
    const base = ['seq', 'commandId', 'status', 'kind', 'target', 'units', 'requestedTick', 'activityId'];
    const keys = m.kind === 'breakthrough' ? base.concat(['usePill', 'supporterId']) : base;
    if (!sameKeys(m, keys)) return fail('bad_value', `${where}.manualOrder 欄位與種類不符`, where);
    if (m.status !== 'pending' && m.status !== 'active') return fail('bad_value', `${where}.manualOrder.status 不合法`, where);
    if (!ORDER_KINDS.includes(m.kind)) return fail('bad_value', `${where}.manualOrder.kind 不合法`, where);
    if (!isInt(m.units) || m.units < 1) return fail('bad_value', `${where}.manualOrder.units 必須是正整數`, where);
    if (typeof m.commandId !== 'string' || m.commandId.length === 0) return fail('bad_value', `${where}.manualOrder.commandId 不合法`, where);
    if (!isNonNeg(m.requestedTick) || m.requestedTick > world.clock.tick) {
      return fail('bad_value', `${where}.manualOrder.requestedTick 不合法`, where);
    }
    if (!(m.activityId === null || typeof m.activityId === 'string')) {
      return fail('bad_value', `${where}.manualOrder.activityId 不合法`, where);
    }
    const shape = orderStructureError(world, m.kind, m.target, m.units, `${where}.manualOrder`);
    if (shape) return shape;
    if (m.kind === 'breakthrough') {
      if (typeof m.usePill !== 'boolean' || !(m.supporterId === null || typeof m.supporterId === 'string')) {
        return fail('bad_breakthrough', `${where}.manualOrder 的用丹與支援者必須是明確值`, where);
      }
      if (m.supporterId !== null) {
        if (m.supporterId === d.id) return fail('bad_value', `${where}.manualOrder 不能支援自己`, where);
        if (!disciple(world, m.supporterId)) return fail('bad_value', `${where}.manualOrder 的支援者不存在`, where);
      }
    }
    if (d.role !== 'protagonist') return fail('bad_value', '手動指令只屬於主角', where);
    if (m.activityId !== null && m.activityId !== d.activityId && m.status === 'active') {
      return fail('inconsistent_state', `${where}.manualOrder 與活動不一致`, where);
    }
    return null;
  }

  function hashWorld(world) {
    return State.hashWorld(world);
  }
  function serializeState(world) {
    const v = validateWorld(world);
    if (!v.ok) throw new TypeError(`serializeState 拒絕不合法的世界狀態：${v.code}：${v.reason}`);
    return State.canonicalize(world);
  }
  function parseState(text) {
    if (typeof text !== 'string') return fail('invalid_json', 'parseState 需要字串');
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

  function isSlotIdentity(world) {
    return isRecord(world) && (world.scenarioId === 'slice-14' || (world.schemaVersion === 4 && world.ruleVersion === 3));
  }

  function fixedUnits(kind, target) {
    if (kind === 'build') return Rules.FACILITIES[target.facilityType].durationSlots;
    if (kind === 'brew') return Rules.RECIPES[target.recipeId].durationSlots;
    if (kind === 'aid' || kind === 'breakthrough') return 1;
    return null;
  }

  function normalizeOrder(payload) {
    if (!isRecord(payload)) return { error: reject('bad_payload', 'orderActivity 的 payload 必須是物件') };
    const kind = payload.kind;
    if (!ORDER_KINDS.includes(kind)) return { error: reject('bad_payload', `不能下令的種類：${String(kind)}`) };
    if (typeof payload.discipleId !== 'string') return { error: reject('bad_payload', 'orderActivity 需要 discipleId') };
    if (!isRecord(payload.target)) return { error: reject('bad_payload', 'orderActivity 需要 target 物件') };
    const units = payload.units === undefined ? 1 : payload.units;
    if (!isInt(units) || units < 1) return { error: reject('bad_payload', 'units 必須是正整數') };
    if (!targetShape(kind, payload.target)) return { error: reject('bad_payload', `${kind} 的 target 形狀不對`) };
    if (kind === 'build' && !has(Rules.FACILITIES, payload.target.facilityType)) {
      return { error: reject('bad_payload', '未知設施') };
    }
    if (kind === 'brew' && !has(Rules.RECIPES, payload.target.recipeId)) {
      return { error: reject('bad_payload', '未知配方') };
    }
    const fixed = fixedUnits(kind, payload.target);
    if (fixed !== null && units !== fixed) return { error: reject('bad_payload', `${kind} 的單位數固定為 ${fixed}`) };
    const out = { discipleId: payload.discipleId, kind, target: clone(payload.target), units };
    const pillKeys = ['usePill', 'supporterId'].filter((k) => has(payload, k));
    if (kind === 'breakthrough') {
      if (!has(payload, 'usePill') || !has(payload, 'supporterId')) {
        return { error: reject('bad_payload', '突破必須明確給出 usePill 與 supporterId，缺欄不是 false 或 null') };
      }
      if (typeof payload.usePill !== 'boolean') return { error: reject('bad_payload', 'usePill 必須是布林') };
      if (!(payload.supporterId === null || typeof payload.supporterId === 'string')) {
        return { error: reject('bad_payload', 'supporterId 必須是角色 id 或 null') };
      }
      out.usePill = payload.usePill;
      out.supporterId = payload.supporterId;
    } else if (pillKeys.length > 0) {
      return { error: reject('bad_payload', '只有突破可以帶 usePill 或 supporterId') };
    }
    const extra = Object.keys(payload).filter((k) => !['discipleId', 'kind', 'target', 'units', 'usePill', 'supporterId'].includes(k));
    if (extra.length > 0) return { error: reject('bad_payload', `orderActivity 含未知欄位 ${extra.join(',')}`) };
    return { value: out };
  }

  function targetShape(kind, target) {
    if (kind === 'gather-material' || kind === 'gather-herb') return sameKeys(target, ['tileId']) && typeof target.tileId === 'string';
    if (kind === 'build') return sameKeys(target, ['facilityType', 'tileId']) && typeof target.facilityType === 'string' && typeof target.tileId === 'string';
    if (kind === 'brew') return sameKeys(target, ['recipeId']) && typeof target.recipeId === 'string';
    if (kind === 'aid') return sameKeys(target, ['optionId']) && (target.optionId === 'free' || target.optionId === 'supplied');
    return sameKeys(target, []);
  }

  function dispatch(world, command) {
    if (isSlotIdentity(world)) return reject('wrong_mode', 'slot 世界必須使用 Commands.dispatch；advanceTicks 的指令入口不處理它');
    const wv = validateWorld(world);
    if (!wv.ok) return reject('invalid_world', `世界不合法：${wv.code}：${wv.reason}`);
    if (!isRecord(command) || typeof command.id !== 'string' || command.id.length === 0 || !isNonNeg(command.expectedRevision)
      || typeof command.type !== 'string' || !isRecord(command.payload)) {
      return reject('bad_command', '命令需要 id、expectedRevision、type、payload');
    }
    let normalized = command.payload;
    let normalizeError = null;
    if (command.type === 'orderActivity') {
      const n = normalizeOrder(command.payload);
      if (n.error) normalizeError = n.error;
      else normalized = n.value;
    }
    const hash = normalizeError ? null : State.sha256Hex(State.canonicalize({ type: command.type, payload: normalized }));
    const prior = world.commandLog.find((c) => c.id === command.id);
    if (prior) {
      if (normalizeError || prior.type !== command.type || prior.payloadHash !== hash) {
        return reject('command_id_conflict', `命令 id ${command.id} 已用於不同內容`);
      }
      return {
        ok: true, duplicate: true, state: clone(world),
        events: prior.eventSeqs.map((q) => clone(world.eventLog[q - 1])),
      };
    }
    if (normalizeError) return normalizeError;
    if (command.expectedRevision < world.revision) {
      return reject('stale_revision', `expectedRevision ${command.expectedRevision} 已過期（目前 ${world.revision}）`);
    }
    if (command.expectedRevision > world.revision) {
      return reject('revision_ahead', `expectedRevision ${command.expectedRevision} 超前目前的 revision ${world.revision}`);
    }
    const next = clone(world);
    const applied = applyCommand(next, command, normalized, hash);
    if (applied.error) return applied.error;
    const check = validateWorld(next);
    if (!check.ok) return reject('inconsistent_result', `命令會使世界不一致，已拒絕：${check.code}：${check.reason}`);
    return { ok: true, duplicate: false, state: next, events: applied.events };
  }

  function applyCommand(world, command, payload, hash) {
    const before = world.revision;
    let drafts;
    if (command.type === 'orderActivity') drafts = doOrder(world, payload, command.id);
    else if (command.type === 'cancelManualOrder') drafts = doCancel(world, payload);
    else if (command.type === 'setGoals') drafts = doGoals(world, payload);
    else if (command.type === 'setPolicy') drafts = doPolicy(world, payload);
    else return { error: reject('unknown_command', `未知命令：${command.type}`) };
    if (drafts.error) return drafts;
    const events = drafts.events.map((d) => pushEvent(world, d));
    world.commandLog.push({
      seq: world.commandLog.length + 1,
      id: command.id,
      type: command.type,
      origin: 'manual',
      tick: world.clock.tick,
      payload: clone(payload),
      payloadHash: hash,
      revisionBefore: before,
      revisionAfter: before + 1,
      eventSeqs: events.map((e) => e.seq),
    });
    world.revision = before + 1;
    return { events };
  }

  function doOrder(world, payload, commandId) {
    if (!targetShape(payload.kind, payload.target)) return { error: reject('bad_payload', `${payload.kind} 的 target 形狀不對`) };
    const d = disciple(world, payload.discipleId);
    if (!d) return { error: reject('unknown_disciple', `沒有角色 ${payload.discipleId}`) };
    if (d.id !== world.protagonistId) return { error: reject('not_protagonist', '手動指令只下給主角') };
    if (d.joinTick > world.clock.tick) return { error: reject('not_joined', '角色尚未入隊') };
    const pre = acceptTimeProblem(world, d, payload);
    if (pre) return { error: pre };
    const order = {
      seq: world.commandLog.length + 1,
      commandId,
      status: 'pending',
      kind: payload.kind,
      target: clone(payload.target),
      units: payload.units,
      requestedTick: world.clock.tick,
      activityId: null,
    };
    if (payload.kind === 'breakthrough') {
      order.usePill = payload.usePill;
      order.supporterId = payload.supporterId;
    }
    d.manualOrder = order;
    return { events: [{ type: 'commandAccepted', commandId, commandType: 'orderActivity', discipleId: d.id, kind: payload.kind }] };
  }

  function acceptTimeProblem(world, d, payload) {
    const kind = payload.kind;
    if (kind === 'gather-material' || kind === 'gather-herb') {
      const tile = tileById(world, payload.target.tileId);
      if (!tile) return reject('bad_payload', `未知地塊 ${payload.target.tileId}`);
      const terrain = tile.terrain;
      if (kind === 'gather-material' && terrain !== 'material') return reject('bad_payload', '這裡不是靈材點');
      if (kind === 'gather-herb' && terrain !== 'herb') return reject('bad_payload', '這裡不是靈草點');
      if (kind === 'gather-herb' && Rules.phaseAtEq(slotEqOf(world.clock.tick)).herbYield === 0) {
        return reject('blocked', '靈草尚未解鎖');
      }
    }
    if (kind === 'build') {
      if (!has(Rules.FACILITIES, payload.target.facilityType)) return reject('bad_payload', '未知設施');
      const place = Rules.evaluateFacilityPlacement(world.tiles, payload.target.tileId, payload.target.facilityType);
      if (!place.ok) return reject(place.code, place.reason);
      if (openBuildCount(world, payload.target.facilityType) >= Rules.FACILITIES[payload.target.facilityType].maxCount) {
        return reject('facility_exists', '這種設施已有一座或正在建造');
      }
    }
    if (kind === 'brew') {
      if (!has(Rules.RECIPES, payload.target.recipeId)) return reject('bad_payload', '未知配方');
      if (!doneBuild(world, 'alchemyRoom')) return reject('facility_not_ready', '丹房尚未完工');
    }
    if (kind === 'aid') {
      if (!Rules.aidAvailableEq(slotEqOf(world.clock.tick))) return reject('blocked', '援村尚未開放');
      if (world.story.rescues.some((r) => r.id === Rules.AID_ID)) return reject('already_done', '援村已經完成');
    }
    if (kind === 'breakthrough') {
      const e = Progression.eligibility(d);
      if (!e.ok) return reject(e.code, e.reason);
      if (payload.supporterId !== null) {
        if (payload.supporterId === d.id) return reject('self_support', '不能支援自己的突破');
        const sup = disciple(world, payload.supporterId);
        if (!sup) return reject('unknown_disciple', `沒有支援者 ${payload.supporterId}`);
        if (sup.joinTick > world.clock.tick) return reject('supporter_not_joined', '支援者在請求時尚未入隊');
      }
      const open = world.activities.some((a) => a.kind === 'breakthrough' && (a.status === 'traveling' || a.status === 'working') && a.discipleId === d.id);
      if (open) return reject('breakthrough_pending', '已有進行中的突破');
    }
    return null;
  }

  function doCancel(world, payload) {
    if (!isRecord(payload) || !sameKeys(payload, ['discipleId']) || typeof payload.discipleId !== 'string') {
      return { error: reject('bad_payload', 'cancelManualOrder 需要恰好 discipleId') };
    }
    const d = disciple(world, payload.discipleId);
    if (!d) return { error: reject('unknown_disciple', `沒有角色 ${payload.discipleId}`) };
    if (d.id !== world.protagonistId) return { error: reject('not_protagonist', '只能取消主角的手動指令') };
    if (d.manualOrder === null) return { error: reject('no_manual_order', '沒有手動指令可取消') };
    const act = d.activityId ? world.activities.find((a) => a.id === d.activityId) : null;
    if (act && PROMISE.has(act.kind) && act.status === 'working') {
      d.manualOrder = null;
      return { events: [{ type: 'manualLockReleased', discipleId: d.id, reason: 'promise-continues' }] };
    }
    if (act && (act.status === 'traveling' || INTERRUPTIBLE.has(act.kind))) {
      const replacement = d.manualOrder.status === 'pending' && d.manualOrder.activityId === null && d.manualOrder.seq !== act.manualSeq;
      if (replacement) {
        d.manualOrder = null;
        d.autonomy.resumeReason = 'manual-cancelled';
      }
      act.halt = act.status === 'traveling' ? 'step' : 'drop';
      return { events: [{ type: 'cancelArmed', discipleId: d.id, activityId: act.id, halt: act.halt }] };
    }
    d.manualOrder = null;
    return { events: [{ type: 'manualCancelled', discipleId: d.id, reason: 'pending' }] };
  }

  function doGoals(world, payload) {
    if (!isRecord(payload) || !sameKeys(payload, ['goals']) || !Array.isArray(payload.goals)) {
      return { error: reject('bad_payload', 'setGoals 需要恰好 goals 陣列') };
    }
    for (let i = 0; i < payload.goals.length; i += 1) {
      const err = validateGoal(payload.goals[i], `goals[${i}]`);
      if (err) return { error: err };
    }
    world.goals = clone(payload.goals);
    world.goalsRevision += 1;
    return { events: [{ type: 'goalsSet', goalsRevision: world.goalsRevision }] };
  }

  function doPolicy(world, payload) {
    if (!isRecord(payload) || !sameKeys(payload, ['policy'])) return { error: reject('bad_payload', 'setPolicy 需要恰好 policy') };
    const err = validatePolicy(payload.policy, 'policy');
    if (err) return { error: err };
    world.policy = clone(payload.policy);
    return { events: [{ type: 'policySet' }] };
  }

  function advanceTicks(world, n) {
    if (isSlotIdentity(world)) return reject('wrong_mode', 'slot 世界必須使用 Engine.advance；本呼叫不推進、不改輸入');
    if (!isInt(n) || n < 1) return reject('bad_ticks', 'n 必須是正整數');
    const wv = validateWorld(world);
    if (!wv.ok) return reject('invalid_world', `世界不合法：${wv.code}：${wv.reason}`);
    const state = clone(world);
    const events = [];
    let advancedTicks = 0;
    let stopReason = 'completed';
    let error = null;
    for (let i = 0; i < n; i += 1) {
      const step = runTick(state);
      if (step.error) {
        stopReason = 'error';
        error = step.error;
        break;
      }
      events.push(...step.events);
      advancedTicks += 1;
      if (step.stopReason === 'breakthroughResolved') {
        stopReason = 'breakthroughResolved';
        break;
      }
    }
    const out = { ok: true, state, events, advancedTicks, stopReason };
    if (error) out.error = error;
    return out;
  }

  function runTick(world) {
    const t = world.clock.tick;
    const events = [];
    const phase = Rules.phaseAtEq(slotEqOf(t));
    const prev = t === 0 ? null : Rules.phaseAtEq(slotEqOf(t - 1)).id;
    if (prev !== phase.id && (t === 540 || t === 1080 || t === 1800)) {
      events.push(pushEvent(world, { type: 'phaseNotice', phaseId: phase.id }));
    }
    for (const d of world.disciples) {
      if (d.autonomy.resumeReason && d.manualOrder === null) {
        events.push(pushEvent(world, { type: 'autonomyResumed', discipleId: d.id, reason: d.autonomy.resumeReason }));
        d.autonomy.decisionSeq += 1;
      }
      d.autonomy.resumeReason = null;
    }
    dropArmed(world, events);
    const plan = collectRequests(world);
    events.push(...plan.events);
    const batch = plan.requests;
    if (batch.length > 0) {
      const pool = resourcePool(world);
      const ignore = new Set(batch.map((r) => r.previousActivityId).filter(Boolean));
      const seats = seatPool(world, ignore);
      const requests = batch.map((r) => ({
        id: r.id, discipleId: r.discipleId, waited: r.waited, cost: r.cost, seats: r.seats, participants: r.participants,
      }));
      // 仲裁看不到「已在做別的活動」的人。先用更高等待的空請求占住他們，支援者忙碌才會變成 participant_busy，而不是雙重開工。
      for (const d of world.disciples) {
        if (!d.activityId || ignore.has(d.activityId)) continue;
        const busy = world.activities.find((a) => a.id === d.activityId);
        if (!busy || (busy.status !== 'traveling' && busy.status !== 'working')) continue;
        requests.push({
          id: `busy-${d.id}`, discipleId: d.id, waited: Number.MAX_SAFE_INTEGER, cost: {}, seats: {}, participants: [d.id],
        });
      }
      const arb = Engine.arbitrate({ requests, resources: pool, seats });
      const denied = new Map(arb.denied.map((d) => [d.id, d]));
      for (const req of batch) {
        if (denied.has(req.id)) {
          const why = denied.get(req.id);
          if (req.switching) {
            req.orderOwner.manualOrder = null;
            events.push(pushEvent(world, { type: 'manualInvalid', discipleId: req.discipleId, reason: why.code }));
          } else {
            events.push(...startRestFallback(world, req, why.code));
          }
        } else {
          if (req.previousActivityId) {
            const old = world.activities.find((a) => a.id === req.previousActivityId);
            if (old && (old.status === 'traveling' || old.status === 'working')) abandonPartial(world, old, 'overwrite');
            if (req.orderOwner.manualOrder === null) req.orderOwner.manualOrder = req.order;
            req.orderOwner.autonomy.resumeReason = null;
          }
          events.push(...startGranted(world, req));
        }
      }
    }
    let stop = null;
    const movers = activeActivities(world)
      .filter((a) => a.kind !== 'support' || a.status === 'traveling')
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    for (const act of movers) {
      const ev = progressActivity(world, act, t);
      events.push(...ev.events);
      if (ev.stopReason) stop = ev.stopReason;
    }
    if (t % Rules.TICKS_PER_DAY === Rules.TICKS_PER_DAY - 1) {
      events.push(pushEvent(world, {
        type: 'dayReport', day: Math.floor(t / Rules.TICKS_PER_DAY) + 1,
        resources: clone(world.resources), inventory: clone(world.inventory),
      }));
    }
    world.clock.tick = t + 1;
    world.revision += 1;
    const check = validateWorld(world);
    if (!check.ok) return { error: { code: check.code, reason: check.reason }, events };
    return { events, stopReason: stop };
  }

  function dropArmed(world, events) {
    for (const act of activeActivities(world)) {
      if (act.halt !== 'drop') continue;
      events.push(...abandonPartial(world, act, 'cancel'));
    }
  }

  function abandonPartial(world, act, why) {
    const events = [];
    const d = disciple(world, act.discipleId);
    if (act.unitsDone > 0) {
      act.units = act.unitsDone;
      act.workTicks = act.unitsDone * TICK;
      act.status = 'done';
      act.completedTick = world.clock.tick + 1;
      act.halt = null;
    } else {
      act.status = 'cancelled';
      act.refunded = true;
      act.halt = null;
      act.workTicks = 0;
      act.completedTick = world.clock.tick + 1;
    }
    releaseReservation(world, act);
    if (d && d.activityId === act.id) d.activityId = null;
    if (d && d.manualOrder && d.manualOrder.activityId === act.id) {
      d.manualOrder = null;
      d.autonomy.resumeReason = why === 'cancel' ? 'manual-cancelled' : 'manual-invalid';
    }
    events.push(pushEvent(world, { type: 'activityStopped', activityId: act.id, status: act.status, reason: why }));
    return events;
  }

  function collectRequests(world) {
    const requests = [];
    const events = [];
    for (const d of world.disciples) {
      const order = d.manualOrder;
      if (!order || order.status !== 'pending') continue;
      const act = activeOf(world, d.id);
      // 承諾只在已經開工後鎖住；趕路（含承諾趕路）可在走完一步的邊界被新指令取消。
      if (act && PROMISE.has(act.kind) && act.status !== 'traveling') continue;
      if (act && act.status === 'traveling') {
        act.halt = 'step';
        continue;
      }
      const built = buildDeparture(world, d, order, act);
      if (built.invalid) {
        if (!act) {
          d.manualOrder = null;
          d.autonomy.resumeReason = 'manual-invalid';
          events.push(pushEvent(world, { type: 'manualInvalid', discipleId: d.id, reason: built.invalid.code }));
        } else {
          d.manualOrder = null;
          events.push(pushEvent(world, { type: 'manualInvalid', discipleId: d.id, reason: built.invalid.code }));
        }
        continue;
      }
      built.request.switching = !!act;
      built.request.orderOwner = d;
      if (act) built.request.previousActivityId = act.id;
      requests.push(built.request);
    }
    return { requests, events };
  }

  function buildDeparture(world, d, order, switchingFrom) {
    let kind = order.kind;
    let fallback = null;
    if (kind === 'cultivate') {
      const block = Progression.cultivationBlock(d);
      if (block) {
        kind = 'rest';
        fallback = { from: 'cultivate', reason: block };
      }
    }
    const problem = departProblem(world, d, order, kind);
    if (problem) return { invalid: problem };
    const seat = chooseSeat(world, d, kind, order, fallback);
    const cost = departureCost(order, kind);
    if (kind === 'breakthrough' && order.usePill === false) cost.pills = 0;
    const participants = [d.id];
    if (kind === 'breakthrough' && order.supporterId) participants.push(order.supporterId);
    const dest = destinationFor(world, kind, order.target, seat.seatKey);
    return {
      request: {
        id: `req-${d.id}`,
        discipleId: d.id,
        waited: seatWaited(world, d.id, seat.seatKey),
        cost,
        seats: seat.seats,
        participants,
        kind,
        order,
        fallback,
        seatKey: seat.seatKey,
        dest,
      },
    };
  }

  function departProblem(world, d, order, kind) {
    if (kind === 'gather-herb' && Rules.phaseAtEq(slotEqOf(world.clock.tick)).herbYield === 0) {
      return reject('blocked', '靈草尚未解鎖');
    }
    if (kind === 'brew' && !doneBuild(world, 'alchemyRoom')) return reject('facility_not_ready', '丹房尚未完工');
    if (kind === 'aid' && !Rules.aidAvailableEq(slotEqOf(world.clock.tick))) return reject('blocked', '援村尚未開放');
    if (kind === 'breakthrough') {
      const e = Progression.eligibility(d);
      if (!e.ok) return e;
      if (order.supporterId) {
        const sup = disciple(world, order.supporterId);
        if (!sup || sup.joinTick > order.requestedTick) return reject('supporter_not_joined', '支援者在請求 tick 前尚未入隊');
      }
    }
    return null;
  }

  function departureCost(order, kind) {
    const cost = zeroPaid();
    if (kind === 'build') Object.assign(cost, Rules.FACILITIES[order.target.facilityType].cost);
    if (kind === 'brew') Object.assign(cost, Rules.RECIPES[order.target.recipeId].cost);
    if (kind === 'aid' && order.target.optionId === 'supplied') Object.assign(cost, Rules.AID_OPTIONS.supplied.cost);
    if (kind === 'breakthrough' && order.usePill === true) cost.pills = 1;
    return cost;
  }

  function chooseSeat(world, d, kind, order, fallback) {
    if (kind === 'gather-material' || kind === 'gather-herb') {
      const key = `gather:${order.target.tileId}`;
      return { seatKey: key, seats: { [key]: 1 } };
    }
    if (kind === 'build') {
      const key = `build:${order.target.tileId}`;
      return { seatKey: key, seats: { [key]: 1 } };
    }
    if (kind === 'brew') return { seatKey: 'work:alchemyRoom', seats: { 'work:alchemyRoom': 1 } };
    if (kind === 'aid') return { seatKey: 'aid:village', seats: { 'aid:village': 1 } };
    if (kind === 'cultivate' && !fallback && doneBuild(world, 'spiritTerrace')) {
      return { seatKey: 'work:spiritTerrace', seats: { 'work:spiritTerrace': 1 } };
    }
    if (kind === 'rest' && doneBuild(world, 'residence')) {
      return { seatKey: 'rest:residence', seats: { 'rest:residence': 1 } };
    }
    return { seatKey: null, seats: {} };
  }

  function destinationFor(world, kind, target, seatKey) {
    if (kind === 'gather-material' || kind === 'gather-herb' || kind === 'build') return tilePos(tileById(world, target.tileId));
    if (kind === 'brew') return tilePos(tileById(world, doneBuild(world, 'alchemyRoom').target.tileId));
    if (kind === 'aid') return gate();
    if (seatKey === 'work:spiritTerrace') return tilePos(tileById(world, doneBuild(world, 'spiritTerrace').target.tileId));
    if (seatKey === 'rest:residence') return tilePos(tileById(world, doneBuild(world, 'residence').target.tileId));
    return dojo();
  }

  function seatWaited(world, id, seatKey) {
    if (!seatKey) return 0;
    const row = world.seatWaits.find((s) => s.discipleId === id && s.seatKey === seatKey);
    return row ? row.waited : 0;
  }

  function resourcePool(world) {
    return {
      spiritMaterial: world.resources.spiritMaterial,
      spiritHerb: world.resources.spiritHerb,
      spiritStone: world.resources.spiritStone,
      reputation: world.resources.reputation,
      pills: world.inventory[PILL_ID],
    };
  }

  function seatPool(world, ignore) {
    const cap = { 'aid:village': Rules.AID_WORKERS };
    for (const tile of world.tiles) {
      const terrain = Rules.TERRAIN[tile.terrain];
      if (terrain.workSlots) cap[`gather:${tile.id}`] = terrain.workSlots;
      if (terrain.buildable) cap[`build:${tile.id}`] = 1;
    }
    if (doneBuild(world, 'spiritTerrace')) cap['work:spiritTerrace'] = Rules.FACILITIES.spiritTerrace.workSlots;
    if (doneBuild(world, 'alchemyRoom')) cap['work:alchemyRoom'] = Rules.FACILITIES.alchemyRoom.workSlots;
    if (doneBuild(world, 'residence')) cap['rest:residence'] = Rules.FACILITIES.residence.restSlots;
    for (const rsv of world.reservations) {
      if (ignore.has(rsv.activityId)) continue;
      for (const k of Object.keys(rsv.seats)) cap[k] = (cap[k] || 0) - rsv.seats[k];
    }
    return cap;
  }

  function startRestFallback(world, req, code) {
    const d = disciple(world, req.discipleId);
    rememberWait(world, d.id, req.seatKey);
    const restOrder = {
      seq: req.order.seq,
      commandId: req.order.commandId,
      status: 'pending',
      kind: 'rest',
      target: {},
      units: 1,
      requestedTick: world.clock.tick,
      activityId: null,
    };
    const fallback = { from: req.order.kind, reason: code };
    const seat = chooseSeat(world, d, 'rest', restOrder, fallback);
    const dest = destinationFor(world, 'rest', {}, seat.seatKey);
    const synthetic = {
      id: `${req.id}:rest`,
      discipleId: d.id,
      waited: 0,
      cost: zeroPaid(),
      seats: seat.seats,
      participants: [d.id],
      kind: 'rest',
      order: restOrder,
      fallback,
      seatKey: seat.seatKey,
      dest,
      forced: true,
    };
    const seats = seatPool(world, new Set());
    const arb = Engine.arbitrate({
      requests: [{ id: synthetic.id, discipleId: d.id, waited: 0, cost: synthetic.cost, seats: synthetic.seats, participants: synthetic.participants }],
      resources: resourcePool(world),
      seats,
    });
    if (arb.denied.length > 0) {
      synthetic.seatKey = null;
      synthetic.seats = {};
      synthetic.dest = dojo();
    }
    d.manualOrder = req.order;
    return startGranted(world, synthetic);
  }

  function rememberWait(world, id, seatKey) {
    if (!seatKey) return;
    const row = world.seatWaits.find((s) => s.discipleId === id && s.seatKey === seatKey);
    if (row) row.waited += 1;
    else world.seatWaits.push({ discipleId: id, seatKey, waited: 1 });
  }

  function startGranted(world, req) {
    const events = [];
    const d = disciple(world, req.discipleId);
    pay(world, req.cost);
    const origin = clone(d.pos);
    const path = pathBetween(origin, req.dest);
    const started = world.clock.tick;
    const activity = baseActivity({
      id: actId(world.activities.length + 1),
      discipleId: d.id,
      kind: req.kind,
      target: clone(req.order.target || {}),
      units: req.order.units,
      origin: 'manual',
      manualSeq: req.order.seq,
      requestedTick: req.order.requestedTick,
      departTick: started,
      waited: req.waited,
      paid: normalizePaid(req.cost),
      fallback: req.fallback ? clone(req.fallback) : null,
      originPos: origin,
      dest: clone(req.dest),
      path,
      seatKey: req.seatKey,
    });
    if (req.kind === 'breakthrough') {
      activity.usePill = req.order.usePill === true;
      activity.supporterId = req.order.supporterId === undefined ? null : req.order.supporterId;
      activity.partner = activity.supporterId;
      activity.partnerActivityId = null;
      activity.outcome = null;
    }
    if (path.length === 0) {
      activity.status = 'working';
      activity.arriveTick = started;
      activity.startTick = started;
    }
    world.activities.push(activity);
    d.activityId = activity.id;
    d.manualOrder = req.forced ? d.manualOrder : req.order;
    d.manualOrder.status = 'active';
    d.manualOrder.activityId = activity.id;
    if (req.fallback && req.order.kind === 'cultivate') {
      d.manualOrder.kind = 'cultivate';
    }
    if (req.seatKey) {
      world.seatWaits = world.seatWaits.filter((s) => !(s.discipleId === d.id && s.seatKey === req.seatKey));
    }
    putReservation(world, activity, req);
    events.push(pushEvent(world, { type: 'activityDeparted', activityId: activity.id, kind: activity.kind, discipleId: d.id }));
    if (req.kind === 'breakthrough' && activity.supporterId) {
      const sup = disciple(world, activity.supporterId);
      const support = baseActivity({
        id: actId(world.activities.length + 1),
        discipleId: sup.id,
        kind: 'support',
        target: { breakthroughId: activity.id },
        units: 1,
        origin: 'manual',
        manualSeq: null,
        requestedTick: activity.requestedTick,
        departTick: started,
        waited: 0,
        paid: zeroPaid(),
        fallback: null,
        originPos: clone(sup.pos),
        dest: dojo(),
        path: pathBetween(sup.pos, dojo()),
        seatKey: null,
      });
      support.partner = d.id;
      support.partnerActivityId = activity.id;
      if (support.path.length === 0) {
        support.status = 'working';
        support.arriveTick = started;
        support.startTick = started;
      }
      activity.partnerActivityId = support.id;
      world.activities.push(support);
      sup.activityId = support.id;
      if (activity.partnerWait || support.partnerWait || support.status === 'traveling' || activity.status === 'traveling') {
        if (activity.status === 'working' && support.status !== 'working') {
          activity.status = 'traveling';
          activity.partnerWait = true;
          activity.startTick = null;
        }
        if (support.status === 'working' && activity.status !== 'working') {
          support.status = 'traveling';
          support.partnerWait = true;
          support.startTick = null;
        }
      }
      events.push(pushEvent(world, { type: 'activityDeparted', activityId: support.id, kind: 'support', discipleId: sup.id }));
    }
    return events;
  }

  function normalizePaid(cost) {
    const paid = zeroPaid();
    for (const k of PAID_KEYS) if (cost[k]) paid[k] = cost[k];
    return paid;
  }

  function pay(world, cost) {
    for (const k of RESOURCE_KEYS) world.resources[k] -= cost[k] || 0;
    if (cost.pills) world.inventory[PILL_ID] -= cost.pills;
  }

  function baseActivity(fields) {
    return Object.assign({
      unitsDone: 0,
      workTicks: 0,
      status: 'traveling',
      arriveTick: null,
      startTick: null,
      completedTick: null,
      refunded: false,
      snapshot: null,
      anchorSnapshot: null,
      pathIndex: 0,
      stepTicks: 0,
      halt: null,
      partnerWait: false,
    }, fields);
  }

  function putReservation(world, activity, req) {
    if (activity.seatKey === null && !paidPositive(activity.paid) && activity.kind !== 'breakthrough') return;
    world.reservations.push({
      id: `rsv-${activity.id}`,
      activityId: activity.id,
      participants: req.participants.slice(),
      seats: clone(req.seats),
      cost: normalizePaid(req.cost),
    });
  }

  function releaseReservation(world, activity) {
    world.reservations = world.reservations.filter((r) => r.activityId !== activity.id);
  }

  function refund(world, activity) {
    if (activity.refunded) return;
    for (const k of RESOURCE_KEYS) world.resources[k] += activity.paid[k];
    world.inventory[PILL_ID] += activity.paid.pills;
    activity.refunded = true;
    releaseReservation(world, activity);
  }

  function progressActivity(world, act, t) {
    const events = [];
    if (act.status === 'done' || act.status === 'cancelled') return { events };
    if (act.kind === 'support' && act.status === 'working') return { events };
    const d = disciple(world, act.discipleId);
    if (act.status === 'traveling') {
      if (act.partnerWait) {
        if (partnerHere(world, act)) beginWork(world, act, t + 1);
        return { events };
      }
      if (act.pathIndex >= act.path.length) {
        beginWork(world, act, t + 1);
        return { events };
      }
      act.stepTicks += 1;
      if (act.stepTicks < STEP) return { events };
      act.stepTicks = 0;
      d.pos = clone(act.path[act.pathIndex]);
      act.pathIndex += 1;
      if (act.halt === 'step') {
        events.push(...cancelTravel(world, act));
        return { events };
      }
      if (act.pathIndex < act.path.length) return { events };
      if (needsPartner(act) && !partnerHere(world, act)) {
        act.partnerWait = true;
        act.arriveTick = t + 1;
        const other = partnerActivity(world, act);
        if (other && other.partnerWait) beginWork(world, act, t + 1);
        return { events };
      }
      beginWork(world, act, t + 1);
      return { events };
    }
    if (act.startTick === null || t < act.startTick) return { events };
    if (act.workTicks % TICK === 0) {
      if (act.kind === 'cultivate') {
        const block = Progression.cultivationBlock(d);
        if (block) {
          const turned = convertCultivateToRest(world, act, block, t);
          events.push(...turned.events);
          if (turned.split) return { events };
        }
      }
      act.snapshot = takeSnapshot(d, t);
      if (act.kind === 'brew' && act.anchorSnapshot === null) act.anchorSnapshot = clone(act.snapshot);
    }
    act.workTicks += 1;
    if (act.kind === 'breakthrough') mirrorSupport(world, act);
    if (act.workTicks % TICK !== 0) return { events };
    return completeUnit(world, act, t);
  }

  function needsPartner(act) {
    return act.kind === 'breakthrough' && act.supporterId !== null;
  }
  function partnerActivity(world, act) {
    if (!act.partnerActivityId) return null;
    return world.activities.find((a) => a.id === act.partnerActivityId) || null;
  }
  function partnerHere(world, act) {
    const other = partnerActivity(world, act);
    if (!other) return !needsPartner(act);
    return other.pathIndex >= other.path.length;
  }
  function beginWork(world, act, startTick) {
    act.partnerWait = false;
    act.status = 'working';
    act.arriveTick = act.arriveTick === null ? startTick : act.arriveTick;
    act.startTick = startTick;
    const other = partnerActivity(world, act);
    if (other) {
      other.partnerWait = false;
      other.status = 'working';
      other.arriveTick = other.arriveTick === null ? startTick : other.arriveTick;
      other.startTick = startTick;
    }
  }
  function mirrorSupport(world, act) {
    const other = partnerActivity(world, act);
    if (!other || other.kind !== 'support') return;
    other.workTicks = act.workTicks;
    other.snapshot = other.snapshot || takeSnapshot(disciple(world, other.discipleId), world.clock.tick);
  }
  function convertCultivateToRest(world, act, block, t) {
    const d = disciple(world, act.discipleId);
    const fallback = { from: 'cultivate', reason: block };
    const restOrder = {
      seq: d.manualOrder ? d.manualOrder.seq : act.manualSeq,
      commandId: d.manualOrder ? d.manualOrder.commandId : act.id,
      status: 'pending',
      kind: 'rest',
      target: {},
      units: Math.max(1, act.units - act.unitsDone),
      requestedTick: t,
      activityId: null,
    };
    const seat = chooseSeat(world, d, 'rest', restOrder, fallback);
    let dest = destinationFor(world, 'rest', {}, seat.seatKey);
    const cap = seatPool(world, new Set([act.id]));
    if (seat.seatKey && (cap[seat.seatKey] || 0) < 1) {
      seat.seatKey = null;
      seat.seats = {};
      dest = dojo();
    }
    if (samePos(d.pos, dest) && (act.seatKey || null) === (seat.seatKey || null)) {
      act.kind = 'rest';
      act.fallback = fallback;
      act.target = {};
      return { split: false, events: [] };
    }
    if (act.unitsDone > 0) {
      act.units = act.unitsDone;
      act.workTicks = act.unitsDone * TICK;
      act.status = 'done';
    } else {
      act.status = 'cancelled';
      act.refunded = true;
      act.workTicks = 0;
    }
    act.completedTick = t + 1;
    act.halt = null;
    releaseReservation(world, act);
    if (d.activityId === act.id) d.activityId = null;
    if (!d.manualOrder) d.manualOrder = restOrder;
    d.manualOrder.kind = 'cultivate';
    const events = startGranted(world, {
      id: `d7c-${act.id}`,
      discipleId: d.id,
      waited: 0,
      cost: zeroPaid(),
      seats: seat.seats,
      participants: [d.id],
      kind: 'rest',
      order: Object.assign({}, d.manualOrder, { kind: 'cultivate', units: restOrder.units, target: {} }),
      fallback,
      seatKey: seat.seatKey,
      dest,
      forced: true,
    });
    const rest = activeOf(world, d.id);
    if (rest && (rest.status === 'traveling' || rest.status === 'working')) {
      const stepped = progressActivity(world, rest, t);
      events.push(...stepped.events);
    }
    return { split: true, events };
  }
  function takeSnapshot(d, tick) {
    return { stamina: d.stamina, mind: d.mind, injury: d.injury, cultivation: d.cultivation, slotEq: slotEqOf(tick) };
  }

  function cancelTravel(world, act) {
    const events = [];
    refund(world, act);
    act.status = 'cancelled';
    act.completedTick = world.clock.tick + 1;
    act.halt = null;
    const d = disciple(world, act.discipleId);
    if (d && d.activityId === act.id) d.activityId = null;
    const other = partnerActivity(world, act);
    if (other && other.status !== 'done' && other.status !== 'cancelled') {
      refund(world, other);
      other.status = 'cancelled';
      other.completedTick = world.clock.tick + 1;
      const s = disciple(world, other.discipleId);
      if (s && s.activityId === other.id) s.activityId = null;
    }
    if (d && d.manualOrder && (d.manualOrder.activityId === act.id || d.manualOrder.activityId === null)) {
      const replacementPending = d.manualOrder.status === 'pending' && d.manualOrder.activityId === null && act.manualSeq !== d.manualOrder.seq;
      if (!replacementPending) {
        d.manualOrder = null;
        d.autonomy.resumeReason = 'manual-cancelled';
      }
    }
    events.push(pushEvent(world, { type: 'activityCancelled', activityId: act.id, refunded: true }));
    return events;
  }

  function completeUnit(world, act, t) {
    const events = [];
    const d = disciple(world, act.discipleId);
    const before = { stamina: d.stamina, mind: d.mind, injury: d.injury, cultivation: d.cultivation };
    applyUnitEffect(world, act, d);
    act.unitsDone += 1;
    events.push(pushEvent(world, {
      type: 'unitCompleted', activityId: act.id, kind: act.kind, unit: act.unitsDone,
      discipleId: d.id, fallback: act.fallback ? clone(act.fallback) : null,
      before, after: { stamina: d.stamina, mind: d.mind, injury: d.injury, cultivation: d.cultivation },
    }));
    let stopReason = null;
    if (act.kind === 'breakthrough') {
      const other = partnerActivity(world, act);
      if (other) finishSupport(world, other, t);
      stopReason = 'breakthroughResolved';
      events.push(pushEvent(world, { type: 'breakthroughResolved', activityId: act.id, discipleId: d.id, outcome: clone(act.outcome) }));
    }
    if (act.unitsDone >= act.units || act.kind === 'breakthrough') {
      finishActivity(world, act, d, t);
      events.push(pushEvent(world, { type: 'activityDone', activityId: act.id, kind: act.kind, discipleId: d.id }));
    }
    return { events, stopReason };
  }

  function finishSupport(world, act, t) {
    const d = disciple(world, act.discipleId);
    const cost = Rules.applyActionCost('support', { stamina: d.stamina, mind: d.mind });
    d.stamina = cost.stamina;
    d.mind = cost.mind;
    act.unitsDone = 1;
    act.workTicks = TICK;
    finishActivity(world, act, d, t);
  }

  function finishActivity(world, act, d, t) {
    act.status = 'done';
    act.completedTick = t + 1;
    act.halt = null;
    releaseReservation(world, act);
    if (d.activityId === act.id) d.activityId = null;
    if (d.manualOrder && d.manualOrder.activityId === act.id) {
      d.manualOrder = null;
      d.autonomy.resumeReason = 'manual-done';
    } else if (act.manualSeq !== null && d.manualOrder === null && act.kind !== 'support') {
      d.autonomy.resumeReason = 'promise-done';
    }
  }

  function applyUnitEffect(world, act, d) {
    const snap = act.snapshot;
    const slotEq = snap.slotEq;
    if (act.kind === 'gather-material' || act.kind === 'gather-herb') {
      const resource = act.kind === 'gather-material' ? 'spiritMaterial' : 'spiritHerb';
      const y = Rules.gatherYieldAtEq({ slotEq, resource, craft: d.attributes.craft, stamina: snap.stamina });
      world.resources[resource] += y.amount;
      const cost = Rules.applyActionCost(act.kind, { stamina: d.stamina, mind: d.mind });
      d.stamina = cost.stamina;
      d.mind = cost.mind;
      return;
    }
    if (act.kind === 'cultivate') {
      const tile = act.seatKey === 'work:spiritTerrace'
        ? Rules.evaluateFacilityPlacement(world.tiles, doneBuild(world, 'spiritTerrace').target.tileId, 'spiritTerrace').multiplierBp
        : Rules.BASIS_POINTS;
      const g = Rules.cultivationGainAtEq({
        slotEq, comprehension: d.attributes.comprehension, stamina: snap.stamina, mind: snap.mind, injury: snap.injury, tileMultiplierBp: tile,
      });
      const capped = Rules.capCultivationGain(d.cultivation, g.gain);
      d.cultivation += capped.applied;
      const cost = Rules.applyActionCost('cultivate', { stamina: d.stamina, mind: d.mind });
      d.stamina = cost.stamina;
      d.mind = cost.mind;
      return;
    }
    if (act.kind === 'rest') {
      const atResidence = act.seatKey === 'rest:residence';
      const residence = atResidence
        ? Rules.evaluateFacilityPlacement(world.tiles, doneBuild(world, 'residence').target.tileId, 'residence').multiplierBp
        : undefined;
      const next = Rules.applyRest({
        stamina: snap.stamina, mind: snap.mind, injury: snap.injury, rootBone: d.attributes.rootBone,
        atResidence, residenceMultiplierBp: residence,
      });
      d.stamina = next.stamina;
      d.mind = next.mind;
      d.injury = next.injury;
      return;
    }
    if (act.kind === 'tune-mind' || act.kind === 'build' || act.kind === 'brew' || act.kind === 'aid') {
      const cost = Rules.applyActionCost(act.kind === 'tune-mind' ? 'tune-mind' : act.kind, { stamina: d.stamina, mind: d.mind });
      d.stamina = cost.stamina;
      d.mind = cost.mind;
      if (act.kind === 'brew' && act.unitsDone + 1 === act.units) {
        const anchor = act.anchorSnapshot;
        const tile = Rules.evaluateFacilityPlacement(world.tiles, doneBuild(world, 'alchemyRoom').target.tileId, 'alchemyRoom').multiplierBp;
        const out = Rules.brewOutput({ recipeId: act.target.recipeId, craft: d.attributes.craft, stamina: anchor.stamina, tileMultiplierBp: tile });
        world.inventory[PILL_ID] += out.amount;
      }
      if (act.kind === 'aid' && act.unitsDone + 1 === act.units) {
        const reward = Rules.aidReward(act.target.optionId);
        for (const k of Object.keys(reward)) world.resources[k] += reward[k];
        world.story.rescues.push({ id: Rules.AID_ID, completedTick: world.clock.tick + 1, rewardClaimed: true });
      }
      return;
    }
    if (act.kind === 'breakthrough') {
      const resolved = Progression.resolve(
        { mind: snap.mind, cultivation: snap.cultivation, injury: snap.injury },
        { pill: act.usePill, supporter: act.supporterId !== null },
        world.rngState,
      );
      world.rngState = resolved.rngState;
      act.outcome = resolved.outcome;
      d.cultivation = resolved.outcome.cultivationAfter;
      d.injury = resolved.outcome.injuryAfter;
      if (resolved.outcome.result === 'success') d.breakthroughs = 1;
      const cost = Rules.applyActionCost('breakthrough', { stamina: d.stamina, mind: d.mind });
      d.stamina = cost.stamina;
      d.mind = cost.mind;
    }
  }

  function arbitrateDepartures(input) {
    const result = Engine.arbitrate(input);
    const denied = result.denied.map((d) => {
      const req = input.requests.find((r) => r.id === d.id);
      return {
        id: d.id,
        code: d.code,
        reason: d.reason,
        fallback: { kind: 'rest', from: req ? req.kind || req.discipleId : d.id, reason: d.code },
      };
    });
    return { granted: result.granted.slice(), denied, remaining: result.remaining };
  }

  return Object.freeze({
    SCHEMA_VERSION, RULE_VERSION, RNG_VERSION, SCENARIO_ID, DEFAULT_POLICY, ASK_POLICY,
    createWorld, validateWorld, hashWorld, serializeState, parseState, dispatch, advanceTicks,
    pathBetween, arbitrateDepartures,
  });
});
