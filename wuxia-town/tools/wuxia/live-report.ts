// 武俠小鎮 W0：把 live-run.sh 的輸出（$OUT.usage.json、$OUT.messages.json、$OUT.meta）整理成 Markdown 摘要。
// 用法：npx tsx tools/wuxia/live-report.ts /tmp/wuxia-live [--price-in 0.15 --price-out 0.60] [--samples 10]
import { readFileSync } from 'node:fs';
import { parseArgs } from './sim';

const args = parseArgs(process.argv.slice(2));
const prefix = args._[0];
if (!prefix) throw new Error('usage: live-report <OUT prefix>');
const usage: any[] = JSON.parse(readFileSync(`${prefix}.usage.json`, 'utf8'));
const messages: any[] = JSON.parse(readFileSync(`${prefix}.messages.json`, 'utf8'));
const meta = Object.fromEntries(
  readFileSync(`${prefix}.meta`, 'utf8')
    .trim()
    .split(/\s+/)
    .map((kv) => kv.split('=')),
);
const minutes = (Number(meta.end) - Number(meta.start)) / 60;
const calls = usage.filter((u) => !u.fallback);
const fallbacks = usage.filter((u) => u.fallback);
const sum = (xs: any[], k: string) => xs.reduce((a, x) => a + x[k], 0);
const byKind = new Map<string, any[]>();
for (const u of calls) byKind.set(u.kind, [...(byKind.get(u.kind) ?? []), u]);
const lines: string[] = [];
const models = [...new Set(usage.map((u) => u.model))].join(', ');
lines.push(
  `- 模型：${models}；實跑 ${minutes.toFixed(1)} 分鐘；LLM 呼叫 ${calls.length} 次，模板句後備 ${fallbacks.length} 次`,
);
const pt = sum(calls, 'promptTokens');
const ct = sum(calls, 'completionTokens');
lines.push(
  `- token：prompt ${pt}、completion ${ct}、合計 ${pt + ct}（每小時約 ${Math.round(((pt + ct) / minutes) * 60)}）`,
);
const conv = calls.filter((u) => u.kind.startsWith('conversation.'));
const avg = (xs: any[]) => (xs.length ? Math.round(sum(xs, 'ms') / xs.length) : 0);
lines.push(`- 平均延遲：全部 ${avg(calls)} ms；對話句 ${avg(conv)} ms（${conv.length} 句）`);
if (args['price-in'] && args['price-out']) {
  const cost = (pt * Number(args['price-in']) + ct * Number(args['price-out'])) / 1e6;
  lines.push(
    `- 推估花費（$${args['price-in']}／$${args['price-out']} 每百萬 token）：US$${cost.toFixed(4)}`,
  );
}
lines.push('', '| kind | 次數 | prompt | completion | 平均 ms |', '|---|---|---|---|---|');
for (const [kind, xs] of [...byKind.entries()].sort()) {
  lines.push(
    `| ${kind} | ${xs.length} | ${sum(xs, 'promptTokens')} | ${sum(xs, 'completionTokens')} | ${avg(xs)} |`,
  );
}
const n = Number(args.samples ?? 10);
lines.push('', `對話樣本（前 ${n} 句，原文照錄）：`, '');
for (const m of messages.slice(0, n))
  lines.push(`1. **${m.author}**：${String(m.text).replace(/\s+/g, ' ').trim()}`);
process.stdout.write(lines.join('\n') + '\n');
