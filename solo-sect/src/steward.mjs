// loop30 執事自主（選用，s.steward）：每日一次，沒有工地時依序立藍圖——
// ① 有人睡地鋪 → 擴寢舍；② 野豬來過且尚無哨崗 → 蓋護山哨（有人上哨，野豬下山會被嚇回）。
import { log } from './util.mjs';
export const STEW = { boarSeen: 1 };
export function stewardDaily(s, H) {
  if (!s.steward || H.siteOf(s)) return null;
  const pick = s.ds.length > H.capacity(s) ? 'dorm' : (s.stew?.boar || 0) >= STEW.boarSeen && (s.fac.watch?.stage || 0) === 0 ? 'watch' : s.stewkit && s.ds.length >= 8 && (s.fac.kitchen?.stage || 0) === 0 && (s.res.food || 0) < s.ds.length ? 'kitchen' : null; /* loop60「執事顧灶」（s.stewkit）：人多存飯不夠一人一頓、還是露天灶 → 蓋膳房 */
  if (pick && H.startBuild(s, pick) !== false) { (s.stew ??= {}).built = [...(s.stew.built || []), pick]; log(s, `【執事】${pick === 'dorm' ? '有人睡地鋪，執事立了擴建寢舍的藍圖' : pick === 'kitchen' ? '人多灶小，常常開飯不夠，執事立了膳房的藍圖' : '野豬屢屢下山，執事立了護山哨的藍圖'}。`); return pick; }
  return null;
}
export const stewBoar = (s) => { if (s.steward) (s.stew ??= {}).boar = (s.stew.boar || 0) + 1; };
