// 武俠小鎮 A1：畫面與引擎共用的常數（畫面只 import 這個，不把引擎本體拉進主執行緒）。
export const SPEEDS = [0, 1, 4, 16, 64] as const;
export type Speed = (typeof SPEEDS)[number];
/**
 * 規則版本：引擎規則或 data/wuxia 的數值改了（同一個存檔續跑結果會不同）就要改這個字串。
 * 格式：步驟-序號。A1 起算。
 */
export const RULE_VERSION = 'a7-1'; // A7（#584）：a7-tuition 預設開（錢、束脩、以工代學、水缸柴堆、接濟付束脩、劇本目標改寫），A6 的存檔續跑結果會不同
// A6 舊註解：'a6-1' // A6（#581）：a6-spread 預設開（看變稀有、教的門檻依難度、練招曲線、目標依序），A5 的存檔續跑結果會不同
export const SAVE_FORMAT = 'wuxia-town-save';
