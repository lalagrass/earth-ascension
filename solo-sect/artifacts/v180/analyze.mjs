// v1.8 longrun 分析：node artifacts/v180/analyze.mjs <new.json> <old.json>
import { readFileSync } from 'node:fs';
const load = (f) => JSON.parse(readFileSync(f, 'utf8'));
const stat = (j) => {
  const C = j.cases, n = C.length, avg = (f) => +(C.reduce((a, c) => a + f(c), 0) / n).toFixed(2);
  const days = (c) => c.days ?? j.days;
  const yue = C.filter((c) => /岳不群|yue/.test(c.opening));
  return {
    n, couples: avg((c) => c.final.couples ?? 0), couplesMin: Math.min(...C.map((c) => c.final.couples ?? 0)), couplesMax: Math.max(...C.map((c) => c.final.couples ?? 0)),
    passPerDay: avg((c) => (c.final.pass ?? 0) / days(c)), passMax: Math.max(...C.map((c) => +((c.final.pass ?? 0) / days(c)).toFixed(2))),
    starve5: avg((c) => (c.daily || []).filter((d) => d.day <= 5 && d.res.food <= 0).length),
    coin: avg((c) => c.final.res.coin), best: avg((c) => c.final.best),
    yue1600: `${yue.filter((c) => c.final.best >= 1600).length}/${yue.length}`,
    guojing: C.filter((c) => /郭靖|guo/.test(c.opening)).map((c) => `${c.seed}:${c.final.best}`).join(' '),
    ok: C.filter((c) => c.ok).length,
  };
};
const [a, b] = process.argv.slice(2);
const out = { new: stat(load(a)), ...(b ? { old: stat(load(b)) } : {}) };
console.log(JSON.stringify(out, null, 1));
