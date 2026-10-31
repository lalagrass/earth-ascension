// 診斷（M25-A2、A3）：48 個種子 base，二十日大事的種類數；十日開局三人只看生平猜外內向。
// 用法：node loop-sect/tools/diag/history.mjs
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { TICKS_PER_DAY } from '../../src/data.mjs';
import { sectHistory } from '../../src/chronicle.mjs';
let minKinds = Infinity, said = 0, right = 0, total = 0;
for (let seed = 1; seed <= 48; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  const first = s.people.map((p) => p.id);
  for (let t = 0; t < 20 * TICKS_PER_DAY; t++) {
    script(s, 'base'); step(s);
    if (t + 1 !== 10 * TICKS_PER_DAY) continue;
    for (const l of sectHistory(s).lives) {
      if (!first.includes(l.id)) continue;
      const p = s.people.find((x) => x.id === l.id); total++;
      const m = l.text.match(/比同門(多|少)花時間聊天切磋/);
      if (!m) continue;
      said++;
      if ((m[1] === '多') === (p.axes.E > 0)) right++;
    }
  }
  minKinds = Math.min(minKinds, new Set(sectHistory(s).highlights.map((e) => e.kind)).size);
}
console.log(`A2 大事種類最少 ${minKinds}（≥ 5）`);
console.log(`A3 生平提到聊天切磋 ${said}/${total}（${(100 * said / total).toFixed(0)}%，≥ 30%）；照它猜外內向對 ${right}/${said}（${(100 * right / Math.max(1, said)).toFixed(0)}%，≥ 75%）`);
