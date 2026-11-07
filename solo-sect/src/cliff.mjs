import { ARTS, CLIFFS } from './data.mjs';
import { artTier } from './arts.mjs';

// 出自 Phase 6 規格：以已會的任一身法火候與有效身法數值檢三階山崖，不抽亂數。
export function canLeapCliff(d, cliffId) {
  const cliff = CLIFFS[cliffId]; if (!cliff || !d) return false;
  const best = ARTS.filter(a => a.school === 'step' && d.arts?.[a.id]).reduce((t, a) => Math.max(t, artTier(d, a.id)), -1);
  return best >= cliff.tier && (d.skills?.agility || 0) >= cliff.agility;
}
export const CLIFF_ACT_NODE = Object.freeze(Object.fromEntries(Object.entries(CLIFFS).flatMap(([id, cliff]) => cliff.acts.map(act => [act, id]))));
