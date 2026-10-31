// 診斷（M24）：48 個種子 base 十日，開著與關掉（FAMILY.SERVE_K 0）比：成家之後家人的飢餓人·tick、端飯次數、全員第 2–10 日飢餓的中位數與 p90。
// 用法：node loop-sect/tools/diag/serve.mjs [days=10]
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { FAMILY, TICKS_PER_DAY } from '../../src/data.mjs';
const D = Number(process.argv[2] ?? 10);
const K = FAMILY.SERVE_K;
function run(k) {
  FAMILY.SERVE_K = k;
  let kinH = 0, served = 0, famSeeds = 0; const per = [];
  for (let seed = 1; seed <= 48; seed++) {
    const s = createWorld({ seed, people: rosterFor(seed) }); let h = 0;
    for (let t = 0; t < D * TICKS_PER_DAY; t++) {
      script(s, 'base'); step(s);
      if (t < TICKS_PER_DAY) continue;
      for (const p of s.people) {
        if (p.guest || p.needs.food >= 15) continue;
        h++;
        if (p.kin) kinH++;
      }
    }
    per.push(h); served += s.counts.served || 0;
    if (s.events.some((e) => e.kind === 'family' && /結/.test(e.text))) famSeeds++;
  }
  const q = (f) => [...per].sort((a, b) => a - b)[Math.floor(f * 48)];
  return { kinH, served, famSeeds, med: q(0.5), p90: q(0.9), sum: per.reduce((a, b) => a + b, 0) };
}
const off = run(0), on = run(K);
FAMILY.SERVE_K = K;
console.log(`關著：家人飢餓 ${off.kinH}、全員合計 ${off.sum}、中位 ${off.med}、p90 ${off.p90}；有家的種子 ${off.famSeeds}/48`);
console.log(`開著：家人飢餓 ${on.kinH}（${(100 * on.kinH / Math.max(1, off.kinH)).toFixed(0)}%）、全員合計 ${on.sum}、中位 ${on.med}（×${(on.med / Math.max(1, off.med)).toFixed(2)}）、p90 ${on.p90}（×${(on.p90 / Math.max(1, off.p90)).toFixed(2)}）；端飯 ${on.served} 次；有家的種子 ${on.famSeeds}/48`);
