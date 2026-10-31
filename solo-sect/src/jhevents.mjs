import { seedMix } from './seedmix.mjs';
// loop23 江湖事件（選用，s.jhev）：過路高人指點、挑戰帖。獨立亂數流，不擾動主亂數；golden 不變。
import { power } from './jianghu.mjs';
import { autoFocus, artById, curCap, learnArt, reqMissing, fits } from './arts.mjs';
import { ARTS, MOVES } from './data.mjs';
import { resAdd } from './util.mjs';
import { log } from './util.mjs';
export const JHEV = { master: { p: 0.12, after: 4, cool: 6, xp: 8, mood: 5, teach: 0.3 }, letter: { p: 0.08, after: 8, cool: 9, base: 75, grow: 30, win: { rep: 6, mood: 6, coin: 10, xp: 5 }, lose: { rep: 2, mood: 8 }, refuse: { below: 0.3, rep: 1 } } };
const R = (s) => { const E = s.jhev; E.rng = ((E.rng || seedMix(s.seed || 1, 7919)) * 16807) % 2147483647; return E.rng / 2147483647; };
const here = (s) => s.ds.filter((d) => !d.away && d.role !== 'laborer' && d.hp > 30);
const md = (d, v) => { d.mood = Math.max(0, Math.min(100, d.mood + v)); };
export const letterP = (s, day) => { const pow = power(s), pts = JHEV.letter.base * (1 + day / JHEV.letter.grow); return Math.max(0.15, Math.min(0.85, pow / (pow + pts))); };
export function jhevDaily(s) {
  const E = (s.jhev = typeof s.jhev === 'object' ? s.jhev : { m: 0, l: 0, lw: 0, mNext: 0, lNext: 0 }), day = s.day, M = JHEV.master, L = JHEV.letter;
  if (day >= M.after && day >= E.mNext && R(s) < M.p) { const c = here(s).filter((d) => autoFocus(d)); const d = c[Math.floor(R(s) * c.length)];
    if (d) { E.m++; E.mNext = day + M.cool; const teach = R(s) < M.teach; /* 傳功骰先擲，亂數流與舊版相同 */
      /* loop59「高人指點誰由我定」（s.masterask）：勾了「重大抉擇問我」時，改成抉擇卡：高人看中的人＋最多兩位在山上的同門，玩家挑一位 */
      if (s.masterask && s.hero?.askMajor && s.choices) { const alt = [d, ...c.filter((x) => x !== d)].slice(0, 3); s.choices.push({ id: `jhm-${day}-${Math.floor(s.t)}`, mvisit: true, who: alt.map((x) => x.id), teach, title: '【過路高人】雲遊高人借宿一晚', text: `高人願意指點一人。他看中了${d.name}，也可以請他改指點別人。`, opts: alt.map((x, k) => `${x.name}（${artById(autoFocus(x)).name}）${k ? '' : '・高人看中'}`) }); }
      else masterOutcome(s, d, teach); } }
  if (day >= L.after && day >= E.lNext && R(s) < L.p) { const c = here(s); if (c.length) { const champ = c.sort((a, b) => (b.skills?.[b.style] || 0) - (a.skills?.[a.style] || 0))[0], p = letterP(s, day), win = R(s) < p; E.lNext = day + L.cool;
    // loop40「量力而為」（s.jhrefuse）：勝算 < refuse.below 時婉拒，名聲 −1、無人心情受損。勝負骰照擲，亂數流與未開時一致。
    /* loop49「挑戰帖由我定奪」（s.letterask）：玩家選了「重大抉擇問我」時，改成抉擇卡（應戰／婉拒），勝負骰已擲好、卡上只顯示勝算。 */
    if (s.letterask && s.hero?.askMajor && s.choices) { s.choices.push({ id: `jhl-${day}-${Math.floor(s.t)}`, letter: true, who: champ.id, p, win, title: '【挑戰帖】有人上山下帖', text: `一位江湖客指名要與${champ.name}切磋（點到為止，不會受傷）。看來勝算約 ${Math.round(p * 100)}%。`, opts: ['應戰', `婉拒（名聲 -${L.refuse.rep}）`], at: s.t }); log(s, `【挑戰帖】有人指名${champ.name}切磋，等掌門定奪。`); return; }
    if (s.jhrefuse && p < L.refuse.below) return letterOutcome(s, champ, win, true);
    letterOutcome(s, champ, win, false); } }
}
export function masterOutcome(s, d, teach) { const E = s.jhev, M = JHEV.master; const id = autoFocus(d), a = artById(id), r = d.arts[id]; r.xp = Math.min(curCap(d, a), r.xp + M.xp); md(d, M.mood); log(s, `【過路高人】一位雲遊高人借宿一晚，指點了${d.name}的「${a.name}」幾招。`);
      if (teach) { const ok = ARTS.filter((x) => !x.secret && !d.arts[x.id] && !reqMissing(d, x).length && fits(d, x)), nx = (s.mfit && ok.find((x) => x.school === d.style)) || ok[0]; /* loop41「因材施教」（s.mfit）：優先傳本門路數 */ if (nx) { learnArt(d, nx.id, s.t); if (d.pendingArt === nx.id) d.pendingArt = null; E.t = (E.t || 0) + 1; if (nx.school === d.style) E.ts = (E.ts || 0) + 1; log(s, `【過路高人】臨別前，高人傳了${d.name}一套「${nx.name}」！`); }
        else if (s.mpool && (() => { /* loop55「殘譜指點」（s.mpool）：無武學可傳時，挑一套合路數、只差前置的武學，替已會的前置武學加 2 倍指點經驗 */
          const tg = ARTS.filter((x) => !x.secret && !d.arts[x.id] && fits(d, x) && reqMissing(d, x).length).flatMap((x) => x.req.filter((q) => d.arts[q.art] && reqMissing(d, { req: [q] }).length).map((q) => [x, artById(q.art)])).sort((a, b) => (b[0].school === d.style) - (a[0].school === d.style))[0];
          if (!tg) return false; const [x, a] = tg, r = d.arts[a.id], before = r.xp; r.xp = Math.min(curCap(d, a), r.xp + 2 * M.xp); if (r.xp === before) return false;
          E.pg = (E.pg || 0) + 1; log(s, `【過路高人】臨別前，高人留下一頁殘譜，講解「${a.name}」的要訣（往「${x.name}」的路）。`); return true; })()) { /* 已處理 */ }
        else { const mv = Object.keys(d.arts).map(artById).flatMap((x) => (x.techs || []).filter((m) => MOVES.some((y) => y.id === m) && !d.moves.includes(m)))[0]; if (mv) { d.moves.push(mv); E.mv = (E.mv || 0) + 1; log(s, `【過路高人】臨別前，高人提前點撥${d.name}一招「${MOVES.find((y) => y.id === mv).name}」！`); } } } } /* loop26 傳武學，無可傳則提前點撥一招 */
export function masterResolve(s, ch, i) { s.choices = s.choices.filter((c) => c !== ch); const d = s.ds.find((x) => x.id === ch.who[i] && !x.away) || s.ds.find((x) => x.id === ch.who[0] && !x.away); if (!d || !autoFocus(d)) { log(s, '【過路高人】要指點的人不在山上，高人留下一句「後會有期」就走了。'); return true; } masterOutcome(s, d, ch.teach); return true; }
export function letterOutcome(s, champ, win, refuse) { const E = s.jhev, L = JHEV.letter;
  if (refuse) { E.lr = (E.lr || 0) + 1; s.rep = Math.max(0, (s.rep || 0) - L.refuse.rep); log(s, refuse === 'player' ? `【挑戰帖】掌門決定婉拒，${champ.name}客氣地送走來客，名聲 -${L.refuse.rep}。` : `【挑戰帖】來者武功明顯高出一截，${champ.name}代師門婉拒，名聲 -${L.refuse.rep}。`); return; }
  E.l++;
  if (win) { E.lw++; s.rep = (s.rep || 0) + L.win.rep; md(champ, L.win.mood); resAdd(s, 'coin', L.win.coin); const fid = autoFocus(champ); if (fid) { const r = champ.arts[fid]; r.xp = Math.min(curCap(champ, artById(fid)), r.xp + L.win.xp); } log(s, `【挑戰帖】${champ.name}應戰得勝，名聲 +${L.win.rep}、彩頭 ${L.win.coin} 文。`); }
    else { s.rep = Math.max(0, (s.rep || 0) - L.lose.rep); md(champ, -L.lose.mood); log(s, `【挑戰帖】${champ.name}應戰落敗，名聲 -${L.lose.rep}（點到為止，無人受傷）。`); }
}
export function letterResolve(s, ch, i) { s.choices = s.choices.filter((c) => c !== ch); const champ = s.ds.find((d) => d.id === ch.who); if (!champ) { log(s, '【挑戰帖】應戰的人不在山上，帖子作罷。'); return true; } letterOutcome(s, champ, ch.win, i === 1 ? 'player' : false); return true; }
