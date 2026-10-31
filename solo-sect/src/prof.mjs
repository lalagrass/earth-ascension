/* loop90 熟練度十重（概念取自暴走英雄壇「每級線性加傷害」，不抄碼）：每個武學階段（入門／小成／大成／圓滿）切成十重，化境不分重。
   效果只有一項：該武學招式威力每重 +PROF.perLv（階內補間；到下一階重歸一重，淨增仍為正）。和造詣（原始投入→同類加速）輸入輸出都不同，不重複計算。 */
import { TIERS, ART_GAIN } from './data.mjs';
export const PROF = { lvs: 10, perLv: ART_GAIN.tierDmg / 20, cn: ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'] };
// xp → { t 階, name, lv 1–10（化境 0）, lo, hi, stuck 卡瓶頸 }
export function profOf(xp) {
  let t = 0; for (let k = 0; k < TIERS.length; k++) if (xp >= TIERS[k][0]) t = k;
  const name = TIERS[t][1]; if (t === TIERS.length - 1) return { t, name, lv: 0, lo: TIERS[t][0], hi: TIERS[t][0], stuck: false };
  const lo = TIERS[t][0], hi = TIERS[t + 1][0], lv = Math.min(PROF.lvs, Math.floor(((xp - lo) / (hi - lo)) * PROF.lvs) + 1);
  return { t, name, lv, lo, hi, stuck: hi - xp <= 0.1 + 1e-9 && (hi === 55 || hi === 100) };
}
export const profMul = (xp) => { const p = profOf(xp); return 1 + PROF.perLv * Math.max(0, p.lv - 1); };
export const profLabel = (xp) => { const p = profOf(xp); return p.lv ? `${p.name}${PROF.cn[p.lv]}重${p.stuck ? '（瓶頸）' : ''}` : p.name; };
// 下一重門檻 xp（化境回 null）
export const nextLvXp = (xp) => { const p = profOf(xp); if (!p.lv) return null; return p.lv < PROF.lvs ? p.lo + ((p.hi - p.lo) * p.lv) / PROF.lvs : p.hi; };
