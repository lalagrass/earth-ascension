// 武俠小鎮 W4：w04-dojo 開／關對照（#549「每步驗收都要並排開／關」、#556 驗收第 3 條）。
// 用法：npm run wuxia:dojo-diff -- [--seed 7] [--minutes 30]
//   A. --off w04-dojo ＝ W3 的世界：enabled 只有 w01-skin、w02-folk、w03-life，世界狀態沒有 w04-dojo 的痕跡、
//      生活狀態沒有武館物件；seed 7、30 分鐘時 hash 必須等於 W3 記錄的 35c860ff…（W3.md）
//   B. 關：武館空著、沒人練——第 1 日沒有任何練功活動，也沒有人進武館院子
//   C. 開 vs 關，同 seed 第 1 日時間表 diff：日程有改的三人（周教頭、阿青、石虎）以外，每個人的作息
//      （每個日程時段有沒有做到排定的事、day-report 的睡／吃／工作判定）都跟關掉時一樣；
//      分鐘級的差異（共用 game.rng() 的擾動順序被練功的人多用的亂數錯開、跟練功的人聊天的對象變了）
//      逐人列出，見 DEVIATIONS W4-4。--full 印出兩邊完整時間表。
// A、B、C 任一不符就 exit 1。
import { runHeadless } from './headless';
import { analyzeDay, dayRange, clip } from './day-report';
import { parseArgs, quietConsole } from './sim';
import { SCHEDULES, SCHEDULE_OVERLAYS, inRange } from '../../convex/wuxia/w03_life/data';
import { TRAINING_ACTS } from '../../convex/wuxia/w04_dojo/data';
import type { Segment } from './life-trace';

export const W3_HASH_SEED7_30MIN =
  '35c860ffc3af21caae503f3aa4fe4fb58529e0a41778f7f31e24dfd5cf85df9b';
/** 武館院子（可走格）：x 35–44、y 22–26 */
export const COURTYARD = { x0: 35, x1: 44, y0: 22, y1: 26 };

const OVERLAID = new Set(Object.keys(SCHEDULE_OVERLAYS['w04-dojo'] ?? {}).filter((k) => !k.startsWith('_')));

/**
 * 作息（W3 的意義）：每個有排事的日程時段，有沒有做到排定的事（時段內做排定活動 ≥ 10 分鐘），
 * 加上 day-report 的睡／吃／工作判定。擾動造成的「同一時段挑了排定活動裡的另一個」（例如看診↔抓藥）、
 * 留白時段挑了別的閒事、或幾分鐘的先後差，不算作息不同（列在 INFO）。
 */
export function routine(cid: string, segs: Segment[], day: number): string[] {
  const [from] = dayRange(day);
  const sched = SCHEDULES[cid];
  const out: string[] = [];
  for (const blk of sched?.blocks ?? []) {
    let did = 0;
    for (const [a, b, , act] of segs) {
      if (!blk.do.includes(act)) continue;
      for (let t = Math.max(a, from); t < Math.min(b, from + 1440); t++) {
        const mod = t - from;
        if (inRange(mod, [blk.from, blk.to])) did++;
      }
    }
    out.push(`${blk.label}(${blk.from}-${blk.to})${did >= 10 ? '有做' : '沒做'}`);
  }
  return out;
}

/**
 * W5：dojo-diff 比的是「W4 的世界 vs W3 的世界」（武館第 1 日固定重開）。w05-mind 起武館改由心念觸發，
 * 第 1 日武館還沒開，所以這裡固定關 w05-mind（＝W4 的設定）；W5 開／關的比較在 mind-diff（DEVIATIONS W5-x）。
 */
const W4_WORLD = { 'w05-mind': false };

export function dojoDiff(seed: number, minutes: number) {
  const offShort = runHeadless({ seed, minutes, elements: { ...W4_WORLD, 'w04-dojo': false } });
  const w = offShort.game.world.wuxia!;
  const offEnabled = Object.keys(w.enabled).sort();
  const lifeRes = Object.keys((w.elements['w03-life'] as any)?.res ?? {});
  const resultA = {
    ok:
      offEnabled.join(',') === 'w01-skin,w02-folk,w03-life' &&
      w.elements['w04-dojo'] === undefined &&
      !lifeRes.some((id) => ['dummies', 'stone-locks', 'plum-posts', 'coach-seat', 'sandbag'].includes(id)) &&
      (seed !== 7 || minutes !== 30 || offShort.finalHash === W3_HASH_SEED7_30MIN),
    hash: offShort.finalHash,
    enabled: offEnabled,
  };

  const on = runHeadless({ seed, minutes: 0, untilGameMinute: 1440, trace: true, elements: W4_WORLD });
  const off = runHeadless({ seed, minutes: 0, untilGameMinute: 1440, trace: true, elements: { ...W4_WORLD, 'w04-dojo': false } });
  const [d0, d1] = dayRange(1);

  // B：關掉時武館空著
  let offTraining = 0;
  for (const segs of Object.values(off.summary.life!.timeline))
    for (const [a, b, , act] of clip(segs, d0, d1)) if (TRAINING_ACTS.has(act)) offTraining += b - a;
  let offCourtyard = 0;
  for (const tr of off.traces.values())
    for (const p of tr)
      if (p.x >= COURTYARD.x0 && p.x <= COURTYARD.x1 && p.y >= COURTYARD.y0 && p.y <= COURTYARD.y1) offCourtyard++;
  let onTraining = 0;
  for (const segs of Object.values(on.summary.life!.timeline))
    for (const [a, b, , act] of clip(segs, d0, d1)) if (TRAINING_ACTS.has(act)) onTraining += b - a;
  const resultB = { ok: offTraining === 0 && offCourtyard === 0 && onTraining > 0, offTraining, offCourtyard, onTraining };

  // C：時間表 diff
  const A = analyzeDay(on.summary.life!.timeline, 1);
  const B = analyzeDay(off.summary.life!.timeline, 1);
  const rows: Array<{ who: string; name: string; overlaid: boolean; same: boolean; routineSame: boolean; on: string[]; off: string[]; routineDiff: string[] }> = [];
  for (const p of A) {
    const q = B.find((x) => x.who === p.who)!;
    const rOn = [...routine(p.who, on.summary.life!.timeline[p.who], 1), ...p.verdicts.map((v) => `${v.rule}=${v.ok}`)];
    const rOff = [...routine(p.who, off.summary.life!.timeline[p.who], 1), ...q.verdicts.map((v) => `${v.rule}=${v.ok}`)];
    const routineDiff = [
      ...rOn.filter((x) => !rOff.includes(x)).map((x) => `開 ${x}`),
      ...rOff.filter((x) => !rOn.includes(x)).map((x) => `關 ${x}`),
    ];
    rows.push({
      who: p.who,
      name: p.name,
      overlaid: OVERLAID.has(p.who),
      same: p.signature === q.signature,
      routineSame: routineDiff.length === 0,
      on: p.lines,
      off: q.lines,
      routineDiff,
    });
  }
  const resultC = { ok: rows.every((r) => r.overlaid || r.routineSame), rows, hashOn: on.finalHash, hashOff: off.finalHash };
  return { resultA, resultB, resultC };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const seed = Number(args.seed ?? 7);
  const minutes = Number(args.minutes ?? 30);
  const { resultA, resultB, resultC } = dojoDiff(seed, minutes);
  const say = (s: string) => process.stdout.write(s + '\n');
  say(`seed=${seed} minutes=${minutes}`);
  say(`A ${resultA.ok ? 'ok  ' : 'FAIL'} w04-dojo 關＝W3 世界（enabled=${JSON.stringify(resultA.enabled)}，沒有武館物件與技能狀態） ${minutes} 分 hash ${resultA.hash}`);
  say(`B ${resultB.ok ? 'ok  ' : 'FAIL'} 關：第 1 日練功 ${resultB.offTraining} 分、進武館院子 ${resultB.offCourtyard} 次（武館空著）；開：第 1 日練功 ${resultB.onTraining} 人分鐘`);
  say(`C ${resultC.ok ? 'ok  ' : 'FAIL'} 第 1 日時間表 開 ${resultC.hashOn.slice(0, 16)}… vs 關 ${resultC.hashOff.slice(0, 16)}…`);
  for (const r of resultC.rows) {
    const tag = r.overlaid
      ? '日程有改（練功相關）'
      : r.same
        ? '時間表完全相同'
        : r.routineSame
          ? '作息相同（每個日程時段都做到排定的事、睡／吃／工作判定相同；只差擾動造成的分鐘與挑選順序）'
          : '作息不同';
    say(`  ${r.name}（${r.who}）：${tag}`);
    if (!r.same) {
      for (const x of r.routineDiff) say(`      ${x}`);
      if (args.full) {
        say(`      開：${r.on.join('｜')}`);
        say(`      關：${r.off.join('｜')}`);
      }
    }
  }
  if (!(resultA.ok && resultB.ok && resultC.ok)) process.exit(1);
  say('dojo-diff passed');
}

if (process.argv[1]?.endsWith('dojo-diff.ts')) main();
