// 扇形曲線基準 FAN_BASE 實測校準（#408 第三輪 P1-1）。
// node tools/calib-fan.mjs <base 的 solo-sect 目錄> [候選值...]
// 先量 base 一次，再對每個候選 FAN_BASE 用 SS_FAN_BASE 跑 head，
// 找出「常見段」使用者第 30 日 dps 中位數最接近 base 的值（目標 ±20%）。原始輸出全部印出。
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const bot = path.join(here, 'bot12.mjs');
const baseDir = process.argv[2];
if (!baseDir) { console.error('用法：node tools/calib-fan.mjs <base solo-sect> [候選...]'); process.exit(2); }
const cands = process.argv.slice(3).map(Number).filter((x) => x > 0);
const run = (dir, fb) => JSON.parse(execFileSync('node', [bot, dir, '--json'], { env: { ...process.env, ...(fb ? { SS_FAN_BASE: String(fb) } : {}) }, encoding: 'utf8', maxBuffer: 1 << 24 }).trim().split('\n').pop());
const base = run(baseDir);
console.log('RAW base', JSON.stringify(base));
const target = base.tiers['常見'].dps;
let best = null;
for (const fb of cands.length ? cands : [10, 11, 12, 13, 14]) {
  const h = run(path.join(here, '..'), fb);
  console.log('RAW head FAN_BASE=' + fb, JSON.stringify(h));
  const r = h.tiers['常見'].dps / target;
  if (!best || Math.abs(r - 1) < Math.abs(best.r - 1)) best = { fb, r, h };
}
console.log(`\n| FAN_BASE | 常見 dps (head/base) | 比值 |\n|---|---|---|\n| ${best.fb} | ${best.h.tiers['常見'].dps} / ${target} | ${best.r.toFixed(2)} |`);
console.log(Math.abs(best.r - 1) <= 0.2 ? '在 ±20% 內' : '超出 ±20%');
