/* loop130 勞作練體的顯示（純字串，可在 Node 測試）。只寫玩家看得到的：今日做活長了多少、傷害倍率。 */
import { DAY } from './data.mjs';
import { LABOR, strMul, laborToday } from './labor.mjs';
export const laborNote = (s, d) => (d?.lg ? `（勞作今日 ${Math.min(laborToday(d, Math.floor(s.t / DAY)), 99).toFixed(1)}/${LABOR.cap}・招式 ×${strMul(d).toFixed(2)}）` : '');
