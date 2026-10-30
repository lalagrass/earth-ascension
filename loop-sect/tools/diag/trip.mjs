// 診斷：指定伐木者每趟伐木的樹距倉堆多遠、做事 tick、走路 tick，分早晚比較。用法：node loop-sect/tools/diag/trip.mjs
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { PILE } from '../../src/data.mjs';
const agg = { early: { n: 0, dist: 0, doT: 0, walkT: 0, wood: 0 }, late: { n: 0, dist: 0, doT: 0, walkT: 0, wood: 0 } };
for (let seed = 1; seed <= 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  const p = s.people[1];
  let trip = null, prev = 0;
  for (let t = 0; t < 1440 * 5; t++) {
    script(s); step(s);
    if (!trip && p.task?.kind === 'chop') trip = { start: s.tick, dist: Math.hypot(p.task.rx - PILE.x, p.task.ry - PILE.y), doT: 0, walkT: 0 };
    if (trip && ['chop', 'store', 'haul'].includes(p.task?.kind)) { if (p.act === 'do') trip.doT++; else trip.walkT++; }
    if (trip && prev > 0 && p.load.wood === 0) {
      const day = Math.floor(trip.start / 1440);
      const g = day === 0 ? agg.early : day >= 3 ? agg.late : null;
      if (g) { g.n++; g.dist += trip.dist; g.doT += trip.doT; g.walkT += trip.walkT; g.wood += prev; }
      trip = null;
    }
    prev = p.load.wood;
  }
}
for (const [k, g] of Object.entries(agg)) console.log(k, `趟數 ${g.n} 平均樹距 ${(g.dist / g.n).toFixed(1)} 每根做事 ${(g.doT / g.wood).toFixed(1)} 每根走路 ${(g.walkT / g.wood).toFixed(1)} 每趟木 ${(g.wood / g.n).toFixed(2)}`);
