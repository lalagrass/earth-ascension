// 武俠小鎮 W0：無頭模擬（#549 第 5 節）。
// 用法：npm run wuxia:headless -- --seed 7 --minutes 30 --out /tmp/a.json [--journal x.jsonl] [--agents 5] [--verbose]
// 從 data/wuxia/ 與上游預設地圖建初始世界 → 每 step 呼叫 simulateStep、餵 inputs、跑 ticks →
// 把 pendingOperations 交給「規則替身」立即產生回應 input（漫遊用 rng、對話用模板句、不打 LLM）。
// --minutes 是引擎時間（牆鐘分鐘，1 step = 1 秒），不是遊戲時辰。
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as map from '../../data/gentle';
import { Descriptions } from '../../data/characters';
import { WorldMap } from '../../convex/aiTown/worldMap';
import {
  ACTIVITIES,
  ACTIVITY_COOLDOWN,
  CONVERSATION_COOLDOWN,
  PLAYER_CONVERSATION_COOLDOWN,
} from '../../convex/constants';
import { distance } from '../../convex/util/geometry';
import { initWuxiaState, defaultWuxiaConfig } from '../../convex/wuxia/state';
import { initElements } from '../../convex/wuxia/registry';
import { makeRng } from '../../convex/wuxia/rng';
import { conversationTemplate } from '../../convex/wuxia/templates';
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

export type HeadlessOptions = { seed: number; minutes: number; agents: number };

export function initialSnapshot(opts: HeadlessOptions): Snapshot {
  const wuxia = initWuxiaState({ ...defaultWuxiaConfig, seed: opts.seed });
  initElements(wuxia);
  return {
    worldId: 'headless-world',
    engineId: 'headless-engine',
    generation: 0,
    engine: { currentTime: HEADLESS_EPOCH, generationNumber: 0, running: true },
    gameState: {
      world: { nextId: 0, agents: [], conversations: [], players: [], wuxia },
      playerDescriptions: [],
      agentDescriptions: [],
      worldMap: {
        width: map.mapwidth,
        height: map.mapheight,
        tileSetUrl: map.tilesetpath,
        tileSetDimX: map.tilesetpxw,
        tileSetDimY: map.tilesetpxh,
        tileDim: map.tiledim,
        bgTiles: map.bgtiles,
        objectTiles: map.objmap,
        animatedSprites: map.animatedsprites,
      },
    },
  };
}

type Pending = { received: number; seq: number; name: string; args: any };

export function runHeadless(opts: HeadlessOptions) {
  const snapshot = initialSnapshot(opts);
  const game = createGame(snapshot);
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
  for (let i = 0; i < opts.agents; i++) {
    schedule(HEADLESS_EPOCH, 'createAgent', { descriptionIndex: i % Descriptions.length });
  }

  // participatedTogether 的替身（findConversationCandidate 要用）
  const lastTogether = new Map<string, number>();
  const messages: Array<{ t: number; conversationId: string; author: string; text: string }> = [];
  const stats = {
    inputs: 0,
    operations: {} as Record<string, number>,
    conversationsStarted: 0,
    conversationsEnded: 0,
    messages: 0,
    activities: 0,
    wanders: 0,
  };
  const steps: JournalStep[] = [];
  const checkpoints: Array<{ step: number; t: number; hash: string }> = [];
  const traces = new Map<string, Array<{ x: number; y: number }>>();

  const nameOf = (playerId: string) =>
    game.playerDescriptions.get(playerId as any)?.name ?? playerId;

  const totalSteps = Math.round((opts.minutes * 60_000) / STEP_MS);
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
        const text = conversationTemplate(args.type, actionRng(), {
          other: nameOf(args.otherPlayerId),
        });
        messages.push({
          t: sent,
          conversationId: args.conversationId,
          author: nameOf(args.playerId),
          text,
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
      } else {
        throw new Error(`headless: unknown operation ${op.name}`);
      }
    }
    for (const p of game.world.players.values()) {
      const t = traces.get(p.id) ?? [];
      t.push({ x: p.position.x, y: p.position.y });
      traces.set(p.id, t);
    }
    if (k % 60 === 0 || k === totalSteps) {
      checkpoints.push({ step: k, t: now, hash: result.step.hash });
    }
  }
  stats.inputs = queue.length;

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
    agents: opts.agents,
    epoch: HEADLESS_EPOCH,
    steps: steps.length,
    finalHash,
    enabledElements: Object.keys(game.world.wuxia!.enabled).filter(
      (k) => game.world.wuxia!.enabled[k],
    ),
    stats,
    checkpoints,
    players,
    sampleMessages: messages.slice(0, 10),
  };
  return { snapshot, queue, steps, summary, finalHash, traces, game };
}

/** 自製的軌跡圖（SVG）：灰格是地圖上不能走的物件格，彩線是每個人的移動軌跡。不含任何上游美術。 */
export function traceSvg(run: ReturnType<typeof runHeadless>, title: string): string {
  const cell = 12;
  const w = map.mapwidth;
  const h = map.mapheight;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w * cell}" height="${h * cell + 24}" viewBox="0 0 ${w * cell} ${h * cell + 24}">`,
    `<rect width="100%" height="100%" fill="#f6f1e4"/>`,
    `<text x="4" y="16" font-family="sans-serif" font-size="13" fill="#333">${title}</text>`,
    `<g transform="translate(0,24)">`,
  );
  for (const layer of map.objmap as number[][][]) {
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

export function journalLines(
  snapshot: Snapshot,
  inputs: JournalInput[],
  steps: JournalStep[],
  finalHash: string,
  meta: Record<string, unknown>,
): string[] {
  const lines = [
    JSON.stringify({ type: 'header', version: 1, ...meta }),
    JSON.stringify({ type: 'snapshot', ...snapshot }),
  ];
  for (const i of inputs) lines.push(JSON.stringify({ type: 'input', ...i }));
  for (const s of steps) lines.push(JSON.stringify({ type: 'step', ...s }));
  lines.push(JSON.stringify({ type: 'final', hash: finalHash, steps: steps.length }));
  return lines;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const opts: HeadlessOptions = {
    seed: Number(args.seed ?? defaultWuxiaConfig.seed),
    minutes: Number(args.minutes ?? 30),
    agents: Number(args.agents ?? Descriptions.length),
  };
  if (!Number.isFinite(opts.seed) || !(opts.minutes > 0) || !(opts.agents > 0)) {
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
        `W0 headless seed ${opts.seed}, ${opts.minutes} min, hash ${finalHash.slice(0, 16)}…`,
      ),
    );
  }
  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, JSON.stringify(summary, null, 2) + '\n');
  }
  if (args.journal) {
    mkdirSync(dirname(args.journal), { recursive: true });
    const lines = journalLines(snapshot, queue, steps, finalHash, {
      source: 'headless',
      seed: opts.seed,
      minutes: opts.minutes,
      agents: opts.agents,
    });
    writeFileSync(args.journal, lines.join('\n') + '\n');
  }
  process.stdout.write(
    `seed=${opts.seed} minutes=${opts.minutes} steps=${summary.steps} ` +
      `conversations=${summary.stats.conversationsStarted} messages=${summary.stats.messages}\n`,
  );
  process.stdout.write(`hash ${finalHash}\n`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('headless.ts')) {
  main();
}
