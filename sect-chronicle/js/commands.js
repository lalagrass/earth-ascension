/*
 * SG-03：指令層（dispatch）。驗證並套用玩家命令；不推進時間、不產生成果、不消耗 RNG。
 *
 * 範圍界線（issue #85、設計 0.2）：
 * - 本版支援 assignSlot、setDailyTemplate、chooseEvent（核心）。其餘命令（queueBuild／cancelQueuedJob／queueCraft／
 *   queueBreakthrough／setDefense／acceptCandidate）與行動（build／brew／aid／breakthrough／support）一律回
 *   not_supported_yet 並指出負責的後續任務，不假成功、不直接發資源。
 * - chooseEvent 的選項效果只取自 story-data.js 的宣告（玩家不能傳入 effects）。目前只執行 showAidPrompt（提示）
 *   與 setInvitationStatus（只改邀請狀態，不新增角色）；submitFormation（SG-06）等一律尚未支援。
 * - 命令封套 { id, expectedRevision, type, payload }。處理順序（有測試）：
 *   ① 世界驗證 → ② 封套形狀 → ③ 同 id 重送（同 type＋payload 回已處理結果；異內容 command_id_conflict）
 *   → ④ expectedRevision → ⑤ 命令類型已知／已支援 → ⑥ 各命令的 payload、phase、內容驗證與套用。
 *   被拒絕的命令不改世界、RNG、revision，也不寫 commandLog（拒絕不佔用 id）。
 * - 成功的命令 revision 恰好 +1，並寫入 commandLog 與 eventLog（序號連續）。
 * - 載入策略：Node 以 CommonJS；瀏覽器依序載入 rng.js、rules.js、state.js、story-data.js 再載入本檔，
 *   掛在 globalThis.SectChronicle.Commands。
 */
(function (root, factory) {
  'use strict';
  let Rules;
  let State;
  let StoryData;
  if (typeof module === 'object' && module && module.exports) {
    Rules = require('./rules.js');
    State = require('./state.js');
    StoryData = require('./story-data.js');
    module.exports = factory(Rules, State, StoryData);
  } else {
    Rules = root.SectChronicle && root.SectChronicle.Rules;
    if (!Rules) throw new Error('commands.js 需要先載入 js/rules.js（以及 js/rng.js）');
    State = root.SectChronicle.State;
    if (!State) throw new Error('commands.js 需要先載入 js/state.js（在 js/rules.js 之後）');
    StoryData = root.SectChronicle.StoryData;
    if (!StoryData) throw new Error('commands.js 需要先載入 js/story-data.js（在 js/state.js 之後、本檔之前）');
    root.SectChronicle.Commands = factory(Rules, State, StoryData);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rules, State, StoryData) {
  'use strict';

  const SUPPORTED_COMMANDS = Object.freeze(['assignSlot', 'setDailyTemplate', 'chooseEvent']);
  const DEFERRED_COMMANDS = Object.freeze({
    queueBuild: 'SG-04', cancelQueuedJob: 'SG-04', queueCraft: 'SG-04',
    queueBreakthrough: 'SG-05', setDefense: 'SG-06', acceptCandidate: 'SG-04A',
  });
  const SUPPORTED_ACTIONS = Object.freeze(['gather-material', 'gather-herb', 'cultivate', 'rest', 'tune-mind']);
  const DEFERRED_ACTIONS = Object.freeze({
    build: 'SG-04', brew: 'SG-04', aid: 'SG-04A', breakthrough: 'SG-05', support: 'SG-05',
  });
  const SUPPORTED_EFFECTS = Object.freeze(['showAidPrompt', 'setInvitationStatus']);
  const ID_MAX_LENGTH = 64;

  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const isInt = (v) => typeof v === 'number' && Number.isSafeInteger(v) && !Object.is(v, -0);
  const cloneJson = (v) => JSON.parse(JSON.stringify(v));
  const reject = (code, reason) => ({ ok: false, code, reason });
  const sameKeys = (o, keys) => {
    const a = Object.keys(o).sort();
    const b = [...keys].sort();
    return a.length === b.length && a.every((k, i) => k === b[i]);
  };
  const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const byIdAsc = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  function payloadHash(type, payload) {
    return State.sha256Hex(State.canonicalize({ type, payload }));
  }

  // ---------- 引擎層世界驗證 ----------
  // State.validateWorld 只看結構；這裡再核對與 story-data／本版支援行動的引用關係。
  function validateEngineWorld(world) {
    const v = State.validateWorld(world);
    if (!v.ok) return v;
    const triggered = new Set(world.story.triggeredEventIds);
    for (const pe of world.pendingEvents) {
      const ev = StoryData.getEvent(pe.id);
      if (!ev || !ev.pending) return { ok: false, code: 'unknown_pending_event', reason: `待選事件不是 story-data 的待選事件：${pe.id}`, path: 'pendingEvents' };
      if (!triggered.has(pe.id)) return { ok: false, code: 'pending_not_triggered', reason: `待選事件 ${pe.id} 必須已登記在 story.triggeredEventIds`, path: 'pendingEvents' };
    }
    for (const id of world.story.triggeredEventIds) {
      if (!StoryData.getEvent(id)) return { ok: false, code: 'unknown_triggered_event', reason: `story.triggeredEventIds 含未知事件：${id}`, path: 'story.triggeredEventIds' };
    }
    const bad = (a) => !SUPPORTED_ACTIONS.includes(a);
    for (const id of Object.keys(world.schedule.templates)) {
      if (world.schedule.templates[id].some(bad)) return { ok: false, code: 'unsupported_scheduled_action', reason: `課表範本含本版尚未支援的行動：${id}`, path: 'schedule.templates' };
    }
    if (world.schedule.overrides.some((o) => bad(o.action))) {
      return { ok: false, code: 'unsupported_scheduled_action', reason: '課表覆寫含本版尚未支援的行動', path: 'schedule.overrides' };
    }
    return { ok: true };
  }

  // 某角色在某格的行動：覆寫 > 範本 > 預設休養（明示的備案，不是假成功）。
  function scheduledAction(world, discipleId, slotIndex) {
    const o = world.schedule.overrides.find((x) => x.discipleId === discipleId && x.slotIndex === slotIndex);
    if (o) return { action: o.action, source: 'override' };
    const t = world.schedule.templates[discipleId];
    if (t) return { action: t[slotIndex % 3], source: 'template' };
    return { action: 'rest', source: 'default' };
  }

  // 在工作複本上追加一筆事件並回傳它（序號連續）。
  function appendEvent(world, event) {
    const e = Object.assign({ seq: world.eventLog.length + 1 }, event);
    world.eventLog.push(e);
    return e;
  }

  // ---------- 共用檢查 ----------
  function checkEnvelope(command) {
    if (!isRecord(command)) return reject('bad_command', '命令必須是物件');
    if (!sameKeys(command, ['id', 'expectedRevision', 'type', 'payload'])) {
      return reject('bad_command', '命令封套只能恰好含 id、expectedRevision、type、payload');
    }
    if (typeof command.id !== 'string' || command.id.length < 1 || command.id.length > ID_MAX_LENGTH) {
      return reject('bad_command', `id 必須是 1 到 ${ID_MAX_LENGTH} 字元的字串`);
    }
    if (!isInt(command.expectedRevision) || command.expectedRevision < 0) {
      return reject('bad_command', 'expectedRevision 必須是非負整數');
    }
    if (typeof command.type !== 'string' || command.type.length === 0) return reject('bad_command', 'type 必須是非空字串');
    if (!isRecord(command.payload)) return reject('bad_command', 'payload 必須是物件');
    try {
      State.canonicalize(command);
    } catch (e) {
      return reject('bad_command', `命令必須是純 JSON 資料：${e.message}`);
    }
    return null;
  }

  function checkAction(action) {
    if (typeof action !== 'string' || !has(Rules.ACTIONS, action)) return reject('unknown_action', `未知行動：${String(action)}`);
    if (has(DEFERRED_ACTIONS, action)) return reject('not_supported_yet', `行動「${action}」屬 ${DEFERRED_ACTIONS[action]}，本版尚未支援`);
    return null;
  }

  function findMember(world, discipleId) {
    const m = world.disciples.find((d) => d.id === discipleId);
    if (m) return { member: m };
    if (State.CANDIDATE_IDS.includes(discipleId)) return { error: reject('candidate_not_member', `候選 ${discipleId} 尚未入隊，不能排課`) };
    return { error: reject('unknown_disciple', `未知角色：${String(discipleId)}`) };
  }

  function sortOverrides(list) {
    list.sort((a, b) => (a.slotIndex - b.slotIndex) || byIdAsc(a.discipleId, b.discipleId));
  }

  // ---------- 各命令（回傳 { error } 或 { next, drafts }；next 是已修改的工作複本） ----------
  function doAssignSlot(world, next, payload) {
    if (!sameKeys(payload, ['discipleId', 'slotIndex', 'action'])) return { error: reject('bad_payload', 'assignSlot 需要恰好 discipleId、slotIndex、action') };
    if (typeof payload.discipleId !== 'string' || !isInt(payload.slotIndex) || !(payload.action === null || typeof payload.action === 'string')) {
      return { error: reject('bad_payload', 'discipleId 必須是字串、slotIndex 必須是整數、action 必須是字串或 null') };
    }
    if (world.phase !== 'planning') return { error: reject('not_planning', `目前階段是 ${world.phase}，只有 planning 可以排課`) };
    const found = findMember(world, payload.discipleId);
    if (found.error) return { error: found.error };
    const total = State.SCENARIOS[world.scenarioId].totalSlots;
    if (payload.slotIndex >= total) return { error: reject('slot_out_of_range', `slotIndex 必須小於 ${total}`) };
    if (payload.slotIndex < world.slotIndex) return { error: reject('slot_already_resolved', `第 ${payload.slotIndex} 格已結算，不能再排課`) };
    if (payload.action !== null) {
      const bad = checkAction(payload.action);
      if (bad) return { error: bad };
      if (payload.action === 'gather-herb') {
        const g = Rules.gatherYield({
          slotIndex: payload.slotIndex, resource: 'spiritHerb', craft: found.member.attributes.craft, stamina: Rules.VALUE_LIMITS.staminaMax,
        });
        if (g.locked) return { error: reject('action_locked', `第 ${payload.slotIndex} 格尚無靈草可採（靈氣階段鎖定）`) };
      }
    }
    const ov = next.schedule.overrides.filter((o) => !(o.discipleId === payload.discipleId && o.slotIndex === payload.slotIndex));
    if (payload.action !== null) ov.push({ discipleId: payload.discipleId, slotIndex: payload.slotIndex, action: payload.action });
    sortOverrides(ov);
    next.schedule.overrides = ov;
    return {
      drafts: [{ type: 'slotAssigned', discipleId: payload.discipleId, targetSlotIndex: payload.slotIndex, action: payload.action }],
    };
  }

  function doSetDailyTemplate(world, next, payload) {
    if (!sameKeys(payload, ['discipleId', 'parts'])) return { error: reject('bad_payload', 'setDailyTemplate 需要恰好 discipleId、parts') };
    const parts = payload.parts;
    if (typeof payload.discipleId !== 'string'
      || !(parts === null || (Array.isArray(parts) && parts.length === 3 && parts.every((p) => typeof p === 'string')))) {
      return { error: reject('bad_payload', 'discipleId 必須是字串；parts 必須是三個行動 ID 或 null') };
    }
    if (world.phase !== 'planning') return { error: reject('not_planning', `目前階段是 ${world.phase}，只有 planning 可以排課`) };
    const found = findMember(world, payload.discipleId);
    if (found.error) return { error: found.error };
    if (parts !== null) {
      for (const a of parts) {
        const bad = checkAction(a);
        if (bad) return { error: bad };
      }
      next.schedule.templates[payload.discipleId] = [...parts];
    } else {
      delete next.schedule.templates[payload.discipleId];
    }
    return { drafts: [{ type: 'templateSet', discipleId: payload.discipleId, parts: parts === null ? null : [...parts] }] };
  }

  function doChooseEvent(world, next, payload) {
    if (!sameKeys(payload, ['eventId', 'optionId']) || typeof payload.eventId !== 'string' || typeof payload.optionId !== 'string') {
      return { error: reject('bad_payload', 'chooseEvent 需要恰好 eventId、optionId（字串）；效果只取自事件資料，不接受傳入') };
    }
    if (world.phase !== 'awaitingChoice') return { error: reject('no_pending_event', `目前階段是 ${world.phase}，沒有待選事件`) };
    if (!world.pendingEvents.some((e) => e.id === payload.eventId)) {
      return { error: reject('not_pending', `事件 ${payload.eventId} 不在目前的待選事件中`) };
    }
    const choice = StoryData.validateChoice(payload.eventId, payload.optionId);
    if (!choice.ok) return { error: reject(choice.code === 'unknown_option' ? 'unknown_option' : 'not_pending', choice.reason) };
    const event = StoryData.getEvent(payload.eventId);
    const option = event.options.find((o) => o.id === payload.optionId);
    for (const eff of option.effects) {
      if (!SUPPORTED_EFFECTS.includes(eff.type)) {
        const owner = StoryData.EFFECT_TYPES[eff.type] ? StoryData.EFFECT_TYPES[eff.type].consumer : '後續任務';
        return { error: reject('not_supported_yet', `選項效果「${eff.type}」屬 ${owner}，本版尚未支援，世界不變`) };
      }
    }
    const drafts = [{ type: 'eventChosen', eventId: payload.eventId, optionId: payload.optionId }];
    for (const eff of option.effects) {
      if (eff.type === 'showAidPrompt') {
        drafts.push({ type: 'aidPromptShown', aidId: eff.aidId });
      } else if (eff.type === 'setInvitationStatus') {
        const inv = next.story.invitations[eff.candidateId];
        if (!inv || inv.status !== 'locked') {
          return { error: reject('invalid_state', `候選 ${eff.candidateId} 的邀請已不是 locked，不能重複提示`) };
        }
        inv.status = eff.status;
        drafts.push({ type: 'invitationStatusSet', candidateId: eff.candidateId, status: eff.status });
      }
    }
    next.pendingEvents = next.pendingEvents.filter((e) => e.id !== payload.eventId);
    if (next.pendingEvents.length === 0) next.phase = 'planning';
    return { drafts };
  }

  const HANDLERS = { assignSlot: doAssignSlot, setDailyTemplate: doSetDailyTemplate, chooseEvent: doChooseEvent };

  // ---------- dispatch ----------
  function dispatch(world, command) {
    const wv = validateEngineWorld(world);
    if (!wv.ok) return reject('invalid_world', `世界不合法：${wv.code}：${wv.reason}`);
    const env = checkEnvelope(command);
    if (env) return env;

    const hash = payloadHash(command.type, command.payload);
    const prior = world.commandLog.find((c) => c.id === command.id);
    if (prior) {
      if (prior.type !== command.type || prior.payloadHash !== hash) {
        return reject('command_id_conflict', `命令 id ${command.id} 已用於不同內容；同 id 不能變成新操作`);
      }
      return { ok: true, duplicate: true, state: cloneJson(world), events: prior.eventSeqs.map((q) => cloneJson(world.eventLog[q - 1])) };
    }
    if (command.expectedRevision < world.revision) {
      return reject('stale_revision', `expectedRevision ${command.expectedRevision} 已過期（目前 ${world.revision}），請刷新後重試`);
    }
    if (command.expectedRevision > world.revision) {
      return reject('revision_ahead', `expectedRevision ${command.expectedRevision} 超前目前的 revision ${world.revision}`);
    }
    if (has(DEFERRED_COMMANDS, command.type)) {
      return reject('not_supported_yet', `命令「${command.type}」屬 ${DEFERRED_COMMANDS[command.type]}，本版尚未支援，世界不變`);
    }
    if (!SUPPORTED_COMMANDS.includes(command.type)) return reject('unknown_command', `未知命令：${command.type}`);

    const next = cloneJson(world);
    const out = HANDLERS[command.type](world, next, command.payload);
    if (out.error) return out.error;
    const events = out.drafts.map((d) => appendEvent(next, Object.assign({ slotIndex: world.slotIndex, commandId: command.id }, d)));
    next.commandLog.push({
      seq: next.commandLog.length + 1,
      id: command.id,
      type: command.type,
      payloadHash: hash,
      revisionBefore: world.revision,
      revisionAfter: world.revision + 1,
      eventSeqs: events.map((e) => e.seq),
    });
    next.revision = world.revision + 1;
    const check = State.validateWorld(next);
    if (!check.ok) return reject('inconsistent_result', `命令會使世界不一致，已拒絕：${check.code}：${check.reason}`);
    return { ok: true, duplicate: false, state: next, events };
  }

  return Object.freeze({
    SUPPORTED_COMMANDS, DEFERRED_COMMANDS, SUPPORTED_ACTIONS, DEFERRED_ACTIONS, SUPPORTED_EFFECTS,
    dispatch, validateEngineWorld, scheduledAction, payloadHash, appendEvent,
  });
});
