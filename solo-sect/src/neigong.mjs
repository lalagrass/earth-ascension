/* loop102 最小內功（概念取自《下一站江湖》心法養內力、《逸劍風雲決》心法支撐修為，不抄碼）。
   只存目前內力 d.qi；上限由已學內功武學的階衍生、不存。不吃造詣、不吃十重：紫霞層數已決定其 xp，只看階，不另加。 */
import { ARTS } from './data.mjs';
import { artTier } from './arts.mjs';
import { ART_CAT } from './growth.mjs';
export const NG = { base: 20, perTier: 15, cap: 200, med: 12, rest: 0.2, strikeCost: 4, strikeMul: 1.25, healAt: 40, healCost: 15, heal: 20, btCost: 20, btBonus: 0.1 };
export const isInner = (a) => a.school === 'inner' || !!ART_CAT[a.id]?.neigong;
export const INNER = ARTS.filter(isInner).map((a) => a.id);
export const innerArts = (d) => INNER.filter((id) => d.arts?.[id]);
export function qiMax(d) { if (d.ng2) return qiMax2(d); let v = NG.base; for (const id of innerArts(d)) v += NG.perTier * (artTier(d, id) + 1); return Math.min(NG.cap, v); }
export const qiOf = (d) => Math.min(d.qi ?? 0, qiMax(d));
export function addQi(d, amt) { d.qi = Math.max(0, Math.min(qiMax(d), (d.qi ?? 0) + amt)); return d.qi; }
// 夠就扣並回 true；不夠不扣
export function spendQi(d, cost) { if (!d.ng || qiOf(d) < cost) return false; d.qi = qiOf(d) - cost; return true; }

/* loop114 二版「護體真氣」（docs/NEIGONG-REWORK.md §3）。d.ng2 由 sim 依 s.ngshield 設定。
   概念：靈氣護盾（了不起的修仙模擬器）、內力吸收傷害（俠客風雲傳北冥神功）。不抄碼。 */
export const NG2 = { cap: [10, 25, 45, 70, 100], mit: [0.02, 0.05, 0.08, 0.12, 0.16], mitCap: 0.3, total: 200, spentT: 20, spentMul: 1.15, powK: 0.2, guard: 15, guardHp: 40 };
export function qiMax2(d) { let v = 0; for (const id of innerArts(d)) v += NG2.cap[artTier(d, id)] ?? 0; return Math.min(NG2.total, v); }
export function mitOf(d) { let v = 0; for (const id of innerArts(d)) v += NG2.mit[artTier(d, id)] ?? 0; return Math.min(NG2.mitCap, v); }
// 受擊：先減傷、再由內力吸收，餘下回傳要扣的生命。力竭中受傷加重。now = 遊戲秒。
export function shieldHit(d, dmg, now = 0) {
  if (!d.ng2) return dmg;
  let x = dmg * ((d.spentUntil ?? -1) > now ? NG2.spentMul : 1);
  const q = qiOf(d);
  if (q <= 0) return x;
  x *= 1 - mitOf(d);
  const ab = Math.min(q, x); d.qi = q - ab; x -= ab;
  if (d.qi <= 0 && !d.guardOnce) { d.spentUntil = now + NG2.spentT; }
  if (d.qi <= 0 && d.guardOnce) d.guardOnce = false;
  return x;
}
export const shieldOn = (d) => !!d.ng2 && qiOf(d) > 0;
