// v0.9 武學骨架：每門武學各自熟練、五階、前置、悟性門檻、笨功夫倍率
import { ARTS, TIERS, WUXING_MUL, ART_GAIN, MOVES } from './data.mjs';
export const artById = (id) => ARTS.find((a) => a.id === id);
export const artOfMove = (mv) => ARTS.find((a) => a.tech === mv);
export const tierOf = (xp) => { let t = 0; for (let i = 0; i < TIERS.length; i++) if (xp >= TIERS[i][0]) t = i; return t; };
export const artTier = (d, id) => (d.arts?.[id] ? tierOf(d.arts[id].xp) : -1);
export const tierName = (t) => (t < 0 ? '未學' : TIERS[t][1]);
export const gated = (d, a) => (d.root ?? 3) < (a.wuxingMin || 0);
export function reqMissing(d, a) { return a.req.filter((r) => artTier(d, r.art) < r.tier).map((r) => `${artById(r.art).name}${TIERS[r.tier][1]}`); }
export function artState(d, a) {
  if (d.arts?.[a.id]) return { st: 'learned', tier: artTier(d, a.id), why: gated(d, a) ? `悟性不足（需 ${a.wuxingMin}），止於小成` : '' };
  if (d.pendingArt === a.id) return { st: 'pending', why: '可向師父求學' };
  const miss = reqMissing(d, a); if (miss.length) return { st: 'locked', why: `需${miss.join('、')}` };
  return { st: 'open', why: '條件已足，等師父有空' };
}
export function artMul(d, a) {
  const [basic, adv] = WUXING_MUL[d.root ?? 3] || [1, 1]; let m = a.grade <= 1 ? basic : adv;
  const p = d.personality || [];
  if (p.includes('honest')) m *= a.grade <= 1 ? ART_GAIN.honest[0] : ART_GAIN.honest[1];
  for (const [t, [tag, k]] of Object.entries(ART_GAIN.tagTrait)) if (p.includes(t) && a.tags.includes(tag)) m *= k;
  m *= 1 + ART_GAIN.reqBonus * a.req.length;
  if (gated(d, a)) m *= ART_GAIN.gated;
  return m;
}
export const artCap = (d, a) => (gated(d, a) ? ART_GAIN.gateCap : 100);
export function autoFocus(d) {
  const own = Object.keys(d.arts || {}).map(artById).filter((a) => a && d.arts[a.id].xp < artCap(d, a));
  const pref = own.filter((a) => a.school === d.style || a.school === 'fist');
  const pool = pref.length ? pref : own; if (!pool.length) return null;
  return pool.sort((a, b) => b.grade - a.grade || d.arts[a.id].xp - d.arts[b.id].xp)[0].id;
}
export const focusOf = (d) => (d.focus && d.arts?.[d.focus] ? d.focus : autoFocus(d));
// 只自動求學：主修系、拳、內功、身法，或前置含主修系的合擊武學
export const fits = (d, a) => ['fist', 'inner', 'step', d.style].includes(a.school) || a.req.some((r) => artById(r.art).school === d.style);
// 回傳新可求學的武學 id（若有）
export function gainArt(d, amt, mf = 1) {
  const id = focusOf(d); if (id) { const a = artById(id), r = d.arts[id]; r.xp = Math.min(artCap(d, a), r.xp + amt * ART_GAIN.base * artMul(d, a) * (1 - r.xp / 130) * mf); }
  if (d.pendingArt) return null;
  const next = ARTS.filter((a) => !d.arts[a.id] && !reqMissing(d, a).length && fits(d, a)).sort((a, b) => (b.school === d.style) - (a.school === d.style))[0]; if (next) { d.pendingArt = next.id; return next; }
  return null;
}
export function learnArt(d, id) { d.arts[id] ??= { xp: 0 }; const a = artById(id); if (a.tech && !d.moves.includes(a.tech)) d.moves.push(a.tech); if (d.pendingArt === id) d.pendingArt = null; return a; }
export const moveMul = (d, mvId) => { const a = artOfMove(mvId); return 1 + ART_GAIN.tierDmg * Math.max(0, a ? artTier(d, a.id) : 0); };
export const effectTier = (d, eff) => ARTS.filter((a) => a.effect === eff).reduce((m, a) => Math.max(m, artTier(d, a.id)), -1);
// 由舊招式／技能推出武學熟練（新建或舊檔）
export function seedArts(d) {
  d.arts ??= {}; const moves = d.moves || ['fist'];
  for (const mv of moves) { const a = artOfMove(mv); if (!a) continue; const m = MOVES.find((x) => x.id === mv); const base = Math.max(0, (d.skills?.[m.skill] || 0) - (mv === 'fist' ? 0 : m.req)); d.arts[a.id] ??= { xp: Math.min(artCap(d, a), mv === 'fist' ? Math.max(d.skills?.palm || 0, d.skills?.leg || 0) : base) }; }
  if (d.pendingMove) { const a = artOfMove(d.pendingMove); if (a && !d.arts[a.id]) d.pendingArt = a.id; }
  delete d.pendingMove; d.pendingArt ??= null; d.focus ??= null;
  // 舊檔的已學招式可能早於前置，補齊前置至需求階
  for (const id of Object.keys(d.arts)) for (const r of artById(id).req) { const need = TIERS[r.tier][0]; d.arts[r.art] ??= { xp: need }; if (d.arts[r.art].xp < need) d.arts[r.art].xp = need; }
  return d;
}
export function setFocus(s, id, art) { const d = s.ds.find((x) => x.id === id); if (!d) return false; d.focus = art && d.arts[art] ? art : null; return true; }
// 武學圖（SVG）：欄＝品階，列＝系
const ROW = { fist: 0, palm: 1, leg: 2, inner: 3, step: 4 };
export function artsSvg(d) {
  const W = 118, H = 40, X = (a) => 8 + (a.grade - 1) * (W + 34) + (a.id === 'fengLei' ? 0 : 0), Y = (a) => 8 + ROW[a.school] * (H + 10);
  const pos = (a) => (a.id === 'fengLei' ? [X(a), 8 + 1.5 * (H + 10)] : [X(a), Y(a)]);
  let lines = '', boxes = '';
  for (const a of ARTS) {
    const [x, y] = pos(a), st = artState(d, a);
    for (const r of a.req) { const b = artById(r.art), [bx, by] = pos(b), ok = artTier(d, b.id) >= r.tier; lines += `<line x1="${bx + W}" y1="${by + H / 2}" x2="${x}" y2="${y + H / 2}" stroke="${ok ? '#7a9a5a' : '#bbb'}" stroke-width="2" ${ok ? '' : 'stroke-dasharray="4 3"'}/>`; }
    const fill = { learned: '#e7f0dc', pending: '#f7e6a8', open: '#f2ecd8', locked: '#eee' }[st.st];
    const xp = d.arts?.[a.id]?.xp; const sub = st.st === 'learned' ? `${TIERS[st.tier][1]} ${xp.toFixed(1)}` : st.st === 'pending' ? '可求學' : st.st === 'open' ? '條件已足' : '鎖住';
    boxes += `<g data-art="${a.id}" class="art ${st.st}"><title>${a.name}（${'凡良精絕神'[a.grade - 1]}・${a.tags.join('')}${a.wuxingMin ? `・悟性≥${a.wuxingMin}` : ''}）${st.why ? '：' + st.why : ''}</title><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="5" fill="${fill}" stroke="${focusOf(d) === a.id ? '#b0482e' : '#998'}" stroke-width="${focusOf(d) === a.id ? 2.5 : 1}"/>`
      + `<text x="${x + 6}" y="${y + 16}" font-size="13">${a.name}${st.st === 'learned' && gated(d, a) ? ' ⛔' : ''}</text><text x="${x + 6}" y="${y + 32}" font-size="11" fill="#665">${sub}</text>`
      + (st.st === 'learned' ? `<rect x="${x + 70}" y="${y + 26}" width="${42}" height="6" fill="#ddd"/><rect x="${x + 70}" y="${y + 26}" width="${(42 * xp) / 100}" height="6" fill="#7a9a5a"/>` : '') + '</g>';
  }
  return `<svg viewBox="0 0 ${8 + 3 * (W + 34)} ${8 + 5 * (H + 10)}" width="100%" style="max-width:470px">${lines}${boxes}</svg>`;
}
