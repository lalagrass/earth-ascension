// ==== （原 events.mjs）====
// v1.45 三級事件分流（ADOPTION-PLAN A3）：low＝頭上氣泡、mid＝右側可點竹簡、top＝暫停＋推鏡
export const TOP_RX = /名俠|辟邪|破招|化境|衣缽|★|瀕死覺醒|【營地】|入門|叛/;
export const MID_RX = /巡山|戰報|回頭|返程|驚獸|學會|領悟|自悟|新招|招收|收養|成親|守關|獸|瓶頸|升為|內門|外門|試煉|完工|落成|本門新紀錄|重傷倒地/;
export function tierOf(msg) { return TOP_RX.test(msg) ? 'top' : MID_RX.test(msg) ? 'mid' : 'low'; }
// 從訊息找出主角人物（氣泡掛在誰頭上、推鏡推到誰）
export function whoOf(s, msg) { let b = null; for (const d of s.ds || []) if (d.name && msg.includes(d.name) && (!b || msg.indexOf(d.name) < msg.indexOf(b.name))) b = d; return b?.id || null; }
export function classify(s, e) { e.tier ??= tierOf(e.msg); e.who ??= whoOf(s, e.msg); return e; }
// 側邊卡：最近 mid/top 事件；氣泡：最近 low 事件（每人只留最新一則，存活 ttl 秒）
export const BUBBLE_TTL = 8;
export function sideCards(s, n = 6) { return (s.log || []).filter((e) => (e.tier || tierOf(e.msg)) !== 'low').slice(0, n); }
export function bubbles(s) { const out = {}; for (const e of s.log || []) { if ((e.tier || tierOf(e.msg)) !== 'low' || s.t - e.t > BUBBLE_TTL) continue; const w = e.who ?? whoOf(s, e.msg); if (w && !out[w]) out[w] = e.msg; } return out; }

// ==== （原 util.mjs）====
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

// ==== （原 seedmix.mjs）====
// Loop 32：Lehmer 亂數流的種子雜湊混合。舊寫法第 1 抽與 seed 成線性（小種子全擠在 0 附近）。
export const M = 2147483647;
export function seedMix(seed, salt) {
  let h = (Math.imul((seed >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt >>> 0, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x846ca68b) >>> 0; h ^= h >>> 16;
  return ((h >>> 0) % (M - 1)) + 1;
}

// ==== （原 mul.mjs）====
// v0.95 統一倍率管線：天賦／狀態／外部三組；組內相加（各項 v-1 加總），組間相乘，每組夾在 0.3–2.0
export const MUL_GROUPS = ['talent', 'state', 'ext'];
export const MUL_CLAMP = [0.3, 2.0];
export const MUL_NAMES = { talent: '天賦', state: '狀態', ext: '外部' };
// parts: { talent: [[名稱, 倍率], ...], state: [...], ext: [...] }
export function pipeline(parts) {
  const out = { total: 1, parts };
  for (const g of MUL_GROUPS) { const sum = 1 + (parts[g] || []).reduce((a, [, v]) => a + (v - 1), 0); out[g] = Math.min(MUL_CLAMP[1], Math.max(MUL_CLAMP[0], sum)); out.total *= out[g]; }
  return out;
}
export const mulText = (p) => MUL_GROUPS.map((g) => `${MUL_NAMES[g]}×${p[g].toFixed(2)}${(p.parts[g] || []).length ? `（${p.parts[g].map(([n, v]) => `${n}${v >= 1 ? '+' : ''}${(v - 1).toFixed(2)}`).join(' ')}）` : ''}`).join(' · ');
