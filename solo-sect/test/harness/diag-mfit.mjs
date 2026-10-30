// loop41 診斷：因材施教 開/關。用法：node test/harness/diag-mfit.mjs [count] [days] [start] [idle|bot] [on|off]
import { run, seedRange } from './bot.mjs';
import { power } from '../../src/jianghu.mjs';
const [n = 160, days = 60, start = 1001] = process.argv.slice(2, 5).map(Number), bot = process.argv[5] !== 'idle', on = process.argv[6] !== 'off';
const A = { t: 0, ts: 0, pow: 0, lw: 0, l: 0, lairWin: 0, lair: 0 };
for (const seed of seedRange(n, start)) { const s = run(seed, { mfit: on }, days, bot); const E = s.jhev || {}; A.t += E.t || 0; A.ts += E.ts || 0; A.pow += power(s); A.l += E.l || 0; A.lw += E.lw || 0; const h = s.lair?.hist || []; A.lair += h.length; A.lairWin += h.filter((x) => x.win).length; }
console.log(JSON.stringify({ bot, on, n, ...A, pow: Math.round(A.pow / n) }));
