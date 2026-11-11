// 武俠小鎮 W0：元素清單與掛鉤（#549 第 2 節）。
// Game.tick 在內建 tick 跑完後呼叫 runElements(game, now)，依本清單順序執行已開啟的元素。
// W0 是空清單；W1 起每一步在這裡加一個元素。
import type { Game } from '../aiTown/game';
import type { WuxiaState } from './state';

export type WuxiaElement = {
  id: string;
  requires?: string[];
  init?: (state: WuxiaState) => void;
  tick?: (game: Game, now: number) => void;
  handleInput?: Record<string, (game: Game, now: number, args: any) => unknown>;
};

export const ELEMENTS: WuxiaElement[] = [];

export function isEnabled(
  state: WuxiaState,
  id: string,
  elements: WuxiaElement[] = ELEMENTS,
  seen: Set<string> = new Set(),
): boolean {
  if (!state.enabled[id]) return false;
  const element = elements.find((e) => e.id === id);
  if (!element) return false;
  if (seen.has(id)) throw new Error(`Circular wuxia element requirement at ${id}`);
  seen.add(id);
  return (element.requires ?? []).every((r) => isEnabled(state, r, elements, seen));
}

export function enabledElements(
  state: WuxiaState,
  elements: WuxiaElement[] = ELEMENTS,
): WuxiaElement[] {
  return elements.filter((e) => isEnabled(state, e.id, elements));
}

/** 建立世界狀態時呼叫：只 init 開啟的元素。 */
export function initElements(state: WuxiaState, elements: WuxiaElement[] = ELEMENTS) {
  for (const element of enabledElements(state, elements)) {
    element.init?.(state);
  }
}

export function runElements(game: Game, now: number, elements: WuxiaElement[] = ELEMENTS) {
  const state = game.world.wuxia;
  if (!state) return;
  for (const element of enabledElements(state, elements)) {
    element.tick?.(game, now);
  }
}
