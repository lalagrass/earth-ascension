// 診斷：每次來訪擲骰時的名望、機率、結果；每次去留的分數與各項。用法：node loop-sect/tools/diag/recruit.mjs
import { createWorld, step } from '../../src/sim.mjs';
import { visitChance, topPrestige, appeal } from '../../src/recruit.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
const byDay = {};
const parts = {};
for (let seed = 1; seed <= 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  for (let t = 0; t < 1440 * 5; t++) {
    script(s);
    const v = s.visits[s.visitAt];
    if (v && v.tick === s.tick + 1) {
      const d = Math.floor(v.tick / 1440) + 1;
      const b = (byDay[d] ??= { n: 0, chance: 0, prestige: 0, hit: 0, full: 0 });
      b.n++; b.chance += visitChance(s); b.prestige += topPrestige(s); if (v.roll < visitChance(s)) b.hit++;
    }
    for (const p of s.people) if (p.guest && !p.guest.leaving && s.tick + 1 >= p.guest.until && p.act !== 'do') {
      const a = appeal(s, p);
      for (const x of a.parts) { parts[x.id] ??= 0; parts[x.id] += x.v; }
      parts.n = (parts.n || 0) + 1;
    }
    step(s);
  }
}
for (const [d, b] of Object.entries(byDay)) console.log(`第 ${d} 日：擲 ${b.n} 次、平均最高名望 ${(b.prestige / b.n).toFixed(1)}、平均機率 ${(b.chance / b.n).toFixed(2)}、來了 ${b.hit}`);
console.log('去留各項平均：', Object.entries(parts).filter(([k]) => k !== 'n').map(([k, v]) => `${k} ${(v / parts.n).toFixed(2)}`).join('、'), `（${parts.n} 次）`);
