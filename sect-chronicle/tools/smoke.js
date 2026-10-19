#!/usr/bin/env node
'use strict';
/*
 * SG-04／SG-04A／SG-05：冒煙 CLI。`node sect-chronicle/tools/smoke.js --seed <seed> [--template <id>]
 *   [--aid none|free|supplied] [--aid-from <slot>] [--recruit 0|1|2] [--accept-delay <slots>]
 *   [--breakthrough none|plain|pill|pill-support]`
 *   不帶 --aid／--aid-from／--recruit／--accept-delay 時跑 SG-04 的 first-furnace-v1（零材料首爐丹路線，行為不變）；
 *   帶任一個就跑故事路線 village-recruit-v1（見下）；帶 --breakthrough（非 none）則在故事路線之上加突破策略 breakthrough-v1。
 *
 * 只用公開的 State.newWorld／Commands.dispatch／Engine.advance：不直接補資源、改工期或注入完工設施。
 * 策略 first-furnace-v1（只讀玩家可見的世界狀態，不偷看 RNG；本包沒有任何隨機）：
 *   兩人先採靈材 → 材料夠時由師父在放置倍率最高的可建地塊蓋丹房 → 日 4（第 9 格）靈草解鎖後採靈草 →
 *   丹房完工且材料齊備時排煉丹；其餘時間修行；體力低於 35 先休養。遇求援選 opt-aid-later（只是提示，
 *   不發獎勵；援村／收徒屬 SG-04A）；遇第 42 格獸患待選就停止，沒有第 43 格、不假勝利。
 * 故事路線 village-recruit-v1（在 first-furnace-v1 之上，只用公開 API、不偷看 RNG）：
 *   --aid：第 --aid-from 格（不早於第 9 格；預設 9）起，由非師父的空閒者排 queueAid（free 立即；supplied 要材料夠才排）；
 *   遇求援選 opt-aid-accept（有援村）或 opt-aid-later（none）；遇邀請：--recruit 涵蓋的候選選「我願意見見他」並
 *   acceptCandidate（--accept-delay 0＝選完下一個規劃步就接受；>0＝選「讓我再想想」，過 N 格再接受延後的候選），其餘選「再想想」；
 *   第 42 格危機待選就停止（邀請不會在第 42 格升起）。成功條件：沒有命令被拒、停在第 42 格危機待選、有首爐丹、
 *   有援村（若要求）、實際入隊者恰為「被邀請且要求入隊」者；摘要列出援村完成與獎勵、邀請選擇、入隊格、最終階段、hash 與未驗證項。
 * 突破策略 breakthrough-v1（SG-05，在上面的路線之上；只用公開 API）：主角修為滿 100 且尚未成功提升、沒有排隊中的突破時（第 41 格前）排
 *   queueBreakthrough：plain＝不用丹不要支援；pill＝庫存有丹就用；pill-support＝有丹就用，並請師父支援。失敗（修為 70）後照常修行，滿 100 再排；
 *   成功後不再排。機率與結果由引擎抽樣（策略不偷看 RNG）；摘要列出每次嘗試的機率、roll 與結果。結果只是 seed＋策略的產物，不是平衡結論。
 * 失敗（沒有首爐丹、沒走到危機待選、命令被拒、故事路線未達成）以非零結束；退出碼：0 成功、1 策略失敗、2 用法錯誤。
 */
const Rules = require('../js/rules.js');
const State = require('../js/state.js');
const Commands = require('../js/commands.js');
const Engine = require('../js/engine.js');

const STRATEGY_VERSION = 'first-furnace-v1';
const STORY_STRATEGY_VERSION = 'village-recruit-v1';
const BREAKTHROUGH_STRATEGY_VERSION = 'breakthrough-v1';
const AID_OPTIONS = Object.freeze(['none', 'free', 'supplied']);
const BREAKTHROUGH_MODES = Object.freeze(['none', 'plain', 'pill', 'pill-support']);
const NOT_IMPLEMENTED = Object.freeze([
  '候選初始屬性的產品取值（引用 rules.js 既有模板，待遊戲 PO 核對）；真人試玩與平衡（援村獎勵與入隊時機只是策略結果）',
  '突破成功率、嘗試次數與時機只是策略與 seed 的結果，不是平衡或真人試玩結論；下一境條件未定，沒有第二境（SG-05／D7）',
  '獸患結算、立派／暫緩 ending（SG-06）：停在第 42 格危機待選',
  'storage／UI／forecast（SG-07 之後）',
]);
const REST_BELOW = 35;
const btMode = (route) => (route && route.breakthrough) || 'none'; // 沒給＝不排突破（SG-04A 路線的呼叫端不用改）
const clone = (x) => JSON.parse(JSON.stringify(x));

// 讓 20 個 seed 的主角設定真的不同：模板輪換、配點取第 floor(i/3) 個合法組合、性格輪換。
function optionsForIndex(i, templateIds) {
  const L = Rules.CHARACTER_OPTION_LIMITS;
  const templateId = templateIds[i % templateIds.length];
  const base = L.templates[templateId];
  const valid = [];
  for (let r = 0; r <= L.freePoints; r += 1) {
    for (let c = 0; c <= L.freePoints - r; c += 1) {
      const k = L.freePoints - r - c;
      const a = { rootBone: r, comprehension: c, craft: k };
      if (Object.keys(a).every((key) => base[key] + a[key] >= L.attributeMin && base[key] + a[key] <= L.attributeMax)) valid.push(a);
    }
  }
  return {
    templateId,
    allocation: valid[Math.floor(i / templateIds.length) % valid.length],
    personality: { risk: L.personality.risk[i % 2], bond: L.personality.bond[Math.floor(i / 2) % 2] },
  };
}

// ---------- 策略（輸入是世界，輸出是這一步要送的命令） ----------
const activeJobs = (w, kind) => w.jobs.filter((j) => j.kind === kind && j.status !== 'cancelled');
const isBusy = (w, id) => w.reservations.some((r) => r.discipleId === id);
const freeWorkers = (w) => w.disciples.filter((d) => !isBusy(w, d.id)).sort((a, b) => (b.stamina - a.stamina) || (a.id < b.id ? -1 : 1));

function bestTile(world, facilityType) {
  let best = null;
  for (const t of world.tiles) {
    const e = Rules.evaluateFacilityPlacement(world.tiles, t.id, facilityType);
    if (e.ok && (best === null || e.multiplierBp > best.bp)) best = { id: t.id, bp: e.multiplierBp };
  }
  return best.id;
}

function desiredAction(world, d, ctx) {
  if (d.stamina < REST_BELOW) return 'rest';
  if (!ctx.alchemy) return 'gather-material';
  const herbUnlocked = !Rules.gatherYield({ slotIndex: world.slotIndex, resource: 'spiritHerb', craft: d.attributes.craft, stamina: Rules.VALUE_LIMITS.staminaMax }).locked;
  if (ctx.needPill && herbUnlocked && world.resources.spiritHerb < ctx.recipe.cost.spiritHerb) return 'gather-herb';
  if (ctx.needPill && world.resources.spiritMaterial < ctx.recipe.cost.spiritMaterial) return 'gather-material';
  if (ctx.needAidMaterial) return 'gather-material';
  return 'cultivate';
}

function decide(world, route, memo) {
  const cmds = [];
  const recipe = Rules.RECIPES['breakthrough-pill'];
  const alchemy = activeJobs(world, 'build').find((j) => j.target.facilityType === 'alchemyRoom') || null;
  const craft = activeJobs(world, 'craft')[0] || null;
  const needPill = !craft && world.inventory['breakthrough-pill'] === 0;
  // 備料援村（supplied）要材料夠才排；首爐丹之後策略只修行，所以援村前幾格先採材料。
  const needAidMaterial = Boolean(route && route.aid === 'supplied' && activeJobs(world, 'aid').length === 0
    && world.slotIndex >= route.aidFrom - 3 && world.resources.spiritMaterial < (Rules.AID_OPTIONS.supplied.cost.spiritMaterial || 0));
  const ctx = { alchemy, craft, needPill, recipe, needAidMaterial };
  const free = freeWorkers(world);
  if (route && route.aid !== 'none' && activeJobs(world, 'aid').length === 0 && world.slotIndex >= Math.max(route.aidFrom, Rules.AID_AVAILABLE_FROM_SLOT)) {
    const cost = Rules.AID_OPTIONS[route.aid].cost.spiritMaterial || 0;
    const worker = free.find((d) => d.id !== State.MASTER_ID && d.stamina >= REST_BELOW) || free.find((d) => d.stamina >= REST_BELOW);
    if (worker && world.resources.spiritMaterial >= cost) {
      cmds.push({ type: 'queueAid', payload: { discipleId: worker.id, optionId: route.aid } });
      memo.aidWorker = worker.id;
    }
  }
  if (!alchemy && free.length > 0 && world.resources.spiritMaterial >= Rules.FACILITIES.alchemyRoom.cost.spiritMaterial) {
    cmds.push({ type: 'queueBuild', payload: { discipleId: State.MASTER_ID, facilityType: 'alchemyRoom', tileId: bestTile(world, 'alchemyRoom') } });
    ctx.alchemy = { queuedNow: true };
  } else if (alchemy && alchemy.status === 'done' && needPill && free.length > 0
    && world.resources.spiritHerb >= recipe.cost.spiritHerb && world.resources.spiritMaterial >= recipe.cost.spiritMaterial) {
    cmds.push({ type: 'queueCraft', payload: { discipleId: free[0].id, recipeId: 'breakthrough-pill', facilityJobId: alchemy.id } });
  }
  if (btMode(route) !== 'none' && world.slotIndex < 41) {
    const p = world.disciples.find((d) => d.id === State.PROTAGONIST_ID);
    const pending = world.jobs.some((j) => j.kind === 'breakthrough' && j.status === 'queued' && j.discipleId === p.id);
    if (p.cultivation === Rules.CULTIVATION_CAP && p.breakthroughs === 0 && !pending && !isBusy(world, p.id)) {
      const usePill = btMode(route) !== 'plain' && world.inventory['breakthrough-pill'] > 0;
      const supporterId = btMode(route) === 'pill-support' && !isBusy(world, State.MASTER_ID) ? State.MASTER_ID : null;
      cmds.push({ type: 'queueBreakthrough', payload: { discipleId: p.id, usePill, supporterId } });
    }
  }
  for (const d of world.disciples) {
    if (isBusy(world, d.id)) continue;
    const want = desiredAction(world, d, ctx);
    if (Commands.scheduledAction(world, d.id, world.slotIndex).action !== want) {
      cmds.push({ type: 'setDailyTemplate', payload: { discipleId: d.id, parts: [want, want, want] } });
    }
  }
  return cmds;
}

// ---------- 執行 ----------
function storySummary(world, route, choices) {
  const aidEvent = world.eventLog.find((e) => e.type === 'aidCompleted') || null;
  const inv = {};
  for (const id of State.CANDIDATE_IDS) {
    inv[id] = { status: world.story.invitations[id].status, joinSlotIndex: world.story.invitations[id].joinSlotIndex };
  }
  return {
    route: clone(route),
    aid: {
      requested: route.aid,
      completed: world.story.rescues.length > 0,
      completedSlotIndex: world.story.rescues.length ? world.story.rescues[0].completedSlotIndex : null,
      discipleId: aidEvent ? aidEvent.discipleId : null,
      reward: aidEvent ? clone(aidEvent.reward) : null,
    },
    invitations: inv,
    recruits: world.disciples.filter((d) => d.role === 'apprentice').map((d) => ({ id: d.id, joinSlotIndex: d.joinSlotIndex })),
    choices,
  };
}

function breakthroughSummary(world, route) {
  const attempts = world.jobs.filter((j) => j.kind === 'breakthrough' && j.status === 'done').map((j) => ({
    jobId: j.id, discipleId: j.discipleId, slotIndex: j.completedSlotIndex, usePill: j.target.usePill, supporterId: j.target.supporterId,
    chanceBp: j.outcome.chanceBp, roll: j.outcome.roll, result: j.outcome.result,
  }));
  return {
    mode: btMode(route),
    attempts: attempts.length,
    successes: attempts.filter((a) => a.result === 'success').length,
    firstAttemptSlot: attempts.length ? attempts[0].slotIndex : null,
    list: attempts,
    cultivation: Object.fromEntries(world.disciples.map((d) => [d.id, { cultivation: d.cultivation, breakthroughs: d.breakthroughs }])),
  };
}

function summarize(seed, world, script, extra) {
  const eventsOf = (type) => world.eventLog.filter((e) => e.type === type);
  const pill = eventsOf('jobCompleted').find((e) => e.kind === 'craft');
  const summary = {
    seed,
    versions: { schema: State.SCHEMA_VERSION, rule: State.RULE_VERSION, rng: State.RNG_VERSION },
    strategy: extra && extra.breakthrough ? BREAKTHROUGH_STRATEGY_VERSION : extra && extra.story ? STORY_STRATEGY_VERSION : STRATEGY_VERSION,
    commands: script.filter((s) => s.type === 'dispatch').length,
    firstPillSlot: pill ? pill.readySlotIndex : null,
    firstPillDay: pill ? Math.floor(pill.readySlotIndex / 3) + 1 : null,
    final: {
      slotIndex: world.slotIndex,
      phase: world.phase,
      pending: world.pendingEvents.map((e) => e.id),
      resources: clone(world.resources),
      inventory: clone(world.inventory),
      reservations: world.reservations.length,
    },
    jobs: world.jobs.map((j) => ({
      id: j.id, kind: j.kind, discipleId: j.discipleId, status: j.status, target: clone(j.target),
      queuedSlotIndex: j.queuedSlotIndex, startSlotIndex: j.startSlotIndex, completedSlotIndex: j.completedSlotIndex, waited: j.waited,
    })),
    waitedSlots: world.jobs.reduce((s, j) => s + j.waited, 0),
    hash: State.hashWorld(world),
    notImplemented: [...NOT_IMPLEMENTED],
  };
  return Object.assign(summary, extra || {});
}

function fail(seed, world, script, error) {
  return { ok: false, finalWorld: world || null, script, states: [], summary: Object.assign(world ? summarize(seed, world, script) : { seed }, { error }) };
}

// 故事路線的成功條件（只讀公開狀態）；回傳問題描述或 null。
function routeProblem(world, route) {
  if (route.aid !== 'none' && world.story.rescues.length !== 1) return `要求援村（${route.aid}）但沒有完成`;
  if (route.aid === 'none' && world.story.rescues.length !== 0) return '不援村的路線卻有援村紀錄';
  if (btMode(route) !== 'none' && !world.jobs.some((j) => j.kind === 'breakthrough' && j.status === 'done')) return `要求突破（${btMode(route)}）但沒有任何一次突破開工`;
  for (const [i, id] of State.CANDIDATE_IDS.entries()) {
    const raised = world.story.triggeredEventIds.includes(`evt-invite-${id}`);
    const status = world.story.invitations[id].status;
    const wantJoin = i + 1 <= route.recruit && raised;
    if (wantJoin && status !== 'accepted') return `${id} 應入隊但狀態是 ${status}`;
    if (!wantJoin && status === 'accepted') return `${id} 不應入隊卻已入隊`;
    if (!raised && status !== 'locked') return `${id} 沒有被提示卻有邀請進度`;
  }
  return null;
}

function runStrategy(options) {
  const seed = options.seed;
  const maxSteps = options.maxPlanningSteps === undefined ? 200 : options.maxPlanningSteps;
  const route = options.route || null;
  const memo = { deferredSeen: {} };
  const choices = [];
  const created = State.newWorld(seed, 'slice-14', options.characterOptions);
  if (!created.ok) return fail(seed, null, [], `newWorld 失敗：${created.code}：${created.reason}`);
  let world = created.state;
  const script = [];
  const states = [world];
  let n = 0;
  const send = (type, payload) => {
    const command = { id: `smoke-${script.filter((s) => s.type === 'dispatch').length + 1}`, expectedRevision: world.revision, type, payload };
    const r = Commands.dispatch(world, command);
    if (!r.ok) return { error: `命令 ${type} 被拒絕：${r.code}：${r.reason}` };
    if (type === 'chooseEvent') choices.push({ eventId: payload.eventId, optionId: payload.optionId, slotIndex: world.slotIndex });
    script.push({ type: 'dispatch', command, fromRevision: world.revision });
    world = r.state;
    return null;
  };
  for (let steps = 0; ; steps += 1) {
    if (world.phase === 'awaitingChoice') {
      if (world.pendingEvents.some((e) => e.id === 'evt-beast-crisis')) break; // 第 42 格危機待選：停止
      for (const pe of [...world.pendingEvents]) {
        let optionId;
        if (pe.id === 'evt-village-plea') {
          optionId = route && route.aid !== 'none' ? 'opt-aid-accept' : 'opt-aid-later';
        } else if (route && /^evt-invite-cand-[12]$/.test(pe.id)) {
          const n = Number(pe.id.slice(-1));
          optionId = n <= route.recruit && route.acceptDelay === 0 ? `opt-invite-cand-${n}-accept` : `opt-invite-cand-${n}-later`;
        } else {
          return fail(seed, world, script, `遇到本策略不處理的待選事件：${pe.id}`);
        }
        const err = send('chooseEvent', { eventId: pe.id, optionId });
        if (err) return fail(seed, world, script, err.error);
      }
      continue;
    }
    if (world.phase !== 'planning') return fail(seed, world, script, `非預期階段：${world.phase}`);
    if (steps >= maxSteps) return fail(seed, world, script, `超過 maxPlanningSteps（${maxSteps}）仍未到危機待選`);
    if (route) {
      for (const [i, id] of State.CANDIDATE_IDS.entries()) {
        const st = world.story.invitations[id].status;
        if (i + 1 > route.recruit) continue;
        if (st === 'deferred' && memo.deferredSeen[id] === undefined) memo.deferredSeen[id] = world.slotIndex;
        const due = st === 'invited' || (st === 'deferred' && world.slotIndex >= memo.deferredSeen[id] + route.acceptDelay);
        if (due) {
          const err = send('acceptCandidate', { candidateId: id });
          if (err) return fail(seed, world, script, err.error);
        }
      }
    }
    for (const c of decide(world, route, memo)) {
      const err = send(c.type, c.payload);
      if (err) return fail(seed, world, script, err.error);
    }
    const adv = Engine.advance(world, 1);
    if (!adv.ok) return fail(seed, world, script, `advance 失敗：${adv.code}：${adv.reason}`);
    script.push({ type: 'advance', slots: 1, fromRevision: world.revision });
    world = adv.state;
    states.push(world);
    n += 1;
  }
  const extra = route ? { story: storySummary(world, route, choices) } : undefined;
  if (route && btMode(route) !== 'none') extra.breakthrough = breakthroughSummary(world, route);
  const summary = summarize(seed, world, script, extra);
  if (route) {
    const problem = routeProblem(world, route);
    if (problem) return Object.assign(fail(seed, world, script, problem), { states });
  }
  if (world.slotIndex !== 42) return Object.assign(fail(seed, world, script, `停在第 ${world.slotIndex} 格而不是 42`), { states });
  const pillUsed = world.jobs.some((j) => j.kind === 'breakthrough' && j.status === 'done' && j.target.usePill);
  if (summary.firstPillSlot === null || (world.inventory['breakthrough-pill'] < 1 && !pillUsed)) {
    return Object.assign(fail(seed, world, script, '沒有製出首爐丹'), { states });
  }
  return { ok: true, finalWorld: world, script, states, summary };
}

// 以同一組有效命令重放；連續的 advance 步驟合併後依 batch 切塊（不跨越命令點），遇待選事件自然停止。
function replayFrom(world, steps, batch = 1) {
  let w = world;
  let i = 0;
  while (i < steps.length) {
    const st = steps[i];
    if (st.type === 'dispatch') {
      const r = Commands.dispatch(w, st.command);
      if (!r.ok) throw new Error(`重放時命令被拒絕：${r.code}：${r.reason}`);
      w = r.state;
      i += 1;
      continue;
    }
    let remaining = 0;
    while (i < steps.length && steps[i].type === 'advance') { remaining += steps[i].slots; i += 1; }
    while (remaining > 0) {
      const r = Engine.advance(w, Math.min(batch, remaining));
      if (!r.ok || r.advanced === 0) throw new Error(`重放時 advance 失敗：${r.code || 'no_progress'}`);
      w = r.state;
      remaining -= r.advanced;
    }
  }
  return w;
}

function replay(options, script, batch) {
  const created = State.newWorld(options.seed, 'slice-14', options.characterOptions);
  if (!created.ok) throw new Error(`newWorld 失敗：${created.code}`);
  return replayFrom(created.state, script, batch);
}

// ---------- CLI ----------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (['--seed', '--template', '--aid', '--aid-from', '--recruit', '--accept-delay', '--breakthrough'].includes(a) && i + 1 < argv.length) {
      out[a.slice(2)] = argv[i + 1];
      i += 1;
    } else {
      return { error: `未知或缺值的參數：${a}` };
    }
  }
  if (out.seed === undefined) return { error: '需要 --seed <seed>' };
  const intOpt = (name, lo, hi) => {
    if (out[name] === undefined) return null;
    if (!/^\d+$/.test(out[name]) || Number(out[name]) < lo || Number(out[name]) > hi) return `--${name} 必須是 ${lo} 到 ${hi} 的整數`;
    return null;
  };
  if (out.aid !== undefined && !AID_OPTIONS.includes(out.aid)) return { error: `--aid 必須是 ${AID_OPTIONS.join('｜')}` };
  if (out.breakthrough !== undefined && !BREAKTHROUGH_MODES.includes(out.breakthrough)) return { error: `--breakthrough 必須是 ${BREAKTHROUGH_MODES.join('｜')}` };
  const bad = intOpt('aid-from', 0, 42) || intOpt('recruit', 0, 2) || intOpt('accept-delay', 0, 42);
  if (bad) return { error: bad };
  if (['aid', 'aid-from', 'recruit', 'accept-delay', 'breakthrough'].some((k) => out[k] !== undefined)) {
    out.route = {
      aid: out.aid === undefined ? 'none' : out.aid,
      aidFrom: out['aid-from'] === undefined ? Rules.AID_AVAILABLE_FROM_SLOT : Number(out['aid-from']),
      recruit: out.recruit === undefined ? 0 : Number(out.recruit),
      acceptDelay: out['accept-delay'] === undefined ? 0 : Number(out['accept-delay']),
      breakthrough: out.breakthrough === undefined ? 'none' : out.breakthrough,
    };
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.error) {
    process.stderr.write(`${args.error}\n用法：node sect-chronicle/tools/smoke.js --seed <seed> [--template <id>] [--aid none|free|supplied] [--aid-from <slot>] [--recruit 0|1|2] [--accept-delay <slots>] [--breakthrough none|plain|pill|pill-support]\n`);
    return 2;
  }
  const characterOptions = args.template === undefined ? undefined : {
    templateId: args.template, allocation: { rootBone: 1, comprehension: 1, craft: 1 }, personality: { risk: 'cautious', bond: 'independent' },
  };
  const run = runStrategy({ seed: args.seed, characterOptions, route: args.route });
  if (!run.ok) {
    process.stderr.write(`${JSON.stringify(run.summary, null, 2)}\n`);
    return 1;
  }
  process.stdout.write(`${JSON.stringify(run.summary, null, 2)}\n`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { STRATEGY_VERSION, STORY_STRATEGY_VERSION, BREAKTHROUGH_STRATEGY_VERSION, NOT_IMPLEMENTED, optionsForIndex, runStrategy, replay, replayFrom, decide, main };
