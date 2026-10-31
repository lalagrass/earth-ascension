// 診斷：某情境某幾日，所有種子在飢餓（飽食 < 15）時的狀況：在做什麼、灶上有沒有飯、生莓與木夠不夠、自己的值日。
// 用法：node loop-sect/tools/diag/hungry-why.mjs <scenario> <fromDay> <toDay> [fire]
import { createWorld, step } from '../../src/sim.mjs';
import { TICKS_PER_DAY, FIRE, COOK_RAW } from '../../src/data.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { dutyOf } from '../../src/duty.mjs';

const [scenario = 'base', from = 1, to = 10, fire = 0] = process.argv.slice(2);
FIRE.WOOD_PER_POT = Number(fire);
const agg = {}, home = {};
let n = 0;
for (let seed = 1; seed <= 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  while (s.tick < Number(to) * TICKS_PER_DAY) {
    script(s, scenario); step(s);
    if (s.tick < (Number(from) - 1) * TICKS_PER_DAY) continue;
    for (const p of s.people) if (!p.guest && p.needs.food < 15) {
      n++;
      const k = `${p.act}:${p.task?.kind ?? '-'} 飯${s.stock.meal > 0 ? '有' : '無'} 莓${s.stock.raw >= COOK_RAW ? '夠' : '缺'} 木${s.stock.wood >= FIRE.WOOD_PER_POT ? '夠' : '缺'} 值${dutyOf(s, p) ?? '-'}`;
      agg[k] = (agg[k] || 0) + 1;
      const h = `在家同門 ${s.people.filter((o) => !o.guest && !o.exp).length}${s.expedition ? '（遠征中）' : ''}`;
      home[h] = (home[h] || 0) + 1;
    }
  }
}
const show = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${(100 * v / n).toFixed(1).padStart(5)}% ${k}`).join('\n');
console.log(`飢餓 ${n} 人·tick\n${show(agg)}\n---\n${show(home)}`);
