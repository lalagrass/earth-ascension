// 出自 Phase 7 規格：雙劍合璧只在同一場真交手、近戰肩距內成立。
import { RING } from './combat-space.mjs';

export const TWIN_SWORDS_DAMAGE = 1.35; // 出自 Phase 7 規格；與 Phase 3 的雙劍畫面倍率相同。
const SWORD_MOVES = new Set(['qz1', 'qz2', 'ys1', 'ys2']);

export function twinSwordsPartner(s, d, fighters = []) {
  if (!s.hermitage?.founded || s.sect?.doctrine !== 'dualHall' || !d || !fighters.includes(d)
    || d.hp <= 25 || d.faintUntil > s.t || d.downUntil > s.t || !d.pos) return null;
  return fighters.find((p) => p !== d && p.hp > 25 && !(p.faintUntil > s.t) && !(p.downUntil > s.t) && p.pos
    && Math.hypot(d.pos[0] - p.pos[0], d.pos[1] - p.pos[1]) <= RING.engage
    && !!p.fem !== !!d.fem
    && ((d.arts?.quanzhenSword && p.arts?.yunvSword) || (d.arts?.yunvSword && p.arts?.quanzhenSword))) || null;
}

export function twinSwordsDamageFactor(s, d, moveId, fighters = []) {
  return SWORD_MOVES.has(moveId) && twinSwordsPartner(s, d, fighters) ? TWIN_SWORDS_DAMAGE : 1;
}
