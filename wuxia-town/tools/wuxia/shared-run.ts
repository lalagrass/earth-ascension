// 武俠小鎮 W9：wuxia:check 共用的「預設設定、seed 7」長跑。
// 第 15 項（30 日切磋報告）、第 16 項（45 日關係報告）、第 17 項 D（60 日江湖報告）原本各跑一次同一個世界（同 seed、同設定、
// 都開 trace），只是停在不同天。世界是確定性的，所以只跑一次到最長的天數，途中用 runHeadless 的 taps 在第 30／45 日取樣
// （取樣的 summary 與 hash 跟單獨跑到那一天逐位元組相同，見 tools/wuxia/headless.test.ts），判定不變、少跑 75 個遊戲日。
import { runHeadless } from './headless';

export type Tap = { summary: any; finalHash: string };

export function sharedDefaultRun(
  seed: number,
  days: number[],
  onTap?: (day: number, tap: Tap) => void,
): Map<number, Tap> {
  const want = [...new Set(days.filter((d) => d > 0))].sort((a, b) => a - b);
  const out = new Map<number, Tap>();
  if (want.length === 0) return out;
  const max = want[want.length - 1];
  const run = runHeadless({
    seed,
    minutes: 0,
    untilGameMinute: max * 1440,
    trace: true,
    taps: want.slice(0, -1).map((d) => d * 1440),
    onTap: (gm, tap) => {
      out.set(gm / 1440, tap);
      onTap?.(gm / 1440, tap);
    },
  });
  const last = { summary: run.summary, finalHash: run.finalHash };
  out.set(max, last);
  onTap?.(max, last);
  return out;
}
