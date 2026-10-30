// loop23 測試框架：玩家 bot（每日試蓋寢舍、能收就收）＋無操作/玩家 bot 對照長跑。
import { createState, tick, canRecruit, recruit, startBuild } from '../../src/sim.mjs';
export const ALL_ON = { draw: true, comprehend: true, mentor: true, peace: true, jhev: true, bt25: true, lift: true, lairpow: true, steward: true };
export function botDaily(s) { try { startBuild(s, 'dorm'); } catch { /* 無料或已在蓋 */ } const c = canRecruit(s); if (c.ok) { recruit(s); return true; } return false; }
// run(seed, spec, days, bot, onTick) → state
export function run(seed, spec, days = 60, bot = false, onTick) {
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), ...ALL_ON, ...spec }); let day = s.day;
  for (let i = 0; i < days * 100; i++) { tick(s, 6); onTick?.(s); if (bot && s.day !== day) { day = s.day; botDaily(s); } }
  return s;
}
