// v1.85 longrun 分析：node artifacts/v185/analyze.mjs <30d.json> <60d.json>
import { readFileSync } from 'node:fs';
const L = (f) => JSON.parse(readFileSync(f, 'utf8')).cases;
const av = (C, g) => +(C.reduce((a, c) => a + g(c), 0) / C.length).toFixed(2);
function s30(C) { const c10 = (c) => c.daily.find((x) => x.day === 10)?.res.coin || 1, r = C.map((c) => c.final.res.coin / c10(c)); const P = C.filter((c) => c.opening === 'plain'), Y = C.filter((c) => c.opening === 'yuebuqun'), G = C.filter((c) => c.opening === 'guojing');
  return { n: C.length, ok: C.filter((c) => c.ok).length, coinRatioAvg: av(C, (c) => c.final.res.coin / c10(c)), coinRatioMax: +Math.max(...r).toFixed(2), coinRatioAgg: +(C.reduce((a, c) => a + c.final.res.coin, 0) / C.reduce((a, c) => a + c10(c), 0)).toFixed(2), over2: C.filter((c, i) => r[i] > 2).map((c) => c.opening + c.seed),
    bankrupt: C.filter((c) => (c.final.econ?.left || 0) > 0 || c.final.res.coin < 0).length, missesAvg: av(C, (c) => c.final.econ?.misses || 0), leftMax: Math.max(...C.map((c) => c.final.econ?.left || 0)),
    starve5: av(C, (c) => c.daily.filter((d) => d.day <= 5 && d.res.food <= 0).length), couplesMax: Math.max(...C.map((c) => c.final.couples)), couplesAvg: av(C, (c) => c.final.couples),
    yue1600: `${Y.filter((c) => c.final.best >= 1600).length}/${Y.length}`, guo1600: `${G.filter((c) => c.final.best >= 1600).length}/${G.length}`, guojing: G.map((c) => `${c.seed}:${c.final.best}`).join(' '),
    plainDs: P.map((c) => c.final.ds).join(' '), plainBest: P.map((c) => c.final.best).join(' '), pillEnd: av(C, (c) => c.final.res.pill || 0), coinEnd: av(C, (c) => c.final.res.coin) }; }
function s60(C) { const at = (c, d) => c.snaps.find((x) => x.day === d), Y = C.filter((c) => c.opening === 'yuebuqun'), G = C.filter((c) => c.opening === 'guojing'), P = C.filter((c) => c.opening === 'plain'); const F = (c) => c.snaps.at(-1);
  return { n: C.length, ok: C.filter((c) => c.ok).length, coin60over10: av(C, (c) => F(c).coin / (at(c, 10)?.coin || 1)), coin30over10: av(C, (c) => (at(c, 30)?.coin || 0) / (at(c, 10)?.coin || 1)), bankrupt: C.filter((c) => (F(c).econ?.left || 0) > 0 || F(c).coin < 0).length, missesAvg: av(C, (c) => F(c).econ?.misses || 0),
    foodLowDays: av(C, (c) => c.foodLowDays), couplesMax: Math.max(...C.map((c) => F(c).couples)), yue1600: `${Y.filter((c) => F(c).best >= 1600).length}/${Y.length}`, guo1600: `${G.filter((c) => F(c).best >= 1600).length}/${G.length}`, plainDs: P.map((c) => F(c).ds).join(' '), pillEnd: av(C, (c) => F(c).pill), coinEnd: av(C, (c) => F(c).coin) }; }
const [a, b] = process.argv.slice(2); console.log(JSON.stringify({ d30: a ? s30(L(a)) : null, d60: b ? s60(L(b)) : null }, null, 1));
