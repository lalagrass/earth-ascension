// 診斷（M22，v9）：餓著的人·tick 裡，有多少屬於「睡前沒吃」：這一覺開始時飽食 < limit、灶上有飯。另列餓著時在做什麼。
// 用法：node loop-sect/tools/diag/supper.mjs [scenario=base] [fromSeed=1] [fromDay=2] [toDay=4] [limit=40]
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { TICKS_PER_DAY } from '../../src/data.mjs';
const [sc = 'base', F = '1', D0 = '2', D1 = '4', L = '40'] = process.argv.slice(2);
const from = Number(F), d0 = Number(D0), d1 = Number(D1), limit = Number(L);
const SLEEPS = new Set(['sleep', 'sleepGround']);
let hungry = 0, afterBadSleep = 0, inSleep = 0, beds = 0, badBeds = 0;
for (let seed = from; seed < from + 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  const bed = {}; // 這一覺開始時：飽食、有沒有飯；醒來後到吃到東西前都算這一覺的帳
  for (let t = 0; t < d1 * TICKS_PER_DAY; t++) {
    script(s, sc); step(s);
    const on = t >= (d0 - 1) * TICKS_PER_DAY;
    for (const p of s.people) {
      if (p.guest) continue;
      const k = p.task?.kind;
      if (SLEEPS.has(k) && !bed[p.id]?.open) {
        bed[p.id] = { open: true, bad: p.needs.food < limit && s.stock.meal > 0 };
        if (on) { beds++; if (bed[p.id].bad) badBeds++; }
      }
      if (!SLEEPS.has(k) && bed[p.id]?.open) bed[p.id].open = false;
      if (['eat', 'eatRaw', 'eatCarried'].includes(k) && p.act === 'do') bed[p.id] = null;
      if (!on || p.needs.food >= 15) continue;
      hungry++;
      if (SLEEPS.has(k)) inSleep++;
      if (bed[p.id]?.bad) afterBadSleep++;
    }
  }
}
console.log(`${sc} 種子 ${from}–${from + 11} 第 ${d0}–${d1} 日：餓著 ${hungry} 人·tick，睡著時 ${(100 * inSleep / hungry).toFixed(1)}%；屬於「睡前飽食 < ${limit} 而灶上有飯」那一覺（含醒來到吃到前）${(100 * afterBadSleep / hungry).toFixed(1)}%；這樣的覺 ${badBeds}/${beds}`);
