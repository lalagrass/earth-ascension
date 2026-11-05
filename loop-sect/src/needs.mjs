import { NEED_DECAY, WALK_ENERGY, NIGHT_FROM, NIGHT_TO, TICKS_PER_DAY } from './data.mjs';

export const clamp01 = (v) => Math.max(0, Math.min(100, v));

// 越缺越陡：滿 0、空 4。
export function urgency(v) {
  const d = 1 - clamp01(v) / 100;
  return 4 * d * d;
}

export function decayRates(p) {
  const t = p.traits;
  let energy = NEED_DECAY.energy;
  if (t.includes('frail')) energy *= 1.25;
  if (t.includes('sturdy')) energy *= 0.85;
  return {
    food: NEED_DECAY.food,
    energy,
    social: NEED_DECAY.social * (1 + 0.6 * p.axes.E),
    fun: NEED_DECAY.fun * (1 + 0.4 * p.axes.P),
  };
}

// 睡著時餓得慢、也不會無聊或寂寞。
export function decayNeeds(p, walking, asleep = false) {
  const r = decayRates(p);
  if (asleep) { r.food *= 0.5; r.social = 0; r.fun = 0; }
  for (const k of Object.keys(r)) p.needs[k] = clamp01(p.needs[k] - r[k]);
  if (walking) p.needs.energy = clamp01(p.needs.energy - WALK_ENERGY);
}

export function applyPer(p, per, scale = 1) {
  for (const [k, v] of Object.entries(per)) p.needs[k] = clamp01(p.needs[k] + v * scale);
}

export function isNight(tick) {
  const h = Math.floor((tick % TICKS_PER_DAY) / 60);
  return h >= NIGHT_FROM || h < NIGHT_TO;
}
