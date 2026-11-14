// 武俠小鎮 A1：畫面與引擎共用的常數（畫面只 import 這個，不把引擎本體拉進主執行緒）。
export const SPEEDS = [0, 1, 4, 16, 64] as const;
export type Speed = (typeof SPEEDS)[number];
/**
 * 規則版本：引擎規則或 data/wuxia 的數值改了（同一個存檔續跑結果會不同）就要改這個字串。
 * 格式：步驟-序號。A1 起算。
 */
export const RULE_VERSION = 'a4-1'; // A4（#576）：a4-play 預設開（緣分點、干預、劇本），A3 的存檔續跑結果會不同
export const SAVE_FORMAT = 'wuxia-town-save';
