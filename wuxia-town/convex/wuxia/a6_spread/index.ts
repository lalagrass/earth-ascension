// 武俠小鎮 A6（#581，元素 id `a6-spread`）：傳得開也傳得久——看變成稀有的偷學、教與練讓非大師的正式再傳在 30–60 日內發生。
// 規則本身寫在 a2_master（看、教、練的判定）與 a4_play（目標依序）裡，用 a6On(w) 判斷開關；本檔只放元素定義與狀態。
// 關閉時跟 A5 逐位元組相同（quick q3：--off a6-spread）。
import type { WuxiaState } from '../state';
import { A2_MASTER } from '../a2_master/data';
import { A4_PLAY } from '../a4_play/data';
import { A6_SPREAD, A6State, a6On, initA6State } from './data';

export * from './data';

export const a6SpreadElement = {
  id: A6_SPREAD,
  requires: [A2_MASTER, A4_PLAY],
  init: (state: WuxiaState) => {
    state.elements[A6_SPREAD] = initA6State();
  },
};

/** 本元素的狀態（a6 關閉時 undefined；舊世界沒有時懶建立） */
export function a6State(w: WuxiaState | undefined): A6State | undefined {
  if (!w || !a6On(w)) return undefined;
  return ((w.elements[A6_SPREAD] as A6State | undefined) ??= initA6State());
}
