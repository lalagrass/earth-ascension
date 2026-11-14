// 武俠小鎮 A3（#574）：wuxia:social-report／social-log／llm-usage 共用——讀 headless 的 run.json（--out），或直接跑一局。
// 用法：tsx tools/wuxia/social-report.ts [run.json] [--seed 7 --days 9 --trait lin-sao.ext=-1 --off a3-silent]
import { readFileSync } from 'node:fs';
import { parseArgs, quietConsole } from './sim';
import { parseTraits, runHeadless } from './headless';
import { profileById } from '../../convex/wuxia/w02_folk';
import type { A3State } from '../../convex/wuxia/a3_silent/data';

/** 會呼叫 LLM 的 operation（headless 由規則替身回模板；Convex 版才真的打 LLM） */
export const LLM_OPS = ['agentGenerateMessage', 'agentRememberConversation', 'wuxiaSparNarrate', 'wuxiaChronicleRewrite'];

export type SocialRun = {
  st?: A3State;
  operations: Record<string, number>;
  disciples: number;
  nameOf: (cid: string) => string;
  args: Record<string, any>;
  label: string;
  hash: string;
};

export function nameOf(cid: string): string {
  return profileById(cid)?.name ?? cid;
}

export function loadSocialRun(argv = process.argv.slice(2), defaultDays = 9): SocialRun {
  const args = parseArgs(argv);
  const file = args._?.[0];
  let summary: any;
  let label: string;
  if (file) {
    summary = JSON.parse(readFileSync(file, 'utf8'));
    label = file;
  } else {
    quietConsole(!!args.verbose);
    const seed = Number(args.seed ?? 7);
    const days = Number(args.days ?? defaultDays);
    const elements: Record<string, boolean> = {};
    for (const id of String(args.off ?? '').split(',').filter(Boolean)) elements[id] = false;
    const run = runHeadless({ seed, minutes: 1, untilGameMinute: days * 1440, elements, traits: parseTraits(args.trait) });
    summary = run.summary;
    label = `seed ${seed}、${days} 日${args.trait ? `、人格 ${args.trait}` : ''}${args.off ? `、--off ${args.off}` : ''}（hash ${run.finalHash.slice(0, 16)}…）`;
  }
  const disciples = Object.keys(summary.a2?.disciples ?? {}).length;
  return { st: summary.a3, operations: summary.stats?.operations ?? {}, disciples, nameOf, args, label, hash: summary.finalHash };
}

/** 輸出一行（headless 跑完 console 被 quietConsole 關掉，直接寫 stdout） */
export function say(s = ''): void {
  process.stdout.write(s + '\n');
}
