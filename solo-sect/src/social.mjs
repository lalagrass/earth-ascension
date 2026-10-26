// 人際（v0.7）：雙向好感 aff[a>b]、相容度、關係階段由雙向平均決定
import { REL_STAGES, OPPOSE, LIKES } from './data.mjs';
import { clamp, log, relKey, affKey } from './util.mjs';
export const relStage = (v) => { let n = REL_STAGES[0][1]; for (const [t, name] of REL_STAGES) if (v >= t) n = name; return n; };
// a 看 b 的相容係數 0.4–1.6
export function compat(a, b) {
  let sc = 0; const A = a.personality || [], B = b.personality || [];
  for (const x of A) for (const y of B) { if (OPPOSE.some(([p, q]) => (p === x && q === y) || (p === y && q === x))) sc -= 1; if ((LIKES[x] || []).includes(y)) sc += 1; }
  return clamp(1 + 0.3 * sc, 0.4, 1.6);
}
export const aff = (s, a, b) => s.aff[affKey(a.id ?? a, b.id ?? b)] ?? 0;
export function initPair(s, a, b, v) { s.aff[affKey(a.id, b.id)] = v; s.aff[affKey(b.id, a.id)] = v; s.rel[relKey(a.id, b.id)] = v; }
export function relAdd(s, a, b, amt) {
  const k = relKey(a.id, b.id), before = s.rel[k] || 0, cap = a.adult && b.adult ? 100 : 89; // 未成年不進道侶
  for (const [x, y] of [[a, b], [b, a]]) { const kk = affKey(x.id, y.id); s.aff[kk] = clamp((s.aff[kk] ?? before) + amt * compat(x, y), 0, cap); }
  s.rel[k] = (aff(s, a, b) + aff(s, b, a)) / 2;
  if (relStage(before) !== relStage(s.rel[k])) {
    log(s, `${a.name}與${b.name}成了「${relStage(s.rel[k])}」`);
    if (s.rel[k] >= 90 && !s.families.includes(k) && (!a.sweet || a.sweet === b.id) && (!b.sweet || b.sweet === a.id)) { s.families.push(k); a.sweet = b.id; b.sweet = a.id; log(s, `${a.name}與${b.name}結為道侶，認定了彼此是心上人。`); } // v1.8 心上人唯一
  }
}
