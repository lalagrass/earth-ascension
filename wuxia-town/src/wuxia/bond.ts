// 武俠小鎮 W7（#559）：前端讀 w07-bond 狀態的小工具。只讀，不改規則。
import type { WuxiaState } from '../../convex/wuxia/state';
import type { BondState } from '../../convex/wuxia/w07_bond/data';

export const W07_BOND = 'w07-bond';

export function bondStateOf(world: { wuxia?: WuxiaState } | undefined | null): BondState | undefined {
  const w = world?.wuxia;
  if (!w || !w.enabled[W07_BOND]) return undefined;
  return w.elements[W07_BOND] as BondState | undefined;
}

/** 武館匾額上的名號（周教頭收第一個徒弟後才有）。 */
export function plaqueName(world: { wuxia?: WuxiaState } | undefined | null): string | undefined {
  return bondStateOf(world)?.dojoName;
}
