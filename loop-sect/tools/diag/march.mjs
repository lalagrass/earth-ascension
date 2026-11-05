// 診斷（M19b）：exp 情境遠征從出發到開打（march 階段）幾 tick；撤退理由。
// 用法：node loop-sect/tools/diag/march.mjs [fromSeed=1]
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { TICKS_PER_DAY } from '../../src/data.mjs';
const F = Number(process.argv[2] ?? 1);
const marches = [], why = {};
let cleared = 0;
for (let seed = F; seed < F + 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  let start = null, ev = 0;
  for (let t = 0; t < 5 * TICKS_PER_DAY; t++) {
    script(s, 'exp'); step(s);
    const x = s.expedition;
    if (x?.phase === 'march' && start == null) start = s.tick;
    if (start != null && (!x || x.phase !== 'march')) { if (x?.phase === 'fight') marches.push(s.tick - start); start = null; }
    for (; ev < s.events.length; ev++) { const m = /^遠征隊撤退：(.+)$/.exec(s.events[ev].text); if (m) why[m[1].split('（')[0]] = (why[m[1].split('（')[0]] ?? 0) + 1; }
  }
  if (s.nests.find((n) => n.id === 'den').cleared) cleared++;
}
const avg = marches.reduce((a, b) => a + b, 0) / Math.max(1, marches.length);
console.log(`種子 ${F}–${F + 11}：走到巢 ${marches.length} 次，平均 ${avg.toFixed(0)} tick（${marches.join('/')}）；拆掉野豬窩 ${cleared}/12；撤退 ${JSON.stringify(why)}`);
