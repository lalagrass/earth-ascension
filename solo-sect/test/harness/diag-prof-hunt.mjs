/* loop93 熟練度十重定點對照：同種子開局一日後派前三人上後山狩獵，比較清場用時（遊戲秒）與擊退數。
   bot 長跑幾乎不狩獵、門派戰力只看階不看重，所以長跑 160 局完全一樣；效果只在招式實際出手時。
   用法：SS_DT=0.25 node test/harness/diag-prof-hunt.mjs [n=160] [start=1001] */
import { createState, tick, startHunt } from '../../src/sim.mjs';
import { ALL_ON } from './bot.mjs';
const N = +(process.argv[2] || 160), S0 = +(process.argv[3] || 1001), DT = +(process.env.SS_DT || 0.25);
const one = (seed, prof) => { const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, prof });
  for (let i = 0; i < 600 / DT; i++) tick(s, DT); const team = s.ds.filter((d) => !d.labor && d.hp > 50).slice(0, 3).map((d) => d.id);
  for (const d of s.ds) for (const r of Object.values(d.arts)) if (r.xp < 22) r.xp = 22; /* 讓每人都在入門九重附近（+4%），放大可量 */
  startHunt(s, team); const t0 = s.t; let kills = 0, hits = 0; while (s.hunt && s.t - t0 < 600) { kills = s.hunt.kills; hits = Object.values(s.hunt.hits).reduce((a, b) => a + b, 0); tick(s, DT); }
  return { seed, prof, sec: +(s.t - t0).toFixed(2), kills, hits, done: !s.hunt }; };
const rows = []; for (let k = 0; k < N; k++) rows.push(one(S0 + k, true), one(S0 + k, false));
console.log(rows.map((r) => JSON.stringify(r)).join('\n'));
