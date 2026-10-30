// 診斷（M19a）：base 對 hunt 十日，每種子的最差日飢餓、結束人數；hunt 裡餓著的人·tick 分成「剛打獵（打完 200 tick 內）」與其他。
// 用法：node loop-sect/tools/diag/hunt-hunger.mjs [fromSeed]
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import { TICKS_PER_DAY } from '../../src/data.mjs';
const F = Number(process.argv[2] ?? 1);
for (let seed = F; seed < F + 12; seed++) {
  const row = [];
  for (const sc of ['base', 'hunt']) {
    const s = createWorld({ seed, people: rosterFor(seed) });
    const last = {}; let worst = 0, post = 0, other = 0, hunts = 0;
    for (let d = 0; d < 10; d++) {
      let h = 0, n = 0;
      for (let t = 0; t < TICKS_PER_DAY; t++) {
        script(s, sc); step(s);
        for (const p of s.people) {
          if (p.guest) continue;
          if (p.task?.kind === 'hunt' && last[p.id] !== s.tick - 1) hunts++;
          if (p.task?.kind === 'hunt') last[p.id] = s.tick;
          n++;
          if (p.needs.food < 15) { h++; if (last[p.id] != null && s.tick - last[p.id] < 200) post++; else other++; }
        }
      }
      worst = Math.max(worst, h / n);
    }
    row.push(`${sc} 最差日 ${(worst * 100).toFixed(1)}% 人 ${s.people.filter((p) => !p.guest).length}` + (sc === 'hunt' ? ` 打獵 ${hunts} 餓·剛打獵 ${post} 其他 ${other}` : ''));
  }
  console.log(`s${seed}: ${row.join(' | ')}`);
}
