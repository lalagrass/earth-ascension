// 診斷：base 情境十日的侵擾帳：敵人、打退、撞破格數、被偷量（份）、南柵欄完工日；從哪裡進院子。
// 用法：node loop-sect/tools/diag/raid10.mjs [scenario] [from]
import { createWorld, step } from '../../src/sim.mjs';
import { TICKS_PER_DAY } from '../../src/data.mjs';
import { rosterFor, script } from '../soak-checks.mjs';

const [scenario = 'base', from = 1] = process.argv.slice(2);
const T = { enemies: 0, repelled: 0, breaches: 0, stolen: 0, steals: 0, fenceDay: [] };
for (let seed = Number(from); seed < Number(from) + 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  while (s.tick < 10 * TICKS_PER_DAY) {
    script(s, scenario); step(s);
    if (s.built.includes('fence-s') && T.fenceDay.length < seed - Number(from) + 1) T.fenceDay.push(s.tick / TICKS_PER_DAY);
  }
  const L = s.ledger, c = s.counts;
  T.enemies += c.enemies || 0; T.repelled += c.repelled || 0; T.breaches += c.breaches || 0; T.steals += c.stealHits || 0;
  T.stolen += L.rawStolen + L.mealsStolen + L.woodStolen + L.stoneStolen;
}
const med = [...T.fenceDay].sort((a, b) => a - b)[Math.floor(T.fenceDay.length / 2)];
console.log(`${scenario} 種子 ${from}–${Number(from) + 11} × 10 日：敵人 ${T.enemies}、打退 ${T.repelled}、撞破 ${T.breaches} 格、偷到 ${T.steals} 次共 ${T.stolen} 份；南柵欄完工 ${T.fenceDay.length}/12，中位第 ${med?.toFixed(2)} 日`);
