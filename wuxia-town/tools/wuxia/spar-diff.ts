// 武俠小鎮 W6：w06-spar 開／關對照與 #558 驗收（wuxia:check 第 15 項）。
// 用法：npm run wuxia:spar-diff -- [--seed 7] [--minutes 30] [--days 30]
//   A. --off w06-spar ＝ W5 的世界：enabled 沒有 w06-spar、世界狀態沒有 w06-spar 的痕跡；
//      seed 7、30 分鐘 hash 等於 W5 記錄的 1b1c24e6…，3 日 hash 等於 W5 的 8bdfff84…（W5.md）
//   B. 判定（spar-sim）：周教頭對阿青（起始技能）勝率 > 90%；相近掃描（拳腳差 0–49、其他相同）每格 40–60%
//   C. 30 日報告（spar-report）：有切磋、同一對每日 ≤1 次、阿青輸給周教頭後「想變強」在且「因為」追得到切磋輸的記憶 id、
//      想變強時段有練功；對照關掉切磋，第 30 日想變強強度開 > 關
// 任一不符 exit 1。
import { runHeadless } from './headless';
import { parseArgs, quietConsole } from './sim';
import { simulate, sweep, strongSweep, parseSkills, SPAR_SIM_RULES } from './spar-sim';
import { sparReport } from './spar-report';
import { W06_SPAR } from '../../convex/wuxia/w06_spar/data';

export const W5_HASH_SEED7_30MIN = '1b1c24e646d72d0ad42ca66eea4edf2834cffc64030991952d4ec75c26103a5c';
export const W5_HASH_SEED7_3DAYS = '8bdfff845075266e0f68762b34bdfec60a65c852c692d2dd7671cca9237aaf1a';

export function sparDiffA(seed: number, minutes: number) {
  const off = { [W06_SPAR]: false };
  const short = runHeadless({ seed, minutes, elements: off });
  const w = short.game.world.wuxia!;
  const three = runHeadless({ seed, minutes: 0, untilGameMinute: 3 * 1440, elements: off });
  const ok =
    !w.enabled[W06_SPAR] &&
    w.elements[W06_SPAR] === undefined &&
    (seed !== 7 || minutes !== 30 || short.finalHash === W5_HASH_SEED7_30MIN) &&
    (seed !== 7 || three.finalHash === W5_HASH_SEED7_3DAYS);
  return { ok, hash: short.finalHash, hash3: three.finalHash };
}

export function sparDiffB(seed: number) {
  const coach = parseSkills('zhou-jiaotou');
  const aqing = parseSkills('a-qing');
  const r = simulate(coach, aqing, 200, seed);
  const strong = r.aWin / r.n;
  const rows = sweep(2000, seed);
  const strongRows = strongSweep(2000, seed);
  return {
    strongOk: strong > SPAR_SIM_RULES.strongMin,
    strong,
    rows,
    closeOk: rows.every((x) => x.ok),
    strongRows,
    strongRowsOk: strongRows.every((x) => x.ok),
  };
}

/** C：給 30 日的開／關 run（check 第 13 項的關掉切磋 run 可以共用）。 */
export function sparDiffC(on: any, off: any) {
  return sparReport(on, '阿青', off).verdicts;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const seed = Number(args.seed ?? 7);
  const minutes = Number(args.minutes ?? 30);
  const days = Number(args.days ?? 30);
  let fails = 0;
  const out = (ok: boolean, msg: string) => {
    if (!ok) fails++;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${msg}\n`);
  };
  const a = sparDiffA(seed, minutes);
  out(a.ok, `spar-diff A：w06-spar 關＝W5 世界 hash ${a.hash}（3 日 ${a.hash3.slice(0, 16)}…）`);
  const b = sparDiffB(seed);
  out(b.strongOk, `spar-diff B：周教頭對阿青 200 場勝率 ${(b.strong * 100).toFixed(1)}% > 90%`);
  out(b.closeOk, `spar-diff B：相近（拳腳差 0–49）勝率 ${b.rows.map((r) => `${r.gap}:${(r.lowAsA * 100).toFixed(0)}/${(r.lowAsB * 100).toFixed(0)}%`).join(' ')}（40–60%）`);
  out(b.strongRowsOk, `spar-diff B：強對弱（拳腳差 300／400／600，其他相同）強方勝率 ${b.strongRows.map((r) => `${r.gap}:${(r.highAsA * 100).toFixed(1)}/${(r.highAsB * 100).toFixed(1)}%`).join(' ')}（> 90%）`);
  const on = runHeadless({ seed, minutes: 0, untilGameMinute: days * 1440, trace: true }).summary;
  const off = runHeadless({ seed, minutes: 0, untilGameMinute: days * 1440, trace: true, elements: { [W06_SPAR]: false } }).summary;
  for (const v of sparDiffC(on, off)) out(v.ok, `spar-diff C ${days} 日：${v.rule}：${v.value}`);
  if (fails) process.exit(1);
}

if (process.argv[1]?.endsWith('spar-diff.ts')) main();
