/*
 * SG-03：指令層（dispatch）。驗證並套用玩家命令；不推進時間、不產生成果、不消耗 RNG。
 *
 * 範圍界線（issue #85、#90、設計 0.2）：
 * - 本版支援 assignSlot、setDailyTemplate（採集可指定 tileId／tileIds 資源點）、chooseEvent（SG-03），以及 queueBuild、queueCraft、cancelQueuedJob（SG-04）。
 *   queueBuild／queueCraft 只「排隊」：不推時間、不扣材料、不發成果；真正的開工（原子預約、扣一次成本）發生在
 *   engine.js 的格初。build／brew 不可排入課表（use_job_command），只由 job 驅動。
 *   其餘命令（queueBreakthrough／setDefense／acceptCandidate）與行動（aid／breakthrough／support）一律回
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
  let Story;
  if (typeof module === 'object' && module && module.exports) {
    Rules = require('./rules.js');
    State = require('./state.js');
    StoryData = require('./story-data.js');
    Story = require('./story.js');
    module.exports = factory(Rules, State, StoryData, Story);
  } else {
    Rules = root.SectChronicle && root.SectChronicle.Rules;
    if (!Rules) throw new Error('commands.js 需要先載入 js/rules.js（以及 js/rng.js）');
    State = root.SectChronicle.State;
    if (!State) throw new Error('commands.js 需要先載入 js/state.js（在 js/rules.js 之後）');
    StoryData = root.SectChronicle.StoryData;
    if (!StoryData) throw new Error('commands.js 需要先載入 js/story-data.js（在 js/state.js 之後、本檔之前）');
    Story = root.SectChronicle.Story;
    if (!Story) throw new Error('commands.js 需要先載入 js/story.js（在 js/story-data.js 之後、本檔之前）');
    root.SectChronicle.Commands = factory(Rules, State, StoryData, Story);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rules, State, StoryData, Story) {
  'use strict';

  const SUPPORTED_COMMANDS = Object.freeze([
    'assignSlot', 'setDailyTemplate', 'chooseEvent', 'queueBuild', 'queueCraft', 'cancelQueuedJob', 'queueAid', 'acceptCandidate',
  ]);
  const DEFERRED_COMMANDS = Object.freeze({
    queueBreakthrough: 'SG-05', setDefense: 'SG-06',
  });
  const SUPPORTED_ACTIONS = Object.freeze(['gather-material', 'gather-herb', 'cultivate', 'rest', 'tune-mind']);
  // build／brew 需要地塊、工程或配方等明確目標，因此只能由 queueBuild／queueCraft 建立的 job 驅動，不能排入課表。
  const JOB_ACTIONS = Object.freeze({ build: 'queueBuild', brew: 'queueCraft', aid: 'queueAid' });
  const DEFERRED_ACTIONS = Object.freeze({
    breakthrough: 'SG-05', support: 'SG-05',
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
    const story = Story.validateWorld(world);
    if (!story.ok) return story;
    return { ok: true };
  }

  // 某角色在某格的行動：覆寫 > 範本 > 預設休養（明示的備案，不是假成功）。
  function scheduledAction(world, discipleId, slotIndex) {
    const o = world.schedule.overrides.find((x) => x.discipleId === discipleId && x.slotIndex === slotIndex);
    // 採集若指定了資源點，結果多一個 tileId；沒指定時不出現（由引擎取穩定預設點）。
    if (o) return has(o, 'tileId') ? { action: o.action, source: 'override', tileId: o.tileId } : { action: o.action, source: 'override' };
    const t = world.schedule.templates[discipleId];
    if (t) {
      const tt = world.schedule.templateTiles[discipleId];
      const tile = tt ? tt[slotIndex % 3] : null;
      return tile ? { action: t[slotIndex % 3], source: 'template', tileId: tile } : { action: t[slotIndex % 3], source: 'template' };
    }
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
    if (has(JOB_ACTIONS, action)) return reject('use_job_command', `行動「${action}」需要明確目標，請改用 ${JOB_ACTIONS[action]} 命令排隊，不能排入課表`);
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
    const withTile = has(payload, 'tileId');
    if (!sameKeys(payload, withTile ? ['discipleId', 'slotIndex', 'action', 'tileId'] : ['discipleId', 'slotIndex', 'action'])) {
      return { error: reject('bad_payload', 'assignSlot 需要恰好 discipleId、slotIndex、action（採集可加 tileId）') };
    }
    if (withTile && (typeof payload.tileId !== 'string' || typeof payload.action !== 'string' || !has(State.GATHER_TERRAIN, payload.action))) {
      return { error: reject('bad_payload', 'tileId 必須是字串，且只能搭配 gather-material／gather-herb') };
    }
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
      if (withTile) {
        const bad2 = tileError(world, payload.action, payload.tileId);
        if (bad2) return { error: bad2 };
      }
    }
    const ov = next.schedule.overrides.filter((o) => !(o.discipleId === payload.discipleId && o.slotIndex === payload.slotIndex));
    if (payload.action !== null) {
      const o = { discipleId: payload.discipleId, slotIndex: payload.slotIndex, action: payload.action };
      if (withTile) o.tileId = payload.tileId;
      ov.push(o);
    }
    sortOverrides(ov);
    next.schedule.overrides = ov;
    return {
      drafts: [{ type: 'slotAssigned', discipleId: payload.discipleId, targetSlotIndex: payload.slotIndex, action: payload.action, ...(withTile ? { tileId: payload.tileId } : {}) }],
    };
  }

  // 採集的資源點目標：地塊必須存在，且資源種類與行動相符（每個點各自有容量，見 engine.js）。
  function tileError(world, action, tileId) {
    const tile = world.tiles.find((t) => t.id === tileId);
    if (!tile) return reject('unknown_tile', `未知地塊：${tileId}`);
    if (tile.terrain !== State.GATHER_TERRAIN[action]) {
      return reject('wrong_terrain', `地塊 ${tileId} 是 ${tile.terrain}，行動 ${action} 需要 ${State.GATHER_TERRAIN[action]}`);
    }
    return null;
  }

  function doSetDailyTemplate(world, next, payload) {
    const withTiles = has(payload, 'tileIds');
    if (!sameKeys(payload, withTiles ? ['discipleId', 'parts', 'tileIds'] : ['discipleId', 'parts'])) {
      return { error: reject('bad_payload', 'setDailyTemplate 需要恰好 discipleId、parts（採集可加 tileIds）') };
    }
    const parts = payload.parts;
    if (typeof payload.discipleId !== 'string'
      || !(parts === null || (Array.isArray(parts) && parts.length === 3 && parts.every((p) => typeof p === 'string')))) {
      return { error: reject('bad_payload', 'discipleId 必須是字串；parts 必須是三個行動 ID 或 null') };
    }
    const tileIds = withTiles ? payload.tileIds : null;
    if (withTiles) {
      const shapeOk = parts !== null && Array.isArray(tileIds) && tileIds.length === 3
        && tileIds.every((t, k) => t === null || (typeof t === 'string' && has(State.GATHER_TERRAIN, parts[k])));
      if (!shapeOk) return { error: reject('bad_payload', 'tileIds 必須搭配 parts，是三個字串或 null，且只有採集格可以指定地塊') };
    }
    if (world.phase !== 'planning') return { error: reject('not_planning', `目前階段是 ${world.phase}，只有 planning 可以排課`) };
    const found = findMember(world, payload.discipleId);
    if (found.error) return { error: found.error };
    if (parts !== null) {
      for (const a of parts) {
        const bad = checkAction(a);
        if (bad) return { error: bad };
      }
      if (withTiles) {
        for (let k = 0; k < 3; k++) {
          if (tileIds[k] === null) continue;
          const bad2 = tileError(world, parts[k], tileIds[k]);
          if (bad2) return { error: bad2 };
        }
      }
      next.schedule.templates[payload.discipleId] = [...parts];
      if (withTiles && tileIds.some((t) => t !== null)) next.schedule.templateTiles[payload.discipleId] = [...tileIds];
      else delete next.schedule.templateTiles[payload.discipleId];
    } else {
      delete next.schedule.templates[payload.discipleId];
      delete next.schedule.templateTiles[payload.discipleId];
    }
    return { drafts: [{ type: 'templateSet', discipleId: payload.discipleId, parts: parts === null ? null : [...parts], ...(withTiles ? { tileIds: [...tileIds] } : {}) }] };
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

  // ---------- SG-04：建造／煉丹排隊與取消 ----------
  function activeBuilds(world, facilityType) {
    return world.jobs.filter((j) => j.kind === 'build' && j.status !== 'cancelled' && (facilityType === undefined || j.target.facilityType === facilityType));
  }
  function addJob(next, kind, discipleId, target) {
    const job = {
      id: State.jobIdOf(next.jobs.length), kind, discipleId, status: 'queued', queuedSlotIndex: next.slotIndex, waited: 0,
      startSlotIndex: null, slotsDone: 0, completedSlotIndex: null, cancelledSlotIndex: null, target,
    };
    next.jobs.push(job);
    return job;
  }

  function doQueueBuild(world, next, payload) {
    if (!sameKeys(payload, ['discipleId', 'facilityType', 'tileId'])
      || typeof payload.discipleId !== 'string' || typeof payload.facilityType !== 'string' || typeof payload.tileId !== 'string') {
      return { error: reject('bad_payload', 'queueBuild 需要恰好 discipleId、facilityType、tileId（字串）') };
    }
    if (world.phase !== 'planning') return { error: reject('not_planning', `目前階段是 ${world.phase}，只有 planning 可以排工程`) };
    const found = findMember(world, payload.discipleId);
    if (found.error) return { error: found.error };
    const placement = Rules.evaluateFacilityPlacement(world.tiles, payload.tileId, payload.facilityType);
    if (!placement.ok) return { error: reject(placement.code, placement.reason) };
    const fac = Rules.FACILITIES[payload.facilityType];
    if (activeBuilds(world, payload.facilityType).length >= fac.maxCount) {
      return { error: reject('facility_limit', `${fac.label} 最多 ${fac.maxCount} 座（含排隊、施工中與已完工）`) };
    }
    if (activeBuilds(world).some((j) => j.target.tileId === payload.tileId)) {
      return { error: reject('tile_occupied', `地塊 ${payload.tileId} 已有排隊、施工中或已完工的工程`) };
    }
    const job = addJob(next, 'build', payload.discipleId, { facilityType: payload.facilityType, tileId: payload.tileId });
    return { drafts: [{ type: 'jobQueued', jobId: job.id, kind: 'build', discipleId: job.discipleId, target: cloneJson(job.target) }] };
  }

  function doQueueCraft(world, next, payload) {
    if (!sameKeys(payload, ['discipleId', 'recipeId', 'facilityJobId'])
      || typeof payload.discipleId !== 'string' || typeof payload.recipeId !== 'string' || typeof payload.facilityJobId !== 'string') {
      return { error: reject('bad_payload', 'queueCraft 需要恰好 discipleId、recipeId、facilityJobId（字串）') };
    }
    if (world.phase !== 'planning') return { error: reject('not_planning', `目前階段是 ${world.phase}，只有 planning 可以排煉丹`) };
    const found = findMember(world, payload.discipleId);
    if (found.error) return { error: found.error };
    if (!has(Rules.RECIPES, payload.recipeId)) return { error: reject('unknown_recipe', `未知配方：${payload.recipeId}`) };
    const fac = world.jobs.find((j) => j.id === payload.facilityJobId);
    if (!fac) return { error: reject('unknown_job', `未知工作：${payload.facilityJobId}`) };
    if (fac.kind !== 'build' || fac.target.facilityType !== 'alchemyRoom') {
      return { error: reject('wrong_facility', `${payload.facilityJobId} 不是丹房工程，不能在其上煉丹`) };
    }
    if (fac.status === 'cancelled') return { error: reject('facility_cancelled', `丹房工程 ${fac.id} 已取消`) };
    const job = addJob(next, 'craft', payload.discipleId, { recipeId: payload.recipeId, facilityJobId: payload.facilityJobId });
    return { drafts: [{ type: 'jobQueued', jobId: job.id, kind: 'craft', discipleId: job.discipleId, target: cloneJson(job.target) }] };
  }

  function doCancelQueuedJob(world, next, payload) {
    if (!sameKeys(payload, ['jobId']) || typeof payload.jobId !== 'string') {
      return { error: reject('bad_payload', 'cancelQueuedJob 需要恰好 jobId（字串）') };
    }
    if (world.phase !== 'planning') return { error: reject('not_planning', `目前階段是 ${world.phase}，只有 planning 可以取消排隊`) };
    const job = next.jobs.find((j) => j.id === payload.jobId);
    if (!job) return { error: reject('unknown_job', `未知工作：${payload.jobId}`) };
    if (job.status !== 'queued') {
      return { error: reject('job_not_queued', `工作 ${job.id} 目前是 ${job.status}：只有尚未開始的排隊可取消（開始後不倒帶、不退款、不拆建築）`) };
    }
    job.status = 'cancelled';
    job.cancelledSlotIndex = world.slotIndex;
    return { drafts: [{ type: 'jobCancelled', jobId: job.id }] };
  }

  // ---------- SG-04A：援村排隊與固定招募 ----------
  function doQueueAid(world, next, payload) {
    if (!sameKeys(payload, ['discipleId', 'optionId']) || typeof payload.discipleId !== 'string' || typeof payload.optionId !== 'string') {
      return { error: reject('bad_payload', 'queueAid 需要恰好 discipleId、optionId（字串）') };
    }
    if (world.phase !== 'planning') return { error: reject('not_planning', `目前階段是 ${world.phase}，只有 planning 可以排援村`) };
    const found = findMember(world, payload.discipleId);
    if (found.error) return { error: found.error };
    if (!has(Rules.AID_OPTIONS, payload.optionId)) return { error: reject('unknown_aid_option', `未知援村選項：${payload.optionId}`) };
    if (!Rules.aidAvailable(world.slotIndex)) {
      return { error: reject('aid_locked', `第 ${Rules.AID_AVAILABLE_FROM_SLOT} 格（日 4 初兆）起才有人求援，目前第 ${world.slotIndex} 格`) };
    }
    if (Story.completedAidJob(world)) return { error: reject('aid_completed', '村口的籬笆已經修好，不能再援村（只有一次）') };
    const job = addJob(next, 'aid', payload.discipleId, { aidId: Rules.AID_ID, optionId: payload.optionId });
    return { drafts: [{ type: 'jobQueued', jobId: job.id, kind: 'aid', discipleId: job.discipleId, target: cloneJson(job.target) }] };
  }

  function doAcceptCandidate(world, next, payload) {
    if (!sameKeys(payload, ['candidateId']) || typeof payload.candidateId !== 'string') {
      return { error: reject('bad_payload', 'acceptCandidate 需要恰好 candidateId（字串）') };
    }
    const id = payload.candidateId;
    if (!State.CANDIDATE_IDS.includes(id)) return { error: reject('unknown_candidate', `未知候選：${id}`) };
    if (world.phase !== 'planning') return { error: reject('not_planning', `目前階段是 ${world.phase}，只有 planning 可以接受入隊`) };
    // 第 42 格起 phase 只可能是 awaitingChoice／ending（State 驗證保證），所以「危機後不再接受入隊」由上一行的 not_planning 保證。
    const status = world.story.invitations[id].status;
    if (status === 'accepted') return { error: reject('already_accepted', `${id} 已入隊`) };
    if (status !== 'invited' && status !== 'deferred') return { error: reject('candidate_not_invited', `${id} 尚未被邀請（目前 ${status}）`) };
    // 隊伍上限四人是結構性的：只有兩名固定候選，加上師父與主角，所以不需要（也到不了）額外的名額檢查。
    return { drafts: [Story.addApprentice(next, id)] };
  }

  const HANDLERS = {
    assignSlot: doAssignSlot, setDailyTemplate: doSetDailyTemplate, chooseEvent: doChooseEvent,
    queueBuild: doQueueBuild, queueCraft: doQueueCraft, cancelQueuedJob: doCancelQueuedJob,
    queueAid: doQueueAid, acceptCandidate: doAcceptCandidate,
  };

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
    SUPPORTED_COMMANDS, DEFERRED_COMMANDS, SUPPORTED_ACTIONS, DEFERRED_ACTIONS, JOB_ACTIONS, SUPPORTED_EFFECTS,
    dispatch, validateEngineWorld, scheduledAction, payloadHash, appendEvent,
  });
});
