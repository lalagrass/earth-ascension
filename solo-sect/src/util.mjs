import { classify } from './events.mjs';
// 共用小工具（v0.7 拆檔）
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const relKey = (a, b) => [a, b].sort().join('|');
export const affKey = (a, b) => `${a}>${b}`;
export function log(s, msg, tier) { const e = classify(s, { t: Math.floor(s.t), msg, ...(tier ? { tier } : {}) }); s.log.unshift(e); if (e.tier === 'top' && !s.alert) s.alert = { msg, who: e.who, t: e.t }; if (s.log.length > 60) s.log.pop(); }
