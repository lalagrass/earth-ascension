// v0.9 武學骨架：每門武學各自熟練、五階、前置、悟性門檻、笨功夫倍率
import { pipeline } from './mul.mjs';
import { ARTS, TIERS, WUXING_MUL, ART_GAIN, MOVES, PERKS, VARIANTS, BREAK, GUIZHEN, RUST } from './data.mjs';
export const artById = (id) => ARTS.find((a) => a.id === id);
export const artOfMove = (mv) => ARTS.find((a) => a.tech === mv || a.techs?.includes(mv));
export const tierOf = (xp) => { let t = 0; for (let i = 0; i < TIERS.length; i++) if (xp >= TIERS[i][0]) t = i; return t; };
export const artTier = (d, id) => (d.arts?.[id] ? tierOf(d.arts[id].xp) : -1);
export const tierName = (t) => (t < 0 ? '未學' : TIERS[t][1]);
export const gated = (d, a) => (d.wu ?? d.root ?? 3) < (a.wuxingMin || 0);
export function reqMissing(d, a) { return a.req.filter((r) => artTier(d, r.art) < r.tier).map((r) => `${artById(r.art).name}${TIERS[r.tier][1]}`); }
export function artState(d, a) {
  if (d.arts?.[a.id]) return { st: 'learned', tier: artTier(d, a.id), why: gated(d, a) ? `悟性不足（需 ${a.wuxingMin}），止於小成` : '' };
  if (d.pendingArt === a.id) return { st: 'pending', why: '可向師父求學' };
  const miss = reqMissing(d, a); if (miss.length) return { st: 'locked', why: `需${miss.join('、')}` };
  return { st: 'open', why: '條件已足，等師父有空' };
}
// 熟練倍率走統一管線：天賦（悟性、憨厚、灑脫/勤奮）＋外部（前置加成）；悟性門檻 ×0.3 是硬規則，管線外另乘
export function artMulParts(d, a, state = []) {
  const [basic, adv] = WUXING_MUL[d.wu ?? d.root ?? 3] || [1, 1], p = d.personality || [], talent = [['悟性', a.grade <= 1 ? basic : adv]];
  if (p.includes('honest')) talent.push(['憨厚', a.grade <= 1 ? ART_GAIN.honest[0] : ART_GAIN.honest[1]]);
  for (const [t, [tag, k]] of Object.entries(ART_GAIN.tagTrait)) if (p.includes(t) && a.tags.includes(tag)) talent.push([t === 'free' ? '灑脫' : '勤奮', k]);
  const ext = a.req.length ? [['前置', 1 + ART_GAIN.reqBonus * a.req.length]] : [];
  if (d.pairMul > 0) ext.push(['同門默契', 1 + d.pairMul]); // v0.96 郭靖＋黃蓉最多 +25%
  const r = pipeline({ talent, state, ext }); r.gate = gated(d, a) ? ART_GAIN.gated : 1; r.total *= r.gate; return r;
}
export const artMul = (d, a) => artMulParts(d, a).total;
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
export const guizhenOk = (d, a) => a.grade <= 1 && ((d.wu ?? d.root ?? 3) <= GUIZHEN.rootMax || GUIZHEN.traits.some((t) => (d.personality || []).includes(t)));
export const starCost = (r) => GUIZHEN.cost0 + GUIZHEN.costStep * (r.stars || 0);
// 目前上限：悟性門檻 → 54.9；未破第一關 → 54.9；未破第二關 → 99.9
export function curCap(d, a) { const r = d.arts[a.id]; if (gated(d, a)) return ART_GAIN.gateCap; if (!r.bt1) return BREAK.caps[0]; if (!r.bt2) return BREAK.caps[1]; return 100; }
// 卡在哪一關：1、2、3（歸真）；冷卻中或沒卡回 0
export function stuckAt(d, a, now = 0) {
  const r = d.arts?.[a.id]; if (!r || gated(d, a) || (r.btCd || 0) > now) return 0;
  if (!r.bt1 && r.xp >= BREAK.caps[0] - 1e-6) return 1; if (r.bt1 && !r.bt2 && r.xp >= BREAK.caps[1] - 1e-6) return 2;
  if (r.bt2 && !r.guizhen && guizhenOk(d, a)) return 3; return 0;
}
export const btReady = (d, now = 0) => ARTS.find((a) => stuckAt(d, a, now))?.id || null;
export function breakChance(d) { return Math.max(0.1, Math.min(0.9, BREAK.base + ((d.mood ?? 50) - 50) / 100 + ((d.wu ?? d.root ?? 3) - 3) * 0.08 + ((d.needs?.energy ?? 50) - BREAK.energyMin) / 200)); }
// 衝關結算：回傳 {ok, stage, art}
export function resolveBreak(d, id, now, roll) {
  const a = artById(id), r = d.arts[id], st = stuckAt(d, a, now); if (!st) return null;
  const ok = roll < breakChance(d); const res = { ok, stage: st, art: a };
  if (!ok) { r.btCd = now + BREAK.cooldown; return res; }
  if (st === 1) { r.bt1 = true; r.xp = 55; } else if (st === 2) { r.bt2 = true; r.xp = 100; } else { r.guizhen = true; r.stars = 0; r.sxp = 0; }
  res.newMoves = unlockTechs(d, a); return res;
}
export function unlockTechs(d, a) { const out = []; const t = artTier(d, a.id); (a.techs || []).forEach((m, k) => { if (k <= t && MOVES.find((x) => x.id === m) && !d.moves.includes(m)) { d.moves.push(m); out.push(m); } }); return out; }
export function rustOf(r, now) { const idle = now - (r.last ?? now); return Math.min(RUST.max, Math.max(r.rust || 0, idle > RUST.after ? ((idle - RUST.after) / 600) * RUST.perDay : 0)); }
// 回傳 {next 可求學武學, moves 新招}
export function gainArt(d, amt, mf = 1, now = 0) {
  const out = { next: null, moves: [], star: false };
  const id = focusOf(d);
  if (id) { const a = artById(id), r = d.arts[id]; r.rust = rustOf(r, now); r.last = now;
    const P = artMulParts(d, a, [['心情', mf], ['荒疏', 1 - r.rust]]); d.growMul = { art: id, total: P.total, talent: P.talent, state: P.state, ext: P.ext, gate: P.gate };
    const g = amt * ART_GAIN.base * P.total;
    r.rust = Math.max(0, r.rust - RUST.shake);
    if (r.guizhen) { r.sxp = (r.sxp || 0) + g * 0.4; while (r.sxp >= starCost(r)) { r.sxp -= starCost(r); r.stars = (r.stars || 0) + 1; out.star = true; } }
    else { r.xp = Math.min(curCap(d, a), r.xp + g * (1 - r.xp / 130)); out.moves = unlockTechs(d, a); } }
  if (!d.pendingArt) { const next = ARTS.filter((a) => !a.secret && !d.arts[a.id] && !reqMissing(d, a).length && fits(d, a)).sort((a, b) => (b.school === d.style) - (a.school === d.style))[0]; if (next) { d.pendingArt = next.id; out.next = next; } }
  return out;
}
export function chooseVariant(d, id, v, now = 0) {
  const r = d.arts?.[id], a = artById(id); if (!r || artTier(d, id) < 2 || !VARIANTS[a.school].some((x) => x.id === v)) return false;
  if (r.variant && r.variant !== v) r.until = now + BREAK.rechoose; r.variant = v; return true;
}
export const variantOf = (d, id, now = 0) => { const r = d.arts?.[id], a = artById(id); if (!r?.variant || (r.until || 0) > now) return null; return VARIANTS[a.school].find((x) => x.id === r.variant); };
export const cdMul = (d, mvId, now = 0) => { const a = artOfMove(mvId); if (!a || !d.arts?.[a.id]) return 1; const t = artTier(d, a.id); return (t >= 1 ? PERKS.small.cd : 1) * (variantOf(d, a.id, now)?.cd || 1); };
export const visTier = (d, mvId) => { const a = artOfMove(mvId); return a && d.arts?.[a.id] ? artTier(d, a.id) : 0; };
export const topTier = (d) => ARTS.reduce((m, a) => (artTier(d, a.id) > m.t ? { t: artTier(d, a.id), a } : m), { t: -1, a: null });
export function learnArt(d, id, now = 0) { d.arts[id] ??= { xp: 0, last: now }; const a = artById(id); unlockTechs(d, a); if (d.pendingArt === id) d.pendingArt = null; return a; }
export const moveMul = (d, mvId, now = 0) => { const a = artOfMove(mvId); if (!a || !d.arts?.[a.id]) return 1; const t = artTier(d, a.id), r = d.arts[a.id]; return (1 + ART_GAIN.tierDmg * t) * (t >= 3 ? PERKS.full.dmg : 1) * (variantOf(d, a.id, now)?.dmg || 1) * (1 + GUIZHEN.star * (r.stars || 0)); };
export const effectTier = (d, eff) => ARTS.filter((a) => a.effect === eff).reduce((m, a) => Math.max(m, artTier(d, a.id)), -1);
export const effectMul = (d, eff, now = 0) => ARTS.filter((a) => a.effect === eff && d.arts?.[a.id]).reduce((m, a) => m * (variantOf(d, a.id, now)?.eff || 1) * (artTier(d, a.id) >= 3 ? PERKS.full.dmg : 1), 1);
// 由舊招式／技能推出武學熟練（新建或舊檔）
export function seedArts(d) {
  d.arts ??= {}; const moves = d.moves || ['fist'];
  for (const mv of moves) { const a = artOfMove(mv); if (!a) continue; const m = MOVES.find((x) => x.id === mv); const base = Math.max(0, (d.skills?.[m.skill] || 0) - (mv === 'fist' ? 0 : m.req)); d.arts[a.id] ??= { xp: Math.min(artCap(d, a), mv === 'fist' ? Math.max(d.skills?.palm || 0, d.skills?.leg || 0) : base) }; }
  if (d.pendingMove) { const a = artOfMove(d.pendingMove); if (a && !d.arts[a.id]) d.pendingArt = a.id; }
  delete d.pendingMove; d.pendingArt ??= null; d.focus ??= null;
  for (const [id, r] of Object.entries(d.arts)) { r.bt1 ??= r.xp >= 55; r.bt2 ??= r.xp >= 100; if (!r.bt1 && r.xp > BREAK.caps[0]) r.xp = BREAK.caps[0]; if (r.bt1 && !r.bt2 && r.xp > BREAK.caps[1]) r.xp = BREAK.caps[1]; r.last ??= 0; r.rust ??= 0; }
  // 舊檔的已學招式可能早於前置，補齊前置至需求階
  for (const id of Object.keys(d.arts)) for (const r of artById(id).req) { const need = TIERS[r.tier][0]; d.arts[r.art] ??= { xp: need }; if (d.arts[r.art].xp < need) d.arts[r.art].xp = need; }
  for (const id of Object.keys(d.arts)) { const r = d.arts[id]; r.bt1 ??= r.xp >= 55; r.bt2 ??= r.xp >= 100; r.last ??= 0; r.rust ??= 0; unlockTechs(d, artById(id)); }
  return d;
}
export function setFocus(s, id, art) { const d = s.ds.find((x) => x.id === id); if (!d) return false; d.focus = art && d.arts[art] ? art : null; return true; }
// 武學圖（SVG）：欄＝品階，列＝系
const ROW = { fist: 0, palm: 1, leg: 2, inner: 3, step: 4 };
export function artsSvg(d) {
  const W = 118, H = 40, X = (a) => 8 + (a.grade - 1) * (W + 34) + (a.id === 'fengLei' ? 0 : 0), Y = (a) => 8 + ROW[a.school] * (H + 10);
  const pos = (a) => (a.id === 'rulai' ? [X(a), 8 + 4 * (H + 10)] : a.id === 'fengLei' ? [X(a), 8 + 1.5 * (H + 10)] : [X(a), Y(a)]);
  let lines = '', boxes = '';
  for (const a of ARTS) { if (a.secret && !d.arts?.[a.id]) continue;
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
