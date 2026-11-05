// v7（retro 6）：新候選上線前，先看它在決定當下排第幾。每次有人要做決定（閒著、沒事做）而且候選裡有 <kind> 時記一筆。
// 用法：node loop-sect/tools/diag/rank.mjs <kind> [scenario=base] [days=5] [fromSeed=1]
import { createWorld, step, scorePois } from '../../src/sim.mjs';
import { candidates } from '../../src/ai.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { TICKS_PER_DAY } from '../../src/data.mjs';

const [kind, scenario = 'base', days = 5, from = 1] = process.argv.slice(2);
if (!kind) { console.error('要給候選種類，例如 medicate'); process.exit(1); }
const ranks = [], winners = {};
for (let seed = Number(from); seed < Number(from) + 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  for (let t = 0; t < days * TICKS_PER_DAY; t++) {
    script(s, scenario);
    for (const p of s.people) {
      if (p.act !== 'idle' || p.wait > 0 || p.task || p.exp) continue;
      const { list } = candidates(s, p, scorePois);
      const i = list.findIndex((c) => c.kind === kind);
      if (i < 0) continue;
      ranks.push(i);
      if (i > 0) winners[list[0].kind] = (winners[list[0].kind] || 0) + 1;
    }
    step(s);
  }
}
if (!ranks.length) { console.log(`${kind}：${scenario} ${days} 日裡從沒出現在候選裡`); process.exit(0); }
ranks.sort((a, b) => a - b);
const q = (f) => ranks[Math.floor(f * (ranks.length - 1))];
console.log(`${kind}（${scenario}，種子 ${from}–${Number(from) + 11}，${days} 日）：出現 ${ranks.length} 次，排第一 ${ranks.filter((r) => r === 0).length} 次（${(100 * ranks.filter((r) => r === 0).length / ranks.length).toFixed(0)}%）；名次中位 ${q(0.5) + 1}、p90 ${q(0.9) + 1}`);
console.log(`輸給：${Object.entries(winners).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join('、')}`);
