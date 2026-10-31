/* loop128 通用 A/B（戰鬥＋經濟）：同種子 bot 玩家，某開關明寫 true／false。
   用法：SS_DT=0.25 node test/harness/diag-ab.mjs <key> [n=20] [start=1001] [days=30]；逐局 JSON 行，diag-ab-sum.mjs 加總。 */
import { run } from './bot.mjs';
import { power } from '../../src/jianghu.mjs';
const K = process.argv[2], N = +(process.argv[3] || 20), S0 = +(process.argv[4] || 1001), D = +(process.argv[5] || 30);
const avg = (a, f) => (a.length ? a.reduce((x, d) => x + f(d), 0) / a.length : 0);
const one = (seed, on) => { const s = run(seed, { [K]: on }, D, true), ds = s.ds.filter((d) => !d.labor), X = s.threat || {}, L = s.lair || {};
  return { seed, on, n: ds.length, fought: X.fought || 0, won: X.won || 0, paid: X.paid || 0, homeHurt: X.homeHurt || 0, lairN: L.n || 0, lairWon: L.won || 0,
    str: +avg(ds, (d) => d.skills.strength).toFixed(2), agi: +avg(ds, (d) => d.skills.agility).toFixed(2), pow: +power(s).toFixed(1), coin: s.res.coin, rep: s.rep || 0,
    hp: +avg(ds, (d) => d.hp).toFixed(2), valor: s.valor ?? null }; };
for (let k = 0; k < N; k++) { console.log(JSON.stringify(one(S0 + k, true))); console.log(JSON.stringify(one(S0 + k, false))); }
