// 武俠小鎮 A1：單機引擎的核心（#564 第 1 項）。無頭模擬（tools/wuxia/headless.ts）與瀏覽器 Web Worker（local 模式）
// 跑的是這同一份程式：建初始世界 → 每 step 餵 input、呼叫上游 simulateStep → 把 pendingOperations 交給「規則替身」
// 立即排回應 input（漫遊與活動用 actionRng、對話用模板句、不打 LLM）。
// 原本寫在 runHeadless 的迴圈裡（W0–W9），A1 原樣搬出來成為 Session；runHeadless 只剩 tracer／checkpoint／取樣。
// 規則替身自己的狀態（actionRng、排程中的 input、participatedTogether 替身、上一句台詞）也放在這裡，可以存檔、讀檔續跑。
// 這個檔不用 Node 專屬模組，也不讀系統亂數或牆鐘（wuxia:check:quick q4 會檢查）。
import { WorldMap } from '../../../convex/aiTown/worldMap';
import {
  ACTIVITIES,
  ACTIVITY_COOLDOWN,
  CONVERSATION_COOLDOWN,
  PLAYER_CONVERSATION_COOLDOWN,
} from '../../../convex/constants';
import { distance } from '../../../convex/util/geometry';
import { serializeMap } from '../../../convex/util/object';
import { initWuxiaState, defaultWuxiaConfig } from '../../../convex/wuxia/state';
import { initElements, isEnabled } from '../../../convex/wuxia/registry';
import { descriptionsFor, folkTemplate, W02_FOLK } from '../../../convex/wuxia/w02_folk';
import { serializedMapFor } from '../../../convex/wuxia/w01_skin';
import { RngState, nextFloat, seedRng } from '../../../convex/wuxia/rng';
import { conversationTemplate } from '../../../convex/wuxia/templates';
import { gameMinutes } from '../../../convex/wuxia/clock';
import { W05_MIND } from '../../../convex/wuxia/w05_mind/data';
import { W08_JIANGHU, JianghuState, EventKind } from '../../../convex/wuxia/w08_jianghu/data';
import type { Game } from '../../../convex/aiTown/game';
import { A2_MASTER, A2State } from '../../../convex/wuxia/a2_master/data';
import { applyScenario } from '../../../convex/wuxia/a2_master';
import { A3_SILENT, traitsOf } from '../../../convex/wuxia/a3_silent/data';
import type { A3State, Traits } from '../../../convex/wuxia/a3_silent/data';
import { applyPlay } from '../../../convex/wuxia/a4_play';
import {
  JournalInput,
  Snapshot,
  StepResult,
  createGame,
  runOneStep,
} from '../../../tools/wuxia/sim';

export const HEADLESS_EPOCH = Date.UTC(2026, 0, 1, 0, 0, 0); // 固定起點，不讀系統時鐘
export const STEP_MS = 1000;

export type WorldOptions = {
  seed: number;
  /** 人數；不給就是人物表的人數（W2 w02-folk 開：6；關：上游 5） */
  agents?: number;
  /** 覆寫 world.config.json 的元素開關（例如 { 'w01-skin': false }） */
  elements?: Record<string, boolean>;
  /** 對照實驗用：強制用某張地圖，不管 w01-skin 開關 */
  map?: 'town' | 'gentle';
  /** W5：這些 id 的事件記憶不寫入（mind-trace --drop-memory） */
  dropMemories?: number[];
  /** W8：第 day 日卯時強制開始某事件（對照實驗；不給就不寫這個欄位，hash 不變） */
  forceEvent?: { kind: EventKind; day: number };
  /** W8：行商聽到的傳聞不算出鎮（#562 W8-12 驗收 --no-rumor-out） */
  noRumorOut?: boolean;
  /** A2：劇本 master-open／master-selective／master-hidden／no-master（不給就是 master.json 的預設，不寫欄位） */
  scenario?: string;
  /** A2：大師第幾日進鎮（對照實驗；不給就是 master.json 的預設） */
  arriveDay?: number;
  /** A3：覆寫人格（例 { 'lin-sao': { ext: -1 } }，#574 驗收 C）；不給就不寫，hash 不變 */
  traits?: Record<string, Partial<Traits>>;
  /** A4：劇本 s1／s2／s3（大師態度、進鎮日、天數上限、三級目標）；playDays 覆寫天數上限（測試用）。不給就是自由玩，不寫欄位 */
  play?: string;
  playDays?: number;
};

export function initialSnapshot(opts: WorldOptions & Record<string, unknown>): Snapshot {
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
  // A2：劇本與進鎮日（a2-master 關閉時沒有這個狀態，不寫）
  const a2 = wuxia.elements[A2_MASTER] as A2State | undefined;
  if (a2 && opts.scenario) applyScenario(a2, opts.scenario);
  if (a2 && opts.arriveDay !== undefined) a2.arriveDay = opts.arriveDay;
  const a3 = wuxia.elements[A3_SILENT] as A3State | undefined;
  if (a3 && opts.traits) for (const [cid, t] of Object.entries(opts.traits)) a3.traits[cid] = { ...traitsOf(a3, cid), ...t };
  // A4：劇本（a4-play 關閉時沒有這個狀態，不寫）
  if (opts.play) applyPlay(wuxia, opts.play, { days: opts.playDays });
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

export type SessionStats = {
  inputs: number;
  operations: Record<string, number>;
  conversationsStarted: number;
  conversationsEnded: number;
  messages: number;
  activities: number;
  wanders: number;
  /** W6：切磋旁白 operation 次數（＝打完的場次） */
  spars: number | undefined;
  /** W8：亥時鎮誌改寫 operation 次數 */
  chronicles: number | undefined;
};

/** 規則替身的可存檔狀態（世界狀態以外、續跑需要的全部東西）。 */
export type SessionAux = {
  seed: number;
  k: number;
  actionRng: RngState;
  future: Pending[];
  seq: number;
  lastTogether: Array<[string, number]>;
  lastLine: Array<[string, string]>;
  stats: SessionStats;
};

/** 目前世界的完整快照（跟 initialSnapshot 同形狀，createGame 可以直接讀）。 */
export function snapshotOf(game: Game, generation: number): Snapshot {
  const { _id, _creationTime, ...engine } = game.engine as any;
  return {
    worldId: game.worldId as string,
    engineId: _id as string,
    generation,
    engine: structuredClone(engine),
    gameState: structuredClone({
      world: game.world.serialize(),
      playerDescriptions: serializeMap(game.playerDescriptions),
      agentDescriptions: serializeMap(game.agentDescriptions),
      worldMap: game.worldMap.serialize(),
    }),
  };
}

export type SessionOptions = {
  seed: number;
  agents?: number;
  /** 保留多少則模板台詞（給畫面看）；不給＝全部（無頭工具要全部） */
  keepMessages?: number;
};

export class Session {
  game: Game;
  /** 所有已送進引擎的 input（＝input journal；number 從 0 連號） */
  queue: JournalInput[];
  messages: HeadlessMessage[] = [];
  stats: SessionStats;
  /** 已跑的 step 數；下一步的 now = HEADLESS_EPOCH + (k + 1) * STEP_MS */
  k: number;
  readonly seed: number;
  private actionRng: RngState;
  private future: Pending[];
  private seq: number;
  private lastTogether: Map<string, number>;
  private lastLine: Map<string, string>;
  private readonly folkOn: boolean;
  private readonly keepMessages?: number;

  constructor(
    snapshot: Snapshot,
    opts: SessionOptions,
    resume?: { aux: SessionAux; queue: JournalInput[]; messages?: HeadlessMessage[] },
  ) {
    this.game = createGame(snapshot);
    // A1：無頭模擬與 Worker 不需要畫面用的位置緩衝（不進 hash）
    this.game.wuxiaRecordHistory = false;
    this.seed = opts.seed;
    this.keepMessages = opts.keepMessages;
    // W2：w02-folk 開時人物用 data/wuxia/characters.json、模板句依人物口吻（data/wuxia/templates/）
    this.folkOn = isEnabled(snapshot.gameState.world.wuxia, W02_FOLK);
    if (resume) {
      const a = resume.aux;
      this.k = a.k;
      this.actionRng = { ...a.actionRng };
      this.future = structuredClone(a.future);
      this.seq = a.seq;
      this.lastTogether = new Map(a.lastTogether);
      this.lastLine = new Map(a.lastLine);
      this.stats = structuredClone(a.stats);
      this.queue = structuredClone(resume.queue);
      this.messages = structuredClone(resume.messages ?? []);
      return;
    }
    this.k = 0;
    // 規則替身（取代 action）自己的亂數，跟引擎的 game.rng() 分開。
    this.actionRng = seedRng(opts.seed * 7919 + 1);
    this.future = [];
    this.seq = 0;
    this.queue = [];
    this.lastTogether = new Map();
    this.lastLine = new Map();
    this.stats = {
      inputs: 0,
      operations: {},
      conversationsStarted: 0,
      conversationsEnded: 0,
      messages: 0,
      activities: 0,
      wanders: 0,
      spars: undefined,
      chronicles: undefined,
    };
    const descriptions = descriptionsFor(this.folkOn, snapshot.gameState.world.wuxia);
    const agents = opts.agents ?? descriptions.length;
    // 跟 init.ts 一樣：世界建好後送 createAgent。
    for (let i = 0; i < agents; i++) {
      this.schedule(HEADLESS_EPOCH, 'createAgent', { descriptionIndex: i % descriptions.length });
    }
  }

  static fresh(opts: WorldOptions & SessionOptions): Session {
    return new Session(initialSnapshot(opts), opts);
  }

  get nextNow(): number {
    return HEADLESS_EPOCH + (this.k + 1) * STEP_MS;
  }

  /** 遊戲分鐘（時鐘還沒開始時是 -1）。 */
  gameMinute(): number {
    const w = this.game.world.wuxia!;
    return w.clockEpoch === undefined ? -1 : gameMinutes(this.game.engine.currentTime!, w.clockEpoch, w.timeScale);
  }

  aux(): SessionAux {
    return {
      seed: this.seed,
      k: this.k,
      actionRng: { ...this.actionRng },
      future: structuredClone(this.future),
      seq: this.seq,
      lastTogether: [...this.lastTogether],
      lastLine: [...this.lastLine],
      stats: structuredClone(this.stats),
    };
  }

  schedule(received: number, name: string, args: any) {
    this.future.push({ received, seq: this.seq++, name, args });
  }

  private rand(): number {
    return nextFloat(this.actionRng);
  }
  private delay(min: number, max: number): number {
    return Math.floor(min + this.rand() * (max - min));
  }

  private admit(upTo: number) {
    const f = this.future;
    f.sort((a, b) => a.received - b.received || a.seq - b.seq);
    let n = 0;
    while (n < f.length && f[n].received <= upTo) {
      const p = f[n++];
      this.queue.push({ number: this.queue.length, name: p.name, args: p.args, received: p.received });
    }
    if (n) f.splice(0, n);
  }

  /** 跟 sim.selectInputs 一樣，但從 processedInputNumber 之後直接開始（queue 的 number＝索引），不從頭掃。 */
  private selectInputs(existsBy: number): JournalInput[] {
    const after = this.game.engine.processedInputNumber ?? -1;
    const out: JournalInput[] = [];
    for (let i = after + 1; i < this.queue.length; i++) {
      const input = this.queue[i];
      if (input.received > existsBy) break;
      out.push(input);
      if (out.length >= this.game.maxInputsPerStep) break;
    }
    return out;
  }

  private nameOf(playerId: string) {
    return this.game.playerDescriptions.get(playerId as any)?.name ?? playerId;
  }

  /**
   * 跑一個 step。extra＝這一步要送進引擎的 input（玩家操作；received＝這一步的 now）。
   * 回傳的 step.hash 是空字串；需要時呼叫 game.wuxiaHash()（下一步之前算，值都一樣）。
   */
  step(extra: Array<{ name: string; args: any }> = []): { now: number; inputs: JournalInput[]; result: StepResult } {
    const now = this.nextNow;
    this.k++;
    for (const i of extra) this.schedule(now, i.name, i.args);
    this.admit(now);
    const inputs = this.selectInputs(now);
    const result = runOneStep(this.game, inputs, now, { hash: false, light: true });
    const stepEnd = result.step.endTs;
    const stats = this.stats;

    for (const c of result.endedConversations) {
      stats.conversationsEnded++;
      for (const a of c.participants) {
        for (const b of c.participants) {
          if (a !== b) this.lastTogether.set(`${a}|${b}`, stepEnd);
        }
      }
    }

    for (const op of result.agentOperations) {
      stats.operations[op.name] = (stats.operations[op.name] ?? 0) + 1;
      const args = op.args;
      if (op.name === 'agentDoSomething') {
        // 對應 agentOperations.ts 的 agentDoSomething（規則不變，只把隨機換成 actionRng）
        const actionNow = now + this.delay(20, 300);
        const { player, agent } = args;
        const worldMap = new WorldMap(args.map);
        const justLeftConversation =
          agent.lastConversation && actionNow < agent.lastConversation + CONVERSATION_COOLDOWN;
        const recentlyAttemptedInvite =
          agent.lastInviteAttempt && actionNow < agent.lastInviteAttempt + CONVERSATION_COOLDOWN;
        const recentActivity = player.activity && actionNow < player.activity.until + ACTIVITY_COOLDOWN;
        const sent = actionNow + this.delay(0, 1000);
        if (!player.pathfinding) {
          if (recentActivity || justLeftConversation) {
            stats.wanders++;
            this.schedule(sent, 'finishDoSomething', {
              operationId: args.operationId,
              agentId: agent.id,
              destination: {
                x: 1 + Math.floor(this.rand() * (worldMap.width - 2)),
                y: 1 + Math.floor(this.rand() * (worldMap.height - 2)),
              },
            });
          } else {
            stats.activities++;
            const activity = ACTIVITIES[Math.floor(this.rand() * ACTIVITIES.length)];
            this.schedule(sent, 'finishDoSomething', {
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
            const ended = this.lastTogether.get(`${player.id}|${other.id}`);
            if (ended !== undefined && actionNow < ended + PLAYER_CONVERSATION_COOLDOWN) continue;
            candidates.push({ id: other.id, position: player.position });
          }
          candidates.sort((a, b) => distance(a.position, player.position) - distance(b.position, player.position));
          invitee = candidates[0]?.id;
        }
        if (invitee) stats.conversationsStarted++;
        this.schedule(sent, 'finishDoSomething', {
          operationId: args.operationId,
          agentId: agent.id,
          invitee,
        });
      } else if (op.name === 'agentGenerateMessage') {
        // LLM 的替身：模板句，延遲 1～3 秒
        const sent = now + this.delay(1000, 3000);
        const speaker = this.nameOf(args.playerId);
        const other = this.nameOf(args.otherPlayerId);
        // 每則訊息只抽一次 actionRng()（開關不改 rng 消耗，見 folk-diff）
        const r = this.rand();
        const prev = this.lastLine.get(`${args.conversationId}|${speaker}`);
        const text = this.folkOn
          ? folkTemplate(speaker, args.type, r, { other }, prev)
          : conversationTemplate(args.type, r, { other });
        this.lastLine.set(`${args.conversationId}|${speaker}`, text);
        this.messages.push({
          t: sent,
          conversationId: args.conversationId,
          author: speaker,
          to: other,
          stage: args.type,
          text,
          metadata: { guard: 'template', reasons: [], attempts: 0, cause: 'headless' },
        });
        if (this.keepMessages !== undefined && this.messages.length > this.keepMessages)
          this.messages.splice(0, this.messages.length - this.keepMessages);
        stats.messages++;
        this.schedule(sent, 'agentFinishSendingMessage', {
          conversationId: args.conversationId,
          agentId: args.agentId,
          timestamp: sent,
          leaveConversation: args.type === 'leave',
          operationId: args.operationId,
        });
      } else if (op.name === 'agentRememberConversation') {
        const sent = now + this.delay(300, 1300) + this.delay(0, 1000);
        this.schedule(sent, 'finishRememberConversation', {
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
    stats.inputs = this.queue.length;
    return { now, inputs, result };
  }
}
