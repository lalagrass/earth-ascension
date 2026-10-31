// 診斷：一個種子、一個情境，逐時印存糧、菜畦、值日與每人在做什麼；以及這段時間飢餓時的狀況分布。
// 用法：node loop-sect/tools/diag/day.mjs <scenario> <seed> <fromDay> <toDay> [fire]
import { createWorld, step } from '../../src/sim.mjs';
import { TICKS_PER_DAY, FIRE } from '../../src/data.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { dutyOf } from '../../src/duty.mjs';

const [scenario = 'base', seed = 1, from = 1, to = 2, fire = 0] = process.argv.slice(2);
FIRE.WOOD_PER_POT = Number(fire);
const s = createWorld({ seed: Number(seed), people: rosterFor(Number(seed)) });
const agg = {};
const end = Number(to) * TICKS_PER_DAY;
while (s.tick < end) {
  script(s, scenario); step(s);
  if (s.tick < (Number(from) - 1) * TICKS_PER_DAY) continue;
  for (const p of s.people) if (!p.guest && p.needs.food < 15) {
    const k = `${p.act}:${p.task?.kind ?? '-'} 飯${s.stock.meal > 0 ? '有' : '無'} 莓${s.stock.raw >= 2 ? '夠' : '缺'} 木${s.stock.wood >= FIRE.WOOD_PER_POT ? '夠' : '缺'}`;
    agg[k] = (agg[k] || 0) + 1;
  }
  if (s.tick % 60 === 0) {
    const plots = s.plots.map((g) => g.stage[0]).join('');
    console.log(`d${Math.ceil(s.tick / TICKS_PER_DAY)} ${String((s.tick % TICKS_PER_DAY) / 60).padStart(2)}h 飯${s.stock.meal} 莓${s.stock.raw} 木${s.stock.wood} 畦${plots} ` +
      s.people.map((p) => `${p.name}${p.guest ? '(客)' : ''}[${dutyOf(s, p) ?? '-'}]${p.task?.kind ?? '-'}/${p.needs.food.toFixed(0)}`).join(' '));
  }
}
console.log('--- 飢餓時 ---');
console.log(Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 12).map((x) => x.join(' ')).join('\n'));
