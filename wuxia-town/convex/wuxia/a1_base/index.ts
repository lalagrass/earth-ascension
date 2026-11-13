// 武俠小鎮 A1（#564，元素 id a1-base）：第一系列修補的開關（#549：每一步一個元素，關掉時跟 W9 逐位元組相同）。
// 本元素沒有自己的狀態與 tick；開啟時：
//   - w03-life：同一活動連做超過 needs.json repeat.after 次，日程權重遞減（林嫂一天煮茶九次）
//   - w07-bond：師父對同一徒弟的「徒弟違規」每遊戲日最多算一次（教頭對徒弟敬重長期為負）
// 只放 id 與元素定義，不 import 其他元素（避免循環 import）。requires w03-life：修補都在 w03／w07 裡，w03 關掉時本元素也關。
import type { WuxiaState } from '../state';

export const A1_BASE = 'a1-base';

/** 開關：enabled 旗標＋requires（w03-life 本身 requires w01、w02），跟 registry.isEnabled 結果相同。 */
export function a1On(w: Pick<WuxiaState, 'enabled'> | undefined): boolean {
  return !!w?.enabled[A1_BASE] && !!w.enabled['w03-life'] && !!w.enabled['w02-folk'] && !!w.enabled['w01-skin'];
}

export const a1BaseElement = { id: A1_BASE, requires: ['w03-life'] };
