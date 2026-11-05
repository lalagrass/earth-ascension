// 診斷（M16）：每段迎敵被敵人扣多少精力、十日每人累計。用法：node loop-sect/tools/diag/hurt.mjs <scenario> <fromSeed> [days]
import { createWorld, step } from '../../src/sim.mjs';
import { engaged } from '../../src/raid.mjs';
import { ENEMIES, TICKS_PER_DAY } from '../../src/data.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
const sc = process.argv[2] ?? 'base', from = Number(process.argv[3] ?? 1), DAYS = Number(process.argv[4] ?? 10);
const eps = [], perPerson = [];
for (let seed = from; seed < from + 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  const cur = new Map(), tot = new Map();
  for (let t = 0; t < DAYS * TICKS_PER_DAY; t++) {
    script(s, sc); step(s);
    const now = new Map();
    for (const e of s.enemies) { if (e.hp <= 0 && e.mode !== 'guard') continue; const f = engaged(s, e); for (const p of f) now.set(p.id, (now.get(p.id) || 0) + ENEMIES[e.kind].hit / f.length); }
    for (const p of s.people) {
      const h = now.get(p.id) || 0;
      if (h) { cur.set(p.id, (cur.get(p.id) || 0) + h); tot.set(p.id, (tot.get(p.id) || 0) + h); }
      else if (cur.has(p.id)) { eps.push(cur.get(p.id)); cur.delete(p.id); }
    }
  }
  for (const p of s.people) perPerson.push(tot.get(p.id) || 0);
}
eps.sort((a, b) => a - b); perPerson.sort((a, b) => a - b);
const q = (a, f) => a[Math.floor(f * (a.length - 1))]?.toFixed(1);
console.log(`${sc} from ${from}: 迎敵段 ${eps.length}，每段被扣 中位 ${q(eps, .5)} p75 ${q(eps, .75)} p90 ${q(eps, .9)} max ${q(eps, 1)}；≥10 的段 ${eps.filter((x) => x >= 10).length}、≥20 ${eps.filter((x) => x >= 20).length}`);
console.log(`每人十日累計：人 ${perPerson.length}，中位 ${q(perPerson, .5)} p75 ${q(perPerson, .75)} max ${q(perPerson, 1)}，0 的人 ${perPerson.filter((x) => !x).length}`);
