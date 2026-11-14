// 武俠小鎮 A2（#575）：wuxia:lineage／diffusion／art-trace 共用——讀 headless 的 run.json（--out），或直接跑一局。
// 用法：tsx tools/wuxia/lineage.ts [run.json] [--seed 7 --days 30 --arrive-day 5 --scenario master-open]
import { readFileSync } from 'node:fs';
import { parseArgs, quietConsole } from './sim';
import { runHeadless } from './headless';
import type { A2State } from '../../convex/wuxia/a2_master/data';

export type A2Run = { st: A2State; names: Record<string, string>; nameOf: (cid: string) => string; cidOf: (who: string) => string; args: Record<string, any>; label: string };

export function loadA2Run(argv = process.argv.slice(2)): A2Run {
  const args = parseArgs(argv);
  const file = (args._ as string[] | undefined)?.[0];
  let a2: any;
  let label: string;
  if (file) {
    {
      const j = JSON.parse(readFileSync(file, 'utf8'));
      a2 = j.a2 ?? j.summary?.a2;
    }
    label = file;
  } else {
    quietConsole(!!args.verbose);
    const seed = Number(args.seed ?? 7);
    const days = Number(args.days ?? 30);
    const run = runHeadless({
      seed,
      minutes: 1,
      untilGameMinute: days * 1440,
      scenario: args.scenario === undefined ? undefined : String(args.scenario),
      arriveDay: args['arrive-day'] === undefined ? undefined : Number(args['arrive-day']),
    });
    a2 = run.summary.a2;
    label = `seed ${seed}、${days} 日${args.scenario ? `、${args.scenario}` : ''}${args['arrive-day'] ? `、大師第 ${args['arrive-day']} 日進鎮` : ''}（hash ${run.finalHash.slice(0, 16)}…）`;
  }
  if (!a2) throw new Error('run 裡沒有 a2-master 資料（a2-master 要開）');
  const names: Record<string, string> = a2.names ?? {};
  const nameOf = (cid: string) => names[cid] ?? cid;
  const cidOf = (who: string) => Object.keys(names).find((c) => names[c] === who) ?? who;
  return { st: a2 as A2State, names, nameOf, cidOf, args, label };
}
