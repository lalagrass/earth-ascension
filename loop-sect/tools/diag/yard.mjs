// M13 診斷：外功場完工後，每次開始練功時選了哪個木樁、當時舊木樁空不空、人離各樁多遠。
// 用法：node loop-sect/tools/diag/yard.mjs
import { createWorld, step } from '../../src/sim.mjs';
import { TICKS_PER_DAY } from '../../src/data.mjs';
import { rosterFor, script } from '../soak-checks.mjs';

const agg = {};
let dOld = 0, dYard = 0, n = 0;
for (let seed = 1; seed <= 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  const was = new Map();
  while (s.tick < 5 * TICKS_PER_DAY) {
    script(s, 'yard'); step(s);
    if (!s.built.includes('yard')) continue;
    for (const p of s.people) {
      const cur = p.task?.kind === 'drill' ? p.task.obj : null;
      if (cur && was.get(p.id) !== cur) {
        const o = s.objects.find((x) => x.id === cur);
        const dummies = s.objects.filter((x) => x.kind === 'dummy');
        const oldFree = dummies.filter((x) => !x.yard && !x.users[0]).length;
        const k = `${o.yard ? '外功場' : `舊樁${o.slots[0]}`} 舊樁空 ${oldFree}`;
        agg[k] = (agg[k] || 0) + 1;
        const near = (f) => Math.min(...dummies.filter(f).map((x) => Math.hypot(x.slots[0][0] - p.x, x.slots[0][1] - p.y)));
        dOld += near((x) => !x.yard); dYard += near((x) => x.yard); n++;
      }
      was.set(p.id, cur);
    }
  }
}
console.log(Object.entries(agg).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} ${k}`).join('\n'));
console.log(`開始練功時離最近的舊樁平均 ${(dOld / n).toFixed(1)} 格、最近的外功場木人 ${(dYard / n).toFixed(1)} 格（${n} 次）`);
