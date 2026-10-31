/* loop141 readwu A/B：bot 30 日內不蓋藏經閣，所以兩組都在第 0 日給一座藏經閣（情境測試），只差 readwu 明寫 true／false。
   用法：SS_DT=0.25 node test/harness/diag-readwu.mjs [n=20] [start=1001] [days=30]；逐局 JSON 行。 */
import { run } from './bot.mjs';
import { power } from '../../src/jianghu.mjs';
import { gated } from '../../src/arts.mjs';
import { ARTS } from '../../src/data.mjs';
const N = +(process.argv[2] || 20), S0 = +(process.argv[3] || 1001), D = +(process.argv[4] || 30);
const avg = (a, f) => (a.length ? a.reduce((x, d) => x + f(d), 0) / a.length : 0);
const lib = (s) => { if (s.fac.library && !s.fac.library.stage) s.fac.library.stage = 1; };
const one = (seed, on) => { const s = run(seed, { readwu: on }, D, true, lib), ds = s.ds.filter((d) => !d.labor), X = s.threat || {};
  return { seed, on, n: ds.length, wu: +avg(ds, (d) => d.wu ?? d.root ?? 3).toFixed(3), opened: ds.filter((d) => d.rwDone).length, rw: +avg(ds, (d) => d.rw || 0).toFixed(2),
    gatedArts: ds.reduce((a, d) => a + ARTS.filter((x) => d.arts?.[x.id] && gated(d, x)).length, 0), pow: +power(s).toFixed(1), fought: X.fought || 0, won: X.won || 0, coin: s.res.coin, mood: +avg(ds, (d) => d.mood).toFixed(1) }; };
for (let k = 0; k < N; k++) { console.log(JSON.stringify(one(S0 + k, true))); console.log(JSON.stringify(one(S0 + k, false))); }
