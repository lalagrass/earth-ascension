// loop23 測試框架：玩家 bot（每日試蓋寢舍、能收就收）＋無操作/玩家 bot 對照長跑。
import { createState, tick, canRecruit, recruit, startBuild } from '../../src/sim.mjs';
export const ALL_ON = { draw: true, comprehend: true, mentor: true, peace: true, jhev: true, bt25: true, lift: true, lairpow: true, steward: true, jhui: true, qshare: true, jhrefuse: true, mfit: true, cropcare: true, letterask: true, mpool: true };
export function botDaily(s) { try { startBuild(s, 'dorm'); } catch { /* 無料或已在蓋 */ } const c = canRecruit(s); if (c.ok) { recruit(s); return true; } return false; }
// run(seed, spec, days, bot, onTick) → state
export function run(seed, spec, days = 60, bot = false, onTick) {
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), ...ALL_ON, ...spec }); let day = s.day;
  for (let i = 0; i < days * 100; i++) { tick(s, 6); onTick?.(s); if (bot && s.day !== day) { day = s.day; botDaily(s); } }
  return s;
}

// loop34：長跑種子區間（避開 1–160 這組固定樣本）。用法：for (const seed of seedRange()) …；多區間：seedRanges([1001, 5001], 80)
export const seedRange = (n = 160, start = 1001) => Array.from({ length: n }, (_, i) => start + i);
export const seedRanges = (starts = [1001, 5001], n = 80) => starts.flatMap((a) => seedRange(n, a));
