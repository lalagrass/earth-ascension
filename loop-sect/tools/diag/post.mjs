// M14 診斷：post 情境十日，撞破的格子在哪、當時誰在哨位上、偷成功的敵人有沒有被哨位打過；迎敵與守哨的人數。
// 用法：node loop-sect/tools/diag/post.mjs [scenario]
import { createWorld, step } from '../../src/sim.mjs';
import { TICKS_PER_DAY } from '../../src/data.mjs';
import { rosterFor, script } from '../soak-checks.mjs';

const sc = process.argv[2] ?? 'post';
const bxX = {};
const bx = {}, steal = { hitByPost: 0, notHit: 0 }, mode = {};
let watchT = 0, fightT = 0, enemyT = 0, beforePosts = 0, after = 0;
for (let seed = 1; seed <= 12; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) });
  let ev = 0;
  const watchedBy = new Map();
  while (s.tick < 10 * TICKS_PER_DAY) {
    script(s, sc); step(s);
    for (const p of s.people) if (p.task?.kind === 'watch' && p.task.target) watchedBy.set(p.task.target, true);
    const live = s.enemies.filter((e) => ['lurk', 'come', 'steal'].includes(e.mode));
    if (live.length) {
      enemyT++;
      watchT += s.people.filter((p) => p.task?.kind === 'watch').length;
      fightT += s.people.filter((p) => p.task?.kind === 'fight').length;
      for (const p of s.people) if (p.task?.kind === 'watch') mode[p.act] = (mode[p.act] || 0) + 1;
    }
    while (ev < s.events.length) {
      const e = s.events[ev++];
      if (e.kind === 'breach') {
        // 撞破的格子：剛變成 f 的那一格，看離最近的哨位多遠。
        const xs = [];
        for (let x = 0; x < s.map[30].length; x++) if (s.map[30][x] === 'f') xs.push(x);
        const posts = s.objects.filter((o) => o.kind === 'post');
        const near = posts.length ? Math.min(...xs.map((x) => Math.min(...posts.map((o) => Math.hypot(o.slots[0][0] - x, o.slots[0][1] - 30))))) : 99;
        const on = s.people.filter((p) => p.task?.kind === 'watch' && p.act === 'do').length;
        const busy = s.people.filter((p) => p.task?.kind === 'watch' && p.act === 'do' && p.task.target).length;
        const live = s.enemies.filter((x) => ['lurk', 'come', 'steal'].includes(x.mode)).length;
        const k = s.built.includes('posts') ? `有哨位 ${near <= 4.5 ? '範圍內' : '範圍外'} 台上${on}人(${busy}人在打) 在場敵${live} 迎敵${s.people.filter((p) => p.task?.kind === 'fight').length}` : '沒哨位';
        bxX[xs.join('/')] = (bxX[xs.join('/')] || 0) + 1;
        if (s.built.includes('posts')) after++; else beforePosts++;
        bx[k] = (bx[k] || 0) + 1;
      }
      if (e.kind === 'stolen' && !/撲了個空/.test(e.text)) {
        const thief = [...s.enemies].reverse().find((x) => x.stolen && s.tick - 1 <= s.tick);
        if (thief && watchedBy.get(thief.id)) steal.hitByPost++; else steal.notHit++;
      }
    }
  }
}
console.log(`撞破格（當時所有破格）：${JSON.stringify(bxX)}`);
console.log(`撞破：${JSON.stringify(bx)}；被偷時那個敵人被哨位打過 ${steal.hitByPost}、沒有 ${steal.notHit}`);
console.log(`有敵人在場時平均：守哨 ${(watchT / enemyT).toFixed(2)} 人、迎敵 ${(fightT / enemyT).toFixed(2)} 人（${enemyT} tick）；守哨的人 act：${JSON.stringify(mode)}`);
