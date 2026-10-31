/* loop102 最小內功（概念取自《下一站江湖》心法養內力、《逸劍風雲決》心法支撐修為，不抄碼）。
   只存目前內力 d.qi；上限由已學內功武學的階衍生、不存。不吃造詣、不吃十重：紫霞層數已決定其 xp，只看階，不另加。 */
import { ARTS } from './data.mjs';
import { artTier } from './arts.mjs';
import { ART_CAT } from './growth.mjs';
export const NG = { base: 20, perTier: 15, cap: 200, med: 12, rest: 0.2, strikeCost: 4, strikeMul: 1.25, healAt: 40, healCost: 15, heal: 20, btCost: 20, btBonus: 0.1 };
export const isInner = (a) => a.school === 'inner' || !!ART_CAT[a.id]?.neigong;
export const INNER = ARTS.filter(isInner).map((a) => a.id);
export const innerArts = (d) => INNER.filter((id) => d.arts?.[id]);
export function qiMax(d) { let v = NG.base; for (const id of innerArts(d)) v += NG.perTier * (artTier(d, id) + 1); return Math.min(NG.cap, v); }
export const qiOf = (d) => Math.min(d.qi ?? 0, qiMax(d));
export function addQi(d, amt) { d.qi = Math.max(0, Math.min(qiMax(d), (d.qi ?? 0) + amt)); return d.qi; }
// 夠就扣並回 true；不夠不扣
export function spendQi(d, cost) { if (!d.ng || qiOf(d) < cost) return false; d.qi = qiOf(d) - cost; return true; }
