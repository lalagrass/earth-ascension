/*
 * SG-02A：第一章事件與內容資料（純資料＋資料驗證）。
 *
 * 範圍界線（issue #83、設計 0.2）：
 * - 只有「宣告式內容」與「驗證／查詢」函式；沒有 advance、指令、存讀、去重、招募、戰鬥或 UI 的 runtime。
 *   那些屬 SG-03／04A／06 等後續工作，本檔只宣告它們必須遵守的契約。
 * - 不複製任何規則數字：觸發時點、援村時數／人數、第 42 格上限等一律以 { rule: NAME } 或
 *   { phase: ID, field: NAME } 引用 js/rules.js；文字描述不含數字，且要嘛以 claims 與 Rules.SPIRIT_PHASES
 *   核對，要嘛明示 narrativeOnly。
 * - 玩家性格只影響文字提示（personalityNote／describeEvent），不改選項、觸發或效果。
 * - 不改 schemaVersion／ruleVersion／rngVersion；內容尚未接進世界狀態，新世界不含任何事件字串。
 * - 載入策略：Node 以 CommonJS；瀏覽器依序載入 rng.js、rules.js、state.js 再載入本檔，
 *   掛在 globalThis.SectChronicle.StoryData。
 */
(function (root, factory) {
  'use strict';
  let Rules;
  let State;
  if (typeof module === 'object' && module && module.exports) {
    Rules = require('./rules.js');
    State = require('./state.js');
    module.exports = factory(Rules, State);
  } else {
    Rules = root.SectChronicle && root.SectChronicle.Rules;
    if (!Rules) throw new Error('story-data.js 需要先載入 js/rules.js（以及 js/rng.js）');
    State = root.SectChronicle.State;
    if (!State) throw new Error('story-data.js 需要先載入 js/state.js（在 js/rules.js 之後、本檔之前）');
    root.SectChronicle.StoryData = factory(Rules, State);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rules, State) {
  'use strict';

  const CONTENT_VERSION = 1;
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isText = (v) => typeof v === 'string' && v.trim().length > 0;
  const deepFreeze = (o) => {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      for (const k of Object.keys(o)) deepFreeze(o[k]);
    }
    return o;
  };
  const clone = (x) => JSON.parse(JSON.stringify(x));

  // ---------- 效果詞彙（宣告；由後續 runtime 解讀） ----------
  const EFFECT_TYPES = deepFreeze({
    showAidPrompt: { required: ['aidId'], worldChange: false, consumer: 'SG-04A' },
    setInvitationStatus: { required: ['candidateId', 'status'], worldChange: true, consumer: 'SG-03' },
    grantAidReward: { required: ['aidId', 'rewardOptions', 'dedupeKey'], worldChange: true, consumer: 'SG-04A' },
    recordRescue: { required: ['rescueId', 'dedupeKey'], worldChange: true, consumer: 'SG-04A' },
    submitFormation: { required: ['payloadOwner'], worldChange: false, consumer: 'SG-06' },
    setOrganisationStatus: { required: ['value'], worldChange: true, consumer: 'SG-06' },
    displayLabel: { required: ['labelId'], worldChange: false, consumer: 'UI' },
  });

  const AID_ID = Rules.AID_ID;
  const REWARD_KEY = `reward:${AID_ID}`;

  // ---------- 內容 ----------
  const phaseTrigger = (phase) => ({ slotAtLeast: { phase, field: 'startSlot' } });
  const invite = (n, priority, extraAll, title, body, yes) => ({
    id: `evt-invite-cand-${n}`,
    kind: 'invitation',
    candidateId: `cand-${n}`,
    priority,
    pending: true,
    onceKey: `invite:cand-${n}`,
    trigger: {
      all: [
        { rescueCompleted: true },
        phaseTrigger('manifest'),
        { candidateStatus: { candidateId: `cand-${n}`, is: 'locked' } },
        ...extraAll,
      ],
    },
    narrativeOnly: true,
    text: { title, body },
    options: [
      {
        id: `opt-invite-cand-${n}-accept`, label: yes,
        effects: [{ type: 'setInvitationStatus', candidateId: `cand-${n}`, status: 'invited' }],
      },
      {
        id: `opt-invite-cand-${n}-later`, label: '讓我再想想',
        effects: [{ type: 'setInvitationStatus', candidateId: `cand-${n}`, status: 'deferred' }],
      },
    ],
  });

  const DATA = {
    contentVersion: CONTENT_VERSION,
    requiresRuleVersion: Rules.RULE_VERSION,
    events: [
      {
        id: 'evt-phase-faint', kind: 'phase', priority: 10, pending: false, onceKey: 'phase:faint',
        trigger: phaseTrigger('faint'), claims: ['herbLocked'],
        text: { title: '山風微動', body: '師父說，山上的靈氣淡得像薄霧。你照常吐納，仍能感到一點點進步；山裡的靈草還沒有長出來。' },
      },
      {
        id: 'evt-phase-omen', kind: 'phase', priority: 20, pending: false, onceKey: 'phase:omen',
        trigger: phaseTrigger('omen'), claims: ['herbUnlocked', 'cultivationBoost'],
        text: { title: '草木初兆', body: '清晨的山坡冒出從未見過的草葉，吐納也比前幾天順暢。靈草可以採了，村子那邊似乎也有動靜。' },
      },
      {
        id: 'evt-phase-manifest', kind: 'phase', priority: 20, pending: false, onceKey: 'phase:manifest',
        trigger: phaseTrigger('manifest'), claims: ['cultivationBoost'],
        text: { title: '靈氣顯化', body: '山間的霧氣泛著微光，修行時氣息流轉得更快。道館外有人遠遠觀望，像是想來求學。' },
      },
      {
        id: 'evt-phase-surge', kind: 'phase', priority: 20, pending: false, onceKey: 'phase:surge',
        trigger: phaseTrigger('surge'), claims: ['threatRises', 'cultivationBoost'],
        text: { title: '獸患升溫', body: '林中的野獸越來越躁動，夜裡常能聽見低吼。師父叮囑大家，這陣子要把山門守好。' },
      },
      {
        id: 'evt-village-plea', kind: 'plea', priority: 30, pending: true, onceKey: 'plea:village-fence',
        trigger: { all: [{ slotAtLeast: { rule: 'AID_AVAILABLE_FROM_SLOT' } }, { rescueCompleted: false }] },
        narrativeOnly: true,
        text: { title: '村口求援', body: '村民匆匆趕來，說村子的籬笆被野獸衝壞了，想請道館幫忙修補。師父點頭，讓你決定要不要去。' },
        options: [
          { id: 'opt-aid-accept', label: '我去幫忙', effects: [{ type: 'showAidPrompt', aidId: AID_ID }] },
          { id: 'opt-aid-later', label: '稍後再說', effects: [] },
        ],
      },
      {
        id: 'evt-aid-complete', kind: 'aidCompletion', priority: 35, pending: false, onceKey: `aid:${AID_ID}`,
        trigger: { aidCompleted: true }, narrativeOnly: true,
        text: { title: '籬笆修好了', body: '村民道謝後送來一些山裡的物資，說這是大家的一點心意。' },
        effects: [
          { type: 'grantAidReward', aidId: AID_ID, rewardOptions: Object.keys(Rules.AID_OPTIONS), dedupeKey: REWARD_KEY },
          { type: 'recordRescue', rescueId: AID_ID, dedupeKey: REWARD_KEY },
        ],
      },
      invite(1, 41, [], '有人求學', '一位年輕人站在道館門口，說想拜師學藝。', '我願意見見他'),
      invite(2, 40, [{ eventTriggered: 'evt-invite-cand-1' }], '又有人來', '另一位同村的年輕人也來到道館，想跟著大家一起練。', '我願意見見他'),
      {
        id: 'evt-beast-crisis', kind: 'crisis', priority: 100, pending: true, onceKey: 'crisis:beast',
        trigger: { slotAtLeast: { rule: 'MAX_SLOT_INDEX' } }, narrativeOnly: true,
        text: { title: '獸患來襲', body: '獸群逼近山門，村民躲進道館。師父把布陣的決定交給你。' },
        options: [
          { id: 'opt-crisis-submit', label: '佈陣完成', effects: [{ type: 'submitFormation', payloadOwner: 'SG-06' }] },
        ],
      },
      {
        id: 'evt-ending-victory', kind: 'ending', priority: 90, pending: false, onceKey: 'ending:victory',
        trigger: { crisisOutcome: 'victory' }, narrativeOnly: true,
        text: { title: '門派成立', body: '村民們自發前來道賀，願意共同守護這座山。道館正式立派；你成為首席弟子，師父仍是館主。' },
        effects: [
          { type: 'setOrganisationStatus', value: 'sectFounded' },
          { type: 'displayLabel', labelId: 'chief-disciple' },
        ],
      },
      {
        id: 'evt-ending-defeat', kind: 'ending', priority: 90, pending: false, onceKey: 'ending:defeat',
        trigger: { crisisOutcome: 'defeat' }, narrativeOnly: true,
        text: { title: '暫緩立派', body: '大家保住了性命，也退回安全的地方。立派的事只能暫緩，師父仍是館主，道館還在。' },
        effects: [{ type: 'setOrganisationStatus', value: 'foundingDeferred' }],
      },
    ],
    contracts: {
      events: { pendingStopsAdvance: true, afterChoice: { phase: 'planning' } },
      aid: {
        aidId: AID_ID,
        durationSlots: { rule: 'AID_DURATION_SLOTS' },
        workers: { rule: 'AID_WORKERS' },
        availableFromSlot: { rule: 'AID_AVAILABLE_FROM_SLOT' },
        rewardOnce: true,
        rewardDedupeKey: REWARD_KEY,
        recruitmentGrantsReward: false,
      },
      recruitment: {
        candidateIds: [...State.CANDIDATE_IDS],
        offerOnce: true,
        reprompt: 'never',
        afterChoice: { phase: 'planning' },
        acceptCommand: {
          name: 'acceptCandidate',
          allowedPhases: ['planning'],
          joinSlot: 'slotIndexAtAcceptance',
          backpay: false,
          rejectedWhenSlotAtLeast: { rule: 'MAX_SLOT_INDEX' },
        },
        beforeJoin: { work: false, support: false, power: false },
        anyHeadcountReachesCrisis: true,
      },
      crisis: {
        slotAtLeast: { rule: 'MAX_SLOT_INDEX' },
        priorityOverInvitations: true,
        afterResolution: 'ending',
        noSlot43: true,
        resolveOnce: true,
        outcomes: ['defeat', 'victory'],
      },
      master: { remainsMaster: true, scriptedDeath: false, scriptedDisappearance: false },
    },
    personality: {
      byKind: {
        plea: {
          risk: {
            cautious: { suggestion: '先看清村口的狀況再動手，帶好工具、不要貿然衝進去。', line: '「我先去探探路，別讓大家白白冒險。」' },
            bold: { suggestion: '村民等不及了，可以直接上前幫忙，邊做邊調整。', line: '「交給我，現在就動手。」' },
          },
          bond: {
            independent: { suggestion: '這件事你可以自己扛下來，不必驚動道館其他人。', line: '「這點小事，我一個人就夠了。」' },
            caring: { suggestion: '先問問村民需要什麼，也讓師父知道你的打算。', line: '「大家有什麼難處，儘管跟我說。」' },
          },
        },
        invitation: {
          risk: {
            cautious: { suggestion: '多觀察來學藝的人一陣子再決定，不急著答應。', line: '「讓我們先看看彼此合不合適。」' },
            bold: { suggestion: '看準了就收下，趁早讓他們一起練起來。', line: '「來吧，從今天就跟著練。」' },
          },
          bond: {
            independent: { suggestion: '收徒是師父與你的決定，不必看旁人臉色。', line: '「我們自己決定就好。」' },
            caring: { suggestion: '多聽聽他們的來歷與心願，再給個明確的答覆。', line: '「說說看你為什麼想來？」' },
          },
        },
        crisis: {
          risk: {
            cautious: { suggestion: '守住山門與退路，穩穩佈置勝過冒險一搏。', line: '「寧可慢一步，也要把退路留好。」' },
            bold: { suggestion: '看準時機主動出擊，也許能搶到先手。', line: '「與其等牠們來，不如迎上去。」' },
          },
          bond: {
            independent: { suggestion: '把最難的位置自己扛起來，讓其他人專心護住自己。', line: '「最險的一處，我來。」' },
            caring: { suggestion: '先顧好每個人的安危，必要時同守一處。', line: '「誰也別落單，我們一起守。」' },
          },
        },
      },
      combos: {
        'cautious+independent': '你行事謹慎又習慣獨自承擔，旁人常覺得你可靠，卻不容易走近。',
        'cautious+caring': '你謹慎，也惦記著身邊的人，總想先把每個人的退路安排好。',
        'bold+independent': '你敢衝敢拚，也習慣自己面對，常是第一個走進險地的人。',
        'bold+caring': '你敢作敢當，又重情義，願意為同伴搶在前頭。',
      },
      fallback: { combo: '你憑自己的判斷行事。', suggestion: '依你的判斷選擇最合適的做法。', line: '「我想好了。」' },
    },
    templates: {
      'herb-child': { origin: 'new-in-this-version', label: '採藥童', blurb: '從小在山邊採藥，眼力與手藝都不錯。' },
      'farmer-child': { origin: 'new-in-this-version', label: '農家子', blurb: '在田裡長大，身子結實，肯吃苦。' },
      'dojo-apprentice': { origin: 'new-in-this-version', label: '道館學徒', blurb: '在道館裡長大，讀得進拳經口訣。' },
    },
  };
  const STORY_DATA = deepFreeze(DATA);

  // ---------- 引用與觸發 ----------
  function resolveRef(ref) {
    if (!isObj(ref)) throw new RangeError('引用必須是物件');
    if (has(ref, 'rule')) {
      const v = Rules[ref.rule];
      if (typeof ref.rule !== 'string' || !Number.isInteger(v)) throw new RangeError(`未知規則引用：${String(ref.rule)}`);
      return v;
    }
    if (has(ref, 'phase') && has(ref, 'field')) {
      const phase = Rules.SPIRIT_PHASES.find((p) => p.id === ref.phase);
      if (!phase) throw new RangeError(`未知靈氣階段：${String(ref.phase)}`);
      if (typeof ref.field !== 'string' || !has(phase, ref.field) || !Number.isInteger(phase[ref.field])) {
        throw new RangeError(`階段 ${ref.phase} 沒有數值欄位 ${String(ref.field)}`);
      }
      return phase[ref.field];
    }
    throw new RangeError('無法解讀的引用');
  }

  function checkFacts(f) {
    if (!isObj(f)) throw new RangeError('facts 必須是物件');
    if (!Number.isInteger(f.slotIndex) || f.slotIndex < 0 || f.slotIndex > Rules.MAX_SLOT_INDEX) {
      throw new RangeError(`facts.slotIndex 必須是 0 到 ${Rules.MAX_SLOT_INDEX} 的整數`);
    }
    if (typeof f.rescueCompleted !== 'boolean') throw new RangeError('facts.rescueCompleted 必須是布林');
    if (typeof f.aidCompleted !== 'boolean') throw new RangeError('facts.aidCompleted 必須是布林');
    if (!Array.isArray(f.triggeredEventIds) || !f.triggeredEventIds.every((x) => typeof x === 'string')) {
      throw new RangeError('facts.triggeredEventIds 必須是字串陣列');
    }
    if (f.crisisOutcome !== null && f.crisisOutcome !== 'victory' && f.crisisOutcome !== 'defeat') {
      throw new RangeError('facts.crisisOutcome 必須是 null、victory 或 defeat');
    }
    if (!isObj(f.invitations)) throw new RangeError('facts.invitations 必須是物件');
    for (const id of State.CANDIDATE_IDS) {
      const inv = f.invitations[id];
      if (!isObj(inv) || !State.INVITATION_STATUSES.includes(inv.status)) {
        throw new RangeError(`facts.invitations.${id}.status 必須是合法邀請狀態`);
      }
    }
  }

  function evaluateTrigger(trigger, f) {
    if (!isObj(trigger)) throw new RangeError('trigger 必須是物件');
    const keys = Object.keys(trigger);
    if (keys.length !== 1) throw new RangeError('trigger 每層只能有一個條件');
    const k = keys[0];
    const v = trigger[k];
    switch (k) {
      case 'all':
        if (!Array.isArray(v)) throw new RangeError('trigger.all 必須是陣列');
        return v.every((t) => evaluateTrigger(t, f));
      case 'slotAtLeast': return f.slotIndex >= resolveRef(v);
      case 'rescueCompleted': return f.rescueCompleted === v;
      case 'aidCompleted': return f.aidCompleted === v;
      case 'eventTriggered': return f.triggeredEventIds.includes(v);
      case 'candidateStatus': return isObj(v) && isObj(f.invitations[v.candidateId]) && f.invitations[v.candidateId].status === v.is;
      case 'crisisOutcome': return f.crisisOutcome === v;
      default: throw new RangeError(`未知觸發條件：${k}`);
    }
  }

  const byId = new Map(STORY_DATA.events.map((e) => [e.id, e]));
  const getEvent = (id) => (typeof id === 'string' && byId.has(id) ? byId.get(id) : null);

  function dueEvents(f) {
    checkFacts(f);
    return STORY_DATA.events
      .filter((e) => !f.triggeredEventIds.includes(e.id) && evaluateTrigger(e.trigger, f))
      .sort((a, b) => (b.priority - a.priority) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((e) => e.id);
  }

  function validateChoice(eventId, optionId) {
    const e = getEvent(eventId);
    if (!e) return { ok: false, code: 'unknown_event', reason: `未知事件：${String(eventId)}` };
    if (!e.pending) return { ok: false, code: 'not_pending', reason: `事件 ${eventId} 不是待選事件` };
    if (!e.options.some((o) => o.id === optionId)) {
      return { ok: false, code: 'unknown_option', reason: `事件 ${eventId} 沒有選項 ${String(optionId)}` };
    }
    return { ok: true };
  }

  // ---------- 性格提示（只影響文字） ----------
  function personalityNote(kind, personality, data = STORY_DATA) {
    const P = data.personality;
    const fb = () => ({ combo: P.fallback.combo, fallback: true, lines: [P.fallback.line], suggestions: [P.fallback.suggestion] });
    const k = isObj(P.byKind) && has(P.byKind, kind) ? P.byKind[kind] : null;
    if (!k || !isObj(personality)) return fb();
    const r = k.risk && k.risk[personality.risk];
    const b = k.bond && k.bond[personality.bond];
    const combo = P.combos[`${personality.risk}+${personality.bond}`];
    if (!r || !b || !combo) return fb();
    return { combo, fallback: false, lines: [r.line, b.line], suggestions: [r.suggestion, b.suggestion] };
  }

  const NOTE_KINDS = ['plea', 'invitation', 'crisis'];
  function describeEvent(eventId, personality) {
    const e = getEvent(eventId);
    if (!e) throw new RangeError(`未知事件：${String(eventId)}`);
    return {
      id: e.id,
      kind: e.kind,
      pending: e.pending,
      title: e.text.title,
      body: e.text.body,
      options: (e.options || []).map((o) => ({ id: o.id, label: o.label })),
      note: NOTE_KINDS.includes(e.kind) ? personalityNote(e.kind, personality) : null,
    };
  }

  function collectTexts(data = STORY_DATA) {
    const out = [];
    const add = (path, text) => out.push({ path, text });
    (data.events || []).forEach((e, i) => {
      add(`events[${i}].text.title`, e.text && e.text.title);
      add(`events[${i}].text.body`, e.text && e.text.body);
      (e.options || []).forEach((o, j) => add(`events[${i}].options[${j}].label`, o.label));
    });
    const P = data.personality || {};
    for (const kind of Object.keys(P.byKind || {})) {
      for (const axis of Object.keys(P.byKind[kind])) {
        for (const val of Object.keys(P.byKind[kind][axis])) {
          for (const f of ['suggestion', 'line']) add(`personality.byKind.${kind}.${axis}.${val}.${f}`, P.byKind[kind][axis][val][f]);
        }
      }
    }
    for (const c of Object.keys(P.combos || {})) add(`personality.combos.${c}`, P.combos[c]);
    if (P.fallback) for (const f of ['combo', 'suggestion', 'line']) add(`personality.fallback.${f}`, P.fallback[f]);
    for (const t of Object.keys(data.templates || {})) {
      add(`templates.${t}.label`, data.templates[t].label);
      add(`templates.${t}.blurb`, data.templates[t].blurb);
    }
    return out;
  }

  // ---------- 資料驗證 ----------
  const fail = (code, reason, path) => ({ ok: false, code, reason, path });
  const TOP_KEYS = ['contentVersion', 'requiresRuleVersion', 'events', 'contracts', 'personality', 'templates'];
  const EVENT_KEYS = ['id', 'kind', 'priority', 'pending', 'onceKey', 'trigger', 'claims', 'narrativeOnly', 'text', 'options', 'effects', 'candidateId'];
  const KINDS = ['phase', 'plea', 'aidCompletion', 'invitation', 'crisis', 'ending'];
  const ORG_VALUES = ['sectFounded', 'foundingDeferred'];
  const CLAIMS = {
    herbLocked: (p) => p.herbYield === 0,
    herbUnlocked: (p) => p.herbYield > 0,
    cultivationBoost: (p, prev) => !!prev && p.cultivationBp > prev.cultivationBp,
    threatRises: (p, prev) => !!prev && p.threatLevel > prev.threatLevel,
  };

  function walkRefs(node, path, onRef) {
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i += 1) {
        const r = walkRefs(node[i], `${path}[${i}]`, onRef);
        if (r) return r;
      }
      return null;
    }
    if (!isObj(node)) return null;
    if (has(node, 'rule') || (has(node, 'phase') && has(node, 'field'))) {
      try { resolveRef(node); } catch (err) { return fail('bad_ref', err.message, path); }
      return null;
    }
    for (const k of Object.keys(node)) {
      const r = walkRefs(node[k], `${path}.${k}`, onRef);
      if (r) return r;
    }
    return null;
  }

  function validateEffect(eff, path, ev) {
    if (!isObj(eff) || !has(EFFECT_TYPES, eff.type)) return fail('unknown_effect', `未知效果：${isObj(eff) ? String(eff.type) : String(eff)}`, path);
    if ((eff.type === 'grantAidReward' || eff.type === 'recordRescue') && ev.kind !== 'aidCompletion') {
      return fail('reward_outside_aid', `${eff.type} 只能出現在援村完成事件`, path);
    }
    for (const f of EFFECT_TYPES[eff.type].required) {
      if (!has(eff, f)) return fail('bad_effect', `效果 ${eff.type} 缺少欄位 ${f}`, `${path}.${f}`);
    }
    switch (eff.type) {
      case 'setOrganisationStatus':
        if (!ORG_VALUES.includes(eff.value) || !State.ORGANISATION_STATUSES.includes(eff.value)) return fail('bad_effect', `不合法的組織狀態：${String(eff.value)}`, `${path}.value`);
        break;
      case 'setInvitationStatus':
        if (eff.status !== 'invited' && eff.status !== 'deferred') return fail('bad_effect', `邀請事件只能設為 invited 或 deferred：${String(eff.status)}`, `${path}.status`);
        if (!State.CANDIDATE_IDS.includes(eff.candidateId) || eff.candidateId !== ev.candidateId) return fail('bad_effect', `效果的候選人與事件不符：${String(eff.candidateId)}`, `${path}.candidateId`);
        break;
      case 'grantAidReward':
        if (eff.aidId !== AID_ID) return fail('bad_ref', `未知援村：${String(eff.aidId)}`, `${path}.aidId`);
        if (!Array.isArray(eff.rewardOptions) || eff.rewardOptions.length === 0 || !eff.rewardOptions.every((o) => has(Rules.AID_OPTIONS, o))) {
          return fail('bad_ref', '獎勵選項必須是 Rules.AID_OPTIONS 的鍵', `${path}.rewardOptions`);
        }
        if (!isText(eff.dedupeKey)) return fail('bad_effect', '缺少 dedupeKey', `${path}.dedupeKey`);
        break;
      case 'recordRescue':
        if (!isText(eff.dedupeKey) || !isText(eff.rescueId)) return fail('bad_effect', 'recordRescue 欄位不完整', path);
        break;
      case 'showAidPrompt':
        if (eff.aidId !== AID_ID) return fail('bad_ref', `未知援村：${String(eff.aidId)}`, `${path}.aidId`);
        break;
      case 'submitFormation':
        if (eff.payloadOwner !== 'SG-06') return fail('bad_effect', '佈陣內容由 SG-06 擁有', `${path}.payloadOwner`);
        break;
      case 'displayLabel':
        if (!isText(eff.labelId)) return fail('bad_effect', '缺少 labelId', `${path}.labelId`);
        break;
      default: break;
    }
    return null;
  }

  function validateStoryData(data = STORY_DATA) {
    if (!isObj(data)) return fail('unknown_field', '內容必須是物件', '$');
    for (const k of Object.keys(data)) {
      if (!TOP_KEYS.includes(k)) return fail('unknown_field', `未知欄位：${k}`, `$.${k}`);
    }
    if (data.requiresRuleVersion !== Rules.RULE_VERSION) {
      return fail('rule_version_mismatch', `內容要求 ruleVersion ${String(data.requiresRuleVersion)}，目前是 ${Rules.RULE_VERSION}`, '$.requiresRuleVersion');
    }
    const events = Array.isArray(data.events) ? data.events : null;
    if (!events) return fail('unknown_field', 'events 必須是陣列', '$.events');

    // 重複 ID／onceKey
    const ids = new Set();
    const allOptIds = new Set();
    const onceKeys = new Set();
    for (let i = 0; i < events.length; i += 1) {
      const e = events[i];
      const p = `$.events[${i}]`;
      if (!isObj(e)) return fail('unknown_field', '事件必須是物件', p);
      for (const k of Object.keys(e)) if (!EVENT_KEYS.includes(k)) return fail('unknown_field', `事件含未知欄位：${k}`, `${p}.${k}`);
      if (!isText(e.id) || ids.has(e.id)) return fail('duplicate_id', `事件 ID 缺漏或重複：${String(e.id)}`, `${p}.id`);
      ids.add(e.id);
      if (!isText(e.onceKey) || onceKeys.has(e.onceKey)) return fail('duplicate_once_key', `onceKey 缺漏或重複：${String(e.onceKey)}`, `${p}.onceKey`);
      onceKeys.add(e.onceKey);
      for (let j = 0; j < (Array.isArray(e.options) ? e.options.length : 0); j += 1) {
        const o = e.options[j];
        if (!isObj(o) || !isText(o.id) || allOptIds.has(o.id)) return fail('duplicate_id', `選項 ID 缺漏或重複：${isObj(o) ? String(o.id) : '?'}`, `${p}.options[${j}].id`);
        allOptIds.add(o.id);
      }
    }

    // 候選人
    for (let i = 0; i < events.length; i += 1) {
      const e = events[i];
      if (e.kind === 'invitation' && !State.CANDIDATE_IDS.includes(e.candidateId)) {
        return fail('unknown_candidate', `未知候選人：${String(e.candidateId)}`, `$.events[${i}].candidateId`);
      }
    }
    const recruit = data.contracts && data.contracts.recruitment;
    if (isObj(recruit) && Array.isArray(recruit.candidateIds)) {
      for (const c of recruit.candidateIds) {
        if (!State.CANDIDATE_IDS.includes(c)) return fail('unknown_candidate', `契約含未知候選人：${String(c)}`, '$.contracts.recruitment.candidateIds');
      }
    }
    for (const c of State.CANDIDATE_IDS) {
      const n = events.filter((e) => e.kind === 'invitation' && e.candidateId === c).length;
      if (n !== 1) return fail('candidate_coverage', `候選人 ${c} 必須剛好有一個邀請事件（目前 ${n}）`, '$.events');
    }

    // 引用與事件參照
    const refErr = walkRefs({ events, contracts: data.contracts }, '$', null);
    if (refErr) return refErr;
    const aid = data.contracts && data.contracts.aid;
    if (isObj(aid) && aid.aidId !== AID_ID) return fail('bad_ref', `契約援村不是 ${AID_ID}：${String(aid.aidId)}`, '$.contracts.aid.aidId');
    const refEvent = (t, path) => {
      if (Array.isArray(t)) {
        for (let i = 0; i < t.length; i += 1) { const r = refEvent(t[i], `${path}[${i}]`); if (r) return r; }
      } else if (isObj(t)) {
        if (has(t, 'eventTriggered') && !ids.has(t.eventTriggered)) return fail('bad_ref', `觸發引用未知事件：${String(t.eventTriggered)}`, `${path}.eventTriggered`);
        for (const k of Object.keys(t)) { const r = refEvent(t[k], `${path}.${k}`); if (r) return r; }
      }
      return null;
    };
    for (let i = 0; i < events.length; i += 1) {
      const r = refEvent(events[i].trigger, `$.events[${i}].trigger`);
      if (r) return r;
    }

    // 性格
    const P = data.personality;
    const incomplete = (path) => fail('personality_incomplete', '性格提示不完整', path);
    if (!isObj(P) || !isObj(P.byKind)) return incomplete('$.personality');
    const lim = Rules.CHARACTER_OPTION_LIMITS.personality;
    for (const kind of NOTE_KINDS) {
      const k = P.byKind[kind];
      if (!isObj(k)) return incomplete(`$.personality.byKind.${kind}`);
      for (const axis of ['risk', 'bond']) {
        if (!isObj(k[axis])) return incomplete(`$.personality.byKind.${kind}.${axis}`);
        for (const val of lim[axis]) {
          const cell = k[axis][val];
          if (!isObj(cell) || !isText(cell.suggestion) || !isText(cell.line)) return incomplete(`$.personality.byKind.${kind}.${axis}.${val}`);
        }
      }
    }
    for (const risk of lim.risk) {
      for (const bond of lim.bond) {
        if (!isObj(P.combos) || !isText(P.combos[`${risk}+${bond}`])) return incomplete(`$.personality.combos.${risk}+${bond}`);
      }
    }
    if (!isObj(P.fallback) || !isText(P.fallback.combo) || !isText(P.fallback.suggestion) || !isText(P.fallback.line)) {
      return incomplete('$.personality.fallback');
    }

    // 模板
    const T = data.templates;
    const want = Object.keys(Rules.CHARACTER_OPTION_LIMITS.templates).sort();
    if (!isObj(T) || JSON.stringify(Object.keys(T).sort()) !== JSON.stringify(want)) {
      return fail('template_mismatch', '模板鍵必須與 Rules 的模板完全一致', '$.templates');
    }
    for (const t of want) {
      if (!isObj(T[t]) || T[t].origin !== 'new-in-this-version') return fail('template_mismatch', `模板 ${t} 的 origin 必須是 new-in-this-version`, `$.templates.${t}`);
    }
    // 文字
    const texts = collectTexts(data);
    for (const t of texts) {
      if (!isText(t.text)) return fail('missing_text', '缺少文字', `$.${t.path}`);
    }
    for (const t of texts) {
      if (/[0-9０-９]/.test(t.text)) return fail('number_in_text', `文字不得含數字（數字只能在規則裡）：${t.text}`, `$.${t.path}`);
    }

    // 描述與規則連結
    for (let i = 0; i < events.length; i += 1) {
      const e = events[i];
      const p = `$.events[${i}]`;
      const hasClaims = Array.isArray(e.claims) && e.claims.length > 0;
      if (hasClaims === (e.narrativeOnly === true)) return fail('unlinked_description', `事件 ${e.id} 必須剛好有 claims 或 narrativeOnly 其一`, p);
      if (hasClaims) {
        const ref = e.trigger && e.trigger.slotAtLeast;
        const idx = isObj(ref) && has(ref, 'phase') ? Rules.SPIRIT_PHASES.findIndex((ph) => ph.id === ref.phase) : -1;
        for (const c of e.claims) {
          if (!has(CLAIMS, c)) return fail('bad_claim', `未知描述宣稱：${String(c)}`, `${p}.claims`);
          if (idx < 0 || !CLAIMS[c](Rules.SPIRIT_PHASES[idx], Rules.SPIRIT_PHASES[idx - 1])) {
            return fail('claim_false', `事件 ${e.id} 的描述「${c}」與 Rules.SPIRIT_PHASES 不符`, `${p}.claims`);
          }
        }
      }
    }

    // 效果
    for (let i = 0; i < events.length; i += 1) {
      const e = events[i];
      const list = [];
      (Array.isArray(e.effects) ? e.effects : []).forEach((x, k) => list.push([x, `$.events[${i}].effects[${k}]`]));
      (Array.isArray(e.options) ? e.options : []).forEach((o, j) => {
        (Array.isArray(o.effects) ? o.effects : []).forEach((x, k) => list.push([x, `$.events[${i}].options[${j}].effects[${k}]`]));
      });
      for (const [x, p] of list) {
        const r = validateEffect(x, p, e);
        if (r) return r;
      }
    }

    return { ok: true };
  }

  return Object.freeze({
    CONTENT_VERSION,
    STORY_DATA,
    EFFECT_TYPES,
    validateStoryData,
    dueEvents,
    evaluateTrigger,
    resolveRef,
    getEvent,
    validateChoice,
    personalityNote,
    describeEvent,
    collectTexts,
  });
});
