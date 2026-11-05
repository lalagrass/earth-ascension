// 診斷：遠征情境的飢餓（飽食 < 15）落在誰身上、當下存糧如何。用法：node loop-sect/tools/diag/exp-hunger.mjs
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
const agg = {}, byDay = {};
let total = 0;
for (let seed = 1; seed <= 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  const back = {};
  for (let t = 0; t < 1440 * 5; t++) {
    const was = new Set(s.people.filter((p) => p.exp).map((p) => p.id));
    script(s, process.argv[2] || 'exp'); step(s);
    for (const p of s.people) if (was.has(p.id) && !p.exp) back[p.id] = s.tick;
    for (const p of s.people) {
      if (p.guest) continue;
      total++;
      if (p.needs.food >= 15) continue;
      const who = p.exp ? `隊員(${s.expedition?.phase})` : back[p.id] && s.tick - back[p.id] < 240 ? '剛回來' : '留守';
      const k = `${who} ${p.act}:${p.task?.kind ?? '-'} meal=${s.stock.meal > 0 ? '有' : '無'} raw=${s.stock.raw >= 2 ? '夠' : '不夠'}`;
      agg[k] = (agg[k] || 0) + 1;
      const d = Math.floor(s.tick / 1440) + 1; byDay[d] = (byDay[d] || 0) + 1;
    }
  }
}
const sum = Object.values(agg).reduce((a, b) => a + b, 0);
console.log(`飢餓 ${(100 * sum / total).toFixed(2)}%；依日：${Object.entries(byDay).map(([d, n]) => `d${d} ${n}`).join(' ')}`);
console.log(Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 12).map((x) => x.join(' ')).join('\n'));
