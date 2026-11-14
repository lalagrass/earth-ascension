// 武俠小鎮 A5（#577，元素 id a5-robust）：長跑修補的開關（#549：每一步一個元素，關掉時跟 A4 逐位元組相同）。
// 本元素沒有自己的狀態與 tick；開啟時：
//   - w03-life：走路重試用完時先讓到旁邊空格再找路（夾在兩個睡在路邊的人中間整晚走不到床，360 日體檢周教頭疲勞）
//   - w07-bond：拜師紀錄只留最近 200 筆
//   - w08-jianghu：傳聞、導演擲骰、事件紀錄、鎮誌只留最近一段（events.json logs；360 日狀態從 127 KB 長到 707 KB）
// 只放 id 與元素定義，不 import 其他元素（避免循環 import）。requires w03-life：修補都在 w03／w07／w08 裡。
import type { WuxiaState } from '../state';

export const A5_ROBUST = 'a5-robust';

/** 開關：enabled 旗標＋requires（w03-life 本身 requires w01、w02），跟 registry.isEnabled 結果相同。 */
export function a5On(w: Pick<WuxiaState, 'enabled'> | undefined): boolean {
  return !!w?.enabled[A5_ROBUST] && !!w.enabled['w03-life'] && !!w.enabled['w02-folk'] && !!w.enabled['w01-skin'];
}

export const a5RobustElement = { id: A5_ROBUST, requires: ['w03-life'] };
