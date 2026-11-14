// 武俠小鎮 W6（#558）：切磋的畫面資料（前端與截圖頁共用）。只透過 duel.ts 的 boutView 看「勢」（#562 W6-11）。
// 動畫完全由「這一回合發生的引擎時間」與畫面時間算出來（不存在狀態裡）：
//   攻方前衝半格、守方被擊中後退半格（白色閃光＋「中！」），閃開則側身；打完後輸家退半格、頭上勢點全空。
import type { SparMatch, SparState } from '../../convex/wuxia/w06_spar/data';
import { boutView, BoutView } from '../../convex/wuxia/w06_spar/duel';

export const SPAR_ANIM_MS = 600;
export const FLASH_MS = 450;

export function sparOf(world: { wuxia?: any } | undefined): SparState | undefined {
  const w = world?.wuxia;
  if (!w?.enabled?.['w06-spar']) return undefined;
  return w.elements?.['w06-spar'] as SparState | undefined;
}

export type SparFx = {
  match: SparMatch;
  view?: BoutView;
  /** 最後一回合距今幾毫秒（沒有回合時 undefined） */
  since?: number;
  /** 攻方 playerId、守方 playerId */
  attacker?: string;
  defender?: string;
  hit?: boolean;
};

export function sparFx(world: { wuxia?: any } | undefined, time: number): SparFx[] {
  const st = sparOf(world);
  if (!st) return [];
  return st.active.map((match) => {
    if (!match.bout) return { match };
    const view = boutView(match.bout);
    const last = view.last;
    const at = match.times[match.times.length - 1];
    if (!last || at === undefined) return { match, view };
    const attacker = last.att === 0 ? match.a : match.b;
    const defender = last.att === 0 ? match.b : match.a;
    return { match, view, since: time - at, attacker, defender, hit: last.hit };
  });
}

const bump = (u: number) => (u < 0 || u > SPAR_ANIM_MS ? 0 : Math.sin((Math.PI * u) / SPAR_ANIM_MS));

/** 某人此刻的位移（像素）：攻方前衝、守方後退或側身、輸家收勢時退半格。 */
export function sparOffset(
  world: { wuxia?: any } | undefined,
  playerId: string,
  time: number,
  tileDim: number,
  pos: (id: string) => { x: number; y: number } | undefined,
): { dx: number; dy: number } {
  for (const fx of sparFx(world, time)) {
    const m = fx.match;
    if (m.a !== playerId && m.b !== playerId) continue;
    const me = pos(playerId);
    const other = pos(m.a === playerId ? m.b : m.a);
    if (!me || !other) return { dx: 0, dy: 0 };
    const len = Math.hypot(other.x - me.x, other.y - me.y) || 1;
    const ux = (other.x - me.x) / len;
    const uy = (other.y - me.y) / len;
    const half = tileDim / 2;
    const animating = fx.since !== undefined && fx.since >= 0 && fx.since <= SPAR_ANIM_MS;
    if (m.phase === 'rest' && m.result && !m.result.draw && !animating) {
      const loserPid = m.result.loser === m.ca ? m.a : m.b;
      if (loserPid === playerId) return { dx: -ux * half, dy: -uy * half };
      return { dx: 0, dy: 0 };
    }
    if (fx.since === undefined) return { dx: 0, dy: 0 };
    const k = bump(fx.since);
    if (fx.attacker === playerId) return { dx: ux * half * k, dy: uy * half * k };
    if (fx.defender === playerId) {
      if (fx.hit) return { dx: -ux * half * k, dy: -uy * half * k };
      // 閃身：往側邊
      return { dx: -uy * half * 0.8 * k, dy: ux * half * 0.8 * k };
    }
  }
  return { dx: 0, dy: 0 };
}
