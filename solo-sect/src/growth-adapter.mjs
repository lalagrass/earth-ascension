import { TIERS, MOVES } from './data.mjs';
import { artById, artTier, focusOf, windOf } from './arts.mjs';
import { reactionFloor } from './practice.mjs';
import { forceTarget } from './growth-core.mjs';

// N52 的唯一成長資料轉接點。N42 改成收斂底層時，只換這裡的讀值。
export function growthSnapshot(d, since = 0) {
  const id = focusOf(d) || Object.keys(d.arts || {})[0], art = artById(id);
  if (!art || !d.arts?.[id]) return { art: null, tier: -1, title: '白身・初學', progress: 0, left: null, today: 0, firstLine: '白身・初學｜先練出第一門功夫' };
  const xp = d.arts[id].xp || 0, tier = Math.max(0, artTier(d, id));
  const lo = TIERS[tier][0], hi = TIERS[tier + 1]?.[0] ?? 100;
  const left = tier < TIERS.length - 1 ? Math.max(0, hi - xp) : 0;
  const progress = tier < TIERS.length - 1 ? Math.max(0, Math.min(100, 100 * (xp - lo) / (hi - lo))) : 100;
  const title = `${art.name}・${TIERS[tier][1]}`;
  const today = Math.max(0, xp - since);
  const move = MOVES.find((m) => m.id === art.tech), wind = move ? windOf(d, move.id, move.cd) : null;
  const reaction = reactionFloor(d), force = forceTarget(art, xp);
  const why = `${wind == null ? '身體招尚未定型' : `本式前搖 ${wind.toFixed(2)} 秒`}，反應下限 ${reaction.toFixed(2)} 秒，勁 ${force.toFixed(2)}`;
  return { art: id, tier, title, progress, left, today, xp, wind, reaction, force, why,
    firstLine: `${title}｜${left ? `距${TIERS[tier + 1][1]} ${left.toFixed(1)}` : tier < TIERS.length - 1 ? '可衝關' : '本階已滿'}｜今日 +${today.toFixed(1)}｜${why}` };
}
