// v1.9 longrun 分析：node artifacts/v190/analyze.mjs <30d.json> [60d.json]
// 到頂＝所有可走藍圖的設施（鎮派地除外）都在最後一階；建成比例＝Σ階數／Σ最高階數。未到頂的案記為 days+1。
import { readFileSync } from 'node:fs';
import { FACILITIES } from '../../src/data.mjs';
const L = (f) => JSON.parse(readFileSync(f, 'utf8')).cases;
const av = (C, g) => +(C.reduce((a, c) => a + g(c), 0) / C.length).toFixed(2);
const med = (xs) => { const a = [...xs].sort((x, y) => x - y), n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
const BF = FACILITIES.filter((f) => f.stages.length > 1 && !f.sig), MAX = BF.reduce((a, f) => a + f.stages.length - 1, 0);
const frac = (st) => BF.reduce((a, f) => a + Math.min(st[f.id] || 0, f.stages.length - 1), 0) / MAX;
const topped = (st) => BF.every((f) => (st[f.id] || 0) >= f.stages.length - 1);
const styles = (C) => { const n = {}; for (const c of C) for (const k of c.styles || []) n[k] = (n[k] || 0) + 1; return n; };
function s30(C, D = 30) { const c10 = (c) => c.daily.find((x) => x.day === 10)?.res.coin || 1, r = C.map((c) => c.final.res.coin / c10(c)); const P = C.filter((c) => c.opening === 'plain'), Y = C.filter((c) => c.opening === 'yuebuqun'), G = C.filter((c) => c.opening === 'guojing');
  const at = (c, d) => c.daily.find((x) => x.day === d) || c.daily.at(-1); const topDay = (c) => c.daily.find((x) => topped(x.stages))?.day ?? D + 1; const TH = (c) => c.final.threat || {};
  return { n: C.length, ok: C.filter((c) => c.ok).length, maxStages: MAX,
    topDayMedian: med(C.map(topDay)), toppedBy30: C.filter((c) => topDay(c) <= D).length, builtFrac10: av(C, (c) => frac(at(c, 10).stages)), builtFrac20: av(C, (c) => frac(at(c, 20).stages)), stillBuildable25: C.filter((c) => !topped(at(c, 25).stages)).length,
    lotsBoughtAvg: av(C, (c) => c.final.lots?.bought || 0), rareEnd: { tiemu: av(C, (c) => c.final.res.tiemu || 0), lingshi: av(C, (c) => c.final.res.lingshi || 0) },
    raidsAvg: av(C, (c) => TH(c).n || 0), homeHurtAvg: av(C, (c) => TH(c).homeHurt || 0), homeHurtRange: [Math.min(...C.map((c) => TH(c).homeHurt || 0)), Math.max(...C.map((c) => TH(c).homeHurt || 0))], deaths: C.reduce((a, c) => a + (TH(c).deaths || 0), 0),
    raidedCases: C.filter((c) => (TH(c).n || 0) > 0).length, paidCases: C.filter((c) => (TH(c).paid || 0) > 0).length, payShare: +(C.reduce((a, c) => a + (TH(c).paid || 0), 0) / Math.max(1, C.reduce((a, c) => a + (TH(c).n || 0), 0))).toFixed(2),
    styles: styles(C),
    coinRatioAvg: av(C, (c) => c.final.res.coin / c10(c)), coinRatioMax: +Math.max(...r).toFixed(2), coinRatioAgg: +(C.reduce((a, c) => a + c.final.res.coin, 0) / C.reduce((a, c) => a + c10(c), 0)).toFixed(2), over2: C.filter((c, i) => r[i] > 2).map((c) => c.opening + c.seed),
    bankrupt: C.filter((c) => (c.final.econ?.left || 0) > 0 || c.final.res.coin < 0).length, missesAvg: av(C, (c) => c.final.econ?.misses || 0),
    starve5: av(C, (c) => c.daily.filter((d) => d.day <= 5 && d.res.food <= 0).length), couplesMax: Math.max(...C.map((c) => c.final.couples)), couplesAvg: av(C, (c) => c.final.couples),
    yue1600: `${Y.filter((c) => c.final.best >= 1600).length}/${Y.length}`, guo1600: `${G.filter((c) => c.final.best >= 1600).length}/${G.length}`, guojing: G.map((c) => `${c.seed}:${c.final.best}`).join(' '), bestAvg: av(C, (c) => c.final.best),
    plainDs: P.map((c) => c.final.ds).join(' '), plainBest: P.map((c) => c.final.best).join(' '), coinEnd: av(C, (c) => c.final.res.coin) }; }
function s60(C) { const at = (c, d) => c.snaps.find((x) => x.day === d), Y = C.filter((c) => c.opening === 'yuebuqun'), G = C.filter((c) => c.opening === 'guojing'), P = C.filter((c) => c.opening === 'plain'); const F = (c) => c.snaps.at(-1);
  const topDay = (c) => c.snaps.find((x) => topped(x.stages))?.day ?? 61;
  return { n: C.length, ok: C.filter((c) => c.ok).length, topSnapMedian: med(C.map(topDay)), toppedBy60: C.filter((c) => topDay(c) <= 60).length, raidsAvg: av(C, (c) => F(c).threat?.n || 0), homeHurtAvg: av(C, (c) => F(c).threat?.homeHurt || 0), deathsThreat: C.reduce((a, c) => a + (F(c).threat?.deaths || 0), 0), departures: C.reduce((a, c) => a + (c.deaths || 0), 0), paidCases: C.filter((c) => (F(c).threat?.paid || 0) > 0).length,
    coin60over10: av(C, (c) => F(c).coin / (at(c, 10)?.coin || 1)), coin30over10: av(C, (c) => (at(c, 30)?.coin || 0) / (at(c, 10)?.coin || 1)), bankrupt: C.filter((c) => (F(c).econ?.left || 0) > 0 || F(c).coin < 0).length, missesAvg: av(C, (c) => F(c).econ?.misses || 0),
    foodLowDays: av(C, (c) => c.foodLowDays), couplesMax: Math.max(...C.map((c) => F(c).couples)), yue1600: `${Y.filter((c) => F(c).best >= 1600).length}/${Y.length}`, guo1600: `${G.filter((c) => F(c).best >= 1600).length}/${G.length}`, plainDs: P.map((c) => F(c).ds).join(' '), bestAvg: av(C, (c) => F(c).best), coinEnd: av(C, (c) => F(c).coin), styles: styles(C) }; }
const [a, b] = process.argv.slice(2); console.log(JSON.stringify({ d30: a ? s30(L(a)) : null, d60: b ? s60(L(b)) : null }, null, 1));
