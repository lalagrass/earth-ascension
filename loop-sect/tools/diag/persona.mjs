// 診斷：十日內各類活動的時間占比，依人格四軸的兩極分組（只算開局三人，訪客與後來加入的人另算）。
// 用法：node loop-sect/tools/diag/persona.mjs [base|exp] [days]
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
export const CAT = {
  work: ['chop', 'mine', 'build', 'haul', 'store', 'deliver', 'cook', 'forage', 'repair', 'gather'],
  social: ['chat', 'spar'], drill: ['drill'], leisure: ['sit', 'wander', 'idle'], sleep: ['sleep', 'sleepGround'],
  eat: ['eat', 'eatRaw'], guard: ['fight', 'hide'],
};
export const catOf = (p) => { const k = p.task?.kind ?? 'idle'; for (const [c, ks] of Object.entries(CAT)) if (ks.includes(k)) return c; return 'other'; };
export function lives(scenario = 'base', days = 10, seeds = 12) {
  const out = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const s = createWorld({ seed, people: rosterFor(seed) });
    const start = new Set(s.people.map((p) => p.id));
    const life = {};
    for (let t = 0; t < 1440 * days; t++) { script(s, scenario); step(s);
      for (const p of s.people) if (start.has(p.id)) { const c = catOf(p); (life[p.id] ??= {})[c] = (life[p.id][c] || 0) + 1; } }
    for (const p of s.people) if (life[p.id]) {
      const tot = Object.values(life[p.id]).reduce((a, b) => a + b, 0);
      out.push({ seed, p, share: Object.fromEntries(Object.keys(CAT).concat('other').map((c) => [c, (life[p.id][c] || 0) / tot])) });
    }
  }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const L = lives(process.argv[2] || 'base', Number(process.argv[3] || 10));
  const pct = (v) => (100 * v).toFixed(1).padStart(5);
  console.log('軸 極  人數 ' + Object.keys(CAT).concat('other').map((c) => c.padStart(7)).join(''));
  for (const ax of ['E', 'N', 'F', 'P']) for (const pos of [true, false]) {
    const g = L.filter((x) => (x.p.axes[ax] > 0) === pos);
    const m = (c) => g.reduce((a, x) => a + x.share[c], 0) / g.length;
    console.log(`${ax} ${pos ? '+' : '-'}  ${String(g.length).padStart(3)}  ` + Object.keys(CAT).concat('other').map((c) => pct(m(c)).padStart(7)).join(''));
  }
}
