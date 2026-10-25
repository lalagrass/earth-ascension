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
