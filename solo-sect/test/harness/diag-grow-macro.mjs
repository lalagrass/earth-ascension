/* loop86 成長分層全局對照：同種子、bot 玩家、開／關成長分層，看全派武學與經濟有沒有被意外影響。
   用法：SS_DT=0.25 node test/harness/diag-grow-macro.mjs [n=160] [start=1001] [days=20] */
import { run } from './bot.mjs';
import { mastery } from '../../src/growth.mjs';
import { artTier } from '../../src/arts.mjs';
const N = +(process.argv[2] || 160), S0 = +(process.argv[3] || 1001), D = +(process.argv[4] || 20);
const one = (seed, grow) => { const s = run(seed, { grow }, D, true), ds = s.ds.filter((d) => !d.labor);
  const tiers = ds.flatMap((d) => Object.keys(d.arts || {}).map((id) => artTier(d, id)));
  return { seed, grow, n: ds.length, xp: +ds.reduce((a, d) => a + Object.values(d.arts || {}).reduce((b, r) => b + r.xp, 0), 0).toFixed(1), da: tiers.filter((t) => t >= 2).length,
    palm: +(ds.reduce((a, d) => a + d.skills.palm, 0) / ds.length).toFixed(2), coin: s.res.coin, rep: s.rep, mQ: +(ds.reduce((a, d) => a + mastery(d, 'quanzhang'), 0) / ds.length).toFixed(2), moves: ds.reduce((a, d) => a + d.moves.length, 0) }; };
const rows = []; for (let k = 0; k < N; k++) rows.push(one(S0 + k, true), one(S0 + k, false));
const av = (g, f) => { const v = rows.filter((r) => r.grow === g).map((r) => r[f]); return +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3); };
const keys = ['n', 'xp', 'da', 'palm', 'coin', 'rep', 'mQ', 'moves'];
console.log(JSON.stringify({ dt: process.env.SS_DT, seeds: [S0, S0 + N - 1], days: D, on: Object.fromEntries(keys.map((k) => [k, av(true, k)])), off: Object.fromEntries(keys.map((k) => [k, av(false, k)])), sameCoinSeeds: rows.filter((r, i) => i % 2 === 0 && r.coin === rows[i + 1].coin).length }));
