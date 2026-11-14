// 武俠小鎮 W7：w07-bond 開／關對照與 #559 驗收（wuxia:check 第 16 項）。
// 用法：npm run wuxia:bond-diff -- [--seed 7] [--minutes 30] [--days 45] [--seeds 7,8,9]
//   A. --off w07-bond ＝ W6 的世界：enabled 沒有 w07-bond、世界狀態沒有 w07-bond 的痕跡；
//      seed 7、30 分鐘 hash 等於 W6 記錄的 a8832316…，3 日 hash 等於 W6 的 d0a498e7…（W6.md）
//   B. 每個 seed 跑 --days 日：bond-report 的判定（發生拜師、列出拜師日與觸發記憶、拜師後練功增長高於拜師前）
//      ＋ bond-trace（阿青對周教頭的敬重：重算值＝引擎快取、列出貢獻最大的 5 筆記憶）
//   C. --seeds 給多個時：至少 2 個 seed 在 --days 日內發生拜師（#559「7、8、9 中至少 2 個」）
// 任一不符 exit 1。
import { runHeadless } from './headless';
import { parseArgs, quietConsole } from './sim';
import { bondReport } from './bond-report';
import { bondTrace } from './bond-trace';
import { W07_BOND } from '../../convex/wuxia/w07_bond/data';

export const W6_HASH_SEED7_30MIN = 'a883231678c107f2fb099ae3b13ddc9ff359e5cb90b62c729ac25d73d10d1449';
export const W6_HASH_SEED7_3DAYS = 'd0a498e7bba0c2b76403cbbc29f209e9df128c51f44adbf7764c7fd0d5fe9b6c';

export function bondDiffA(seed: number, minutes: number) {
  const off = { [W07_BOND]: false };
  const short = runHeadless({ seed, minutes, elements: off });
  const w = short.game.world.wuxia!;
  const three = runHeadless({ seed, minutes: 0, untilGameMinute: 3 * 1440, elements: off });
  const ok =
    !w.enabled[W07_BOND] &&
    w.elements[W07_BOND] === undefined &&
    (seed !== 7 || minutes !== 30 || short.finalHash === W6_HASH_SEED7_30MIN) &&
    (seed !== 7 || three.finalHash === W6_HASH_SEED7_3DAYS);
  return { ok, hash: short.finalHash, hash3: three.finalHash };
}

/** B：一個 seed 跑 days 日，回傳報告判定與 trace。 */
export function bondDiffB(seed: number, days: number) {
  const run = runHeadless({ seed, minutes: 0, untilGameMinute: days * 1440, trace: true });
  return bondDiffBFrom(run.summary, run.finalHash, days);
}

/** W9：判定部分抽出來（wuxia:check 用共用長跑在第 days 日取樣的 summary，判定不變）。 */
export function bondDiffBFrom(summary: any, hash: string, days: number) {
  const report = bondReport(summary, days);
  const trace = bondTrace(summary, '阿青', '周教頭', 'respect', days);
  return { hash, report, trace, summary };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const seed = Number(args.seed ?? 7);
  const minutes = Number(args.minutes ?? 30);
  const days = Number(args.days ?? 45);
  const seeds = String(args.seeds ?? seed)
    .split(',')
    .map(Number);
  let fails = 0;
  const out = (ok: boolean, msg: string) => {
    if (!ok) fails++;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${msg}\n`);
  };
  const a = bondDiffA(seed, minutes);
  out(a.ok, `bond-diff A：w07-bond 關＝W6 世界 hash ${a.hash}（3 日 ${a.hash3.slice(0, 16)}…）`);
  let happened = 0;
  for (const s of seeds) {
    const b = bondDiffB(s, days);
    const accepted = b.report.events.filter((e) => e.accepted);
    if (accepted.length) happened++;
    for (const v of b.report.verdicts) out(v.ok, `bond-report seed ${s} ${days} 日（hash ${b.hash.slice(0, 16)}…）${v.rule}：${v.value}`);
    out(b.trace.ok, `bond-trace seed ${s} 第 ${days} 日 阿青→周教頭 敬重 ${b.trace.bond.respect}（快取 ${b.trace.cached?.respect ?? '-'}），貢獻最大 ${b.trace.top.length} 筆：${b.trace.top.map((c) => `#${c.memory!.id}`).join(' ')}`);
  }
  if (seeds.length > 1) out(happened >= 2, `bond-diff C：${seeds.join('、')} 中 ${happened} 個 seed 在 ${days} 日內發生拜師（≥ 2）`);
  if (fails) process.exit(1);
}

if (process.argv[1] && /bond-diff\.ts$/.test(process.argv[1])) main();
