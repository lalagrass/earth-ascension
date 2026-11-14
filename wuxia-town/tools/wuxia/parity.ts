// 武俠小鎮 A1：wuxia:parity（#564 驗收 A2）。同一個 seed、同樣步數：
//   headless（tools/wuxia/headless.ts 的 runHeadless）
//   local（Node worker_threads 裡跑瀏覽器 Worker 同一個 LocalCore；倍速 1×、4×、16×、64× 與直接跑各一次）
// 的狀態 hash 必須全部相同（倍速不改變結果）。瀏覽器裡的 Web Worker 那一方由 wuxia:local-check 比（同一個 hash）。
// 有 Convex 環境時的第三方：見 docs/wuxia/A1.md（平時不比，#563 輕量驗收）。
// 用法：npm run wuxia:parity -- --seed 7 --days 10 [--speeds 0,1,4,16,64] [--arrive-day 1 --scenario master-open]（A2）
import { Worker } from 'node:worker_threads';
import { runHeadless } from './headless';
import { parseArgs, quietConsole } from './sim';

// A2（#575）：world 可帶 arriveDay／scenario（大師提早進鎮），兩邊用同一份世界選項
export async function parity(seed: number, steps: number, speeds: number[], world: { arriveDay?: number; scenario?: string } = {}) {
  const headless = runHeadless({ seed, minutes: steps / 60, ...world }).finalHash;
  const local = await Promise.all(
    speeds.map(
      (speed) =>
        new Promise<{ speed: number; hash: string; steps: number }>((resolve, reject) => {
          const w = new Worker(new URL('./parity-worker.ts', import.meta.url), {
            workerData: { seed, steps, speed, frameMs: 16, world },
            execArgv: ['--import', 'tsx'],
          });
          w.once('message', (m) => resolve({ speed, ...m }));
          w.once('error', reject);
        }),
    ),
  );
  const ok = local.every((l) => l.hash === headless && l.steps === steps);
  return { seed, steps, headless, local, ok };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const seed = Number(args.seed ?? 7);
  const steps = args.steps !== undefined ? Number(args.steps) : Math.round(Number(args.days ?? 1) * 1440);
  const speeds = String(args.speeds ?? '0,1,4,16,64').split(',').map(Number);
  const world = {
    arriveDay: args['arrive-day'] === undefined ? undefined : Number(args['arrive-day']),
    scenario: args.scenario === undefined ? undefined : String(args.scenario),
  };
  const r = await parity(seed, steps, speeds, world);
  process.stdout.write(`seed ${seed} steps ${steps}（${(steps / 1440).toFixed(2)} 遊戲日）\n`);
  process.stdout.write(`headless          ${r.headless}\n`);
  for (const l of r.local) process.stdout.write(`local ${l.speed === 0 ? '直接跑' : `${l.speed}×`.padEnd(4)}      ${l.hash}${l.hash === r.headless ? '' : '  ≠'}\n`);
  process.stdout.write(r.ok ? 'parity OK\n' : 'parity MISMATCH\n');
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.endsWith('parity.ts')) void main();
