// 診斷：grow 情境（M11）每個種子的宿舍完工時刻、來訪與去留、飢餓集中在哪一日、哪類事。
// 用法：node loop-sect/tools/diag/grow.mjs [days] [seed]
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { catOf } from '../../src/chronicle.mjs';
const DAYS = Number(process.argv[2] || 10), ONLY = Number(process.argv[3] || 0);
const hungryBy = {};
for (let seed = 1; seed <= 12; seed++) {
  if (ONLY && seed !== ONLY) continue;
  const s = createWorld({ seed, people: rosterFor(seed) });
  let h = 0;
  for (let t = 0; t < DAYS * 1440; t++) {
    script(s, 'grow'); step(s);
    for (const p of s.people) if (!p.guest && p.needs.food < 15) {
      h++;
      const k = `d${Math.floor(t / 1440) + 1} ${catOf(p)} meal=${s.stock.meal > 0 ? '有' : '無'} raw=${s.stock.raw >= 2 ? '夠' : '不夠'}`;
      hungryBy[k] = (hungryBy[k] || 0) + 1;
    }
  }
  const ev = (k) => s.events.filter((e) => e.kind === k);
  const day = (e) => (e.tick / 1440 + 1).toFixed(1);
  const built = s.events.filter((e) => e.kind === 'built').map((e) => `${e.text.replace('完工', '')}@${day(e)}`).join(' ');
  const decide = [...ev('join').map((e) => `留@${day(e)}`), ...ev('leave').map((e) => `走@${day(e)}:${e.text.split('：')[1]}`)].join(' ');
  console.log(`s${seed} 同門${s.people.filter((p) => !p.guest).length} 床${s.objects.filter((o) => o.kind === 'bed').length} 來訪${ev('visit').length} 餓${h} | ${built} | ${decide}`);
}
console.log(Object.entries(hungryBy).sort((a, b) => b[1] - a[1]).slice(0, 12).map((x) => x.join(' ')).join('\n'));
