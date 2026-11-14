// 武俠小鎮 W3：w03-life 開／關對照（#549「每步驗收都要並排開／關」、#555 驗收）。
// 用法：npm run wuxia:life-diff -- [--seed 7] [--days 3] [--minutes 30]
//   A. --off w03-life ＝ W2 的世界：enabled 只有 w01-skin、w02-folk，世界狀態沒有 w03-life 的痕跡；
//      seed 7、30 分鐘時 hash 必須等於 W2 記錄的 dadeb8a8…（W2.md）
//   B. 開：第 2、3 日每人睡 6–9 小時、吃 2–3 餐、工作者 ≥ 4 小時在工作地點；全程預約 ≤ capacity、
//      沒人連續 2 小時選不到事做、沒人 hunger 連續 6 小時 > 90；同一人第 2 日與第 3 日時間表不完全相同
//   C. 關：同樣的時間表檢查，沒有這些規律（沒有人睡覺、吃飯）
// A、B、C 任一不符就 exit 1。
import { runHeadless } from './headless';
import { analyzeDay, RULES } from './day-report';
import { parseArgs, quietConsole } from './sim';

export const W2_HASH_SEED7_30MIN =
  'dadeb8a8380997085715890489042f8d89346e75f6214e9ed77109e7f7b777d4';

export function lifeDiff(seed: number, days: number, minutes: number) {
  const offShort = runHeadless({ seed, minutes, elements: { 'w03-life': false } });
  const offEnabled = Object.keys(offShort.game.world.wuxia!.enabled).sort();
  const resultA = {
    ok:
      offEnabled.join(',') === 'w01-skin,w02-folk' &&
      offShort.game.world.wuxia!.elements['w03-life'] === undefined &&
      (seed !== 7 || minutes !== 30 || offShort.finalHash === W2_HASH_SEED7_30MIN),
    hash: offShort.finalHash,
    enabled: offEnabled,
  };

  const on = runHeadless({ seed, minutes: 0, untilGameMinute: days * 1440, trace: true });
  const off = runHeadless({
    seed,
    minutes: 0,
    untilGameMinute: days * 1440,
    trace: true,
    elements: { 'w03-life': false },
  });
  const checkDays = [2, 3].filter((d) => d <= days);
  const failsOn: string[] = [];
  const dayRows: string[] = [];
  for (const d of checkDays) {
    for (const p of analyzeDay(on.summary.life!.timeline, d)) {
      dayRows.push(
        `第 ${d} 日 ${p.name}：睡 ${(p.sleepMinutes / 60).toFixed(1)}h、${p.meals} 餐` +
          (p.worker ? `、在工作地點 ${(p.workplaceMinutes / 60).toFixed(1)}h` : ''),
      );
      for (const v of p.verdicts) if (!v.ok) failsOn.push(`第 ${d} 日 ${p.name} ${v.rule}：${v.value}`);
    }
  }
  if (checkDays.length === 2) {
    const [a, b] = checkDays.map((d) => analyzeDay(on.summary.life!.timeline, d));
    for (const p of a) {
      const q = b.find((x) => x.who === p.who)!;
      if (q.signature === p.signature) failsOn.push(`${p.name} 第 2、3 日時間表完全相同`);
    }
  }
  const c = on.summary.life!.checks;
  if (c.reservationOverCapacity || c.usingOverCapacity || c.doubleBooked)
    failsOn.push(`預約超過 capacity ${JSON.stringify(c)}`);
  const stuck = Math.max(0, ...Object.values(c.maxNoChoiceMinutes));
  if (stuck >= RULES.maxNoChoiceMinutes) failsOn.push(`有人連續 ${stuck} 分選不到事做`);
  const hungry = Math.max(0, ...Object.values(c.maxHungerOver90Minutes));
  if (hungry >= RULES.maxHungerOver90Minutes) failsOn.push(`有人 hunger 連續 ${hungry} 分 > 90`);
  if (c.maxConversationMinutes > 91) failsOn.push(`對話 ${c.maxConversationMinutes} 遊戲分鐘 > 90`);
  const resultB = {
    ok: failsOn.length === 0,
    fails: failsOn,
    hash: on.finalHash,
    rows: dayRows,
    stuck,
    hungry,
    maxConversation: c.maxConversationMinutes,
    conversations: on.summary.life!.conversations,
    capacityMinutes: c.minutes,
  };

  // C：關掉時沒有作息（沒人睡覺、沒人吃飯）
  const offRows: string[] = [];
  let offRegular = 0;
  for (const d of checkDays) {
    for (const p of analyzeDay(off.summary.life!.timeline, d)) {
      offRows.push(`第 ${d} 日 ${p.name}：睡 ${(p.sleepMinutes / 60).toFixed(1)}h、${p.meals} 餐`);
      if (p.sleepMinutes > 0 || p.meals > 0) offRegular++;
    }
  }
  const resultC = { ok: offRegular === 0, hash: off.finalHash, rows: offRows };
  return { resultA, resultB, resultC };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const seed = Number(args.seed ?? 7);
  const days = Number(args.days ?? 3);
  const minutes = Number(args.minutes ?? 30);
  const { resultA, resultB, resultC } = lifeDiff(seed, days, minutes);
  const say = (s: string) => process.stdout.write(s + '\n');
  say(`seed=${seed} days=${days} minutes=${minutes}`);
  say(
    `A ${resultA.ok ? 'ok  ' : 'FAIL'} w03-life 關＝W2 世界（enabled=${JSON.stringify(resultA.enabled)}） ${minutes} 分 hash ${resultA.hash}`,
  );
  say(`B ${resultB.ok ? 'ok  ' : 'FAIL'} 開：${days} 日 hash ${resultB.hash}`);
  for (const r of resultB.rows) say(`    ${r}`);
  say(
    `    預約逐分檢查 ${resultB.capacityMinutes} 分無超額；最長選不到事做 ${resultB.stuck} 分；最長 hunger>90 ${resultB.hungry} 分；最長對話 ${resultB.maxConversation} 分`,
  );
  say(`    對話 ${JSON.stringify(resultB.conversations)}`);
  for (const f of resultB.fails) say(`    FAIL ${f}`);
  say(`C ${resultC.ok ? 'ok  ' : 'FAIL'} 關：${days} 日 hash ${resultC.hash}，沒有作息規律`);
  for (const r of resultC.rows) say(`    ${r}`);
  if (!(resultA.ok && resultB.ok && resultC.ok)) process.exit(1);
  say('life-diff passed');
}

if (process.argv[1]?.endsWith('life-diff.ts')) main();
