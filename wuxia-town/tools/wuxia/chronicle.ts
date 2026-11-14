// 武俠小鎮 W8（#560）：印出山腳鎮誌。
// 用法：npm run wuxia:chronicle -- /tmp/j.json [--entries]（headless --days 的輸出；--entries 另列每一條規則模板句與時辰）
// 每天一段：有 LLM 改寫過的段落（實跑）用段落、標 [pass]/[retry]；沒有就用規則模板段落、標 [模板]。
import { readFileSync } from 'node:fs';
import { parseArgs } from './sim';
import { readClock } from '../../convex/wuxia/clock';
import { chronicleLines } from '../../convex/wuxia/w08_jianghu/chronicle';
import type { JianghuState } from '../../convex/wuxia/w08_jianghu/data';

export function chronicleText(summary: any, withEntries = false): string {
  const st = summary.jianghu as JianghuState | undefined;
  if (!st) throw new Error('chronicle：這份輸出沒有 jianghu（要用 headless --days、w08-jianghu 開啟）');
  const days = summary.life?.days ?? '?';
  const lines: string[] = [`山腳鎮誌（seed ${summary.seed}，${days} 日，hash ${String(summary.finalHash).slice(0, 16)}…）`, ''];
  for (const d of chronicleLines(st)) {
    lines.push(`${d.text}${d.guard === 'template' ? '' : ` [${d.guard}]`}`);
    if (withEntries)
      for (const e of st.chronicle.filter((x) => x.day === d.day))
        lines.push(`    · ${readClock(e.gm).label} ${e.kind}${e.event ? ` #${e.event}` : ''}：${e.text}`);
  }
  const counts: Record<string, number> = {};
  for (const h of st.history) counts[h.kind] = (counts[h.kind] ?? 0) + 1;
  lines.push('', `事件：${Object.entries(counts).map(([k, n]) => `${k}×${n}`).join('、') || '無'}；傳聞 ${st.rumors.length} 則、出鎮 ${st.out.length} 則、傳了 ${st.trail.length} 手`);
  return lines.join('\n') + '\n';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args._[0];
  if (!file) throw new Error('usage: wuxia:chronicle -- run.json [--entries]');
  process.stdout.write(chronicleText(JSON.parse(readFileSync(file, 'utf8')), !!args.entries));
}

if (process.argv[1] && /chronicle\.ts$/.test(process.argv[1])) main();
