// 診斷：每個種子 5 日後的帳本、庫存、工地進度，以及整體時間分布。用法：node loop-sect/tools/diag/sites.mjs
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
const acts = {}; let tot = 0;
for (let seed = 1; seed <= 4; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  for (let t = 0; t < 1440 * 5; t++) { script(s); step(s);
    for (const p of s.people) { const k = `${p.act}:${p.task?.kind ?? '-'}`; acts[k] = (acts[k] || 0) + 1; tot++; } }
  console.log(seed, JSON.stringify(s.ledger), JSON.stringify(s.stock), s.sites.map((x) => `${x.label} have${JSON.stringify(x.have)} in${JSON.stringify(x.incoming)} w${x.work.toFixed(0)}/${x.workTotal}`).join(' | '));
}
console.log(Object.entries(acts).sort((a,b)=>b[1]-a[1]).slice(0,24).map(x=>`${x[0]} ${(100*x[1]/tot).toFixed(1)}%`).join('\n'));
