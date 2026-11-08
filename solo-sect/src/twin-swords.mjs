// R5 #523：兩把劍沒有傷害倍率；優勢來自同一對手在收招前接到第二劍。
import { ARTS } from './data.mjs';
import { CLASH } from './arts.mjs';
import { RING } from './combat-space.mjs';

const swordMoves = new Set(ARTS.filter(a => a.weapon === 'sword').flatMap(a => a.techs || []));
const idOf = a => a?.uid || a?.id;
const live = (s, a) => a?.pos && a.hp > 25 && !(a.faintUntil > s.t) && !(a.downUntil > s.t);

// 只驗同場、同目標與位置；性別、門派與流派都不影響時間。
export function pairedSwordPartner(s, actor, moveId, target, fighters = []) {
  if (!swordMoves.has(moveId) || !live(s, actor) || !target?.pos || !fighters.includes(actor)) return null;
  const targetId = idOf(target);
  if (Math.hypot(actor.pos[0] - target.pos[0], actor.pos[1] - target.pos[1]) > RING.engage) return null;
  return fighters.find(p => p !== actor && live(s, p)
    && Math.hypot(p.pos[0] - target.pos[0], p.pos[1] - target.pos[1]) <= RING.engage
    // N44：目標兩側才真正形成夾角；點積為負即彼此不在同一個正面。
    && (actor.pos[0] - target.pos[0]) * (p.pos[0] - target.pos[0])
      + (actor.pos[1] - target.pos[1]) * (p.pos[1] - target.pos[1]) < 0
    && swordMoves.has(p.swing?.mv || p.bswing?.mv || p.swing?.move)
    && (p.swing?.target || p.swing?.tgt || p.bswing?.tgt) === targetId) || null;
}

// N46 真對練記憶縮短同伴收招後的跟進延遲；不加快自己的前搖。
// 間隔借 N27 格架收招時間，每筆記憶是一次練習，沒有新秒數旋鈕。
export function pairedSwordArrival(s, actor, moveId, target, fighters, naturalAt) {
  const partner = pairedSwordPartner(s, actor, moveId, target, fighters);
  if (!partner) return naturalAt;
  const sharedSpars = (s.mem || []).filter(m => m.k === 'spar'
    && ((m.a === actor.id && m.b === partner.id) || (m.a === partner.id && m.b === actor.id))).length;
  const afterPartner = (partner.swing?.at || partner.bswing?.at || s.t) + CLASH.time.parryRecover / (1 + sharedSpars);
  return Math.max(naturalAt, afterPartner);
}
