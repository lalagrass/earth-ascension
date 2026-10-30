// 診斷（M16）：exp 情境第 4–5 日（遠征那兩日）的飢餓人·tick，分成遠征中、受傷中、小傷、沒受傷。
// 用法：node loop-sect/tools/diag/hunger-who.mjs [fromSeed]
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { INJURY, TICKS_PER_DAY } from '../../src/data.mjs';
const F = Number(process.argv[2] ?? 1);
const c = { expm: 0, inj: 0, scar: 0, clean: 0 }; const perSeed = [];
for (let seed = F; seed < F + 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) }); let h = 0;
  for (let t = 0; t < 5 * TICKS_PER_DAY; t++) {
    script(s, 'exp'); step(s);
    if (t < 3 * TICKS_PER_DAY) continue;
    for (const p of s.people) {
      if (p.guest || p.needs.food >= 15) continue;
      h++;
      if (p.exp) c.expm++; else if ((p.hurt ?? 0) >= INJURY.MIN) c.inj++; else if ((p.hurt ?? 0) > 0) c.scar++; else c.clean++;
    }
  }
  perSeed.push(h);
}
console.log(JSON.stringify(c), perSeed.join(' '));
