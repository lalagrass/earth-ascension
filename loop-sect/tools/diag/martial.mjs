// 診斷：每次白天做決定時，練功／切磋候選排第幾、分數多少、贏的是什麼。用法：node loop-sect/tools/diag/martial.mjs
import { createWorld, step, scorePois } from '../../src/sim.mjs';
import { candidates } from '../../src/ai.mjs';
import { seedHolder } from '../../src/rng.mjs';
import { stageOf } from '../../src/social.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
const win = {}, kinds = { drill: { has: 0, sum: 0, top: 0, first: 0 }, spar: { has: 0, sum: 0, top: 0, first: 0 } };
const why = {};
let n = 0;
for (let seed = 1; seed <= 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  for (let t = 0; t < 1440 * 5; t++) {
    script(s);
    for (const p of s.people) if (p.act === 'idle' && p.wait <= 0 && s.tick % 1440 >= 360 && s.tick % 1440 < 1320) {
      // 用複本的 rng 算，不擾動模擬。
      const { list } = candidates({ ...s, ...seedHolder(s.tick + 7) }, p, scorePois);
      n++;
      win[list[0].kind] = (win[list[0].kind] || 0) + 1;
      for (const k of Object.keys(kinds)) {
        const c = list.find((x) => x.kind === k);
        if (!c) continue;
        const K = kinds[k]; K.has++; K.sum += c.score; K.top += list[0].score; if (list[0] === c) K.first++;
      }
      // 沒有切磋候選時，卡在哪個條件。
      if (!list.some((x) => x.kind === 'spar')) for (const o of s.people) if (o !== p) {
        const r = p.needs.energy <= 45 ? '我沒力' : o.act === 'do' ? `對方在做:${o.task.kind}` : o.needs.energy <= 45 ? '對方沒力' : stageOf(s, p, o) && s.aff[`${p.id}>${o.id}`] < 0 ? '有成見' : Math.hypot(o.x - p.x, o.y - p.y) > 18 ? '太遠' : '冷卻';
        why[r] = (why[r] || 0) + 1;
      }
    }
    step(s);
  }
}
console.log(`白天做決定 ${n} 次`);
for (const [k, K] of Object.entries(kinds)) console.log(`${k}：有候選 ${K.has}、平均分 ${(K.sum / K.has).toFixed(2)}、當時第一名平均 ${(K.top / K.has).toFixed(2)}、排第一 ${K.first}`);
console.log('第一名：', Object.entries(win).sort((a, b) => b[1] - a[1]).map((x) => x.join(' ')).join('、'));
console.log('沒有切磋候選的原因（每位對象）：', Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 8).map((x) => x.join(' ')).join('、'));
