#!/usr/bin/env node
'use strict';
/*
 * SG-04：首爐丹冒煙 CLI。`node sect-chronicle/tools/smoke.js --seed <seed> [--template <id>]`
 *
 * 只用公開的 State.newWorld／Commands.dispatch／Engine.advance：不直接補資源、改工期或注入完工設施。
 * 策略 first-furnace-v1（只讀玩家可見的世界狀態，不偷看 RNG；本包沒有任何隨機）：
 *   兩人先採靈材 → 材料夠時由師父在放置倍率最高的可建地塊蓋丹房 → 日 4（第 9 格）靈草解鎖後採靈草 →
 *   丹房完工且材料齊備時排煉丹；其餘時間修行；體力低於 35 先休養。遇求援選 opt-aid-later（只是提示，
 *   不發獎勵；援村／收徒屬 SG-04A）；遇第 42 格獸患待選就停止，沒有第 43 格、不假勝利。
 * 失敗（沒有首爐丹、沒走到危機待選、命令被拒）以非零結束；退出碼：0 成功、1 策略失敗、2 用法錯誤。
 */
const Rules = require('../js/rules.js');
const State = require('../js/state.js');
const Commands = require('../js/commands.js');
const Engine = require('../js/engine.js');

const STRATEGY_VERSION = 'first-furnace-v1';
const NOT_IMPLEMENTED = Object.freeze([
  '援村完成與一次性獎勵、固定招募（SG-04A）',
  '突破與支援（SG-05）：丹藥只入庫，沒有任何消耗或 buff',
  '獸患結算、立派／暫緩 ending（SG-06）：停在第 42 格危機待選',
  'storage／UI／forecast（SG-07 之後）',
]);
const REST_BELOW = 35;
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
  return 'cultivate';
}

function decide(world) {
  const cmds = [];
  const recipe = Rules.RECIPES['breakthrough-pill'];
  const alchemy = activeJobs(world, 'build').find((j) => j.target.facilityType === 'alchemyRoom') || null;
  const craft = activeJobs(world, 'craft')[0] || null;
  const needPill = !craft && world.inventory['breakthrough-pill'] === 0;
  const ctx = { alchemy, craft, needPill, recipe };
  const free = freeWorkers(world);
  if (!alchemy && free.length > 0 && world.resources.spiritMaterial >= Rules.FACILITIES.alchemyRoom.cost.spiritMaterial) {
    cmds.push({ type: 'queueBuild', payload: { discipleId: State.MASTER_ID, facilityType: 'alchemyRoom', tileId: bestTile(world, 'alchemyRoom') } });
    ctx.alchemy = { queuedNow: true };
  } else if (alchemy && alchemy.status === 'done' && needPill && free.length > 0
    && world.resources.spiritHerb >= recipe.cost.spiritHerb && world.resources.spiritMaterial >= recipe.cost.spiritMaterial) {
    cmds.push({ type: 'queueCraft', payload: { discipleId: free[0].id, recipeId: 'breakthrough-pill', facilityJobId: alchemy.id } });
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
function summarize(seed, world, script, extra) {
  const eventsOf = (type) => world.eventLog.filter((e) => e.type === type);
  const pill = eventsOf('jobCompleted').find((e) => e.kind === 'craft');
  const summary = {
    seed,
    versions: { schema: State.SCHEMA_VERSION, rule: State.RULE_VERSION, rng: State.RNG_VERSION },
    strategy: STRATEGY_VERSION,
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

function runStrategy(options) {
  const seed = options.seed;
  const maxSteps = options.maxPlanningSteps === undefined ? 200 : options.maxPlanningSteps;
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
    script.push({ type: 'dispatch', command, fromRevision: world.revision });
    world = r.state;
    return null;
  };
  for (let steps = 0; ; steps += 1) {
    if (world.phase === 'awaitingChoice') {
      if (world.pendingEvents.some((e) => e.id === 'evt-beast-crisis')) break; // 第 42 格危機待選：停止
      for (const pe of [...world.pendingEvents]) {
        if (pe.id !== 'evt-village-plea') return fail(seed, world, script, `遇到本策略不處理的待選事件：${pe.id}`);
        const err = send('chooseEvent', { eventId: pe.id, optionId: 'opt-aid-later' });
        if (err) return fail(seed, world, script, err.error);
      }
      continue;
    }
    if (world.phase !== 'planning') return fail(seed, world, script, `非預期階段：${world.phase}`);
    if (steps >= maxSteps) return fail(seed, world, script, `超過 maxPlanningSteps（${maxSteps}）仍未到危機待選`);
    for (const c of decide(world)) {
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
  const summary = summarize(seed, world, script);
  if (world.slotIndex !== 42) return Object.assign(fail(seed, world, script, `停在第 ${world.slotIndex} 格而不是 42`), { states });
  if (summary.firstPillSlot === null || world.inventory['breakthrough-pill'] < 1) {
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
    if ((a === '--seed' || a === '--template') && i + 1 < argv.length) {
      out[a.slice(2)] = argv[i + 1];
      i += 1;
    } else {
      return { error: `未知或缺值的參數：${a}` };
    }
  }
  if (out.seed === undefined) return { error: '需要 --seed <seed>' };
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.error) {
    process.stderr.write(`${args.error}\n用法：node sect-chronicle/tools/smoke.js --seed <seed> [--template <id>]\n`);
    return 2;
  }
  const characterOptions = args.template === undefined ? undefined : {
    templateId: args.template, allocation: { rootBone: 1, comprehension: 1, craft: 1 }, personality: { risk: 'cautious', bond: 'independent' },
  };
  const run = runStrategy({ seed: args.seed, characterOptions });
  if (!run.ok) {
    process.stderr.write(`${JSON.stringify(run.summary, null, 2)}\n`);
    return 1;
  }
  process.stdout.write(`${JSON.stringify(run.summary, null, 2)}\n`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { STRATEGY_VERSION, NOT_IMPLEMENTED, optionsForIndex, runStrategy, replay, replayFrom, decide, main };
