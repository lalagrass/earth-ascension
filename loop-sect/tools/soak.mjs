// 無畫面長跑：多個種子各跑數日，檢查不變量並輸出個性差異統計。
// 用法：node loop-sect/tools/soak.mjs [--seeds 12] [--days 5]
// 預設 5 日：M3-A6、M4-A5、M5-A5、M6-A5 的驗收都寫「5 日內」（loop 6 前預設是 3 日，與規格不一致）。
import { createWorld, step, stateHash } from '../src/sim.mjs';
import { TICKS_PER_DAY } from '../src/data.mjs';
import { rosterFor, invariants, samplers, summarize, judge, script, perSeed } from './soak-checks.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? Number(process.argv[i + 1]) : d;
};
const SEEDS = arg('seeds', 12);
const DAYS = arg('days', 5);
const TICKS = DAYS * TICKS_PER_DAY;

const failures = [];
// 三個情境：base（M2–M8 的自然遊玩）、exp（M9：第 3 日起討伐野豬窩）、grow（M11：第 2 日起蓋宿舍）。
for (const scenario of ['base', 'exp', 'grow']) {
  const pooled = {};
  for (let seed = 1; seed <= SEEDS; seed++) {
    const s = createWorld({ seed, people: rosterFor(seed) });
    const ctx = { seed, failures: [], samples: pooled, prev: new Map(), lastMove: new Map() };
    for (let t = 0; t < TICKS && ctx.failures.length < 5; t++) {
      script(s, scenario);
      for (const p of s.people) ctx.prev.set(p.id, { x: p.x, y: p.y });
      step(s);
      for (const inv of invariants) inv(s, ctx);
      for (const fn of samplers) fn(s, ctx);
    }
    perSeed(s, ctx);
    const again = createWorld({ seed, people: rosterFor(seed) });
    while (again.tick < s.tick) { script(again, scenario); step(again); }
    if (stateHash(again) !== stateHash(s)) ctx.failures.push('決定論：同種子兩次雜湊不同');
    failures.push(...ctx.failures.map((f) => `[${scenario}] seed ${seed}: ${f}`));
    if (scenario === 'base') console.log(`seed ${String(seed).padStart(2)} hash ${stateHash(s)} ${summarize(s)}`);
  }
  const verdict = judge(pooled, scenario);
  console.log(`--- 情境 ${scenario} ---`);
  console.log(verdict.lines.join('\n'));
  failures.push(...verdict.failures.map((f) => `[${scenario}] ${f}`));
}
if (failures.length) {
  console.error(`\nFAIL ${failures.length}\n` + failures.slice(0, 20).join('\n'));
  process.exit(1);
}
console.log(`\nOK ${SEEDS} seeds × ${DAYS} days × 3 scenarios`);
