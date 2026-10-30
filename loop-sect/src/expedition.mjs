// 遠征的純規則：巢穴狀態、組隊、撤退判斷。行軍與打鬥的控制在 sim。
import { NESTS, EXPEDITION, POIS } from './data.mjs';
import { courage } from './martial.mjs';
import { members } from './recruit.mjs';

export function newNests() {
  return NESTS.map((n) => ({ id: n.id, label: n.label, kind: n.kind, x: n.x, y: n.y, hp: n.hp, hpMax: n.hp, cleared: false, guards: [] }));
}

export const nestOf = (state, id) => state.nests.find((n) => n.id === id);
export const kindBlocked = (state, kind) => state.nests.some((n) => n.cleared && n.kind === kind);

// 誰能去：同門、精神與肚子都夠、膽識高的優先。
export function eligible(p) {
  return !p.guest && !p.exp && p.needs.energy >= EXPEDITION.MIN_ENERGY && p.needs.food >= EXPEDITION.MIN_FOOD;
}

export function partyFor(state) {
  return members(state).filter(eligible).sort((a, b) => courage(b) - courage(a) || (a.id < b.id ? -1 : 1)).slice(0, EXPEDITION.PARTY_MAX);
}

export function canLaunch(state, nestId) {
  const n = nestOf(state, nestId);
  if (!n) return { ok: false, reason: '沒有這處巢穴' };
  if (n.cleared) return { ok: false, reason: '已經拆掉了' };
  if (state.expedition) return { ok: false, reason: '已經有一支隊伍在外面' };
  const party = partyFor(state);
  if (party.length < EXPEDITION.PARTY_MIN) return { ok: false, reason: `能去的人不到 ${EXPEDITION.PARTY_MIN} 位（精力 ≥ ${EXPEDITION.MIN_ENERGY}、飽食 ≥ ${EXPEDITION.MIN_FOOD}）`, party };
  const need = party.length * EXPEDITION.MIN_RATIONS;
  if (state.stock.meal < need) return { ok: false, reason: `乾糧不夠：每人至少帶 ${EXPEDITION.MIN_RATIONS} 份，要 ${need} 份，灶上只有 ${state.stock.meal} 份`, party };
  return { ok: true, party };
}

// 撤退的理由（沒有就回 null）。
export function retreatReason(state, ppl, hour) {
  if (ppl.some((p) => p.needs.energy < EXPEDITION.RETREAT_ENERGY)) return '精力不支';
  if (ppl.some((p) => p.needs.food < EXPEDITION.RETREAT_FOOD && !p.pack)) return '乾糧吃完了';
  if (hour >= EXPEDITION.RETREAT_HOUR) return '天黑了';
  return null;
}

export function homeSpot() {
  const y = POIS.find((p) => p.id === 'yard');
  return { x: y.x, y: y.y };
}
