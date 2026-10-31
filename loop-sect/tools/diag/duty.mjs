// M18 診斷：值日的人在迫切時做什麼。依職、條理／隨性分開，列出做本職的比例與最常做的別的事。
// 用法：node loop-sect/tools/diag/duty.mjs [fire]
import { createWorld, step } from '../../src/sim.mjs';
import { TICKS_PER_DAY, FIRE, COOK_RAW } from '../../src/data.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { dutyOf, pressure, ROLE } from '../../src/duty.mjs';
import { isNight } from '../../src/needs.mjs';

FIRE.WOOD_PER_POT = Number(process.argv[2] ?? 0);
const SLEEPS = new Set(['sleep', 'sleepGround']);
const T = {};
for (let seed = 1; seed <= 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  for (let t = 0; t < 10 * TICKS_PER_DAY; t++) {
    script(s, 'base'); step(s);
    if (isNight(s.tick)) continue;
    for (const p of s.people) {
      const role = dutyOf(s, p);
      if (!role || p.guest || p.exp || p.forced || SLEEPS.has(p.task?.kind) || pressure(s, role) <= 0.5) continue;
      const able = role !== 'cook' || (s.stock.raw >= COOK_RAW && s.stock.wood >= FIRE.WOOD_PER_POT);
      const k = `${role}:${p.axes.P < 0 ? 'J' : 'P'}:${able ? 'able' : 'cant'}`;
      const r = (T[k] ??= { n: 0, doing: 0, what: {} });
      r.n++;
      if (ROLE[role].kinds.includes(p.task?.kind)) r.doing++;
      else r.what[p.task?.kind ?? 'idle'] = (r.what[p.task?.kind ?? 'idle'] || 0) + 1;
    }
  }
}
for (const [k, r] of Object.entries(T).sort()) {
  const top = Object.entries(r.what).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w, n]) => `${w} ${(100 * n / r.n).toFixed(0)}%`).join('、');
  console.log(`${k.padEnd(18)} ${String(r.n).padStart(6)} tick 本職 ${(100 * r.doing / r.n).toFixed(1)}%；其他：${top}`);
}
