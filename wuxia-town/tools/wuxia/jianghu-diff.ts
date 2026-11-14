// 武俠小鎮 W8：w08-jianghu 開／關對照與 #560 驗收（wuxia:check 第 17 項）。
// 用法：npm run wuxia:jianghu-diff -- [--seed 7] [--minutes 30] [--days 60] [--skip-long]
//   A. --off w08-jianghu ＝ W7 的世界：enabled 沒有 w08-jianghu、世界狀態沒有它的痕跡；
//      seed 7、30 分鐘 hash 等於 W7 的 f7871ab0…，3 日 hash 等於 W7 的 bc2f17d0…
//   B. 同一事件丟進不同鎮況結局不同：--force-event bandit --day 5（武館還沒重開、沒人會武）vs --day 40，報告並列
//   C. #562 W8-12：--no-rumor-out 時 --days 日內不出現俠客與山賊
//   D. 預設設定跑 --days 日：鎮誌有內容、每則傳聞路徑可追溯、俠客／山賊有來因、大事件後 5 日平靜
// 任一不符 exit 1。
import { runHeadless } from './headless';
import { parseArgs, quietConsole } from './sim';
import { W08_JIANGHU, JianghuState, cidName } from '../../convex/wuxia/w08_jianghu/data';
import { jianghuReport } from './jianghu-report';
import { chronicleText } from './chronicle';

export const W7_HASH_SEED7_30MIN = 'f7871ab03e5c7bc1c2d415ed29fb3d54a29aea6184f77d43bd6cdd1421eb7023';
export const W7_HASH_SEED7_3DAYS = 'bc2f17d005a6e1c5fb58cb7159e9a026c6bc94ca20c856c8a4bc99e8d3876fcb';

export function jianghuDiffA(seed: number, minutes: number) {
  const off = { [W08_JIANGHU]: false };
  const short = runHeadless({ seed, minutes, elements: off });
  const w = short.game.world.wuxia!;
  const three = runHeadless({ seed, minutes: 0, untilGameMinute: 3 * 1440, elements: off });
  const ok =
    !w.enabled[W08_JIANGHU] &&
    w.elements[W08_JIANGHU] === undefined &&
    (seed !== 7 || minutes !== 30 || short.finalHash === W7_HASH_SEED7_30MIN) &&
    (seed !== 7 || three.finalHash === W7_HASH_SEED7_3DAYS);
  return { ok, hash: short.finalHash, hash3: three.finalHash };
}

/** 跑到強制事件結束（最多 day+3 日）為止，回傳那場山賊事件的結局。 */
export function forcedBandit(seed: number, day: number) {
  let done: any;
  const run = runHeadless({
    seed,
    minutes: 0,
    untilGameMinute: (day + 3) * 1440,
    forceEvent: { kind: 'bandit', day },
    onStep: (game) => {
      const st = game.world.wuxia!.elements[W08_JIANGHU] as JianghuState | undefined;
      done = st?.history.find((h) => h.forced);
      return !!done;
    },
  });
  const st = run.game.world.wuxia!.elements[W08_JIANGHU] as JianghuState;
  const dojo = run.game.world.wuxia!.elements['w04-dojo'] as any;
  const skills = dojo?.skills ?? {};
  return { hash: run.finalHash, ev: done, st, fists: Object.fromEntries(Object.entries(skills).map(([k, v]: any) => [k, v.fist])), dojoOpen: dojo?.openedAt !== undefined };
}

export function describeBandit(r: ReturnType<typeof forcedBandit>): string[] {
  const o = r.ev?.outcome;
  if (!o) return ['（事件沒有結束）'];
  const lines = [
    `第 ${r.ev.day} 日，${o.count} 名山賊；武館${r.dojoOpen ? '已開' : '還沒開'}；鎮上拳腳：${Object.entries(r.fists).map(([k, v]) => `${cidName(k)} ${v}`).join('、')}`,
    `上前的人：${o.defenders.length ? o.defenders.map(cidName).join('、') : '沒有'}`,
    ...o.fights.map((f: any) => `  ${cidName(f.cid)} 對 ${f.bandit}：${f.winner === 'draw' ? '平手' : `${cidName(f.winner)} 勝`}（${f.rounds} 回合）`),
    `結局：${o.outcome === 'fled' ? `山賊被 ${o.heroes.map(cidName).join('、')} 打跑` : `藥鋪被搶走 ${o.loot} 箱，何郎中記「被搶」`}`,
    `鎮誌：${r.ev.text}`,
  ];
  return lines;
}

export function jianghuDiffB(seed: number, d1 = 5, d2 = 40) {
  const a = forcedBandit(seed, d1);
  const b = forcedBandit(seed, d2);
  const oa = a.ev?.outcome;
  const ob = b.ev?.outcome;
  const differ = !!oa && !!ob && (oa.outcome !== ob.outcome || oa.defenders.join() !== ob.defenders.join());
  return { ok: differ, a, b };
}

export function jianghuDiffC(seed: number, days: number) {
  const run = runHeadless({ seed, minutes: 0, untilGameMinute: days * 1440, trace: true, noRumorOut: true });
  const st = run.summary.jianghu as JianghuState;
  const bad = st.history.filter((h) => h.kind === 'xiake' || h.kind === 'bandit');
  return { ok: bad.length === 0 && st.out.length === 0, hash: run.finalHash, kinds: st.history.map((h) => h.kind), carried: st.trail.filter((t) => t.via === 'merchant').length };
}

export function jianghuDiffD(seed: number, days: number) {
  const run = runHeadless({ seed, minutes: 0, untilGameMinute: days * 1440, trace: true });
  return jianghuDiffDFrom(run.summary, run.finalHash);
}

/** W9：判定部分抽出來（wuxia:check 用共用長跑在第 days 日取樣的 summary，判定不變）。 */
export function jianghuDiffDFrom(summary: any, hash: string) {
  const report = jianghuReport([summary]);
  const text = chronicleText(summary);
  return { hash, report, text, summary };
}

/**
 * wuxia:check 第 17 項用：只跑 B／C／D 其中一段，最後一行印 JSON（check.ts 開頭就平行起這幾個子行程，
 * 跟第 1–16 項同時跑，CI 才不會超過 20 分鐘；判定內容跟單行程完全一樣）。
 */
export function jianghuPart(part: string, seed: number, days: number) {
  if (part === 'B') {
    const b = jianghuDiffB(seed);
    return { ok: b.ok, a: describeBandit(b.a), b: describeBandit(b.b), oa: b.a.ev?.outcome?.outcome, ob: b.b.ev?.outcome?.outcome };
  }
  if (part === 'C') {
    const c = jianghuDiffC(seed, days);
    return { ok: c.ok, hash: c.hash, kinds: c.kinds, carried: c.carried };
  }
  if (part === 'D') {
    const d = jianghuDiffD(seed, days);
    return { hash: d.hash, verdicts: d.report.verdicts, chronicle: d.summary.jianghu.chronicle.length };
  }
  throw new Error(`unknown part ${part}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const seed = Number(args.seed ?? 7);
  const minutes = Number(args.minutes ?? 30);
  const days = Number(args.days ?? 60);
  if (args.part) {
    process.stdout.write(`\n@@JSON ${JSON.stringify(jianghuPart(String(args.part), seed, days))}\n`);
    return;
  }
  let fails = 0;
  const out = (ok: boolean, msg: string) => {
    if (!ok) fails++;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${msg}\n`);
  };
  const a = jianghuDiffA(seed, minutes);
  out(a.ok, `jianghu-diff A：w08-jianghu 關＝W7 世界 hash ${a.hash}（3 日 ${a.hash3.slice(0, 16)}…）`);
  const b = jianghuDiffB(seed);
  process.stdout.write(['--force-event bandit --day 5：', ...describeBandit(b.a).map((l) => `  ${l}`), '--force-event bandit --day 40：', ...describeBandit(b.b).map((l) => `  ${l}`)].join('\n') + '\n');
  out(b.ok, `jianghu-diff B：山賊第 5 日 vs 第 40 日結局不同（${b.a.ev?.outcome.outcome}／${b.b.ev?.outcome.outcome}）`);
  if (!args['skip-long']) {
    const c = jianghuDiffC(seed, days);
    out(c.ok, `jianghu-diff C：--no-rumor-out ${days} 日沒有俠客與山賊（事件：${c.kinds.join('、') || '無'}；行商聽了 ${c.carried} 則但不算出鎮；hash ${c.hash.slice(0, 16)}…）`);
    const d = jianghuDiffD(seed, days);
    for (const v of d.report.verdicts.slice(1)) out(v.ok, `jianghu-report seed ${seed} ${days} 日（hash ${d.hash.slice(0, 16)}…）${v.rule}：${v.value}`);
    out(d.summary.jianghu.chronicle.length > 0, `鎮誌 ${d.summary.jianghu.chronicle.length} 條、事件 ${d.report.verdicts[0].value}`);
  }
  if (fails) process.exit(1);
}

if (process.argv[1] && /jianghu-diff\.ts$/.test(process.argv[1])) main();
