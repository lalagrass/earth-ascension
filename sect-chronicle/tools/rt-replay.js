#!/usr/bin/env node
'use strict';
/*
 * SG-RT-01：rt-manual-core-v1。
 * 20 個固定 seed（rt-dev-000..019）各跑 2700 tick。指令在下達當下就能從規則算出，不看未來 RNG，也沒有自主規劃。
 * 角色輪替與 tools/smoke.js 的 optionsForIndex 相同。只有非預設政策才在 tick 0 先 setPolicy。
 *
 * 主角指令（時間是完成後的 clock.tick）：
 *   0     採靈材 t-0-0 ×6。趕路 24 tick，工作 360 tick，clock 384 完成。
 *   384   在 t-0-1 建丹房 ×3。一步 6 tick，工作 180 tick，clock 570 完成。
 *   400   休養 ×1，先掛在建造這個承諾後面。570 開工，趕路 18 tick，工作 60 tick，clock 648 完成。
 *   648 起六輪「修行 ×3、休養 ×1」（都在道場，各 180／60 tick）：
 *         修行 648、888、1128、1368、1608、1848；休養 828、1068、1308、1548、1788、2028。
 *   2088  突破，usePill false、supporterId null。道場內 60 tick，clock 2148 結算並停止這一批，再繼續到 2700。
 * 跨越 2520 不會觸發舊的危機或結局。檢查點：10 趕路、100 工作、450 待執行、540／1080／1800 階段、2148 突破、2520 邊界、2700 結束。
 */
const Realtime = require('../js/realtime.js');
const Rules = require('../js/rules.js');
const State = require('../js/state.js');

const SCRIPT_ID = 'rt-manual-core-v1';
const HORIZON = 2700;
const SEED_COUNT = 20;
const CHECKPOINTS = Object.freeze([10, 100, 450, 540, 1080, 1800, 2148, 2520, 2700]);
const MODES = Object.freeze({
  step: Object.freeze([1]),
  3: Object.freeze([3]),
  60: Object.freeze([60]),
  180: Object.freeze([180]),
  variable: Object.freeze([1, 2, 5, 8, 13, 4, 7]),
  full: null,
});
const MODE_NAMES = Object.freeze(Object.keys(MODES));
const ASK_POLICY = Object.freeze({
  aid: 'ask', recruit: 'ask', breakthrough: 'ask', breakthroughPill: 'use', breakthroughSupport: 'auto',
});
const CUSTOM_POLICY = Object.freeze({
  aid: 'off', recruit: 'ask', breakthrough: 'off', breakthroughPill: 'never', breakthroughSupport: 'never',
});
const RESUME_SEEDS = Object.freeze([0, 1, 2, 10, 15]);
const PID = State.PROTAGONIST_ID;

function optionsForIndex(i, templateIds) {
  const ids = templateIds || Object.keys(Rules.CHARACTER_OPTION_LIMITS.templates);
  const L = Rules.CHARACTER_OPTION_LIMITS;
  const templateId = ids[i % ids.length];
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
    allocation: valid[Math.floor(i / ids.length) % valid.length],
    personality: { risk: L.personality.risk[i % 2], bond: L.personality.bond[Math.floor(i / 2) % 2] },
  };
}

function seedName(index) {
  return `rt-dev-${String(index).padStart(3, '0')}`;
}

function policyFor(index) {
  if (index < 10) return null;
  if (index < 15) return ASK_POLICY;
  return CUSTOM_POLICY;
}

function commandsFor(index) {
  const cmds = [];
  const policy = policyFor(index);
  if (policy) cmds.push({ tick: 0, type: 'setPolicy', payload: { policy } });
  const order = (tick, kind, target, units, extra) => {
    cmds.push({
      tick, type: 'orderActivity',
      payload: Object.assign({ discipleId: PID, kind, target, units }, extra || {}),
    });
  };
  order(0, 'gather-material', { tileId: 't-0-0' }, 6);
  order(384, 'build', { facilityType: 'alchemyRoom', tileId: 't-0-1' }, 3);
  order(400, 'rest', {}, 1);
  const cultivateAt = [648, 888, 1128, 1368, 1608, 1848];
  const restAt = [828, 1068, 1308, 1548, 1788, 2028];
  for (let n = 0; n < cultivateAt.length; n += 1) {
    order(cultivateAt[n], 'cultivate', {}, 3);
    order(restAt[n], 'rest', {}, 1);
  }
  order(2088, 'breakthrough', {}, 1, { usePill: false, supporterId: null });
  return cmds.map((cmd, i) => Object.assign({ id: `v1-${i + 1}` }, cmd));
}

function stopsFor(commands) {
  const ticks = new Set(CHECKPOINTS);
  ticks.add(HORIZON);
  for (const cmd of commands) ticks.add(cmd.tick);
  return [...ticks].sort((a, b) => a - b);
}

function snapshot(world) {
  const d = world.disciples.find((x) => x.id === PID);
  const act = d.activityId ? world.activities.find((a) => a.id === d.activityId) : null;
  return {
    tick: world.clock.tick,
    hash: Realtime.hashWorld(world),
    rng: State.canonicalize(world.rngState),
    activity: act ? { id: act.id, kind: act.kind, status: act.status, unitsDone: act.unitsDone, workTicks: act.workTicks } : null,
    manual: d.manualOrder ? { kind: d.manualOrder.kind, status: d.manualOrder.status, usePill: d.manualOrder.usePill, supporterId: d.manualOrder.supporterId } : null,
    pos: { r: d.pos.r, c: d.pos.c },
    cultivation: d.cultivation,
    breakthroughs: d.breakthroughs,
  };
}

function play(index, mode, opts = {}) {
  if (!Object.prototype.hasOwnProperty.call(MODES, mode)) return { ok: false, code: 'bad_mode', reason: `未知模式 ${mode}` };
  const commands = commandsFor(index);
  const stops = stopsFor(commands);
  let world = opts.world || null;
  if (!world) {
    const created = Realtime.createWorld(seedName(index), optionsForIndex(index));
    if (!created.ok) return { ok: false, code: created.code, reason: created.reason, seed: seedName(index), mode };
    world = created.state;
  }
  const seen = new Set(world.commandLog.map((c) => c.id));
  let cursor = 0;
  const marks = [];
  const snapshots = {};
  let breakthroughTick = null;
  const until = opts.until == null ? null : opts.until;
  const seq = MODES[mode];
  let guard = 0;
  const issue = () => {
    for (const cmd of commands) {
      if (cmd.tick !== world.clock.tick || seen.has(cmd.id)) continue;
      const result = Realtime.dispatch(world, {
        id: cmd.id, type: cmd.type, expectedRevision: world.revision, payload: cmd.payload,
      });
      if (!result.ok) {
        return { ok: false, code: result.code, reason: result.reason, tick: world.clock.tick, commandId: cmd.id, seed: seedName(index), mode };
      }
      world = result.state;
      seen.add(cmd.id);
    }
    return null;
  };
  while (guard++ < 100000) {
    const rejected = issue();
    if (rejected) return rejected;
    const shot = snapshot(world);
    marks.push({ tick: shot.tick, hash: shot.hash, rng: shot.rng });
    if (CHECKPOINTS.includes(world.clock.tick)) snapshots[world.clock.tick] = shot;
    if (world.clock.tick >= HORIZON) break;
    if (until !== null && world.clock.tick >= until) break;
    const next = stops.find((t) => t > world.clock.tick);
    if (next === undefined) break;
    let inner = 0;
    while (world.clock.tick < next) {
      if (inner++ > 10000) return { ok: false, code: 'loop', reason: '批次沒有前進', tick: world.clock.tick, seed: seedName(index), mode };
      const room = next - world.clock.tick;
      const n = seq ? Math.min(seq[cursor % seq.length], room) : room;
      cursor += 1;
      const adv = Realtime.advanceTicks(world, n);
      if (!adv.ok || adv.stopReason === 'error' || adv.advancedTicks < 1) {
        return {
          ok: false, code: adv.code || (adv.error && adv.error.code) || 'tick_error',
          reason: (adv.error && adv.error.reason) || adv.reason || '推進失敗',
          tick: world.clock.tick, seed: seedName(index), mode,
        };
      }
      world = adv.state;
      if (adv.stopReason === 'breakthroughResolved') {
        breakthroughTick = world.clock.tick;
        break;
      }
    }
  }
  const hero = world.disciples.find((d) => d.id === PID);
  const breakthroughs = world.eventLog.filter((e) => e.type === 'breakthroughResolved');
  return {
    ok: true,
    script: SCRIPT_ID,
    seed: seedName(index),
    index,
    mode,
    world,
    marks,
    snapshots,
    hash: Realtime.hashWorld(world),
    rng: State.canonicalize(world.rngState),
    clock: world.clock.tick,
    revision: world.revision,
    commands: world.commandLog.length,
    templateId: world.characterOptions.templateId,
    cultivation: hero.cultivation,
    breakthroughs: hero.breakthroughs,
    injury: hero.injury,
    material: world.resources.spiritMaterial,
    policy: world.policy,
    breakthroughTick,
    breakthroughEvents: breakthroughs.length,
    autonomyResumed: world.eventLog.filter((e) => e.type === 'autonomyResumed').length,
    d7c: world.eventLog.filter((e) => e.type === 'unitCompleted' && e.fallback && e.fallback.from === 'cultivate').length,
    phases: world.eventLog.filter((e) => e.type === 'phaseNotice').map((e) => ({ tick: e.tick, id: e.phaseId })),
    endings: world.eventLog.filter((e) => e.type === 'ending' || e.type === 'evt-beast-crisis' || String(e.type).indexOf('evt-ending') === 0).length,
    organisationStatus: world.story.organisationStatus,
  };
}

function sameMarks(a, b) {
  if (a.length !== b.length) return `檢查點數量 ${a.length} ≠ ${b.length}`;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].tick !== b[i].tick || a[i].hash !== b[i].hash || a[i].rng !== b[i].rng) {
      return `tick ${a[i].tick}/${b[i].tick} 的 hash 或 RNG 不同`;
    }
  }
  return null;
}

function expectScript(run) {
  if (run.clock !== HORIZON) return `clock ${run.clock}，應為 ${HORIZON}`;
  if (run.breakthroughTick !== 2148) return `突破停在 ${run.breakthroughTick}，應為 2148`;
  if (run.breakthroughEvents !== 1) return `breakthroughResolved ${run.breakthroughEvents} 次`;
  if (run.endings !== 0) return '出現危機或結局';
  if (run.organisationStatus !== 'dojo') return '門派狀態被改寫';
  if (run.autonomyResumed !== 1) return `autonomyResumed ${run.autonomyResumed} 次，應為 1`;
  if (run.d7c < 1) return '沒有把滿修為的修行轉成休養';
  if (run.phases.map((p) => `${p.tick}:${p.id}`).join(',') !== '540:omen,1080:manifest,1800:surge') return '階段通知不對';
  if (run.revision !== run.clock + run.commands) return 'revision 與 tick、命令數不一致';
  const travel = run.snapshots[10];
  const work = run.snapshots[100];
  const pending = run.snapshots[450];
  if (!travel || !travel.activity || travel.activity.kind !== 'gather-material' || travel.activity.status !== 'traveling') return 'tick 10 不是在趕路採集';
  if (travel.pos.r !== 1 || travel.pos.c !== 2) return 'tick 10 的位置不是走完第一格';
  if (!work || work.activity.kind !== 'gather-material' || work.activity.status !== 'working' || work.activity.unitsDone !== 1) return 'tick 100 不是在做第一個採集單位';
  if (!pending || pending.activity.kind !== 'build' || pending.activity.status !== 'working') return 'tick 450 不是在建造';
  if (!pending.manual || pending.manual.kind !== 'rest' || pending.manual.status !== 'pending') return 'tick 450 沒有掛著休養';
  if (run.breakthroughs === 1 && (run.cultivation !== 100 || run.injury !== 0)) return '成功提升後修為或傷勢不對';
  if (run.breakthroughs === 0 && (run.cultivation !== 70 || run.injury !== 15)) return '失敗後修為或傷勢不對';
  if (run.world.inventory['breakthrough-pill'] !== 0) return '這份腳本不該有丹';
  if (!run.world.activities.some((a) => a.kind === 'build' && a.status === 'done' && a.target.facilityType === 'alchemyRoom')) return '丹房沒有完工';
  return null;
}

function resumeChecks(index, full) {
  const problems = [];
  for (const tick of CHECKPOINTS) {
    const mid = tick === HORIZON ? full : play(index, 'step', { until: tick });
    if (!mid.ok) {
      problems.push({ seed: seedName(index), tick, reason: mid.reason });
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
    if (Realtime.hashWorld(parsed.state) !== Realtime.hashWorld(mid.world)) {
      problems.push({ seed: seedName(index), tick, reason: '存讀當下 hash 不同' });
      continue;
    }
    const cont = play(index, 'step', { world: parsed.state });
    if (!cont.ok || cont.hash !== full.hash || cont.rng !== full.rng) {
      problems.push({ seed: seedName(index), tick, reason: cont.ok ? '存讀後續與未中斷路徑不同' : cont.reason });
    }
  }
  return problems;
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
      if (!run.ok) failures.push({ seed: seedName(i), mode, code: run.code, reason: run.reason, tick: run.tick, commandId: run.commandId });
    }
    const base = runs.step;
    if (base && base.ok) {
      const shape = expectScript(base);
      if (shape) failures.push({ seed: seedName(i), mode: 'step', reason: shape });
      for (const mode of MODE_NAMES) {
        if (mode === 'step' || !runs[mode].ok) continue;
        const diff = sameMarks(base.marks, runs[mode].marks);
        if (diff || runs[mode].hash !== base.hash) failures.push({ seed: seedName(i), mode, reason: diff || '最終 hash 不同' });
      }
      if (RESUME_SEEDS.includes(i)) failures.push(...resumeChecks(i, base));
      rows.push({
        seed: base.seed, templateId: base.templateId, cultivation: base.cultivation, breakthroughs: base.breakthroughs,
        injury: base.injury, material: base.material, hash: base.hash, revision: base.revision, commands: base.commands,
        breakthroughTick: base.breakthroughTick, autonomyResumed: base.autonomyResumed, d7c: base.d7c,
        policy: base.policy.breakthrough,
      });
    }
  }
  return { ok: failures.length === 0, script: SCRIPT_ID, failures, rows, ms: Date.now() - started };
}

function main(argv) {
  const opts = { matrix: false, seed: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--matrix') opts.matrix = true;
    else if (a === '--seed') opts.seed = argv[++i];
    else {
      process.stderr.write(`未知參數 ${a}\n用法：node sect-chronicle/tools/rt-replay.js --matrix | --seed rt-dev-000\n`);
      return 2;
    }
  }
  if (!opts.matrix && !opts.seed) {
    process.stderr.write('用法：node sect-chronicle/tools/rt-replay.js --matrix | --seed rt-dev-000\n');
    return 2;
  }
  if (opts.seed) {
    const match = /^rt-dev-(\d{3})$/.exec(opts.seed);
    const index = match ? Number(match[1]) : -1;
    if (index < 0 || index >= SEED_COUNT) {
      process.stderr.write('seed 必須是 rt-dev-000 到 rt-dev-019\n');
      return 2;
    }
    const run = play(index, 'full');
    if (!run.ok) {
      process.stderr.write(`${JSON.stringify(run)}\n`);
      return 1;
    }
    const shape = expectScript(run);
    process.stdout.write(`${JSON.stringify({
      seed: run.seed, hash: run.hash, clock: run.clock, cultivation: run.cultivation, breakthroughs: run.breakthroughs,
      injury: run.injury, material: run.material, breakthroughTick: run.breakthroughTick, shape,
    })}\n`);
    return shape ? 1 : 0;
  }
  const result = replayMatrix();
  for (const row of result.rows) process.stdout.write(`${JSON.stringify(row)}\n`);
  process.stdout.write(`${JSON.stringify({ ok: result.ok, script: result.script, seeds: result.rows.length, failures: result.failures.length, ms: result.ms })}\n`);
  if (!result.ok) process.stderr.write(`${JSON.stringify(result.failures, null, 2)}\n`);
  return result.ok ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = {
  SCRIPT_ID, HORIZON, CHECKPOINTS, MODES, MODE_NAMES, ASK_POLICY, CUSTOM_POLICY,
  optionsForIndex, seedName, policyFor, commandsFor, play, replayMatrix,
};
