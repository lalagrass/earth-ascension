// loop40 診斷：挑戰帖量力而為 開/關 對照。用法：node test/harness/diag-letter.mjs [count] [days] [start] [idle|bot] [on|off]
import { run, seedRange } from './bot.mjs';
const [n = 160, days = 60, start = 1001] = process.argv.slice(2, 5).map(Number), bot = process.argv[5] !== 'idle', on = process.argv[6] !== 'off';
const A = { l: 0, lw: 0, lr: 0, rep: 0, mood: 0, ds: 0, done8: 0 };
for (const seed of seedRange(n, start)) { const s = run(seed, { jhrefuse: on }, days, bot); const E = s.jhev || {};
  A.l += E.l || 0; A.lw += E.lw || 0; A.lr += E.lr || 0; A.rep += s.rep || 0; for (const d of s.ds) { A.mood += d.mood; A.ds++; } if (s.ds.length >= 8) A.done8++; }
console.log(JSON.stringify({ bot, on, n, ...A, rep: A.rep, mood: +(A.mood / A.ds).toFixed(2) }));
