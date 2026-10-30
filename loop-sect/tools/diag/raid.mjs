// 診斷：有敵人在場時，人物在做什麼；做決定時迎敵候選排第幾、為什麼沒有。用法：node loop-sect/tools/diag/raid.mjs
import { createWorld, step, scorePois } from '../../src/sim.mjs';
import { candidates } from '../../src/ai.mjs';
import { activeEnemies } from '../../src/raid.mjs';
import { seedHolder } from '../../src/rng.mjs';
import { DEFENSE } from '../../src/data.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
const doing = {}, win = {}, absent = {};
let dec = 0, has = 0, first = 0, life = 0, lifeN = 0;
const fates = {};
for (let seed = 1; seed <= 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  const seen = new Map();
  for (let t = 0; t < 1440 * 5; t++) {
    script(s);
    const act = activeEnemies(s);
    if (act.length) for (const p of s.people) {
      const k = `${p.act}:${p.task?.kind ?? '-'}`;
      doing[k] = (doing[k] || 0) + 1;
      if (p.act === 'idle' && p.wait <= 0) {
        const { list } = candidates({ ...s, ...seedHolder(t + 3) }, p, scorePois);
        dec++;
        win[list[0].kind] = (win[list[0].kind] || 0) + 1;
        const i = list.findIndex((c) => c.kind === 'fight');
        if (i >= 0) { has++; if (i === 0) first++; }
        else {
          const d = Math.min(...act.map((e) => Math.hypot(e.x - p.x, e.y - p.y)));
          const r = d > DEFENSE.ALERT_R ? '太遠' : p.needs.energy <= DEFENSE.FIGHT_MIN_ENERGY ? '沒力' : '其他';
          absent[r] = (absent[r] || 0) + 1;
        }
      }
    }
    for (const e of s.enemies) if (!seen.has(e.id)) seen.set(e.id, e);
    step(s);
  }
  for (const e of seen.values()) { const f = e.hpMax > e.hp ? (e.hp <= 0 ? '打退' : '受傷但偷到') : (e.stolen ? '沒人碰就偷到' : '其他'); fates[f] = (fates[f] || 0) + 1; }
}
const top = (o, n = 10) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map((x) => x.join(' ')).join('、');
console.log('有敵人時在做什麼：', top(doing, 12));
console.log(`閒下來做決定 ${dec} 次；有迎敵候選 ${has}、迎敵排第一 ${first}`);
console.log('第一名：', top(win));
console.log('沒有迎敵候選：', top(absent));
console.log('敵人下場：', top(fates));
