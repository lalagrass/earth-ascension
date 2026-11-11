// 武俠小鎮 W0：元素清單與掛鉤（#549 第 2 節）。
// Game.tick 在內建 tick 跑完後呼叫 runElements(game, now)，依本清單順序執行已開啟的元素。
// W0 是空清單；W1 起每一步在這裡加一個元素（W1 w01-skin、W2 w02-folk、W3 w03-life、W4 w04-dojo、W5 w05-mind）。
import type { Game } from '../aiTown/game';
import type { WuxiaState } from './state';
import { skinElement } from './w01_skin';
import { folkElement } from './w02_folk';
import { lifeElement } from './w03_life';
import { dojoElement } from './w04_dojo';
import { mindElement } from './w05_mind';

export type WuxiaElement = {
  id: string;
  requires?: string[];
  init?: (state: WuxiaState) => void;
  tick?: (game: Game, now: number) => void;
  handleInput?: Record<string, (game: Game, now: number, args: any) => unknown>;
};

export const ELEMENTS: WuxiaElement[] = [skinElement, folkElement, lifeElement, dojoElement, mindElement];

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
  const enabled = enabledElements(state, elements);
  // W1：遊戲時鐘的起點（#549 §3）＝第一個有元素開啟的 tick。全部關閉的世界（W0 的 fixture）不寫，hash 不變。
  if (enabled.length > 0 && state.clockEpoch === undefined) {
    state.clockEpoch = now;
  }
  for (const element of enabled) {
    element.tick?.(game, now);
  }
}
