// 武俠小鎮 W5：w05-mind 開／關對照（#549「每步驗收都要並排開／關」、#557 驗收）。
// 用法：npm run wuxia:mind-diff -- [--seed 7] [--minutes 30] [--days 14] [--seeds 2,3]
//   A. --off w05-mind ＝ W4 的世界：enabled 沒有 w05-mind、世界狀態沒有 w05-mind 的痕跡、生活狀態沒有武館門口／城門外；
//      seed 7、30 分鐘 hash 必須等於 W4 記錄的 4b038f41…，3 日 hash 等於 W4 的 25608b55…（W4.md）
//   B. 開 vs 關（同 seed、days 日）：第 7–14 日阿青練功總時數開比關多 30% 以上；武館重開的日子＝周教頭「想重開武館」出現的日子，
//      重開前沒有人練功、重開後有人練功
//   C. 不同 seed 武館重開的日子不同（seed 與 --seeds 至少兩個不同的日子）
//   D. 因果可驗：丟掉阿青「想學武」第一次出現時的第一筆觸發記憶重跑，心念延後或不出現
// 任一不符 exit 1。
import { runHeadless } from './headless';
import { parseArgs, quietConsole } from './sim';
import { mindReport, trainMinutes, MIND_RULES } from './mind-report';
import { firstAppearance } from './mind-trace';
import { W05_MIND } from '../../convex/wuxia/w05_mind/data';

export const W4_HASH_SEED7_30MIN = '4b038f412afb978c59b5f9c397369e4f67b0f155dc7c141d1df2b8c2928f7dc2';
export const W4_HASH_SEED7_3DAYS = '25608b55';

export function mindDiff(seed: number, minutes: number, days: number, seeds: number[]) {
  const off = { [W05_MIND]: false };
  // A
  const offShort = runHeadless({ seed, minutes, elements: off });
  const w = offShort.game.world.wuxia!;
  const enabled = Object.keys(w.enabled).sort();
  const res = Object.keys((w.elements['w03-life'] as any)?.res ?? {});
  const off3 = runHeadless({ seed, minutes: 0, untilGameMinute: 3 * 1440, elements: off });
  const resultA = {
    ok:
      !enabled.includes(W05_MIND) &&
      w.elements[W05_MIND] === undefined &&
      !res.includes('dojo-gate') &&
      !res.includes('gate-outlook') &&
      (seed !== 7 || minutes !== 30 || offShort.finalHash === W4_HASH_SEED7_30MIN) &&
      (seed !== 7 || off3.finalHash.startsWith(W4_HASH_SEED7_3DAYS)),
    hash: offShort.finalHash,
    hash3: off3.finalHash,
    enabled,
  };

  // B
  const onRun = runHeadless({ seed, minutes: 0, untilGameMinute: days * 1440, trace: true });
  const offRun = runHeadless({ seed, minutes: 0, untilGameMinute: days * 1440, trace: true, elements: off });
  const report = mindReport(onRun.summary, ['a-qing', 'zhou-jiaotou'], offRun.summary);
  const mind = onRun.summary.mind!;
  const opened = mind.dojoOpenedDay;
  let before = 0;
  let after = 0;
  onRun.summary.dojo?.days.forEach((row, i) => {
    const n = Object.values(row).reduce((a, r) => a + r.trainMinutes - (r.acts.coach ?? 0), 0);
    if (opened === null || i + 1 < opened) before += n;
    else after += n;
  });
  const [a, b] = MIND_RULES.compareDays;
  const resultB = {
    ok: report.verdicts.every((v) => v.ok) && opened !== null && before === 0 && after > 0,
    verdicts: report.verdicts,
    opened,
    before,
    after,
    trainOn: trainMinutes(onRun.summary.dojo, 'a-qing', [a, b]),
    trainOff: trainMinutes(offRun.summary.dojo, 'a-qing', [a, b]),
    hashOn: onRun.finalHash,
    hashOff: offRun.finalHash,
  };

  // C
  const openDays: Record<number, number | null> = { [seed]: opened };
  for (const s of seeds) {
    const r = runHeadless({ seed: s, minutes: 0, untilGameMinute: 12 * 1440, trace: true });
    openDays[s] = r.summary.mind!.dojoOpenedDay;
  }
  const distinct = new Set(Object.values(openDays).filter((d) => d !== null));
  const resultC = { ok: distinct.size >= 2, openDays };

  // D
  const first = firstAppearance(mind, 'a-qing', '想學武');
  let resultD: { ok: boolean; dropped?: number; firstDay?: number; againDay?: number | null } = { ok: false };
  if (first && first.causes.length) {
    const dropped = first.causes[0];
    const again = runHeadless({ seed, minutes: 0, untilGameMinute: days * 1440, trace: true, dropMemories: [dropped] });
    const af = firstAppearance(again.summary.mind!, 'a-qing', '想學武');
    resultD = { ok: !af || af.day > first.day, dropped, firstDay: first.day, againDay: af?.day ?? null };
  }
  return { resultA, resultB, resultC, resultD, report };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const seed = Number(args.seed ?? 7);
  const r = mindDiff(
    seed,
    Number(args.minutes ?? 30),
    Number(args.days ?? 14),
    String(args.seeds ?? '2,3').split(',').filter(Boolean).map(Number),
  );
  const say = (s: string) => process.stdout.write(s + '\n');
  say(`${r.resultA.ok ? 'PASS' : 'FAIL'} A：--off w05-mind＝W4 世界 enabled=${r.resultA.enabled.join(',')} 30 分 hash ${r.resultA.hash}；3 日 hash ${r.resultA.hash3}`);
  for (const v of r.resultB.verdicts) say(`${v.ok ? 'PASS' : 'FAIL'} B：${v.rule}：${v.value}`);
  say(`${r.resultB.before === 0 && r.resultB.after > 0 ? 'PASS' : 'FAIL'} B：重開前練功 ${r.resultB.before} 人分鐘、重開後 ${r.resultB.after} 人分鐘（不含教頭指點）；開 hash ${r.resultB.hashOn.slice(0, 16)}…、關 hash ${r.resultB.hashOff.slice(0, 16)}…`);
  say(`${r.resultC.ok ? 'PASS' : 'FAIL'} C：武館重開的日子 ${Object.entries(r.resultC.openDays).map(([s, d]) => `seed ${s}→第 ${d ?? '—'} 日`).join('、')}`);
  say(`${r.resultD.ok ? 'PASS' : 'FAIL'} D：丟掉記憶 #${r.resultD.dropped} 後阿青「想學武」第 ${r.resultD.againDay ?? '—（沒出現）'} 日出現（原本第 ${r.resultD.firstDay} 日）`);
  if (!(r.resultA.ok && r.resultB.ok && r.resultC.ok && r.resultD.ok)) process.exit(1);
}

if (process.argv[1]?.endsWith('mind-diff.ts')) main();
