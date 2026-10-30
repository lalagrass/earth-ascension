// loop31 診斷：剿寨預測勝率 vs 實際結果（校準分箱），並檢查山寨亂數流的前幾抽。
// 用法：node test/harness/diag-lair-calib.mjs [種子數=10] [日數=60] [起始種子=1]（loop32：首抽改用 seedMix）
import { run } from './bot.mjs';
import { seedMix } from '../../src/seedmix.mjs';
const N = +(process.argv[2] || 10), DAYS = +(process.argv[3] || 60), S0 = +(process.argv[4] || 1), rows = [];
for (const bot of [false, true]) for (let seed = S0; seed < S0 + N; seed++) { const s = run(seed, {}, DAYS, bot); (s.lair?.hist || []).forEach((h, i) => rows.push({ bot, seed, i, p: h.p, win: h.win ? 1 : 0 })); }
const bins = [[0, .4], [.4, .5], [.5, .6], [.6, .7], [.7, .8], [.8, 1.01]];
const sum = (a, f) => a.reduce((x, y) => x + f(y), 0);
console.log('| p 區間 | 場數 | 平均 p | 實際勝率 | 差 |'); console.log('|---|---|---|---|---|');
for (const [a, b] of bins) { const r = rows.filter((x) => x.p >= a && x.p < b); if (!r.length) continue; const mp = sum(r, (x) => x.p) / r.length, w = sum(r, (x) => x.win) / r.length; console.log(`| ${a}–${b > 1 ? 1 : b} | ${r.length} | ${mp.toFixed(2)} | ${w.toFixed(2)} | ${(w - mp >= 0 ? '+' : '') + (w - mp).toFixed(2)} |`); }
const mp = sum(rows, (x) => x.p) / rows.length, w = sum(rows, (x) => x.win) / rows.length, se = Math.sqrt(mp * (1 - mp) / rows.length);
console.log(`總計 ${rows.length} 場：平均 p ${mp.toFixed(3)}、實際 ${w.toFixed(3)}、差 ${(w - mp).toFixed(3)}（${((w - mp) / se).toFixed(1)} 個標準誤）`);
for (const k of [0, 1, 2]) { const r = rows.filter((x) => x.i === k); if (r.length) console.log(`第 ${k + 1} 場：${r.length} 場 平均 p ${(sum(r, (x) => x.p) / r.length).toFixed(2)} 實際 ${(sum(r, (x) => x.win) / r.length).toFixed(2)}`); }
const r3 = rows.filter((x) => x.i >= 3); console.log(`第 4 場以後：${r3.length} 場 平均 p ${(sum(r3, (x) => x.p) / r3.length).toFixed(2)} 實際 ${(sum(r3, (x) => x.win) / r3.length).toFixed(2)}`);
// 山寨亂數流：與 lair.mjs 相同的 LCG，看每個種子的第 1 抽
const first = (seed) => (seedMix(seed, 4219) * 16807 % 2147483647) / 2147483647;
console.log('各種子第 1 抽：', Array.from({ length: N }, (_, i) => first(S0 + i).toFixed(3)).join(' '));
