// loop63 診斷：扣分降了心情為何不升。用法：SS_DT=0.25 node test/harness/diag-moodcap.mjs [count] [days] [start] [spec-json]
// 每 10 tick 取樣 ≥8 人階段：原始目標和（未夾 0–100）、被上限夾住比例、心情與目標差。輸出 JSON 一行給合併。
import { run, seedRange } from './bot.mjs';
import { moodParts } from '../../src/mind.mjs';
const [n = 5, days = 60, start = 1001] = process.argv.slice(2, 5).map(Number), SPEC = JSON.parse(process.argv[5] || '{}');
const A = { k: 0, raw: 0, cap: 0, mood: 0, gap: 0 };
for (const seed of seedRange(n, start)) { let tk = 0;
  run(seed, SPEC, days, true, (s) => { if (++tk % 10 || s.ds.length < 8) return;
    for (const d of s.ds) { const raw = moodParts(d, s).reduce((a, [, v]) => a + v, 0); A.k++; A.raw += raw; if (raw >= 100) A.cap++; A.mood += d.mood; A.gap += Math.min(100, raw) - d.mood; } }); }
console.log('JSON ' + JSON.stringify(A));
