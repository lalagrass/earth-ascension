// 武俠小鎮 A2（#575）`npm run wuxia:diffusion`：每門武學擴散表（會的人、教／看／再傳、走樣、最深代數）＋「故事指紋」欄。
// 用法：npm run wuxia:diffusion -- [run.json] [--seed 7 --days 30 --arrive-day 5 --scenario master-open] [--json]
import { diffusion } from '../../convex/wuxia/a2_master/lineage';
import { loadA2Run } from './a2-run';

const { st, nameOf, args, label } = loadA2Run();
const rows = diffusion(st, nameOf);
if (args.json) process.stdout.write(JSON.stringify(rows, null, 1) + '\n');
else {
  const out = [`# 武學擴散（${label}）`, '', '| 武學 | 會的人 | 教 | 看 | 再傳 | 走樣 | 最深代數 | 故事指紋 |', '|---|---|---|---|---|---|---|---|'];
  for (const r of rows) out.push(`| ${r.name} | ${r.learners} | ${r.teach} | ${r.watch} | ${r.reteach} | ${r.flawed} | ${r.deepest} | ${r.fingerprint} |`);
  out.push('', '（教／看／再傳／走樣是「招數」，會的人是「人數」；最深代數：開山＝0）');
  process.stdout.write(out.join('\n') + '\n');
}
