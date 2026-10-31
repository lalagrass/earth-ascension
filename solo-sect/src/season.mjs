// 季節（v0.7）：一日 600 秒不變，每季 SEASON_DAYS 日
import { DAY, SEASONS, SEASON_DAYS } from './data.mjs';
export function seasonOf(s) { const day = Math.floor(s.t / DAY); const i = Math.floor(day / SEASON_DAYS) % SEASONS.length; return { ...SEASONS[i], i, year: Math.floor(day / (SEASON_DAYS * SEASONS.length)) + 1, dayOf: (day % SEASON_DAYS) + 1 }; }
/* loop73：季節說明（純顯示）：本季剩幾日、心情與飯量的季節修正、下一季是什麼 */
export function seasonHint(s) {
  const se = seasonOf(s), left = SEASON_DAYS - se.dayOf + 1, nx = SEASONS[(se.i + 1) % SEASONS.length], fx = [];
  if (se.mood) fx.push(`心情 ${se.mood > 0 ? '+' : ''}${se.mood}`); if (se.hunger !== 1) fx.push(`飯量 ×${se.hunger}`); if (se.grow !== 1) fx.push(`作物生長時間 ×${se.grow}`);
  return `${se.name}季還有 ${left} 日${fx.length ? `（${fx.join('、')}）` : ''}，之後是${nx.name}`;
}
