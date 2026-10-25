// v1.75 對照分析：v1.46 基準 vs v1.75，同一指標；輸出 artifacts/v175/compare.json 與 markdown 表
import fs from 'node:fs';
import { FACILITIES } from '../../src/data.mjs';
const A = JSON.parse(fs.readFileSync('artifacts/v175/longrun-results.json')), B = JSON.parse(fs.readFileSync('artifacts/v176/longrun-results.json'));
const maxSt = (id, fallback) => (FACILITIES.find((f) => f.id === id)?.stages.length ?? fallback) - 1;
const rng = (xs) => { xs = xs.filter((x) => x != null); if (!xs.length) return '—'; const a = Math.min(...xs), b = Math.max(...xs); return a === b ? `${a}` : `${a}–${b}`; };
const mean = (xs) => +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1);
function per(c, old) {
  const d = c.daily; const keys = Object.keys(d[0].stages);
  // 舊版設施少，用該版本自身的「最終最大階段」當全滿；新版用 data 定義
  const tops = Object.fromEntries(keys.map((k) => [k, old ? Math.max(...d.map((x) => x.stages[k])) : maxSt(k, 1)]));
  const full = d.find((x) => keys.every((k) => x.stages[k] >= tops[k]))?.day ?? null;
  const allMaxed = keys.every((k) => d.at(-1).stages[k] >= maxSt(k, 1));
  const builtN = keys.reduce((a, k) => a + d.at(-1).stages[k], 0);
  const reach = d.find((x) => x.best >= 1600)?.day ?? null;
  const at = (n) => d.find((x) => x.day === n) || d.at(-1);
  return { full, allMaxed, builtN, reach, ds: c.final.ds, best: c.final.best, rep: c.final.rep, coin: c.final.res.coin, coin10: at(10).res.coin, couples: c.final.couples, kids: c.final.kids,
    starve5: d.filter((x) => x.day <= 5 && x.res.food <= 0).length, starveAll: d.filter((x) => x.res.food <= 0).length, food: [5, 10, 20, 29].map((n) => at(n).res.food),
    wood: c.final.res.wood, stone: c.final.res.stone, exps: c.exps, raids: c.raids, ko: c.final.ko, left: c.final.left, mood: c.final.avgMood, ch: c.final.chapterDay };
}
const ops = A.opens, rows = {};
for (const op of ops) for (const [tag, R, old] of [['v175', A, false], ['v176', B, false]]) rows[op + '|' + tag] = R.cases.filter((c) => c.opening === op).map((c) => per(c, old));
const tbl = []; tbl.push('| 開局 | 版本 | 弟子 | 全滿日 | 階段總和 | 最遠 | 到1600 | 聲望 | 錢 d10→d30 | 道侶 | 收養 | 前5日斷糧天 | 巡山 | 獸襲 | 重傷 |', '|' + '---|'.repeat(15));
for (const op of ops) for (const tag of ['v175', 'v176']) { const X = rows[op + '|' + tag]; const f = (k) => rng(X.map((x) => x[k]));
  tbl.push(`| ${op} | ${tag} | ${f('ds')} | ${X.every((x) => x.full == null) ? '未滿' : f('full') + (X.some((x) => x.full == null) ? `（${X.filter((x) => x.full != null).length}/5）` : '')} | ${f('builtN')} | ${f('best')} | ${X.filter((x) => x.reach != null).length}/5 ${X.some((x) => x.reach != null) ? '第' + f('reach') + '日' : ''} | ${f('rep')} | ${rng(X.map((x) => x.coin10))}→${f('coin')} | ${f('couples')} | ${f('kids')} | ${f('starve5')} | ${f('exps')} | ${f('raids')} | ${f('ko')} |`); }
const agg = {}; for (const tag of ['v175', 'v176']) { const X = ops.flatMap((op) => rows[op + '|' + tag]); agg[tag] = { starve5Cases: X.filter((x) => x.starve5 > 0).length, starve5Mean: mean(X.map((x) => x.starve5)), starveAllMean: mean(X.map((x) => x.starveAll)), coinRatio: mean(X.map((x) => x.coin / Math.max(1, x.coin10))), couples: mean(X.map((x) => x.couples)), ds: mean(X.map((x) => x.ds)), ko: X.reduce((a, x) => a + (x.ko || 0), 0), raids: mean(X.map((x) => x.raids)), reach: X.filter((x) => x.reach != null).length, wood: mean(X.map((x) => x.wood)), stone: mean(X.map((x) => x.stone)), maxedAll: X.filter((x) => x.allMaxed).length, left: X.reduce((a, x) => a + (x.left || 0), 0), mood: rng(X.map((x) => x.mood)), pass: tag === 'v175' ? A.pass : B.pass }; }
const rank = {}; for (const tag of ['v175', 'v176']) rank[tag] = ops.map((op) => { const X = rows[op + '|' + tag]; return [op, mean(X.map((x) => x.ds)), mean(X.map((x) => x.best)), mean(X.map((x) => x.rep))]; }).sort((a, b) => b[1] + b[2] / 100 - (a[1] + a[2] / 100));
fs.writeFileSync('artifacts/v176/compare.json', JSON.stringify({ rows, agg, rank }, null, 1)); fs.writeFileSync('artifacts/v176/compare-table.md', tbl.join('\n') + '\n');
console.log(tbl.join('\n')); console.log(JSON.stringify(agg, null, 1)); console.log(JSON.stringify(rank));
