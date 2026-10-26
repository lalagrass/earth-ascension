// v1.45 review fix：任務取消與角色移出共用生命週期（GPT review P1-1/P1-2）
// 規則：倉庫庫存 s.res 只在取料當下扣；取料前的「倉庫預留」由各人的 fetch 任務 reservedAmt 推得（whReserved），
// 工地 reserved 同步記帳。任何取消／移出都必須把預留與手上的料一併釋放或退回。
import { log, resAdd } from './util.mjs';
import { FACILITIES } from './data.mjs';
import { stockReserved } from './core.mjs';
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
