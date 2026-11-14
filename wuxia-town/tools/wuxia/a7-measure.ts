// 武俠小鎮 A7（#584）`npm run wuxia:a7-measure -- [--seeds 7,8,9] [--days 20]`
// 量測 a7.json 的 uptime：A6 世界（a7-tuition 關閉）裡，日程排給本業（jobBlocks）的時間，實際有幾成在做本業活動；
// 並量每人每日吃幾餐。只讀不改，輸出給 A7.md 與 a7.json 的 _src 引用。
import { parseArgs, quietConsole } from './sim';
import { runHeadless } from './headless';
import type { LifeState } from '../../convex/wuxia/w03_life';
import { jobActsOf, jobBlocks } from '../../convex/wuxia/a7_tuition/econ';

quietConsole(false);
const say = (s: string) => process.stdout.write(s + '\n');
const args = parseArgs(process.argv.slice(2));
const seeds = String(args.seeds ?? '7,8,9').split(',').map(Number);
const days = Number(args.days ?? 20);
let didMin = 0;
let schedMin = 0;
let meals = 0;
let personDays = 0;
const per: Record<string, { did: number; sched: number }> = {};
for (const seed of seeds) {
  const did: Record<string, number> = {};
  const eat: Record<string, number> = {};
  const seen = new Set<string>();
  runHeadless({
    seed,
    minutes: 1,
    untilGameMinute: days * 1440,
    elements: { 'a7-tuition': false },
    onStep: (game: any) => {
      const life = game.world.wuxia?.elements['w03-life'] as LifeState | undefined;
      if (!life) return;
      for (const p of Object.values(life.people)) {
        if (p.player) continue;
        const cur = p.cur;
        if (cur?.phase === 'do') {
          if (jobActsOf(p.cid).has(cur.act)) did[p.cid] = (did[p.cid] ?? 0) + 1;
          const key = `${p.cid}|${cur.since}`;
          if (cur.act === 'eat' && !seen.has(key)) {
            seen.add(key);
            eat[p.cid] = (eat[p.cid] ?? 0) + 1;
          }
        }
      }
    },
  } as any);
  for (const cid of Object.keys(did)) {
    let sched = 0;
    for (const b of jobBlocks(cid)) sched += ((b.to - b.from + 1440) % 1440) * days;
    per[cid] ??= { did: 0, sched: 0 };
    per[cid].did += did[cid];
    per[cid].sched += sched;
    didMin += did[cid];
    schedMin += sched;
  }
  for (const c of Object.keys(eat)) {
    meals += eat[c];
    personDays += days;
  }
}
say(`做本業 ${(didMin / 60 / seeds.length / days).toFixed(2)} 小時／人日（有本業的人，全部加總 ${didMin} 分鐘）；排給本業 ${schedMin} 分鐘；uptime ＝ ${(didMin / schedMin).toFixed(3)}`);
for (const c of Object.keys(per).sort()) say(`  ${c}\t做 ${per[c].did}\t排 ${per[c].sched}\t${(per[c].did / per[c].sched).toFixed(2)}`);
say(`每人日吃飯 ${(meals / personDays).toFixed(2)} 餐（${meals} 餐／${personDays} 人日）`);
