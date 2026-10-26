// 彙整 longrun60.json → 每 10 日平均曲線與每開局糧荒日數。用法：node artifacts/v178/analyze60.mjs [file]
import fs from 'node:fs';
const { cases } = JSON.parse(fs.readFileSync(process.argv[2] || 'artifacts/v178/longrun60.json', 'utf8'));
const avg = (a) => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
const days = [...new Set(cases.flatMap((c) => c.snaps.map((x) => x.day)))].sort((a, b) => a - b);
const curve = days.map((day) => { const S = cases.map((c) => c.snaps.find((x) => x.day === day)).filter(Boolean);
  const pk = Object.keys(S[0].pop || {}); return { day, coin: avg(S.map((x) => x.coin)), coinMin: Math.min(...S.map((x) => x.coin)), coinMax: Math.max(...S.map((x) => x.coin)), built: avg(S.map((x) => x.built)), raids: avg(S.map((x) => x.raids)), hurt: avg(S.map((x) => x.hurt)), deaths: avg(S.map((x) => x.deaths)),
    best: avg(S.map((x) => x.best)), endless: avg(S.map((x) => x.endless)), endlessMax: Math.max(...S.map((x) => x.endless)), ds: avg(S.map((x) => x.ds)), couples: avg(S.map((x) => x.couples)), pill: avg(S.map((x) => x.pill)), pop: Object.fromEntries(pk.map((k) => [k, avg(S.map((x) => x.pop[k] || 0))])) }; });
const byOpen = {}; for (const c of cases) (byOpen[c.opening] ??= []).push(c);
const opens = Object.fromEntries(Object.entries(byOpen).map(([k, a]) => [k, { foodLowDays: avg(a.map((c) => c.foodLowDays)), best: avg(a.map((c) => c.final.best)), endless: avg(a.map((c) => c.final.endless)), reached1600: a.filter((c) => c.final.best >= 1600).length + '/' + a.length, coin60: avg(a.map((c) => c.final.coin)), built60: avg(a.map((c) => c.final.built)) }]));
const res = { ok: cases.filter((c) => c.ok).length + '/' + cases.length, curve, opens };
console.log(JSON.stringify(res, null, 1)); fs.writeFileSync('artifacts/v178/summary60.json', JSON.stringify(res, null, 1));
