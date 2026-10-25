import { wexinMood } from './hero.mjs';
// 心智（v0.6→v0.7 拆檔）：性格、想法、心情、特質揭露
import { TRAITS, THOUGHTS, NEED_MOOD, MOOD, WORK_ACTS, LEISURE_ACTS, REVEAL_AT } from './data.mjs';
import { clamp, log } from './util.mjs';
import { seasonOf } from './season.mjs';
export function think(s, d, id, extra = '') {
  const T = THOUGHTS[id]; if (!T) return;
  let v = T.v; for (const p of d.personality || []) { const m = TRAITS[p]?.thoughtMul; if (m?.[T.tag]) v *= m[T.tag]; else if (m?.bad && v < 0) v *= m.bad; }
  const ex = d.thoughts.find((x) => x.id === id);
  if (ex) { ex.left = T.ttl; ex.v = Math.round(v); } else d.thoughts.push({ id, text: T.text + extra, v: Math.round(v), left: T.ttl });
}
export function moodParts(d, s) {
  const parts = [['基線', MOOD.base]];
  for (const p of d.personality || []) if (TRAITS[p]?.moodBase) parts.push([TRAITS[p].name, TRAITS[p].moodBase]);
  for (const th of d.thoughts) parts.push([th.text, th.v]);
  for (const [k, [thr, v, tag]] of Object.entries(NEED_MOOD)) if ((d.needs[k] ?? 100) < thr) { let x = v; for (const p of d.personality || []) { const m = TRAITS[p]?.thoughtMul; if (m?.[tag]) x *= m[tag]; } parts.push([{ hunger: '肚子餓', energy: '累', social: '寂寞', fun: '悶' }[k], Math.round(x)]); }
  if (d.wexin) parts.push([`違心×${d.wexin}`, Math.round(wexinMood(d))]);
  if (s) { const se = seasonOf(s); if (se.mood) parts.push([`${se.name}天`, se.mood]); }
  return parts;
}
export const moodTarget = (d, s) => clamp(moodParts(d, s).reduce((a, [, v]) => a + v, 0), 0, 100);
export function moodStep(s, d, dt) {
  for (const th of d.thoughts) th.left -= dt; d.thoughts = d.thoughts.filter((x) => x.left > 0);
  const diff = moodTarget(d, s) - d.mood; d.mood = clamp(d.mood + clamp(diff, -MOOD.down * dt, MOOD.up * dt), 0, 100);
}
export function traitMul(d, act) { let m = 1; for (const p of d.personality || []) m *= TRAITS[p]?.mods?.[act] || 1; return m; }
export function moodMul(d, act) {
  if (d.mood < MOOD.low) return WORK_ACTS.includes(act) ? 0.6 : LEISURE_ACTS.includes(act) ? 1.35 : 1;
  if (d.mood > MOOD.high) return WORK_ACTS.includes(act) ? 1.15 : 1;
  return 1;
}
export const focusMul = (d) => 0.8 + 0.4 * (d.mood / 100);
export const moodLabel = (m) => (m < 15 ? '崩潰邊緣' : m < MOOD.low ? '低落' : m < MOOD.high ? '平穩' : m < 90 ? '愉快' : '意氣風發');
// 揭露：相處時間累積；聊天、被鼓勵時額外加
export function revealStep(s, d, dt) {
  d.together = (d.together || 0) + dt;
  d.personality.forEach((p, i) => {
    if (d.known.includes(p)) return;
    if (d.together >= (d.revealAt?.[i] ?? REVEAL_AT[i] ?? 900)) { d.known.push(p); log(s, `相處日久，看出${d.name}${TRAITS[p].name}：${TRAITS[p].desc}`); }
  });
}
export const knownTraits = (d) => d.personality.map((p) => (d.known.includes(p) ? p : null));
