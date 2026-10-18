/*
 * SG-03／SG-04：引擎（advance）。單一時段的原子結算、資源／容量仲裁核心、批次推進與待選停止；
 * SG-04 加入建造、煉丹、工作位與持久輪候（jobs／reservations／inventory）。
 *
 * 範圍界線（issue #85、#90、設計 0.2、TECHNICAL_DESIGN §3、§9）：
 * - 本版可結算的行動：gather-material、gather-herb、cultivate、rest、tune-mind，以及由 job 驅動的 build、brew
 *   （公式全部取自 rules.js，沒有隨機，因此不消耗 RNG；rngState 在整個 42 格路徑中保持原值）。
 *   aid／breakthrough／support、援村發獎、招募入隊、危機結算與 ending 屬 SG-04A／05／06；引擎遇到需要它們的故事事件時
 *   回 unsupported_story_effect，不假成功。丹藥只入庫，沒有消耗或 buff。
 * - 工作：有 active reservation 的角色續做該工作（課表被忽略）；queued job 在格初走 arbitrate 開工請求
 *   （參與者＋工作位＋成本整批成敗；成功才扣一次成本並建立 reservation，失敗只累計 waited）。資源取格初快照，
 *   同格採集不能支付本格新工作。完工在最後工期格末；設施與煉丹次格才可用。
 * - advance 是同步原子運算：輸入世界不被修改；任何失敗都回 { ok:false, code, reason }，世界不變。
 * - 每格固定順序：①待選／ending／情境長度檢查 → ②依即將結算的 slotIndex 寫入一次性階段事件 → ③從課表建立意圖
 *   → ④仲裁（等待較久優先、其次穩定 ID；整批一起成功或失敗；失敗轉明示休養）→ ⑤在同一個格初快照計算效果
 *   → ⑥一次提交（資源、角色狀態、slotIndex／revision +1、事件）→ ⑦日末日報與待選事件（援村求援、獸患危機），
 *   有待選事件就轉 awaitingChoice 並停止批次。
 * - 載入策略：Node 以 CommonJS；瀏覽器依序載入 rng.js、rules.js、state.js、story-data.js、commands.js 再載入本檔，
 *   掛在 globalThis.SectChronicle.Engine。
 */
(function (root, factory) {
  'use strict';
  let Rules;
  let State;
  let StoryData;
  let Commands;
  if (typeof module === 'object' && module && module.exports) {
    Rules = require('./rules.js');
    State = require('./state.js');
    StoryData = require('./story-data.js');
    Commands = require('./commands.js');
    module.exports = factory(Rules, State, StoryData, Commands);
  } else {
    Rules = root.SectChronicle && root.SectChronicle.Rules;
    if (!Rules) throw new Error('engine.js 需要先載入 js/rules.js（以及 js/rng.js）');
    State = root.SectChronicle.State;
    if (!State) throw new Error('engine.js 需要先載入 js/state.js');
    StoryData = root.SectChronicle.StoryData;
    if (!StoryData) throw new Error('engine.js 需要先載入 js/story-data.js');
    Commands = root.SectChronicle.Commands;
    if (!Commands) throw new Error('engine.js 需要先載入 js/commands.js（在 js/story-data.js 之後、本檔之前）');
    root.SectChronicle.Engine = factory(Rules, State, StoryData, Commands);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rules, State, StoryData, Commands) {
  'use strict';

  const MAX_BATCH = 42;
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const isInt = (v) => typeof v === 'number' && Number.isSafeInteger(v) && !Object.is(v, -0);
  const isNonNeg = (v) => isInt(v) && v >= 0;
  const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const cloneJson = (v) => JSON.parse(JSON.stringify(v));
  const reject = (code, reason) => ({ ok: false, code, reason });
  const byIdAsc = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  // ---------- 仲裁核心（純函式） ----------
  function checkCounts(name, o) {
    if (!isRecord(o)) throw new RangeError(`${name} 必須是物件`);
    for (const k of Object.keys(o)) {
      if (!isNonNeg(o[k])) throw new RangeError(`${name}.${k} 必須是非負整數`);
    }
  }

  // requests：[{ id, discipleId, waited, cost, seats, participants }]；resources／seats 是可用量。
  // 規則：等待較久優先、其次穩定 id；每個請求「參與者＋工作位＋成本」整批一起成功或一起失敗，失敗不扣任何東西；
  // 被拒者不阻擋之後放得下的請求。輸入陣列順序不影響結果；不修改輸入。
  function arbitrate(input) {
    if (!isRecord(input) || !Array.isArray(input.requests)) throw new RangeError('arbitrate 需要 { requests, resources, seats }');
    checkCounts('resources', input.resources);
    checkCounts('seats', input.seats);
    const seen = new Set();
    for (const r of input.requests) {
      if (!isRecord(r) || typeof r.id !== 'string' || r.id.length === 0) throw new RangeError('請求必須有非空字串 id');
      if (seen.has(r.id)) throw new RangeError(`請求 id 重複：${r.id}`);
      seen.add(r.id);
      if (typeof r.discipleId !== 'string' || !isNonNeg(r.waited)) throw new RangeError(`請求 ${r.id} 的 discipleId／waited 不合法`);
      checkCounts(`請求 ${r.id}.cost`, r.cost);
      checkCounts(`請求 ${r.id}.seats`, r.seats);
      if (!Array.isArray(r.participants) || r.participants.length === 0 || !r.participants.every((p) => typeof p === 'string')) {
        throw new RangeError(`請求 ${r.id}.participants 必須是非空字串陣列`);
      }
    }
    const resources = { ...input.resources };
    const seats = { ...input.seats };
    const busy = new Set();
    const granted = [];
    const denied = [];
    const order = [...input.requests].sort((a, b) => (b.waited - a.waited) || byIdAsc(a.id, b.id));
    for (const r of order) {
      let fail = null;
      const clash = r.participants.find((p) => busy.has(p));
      if (clash !== undefined) fail = { code: 'participant_busy', reason: `${clash} 這一格已被另一個工作占用` };
      if (!fail) {
        for (const k of Object.keys(r.seats).sort()) {
          if (r.seats[k] > (has(seats, k) ? seats[k] : 0)) { fail = { code: 'no_seat', reason: `工作位 ${k} 不足` }; break; }
        }
      }
      if (!fail) {
        for (const k of Object.keys(r.cost).sort()) {
          if (r.cost[k] > (has(resources, k) ? resources[k] : 0)) { fail = { code: 'insufficient_resource', reason: `資源 ${k} 不足` }; break; }
        }
      }
      if (fail) {
        denied.push({ id: r.id, code: fail.code, reason: fail.reason });
        continue;
      }
      for (const k of Object.keys(r.seats)) seats[k] -= r.seats[k];
      for (const k of Object.keys(r.cost)) resources[k] -= r.cost[k];
      for (const p of r.participants) busy.add(p);
      granted.push(r.id);
    }
    return { granted, denied, remaining: { resources, seats } };
  }

  // 把仲裁結果套回意圖：被拒者轉為明示的休養備案（fallback 記錄原行動與原因）。輸出順序與輸入順序相同。
  function settleIntents(intents, supply) {
    const result = arbitrate({
      requests: intents.map((i) => ({
        id: i.id, discipleId: i.discipleId, waited: i.waited, cost: i.cost, seats: i.seats, participants: i.participants,
      })),
      resources: supply.resources,
      seats: supply.seats,
    });
    const deniedBy = new Map(result.denied.map((d) => [d.id, d]));
    const settled = intents.map((i) => {
      const d = deniedBy.get(i.id);
      if (!d) return cloneJson(i);
      return Object.assign(cloneJson(i), {
        action: 'rest', cost: {}, seats: {}, participants: [i.discipleId], fallback: { from: i.action, reason: d.code },
      });
    });
    return { settled, remaining: result.remaining };
  }

  // ---------- 故事 facts ----------
  const OUTCOME_BY_STATUS = { dojo: null, sectFounded: 'victory', foundingDeferred: 'defeat' };
  function factsFor(world) {
    const rescued = world.story.rescues.length > 0;
    return {
      slotIndex: world.slotIndex,
      rescueCompleted: rescued,
      aidCompleted: rescued,
      triggeredEventIds: [...world.story.triggeredEventIds],
      crisisOutcome: OUTCOME_BY_STATUS[world.story.organisationStatus],
      invitations: Object.fromEntries(State.CANDIDATE_IDS.map((id) => [id, { status: world.story.invitations[id].status }])),
    };
  }

  const KIND_OWNER = { aidCompletion: 'SG-04A', invitation: 'SG-04A', ending: 'SG-06', crisis: 'SG-06' };
  function unsupportedStory(ev) {
    return reject('unsupported_story_effect', `故事事件 ${ev.id}（${ev.kind}）需要 ${KIND_OWNER[ev.kind] || '後續任務'} 的 runtime，本版不假成功，世界不變`);
  }

  // ---------- 意圖 ----------
  // 在第 slotIndex 格，每名 active 角色一個意圖；順序固定（師父、主角、學徒依 ID）。
  function planIntents(world, slotIndex) {
    return State.rosterAt(world, slotIndex).map((d) => {
      const sched = Commands.scheduledAction(world, d.id, slotIndex);
      const intent = {
        id: `slot${slotIndex}:${d.id}`, discipleId: d.id, action: sched.action, source: sched.source,
        waited: 0, cost: {}, seats: {}, participants: [d.id],
      };
      if (sched.action === 'gather-herb') {
        const g = Rules.gatherYield({ slotIndex, resource: 'spiritHerb', craft: d.attributes.craft, stamina: Rules.VALUE_LIMITS.staminaMax });
        if (g.locked) Object.assign(intent, { action: 'rest', fallback: { from: 'gather-herb', reason: 'locked' } });
      }
      return intent;
    });
  }

  // ---------- 工作位與設施（以格初快照判斷；「完工次格才可用」＝格初快照中 status 已是 done） ----------
  function readyFacility(snapshot, facilityType) {
    return snapshot.jobs.find((j) => j.kind === 'build' && j.status === 'done' && j.target.facilityType === facilityType) || null;
  }
  const terrainSeatKey = (terrain) => `terrain:${terrain}`;
  function terrainCapacity(snapshot, terrain) {
    return snapshot.tiles.filter((t) => t.terrain === terrain).length * Rules.TERRAIN[terrain].workSlots;
  }
  function placementBp(snapshot, facilityJob) {
    return Rules.evaluateFacilityPlacement(snapshot.tiles, facilityJob.target.tileId, facilityJob.target.facilityType).multiplierBp;
  }

  // 不需要 job 的基礎行動可能要一個「位」：聚靈台修行位、居所休養位、資源點工作位。固定輪候配位（等待較久、其次穩定 ID），
  // 配不到位：修行／休養回明示的野外版本（seatFallback），採集沿用休養備案。回傳原意圖的複本，附上 seat／multiplierBp。
  function assignSeats(snapshot, intents) {
    const caps = {};
    const wants = new Map();
    const terrace = readyFacility(snapshot, 'spiritTerrace');
    const residence = readyFacility(snapshot, 'residence');
    for (const i of intents) {
      let key = null;
      if (i.action === 'cultivate' && terrace) {
        key = State.facilitySeat(terrace.id);
        caps[key] = Rules.FACILITIES.spiritTerrace.workSlots;
      } else if (i.action === 'rest' && residence) {
        key = State.facilitySeat(residence.id);
        caps[key] = Rules.FACILITIES.residence.restSlots;
      } else if (i.action === 'gather-material' || i.action === 'gather-herb') {
        const terrain = i.action === 'gather-material' ? 'material' : 'herb';
        key = terrainSeatKey(terrain);
        caps[key] = terrainCapacity(snapshot, terrain);
      }
      if (key) wants.set(i.id, key);
    }
    const arb = arbitrate({
      requests: intents.filter((i) => wants.has(i.id)).map((i) => ({
        id: i.id, discipleId: i.discipleId, waited: i.waited, cost: {}, seats: { [wants.get(i.id)]: 1 }, participants: [i.discipleId],
      })),
      resources: {},
      seats: caps,
    });
    const deniedIds = new Set(arb.denied.map((d) => d.id));
    return intents.map((i) => {
      const out = cloneJson(i);
      const key = wants.get(i.id);
      if (!key) return out;
      if (deniedIds.has(i.id)) {
        if (i.action === 'gather-material' || i.action === 'gather-herb') {
          Object.assign(out, { action: 'rest', fallback: { from: i.action, reason: 'no_seat' } });
        } else {
          out.seatFallback = { seat: key, reason: 'no_seat' };
        }
        return out;
      }
      out.seat = key;
      if (i.action === 'cultivate') out.multiplierBp = placementBp(snapshot, terrace);
      if (i.action === 'rest') out.multiplierBp = placementBp(snapshot, residence);
      return out;
    });
  }

  // ---------- 效果（全部以格初快照計算） ----------
  function computeEffect(snapshot, slotIndex, intent) {
    const d = snapshot.disciples.find((x) => x.id === intent.discipleId);
    const delta = { stamina: 0, mind: 0, injury: 0, cultivation: 0, spiritMaterial: 0, spiritHerb: 0 };
    const a = d.attributes;
    let after = { stamina: d.stamina, mind: d.mind, injury: d.injury };
    switch (intent.action) {
      case 'gather-material':
      case 'gather-herb': {
        const resource = intent.action === 'gather-material' ? 'spiritMaterial' : 'spiritHerb';
        delta[resource] = Rules.gatherYield({ slotIndex, resource, craft: a.craft, stamina: d.stamina }).amount;
        after = Object.assign(after, Rules.applyActionCost(intent.action, d));
        break;
      }
      case 'cultivate': {
        const input = { slotIndex, comprehension: a.comprehension, stamina: d.stamina, mind: d.mind, injury: d.injury };
        if (intent.seat) input.tileMultiplierBp = intent.multiplierBp;
        delta.cultivation = Rules.cultivationGain(input).gain;
        after = Object.assign(after, Rules.applyActionCost('cultivate', d));
        break;
      }
      case 'tune-mind':
        after = Object.assign(after, Rules.applyActionCost('tune-mind', d));
        break;
      case 'rest': {
        const input = { stamina: d.stamina, mind: d.mind, injury: d.injury, rootBone: a.rootBone };
        if (intent.seat) Object.assign(input, { atResidence: true, residenceMultiplierBp: intent.multiplierBp });
        after = Rules.applyRest(input);
        break;
      }
      case 'build':
      case 'brew':
        after = Object.assign(after, Rules.applyActionCost(intent.action, d));
        break;
      default:
        throw new RangeError(`引擎不支援的行動：${intent.action}`);
    }
    delta.stamina = after.stamina - d.stamina;
    delta.mind = after.mind - d.mind;
    delta.injury = after.injury - d.injury;
    return delta;
  }

  // ---------- 工作開工請求（格初仲裁） ----------
  // 回傳 { granted: [job], denied: [{jobId, code, reason}] }。有進行中預約的角色不參與仲裁；
  // 煉丹請求需要「已完工」的丹房與其工作位。資源取格初快照，所以同格採集的產出不能支付本格新工作。
  function arbitrateJobs(snapshot) {
    const busy = new Set(snapshot.reservations.map((r) => r.discipleId));
    const denied = [];
    const requests = [];
    const byId = new Map(snapshot.jobs.map((j) => [j.id, j]));
    for (const job of snapshot.jobs) {
      if (job.status !== 'queued') continue;
      if (busy.has(job.discipleId)) {
        denied.push({ jobId: job.id, code: 'participant_busy', reason: `${job.discipleId} 這一格已被進行中的工作占用` });
        continue;
      }
      let seats = {};
      if (job.kind === 'craft') {
        const fac = byId.get(job.target.facilityJobId);
        if (fac.status === 'cancelled') {
          denied.push({ jobId: job.id, code: 'facility_missing', reason: `丹房工程 ${fac.id} 已取消，無處煉丹` });
          continue;
        }
        if (fac.status !== 'done') {
          denied.push({ jobId: job.id, code: 'facility_not_ready', reason: `丹房工程 ${fac.id} 尚未完工（完工次格才可用）` });
          continue;
        }
        seats = { [State.facilitySeat(fac.id)]: 1 };
      }
      requests.push({
        id: job.id, discipleId: job.discipleId, waited: job.waited, cost: { ...State.jobCost(job) }, seats, participants: [job.discipleId],
      });
    }
    const seatCaps = {};
    for (const j of snapshot.jobs) {
      if (j.kind === 'build' && j.status === 'done' && j.target.facilityType === 'alchemyRoom') {
        const used = snapshot.reservations.filter((r) => r.seat === State.facilitySeat(j.id)).length;
        seatCaps[State.facilitySeat(j.id)] = Math.max(0, Rules.FACILITIES.alchemyRoom.workSlots - used);
      }
    }
    const arb = arbitrate({ requests, resources: snapshot.resources, seats: seatCaps });
    for (const d of arb.denied) denied.push({ jobId: d.id, code: d.code, reason: d.reason });
    denied.sort((x, y) => byIdAsc(x.jobId, y.jobId));
    return { granted: arb.granted.map((id) => byId.get(id)).sort((x, y) => byIdAsc(x.id, y.id)), denied };
  }

  // ---------- 單格結算 ----------
  function resolveSlot(world) {
    const next = cloneJson(world);
    const s = world.slotIndex;
    const total = State.SCENARIOS[world.scenarioId].totalSlots;
    const day = Math.floor(s / 3) + 1;
    const events = [];

    // ② 一次性階段事件（依即將結算的 slotIndex 推導；待選事件留到日末）
    for (const id of StoryData.dueEvents(factsFor(next))) {
      const ev = StoryData.getEvent(id);
      if (ev.kind === 'phase') {
        next.story.triggeredEventIds.push(id);
        events.push(Commands.appendEvent(next, { type: 'story', slotIndex: s, eventId: id }));
      } else if (!ev.pending) {
        return { error: unsupportedStory(ev) };
      }
    }

    // ③④ 工作請求先仲裁（有進行中預約的角色強制繼續做該工作，課表在這格被忽略）
    const snapshot = cloneJson(world);
    const jobPlan = arbitrateJobs(snapshot);
    const jobOf = new Map(); // discipleId → { job, phase }
    for (const r of snapshot.reservations) {
      const job = snapshot.jobs.find((j) => j.id === r.jobId);
      jobOf.set(r.discipleId, { job, phase: 'working' });
    }
    for (const job of jobPlan.granted) jobOf.set(job.discipleId, { job, phase: 'started' });

    // 其餘角色依課表行動；設施位與資源點位固定輪候配位
    const freeIntents = planIntents(next, s).filter((i) => !jobOf.has(i.discipleId));
    const seated = assignSeats(snapshot, freeIntents);
    const intentOf = new Map(seated.map((i) => [i.discipleId, i]));

    // ⑤ 在格初快照上計算所有效果
    const results = State.rosterAt(snapshot, s).map((d) => {
      const j = jobOf.get(d.id);
      let intent;
      const extra = {};
      if (j) {
        const action = j.job.kind === 'build' ? 'build' : 'brew';
        intent = { discipleId: d.id, action, source: 'job' };
        const done = j.job.slotsDone + 1 >= State.jobDuration(j.job);
        extra.job = { id: j.job.id, kind: j.job.kind, phase: done ? 'completed' : j.phase };
      } else {
        intent = intentOf.get(d.id);
      }
      const delta = computeEffect(snapshot, s, intent);
      const r = { discipleId: intent.discipleId, action: intent.action, source: intent.source, delta };
      if (intent.fallback) r.fallback = intent.fallback;
      if (intent.seat) r.seat = intent.seat;
      if (intent.multiplierBp !== undefined) r.multiplierBp = intent.multiplierBp;
      if (intent.seatFallback) r.seatFallback = intent.seatFallback;
      return Object.assign(r, extra);
    });

    // ⑥ 一次提交
    for (const r of results) {
      const d = next.disciples.find((x) => x.id === r.discipleId);
      d.stamina += r.delta.stamina;
      d.mind += r.delta.mind;
      d.injury += r.delta.injury;
      d.cultivation += r.delta.cultivation;
      next.resources.spiritMaterial += r.delta.spiritMaterial;
      next.resources.spiritHerb += r.delta.spiritHerb;
    }
    const jobEvents = [];
    for (const d of jobPlan.denied) next.jobs.find((j) => j.id === d.jobId).waited += 1;
    for (const [discipleId, { job: snapJob, phase }] of jobOf) {
      const job = next.jobs.find((x) => x.id === snapJob.id);
      const duration = State.jobDuration(job);
      if (phase === 'started') {
        const cost = State.jobCost(job);
        for (const k of Object.keys(cost)) next.resources[k] -= cost[k];
        job.status = 'active';
        job.startSlotIndex = s;
        job.slotsDone = 1;
        const worker = snapshot.disciples.find((x) => x.id === discipleId);
        let seat = null;
        let output = null;
        if (job.kind === 'craft') {
          const fac = snapshot.jobs.find((x) => x.id === job.target.facilityJobId);
          const mult = placementBp(snapshot, fac);
          seat = State.facilitySeat(fac.id);
          output = {
            itemId: job.target.recipeId,
            amount: Rules.brewOutput({ recipeId: job.target.recipeId, craft: worker.attributes.craft, stamina: worker.stamina, tileMultiplierBp: mult }).amount,
            staminaAtStart: worker.stamina, craft: worker.attributes.craft, multiplierBp: mult,
          };
        }
        next.reservations.push({ jobId: job.id, discipleId, seat, startSlotIndex: s, slotsTotal: duration, paid: { ...cost }, output });
        jobEvents.push({ type: 'jobStarted', slotIndex: s, jobId: job.id, kind: job.kind, discipleId, paid: { ...cost }, ...(output ? { output: cloneJson(output) } : {}) });
      } else {
        job.slotsDone += 1;
      }
      if (job.slotsDone === duration) {
        job.status = 'done';
        job.completedSlotIndex = s;
        const idx = next.reservations.findIndex((r) => r.jobId === job.id);
        const res = next.reservations[idx];
        next.reservations.splice(idx, 1);
        const ev = { type: 'jobCompleted', slotIndex: s, jobId: job.id, kind: job.kind, discipleId, readySlotIndex: s + 1 };
        if (job.kind === 'craft') {
          next.inventory[res.output.itemId] += res.output.amount;
          ev.output = {
            itemId: res.output.itemId, amount: res.output.amount,
            basis: { staminaAtStart: res.output.staminaAtStart, craft: res.output.craft, multiplierBp: res.output.multiplierBp },
          };
        }
        jobEvents.push(ev);
      }
    }
    next.reservations.sort((x, y) => byIdAsc(x.jobId, y.jobId));
    next.slotIndex = s + 1;
    next.revision = world.revision + 1;
    events.push(Commands.appendEvent(next, { type: 'slotResolved', slotIndex: s, day, part: s % 3, results, denied: jobPlan.denied }));
    for (const e of jobEvents) events.push(Commands.appendEvent(next, e));

    // ⑦ 日末日報與待選事件（以本格已提交的結果判斷）
    if ((s + 1) % 3 === 0 || s + 1 === total) {
      events.push(Commands.appendEvent(next, { type: 'dayReport', slotIndex: s, day, resources: cloneJson(next.resources), inventory: cloneJson(next.inventory) }));
      for (const id of StoryData.dueEvents(factsFor(next))) {
        const ev = StoryData.getEvent(id);
        if (ev.pending) {
          next.pendingEvents.push({ id, raisedSlotIndex: s + 1 });
          next.story.triggeredEventIds.push(id);
          events.push(Commands.appendEvent(next, { type: 'eventRaised', slotIndex: s + 1, eventId: id }));
        } else if (ev.kind !== 'phase') {
          return { error: unsupportedStory(ev) };
        }
      }
      if (next.pendingEvents.length > 0) next.phase = 'awaitingChoice';
    }

    const check = State.validateWorld(next);
    if (!check.ok) return { error: reject('inconsistent_result', `結算結果不一致，已拒絕：${check.code}：${check.reason}`) };
    return { state: next, events };
  }

  // ---------- advance ----------
  function advance(world, slots = 1) {
    if (!isInt(slots) || slots < 1 || slots > MAX_BATCH) return reject('bad_slots', `slots 必須是 1 到 ${MAX_BATCH} 的整數`);
    const wv = Commands.validateEngineWorld(world);
    if (!wv.ok) return reject('invalid_world', `世界不合法：${wv.code}：${wv.reason}`);
    if (world.phase === 'awaitingChoice') return reject('awaiting_choice', '有待選事件，必須先選擇才能推進');
    if (world.phase === 'ending') return reject('ended', '情境已結束，不能再推進');
    let w = world;
    const events = [];
    let advanced = 0;
    let stopReason = 'completed';
    let error = null;
    for (let i = 0; i < slots; i += 1) {
      const r = resolveSlot(w);
      if (r.error) {
        if (advanced === 0) return r.error;
        stopReason = 'error';
        error = { code: r.error.code, reason: r.error.reason };
        break;
      }
      w = r.state;
      events.push(...r.events);
      advanced += 1;
      if (w.phase !== 'planning') {
        stopReason = 'pendingEvent';
        break;
      }
    }
    const out = { ok: true, state: w, events, advanced, stopReason };
    if (error) out.error = error;
    return out;
  }

  return Object.freeze({
    advance, arbitrate, settleIntents, planIntents, factsFor,
  });
});
