// 武學：熟練只在練完時成長；練完有機會領悟前置已滿足的新招。純規則，呼叫端負責什麼時候叫。
import { MOVES, START_MOVES, MARTIAL } from './data.mjs';
import { nextRand } from './rng.mjs';

const BY_ID = Object.fromEntries(MOVES.map((m) => [m.id, m]));
export const moveLabel = (id) => BY_ID[id].label;

export function newMoves() {
  return Object.fromEntries(START_MOVES.map((id) => [id, 0]));
}

export function moveGain(p, id) {
  const v = p.moves[id];
  return MARTIAL.MOVE_GAIN * Math.max(0, 1 - v / 120) * (0.6 + 0.08 * p.attrs[BY_ID[id].attr]);
}

// 悟性高、直覺型的人開竅快。
export function compChance(p) {
  return MARTIAL.COMP_BASE * (0.4 + 0.12 * p.attrs.wu) * (1 + 0.3 * Math.max(0, p.axes.N));
}

// 前置都滿足、還不會的招。
export function comprehendable(p) {
  return MOVES.filter((m) => m.req && !(m.id in p.moves) && Object.entries(m.req).every(([k, v]) => (p.moves[k] ?? -1) >= v));
}

// 要練哪一招：會的招裡熟練最低、還沒練滿的；全滿就練第一招。
export function drillMove(p) {
  let best = null;
  for (const id of Object.keys(p.moves)) if (p.moves[id] < 100 && (best === null || p.moves[id] < p.moves[best])) best = id;
  return best ?? Object.keys(p.moves)[0];
}

export function prowess(p) {
  return Object.entries(p.moves ?? {}).reduce((s, [id, v]) => s + BY_ID[id].power * v / 100, 0);
}

// M7 膽識：武力、外向、膂力加分，心軟的人比較怕。
export function courage(p) {
  return 0.5 * prowess(p) + 0.3 * p.axes.E - 0.2 * Math.max(0, p.axes.F) + 0.1 * (p.attrs.li - 5) / 5;
}

export function learn(p, id, start = 0) {
  if (id in p.moves) return false;
  p.moves[id] = start;
  return true;
}

// 練完一次：長熟練，再逐一擲領悟。回傳領悟到的招（或 null）。
export function practice(state, p, id, mul = 1) {
  p.moves[id] = Math.min(100, p.moves[id] + moveGain(p, id) * mul);
  const chance = compChance(p) * mul;
  for (const m of comprehendable(p)) {
    if (nextRand(state) < chance) { learn(p, m.id); return m.id; }
  }
  return null;
}
