// v2.1 長跑驗收摘要。用法：node artifacts/v210/analyze.mjs <longrun30.json> <longrun60.json>
import { readFileSync } from 'node:fs';
const load = (f) => JSON.parse(readFileSync(f, 'utf8'));
const av = (xs) => xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : null;
const snap = (c, day) => c.snaps.find((x) => x.day === day);
const last = (c) => c.snaps.at(-1);
const ratio = (c, day) => { const a = snap(c, 10)?.coin || 0, b = (day ? snap(c, day) : last(c))?.coin || 0; return a ? b / a : null; };
function pillOf(c) {
  const P = last(c).pills || { made: 0, used: 0, sold: 0, aged: 0 };
  const den = (P.used || 0) + (P.sold || 0) + (P.aged || 0);
  return { ...P, ratio: den ? +(P.made / den).toFixed(2) : null };
}
function summarize(doc) {
  const C = doc.cases;
  const by = {};
  for (const c of C) (by[c.opening] ??= []).push(c);
  const rows = {};
  for (const [op, cs] of Object.entries(by)) {
    const ratios = cs.map((c) => ratio(c));
    rows[op] = {
      n: cs.length, ok: cs.filter((c) => c.ok).length,
      best: cs.map((c) => last(c).best),
      ge1600: cs.filter((c) => last(c).best >= 1600).length,
      ge700: cs.filter((c) => last(c).best >= 700).length,
      coin: cs.map((c) => ({ seed: c.seed, d10: snap(c, 10)?.coin, end: last(c).coin, x: +ratio(c).toFixed(2) })),
      ratioAvg: +av(ratios).toFixed(2),
      homeHurt: cs.map((c) => last(c).threat?.homeHurt || 0),
      deaths: cs.reduce((a, c) => a + (last(c).threat?.deaths || 0), 0),
      departures: cs.reduce((a, c) => a + (c.deaths || 0), 0),
      built: cs.map((c) => last(c).built),
      bankrupt: cs.filter((c) => (last(c).econ?.left || 0) > 0 || last(c).coin < 0).map((c) => c.seed),
    };
  }
  const ratios = C.map((c) => ratio(c));
  const pills = C.map(pillOf);
  const made = pills.reduce((a, p) => a + p.made, 0), used = pills.reduce((a, p) => a + p.used, 0), sold = pills.reduce((a, p) => a + p.sold, 0), aged = pills.reduce((a, p) => a + p.aged, 0);
  const den = used + sold + aged;
  return {
    days: doc.days, n: C.length, ok: C.filter((c) => c.ok).length,
    coinRatioAvg: +av(ratios).toFixed(2),
    coinOver25: C.filter((c) => ratio(c) > 2.5).map((c) => `${c.opening}${c.seed}:${ratio(c).toFixed(2)}`),
    homeHurtAvg: av(C.map((c) => last(c).threat?.homeHurt || 0)),
    homeHurtMin: Math.min(...C.map((c) => last(c).threat?.homeHurt || 0)),
    homeHurtMax: Math.max(...C.map((c) => last(c).threat?.homeHurt || 0)),
    deaths: C.reduce((a, c) => a + (last(c).threat?.deaths || 0), 0),
    departures: C.reduce((a, c) => a + (c.deaths || 0), 0),
    bankrupt: C.filter((c) => (last(c).econ?.left || 0) > 0 || last(c).coin < 0).map((c) => `${c.opening}${c.seed}`),
    pills: {
      made, used, sold, aged,
      ratio: den ? +(made / den).toFixed(2) : null,
      over13: C.filter((c) => { const p = pillOf(c); return p.ratio != null && p.ratio > 1.3; }).map((c) => `${c.opening}${c.seed}:${pillOf(c).ratio}`),
      zero: C.filter((c) => !(last(c).pills?.made)).map((c) => `${c.opening}${c.seed}`),
    },
    openings: rows,
  };
}
const [a, b] = process.argv.slice(2);
const out = {};
if (a) out.d30 = summarize(load(a));
if (b) out.d60 = summarize(load(b));
console.log(JSON.stringify(out, null, 1));
