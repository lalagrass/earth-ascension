// 診斷（M17）：十日裡每個種子最好的一對到哪個階段、何時成為朋友／知己；結束時每對的平均好感分布。
// 用法：node loop-sect/tools/diag/bonds.mjs [scenario=base] [fromSeed=1] [days=10]
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { TICKS_PER_DAY } from '../../src/data.mjs';
import { aff } from '../../src/social.mjs';
const [scenario = 'base', from = 1, days = 10] = process.argv.slice(2);
const rows = [], all = [];
for (let seed = Number(from); seed < Number(from) + 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  const first = {};
  for (let t = 0; t < days * TICKS_PER_DAY; t++) { script(s, scenario); step(s); }
  for (const e of s.events) if (e.kind === 'rel') { const k = e.text.match(/成了(.+)$/)[1]; first[k] ??= (e.tick / TICKS_PER_DAY).toFixed(1); }
  const m = s.people.filter((p) => !p.guest);
  let best = -Infinity;
  for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) { const v = (aff(s, m[i], m[j]) + aff(s, m[j], m[i])) / 2; all.push(v); best = Math.max(best, v); }
  rows.push(`s${seed} 最好一對 ${best.toFixed(0)}；第一次朋友 ${first['朋友'] ?? '-'} 日、知己 ${first['知己'] ?? '-'} 日`);
}
all.sort((a, b) => a - b);
const q = (f) => all[Math.floor(f * (all.length - 1))].toFixed(0);
console.log(rows.join('\n'));
console.log(`全部 ${all.length} 對：中位 ${q(0.5)}、p75 ${q(0.75)}、p90 ${q(0.9)}、最高 ${q(1)}；≥ 60 的 ${all.filter((v) => v >= 60).length} 對`);
