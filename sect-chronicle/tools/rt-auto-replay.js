#!/usr/bin/env node
'use strict';
/*
 * SG-RT-02：rt-auto-life-v1。
 * 20 個固定 seed（rt-dev-000..019）各跑 2700 tick 的無人介入。角色輪替沿 smoke／rt-replay 的 optionsForIndex。
 * 政策：0–9 安穩發展（開局預設，不另下 setPolicy）、10–14 全部詢問、15–19 自訂
 * （援村 off、收徒 ask、突破 off、丹 never、支援 never）。
 * 突破會讓 advanceTicks 停住當前批次；本工具把剩下的 tick 繼續跑完。不把 rt-manual-core-v1 的舊數字當成這裡的結果。
 *
 * 用法：
 *   node sect-chronicle/tools/rt-auto-replay.js --matrix
 *   node sect-chronicle/tools/rt-auto-replay.js --seed rt-dev-000
 *   node sect-chronicle/tools/rt-auto-replay.js --seed rt-dev-000 --mode step
 *   node sect-chronicle/tools/rt-auto-replay.js --intervention
 */
const Realtime = require('../js/realtime.js');
const Rules = require('../js/rules.js');
const State = require('../js/state.js');
const Replay = require('./rt-replay.js');

const SCRIPT_ID = 'rt-auto-life-v1';
const INTERVENTION_ID = 'rt-auto-intervention-v1';
const HORIZON = Rules.OBSERVATION_TICKS;
const SEED_COUNT = 20;
const CHECKPOINTS = Object.freeze([540, 1080, 1800, 2520, 2700]);
const MODES = Object.freeze({
  step: Object.freeze([1]),
  3: Object.freeze([3]),
  60: Object.freeze([60]),
  180: Object.freeze([180]),
  variable: Object.freeze([1, 2, 5, 8, 13, 4, 7]),
  full: null,
});
const MODE_NAMES = Object.freeze(Object.keys(MODES));
const CUSTOM_POLICY = Object.freeze({
  aid: 'off', recruit: 'ask', breakthrough: 'off', breakthroughPill: 'never', breakthroughSupport: 'never',
});
const RESUME_SEEDS = Object.freeze([0, 1, 2, 10, 15]);
const PID = State.PROTAGONIST_ID;

function seedName(index) {
  return `rt-dev-${String(index).padStart(3, '0')}`;
}

function policyFor(index) {
  if (index < 10) return null;
  if (index < 15) return Realtime.ASK_POLICY;
  return CUSTOM_POLICY;
}

function policyName(index) {
  if (index < 10) return '安穩發展';
  if (index < 15) return '全部詢問';
  return '自訂';
}

function optionsForIndex(index) {
  return Replay.optionsForIndex(index);
}

function interventionCommands() {
  return [{
    tick: 48,
    id: 'hand-rest',
    type: 'orderActivity',
    payload: { discipleId: PID, kind: 'rest', target: {}, units: 1 },
  }];
}

function fail(fields) {
  return Object.assign({ ok: false }, fields);
}

function drive(world, n) {
  let left = n;
  let breakthroughTick = null;
  while (left > 0) {
    const step = Realtime.advanceTicks(world, left);
    if (!step.ok || step.stopReason === 'error' || step.advancedTicks < 1) {
      return {
        error: fail({
          code: step.code || (step.error && step.error.code) || 'tick_error',
          reason: (step.error && step.error.reason) || step.reason || '推進失敗',
          tick: world.clock.tick,
        }),
      };
    }
    world = step.state;
    left -= step.advancedTicks;
    if (step.stopReason === 'breakthroughResolved' && breakthroughTick === null) breakthroughTick = world.clock.tick;
  }
  return { world, breakthroughTick };
}

function issue(world, commands, seen) {
  for (const cmd of commands) {
    if (cmd.tick !== world.clock.tick || seen.has(cmd.id)) continue;
    const result = Realtime.dispatch(world, {
      id: cmd.id, type: cmd.type, expectedRevision: world.revision, payload: cmd.payload,
    });
    if (!result.ok) {
      return {
        error: fail({
          code: result.code, reason: result.reason, tick: world.clock.tick, commandId: cmd.id,
        }),
      };
    }
    world = result.state;
    seen.add(cmd.id);
  }
  return { world };
}

function checkpointProblem(world) {
  const check = Realtime.validateWorld(world);
  if (!check.ok) return `${check.code}：${check.reason}`;
  if (world.story.organisationStatus !== 'dojo') return '門派狀態被改寫';
  if (Object.prototype.hasOwnProperty.call(world, 'slotIndex') || Object.prototype.hasOwnProperty.call(world, 'jobs')) return '出現 slot 欄位';
  for (const key of ['spiritMaterial', 'spiritHerb', 'spiritStone', 'reputation']) {
    if (world.resources[key] < 0) return `資源 ${key} 為負`;
  }
  if (world.inventory['breakthrough-pill'] < 0) return '丹為負';
  for (const event of world.eventLog) {
    if (event.type === 'ending' || event.type === 'evt-beast-crisis' || String(event.type).indexOf('evt-ending') === 0) {
      return `出現結局事件 ${event.type}`;
    }
    if (event.phase === 'awaitingChoice') return '世界進入 awaitingChoice';
  }
  for (const event of world.pendingEvents) {
    if (event.expiresTick < world.clock.tick) return `逾期事件仍掛著 ${event.id}`;
  }
  for (const disciple of world.disciples) {
    if (disciple.joinTick > world.clock.tick) return `${disciple.id} 的 joinTick 晚於現在`;
    const justFinished = world.activities.some((a) => a.discipleId === disciple.id && a.completedTick === world.clock.tick);
    const busy = disciple.activityId !== null || disciple.autonomy.wait !== null || disciple.manualOrder !== null || justFinished;
    if (disciple.joinTick <= world.clock.tick && !busy) return `${disciple.id} 沒有活動、等待、手動鎖，也不是剛完成`;
    if (disciple.activityId !== null && disciple.autonomy.wait !== null) return `${disciple.id} 同時有活動與等待`;
  }
  const text = Realtime.serializeState(world);
  const parsed = Realtime.parseState(text);
  if (!parsed.ok) return `檢查點無法載入：${parsed.reason}`;
  if (Realtime.hashWorld(parsed.state) !== Realtime.hashWorld(world)) return '存讀當下 hash 不同';
  return null;
}

function play(index, mode, opts = {}) {
  if (!Object.prototype.hasOwnProperty.call(MODES, mode)) return fail({ code: 'bad_mode', reason: `未知模式 ${mode}` });
  const commands = opts.commands || [];
  const stops = new Set(CHECKPOINTS);
  stops.add(HORIZON);
  if (opts.until != null) stops.add(opts.until);
  for (const cmd of commands) stops.add(cmd.tick);
  const plan = [...stops].sort((a, b) => a - b);
  let world = opts.world || null;
  if (!world) {
    const created = Realtime.createWorld(opts.seed || seedName(index), optionsForIndex(index));
    if (!created.ok) return fail({ code: created.code, reason: created.reason, seed: seedName(index), mode });
    world = created.state;
    const policy = opts.policy === undefined ? policyFor(index) : opts.policy;
    if (policy) {
      const set = Realtime.dispatch(world, {
        id: 'policy-0', type: 'setPolicy', expectedRevision: world.revision, payload: { policy },
      });
      if (!set.ok) return fail({ code: set.code, reason: set.reason, seed: seedName(index), mode, tick: 0 });
      world = set.state;
    }
  }
  const seen = new Set(world.commandLog.map((c) => c.id));
  const marks = [];
  const snapshots = {};
  let breakthroughTick = null;
  const seq = MODES[mode];
  let cursor = 0;
  let guard = 0;
  while (guard++ < 100000) {
    const issued = issue(world, commands, seen);
    if (issued.error) return Object.assign(issued.error, { seed: seedName(index), mode });
    world = issued.world;
    const hash = Realtime.hashWorld(world);
    const rng = State.canonicalize(world.rngState);
    marks.push({ tick: world.clock.tick, hash, rng });
    if (CHECKPOINTS.includes(world.clock.tick) || (opts.markIntervention && world.clock.tick === 48)) {
      const problem = checkpointProblem(world);
      if (problem) return fail({ code: 'checkpoint', reason: problem, tick: world.clock.tick, seed: seedName(index), mode });
      const heroNow = world.disciples.find((d) => d.id === PID);
      snapshots[world.clock.tick] = { hash, rng, manual: heroNow.manualOrder ? heroNow.manualOrder.kind : null };
    }
    if (world.clock.tick >= HORIZON) break;
    if (opts.until != null && world.clock.tick >= opts.until) break;
    const next = plan.find((t) => t > world.clock.tick);
    if (next === undefined) break;
    let inner = 0;
    while (world.clock.tick < next) {
      if (inner++ > 10000) return fail({ code: 'loop', reason: '批次沒有前進', tick: world.clock.tick, seed: seedName(index), mode });
      const room = next - world.clock.tick;
      const n = seq ? Math.min(seq[cursor % seq.length], room) : room;
      cursor += 1;
      const stepped = drive(world, n);
      if (stepped.error) return Object.assign(stepped.error, { seed: seedName(index), mode });
      world = stepped.world;
      if (stepped.breakthroughTick !== null && breakthroughTick === null) breakthroughTick = stepped.breakthroughTick;
    }
  }
  const hero = world.disciples.find((d) => d.id === PID);
  return {
    ok: true,
    script: opts.script || SCRIPT_ID,
    seed: world.seed,
    index,
    mode,
    policy: policyName(index),
    world,
    marks,
    snapshots,
    hash: Realtime.hashWorld(world),
    rng: State.canonicalize(world.rngState),
    clock: world.clock.tick,
    revision: world.revision,
    commands: world.commandLog.length,
    cultivation: hero.cultivation,
    breakthroughs: hero.breakthroughs,
    injury: hero.injury,
    material: world.resources.spiritMaterial,
    roster: world.disciples.length,
    breakthroughTick,
    endings: world.eventLog.filter((e) => e.type === 'ending' || e.type === 'evt-beast-crisis').length,
    organisationStatus: world.story.organisationStatus,
  };
}

function sameMarks(a, b) {
  if (a.length !== b.length) return `檢查點數量 ${a.length} ≠ ${b.length}`;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].tick !== b[i].tick || a[i].hash !== b[i].hash || a[i].rng !== b[i].rng) {
      return `tick ${a[i].tick} 的 hash 或 RNG 與逐步不同`;
    }
  }
  return null;
}

function resumeChecks(index, full) {
  const problems = [];
  const ticks = CHECKPOINTS.slice();
  if (full.breakthroughTick !== null) ticks.push(full.breakthroughTick);
  for (const tick of ticks) {
    const mid = tick === HORIZON ? full : play(index, 'step', { until: tick });
    if (!mid.ok || mid.clock !== tick) {
      problems.push({ seed: seedName(index), tick, reason: mid.ok ? `停在 ${mid.clock}，不是 ${tick}` : mid.reason });
      continue;
    }
    let text;
    try {
      text = Realtime.serializeState(mid.world);
    } catch (e) {
      problems.push({ seed: seedName(index), tick, reason: e.message });
      continue;
    }
    const parsed = Realtime.parseState(text);
    if (!parsed.ok) {
      problems.push({ seed: seedName(index), tick, reason: parsed.reason });
      continue;
    }
    const cont = play(index, 'step', { world: parsed.state });
    if (!cont.ok || cont.hash !== full.hash || cont.rng !== full.rng) {
      problems.push({ seed: seedName(index), tick, reason: cont.ok ? '存讀後續與未中斷路徑不同' : cont.reason });
    }
  }
  return problems;
}

function playIntervention(mode) {
  return play(0, mode, {
    commands: interventionCommands(),
    script: INTERVENTION_ID,
    markIntervention: true,
    seed: 'rt-dev-000',
  });
}

function replayMatrix() {
  const failures = [];
  const rows = [];
  const started = Date.now();
  for (let i = 0; i < SEED_COUNT; i += 1) {
    const runs = {};
    for (const mode of MODE_NAMES) {
      const run = play(i, mode);
      runs[mode] = run;
      if (!run.ok) failures.push({ seed: seedName(i), mode, code: run.code, reason: run.reason, tick: run.tick });
    }
    const base = runs.step;
    if (base && base.ok) {
      if (base.clock !== HORIZON) failures.push({ seed: base.seed, mode: 'step', reason: `clock ${base.clock}` });
      if (base.revision !== base.clock + base.commands) failures.push({ seed: base.seed, mode: 'step', reason: 'revision 與 tick、命令數不一致' });
      if (base.endings !== 0 || base.organisationStatus !== 'dojo') failures.push({ seed: base.seed, mode: 'step', reason: '出現結局' });
      for (const mode of MODE_NAMES) {
        if (mode === 'step' || !runs[mode].ok) continue;
        const diff = sameMarks(base.marks, runs[mode].marks);
        if (diff || runs[mode].hash !== base.hash || runs[mode].rng !== base.rng) {
          failures.push({ seed: base.seed, mode, reason: diff || '最終 hash 或 RNG 不同' });
        }
      }
      if (RESUME_SEEDS.includes(i)) failures.push(...resumeChecks(i, base));
      rows.push({
        seed: base.seed, policy: base.policy, cultivation: base.cultivation, breakthroughs: base.breakthroughs,
        injury: base.injury, material: base.material, roster: base.roster, hash: base.hash,
        breakthroughTick: base.breakthroughTick, revision: base.revision, commands: base.commands,
      });
    }
  }
  const hand = {};
  for (const mode of MODE_NAMES) {
    const run = playIntervention(mode);
    hand[mode] = run;
    if (!run.ok) failures.push({ seed: 'rt-dev-000', mode, script: INTERVENTION_ID, code: run.code, reason: run.reason, tick: run.tick });
  }
  if (hand.step && hand.step.ok) {
    const shot = hand.step.snapshots[48];
    const rest = hand.step.world.activities.find((a) => a.origin === 'manual' && a.kind === 'rest');
    if (!shot || shot.manual !== 'rest' || !rest) {
      failures.push({ seed: 'rt-dev-000', script: INTERVENTION_ID, reason: 'tick 48 的手動休養沒有留下，或事後沒有手動休養活動' });
    }
    for (const mode of MODE_NAMES) {
      if (mode === 'step' || !hand[mode].ok) continue;
      if (hand[mode].hash !== hand.step.hash || hand[mode].rng !== hand.step.rng) {
        failures.push({ seed: 'rt-dev-000', mode, script: INTERVENTION_ID, reason: '介入腳本的分塊 hash 不同' });
      }
    }
  }
  return { ok: failures.length === 0, script: SCRIPT_ID, failures, rows, ms: Date.now() - started };
}

function main(argv) {
  const opts = { matrix: false, seed: null, mode: 'full', intervention: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--matrix') opts.matrix = true;
    else if (arg === '--intervention') opts.intervention = true;
    else if (arg === '--seed') opts.seed = argv[++i];
    else if (arg === '--mode') opts.mode = argv[++i];
    else {
      process.stderr.write('用法：node sect-chronicle/tools/rt-auto-replay.js --matrix | --seed rt-dev-000 [--mode step] | --intervention\n');
      return 2;
    }
  }
  if (!opts.matrix && !opts.seed && !opts.intervention) {
    process.stderr.write('用法：node sect-chronicle/tools/rt-auto-replay.js --matrix | --seed rt-dev-000 [--mode step] | --intervention\n');
    return 2;
  }
  if (opts.intervention) {
    const run = playIntervention(opts.mode || 'full');
    if (!run.ok) {
      process.stderr.write(`${JSON.stringify(run)}\n`);
      return 1;
    }
    process.stdout.write(`${JSON.stringify({ script: run.script, seed: run.seed, hash: run.hash, clock: run.clock })}\n`);
    return 0;
  }
  if (opts.seed) {
    const match = /^rt-dev-(\d{3})$/.exec(opts.seed);
    const index = match ? Number(match[1]) : -1;
    if (index < 0 || index >= SEED_COUNT) {
      process.stderr.write('seed 必須是 rt-dev-000 到 rt-dev-019\n');
      return 2;
    }
    const run = play(index, opts.mode);
    if (!run.ok) {
      process.stderr.write(`${JSON.stringify(run)}\n`);
      return 1;
    }
    process.stdout.write(`${JSON.stringify({
      script: run.script, seed: run.seed, policy: run.policy, hash: run.hash, clock: run.clock,
      cultivation: run.cultivation, breakthroughs: run.breakthroughs, injury: run.injury,
      material: run.material, roster: run.roster, breakthroughTick: run.breakthroughTick,
    })}\n`);
    return 0;
  }
  const result = replayMatrix();
  for (const row of result.rows) process.stdout.write(`${JSON.stringify(row)}\n`);
  process.stdout.write(`${JSON.stringify({ ok: result.ok, script: result.script, seeds: result.rows.length, failures: result.failures.length, ms: result.ms })}\n`);
  if (!result.ok) process.stderr.write(`${JSON.stringify(result.failures, null, 2)}\n`);
  return result.ok ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = {
  SCRIPT_ID, INTERVENTION_ID, HORIZON, CHECKPOINTS, MODES, MODE_NAMES, CUSTOM_POLICY,
  seedName, policyFor, policyName, optionsForIndex, interventionCommands, play, playIntervention, replayMatrix,
};
