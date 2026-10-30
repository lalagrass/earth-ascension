// 診斷（M22）：開局缺糧。第 fromDay–toDay 日裡，灶上飯 0 而生 < 2 的「斷糧刻」：野莓叢上還有幾顆、沒餓的同門在做什麼、餓著的人在做什麼。
// 用法：node loop-sect/tools/diag/crunch.mjs [scenario=base] [fromSeed=1] [fromDay=2] [toDay=4]
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { TICKS_PER_DAY, COOK_RAW } from '../../src/data.mjs';
const [sc = 'base', F = '1', D0 = '2', D1 = '4'] = process.argv.slice(2);
const from = Number(F), d0 = Number(D0), d1 = Number(D1);
let ticks = 0, crunch = 0, hungry = 0, hungryInCrunch = 0, berries = 0;
const idle = {}, hung = {};
const bump = (o, k) => { o[k] = (o[k] ?? 0) + 1; };
for (let seed = from; seed < from + 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  for (let t = 0; t < d1 * TICKS_PER_DAY; t++) {
    script(s, sc); step(s);
    if (t < (d0 - 1) * TICKS_PER_DAY) continue;
    ticks++;
    const c = s.stock.meal === 0 && s.stock.raw < COOK_RAW;
    const m = s.people.filter((p) => !p.guest);
    const h = m.filter((p) => p.needs.food < 15).length;
    hungry += h;
    if (!c) continue;
    crunch++; hungryInCrunch += h;
    berries += s.bushes.reduce((a, b) => a + b.berries, 0);
    for (const p of m) bump(p.needs.food < 15 ? hung : idle, `${p.act}:${p.task?.kind ?? '-'}`);
  }
}
const top = (o) => { const n = Object.values(o).reduce((a, b) => a + b, 0); return Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${(100 * v / n).toFixed(1)}%`).join('、'); };
console.log(`${sc} 種子 ${from}–${from + 11} 第 ${d0}–${d1} 日：斷糧刻 ${crunch}/${ticks}（${(100 * crunch / ticks).toFixed(1)}%）；餓著的人·tick 有 ${(100 * hungryInCrunch / Math.max(1, hungry)).toFixed(1)}% 在斷糧刻；斷糧刻野莓叢平均還有 ${(berries / Math.max(1, crunch)).toFixed(1)} 顆`);
console.log('斷糧刻沒餓的人：' + top(idle));
console.log('斷糧刻餓著的人：' + top(hung));
