// loop42 綜合評估：loop39–41 三規則（qshare/jhrefuse/mfit）全開 vs 全關。用法：node test/harness/diag-combo.mjs [count] [days] [start] [idle|bot] [on|off]
import { run, seedRange } from './bot.mjs';
import { power } from '../../src/jianghu.mjs';
const [n = 160, days = 60, start = 1001] = process.argv.slice(2, 5).map(Number), bot = process.argv[5] !== 'idle', on = process.argv[6] !== 'off';
const A = { mood: 0, low: 0, ds: 0, rep: 0, coin: 0, pow: 0, done8: 0, hpLow: 0 };
for (const seed of seedRange(n, start)) { const s = run(seed, { qshare: on, jhrefuse: on, mfit: on }, days, bot);
  for (const d of s.ds) { A.ds++; A.mood += d.mood; if (d.mood < 35) A.low++; if (d.hp < 60) A.hpLow++; } A.rep += s.rep || 0; A.coin += s.res.coin; A.pow += power(s); if (s.ds.length >= 8) A.done8++; }
console.log(JSON.stringify({ bot, on, n, ds: A.ds, mood: A.mood, low: A.low, hpLow: A.hpLow, rep: A.rep, coin: A.coin, pow: A.pow, done8: A.done8 }));
