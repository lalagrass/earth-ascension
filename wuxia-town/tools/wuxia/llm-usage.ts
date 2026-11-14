// 武俠小鎮 A3（#574）`npm run wuxia:llm-usage`：一局裡會打 LLM 的 operation 次數（#574 驗收 A：預設 0 次）。
// headless 由規則替身回模板，所以這裡數的是「真實部署時會打幾次」；Convex 版的實際 token 用量看 llmBudget 表。
// 用法：npm run wuxia:llm-usage -- [run.json] [--seed 7 --days 3] [--off a3-silent]
import { LLM_OPS, loadSocialRun, say } from './social-run';

const r = loadSocialRun(process.argv.slice(2), 3);
say(`# LLM 用量：${r.label}`);
let total = 0;
for (const op of LLM_OPS) {
  const n = r.operations[op] ?? 0;
  total += n;
  say(`${op.padEnd(28)} ${n}`);
}
say(`合計 ${total} 次${total === 0 ? '（預設模式 0 次 LLM）' : ''}`);
const other = Object.entries(r.operations).filter(([k]) => !LLM_OPS.includes(k));
if (other.length) say(`其他 operation（不打 LLM）：${other.map(([k, v]) => `${k} ${v}`).join('、')}`);
process.exitCode = r.args.strict && total > 0 ? 1 : 0;
