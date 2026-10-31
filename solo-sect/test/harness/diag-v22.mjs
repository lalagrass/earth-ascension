/* loop147 v2.2 基準 160×30 摘要：逐局 JSON 行。用法：SS_DT=0.25 node test/harness/diag-v22.mjs [n=20] [start=1001] [days=30] */
import { run } from './bot.mjs';
import { power } from '../../src/jianghu.mjs';
import { mastery, CATS, qiMax, qiOf } from '../../src/arts.mjs';
const N = +(process.argv[2] || 20), S0 = +(process.argv[3] || 1001), D = +(process.argv[4] || 30);
const avg = (a, f) => (a.length ? a.reduce((x, d) => x + f(d), 0) / a.length : 0);
for (let k = 0; k < N; k++) { const seed = S0 + k, c = { n: 0, hungry: 0, ngd: 0, qiFull: 0, spent: 0, shelter: 0 }; let i = 0;
  const s = run(seed, { v22: true }, D, true, (s) => { if (++i % 40) return; for (const d of s.ds) { if (d.labor || d.away) continue; c.n++;
    if ((d.needs?.hunger ?? 100) < 30) c.hungry++; if (d.ng2 && qiMax(d) > 0) { c.ngd++; c.qiFull += qiOf(d) / qiMax(d); if ((d.spentUntil ?? -1) > s.t) c.spent++; } if (d.shelter || d.task?.act === 'shelter') c.shelter++; } });
  const ds = s.ds.filter((d) => !d.labor), X = s.threat || {}, L = s.lair || {}, top = (d) => Math.max(0, ...Object.keys(CATS).map((k) => mastery(d, k)));
  console.log(JSON.stringify({ seed, n: ds.length, coin: s.res.coin, food: s.res.food, mood: +avg(ds, (d) => d.mood).toFixed(1), hungryPct: +(100 * c.hungry / (c.n || 1)).toFixed(2),
    fought: X.fought || 0, won: X.won || 0, lairWon: L.won || 0, boss: X.boss?.state || null, taiping: !!X.taiping, valor: s.valor ?? null, pow: +power(s).toFixed(1),
    mastTop: +avg(ds, top).toFixed(1), ngPct: +(100 * c.ngd / (c.n || 1)).toFixed(1), qiFill: +(c.qiFull / (c.ngd || 1)).toFixed(3), spentPct: +(100 * c.spent / (c.ngd || 1)).toFixed(2), shelter: c.shelter, chron: (s.chron || []).length })); }
