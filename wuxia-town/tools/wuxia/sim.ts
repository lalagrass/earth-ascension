// 武俠小鎮 W0：無頭模擬與重播共用的核心（不需要 Convex、不打 LLM）。
// 引擎本體直接用上游的 Game／AbstractGame.simulateStep，跟 live 跑的是同一段程式。
import { Game } from '../../convex/aiTown/game';
import { stateHash } from '../../convex/wuxia/hash';

export type JournalInput = {
  number: number;
  name: string;
  args: any;
  received: number;
  _id?: string;
};

export type JournalStep = {
  generation: number;
  startTs: number;
  endTs: number;
  now: number;
  prevTime?: number;
  numTicks: number;
  inputsThrough?: number;
  processedInputNumber?: number;
  hash: string;
};

export type Snapshot = {
  worldId: string;
  engineId: string;
  generation: number;
  engine: any; // engines 文件（不含 _id/_creationTime）
  gameState: any; // { world, playerDescriptions, agentDescriptions, worldMap }
};

export function createGame(snapshot: Snapshot): Game {
  const engine = {
    _id: snapshot.engineId,
    _creationTime: 0,
    ...structuredClone(snapshot.engine),
  };
  return new Game(engine as any, snapshot.worldId as any, structuredClone(snapshot.gameState));
}

/** 跟 live 的 loadInputs 一樣：processedInputNumber 之後、最多 maxInputsPerStep 筆。 */
export function selectInputs(
  game: Game,
  queue: JournalInput[],
  inputsThrough: number | undefined,
  existsBy?: number,
): JournalInput[] {
  const after = game.engine.processedInputNumber ?? -1;
  const out: JournalInput[] = [];
  for (const input of queue) {
    if (input.number <= after) continue;
    if (inputsThrough !== undefined && input.number > inputsThrough) break;
    if (existsBy !== undefined && input.received > existsBy) break;
    out.push(input);
    if (out.length >= game.maxInputsPerStep) break;
  }
  return out;
}

export type StepResult = {
  step: JournalStep;
  agentOperations: Array<{ name: string; args: any }>;
  endedConversations: Array<{ id: string; participants: string[] }>;
  /** W9：每個 input 的回傳值（跟 live 的 completedInputs 同形狀） */
  completedInputs: Array<{ inputId: string; returnValue: any }>;
};

/** 跑一個 step：simulateStep → 取 diff（清掉 pendingOperations 與位置緩衝），回傳 step 紀錄。 */
export function runOneStep(game: Game, inputs: JournalInput[], now: number): StepResult {
  const before = new Map(
    [...game.world.conversations.values()].map((c) => [c.id as string, [...c.participants.keys()]]),
  );
  // 深拷貝：handler 會把 args 裡的物件直接掛到世界上（例如 activity），之後被 tick 改掉；
  // live 每次都從資料庫讀新的 args，這裡也要給新的一份，journal 才不會被改寫。
  const withIds = inputs.map((i) => ({
    ...structuredClone(i),
    _id: i._id ?? `input:${i.number}`,
  }));
  const { stepRecord, engineUpdate } = game.simulateStep(withIds as any, now);
  const completedInputs = engineUpdate.completedInputs as Array<{ inputId: string; returnValue: any }>;
  const hash = game.wuxiaHash();
  const diff = game.takeDiff();
  const endedConversations = [];
  for (const [id, participants] of before) {
    if (!game.world.conversations.has(id as any)) {
      endedConversations.push({ id, participants: participants as string[] });
    }
  }
  return {
    step: { ...stepRecord, hash },
    agentOperations: diff.agentOperations,
    endedConversations,
    completedInputs: completedInputs ?? [],
  };
}

export function hashOf(game: Game): string {
  return stateHash(game.world.serialize());
}

/** 引擎 log 很吵；預設靜音，--verbose 才印。 */
export function quietConsole(verbose: boolean) {
  if (verbose) return;
  for (const k of ['log', 'debug', 'warn', 'info', 'error'] as const) {
    (console as any)[k] = () => {};
  }
}

export function parseArgs(argv: string[]): { _: string[]; [k: string]: any } {
  const out: { _: string[]; [k: string]: any } = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}
