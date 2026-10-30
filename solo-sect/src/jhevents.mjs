// loop23 江湖事件（選用，s.jhev）：過路高人指點、挑戰帖。獨立亂數流，不擾動主亂數；golden 不變。
import { power } from './jianghu.mjs';
import { autoFocus, artById, curCap } from './arts.mjs';
import { log } from './util.mjs';
export const JHEV = { master: { p: 0.12, after: 4, cool: 6, xp: 8, mood: 5 }, letter: { p: 0.08, after: 8, cool: 9, base: 75, grow: 30, win: { rep: 4, mood: 6 }, lose: { rep: 2, mood: 8 } } };
const R = (s) => { const E = s.jhev; E.rng = ((E.rng || ((s.seed || 1) * 7919 + 11) % 2147483647) * 16807) % 2147483647; return E.rng / 2147483647; };
const here = (s) => s.ds.filter((d) => !d.away && d.role !== 'laborer' && d.hp > 30);
const md = (d, v) => { d.mood = Math.max(0, Math.min(100, d.mood + v)); };
export const letterP = (s, day) => { const pow = power(s), pts = JHEV.letter.base * (1 + day / JHEV.letter.grow); return Math.max(0.15, Math.min(0.85, pow / (pow + pts))); };
export function jhevDaily(s) {
  const E = (s.jhev = typeof s.jhev === 'object' ? s.jhev : { m: 0, l: 0, lw: 0, mNext: 0, lNext: 0 }), day = s.day, M = JHEV.master, L = JHEV.letter;
  if (day >= M.after && day >= E.mNext && R(s) < M.p) { const c = here(s).filter((d) => autoFocus(d)); const d = c[Math.floor(R(s) * c.length)];
    if (d) { const id = autoFocus(d), a = artById(id), r = d.arts[id]; r.xp = Math.min(curCap(d, a), r.xp + M.xp); md(d, M.mood); E.m++; E.mNext = day + M.cool; log(s, `【過路高人】一位雲遊高人借宿一晚，指點了${d.name}的「${a.name}」幾招。`); } }
  if (day >= L.after && day >= E.lNext && R(s) < L.p) { const c = here(s); if (c.length) { const champ = c.sort((a, b) => (b.skills?.[b.style] || 0) - (a.skills?.[a.style] || 0))[0], p = letterP(s, day), win = R(s) < p; E.l++; E.lNext = day + L.cool;
    if (win) { E.lw++; s.rep = (s.rep || 0) + L.win.rep; md(champ, L.win.mood); log(s, `【挑戰帖】${champ.name}應戰得勝，名聲 +${L.win.rep}。`); }
    else { s.rep = Math.max(0, (s.rep || 0) - L.lose.rep); md(champ, -L.lose.mood); log(s, `【挑戰帖】${champ.name}應戰落敗，名聲 -${L.lose.rep}（點到為止，無人受傷）。`); } } }
}
