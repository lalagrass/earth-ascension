/* loop107 內功定點對照（沿用 loop93 結構）：同種子開局一日後派前三人上後山狩獵，比較清場用時（遊戲秒）與擊退數。
   內力自然累積一日（不手動灌），之後同隊狩獵，比較清場用時、擊退、出手、療傷次數。
   用法：SS_DT=0.25 node test/harness/diag-ng-hunt.mjs [n=160] [start=1001] [days=1] */
import { createState, tick, startHunt } from '../../src/sim.mjs';
import { ALL_ON } from './bot.mjs';
const N = +(process.argv[2] || 160), S0 = +(process.argv[3] || 1001), DAYS = +(process.argv[4] || 1), DT = +(process.env.SS_DT || 0.25);
const one = (seed, ng) => { const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, neigong: ng });
  for (let i = 0; i < DAYS * 600 / DT; i++) tick(s, DT); const team = s.ds.filter((d) => !d.labor && d.hp > 50).slice(0, 3).map((d) => d.id);

  startHunt(s, team); const t0 = s.t; let kills = 0, hits = 0; while (s.hunt && s.t - t0 < 600) { kills = s.hunt.kills; hits = Object.values(s.hunt.hits).reduce((a, b) => a + b, 0); tick(s, DT); }
  return { seed, ng, qi: +s.ds.filter((d) => team.includes(d.id)).reduce((a, d) => a + (d.qi || 0), 0).toFixed(1), sec: +(s.t - t0).toFixed(2), kills, hits, done: !s.hunt }; };
const rows = []; for (let k = 0; k < N; k++) rows.push(one(S0 + k, true), one(S0 + k, false));
console.log(rows.map((r) => JSON.stringify(r)).join('\n'));
