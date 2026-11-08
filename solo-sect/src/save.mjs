import { RULES_VERSION } from './data.mjs';
import { suhuiOf } from './world.mjs';

// R9 #529：舊局及跨規則版存檔不再遷移；同版隱居局可原樣讀回。
export const SAVE_VERSION = 1;
export function initStateFields(s) {
  s.codex ??= {}; s.exp ??= null; s.lastExp ??= null; s.records ??= { sect: 0, who: null }; s.expN ??= 0;
  s.pace ??= { done: [], trial: null }; s.guide ??= { on: true, msg: null, seen: [] };
  s.res.page1 ??= 0; s.res.page2 ??= 0; s.res.hide ??= 0; s.res.gall ??= 0;
  for (const d of s.ds) { d.best ??= 0; d.insight ??= {}; d.away ??= false; }
  return s;
}
export const knownRules = (r) => r === RULES_VERSION;
export function save(s) { return JSON.stringify({ ...s, fx: [], legacy: { suhui: suhuiOf(s) } }); }
export function load(str) {
  let o; try { o = JSON.parse(str); } catch { return { ok: false, err: '存檔損毀' }; }
  if (!o || o.v !== SAVE_VERSION || !Array.isArray(o.ds)) return { ok: false, err: '存檔版本不符' };
  if (o.rules !== RULES_VERSION || !o.hermitage) return { ok: false, err: '存檔版本不符' };
  return { ok: true, state: o };
}
