// v1.5 新模擬核心（ROADMAP §19、DESIGN-REVIEW-SCENE-PATROL-CORE §3）
// 1) Smart Object 登錄：設施階段宣告 offers／slots／時長，活動宣告廣告需求（ad）。新建築只要加資料。
// 2) 統一預約表 s.resv：slotKey → 持有者 id。床位、灶位、菜畦、切磋/聊天夥伴都走這裡；倉庫料走 lifecycle.whReserved。
//    任務把持有的 key 放在 task.resv；每拍 sweepResv 把「持有者已不再持有」的 key 回收，所有 d.task=null 路徑都安全。
//    決定性：slot 由小到大取第一個空位；sweep 以 key 字典序。
// 3) 工序（toil）：stepsOf(task) 把 phase 對成可讀的步驟清單，狀態層與取消/召回共用。
// 4) 需求遲滯＋厭倦：精力 ≤30 進入「想睡」直到 ≥80；做完休閒類 60 秒內吸引力 −70%。
import { FACILITIES, ACTIVITIES, SIG_ACTS } from './data.mjs';
export const CORE = { sleepAt: 30, wakeAt: 80, boredFor: 60, boredMul: 0.3, boredActs: ['leisure', 'chat', 'forage', 'encourage'] };
const facDef = (id) => FACILITIES.find((f) => f.id === id);
const stageOf = (s, id) => facDef(id).stages[s.fac[id]?.stage || 0];
// 各活動的 slot 容量：數字＝固定；字串＝讀設施階段欄位；null＝不限
export const SLOT_RULE = { rest: 'beds', cook: 1, farm: 'plots', spar: 'dummies', meditate: null, train: null, learn: null, eat: null, chop: null, quarry: null, forage: null, chat: null, leisure: null, encourage: null };
export function slotCap(s, fid, act) {
  const st = stageOf(s, fid); const r = st.slots?.[act] ?? SLOT_RULE[act];
  if (r == null) return Infinity; if (typeof r === 'number') return r; return st[r] ?? 1;
}
// 登錄表：哪裡提供什麼（含容量、時長、廣告需求）。純資料推導，UI／測試可直接讀
export function registry(s) {
  const out = [];
  for (const f of FACILITIES) { const st = stageOf(s, f.id); for (const act of st.offers || []) out.push({ fac: f.id, node: f.node, act, cap: slotCap(s, f.id, act), dur: durOf(s, { act, fac: f.id }), ad: ACTIVITIES[act]?.ad || null, laborOnly: !!st.laborOnly }); }
  return out;
}
export function durOf(s, t) { const A = t.act === 'sig' ? { ...ACTIVITIES.sig, ...(SIG_ACTS[s.sect?.id] || {}) } : ACTIVITIES[t.act] || {}; if (t.act === 'cook') return stageOf(s, t.fac).cookDur; if (t.act === 'learn') return stageOf(s, 'hall').learnDur * (s.fac.library?.stage ? 0.75 : 1); /* v1.6 藏經閣：聽講快 25% */ return A.dur || 0; }
// ---- 預約 ----
export const resvOf = (s) => (s.resv ??= {});
export const holder = (s, key) => resvOf(s)[key] ?? null;
export function reserve(s, d, key) { const R = resvOf(s); if (R[key] && R[key] !== d.id) return false; R[key] = d.id; return true; }
export function freeSlot(s, fid, act, d) {
  const cap = slotCap(s, fid, act); if (cap === Infinity) return `${fid}:${act}:*`;
  for (let i = 0; i < cap; i++) { const k = `${fid}:${act}:${i}`, h = holder(s, k); if (!h || h === d?.id) return k; }
  return null;
}
export const slotFree = (s, fid, act, d) => freeSlot(s, fid, act, d) != null;
export function taskKeys(t) { return t?.resv || []; }
// 回收：持有者不在、或其目前任務不再列出這個 key
export function sweepResv(s) {
  const R = resvOf(s); const by = new Map(s.ds.map((d) => [d.id, d]));
  for (const k of Object.keys(R).sort()) { const d = by.get(R[k]); if (!d || !taskKeys(d.task).includes(k)) delete R[k]; }
}
export const actorBusy = (s, id) => !!holder(s, `actor:${id}`);
// ---- 工序 ----
const STEP_NAMES = { go: '走過去', do: '動手', fetch: '去院倉取料', deliver: '送到工地', return: '送回院倉', done: '收尾' };
export function stepsOf(t) {
  if (!t) return [];
  const seq = t.act === 'build' && t.mat ? ['fetch', 'deliver'] : t.act === 'build' ? ['go', 'do'] : t.act === 'deliver' ? ['return'] : t.act === 'farm' ? ['go', 'do', 'return?'] : ACTIVITIES[t.act]?.carry ? ['go', 'do', 'return'] : ['go', 'do'];
  const i = Math.max(0, seq.findIndex((p) => p.replace('?', '') === t.phase));
  return seq.map((p, j) => ({ id: p.replace('?', ''), name: STEP_NAMES[p.replace('?', '')], state: j < i ? 'done' : j === i ? 'now' : 'next', optional: p.endsWith('?') }));
}
export function nextStep(t) { const st = stepsOf(t), n = st.find((x) => x.state === 'next'); return n ? n.name : null; }
// ---- 需求遲滯與厭倦 ----
// v1.7 遲滯推廣成資料表：flag 在 need ≤ on 時亮，直到 need ≥ off 才熄（避免門檻附近來回抖）
export const HYST = { tired: { need: 'energy', on: CORE.sleepAt, off: CORE.wakeAt }, famished: { need: 'hunger', on: 15, off: 50 } };
export function needStep(d) {
  for (const [flag, h] of Object.entries(HYST)) { const v = d.needs[h.need]; if (v == null) continue; if (v <= h.on) d[flag] = true; else if (v >= h.off) d[flag] = false; }
}
export const boredMul = (s, d, act) => (CORE.boredActs.includes(act) && d.bored?.[act] != null && s.t - d.bored[act] < CORE.boredFor ? CORE.boredMul : 1);
export function markDone(s, d, act) { if (CORE.boredActs.includes(act)) (d.bored ??= {})[act] = s.t; }

// ---- v1.7 倉庫／菜庫預留併入預約表：key＝stock:<物資>:<人>，數量由持有人當下的任務依 STOCK_RESV 推得 ----
export const STOCK_RESV = { cook: { mat: 'veg', amt: 2, untilPhase: 'done' }, build: { mat: 'task', amt: 'reservedAmt', phase: 'fetch' } };
export const stockKey = (k, d) => `stock:${k}:${d.id}`;
export function stockAmt(o, k) { const t = o?.task, R = t && STOCK_RESV[t.act]; if (!R) return 0; if (R.mat === 'veg' ? k !== 'veg' : t.mat !== k) return 0;
  if (R.untilPhase && t.phase === R.untilPhase) return 0; if (R.phase && t.phase !== R.phase) return 0; return typeof R.amt === 'number' ? R.amt : t[R.amt] || 0; }
export function stockReserved(s, k, except = null) { const R = resvOf(s), pre = `stock:${k}:`; let n = 0;
  for (const [key, id] of Object.entries(R)) if (key.startsWith(pre) && id !== except?.id) n += stockAmt(s.ds.find((o) => o.id === id), k); return n; }
