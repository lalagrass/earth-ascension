import { FACILITIES, ACTIVITIES, SIG_ACTS } from './data.mjs';
import { log, resAdd } from './util.mjs';
// ==== （原 core.mjs）====
// v1.5 新模擬核心（ROADMAP §19、DESIGN-REVIEW-SCENE-PATROL-CORE §3）
// 1) Smart Object 登錄：設施階段宣告 offers／slots／時長，活動宣告廣告需求（ad）。新建築只要加資料。
// 2) 統一預約表 s.resv：slotKey → 持有者 id。床位、灶位、菜畦、切磋/聊天夥伴都走這裡；倉庫料走 lifecycle.whReserved。
//    任務把持有的 key 放在 task.resv；每拍 sweepResv 把「持有者已不再持有」的 key 回收，所有 d.task=null 路徑都安全。
//    決定性：slot 由小到大取第一個空位；sweep 以 key 字典序。
// 3) 工序（toil）：stepsOf(task) 把 phase 對成可讀的步驟清單，狀態層與取消/召回共用。
// 4) 需求遲滯＋厭倦：精力 ≤30 進入「想睡」直到 ≥80；做完休閒類 60 秒內吸引力 −70%。
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

// ==== （原 lifecycle.mjs）====
// v1.45 review fix：任務取消與角色移出共用生命週期（GPT review P1-1/P1-2）
// 規則：倉庫庫存 s.res 只在取料當下扣；取料前的「倉庫預留」由各人的 fetch 任務 reservedAmt 推得（whReserved），
// 工地 reserved 同步記帳。任何取消／移出都必須把預留與手上的料一併釋放或退回。
const find = (s, id) => s.ds.find((o) => o.id === id && !o.removed);
// 其他人已預留、尚未取走的倉庫庫存
export const whReserved = (s, k, except = null) => stockReserved(s, k, except); // v1.7 由預約表推得
export const whAvail = (s, k, except = null) => (s.res[k] || 0) - whReserved(s, k, except);
export function cancelTask(s, d, why) {
  const t = d.task; if (!t) return;
  const site = t.act === 'build' && t.fac ? s.fac[t.fac]?.site : null;
  // v1.5 不瞬移：搬運途中被取消，料留在手上，下一拍由 decide 走回院倉（act deliver）；只有移出門派時才直接入庫
  if (t.act === 'build' && t.mat && d.carry?.[t.mat]) { const n = d.carry[t.mat]; if (site) site.reserved[t.mat] = Math.max(0, site.reserved[t.mat] - n); }
  else if (t.act === 'build' && t.mat && t.reservedAmt) { if (site) site.reserved[t.mat] = Math.max(0, site.reserved[t.mat] - t.reservedAmt); t.reservedAmt = 0; }
  if (s.resv) for (const k of t.resv || []) if (s.resv[k] === d.id) delete s.resv[k];
  if (t.partner) { const p = find(s, t.partner); if (p?.task?.partner === d.id) { p.task = null; p.path = []; p.anim = null; } }
  d.task = null; d.path = []; d.anim = null; d.reason = why;
}
// 移出門派（逐出、退隱、名人離開、雇工解約）：取消自己與夥伴任務、退回手上物資、清隊伍與關係鍵
export function removeActor(s, d, why, { quiet = false } = {}) {
  if (!d || !s.ds.includes(d)) return false;
  cancelTask(s, d, why);
  if (d.carry) { for (const [k, v] of Object.entries(d.carry)) { if (!v) continue; resAdd(s, k, v); } d.carry = null; }
  for (const o of s.ds) if (o !== d && o.task?.partner === d.id) cancelTask(s, o, `${d.name}走了`);
  if (s.resv) for (const k of Object.keys(s.resv)) if (s.resv[k] === d.id) delete s.resv[k];
  s.ds = s.ds.filter((x) => x !== d); d.removed = true;
  if (s.hunt?.team) s.hunt.team = s.hunt.team.filter((id) => id !== d.id);
  if (s.exp?.team) s.exp.team = s.exp.team.filter((id) => id !== d.id);
  for (const k of Object.keys(s.aff || {})) if (k.split('>').includes(d.id)) delete s.aff[k];
  for (const k of Object.keys(s.rel || {})) if (k.split('|').includes(d.id)) delete s.rel[k];
  s.families = (s.families || []).filter((k) => !k.split('|').includes(d.id));
  if (s.gen) s.gen.couples = s.gen.couples.filter((c) => !c.includes(d.id));
  for (const o of s.ds) { if (o.sweet === d.id) o.sweet = null; if (o.spouse === d.id) o.spouse = null; } // v1.8 心上人／配偶離開後解鎖
  if (!quiet && why) log(s, `${d.name}${why}`);
  return true;
}
// 全域不變式：無負庫存；工地 reserved == 進行中 fetch 預留 + 手上搬運量；倉庫可用量不為負
export function invariants(s) {
  const bad = [];
  for (const [k, v] of Object.entries(s.res)) if (!(v >= 0)) bad.push(`res.${k}=${v}`);
  for (const k of ['wood', 'stone']) if (whAvail(s, k) < 0) bad.push(`warehouse ${k} over-reserved ${whAvail(s, k)}`);
  for (const [fid, f] of Object.entries(s.fac || {})) { const v = f.site; if (!v) continue;
    for (const k of ['wood', 'stone']) { let exp = 0; for (const o of s.ds) { const t = o.task; if (t?.act === 'build' && t.fac === fid && t.mat === k) exp += t.phase === 'fetch' ? t.reservedAmt || 0 : o.carry?.[k] || 0; }
      if (v.reserved[k] !== exp) bad.push(`site ${fid}.${k} reserved ${v.reserved[k]} != in-flight ${exp}`); if (v.delivered[k] > v.need[k]) bad.push(`site ${fid}.${k} over-delivered`); } }
  { const vr = stockReserved(s, 'veg'); if (vr > s.res.veg) bad.push(`veg reserved ${vr} > veg ${s.res.veg}`); }
  for (const [k, id] of Object.entries(s.resv || {})) if (k.startsWith('stock:') && !find(s, id)) bad.push(`stock key ${k} held by missing ${id}`);
  for (const d of s.ds) { if (!(d.needs.energy >= 0)) bad.push(`${d.id}.energy=${d.needs.energy}`); if (d.task?.partner && !find(s, d.task.partner)) bad.push(`${d.id} partner gone`); }
  // v1.5：床位不超收——每個非地鋪的歇息任務都持有一個本設施的床位 key；同設施床位數 ≤ 階段 beds
  const R = s.resv || {}, beds = {};
  for (const d of s.ds) { const t = d.task; if (t?.act !== 'rest' || t.floor || d.away) continue; const k = (t.resv || []).find((x) => x.startsWith(`${t.fac}:rest:`)); if (!k || R[k] !== d.id) bad.push(`${d.id} resting without bed key`); beds[t.fac] = (beds[t.fac] || 0) + 1; }
  for (const [fid, n] of Object.entries(beds)) { const st = FACILITIES.find((f) => f.id === fid).stages[s.fac[fid]?.stage || 0]; if (n > (st.beds ?? 1)) bad.push(`beds ${fid} ${n}>${st.beds}`); }
  return bad;
}
