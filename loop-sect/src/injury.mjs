// M16 受傷：傷勢加減、狀態判斷。純規則；呼叫端（raid 的反擊、sim 的休養與煎藥）負責什麼時候叫。
import { INJURY } from './data.mjs';

export const hurt = (p) => (p.hurt ?? 0) >= INJURY.MIN;
export const heavy = (p) => (p.hurt ?? 0) >= INJURY.HEAVY;

// 敵人扣了 amt 精力：傷勢跟著加；剛跨過受傷門檻時記紀事。
export function wound(state, p, amt, foe) {
  const was = hurt(p);
  p.hurt = (p.hurt ?? 0) + amt * INJURY.RATE;
  if (!was && hurt(p)) {
    p.bubble = { text: '受了傷', until: state.tick + 60 };
    state.events.push({ tick: state.tick, kind: 'hurt', text: `${p.name}迎戰${foe}時受了傷`, who: [p.id] });
    state.counts.injured = (state.counts.injured || 0) + 1;
  }
}

// 每 tick 休養：睡覺退得快。
export function heal(p, asleep) {
  if (!p.hurt) return;
  p.hurt = Math.max(0, p.hurt - (asleep ? INJURY.HEAL_SLEEP : INJURY.HEAL));
}

export function hurtText(p) {
  return heavy(p) ? '傷重' : hurt(p) ? '受傷' : p.hurt > 0 ? '小傷' : '無傷';
}
