// M19a 後山打獵：獵戶小屋蓋好後，林間的鹿（吃草、不動）、補鹿、打獵的成敗。純規則＋狀態；呼叫端在 sim。
import { HUNT } from './data.mjs';
import { nextRand, randInt } from './rng.mjs';
import { walkable } from './map.mjs';
import { standSpot } from './build.mjs';

// 林間找一格可走、旁邊站得到人的地方。最多試 40 次，找不到就這次不補。
function spotFor(state) {
  for (let i = 0; i < 40; i++) {
    const x = HUNT.X0 + randInt(state, HUNT.X1 - HUNT.X0 + 1), y = 4 + randInt(state, state.map.length - 8);
    if (walkable(state.map, x, y) && standSpot(state, x, y) && !state.deer.some((d) => d.x === x && d.y === y)) return { x, y };
  }
  return null;
}

// 每 tick：剛蓋好時一次補滿；之後少了鹿，每 RESPAWN tick 補一頭。
export function stepDeer(state) {
  if (!state.deer) return;
  const add = () => { const at = spotFor(state); if (at) state.deer.push({ id: `d${state.deerSeq = (state.deerSeq ?? 0) + 1}`, x: at.x, y: at.y, user: null }); };
  if (!state.deerInit) {
    state.deerInit = true;
    for (let i = 0; i < HUNT.HERD; i++) add();
    state.deerNext = Infinity;
    return;
  }
  if (state.deer.length < HUNT.HERD && state.tick >= state.deerNext) {
    add();
    state.deerNext = state.deer.length < HUNT.HERD ? state.tick + HUNT.RESPAWN : Infinity;
  }
}

export const huntChance = (p) => Math.max(0.1, Math.min(0.95, HUNT.P0 + HUNT.P_SHEN * (p.attrs.shen - 5)));

// 打完：成功扛肉；不管成敗，這頭鹿都離開，RESPAWN tick 後補一頭。回傳扛到幾份肉。
export function endHunt(state, p, deerId) {
  const i = state.deer?.findIndex((d) => d.id === deerId) ?? -1;
  if (i < 0) return 0;
  state.deer.splice(i, 1);
  if (state.deerNext === Infinity) state.deerNext = state.tick + HUNT.RESPAWN;
  return nextRand(state) < huntChance(p) ? HUNT.MEAT : 0;
}
