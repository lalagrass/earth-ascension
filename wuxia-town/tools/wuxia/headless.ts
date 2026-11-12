// 武俠小鎮 W0：無頭模擬（#549 第 5 節）。
// 用法：npm run wuxia:headless -- --seed 7 --minutes 30 --out /tmp/a.json [--journal x.jsonl] [--agents 5] [--verbose]
//        [--days 3]（W3：跑 3 個遊戲日，輸出含每人時間表與生活檢查，給 wuxia:day-report）
//        [--off w01-skin] [--on id,id]（覆寫 world.config.json 的元素開關）[--map town|gentle]（只給對照實驗用）
//        [--state out.json]（W1：匯出最後狀態給 wuxia:shot 用）
//        [--drop-memory id,id]（W5：這些 id 的事件記憶不寫入，mind-trace 的因果對照用）
//        [--force-event bandit --day 5]（W8：第 5 日卯時強制開始某事件）[--no-rumor-out]（W8：行商聽到的傳聞不算出鎮）
// 從 data/wuxia/ 與上游預設地圖建初始世界 → 每 step 呼叫 simulateStep、餵 inputs、跑 ticks →
// 把 pendingOperations 交給「規則替身」立即產生回應 input（漫遊用 rng、對話用模板句、不打 LLM）。
// --minutes 是引擎時間（牆鐘分鐘，1 step = 1 秒），不是遊戲時辰。
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { WorldMap } from '../../convex/aiTown/worldMap';
import {
  ACTIVITIES,
  ACTIVITY_COOLDOWN,
  CONVERSATION_COOLDOWN,
  PLAYER_CONVERSATION_COOLDOWN,
} from '../../convex/constants';
import { distance } from '../../convex/util/geometry';
import { initWuxiaState, defaultWuxiaConfig } from '../../convex/wuxia/state';
import { initElements, isEnabled } from '../../convex/wuxia/registry';
import { descriptionsFor, folkTemplate, W02_FOLK } from '../../convex/wuxia/w02_folk';
import { serializedMapFor } from '../../convex/wuxia/w01_skin';
import { makeRng } from '../../convex/wuxia/rng';
import { W06_SPAR, SparState } from '../../convex/wuxia/w06_spar/data';
import { conversationTemplate } from '../../convex/wuxia/templates';
import { gameMinutes, readClock } from '../../convex/wuxia/clock';
import { LifeTracer, conversationPlaceStats } from './life-trace';
import { DojoTracer } from './dojo-trace';
import { MindTracer } from './mind-trace';
import { BondTracer } from './bond-tracer';
import { W05_MIND } from '../../convex/wuxia/w05_mind/data';
import { W08_JIANGHU, JianghuState, EventKind } from '../../convex/wuxia/w08_jianghu/data';
import { W03_LIFE, LifeState } from '../../convex/wuxia/w03_life';
import {
  JournalInput,
  JournalStep,
  Snapshot,
  createGame,
  parseArgs,
  quietConsole,
  runOneStep,
  selectInputs,
} from './sim';

export const HEADLESS_EPOCH = Date.UTC(2026, 0, 1, 0, 0, 0); // 固定起點，不讀系統時鐘
export const STEP_MS = 1000;

export type HeadlessOptions = {
  seed: number;
  minutes: number;
  /** 人數；不給就是人物表的人數（W2 w02-folk 開：6；關：上游 5） */
  agents?: number;
  /** 覆寫 world.config.json 的元素開關（例如 { 'w01-skin': false }） */
  elements?: Record<string, boolean>;
  /** 對照實驗用：強制用某張地圖，不管 w01-skin 開關 */
  map?: 'town' | 'gentle';
  /** W1：跑到遊戲時鐘到達這個遊戲分鐘為止（取代 minutes；需要有元素開啟才有時鐘） */
  untilGameMinute?: number;
  /** W3：記錄每人每遊戲分鐘的地點與活動（day-report 用）；--days 時自動開 */
  trace?: boolean;
  /** W5：這些 id 的事件記憶不寫入（mind-trace --drop-memory） */
  dropMemories?: number[];
  /** W6：每一步跑完後呼叫（wuxia:shot --gif 逐步取格、擺旁觀者用）；回傳 true 就停。不給時行為與 hash 不變 */
  onStep?: (game: ReturnType<typeof createGame>, now: number, hash: string) => boolean | void;
  /** W8：第 day 日卯時強制開始某事件（對照實驗；不給就不寫這個欄位，hash 不變） */
  forceEvent?: { kind: EventKind; day: number };
  /** W8：行商聽到的傳聞不算出鎮（#562 W8-12 驗收 --no-rumor-out） */
  noRumorOut?: boolean;
};

export function initialSnapshot(opts: HeadlessOptions): Snapshot {
  const wuxia = initWuxiaState({
    ...defaultWuxiaConfig,
    seed: opts.seed,
    elements: { ...defaultWuxiaConfig.elements, ...(opts.elements ?? {}) },
  });
  initElements(wuxia);
  // W5：因果對照實驗（mind-trace --drop-memory）；不給就不寫這個欄位，hash 不變
  if (opts.dropMemories?.length && wuxia.elements[W05_MIND])
    (wuxia.elements[W05_MIND] as any).drop = [...opts.dropMemories];
  // W8：對照實驗（--force-event、--no-rumor-out）；不給就不寫，hash 不變
  const jh = wuxia.elements[W08_JIANGHU] as JianghuState | undefined;
  if (jh && opts.forceEvent) jh.force = { ...opts.forceEvent };
  if (jh && opts.noRumorOut) jh.noRumorOut = true;
  const worldMap =
    opts.map === undefined
      ? serializedMapFor(wuxia.enabled)
      : serializedMapFor({ 'w01-skin': opts.map === 'town' });
  return {
    worldId: 'headless-world',
    engineId: 'headless-engine',
    generation: 0,
    engine: { currentTime: HEADLESS_EPOCH, generationNumber: 0, running: true },
    gameState: {
      world: { nextId: 0, agents: [], conversations: [], players: [], wuxia },
      playerDescriptions: [],
      agentDescriptions: [],
      worldMap,
    },
  };
}

export type HeadlessMessage = {
  t: number;
  conversationId: string;
  author: string;
  to: string;
  stage: 'start' | 'continue' | 'leave';
  text: string;
  /** W2：跟 live 訊息的 metadata 同形狀；無頭模擬一律是模板句 */
  metadata: { guard: 'template'; reasons: string[][]; attempts: number; cause: 'headless' };
};

type Pending = { received: number; seq: number; name: string; args: any };

export function runHeadless(opts: HeadlessOptions) {
  const snapshot = initialSnapshot(opts);
  const game = createGame(snapshot);
  // W2：w02-folk 開時人物用 data/wuxia/characters.json、模板句依人物口吻（data/wuxia/templates/）
  const folkOn = isEnabled(snapshot.gameState.world.wuxia, W02_FOLK);
  const descriptions = descriptionsFor(folkOn);
  const agents = opts.agents ?? descriptions.length;
  // 規則替身（取代 action）自己的亂數，跟引擎的 game.rng() 分開。
  const actionRng = makeRng(opts.seed * 7919 + 1);
  const delay = (min: number, max: number) => Math.floor(min + actionRng() * (max - min));

  const queue: JournalInput[] = [];
  const future: Pending[] = [];
  let seq = 0;
  let nextNumber = 0;
  const schedule = (received: number, name: string, args: any) =>
    future.push({ received, seq: seq++, name, args });
  const admit = (upTo: number) => {
    future.sort((a, b) => a.received - b.received || a.seq - b.seq);
    while (future.length && future[0].received <= upTo) {
      const p = future.shift()!;
      queue.push({ number: nextNumber++, name: p.name, args: p.args, received: p.received });
    }
  };

  // 跟 init.ts 一樣：世界建好後送 createAgent。
  for (let i = 0; i < agents; i++) {
    schedule(HEADLESS_EPOCH, 'createAgent', { descriptionIndex: i % descriptions.length });
  }

  // participatedTogether 的替身（findConversationCandidate 要用）
  const lastTogether = new Map<string, number>();
  const messages: HeadlessMessage[] = [];
  const lastLine = new Map<string, string>();
  const stats = {
    inputs: 0,
    operations: {} as Record<string, number>,
    conversationsStarted: 0,
    conversationsEnded: 0,
    messages: 0,
    activities: 0,
    wanders: 0,
    /** W6：切磋旁白 operation 次數（＝打完的場次） */
    spars: undefined as number | undefined,
    /** W8：亥時鎮誌改寫 operation 次數 */
    chronicles: undefined as number | undefined,
  };
  const steps: JournalStep[] = [];
  const checkpoints: Array<{ step: number; t: number; hash: string }> = [];
  const traces = new Map<string, Array<{ x: number; y: number }>>();
  const tracer = opts.trace ? new LifeTracer() : undefined;
  // W4：練功紀錄（w04-dojo 開啟時才有內容）
  const dojoTracer = opts.trace ? new DojoTracer() : undefined;
  // W5：心念紀錄（w05-mind 開啟時才有內容）
  const mindTracer = opts.trace ? new MindTracer() : undefined;
  // W7：關係與拜師紀錄（w07-bond 開啟時才有內容）
  const bondTracer = opts.trace ? new BondTracer() : undefined;

  const nameOf = (playerId: string) =>
    game.playerDescriptions.get(playerId as any)?.name ?? playerId;

  const totalSteps =
    opts.untilGameMinute === undefined ? Math.round((opts.minutes * 60_000) / STEP_MS) : Infinity;
  const clockReached = () => {
    const w = game.world.wuxia!;
    return (
      w.clockEpoch !== undefined &&
      gameMinutes(game.engine.currentTime!, w.clockEpoch, w.timeScale) >= opts.untilGameMinute!
    );
  };
  for (let k = 1; k <= totalSteps; k++) {
    const now = HEADLESS_EPOCH + k * STEP_MS;
    admit(now);
    const inputs = selectInputs(game, queue, undefined, now);
    const result = runOneStep(game, inputs, now);
    steps.push(result.step);
    const stepEnd = result.step.endTs;

    for (const c of result.endedConversations) {
      stats.conversationsEnded++;
      for (const a of c.participants) {
        for (const b of c.participants) {
          if (a !== b) lastTogether.set(`${a}|${b}`, stepEnd);
        }
      }
    }

    for (const op of result.agentOperations) {
      stats.operations[op.name] = (stats.operations[op.name] ?? 0) + 1;
      const args = op.args;
      if (op.name === 'agentDoSomething') {
        // 對應 agentOperations.ts 的 agentDoSomething（規則不變，只把隨機換成 actionRng）
        const actionNow = now + delay(20, 300);
        const { player, agent } = args;
        const worldMap = new WorldMap(args.map);
        const justLeftConversation =
          agent.lastConversation && actionNow < agent.lastConversation + CONVERSATION_COOLDOWN;
        const recentlyAttemptedInvite =
          agent.lastInviteAttempt && actionNow < agent.lastInviteAttempt + CONVERSATION_COOLDOWN;
        const recentActivity =
          player.activity && actionNow < player.activity.until + ACTIVITY_COOLDOWN;
        const sent = actionNow + delay(0, 1000);
        if (!player.pathfinding) {
          if (recentActivity || justLeftConversation) {
            stats.wanders++;
            schedule(sent, 'finishDoSomething', {
              operationId: args.operationId,
              agentId: agent.id,
              destination: {
                x: 1 + Math.floor(actionRng() * (worldMap.width - 2)),
                y: 1 + Math.floor(actionRng() * (worldMap.height - 2)),
              },
            });
          } else {
            stats.activities++;
            const activity = ACTIVITIES[Math.floor(actionRng() * ACTIVITIES.length)];
            schedule(sent, 'finishDoSomething', {
              operationId: args.operationId,
              agentId: agent.id,
              activity: {
                description: activity.description,
                emoji: activity.emoji,
                until: sent + activity.duration,
              },
            });
          }
          continue;
        }
        let invitee: string | undefined;
        if (!(justLeftConversation || recentlyAttemptedInvite)) {
          // 對應 findConversationCandidate（含上游「都用自己位置排序」的行為）
          const candidates: Array<{ id: string; position: any }> = [];
          for (const other of args.otherFreePlayers) {
            const ended = lastTogether.get(`${player.id}|${other.id}`);
            if (ended !== undefined && actionNow < ended + PLAYER_CONVERSATION_COOLDOWN) continue;
            candidates.push({ id: other.id, position: player.position });
          }
          candidates.sort(
            (a, b) => distance(a.position, player.position) - distance(b.position, player.position),
          );
          invitee = candidates[0]?.id;
        }
        if (invitee) stats.conversationsStarted++;
        schedule(sent, 'finishDoSomething', {
          operationId: args.operationId,
          agentId: agent.id,
          invitee,
        });
      } else if (op.name === 'agentGenerateMessage') {
        // LLM 的替身：模板句，延遲 1～3 秒
        const sent = now + delay(1000, 3000);
        const speaker = nameOf(args.playerId);
        const other = nameOf(args.otherPlayerId);
        // 每則訊息只抽一次 actionRng()（開關不改 rng 消耗，見 folk-diff）
        const r = actionRng();
        const prev = lastLine.get(`${args.conversationId}|${speaker}`);
        const text = folkOn
          ? folkTemplate(speaker, args.type, r, { other }, prev)
          : conversationTemplate(args.type, r, { other });
        lastLine.set(`${args.conversationId}|${speaker}`, text);
        messages.push({
          t: sent,
          conversationId: args.conversationId,
          author: speaker,
          to: other,
          stage: args.type,
          text,
          metadata: { guard: 'template', reasons: [], attempts: 0, cause: 'headless' },
        });
        stats.messages++;
        schedule(sent, 'agentFinishSendingMessage', {
          conversationId: args.conversationId,
          agentId: args.agentId,
          timestamp: sent,
          leaveConversation: args.type === 'leave',
          operationId: args.operationId,
        });
      } else if (op.name === 'agentRememberConversation') {
        const sent = now + delay(300, 1300) + delay(0, 1000);
        schedule(sent, 'finishRememberConversation', {
          agentId: args.agentId,
          operationId: args.operationId,
        });
      } else if (op.name === 'wuxiaChronicleRewrite') {
        // W8：亥時鎮誌改寫。無頭模擬不打 LLM：引擎已放了模板段落，不送 input（等同 LLM 失敗）
        stats.chronicles = (stats.chronicles ?? 0) + 1;
      } else if (op.name === 'wuxiaSparNarrate') {
        // W6：切磋旁白。無頭模擬不打 LLM：引擎打完那一刻已放了模板句，不送 input（等同 LLM 失敗）
        stats.spars = (stats.spars ?? 0) + 1;
      } else {
        throw new Error(`headless: unknown operation ${op.name}`);
      }
    }
    tracer?.sample(game, now);
    dojoTracer?.sample(game, now);
    mindTracer?.sample(game, now);
    bondTracer?.sample(game, now);
    for (const p of game.world.players.values()) {
      const t = traces.get(p.id) ?? [];
      t.push({ x: p.position.x, y: p.position.y });
      traces.set(p.id, t);
    }
    const stop = opts.onStep?.(game, now, result.step.hash) === true;
    const done = stop || (opts.untilGameMinute !== undefined && clockReached());
    if (k % 60 === 0 || k === totalSteps || done) {
      checkpoints.push({ step: k, t: now, hash: result.step.hash });
    }
    if (done) break;
    // W4：365 日（525600 分）也要能跑，安全上限改成目標分鐘數的 2 倍＋10 萬
    if (opts.untilGameMinute !== undefined && k > opts.untilGameMinute * 2 + 100_000) {
      throw new Error('headless: game clock never reached target (no element enabled?)');
    }
  }
  stats.inputs = queue.length;
  mindTracer?.finish(game);
  bondTracer?.finish(game);

  const finalHash = steps[steps.length - 1].hash;
  const players = [...game.world.players.values()].map((p) => ({
    id: p.id,
    name: nameOf(p.id),
    position: p.position,
    activity: p.activity?.description,
  }));
  const summary = {
    tool: 'wuxia-town headless',
    version: 1,
    seed: opts.seed,
    minutes: opts.minutes,
    agents,
    epoch: HEADLESS_EPOCH,
    steps: steps.length,
    finalHash,
    enabledElements: Object.keys(game.world.wuxia!.enabled).filter(
      (k) => game.world.wuxia!.enabled[k],
    ),
    map: game.worldMap.tileSetUrl,
    clock:
      game.world.wuxia!.clockEpoch === undefined
        ? null
        : readClock(
            gameMinutes(
              game.engine.currentTime!,
              game.world.wuxia!.clockEpoch,
              game.world.wuxia!.timeScale,
            ),
          ),
    stats,
    checkpoints,
    players,
    sampleMessages: messages.slice(0, 10),
    // W3：生活時間表與全程檢查（--days 或 trace 時才有）
    life: tracer
      ? {
          on: !!game.world.wuxia!.enabled[W03_LIFE],
          days: opts.untilGameMinute === undefined ? undefined : opts.untilGameMinute / 1440,
          checks: tracer.checks,
          timeline: tracer.timeline,
          finalNeeds: lifeSummary(game),
          logTail: ((game.world.wuxia!.elements[W03_LIFE] as LifeState | undefined)?.log ?? []).slice(-20),
          conversations: conversationPlaceStats(tracer.conversations),
        }
      : undefined,
    // W4：練功紀錄（--days 或 trace 且 w04-dojo 開時才有）
    dojo: dojoTracer?.trace.on ? dojoTracer.trace : undefined,
    // W5：心念紀錄（--days 或 trace 且 w05-mind 開時才有）
    mind: mindTracer?.trace.on ? mindTracer.trace : undefined,
    // W6：切磋紀錄（--days 或 trace 且 w06-spar 開時才有）
    spar: opts.trace ? sparSummary(game) : undefined,
    // W7：關係與拜師（--days 或 trace 且 w07-bond 開時才有）
    bond: bondTracer?.trace.on ? bondTracer.trace : undefined,
    // W8：江湖事件、傳聞與鎮誌（--days 或 trace 且 w08-jianghu 開時才有）
    jianghu: opts.trace ? jianghuSummary(game) : undefined,
  };
  return { snapshot, queue, steps, summary, finalHash, traces, game, messages };
}

/** W6：打完的場次（最近 200 場）與還在進行的場次。 */
function sparSummary(game: any) {
  const w = game.world.wuxia;
  if (!w?.enabled?.[W06_SPAR]) return undefined;
  const st = w.elements[W06_SPAR] as SparState | undefined;
  if (!st) return undefined;
  return { on: true, history: st.history, active: st.active.length };
}

/** W8：整份 w08-jianghu 狀態（事件、導演擲骰、傳聞、路徑、出鎮、鎮誌）＋人物 id → 名字。 */
function jianghuSummary(game: any) {
  const w = game.world.wuxia;
  if (!w?.enabled?.[W08_JIANGHU]) return undefined;
  const st = w.elements[W08_JIANGHU] as JianghuState | undefined;
  if (!st) return undefined;
  return { on: true, ...JSON.parse(JSON.stringify(st)) };
}

function lifeSummary(game: any) {
  const life = game.world.wuxia?.elements?.[W03_LIFE] as LifeState | undefined;
  if (!life) return undefined;
  return {
    people: Object.values(life.people).map((p) => ({ cid: p.cid, needs: p.needs, cur: p.cur?.act })),
    stock: life.stock,
  };
}

/** 自製的軌跡圖（SVG）：灰格是地圖上不能走的物件格，彩線是每個人的移動軌跡。不含任何上游美術。 */
export function traceSvg(run: ReturnType<typeof runHeadless>, title: string): string {
  const cell = 12;
  const worldMap = run.snapshot.gameState.worldMap;
  const w = worldMap.width;
  const h = worldMap.height;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w * cell}" height="${h * cell + 24}" viewBox="0 0 ${w * cell} ${h * cell + 24}">`,
    `<rect width="100%" height="100%" fill="#f6f1e4"/>`,
    `<text x="4" y="16" font-family="sans-serif" font-size="13" fill="#333">${title}</text>`,
    `<g transform="translate(0,24)">`,
  );
  for (const layer of worldMap.objectTiles as number[][][]) {
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        if (layer[x][y] !== -1) {
          parts.push(
            `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#c9c2b0"/>`,
          );
        }
      }
    }
  }
  const colors = [
    '#b22222',
    '#1f6f8b',
    '#2e8b57',
    '#8b5a2b',
    '#6a3d9a',
    '#d2691e',
    '#008080',
    '#555',
  ];
  let i = 0;
  for (const [id, pts] of run.traces) {
    const color = colors[i++ % colors.length];
    const d = pts
      .map(
        (p, j) =>
          `${j ? 'L' : 'M'}${(p.x * cell + cell / 2).toFixed(1)},${(p.y * cell + cell / 2).toFixed(1)}`,
      )
      .join('');
    parts.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="0.8"/>`,
    );
    const last = pts[pts.length - 1];
    const name = run.game.playerDescriptions.get(id as any)?.name ?? id;
    parts.push(
      `<circle cx="${last.x * cell + cell / 2}" cy="${last.y * cell + cell / 2}" r="4" fill="${color}"/>`,
      `<text x="${last.x * cell + cell}" y="${last.y * cell + cell / 2}" font-family="sans-serif" font-size="11" fill="${color}">${name}</text>`,
    );
  }
  parts.push('</g></svg>');
  return parts.join('\n') + '\n';
}

/** W1：匯出畫面要用的狀態（wuxia:shot 讀這份，不需要 Convex）。 */
export function exportState(run: ReturnType<typeof runHeadless>) {
  const game = run.game;
  return {
    tool: 'wuxia-town headless state',
    version: 1,
    seed: run.summary.seed,
    hash: run.finalHash,
    engineTime: game.engine.currentTime,
    world: game.world.serialize(),
    playerDescriptions: [...game.playerDescriptions.values()].map((d) => d.serialize()),
    agentDescriptions: [...game.agentDescriptions.values()].map((d) => d.serialize()),
    worldMap: game.worldMap.serialize(),
    clock: run.summary.clock,
  };
}

export function journalLines(
  snapshot: Snapshot,
  inputs: JournalInput[],
  steps: JournalStep[],
  finalHash: string,
  meta: Record<string, unknown>,
  messages: unknown[] = [],
): string[] {
  const lines = [
    JSON.stringify({ type: 'header', version: 1, ...meta }),
    JSON.stringify({ type: 'snapshot', ...snapshot }),
  ];
  for (const i of inputs) lines.push(JSON.stringify({ type: 'input', ...i }));
  // W2：對話訊息（不進狀態 hash，只給 sample-dialogue 讀）
  for (const m of messages) lines.push(JSON.stringify({ type: 'message', ...(m as object) }));
  for (const s of steps) lines.push(JSON.stringify({ type: 'step', ...s }));
  lines.push(JSON.stringify({ type: 'final', hash: finalHash, steps: steps.length }));
  return lines;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const elements: Record<string, boolean> = {};
  for (const id of String(args.off ?? '').split(',').filter(Boolean)) elements[id] = false;
  for (const id of String(args.on ?? '').split(',').filter(Boolean)) elements[id] = true;
  const opts: HeadlessOptions = {
    seed: Number(args.seed ?? defaultWuxiaConfig.seed),
    minutes: Number(args.minutes ?? 30),
    agents: args.agents === undefined ? undefined : Number(args.agents),
    elements,
    map: args.map === undefined ? undefined : args.map === 'town' ? 'town' : 'gentle',
    untilGameMinute:
      args.days !== undefined
        ? Number(args.days) * 1440
        : args['game-minute'] === undefined
          ? undefined
          : Number(args['game-minute']),
    trace: args.days !== undefined || !!args.trace,
    forceEvent:
      args['force-event'] === undefined
        ? undefined
        : { kind: String(args['force-event']) as EventKind, day: Number(args.day ?? 1) },
    noRumorOut: !!args['no-rumor-out'],
    dropMemories:
      args['drop-memory'] === undefined
        ? undefined
        : String(args['drop-memory']).split(',').filter(Boolean).map(Number),
  };
  if (
    !Number.isFinite(opts.seed) ||
    !(opts.minutes > 0) ||
    (opts.agents !== undefined && !(opts.agents > 0))
  ) {
    throw new Error('usage: headless --seed N --minutes M [--agents K] --out run.json');
  }
  const run = runHeadless(opts);
  const { snapshot, queue, steps, summary, finalHash } = run;
  if (args.svg) {
    mkdirSync(dirname(args.svg), { recursive: true });
    writeFileSync(
      args.svg,
      traceSvg(
        run,
        `headless seed ${opts.seed}, ${opts.minutes} min, hash ${finalHash.slice(0, 16)}…`,
      ),
    );
  }
  if (args.state) {
    mkdirSync(dirname(args.state), { recursive: true });
    writeFileSync(args.state, JSON.stringify(exportState(run)) + '\n');
  }
  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, JSON.stringify(summary, null, 2) + '\n');
  }
  if (args.journal) {
    mkdirSync(dirname(args.journal), { recursive: true });
    const lines = journalLines(
      snapshot,
      queue,
      steps,
      finalHash,
      {
        source: 'headless',
        seed: opts.seed,
        minutes: opts.minutes,
        agents: summary.agents,
      },
      run.messages,
    );
    writeFileSync(args.journal, lines.join('\n') + '\n');
  }
  process.stdout.write(
    `seed=${opts.seed} minutes=${opts.minutes} steps=${summary.steps} ` +
      `conversations=${summary.stats.conversationsStarted} messages=${summary.stats.messages}\n`,
  );
  if (summary.clock) {
    process.stdout.write(`clock ${summary.clock.label}（遊戲分鐘 ${summary.clock.gameMinute}）\n`);
  }
  process.stdout.write(`map ${summary.map}\n`);
  process.stdout.write(`hash ${finalHash}\n`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('headless.ts')) {
  main();
}
