// v1.65 人物與門派運作：共同記憶帳本、名俠池畫風濾鏡、傳功、收徒（資料表＋小解讀器）
import { ARTS } from './data.mjs';
import { artById, artTier, learnArt, curCap } from './arts.mjs';
import { aff, relAdd } from './social.mjs';
import { log } from './util.mjs';

// ---- 共同記憶：每筆有時、地、事；聊天從帳本取材 ----
export const MEM = { cap: 80, perPair: 6 };
export const MEM_KINDS = {
  chat:   { where: '前院', text: '{a}和{b}在前院聊了一下午' },
  spar:   { where: '木樁場', text: '{a}和{b}在木樁場拆了幾十招' },
  patrol: { where: '後山', text: '{a}和{b}並肩巡山，走到{x}' },
  pass:   { where: '大廳', text: '{a}把「{x}」親手傳給{b}' },
  apprentice: { where: '祖師像前', text: '{a}在祖師像前收{b}為徒' },
  heal:   { where: '醫館', text: '{a}受了傷，{b}守在醫館' },
};
const pk = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export function addMem(s, a, b, k, x = '') {
  if (!a || !b || a.id === b.id) return null; const K = MEM_KINDS[k]; if (!K) return null; const M = (s.mem ??= []), key = pk(a.id, b.id);
  const m = { p: key, a: a.id, b: b.id, k, day: s.day, where: K.where, text: K.text.replace('{a}', a.name).replace('{b}', b.name).replace('{x}', x) };
  M.push(m); const mine = M.filter((o) => o.p === key); if (mine.length > MEM.perPair) M.splice(M.indexOf(mine[0]), 1); while (M.length > MEM.cap) M.shift(); return m;
}
export const memsOf = (s, a, b) => (s.mem || []).filter((m) => m.p === pk(a.id ?? a, b.id ?? b));
export const memsWith = (s, a) => (s.mem || []).filter((m) => m.a === (a.id ?? a) || m.b === (a.id ?? a));
// 聊天氣泡：有共同記憶就挑最近一筆（不用亂數）
export function chatLine(s, a, b) { const L = memsOf(s, a, b); const m = L[L.length - 1]; return m ? `${a.name}和${b.name}又說起第 ${m.day} 日：${m.text}` : null; }

// ---- 名俠池畫風濾鏡（只過濾名俠池） ----
export const XIA_SRC = { baozupo: 'zhou', baozugong: 'zhou' }; // 未列者＝金庸
export const XIA_STYLES = { all: { name: '全明星', src: ['jin', 'zhou'] }, jin: { name: '純金庸', src: ['jin'] }, zhou: { name: '純周星馳', src: ['zhou'] } };
export const srcOf = (k) => XIA_SRC[k] || 'jin';
export const styleOk = (s, k) => (XIA_STYLES[s.xiaStyle || 'all'] || XIA_STYLES.all).src.includes(srcOf(k));

// ---- 傳功（ROADMAP §G）：圓滿以上帶人練同一門，對方熟練 +15，每門每對一次，好感 +6 ----
export const PASS = { minTier: 3, gain: 15, apprBonus: 5, aff: 6, dur: 20, base: 80, why: '傳功' };
const able = (d) => d && d.role !== 'laborer' && !d.away && d.adult !== false;
export function passPick(s, d) {
  if (!able(d) || (d.passDay === s.day)) return null; const P = s.passed || {};
  const arts = ARTS.filter((a) => !a.secret && !a.classic && artTier(d, a.id) >= PASS.minTier); /* 名俠絕學走各自劇情，不走一般傳功 */ if (!arts.length) return null;
  const cands = s.ds.filter((p) => p !== d && able(p) && !p.task?.partner).sort((x, y) => (y.master === d.id) - (x.master === d.id) || aff(s, d, y) - aff(s, d, x));
  for (const p of cands) for (const a of arts) if (artTier(p, a.id) < PASS.minTier && !P[`${d.id}>${p.id}:${a.id}`]) return { p, art: a.id };
  return null;
}
export function passDo(s, d, p, art) { 
  const key = `${d.id}>${p.id}:${art}`; (s.passed ??= {}); if (s.passed[key]) return false; s.passed[key] = s.day; d.passDay = s.day;
  const a = learnArt(p, art, s.t), r = p.arts[art], g = PASS.gain + (p.master === d.id ? PASS.apprBonus : 0); r.xp = Math.min(curCap(p, a), r.xp + g); r.last = s.t;
  relAdd(s, d, p, PASS.aff); addMem(s, d, p, 'pass', a.name); log(s, `【傳功】${d.name}帶${p.name}練「${a.name}」，熟練 +${g}`); return true;
}

// ---- 收徒：內門／首徒對好感夠的外門收一名徒弟；徒弟在師父在場時練功 ×1.15 ----
export const APPR = { aff: 30, max: 1, trainMul: 1.15 };
const isSenior = (d) => d.role === 'inner' || d.role === 'head';
export const pupilsOf = (s, m) => s.ds.filter((d) => d.master === m.id);
export function apprCands(s, m) { if (!isSenior(m) || m.away || pupilsOf(s, m).length >= APPR.max) return []; return s.ds.filter((d) => d !== m && d.role === 'outer' && !d.master && aff(s, m, d) >= APPR.aff && aff(s, d, m) >= APPR.aff); }
export function takePupil(s, m, d) { if (!d || d.master || !isSenior(m) || pupilsOf(s, m).length >= APPR.max || d.role !== 'outer') return false; d.master = m.id; relAdd(s, m, d, 4); addMem(s, m, d, 'apprentice'); log(s, `【收徒】${m.name}收${d.name}為徒`); return true; }
export function apprDaily(s) { for (const m of s.ds) { const c = apprCands(s, m).sort((x, y) => aff(s, m, y) - aff(s, m, x))[0]; if (c) takePupil(s, m, c); } }
export const apprMul = (s, d) => { const m = d.master && s.ds.find((o) => o.id === d.master); return m && !m.away ? APPR.trainMul : 1; };
