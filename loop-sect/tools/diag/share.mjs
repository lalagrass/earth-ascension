// v8（retro 7）：新情境跟 base 比「誰的時間被擠掉、糧食帳差在哪」。第 3–10 日的工作分布（同門）與十日帳本。
// 用法：node loop-sect/tools/diag/share.mjs <scenario> [fromSeed=1] [days=10]
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { TICKS_PER_DAY } from '../../src/data.mjs';
const sc = process.argv[2] ?? 'hunt', F = Number(process.argv[3] ?? 1), D = Number(process.argv[4] ?? 10);
const KEYS = ['picked', 'rawEaten', 'rawStolen', 'rawCooked', 'mealsEaten'];
const run = (name) => {
  const acts = {}, led = {};
  for (let seed = F; seed < F + 12; seed++) {
    const s = createWorld({ seed, people: rosterFor(seed) });
    for (let t = 0; t < D * TICKS_PER_DAY; t++) {
      script(s, name); step(s);
      if (t < 2 * TICKS_PER_DAY) continue;
      for (const p of s.people) if (!p.guest) { const k = p.task?.kind ?? 'none'; acts[k] = (acts[k] ?? 0) + 1; }
    }
    for (const k of KEYS) led[k] = (led[k] ?? 0) + s.ledger[k];
  }
  const tot = Object.values(acts).reduce((a, b) => a + b, 0);
  return { share: Object.fromEntries(Object.entries(acts).map(([k, v]) => [k, v / tot])), led };
};
const a = run('base'), b = run(sc);
const kinds = [...new Set([...Object.keys(a.share), ...Object.keys(b.share)])]
  .map((k) => [k, (b.share[k] ?? 0) - (a.share[k] ?? 0)]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 10);
console.log(`${sc} 對 base（種子 ${F}–${F + 11}，第 3–${D} 日）時間占比變化：` + kinds.map(([k, d]) => `${k} ${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}`).join('、'));
console.log('帳本 base → ' + sc + '：' + KEYS.map((k) => `${k} ${a.led[k]}→${b.led[k]}`).join('、'));
