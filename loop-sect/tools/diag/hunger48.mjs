// 診斷（M22）：48 個種子（1–48）base 第 2–toDay 日的飢餓人·tick 分布：合計、四組、中位、p75、p90。
// 十二個種子的合計被一兩個走向整個變了的種子左右（loop 24、25），所以看 48 個種子的分位數。
// 用法：node loop-sect/tools/diag/hunger48.mjs [toDay=4] [常數.欄位=值 ...]，例如 SUPPER.K=1
import { createWorld, step } from '../../src/sim.mjs';
import { rosterFor, script } from '../soak-checks.mjs';
import * as data from '../../src/data.mjs';
const args = process.argv.slice(2);
const toDay = Number(args.find((a) => !a.includes('=')) ?? 4);
for (const a of args.filter((x) => x.includes('='))) {
  const [path, v] = a.split('='); const [obj, key] = path.split('.');
  data[obj][key] = Number(v);
}
const T = data.TICKS_PER_DAY, per = [];
for (let seed = 1; seed <= 48; seed++) {
  const s = createWorld({ seed, people: rosterFor(seed) }); let h = 0;
  for (let t = 0; t < toDay * T; t++) { script(s, 'base'); step(s); if (t < T) continue; for (const p of s.people) if (!p.guest && p.needs.food < 15) h++; }
  per.push(h);
}
const q = (f) => [...per].sort((a, b) => a - b)[Math.min(47, Math.floor(f * 48))];
const sum = (a) => a.reduce((x, y) => x + y, 0);
console.log(`${args.join(' ') || '現值'}：第 2–${toDay} 日飢餓人·tick 合計 ${sum(per)}；四組 ${[0, 1, 2, 3].map((i) => sum(per.slice(i * 12, i * 12 + 12))).join('/')}；中位 ${q(0.5)}、p75 ${q(0.75)}、p90 ${q(0.9)}；為 0 的種子 ${per.filter((x) => x === 0).length}/48`);
