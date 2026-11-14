// 武俠小鎮 A2（#575）：前端讀 a2-master 狀態的小工具。只讀，不改規則。
import type { WuxiaState } from '../../convex/wuxia/state';
import type { A2State } from '../../convex/wuxia/a2_master/data';
import { profileById } from '../../convex/wuxia/w02_folk';

export const A2_MASTER = 'a2-master';

export function a2StateOf(world: { wuxia?: WuxiaState } | undefined | null): A2State | undefined {
  const w = world?.wuxia;
  if (!w || !w.enabled[A2_MASTER]) return undefined;
  return w.elements[A2_MASTER] as A2State | undefined;
}

export const cidName = (cid: string) => profileById(cid)?.name ?? cid;

type LifeLike = { people: Record<string, { cid: string; cur?: { act?: string; phase?: string } }> };
export function lifePeople(wuxia: WuxiaState | undefined): LifeLike['people'] {
  return ((wuxia?.elements['w03-life'] as LifeLike | undefined)?.people ?? {}) as LifeLike['people'];
}
export function pidOfCid(wuxia: WuxiaState | undefined, cid: string): string | undefined {
  const people = lifePeople(wuxia);
  return Object.keys(people).find((pid) => people[pid].cid === cid);
}
