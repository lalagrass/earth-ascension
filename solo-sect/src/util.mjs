import { classify } from './events.mjs';
// 共用小工具（v0.7 拆檔）
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const relKey = (a, b) => [a, b].sort().join('|');
export const affKey = (a, b) => `${a}>${b}`;
export function log(s, msg, tier) { const e = classify(s, { t: Math.floor(s.t), msg, ...(tier ? { tier } : {}) }); s.log.unshift(e); if (e.tier === 'top' && !s.alert) s.alert = { msg, who: e.who, t: e.t }; if (s.log.length > 60) s.log.pop(); }
// v1.8 每日帳本：所有 s.res 異動都要記（book），resAdd／resSet 是「改庫存＋記帳」的唯一捷徑
export function book(s, dir, k, v) { if (!v || !s.ledger) return; const L = s.ledger; L[dir][k] = (L[dir][k] || 0) + v; }
export function resAdd(s, k, v) { const o = s.res[k] || 0; s.res[k] = o + v; const d = s.res[k] - o; if (d) book(s, d > 0 ? 'in' : 'out', k, Math.abs(d)); }
// v2.1：療傷丹產出／治傷／賣出／陳化分開累計。只記帳，不改數量。
export function pillNote(s, k, n) { if (!n) return; const P = (s.pills ??= { made: 0, used: 0, sold: 0, aged: 0 }); P[k] = (P[k] || 0) + n; }
export const resSet = (s, k, nv) => resAdd(s, k, nv - (s.res[k] || 0));
