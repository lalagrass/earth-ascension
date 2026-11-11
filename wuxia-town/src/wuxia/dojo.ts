// 武俠小鎮 W4（#556）：前端讀武館狀態（w04-dojo）的小工具。只讀，不改規則。
import type { DojoState } from '../../convex/wuxia/w04_dojo';
import type { LifeState } from '../../convex/wuxia/w03_life';

export const W04_DOJO = 'w04-dojo';
type WithWuxia = { wuxia?: { enabled: Record<string, boolean>; elements: Record<string, unknown> } };

export function dojoOf(world: WithWuxia | undefined | null): DojoState | undefined {
  const w = world?.wuxia;
  if (!w || !w.enabled[W04_DOJO]) return undefined;
  return w.elements[W04_DOJO] as DojoState | undefined;
}

/** W5：武館開了沒（w05-mind 開時由周教頭的心念重開；W4 第 1 日就開）。畫面用這個決定武館是破落還是開張。 */
export function dojoOpened(world: WithWuxia | undefined | null): boolean {
  return dojoOf(world)?.openedAt !== undefined;
}

/** 正在打樁的人用「打樁」動作圖（public/wuxia/characters/folk.png 第 5 列）。 */
export function poseFor(world: WithWuxia | undefined | null, playerId: string): string | undefined {
  if (!dojoOf(world)) return undefined;
  const life = world!.wuxia!.elements['w03-life'] as LifeState | undefined;
  const cur = life?.people[playerId]?.cur;
  return cur?.phase === 'do' && cur.act === 'hit_dummy' ? 'punch' : undefined;
}
