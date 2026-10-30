// loop28 心情自救（選用，s.lift）：心情低於衝關門檻（沿用 BREAK.moodMin，不改門檻）時，
// 依最缺的需求抬高對應活動：悶→閒坐看雲、寂寞→聊天、累→歇息。
import { BREAK } from './data.mjs';
export const LIFT = { k: 1.6, need: 50, map: { fun: 'leisure', social: 'chat', energy: 'rest' } };
export function liftBoost(s, d, out) {
  if (!s.lift || d.mood >= BREAK.moodMin) return; const n = d.needs;
  const low = Object.keys(LIFT.map).filter((k) => (n[k] ?? 100) < LIFT.need).sort((a, b) => (n[a] ?? 100) - (n[b] ?? 100));
  for (const k of low) { const o = out.find((x) => x.act === LIFT.map[k]); if (o) { o.score *= LIFT.k; o.why = `心情低落，${o.why}`; o.lift = true; return; } }
}
