// 診斷（M23）：exp 情境十日，頭目被纏住時同時迎戰的人數（平均、最多）對一般敵人；頭目被打退的比例。
// 用法：node loop-sect/tools/diag/boss.mjs [fromSeed=1] [days=10]
import { createWorld, step } from '../../src/sim.mjs';
import { engaged } from '../../src/raid.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { TICKS_PER_DAY } from '../../src/data.mjs';
const F = Number(process.argv[2] ?? 1), D = Number(process.argv[3] ?? 10);
const acc = { boss: { sum: 0, n: 0, peak: [] }, plain: { sum: 0, n: 0, peak: [] } };
let raids = 0, repelled = 0, seeds = 0;
for (let seed = F; seed < F + 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  const peak = {};
  for (let t = 0; t < D * TICKS_PER_DAY; t++) {
    script(s, 'exp'); step(s);
    for (const e of s.enemies) {
      if (e.mode === 'guard' || e.mode === 'flee' || e.mode === 'beaten') continue;
      const k = engaged(s, e).length;
      if (!k) continue;
      const a = e.boss ? acc.boss : acc.plain;
      a.sum += k; a.n++;
      peak[e.id] = { boss: !!e.boss, k: Math.max(peak[e.id]?.k ?? 0, k) };
    }
  }
  for (const v of Object.values(peak)) (v.boss ? acc.boss : acc.plain).peak.push(v.k);
  raids += s.counts.bossRaids || 0; repelled += s.counts.bossRepelled || 0;
  if (s.counts.bossRaids) seeds++;
}
const avg = (a) => (a.n ? a.sum / a.n : 0);
const pk = (a) => (a.peak.length ? a.peak.reduce((x, y) => x + y, 0) / a.peak.length : 0);
console.log(`種子 ${F}–${F + 11}，exp ${D} 日：報仇 ${raids} 次（${seeds} 個種子）、頭目被打退 ${repelled}`);
console.log(`被纏住時同時迎戰：頭目 平均 ${avg(acc.boss).toFixed(2)}、每隻最多 ${pk(acc.boss).toFixed(2)}；一般 平均 ${avg(acc.plain).toFixed(2)}、每隻最多 ${pk(acc.plain).toFixed(2)}（比 ${(avg(acc.boss) / Math.max(1e-9, avg(acc.plain))).toFixed(2)}）`);
