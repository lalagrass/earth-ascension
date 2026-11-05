// 診斷：飢餓（飽食 < 15）時，每人在做什麼、當下存糧如何。用法：node loop-sect/tools/diag/hunger.mjs
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
const agg = {};
for (let seed = 1; seed <= 6; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  for (let t = 0; t < 1440 * 5; t++) { script(s); step(s);
    for (const p of s.people) if (p.needs.food < 15) {
      const k = `${p.act}:${p.task?.kind ?? '-'} meal=${s.stock.meal > 0 ? '有' : '無'} raw=${s.stock.raw >= 2 ? '夠' : '不夠'}`;
      agg[k] = (agg[k] || 0) + 1; } }
}
console.log(Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 10).map((x) => x.join(' ')).join('\n'));
