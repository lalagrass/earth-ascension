// 武俠小鎮 W2（#554 驗收）：從 journal 隨機抽對話句，檢查禁用詞／英文，算 guard: template 比例。
// 用法：npx tsx tools/wuxia/sample-dialogue.ts docs/wuxia/fixtures/w02-live.jsonl --n 30 [--seed 2] [--blind] [--md]
//   --seed  抽樣用的種子（審核者可自己指定；預設 1）
//   --blind 盲讀版：不寫名字，說話者改成甲乙丙…（每次執行同一 seed 對應相同），句中出現的人名換成「○○」
//   --md    輸出 Markdown 表格（貼進 W2.md 用）
// 結束碼：抽到的句子有任何一句含禁用詞或英文 → 1。
import { checkReply } from '../../convex/wuxia/w02-folk/guard';
import { FOLK_CHARACTERS } from '../../convex/wuxia/w02-folk';
import { makeRng } from '../../convex/wuxia/rng';
import { readJournal } from './replay';
import { parseArgs } from './sim';

export type Line = {
  author: string;
  to?: string | null;
  text: string;
  guard: string;
  conversationId?: string;
  index?: number;
};

export function journalLinesOf(path: string): Line[] {
  const j = readJournal(path);
  return (j.messages ?? []).map((m: any) => ({
    author: m.author,
    to: m.to,
    text: m.text,
    guard: m.metadata?.guard ?? 'none',
    conversationId: m.conversationId,
    index: m.index,
  }));
}

/** 不放回抽樣（Fisher–Yates 前 n 個），種子亂數，同 seed 同結果。 */
export function sample<T>(items: T[], n: number, seed: number): T[] {
  const rng = makeRng(seed);
  const a = [...items];
  const k = Math.min(n, a.length);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}

const BLIND_LABELS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'];

export function blindText(text: string, names: string[]): string {
  let t = text;
  for (const n of [...names].sort((a, b) => b.length - a.length)) t = t.split(n).join('○○');
  return t;
}

export function report(lines: Line[], n: number, seed: number) {
  const all = lines.length;
  const count = (g: string) => lines.filter((l) => l.guard === g).length;
  const picked = sample(lines, n, seed);
  const checked = picked.map((l) => ({ ...l, check: checkReply(l.text) }));
  const bad = checked.filter((l) => !l.check.ok);
  const badHard = checked.filter((l) =>
    l.check.reasons.some((r) => r === 'english' || r.startsWith('word:')),
  );
  const allBadHard = lines.filter((l) =>
    checkReply(l.text).reasons.some((r) => r === 'english' || r.startsWith('word:')),
  );
  return {
    all,
    pass: count('pass'),
    retry: count('retry'),
    template: count('template'),
    none: count('none'),
    templateRatio: all ? count('template') / all : 0,
    picked: checked,
    bad,
    badHard,
    allBadHard,
  };
}

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args._[0];
  if (!file)
    throw new Error('usage: sample-dialogue <journal.jsonl> --n 30 [--seed 1] [--blind] [--md]');
  const n = Number(args.n ?? 30);
  const seed = Number(args.seed ?? 1);
  const lines = journalLinesOf(file);
  const r = report(lines, n, seed);
  const out = (s: string) => process.stdout.write(s + '\n');
  const names = [
    ...new Set([...FOLK_CHARACTERS.map((c) => c.name), ...lines.map((l) => l.author)]),
  ];
  // 盲讀版的代號：依說話者第一次出現在抽樣裡的順序，跟真名的對照不印出來
  const labels = new Map<string, string>();
  for (const l of r.picked) {
    if (!labels.has(l.author))
      labels.set(l.author, BLIND_LABELS[labels.size] ?? `#${labels.size + 1}`);
  }
  out(`file ${file}`);
  out(
    `messages ${r.all}  pass ${r.pass}  retry ${r.retry}  template ${r.template}  (無 metadata ${r.none})`,
  );
  out(`guard: template 比例 ${pct(r.templateRatio)}（目標 < 15%）`);
  out(`sample n=${r.picked.length} seed=${seed}${args.blind ? ' blind' : ''}`);
  if (args.md) {
    out(args.blind ? '| # | 說話者 | 守門 | 句子 |' : '| # | 說話者 → 對象 | 守門 | 句子 |');
    out('|---|---|---|---|');
  }
  const ordered = args.blind
    ? [...r.picked].sort((a, b) => labels.get(a.author)!.localeCompare(labels.get(b.author)!) || 0)
    : r.picked;
  ordered.forEach((l, i) => {
    const who = args.blind ? labels.get(l.author)! : `${l.author} → ${l.to ?? '?'}`;
    const text = args.blind ? blindText(l.text, names) : l.text;
    const flag = l.check.ok ? '' : `  ⚠ ${l.check.reasons.join(',')}`;
    if (args.md)
      out(
        `| ${i + 1} | ${who} | ${l.guard} | ${text.replace(/\|/g, '｜').replace(/\n/g, ' ')}${flag} |`,
      );
    else
      out(`${String(i + 1).padStart(2)}. [${l.guard}] ${who}：${text.replace(/\n/g, ' ')}${flag}`);
  });
  out(
    `抽樣中含禁用詞或英文：${r.badHard.length} 句；全部 ${r.all} 句中：${r.allBadHard.length} 句`,
  );
  out(`抽樣中不合守門（含長度）：${r.bad.length} 句`);
  if (r.badHard.length > 0) process.exit(1);
}

if (process.argv[1]?.endsWith('sample-dialogue.ts')) main();
