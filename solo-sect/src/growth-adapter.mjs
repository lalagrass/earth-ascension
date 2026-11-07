import { TIERS, MOVES } from './data.mjs';
import { artById, artOfMove, artTier, focusOf, windOf, fastestMove, combatMoves, moveStats, qiMax } from './arts.mjs';
import { speedOf } from './sim.mjs';
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

// N61: one read-only adapter for the card and growth-metrics. The scales are
// fixed display references, never combat caps or probabilities.
export const BATTLE_AXES = [
  { key: 'quick', name: '快', ref: 0.25, inverse: true, unit: '秒', note: '最快可用招的實際前搖；秒數越少，起手越快。顯示參照為四分之一秒。' },
  { key: 'eye', name: '眼', ref: 0.18, inverse: true, unit: '秒', note: 'N42 反應下限；秒數越少，越早認出來招。顯示參照為 0.18 秒。' },
  { key: 'force', name: '勁', ref: 2, unit: '倍', note: '可用招式裡最有勁的 N42 武學目標；白身看身體勁，敵人按十點衝撞勁折一倍。顯示參照為 2 倍。' },
  { key: 'body', name: '身', ref: 120, unit: '步/秒', note: '目前實際腳程，含腳力、身法和負重；移步能否躲開也看身法。顯示參照為每秒 120 步。' },
  { key: 'endure', name: '耐', ref: 180, unit: '點', note: '目前精力加上可用內力上限；久戰和護體的本錢。顯示參照為 180 點。' },
  { key: 'forms', name: '招', ref: 18, unit: '式分', note: '已會招式數加已學武學的熟練階數；會的接法越多越廣。顯示參照為 18 式分。' },
];
export function battleMetrics(d) {
  const moves = combatMoves(d), mv = fastestMove(d);
  const attackArts = moves.map((move) => artOfMove(move.id)).filter((art) => art && d.arts?.[art.id]);
  return {
    quick: windOf(d, mv?.id || 'bodyPunch', mv?.cd || 1),
    eye: reactionFloor(d),
    force: attackArts.length ? Math.max(...attackArts.map((art) => forceTarget(art, d.arts[art.id].xp || 0))) : d.k ? moveStats(d, mv?.id || 'bodyPunch').force / 10 : 1 + (d.skills?.strength || 0) / 100,
    body: d.skills ? speedOf(d) : (d.agi || 0),
    endure: (d.needs?.energy ?? d.sta ?? 100) + qiMax(d),
    forms: moves.length + Object.entries(d.arts || {}).reduce((n, [id]) => n + Math.max(0, artTier(d, id)), 0),
  };
}
export const battleAxisValues = (raw) => BATTLE_AXES.map((axis) => {
  const value = Math.max(0, Number(raw[axis.key]) || 0);
  return Math.max(0, Math.min(1, axis.inverse ? axis.ref / (axis.ref + value) : value / axis.ref));
});
export function recordAxisHistory(history, d, day) {
  const list = history[d.id] ??= [];
  if (list.at(-1)?.day !== day) list.push({ day, raw: battleMetrics(d) });
  while (list.length > 33) list.splice(1, 1); // keep entry day and the latest 32 daily starts
  return list;
}
export function earlierAxisHistory(history, id, day) {
  const list = history[id] || [];
  return [...list].reverse().find((row) => row.day <= day - 30) || list[0] || null;
}
