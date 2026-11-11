// 武俠小鎮 W0：重播 journal（#549 第 5 節）。不打 LLM、不需 Convex。
// 用法：npm run wuxia:replay -- docs/wuxia/fixtures/w0-live.jsonl [--verbose]
// 逐 step 重建：每個 step 用 journal 記下的 now、prevTime、inputsThrough 餵給同一段 simulateStep，
// 每步比對 hash；最後印出 hash，必須等於檔案內 final 記錄的 hash。不符時 exit 1。
import { readFileSync } from 'node:fs';
import { initWuxiaState } from '../../convex/wuxia/state';
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

export type Journal = {
  header: any;
  snapshot: Snapshot;
  inputs: JournalInput[];
  steps: JournalStep[];
  final: { hash: string; steps?: number };
};

export function readJournal(path: string): Journal {
  const j: Partial<Journal> = { inputs: [], steps: [] };
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const { type, ...rec } = JSON.parse(line);
    if (type === 'header') j.header = rec;
    else if (type === 'snapshot') j.snapshot = rec as Snapshot;
    else if (type === 'input') j.inputs!.push(rec as JournalInput);
    else if (type === 'step') j.steps!.push(rec as JournalStep);
    else if (type === 'final') j.final = rec as any;
    else throw new Error(`unknown journal record type ${type}`);
  }
  if (!j.snapshot || !j.final) throw new Error(`${path}: missing snapshot or final record`);
  j.inputs!.sort((a, b) => a.number - b.number);
  j.steps!.sort((a, b) => a.generation - b.generation);
  return j as Journal;
}

export type ReplayResult = {
  ok: boolean;
  steps: number;
  finalHash: string;
  expectedHash: string;
  firstMismatch?: { generation: number; expected: string; actual: string };
};

/**
 * W1：W0 時期錄的 live journal，快照裡沒有 wuxia 欄位（Game 建構子依「當時」的設定檔初始化）。
 * 當時 world.config.json 是 {"elements": {}, "seed": 7, "timeScale": 60}，這裡照原樣補回，
 * 不讀現在的設定檔（W1 起預設開啟 w01-skin）。W1 起的快照已經自帶 wuxia。
 */
export const W0_RECORDING_CONFIG = { elements: {}, seed: 7, timeScale: 60 };

export function withFrozenWuxia(snapshot: Snapshot): Snapshot {
  if (snapshot.gameState?.world?.wuxia !== undefined) return snapshot;
  const s = structuredClone(snapshot);
  s.gameState.world.wuxia = initWuxiaState(W0_RECORDING_CONFIG);
  return s;
}

export function replayJournal(j: Journal): ReplayResult {
  const game = createGame(withFrozenWuxia(j.snapshot));
  let firstMismatch: ReplayResult['firstMismatch'];
  let lastHash = game.wuxiaHash();
  for (const step of j.steps) {
    // live 的 startEngine／kickEngine 會在 step 之間改 generationNumber、currentTime；照紀錄對齊。
    game.engine.generationNumber = step.generation;
    game.engine.currentTime = step.prevTime;
    const inputs = selectInputs(
      game,
      j.inputs,
      step.inputsThrough ?? game.engine.processedInputNumber ?? -1,
    );
    const result = runOneStep(game, inputs, step.now);
    lastHash = result.step.hash;
    if (!firstMismatch && (result.step.hash !== step.hash || result.step.endTs !== step.endTs)) {
      firstMismatch = {
        generation: step.generation,
        expected: step.hash,
        actual: result.step.hash,
      };
    }
  }
  return {
    ok: !firstMismatch && lastHash === j.final.hash,
    steps: j.steps.length,
    finalHash: lastHash,
    expectedHash: j.final.hash,
    firstMismatch,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const files: string[] = args._;
  if (files.length === 0) throw new Error('usage: replay <journal.jsonl> [...]');
  let failed = 0;
  for (const file of files) {
    const r = replayJournal(readJournal(file));
    process.stdout.write(`${file}: steps=${r.steps}\n`);
    process.stdout.write(`hash ${r.finalHash}\n`);
    process.stdout.write(`expected ${r.expectedHash}\n`);
    if (r.firstMismatch) {
      process.stdout.write(
        `first mismatch at generation ${r.firstMismatch.generation}: expected ${r.firstMismatch.expected} got ${r.firstMismatch.actual}\n`,
      );
    }
    process.stdout.write(r.ok ? 'MATCH\n' : 'MISMATCH\n');
    if (!r.ok) failed++;
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1]?.endsWith('replay.ts')) {
  main();
}
