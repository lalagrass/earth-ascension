// 武俠小鎮 A1（#564 審查第 2 項）`npm run wuxia:perf -- --agents 12,20,30 --days 30 [--seed 7] [--trace] [--out perf.json]`
// 每個人數各開一個子行程，用 taskset 綁在一個 CPU 核心（沒有 taskset 就不綁），無頭跑到第 days 日結束，
// 報牆鐘秒數、每遊戲日秒數、每步毫秒、最後 hash 與 RSS 峰值。只量引擎（不寫檔）；--trace 時連 day-report 的記錄一起量
// （wuxia:headless --days 的預設）。目標：12 人、單核、60 遊戲日 ≤ 60 秒（A1.md 記錄實測）。
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { runHeadless } from './headless';
import { parseArgs, quietConsole } from './sim';

type PerfRow = { agents: number; days: number; trace: boolean; seconds: number; secPerDay: number; msPerStep: number; steps: number; hash: string; rssMB: number; pinned: boolean };

function one(seed: number, agents: number, days: number, trace: boolean) {
  quietConsole(false);
  const t0 = performance.now();
  const r = runHeadless({ seed, minutes: 0, agents, untilGameMinute: days * 1440, trace });
  const seconds = (performance.now() - t0) / 1000;
  const steps = r.summary.steps;
  const row = {
    agents, days, trace, seconds, secPerDay: seconds / days, msPerStep: (seconds * 1000) / steps, steps,
    hash: r.summary.finalHash, rssMB: process.resourceUsage().maxRSS / 1024,
  };
  process.stdout.write(`PERF ${JSON.stringify(row)}\n`);
}

function hasTaskset() {
  try {
    execFileSync('taskset', ['-c', '0', 'true']);
    return true;
  } catch {
    return false;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const seed = Number(args.seed ?? 7);
  const days = Number(args.days ?? 30);
  const trace = !!args.trace;
  if (args.one) return one(seed, Number(args.agents), days, trace);
  const list = String(args.agents ?? '12,20,30').split(',').map(Number);
  const core = String(args.core ?? 0);
  const pinned = hasTaskset();
  const rows: PerfRow[] = [];
  for (const agents of list) {
    const childArgs = ['--import', 'tsx', 'tools/wuxia/perf.ts', '--one', '--seed', String(seed), '--agents', String(agents), '--days', String(days), ...(trace ? ['--trace'] : [])];
    const r = pinned
      ? spawnSync('taskset', ['-c', core, process.execPath, ...childArgs], { encoding: 'utf8', maxBuffer: 1 << 28 })
      : spawnSync(process.execPath, childArgs, { encoding: 'utf8', maxBuffer: 1 << 28 });
    const line = r.stdout.split('\n').find((l) => l.startsWith('PERF '));
    if (!line) {
      process.stderr.write(`agents ${agents} 失敗：\n${(r.stderr || r.stdout).slice(-3000)}\n`);
      process.exit(1);
    }
    const row: PerfRow = { ...JSON.parse(line.slice(5)), pinned };
    rows.push(row);
    process.stdout.write(
      `${String(agents).padStart(3)} 人 ${days} 日${trace ? '（含 trace）' : ''}：${row.seconds.toFixed(1)} 秒（每日 ${row.secPerDay.toFixed(2)} 秒、每步 ${row.msPerStep.toFixed(3)} ms、RSS ${row.rssMB.toFixed(0)} MB）hash ${row.hash.slice(0, 16)}…\n`,
    );
  }
  process.stdout.write(pinned ? `（每個子行程用 taskset -c ${core} 綁單核）\n` : '（沒有 taskset：未綁核）\n');
  if (args.out) fs.writeFileSync(String(args.out), JSON.stringify({ tool: 'wuxia-town perf', seed, rows }, null, 2) + '\n');
}

if (process.argv[1]?.endsWith('perf.ts')) main();
