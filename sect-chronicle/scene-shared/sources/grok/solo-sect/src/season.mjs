// 季節（v0.7）：一日 600 秒不變，每季 SEASON_DAYS 日
import { DAY, SEASONS, SEASON_DAYS } from './data.mjs';
export function seasonOf(s) { const day = Math.floor(s.t / DAY); const i = Math.floor(day / SEASON_DAYS) % SEASONS.length; return { ...SEASONS[i], i, year: Math.floor(day / (SEASON_DAYS * SEASONS.length)) + 1, dayOf: (day % SEASON_DAYS) + 1 }; }
