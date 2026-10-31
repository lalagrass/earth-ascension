import { ARTS, TIERS, ART_GAIN, sectBiasMul, WUXING_MUL, MOVES, PERKS, VARIANTS, BREAK, GUIZHEN, RUST } from './data.mjs';
import { strMul } from './economy.mjs';
import { pipeline } from './util.mjs';
// ==== （原 growth.mjs）====
/* loop78 成長分層（開關 s.grow）：成長門類 metadata、造詣單一結算入口、同類學習加速。
   造詣不另存門類值：造詣＝Σ 各武學紀錄 r.gm 的有界貢獻 × 門類權重（衍生值，不會與 skills.palm 漂移）。
   skills.palm／leg 是戰鬥能力值（劍招也吃 skills.palm），與造詣用途不同，不互相轉換。 */
/* 成長門類：sup = 'full' 已驗證造詣＋加速；'part' 只累積與顯示；'none' 尚未支援（不累積） */
export const CATS = {
  quanzhang: { name: '拳掌', sup: 'full' }, tuifa: { name: '腿法', sup: 'full' }, jianfa: { name: '劍法', sup: 'full' },
  neigong: { name: '內功', sup: 'part' }, shenfa: { name: '身法', sup: 'part' },
  gunbang: { name: '棍棒', sup: 'none' }, qimen: { name: '奇門', sup: 'none' }, zaxue: { name: '雜學', sup: 'none' },
  yishu: { name: '醫術', sup: 'none' }, dushu: { name: '毒術', sup: 'none' }, zhenfa: { name: '陣法', sup: 'none' },
};
export const CAT_ORDER = ['quanzhang', 'tuifa', 'jianfa', 'neigong', 'shenfa', 'gunbang', 'qimen', 'zaxue', 'yishu', 'dushu', 'zhenfa'];
/* 每門武學 → 成長門類權重（與戰鬥 school 分開；school=palm 的劍法、內功在此各歸其類） */
export const ART_CAT = {
  basicFist: { quanzhang: 1 }, pushPalm: { quanzhang: 1 }, wavePalm: { quanzhang: 1 }, fengLei: { quanzhang: 0.5, tuifa: 0.5 },
  sweepLeg: { tuifa: 1 }, whirlLeg: { tuifa: 1 }, tantui: { tuifa: 1 },
  breath: { neigong: 1 }, snowStep: { shenfa: 1 },
  rulai: { quanzhang: 1 }, xianglong: { quanzhang: 1 }, anran: { quanzhang: 1 }, kongming: { quanzhang: 1 }, taiji: { quanzhang: 1 }, tiexian: { quanzhang: 1 }, huagu: { quanzhang: 1 },
  bixie: { jianfa: 1 }, dugu: { jianfa: 1 }, xuantie: { jianfa: 1 },
  zixia: { neigong: 1 }, yunv: { neigong: 1 }, jiuyang: { neigong: 1 }, qiankun: { neigong: 1 }, hama: { neigong: 1 }, shihou: { neigong: 1 },
  dagou: { gunbang: 1 }, bagua: { gunbang: 1 }, kuihua: { qimen: 1 }, zuoyou: { zaxue: 1 },
};
export const GROW = {
  k: 0.05, /* 每單位原始修練投入 → 造詣 */
  src: { train: 1, fight: 0.3 }, /* 投入型來源權重 */
  pass: 0.6, /* 傳功（每對每門一次的鍵）固定造詣 */
  ms: [[1, 1], [2, 2], [4, 3]], /* 里程碑 [bit, 造詣]：自然練到小成、打坐破大成、打坐破化境 */
  cap: { 1: 20, 2: 35, 3: 55, 4: 75 }, /* 每門武學最多提供的造詣（依品階） */
  acc: { amp: 0.8, ref: 40, fade: 55, grade: { 1: 1, 2: 0.5 }, max: 1.8 },
  init: 0.15, /* 開局既有熟練 → 造詣（一次，標 init） */
  dr: 0.03, /* loop122 投入型造詣邊際遞減：Δ ÷ (1 + 主門類造詣 × dr)；只在 d.gdr */
};
export const LEVELS = [[0, '未窺門徑'], [5, '初窺門徑'], [20, '略有小成'], [40, '融會貫通'], [60, '爐火純青'], [80, '登峰造極']];
export const levelOf = (v) => LEVELS.reduce((m, [t, n]) => (v >= t ? n : m), LEVELS[0][1]);
const artBy = (id) => ARTS.find((a) => a.id === id);
const cats = (id) => Object.entries(ART_CAT[id] || {}).filter(([c]) => CATS[c].sup !== 'none');
export const primaryCat = (id) => Object.entries(ART_CAT[id] || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
const contrib = (id, r) => (r?.gm ? Math.min(GROW.cap[artBy(id).grade] || 20, r.gm.e) : 0);
/* 門類造詣（衍生）；skip＝排除某門武學自己的貢獻 */
export function mastery(d, cat, skip = null) {
  let v = 0; for (const [id, r] of Object.entries(d.arts || {})) { if (id === skip) continue; const w = ART_CAT[id]?.[cat]; if (w && CATS[cat].sup !== 'none') v += contrib(id, r) * w; }
  return Math.min(100, v);
}
/* 同類學習加速：用結算前的「他門」同類造詣；凡／良品、熟練未到 fade 才有 */
export function accelOf(d, a, xp) {
  const c = primaryCat(a.id), g = GROW.acc.grade[a.grade] || 0; if (!c || CATS[c].sup !== 'full' || !g) return { mul: 1, cat: c, base: 0 };
  const base = mastery(d, c, a.id), f = Math.max(0, 1 - xp / GROW.acc.fade);
  return { mul: Math.min(GROW.acc.max, 1 + GROW.acc.amp * Math.min(1, base / GROW.acc.ref) * g * f), cat: c, base };
}
/* 單一結算入口：所有造詣變動只經此處。ctx = { src:'train'|'fight'|'pass'|'break', raw, xp0, xp1, stage }
   回傳本次造詣增量 { [cat]: Δ }。練滿／卡瓶頸（xp 沒動）不給投入型造詣；里程碑以 bit 記，只領一次。 */
export function settleGrowth(d, a, r, ctx) {
  if (!cats(a.id).length) return {};
  r.gm ??= { e: 0, ms: 0 }; const cap = GROW.cap[a.grade] || 20, before = Object.fromEntries(cats(a.id).map(([c]) => [c, mastery(d, c)]));
  let add = 0;
  if (ctx.src === 'train' || ctx.src === 'fight') { if ((ctx.xp1 ?? 0) > (ctx.xp0 ?? 0) + 1e-9 && ctx.raw > 0) add += ctx.raw * GROW.k * GROW.src[ctx.src] / (d.gdr ? 1 + (before[primaryCat(a.id)] ?? 0) * GROW.dr : 1); if ((ctx.xp0 ?? 0) < 25 && (ctx.xp1 ?? 0) >= 25 && !(r.gm.ms & 1)) { r.gm.ms |= 1; add += GROW.ms[0][1]; } }
  else if (ctx.src === 'pass') add += GROW.pass;
  else if (ctx.src === 'break') { const [bit, v] = GROW.ms[ctx.stage] || []; if (bit && !(r.gm.ms & bit)) { r.gm.ms |= bit; add += v; } }
  r.gm.e = Math.min(cap, r.gm.e + add);
  const out = {}; for (const [c] of cats(a.id)) { const dv = mastery(d, c) - before[c]; if (dv > 0) out[c] = dv; }
  return out;
}
/* 開局一次：既有熟練折算造詣（標 init，不是新修練成果；已有 gm 的不動 → 重複呼叫冪等） */
/* 每人一次（開局或入門後第一次結算前）：入門時已有的武學折算；d.gInit 標記後不再折算 */
export function growEnsure(d) {
  if (d.gInit) return d; d.gInit = true;
  for (const [id, r] of Object.entries(d.arts || {})) { const a = artBy(id); if (!a || r.gm || !cats(id).length) continue; r.gm = { e: Math.min(GROW.cap[a.grade] || 20, r.xp * GROW.init), ms: r.xp >= 25 ? 1 : 0, init: true }; }
  return d;
}
export function growInit(s) { for (const d of s.ds || []) growEnsure(d); return s; }

// ==== （原 prof.mjs）====
/* loop90 熟練度十重（概念取自暴走英雄壇「每級線性加傷害」，不抄碼）：每個武學階段（入門／小成／大成／圓滿）切成十重，化境不分重。
   效果只有一項：該武學招式威力每重 +PROF.perLv（階內補間；到下一階重歸一重，淨增仍為正）。和造詣（原始投入→同類加速）輸入輸出都不同，不重複計算。 */
export const PROF = { lvs: 10, perLv: ART_GAIN.tierDmg / 20, cn: ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'] };
// xp → { t 階, name, lv 1–10（化境 0）, lo, hi, stuck 卡瓶頸 }
export function profOf(xp) {
  let t = 0; for (let k = 0; k < TIERS.length; k++) if (xp >= TIERS[k][0]) t = k;
  const name = TIERS[t][1]; if (t === TIERS.length - 1) return { t, name, lv: 0, lo: TIERS[t][0], hi: TIERS[t][0], stuck: false };
  const lo = TIERS[t][0], hi = TIERS[t + 1][0], lv = Math.min(PROF.lvs, Math.floor(((xp - lo) / (hi - lo)) * PROF.lvs) + 1);
  return { t, name, lv, lo, hi, stuck: hi - xp <= 0.1 + 1e-9 && (hi === 55 || hi === 100) };
}
export const profMul = (xp) => { const p = profOf(xp); return 1 + PROF.perLv * Math.max(0, p.lv - 1); };
export const profLabel = (xp) => { const p = profOf(xp); return p.lv ? `${p.name}${PROF.cn[p.lv]}重${p.stuck ? '（瓶頸）' : ''}` : p.name; };
// 下一重門檻 xp（化境回 null）
export const nextLvXp = (xp) => { const p = profOf(xp); if (!p.lv) return null; return p.lv < PROF.lvs ? p.lo + ((p.hi - p.lo) * p.lv) / PROF.lvs : p.hi; };

// ==== （原 arts.mjs）====
// v0.9 武學骨架：每門武學各自熟練、五階、前置、悟性門檻、笨功夫倍率
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
export function artMulParts(d, a, state = [], more = []) {
  const [basic, adv] = WUXING_MUL[d.wu ?? d.root ?? 3] || [1, 1], p = d.personality || [], talent = [['悟性', a.grade <= 1 ? basic : adv]];
  if (p.includes('honest')) talent.push(['憨厚', a.grade <= 1 ? ART_GAIN.honest[0] : ART_GAIN.honest[1]]);
  for (const [t, [tag, k]] of Object.entries(ART_GAIN.tagTrait)) if (p.includes(t) && a.tags.includes(tag)) talent.push([t === 'free' ? '灑脫' : '勤奮', k]);
  const ext = a.req.length ? [['前置', 1 + ART_GAIN.reqBonus * a.req.length]] : [];
  if (d.pairMul > 0) ext.push(['同門默契', 1 + d.pairMul]);
  const [bm, om] = sectBiasMul(d, a); if (bm !== 1) talent.push(['門派偏向', bm]); if ((d.sgain || 1) !== 1) ext.push(['鎮派設施', d.sgain]); if (d.lineArts?.includes(a.id)) ext.push(['師承', 1.2]); ext.push(...more); // v1.4 // v1.35 // v0.96 郭靖＋黃蓉最多 +25%
  const r = pipeline({ talent, state, ext }); r.gate = gated(d, a) ? ART_GAIN.gated : 1; r.total *= r.gate; r.outside = om; r.total *= om; return r; // v1.35 外門 ×0.7 是真乘數
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
/* g（loop79 成長分層，s.grow 時才傳）＝ { raw 原始投入, src 'train'|'fight' }：同類加速以結算前造詣計，造詣只吃原始投入 */
export function gainArt(d, amt, mf = 1, now = 0, g = null) {
  const out = { next: null, moves: [], star: false };
  const id = focusOf(d);
  if (id) { const a = artById(id), r = d.arts[id]; r.rust = rustOf(r, now); r.last = now; const xp0 = r.xp;
    const acc = g && !r.guizhen ? accelOf(d, a, r.xp) : null; out.acc = acc;
    const P = artMulParts(d, a, [['心情', mf], ['荒疏', 1 - r.rust]], acc && acc.mul > 1 ? [['同類底子', acc.mul]] : []); d.growMul = { art: id, total: P.total, talent: P.talent, state: P.state, ext: P.ext, gate: P.gate };
    const gx = amt * ART_GAIN.base * P.total;
    r.rust = Math.max(0, r.rust - RUST.shake);
    if (r.guizhen) { r.sxp = (r.sxp || 0) + gx * 0.4; while (r.sxp >= starCost(r)) { r.sxp -= starCost(r); r.stars = (r.stars || 0) + 1; out.star = true; } }
    else { r.xp = Math.min(curCap(d, a), r.xp + gx * (1 - r.xp / 130)); out.moves = unlockTechs(d, a); }
    if (g) out.gm = settleGrowth(d, a, r, { src: g.src || 'train', raw: g.raw ?? amt, xp0, xp1: r.xp }); }
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
export const moveMul = (d, mvId, now = 0) => strMul(d) * moveMul0(d, mvId, now); // loop127 勞作練體
const moveMul0 = (d, mvId, now = 0) => { const a = artOfMove(mvId); if (!a || !d.arts?.[a.id]) return (d.powMul || 1) * (d.jhMul || 1); const t = artTier(d, a.id), r = d.arts[a.id]; return (d.early?.art === a.id ? d.early.mul : 1) * (d.powMul || 1) * (d.jhMul || 1) * (1 + ART_GAIN.tierDmg * t) * (t >= 3 ? PERKS.full.dmg : 1) * (variantOf(d, a.id, now)?.dmg || 1) * (1 + GUIZHEN.star * (r.stars || 0)) * (d.pf ? profMul(r.xp) : 1) /* loop91 熟練度十重（d.pf 由 s.prof 設） */; };
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
const SCH = { fist: '拳', palm: '掌', leg: '腿', inner: '內功', step: '身法' };
const clip = (w, n) => (w.length > n ? w.slice(0, n - 1) + '…' : w);
// v1.8 A7 領悟線索透明：每門未學武學列出「還差什麼」；秘傳武學以剪影＋取得方式呈現（不再只是看不見）
export function artHints(d, nameOf = (k) => k) {
  const rows = [];
  for (const a of ARTS) { if (d.arts?.[a.id]) continue;
    if (a.secret) { rows.push({ id: a.id, name: '？？？', secret: true, need: [a.hint || (a.signature ? `名俠${nameOf(a.signature)}的個人絕學：他上山入門（或以他開局）才會出現` : '機緣未明')] }); continue; }
    const need = a.req.filter((r) => artTier(d, r.art) < r.tier).map((r) => `${artById(r.art).name}練到${TIERS[r.tier][1]}（現在${tierName(artTier(d, r.art))}）`);
    if (!fits(d, a)) need.push(`要走${SCH[a.school] || a.school}路數（目前專精${SCH[d.style] || '無'}）`);
    if (a.wuxingMin && (d.wu ?? d.root ?? 3) < a.wuxingMin) need.push(`悟性 ≥${a.wuxingMin}，否則止於小成`);
    rows.push({ id: a.id, name: a.name, secret: false, ready: !a.req.some((r) => artTier(d, r.art) < r.tier) && fits(d, a), need: need.length ? need : ['條件已足，等師父有空傳授'] }); }
  return rows;
}
export function artHintsHtml(d, nameOf) { const R = artHints(d, nameOf); if (!R.length) return ''; return `<div class="art-hints"><b>領悟線索</b>${R.map((r) => `<div class="k art-hint${r.secret ? ' secret' : ''}" data-hint="${r.id}">${r.secret ? '🔒 ' : r.ready ? '✅ ' : '⬜ '}${r.name}：${r.need.join('；')}</div>`).join('')}</div>`; }
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
    const xp = d.arts?.[a.id]?.xp; const sub = st.st === 'learned' ? `${TIERS[st.tier][1]} ${xp.toFixed(1)}` : st.st === 'pending' ? '可求學' : st.st === 'open' ? (fits(d, a) ? '條件已足' : '非本門路數') : clip(st.why, 9); // v1.8 A7：鎖住也直接寫出缺什麼
    boxes += `<g data-art="${a.id}" class="art ${st.st}"><title>${a.name}（${'凡良精絕神'[a.grade - 1]}・${a.tags.join('')}${a.wuxingMin ? `・悟性≥${a.wuxingMin}` : ''}）${st.why ? '：' + st.why : ''}</title><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="5" fill="${fill}" stroke="${focusOf(d) === a.id ? '#b0482e' : '#998'}" stroke-width="${focusOf(d) === a.id ? 2.5 : 1}"/>`
      + `<text x="${x + 6}" y="${y + 16}" font-size="13">${a.name}${st.st === 'learned' && gated(d, a) ? ' ⛔' : ''}</text><text x="${x + 6}" y="${y + 32}" font-size="11" fill="#665">${sub}</text>`
      + (st.st === 'learned' ? `<rect x="${x + 70}" y="${y + 26}" width="${42}" height="6" fill="#ddd"/><rect x="${x + 70}" y="${y + 26}" width="${(42 * xp) / 100}" height="6" fill="#7a9a5a"/>` : '') + '</g>';
  }
  return `<svg viewBox="0 0 ${8 + 3 * (W + 34)} ${8 + 5 * (H + 10)}" width="100%" style="max-width:470px">${lines}${boxes}</svg>`;
}

// ==== （原 breakthru.mjs）====
// loop25 突破排程（選用，s.bt25）：卡在瓶頸且可衝關時，打坐分數不低於最高練功分數×BT25.k。
// 診斷：人多後主角升首徒（練功×1.5），練功 ~130 壓過打坐 75，武學卡 55；並非座位不足（座位滿 0%）。
export const BT25 = { k: 1.1 };
export function btBoost(s, out) {
  if (!s.bt25) return; const m = out.find((o) => o.act === 'meditate' && o.f?.btOk); if (!m) return;
  const tr = Math.max(0, ...out.filter((o) => o.act === 'train').map((o) => o.score)); if (m.score < tr * BT25.k) m.score = tr * BT25.k;
}

// ==== （原 comprehend.mjs）====
// loop7 M7 領悟（天下霸圖味）：自練有機會自悟下一門功夫；切磋時觀摩對手會的功夫、跨門派也能偷師。
// 只在 s.wu7 開啟時生效（golden 不變）。不用亂數，悟性決定速度。
export const COMP = {
  gain: { train: 4, meditate: 6, spar: 3 }, // 每完成一次活動的領悟值
  watch: 10,                                   // 切磋時觀摩對手一門功夫
  wuMul: [0, 0.4, 0.7, 1, 1.4, 1.8],          // 悟性 1–5
  need: (a) => 60 + 40 * (a.grade || 0),      // 門檻：品階越高越難悟
  vneed: 80,                                  // loop16 變式領悟門檻（大成後、未選變式的功夫）
};
const wm = (d) => COMP.wuMul[Math.max(1, Math.min(5, d.wu ?? d.root ?? 3))];
const open = (d, a) => a && !a.secret && !d.arts?.[a.id] && !reqMissing(d, a).length;
export function compProgress(d) { return Object.entries(d.comp || {}).map(([id, v]) => ({ id, name: artById(id)?.name, v, need: COMP.need(artById(id)) })); }
function add(s, d, id, amt, how, think, log) {
  const a = artById(id); if (!open(d, a)) return null;
  (d.comp ??= {}); d.comp[id] = (d.comp[id] || 0) + amt * wm(d);
  if (d.comp[id] < COMP.need(a)) return null;
  delete d.comp[id]; learnArt(d, id, s.t); (s.compN ??= { self: 0, watch: 0 })[how === 'watch' ? 'watch' : 'self']++; think(s, d, 'epiphany', `（${a.name}）`);
  log(s, how === 'watch' ? `${d.name}看多了別人使「${a.name}」，竟自己悟了出來！` : `${d.name}苦練之間豁然開朗，自悟「${a.name}」！`);
  return a;
}
// 自悟目標：等師父教的那門優先；否則本門派可學的下一門，再不然任一門可學的
export function selfTarget(d) { if (d.pendingArt) return d.pendingArt; const c = ARTS.filter((a) => open(d, a)); return (c.find((a) => a.school === d.style) || c[0])?.id || null; }
// 活動完成時呼叫
export function comprehend(s, d, act, partner, think, log) {
  if (!s.wu7 || !COMP.gain[act]) return null;
  const tgt = selfTarget(d); let got = tgt ? add(s, d, tgt, COMP.gain[act], 'self', think, log) : null;
  if (act === 'spar' && partner) { const seen = ARTS.find((a) => partner.arts?.[a.id] && open(d, a)); if (seen) got = add(s, d, seen.id, COMP.watch, 'watch', think, log) || got; }
  return got;
}

// loop16 變式領悟：大成（tier≥2）且玩家尚未選變式的功夫，練著練著自己悟出變式；切磋時對手已有變式則觀摩學他那路。
// 不覆蓋玩家選擇；無亂數：自悟走「根骨≥悟性→剛（gang）否則→靈（ling）」。
const vOpen = (d, id) => d.arts?.[id] && !d.arts[id].variant && artTier(d, id) >= 2;
export const vLean = (d) => ((d.root ?? 3) >= (d.wu ?? 3) ? 'gang' : 'ling');
function vAdd(s, d, id, v, amt, how, think, log) {
  const r = d.arts[id]; (r.vc ??= {}); r.vc[v] = (r.vc[v] || 0) + amt * wm(d); if (r.vc[v] < COMP.vneed) return null;
  delete r.vc; if (!chooseVariant(d, id, v, s.t)) return null; const a = artById(id), vn = VARIANTS[a.school].find((x) => x.id === v).name;
  (s.compN ??= { self: 0, watch: 0 }); s.compN.variant = (s.compN.variant || 0) + 1; if (how === 'watch') s.compN.vwatch = (s.compN.vwatch || 0) + 1;
  think(s, d, 'epiphany', `（${a.name}・${vn}）`); log(s, how === 'watch' ? `${d.name}看${'對手'}使「${a.name}」的${vn}路數，心有所得，也練成了這一路！` : `${d.name}把「${a.name}」練到極熟，自己悟出了${vn}的變化！`);
  return { id, v };
}
export function comprehendVariant(s, d, act, partner, think, log) {
  if (!s.wu7 || !COMP.gain[act]) return null; let got = null;
  if (act === 'spar' && partner) { const id = Object.keys(d.arts || {}).find((k) => vOpen(d, k) && partner.arts?.[k]?.variant && !(partner.arts[k].until > s.t)); if (id) got = vAdd(s, d, id, partner.arts[id].variant, COMP.watch, 'watch', think, log); }
  if (!got) { const id = Object.keys(d.arts || {}).filter((k) => vOpen(d, k)).sort((a, b) => d.arts[b].xp - d.arts[a].xp)[0]; if (id) got = vAdd(s, d, id, vLean(d), COMP.gain[act], 'self', think, log); }
  return got;
}

// ==== （原 readwu.mjs）====
/* loop140 讀書長悟性 `readwu`（決定 120；借鏡大俠立志傳「悟性靠讀書」，只做最小版）。
   s.readwu 開時，每完成一次「藏經閣研讀」記一次；累積 READWU.need 次悟性 +1（每人一生一次、不超過 5）。 */
export const READWU = { need: 30, max: 5 };
export function readStudy(s, d) { if (!s?.readwu || d.rwDone) return null;
  d.rw = (d.rw || 0) + 1; if (d.rw < READWU.need) return null;
  d.rwDone = true; const w0 = d.wu ?? d.root ?? 3; if (w0 >= READWU.max) return null; d.wu = w0 + 1; return d.wu; }
export const readwuNote = (s, d) => (!s?.readwu ? '' : d.rwDone ? '（讀書已開竅）' : `（研讀 ${d.rw || 0}/${READWU.need}）`);

// ==== （原 neigong.mjs）====
/* loop102 最小內功（概念取自《下一站江湖》心法養內力、《逸劍風雲決》心法支撐修為，不抄碼）。
   只存目前內力 d.qi；上限由已學內功武學的階衍生、不存。不吃造詣、不吃十重：紫霞層數已決定其 xp，只看階，不另加。 */
// loop142（v2.2）：一版內功（狩獵運勁、運功療傷、20＋15×階的上限）已淘汰，護體真氣是唯一實作；NG 只留回復與衝關參數
export const NG = { med: 12, rest: 0.2, btCost: 20, btBonus: 0.1 };
export const isInner = (a) => a.school === 'inner' || !!ART_CAT[a.id]?.neigong;
export const INNER = ARTS.filter(isInner).map((a) => a.id);
export const innerArts = (d) => INNER.filter((id) => d.arts?.[id]);
export const qiMax = (d) => qiMax2(d);
export const qiOf = (d) => Math.min(d.qi ?? 0, qiMax(d));
export function addQi(d, amt) { d.qi = Math.max(0, Math.min(qiMax(d), (d.qi ?? 0) + amt)); return d.qi; }
// 夠就扣並回 true；不夠不扣
export function spendQi(d, cost) { if (!d.ng || qiOf(d) < cost) return false; d.qi = qiOf(d) - cost; return true; }

/* loop114 二版「護體真氣」（docs/NEIGONG-REWORK.md §3）。d.ng2 由 sim 依 s.ngshield 設定。
   概念：靈氣護盾（了不起的修仙模擬器）、內力吸收傷害（俠客風雲傳北冥神功）。不抄碼。 */
export const NG2 = { cap: [10, 25, 45, 70, 100], mit: [0.02, 0.05, 0.08, 0.12, 0.16], mitCap: 0.3, total: 200, spentT: 20, spentMul: 1.15, powK: 0.2, dpsK: 0.01, guard: 15, guardHp: 40 };
export function qiMax2(d) { let v = 0; for (const id of innerArts(d)) v += NG2.cap[artTier(d, id)] ?? 0; return Math.min(NG2.total, v); }
export function mitOf(d) { let v = 0; for (const id of innerArts(d)) v += NG2.mit[artTier(d, id)] ?? 0; return Math.min(NG2.mitCap, v); }
// 受擊：先減傷、再由內力吸收，餘下回傳要扣的生命。力竭中受傷加重。now = 遊戲秒。
export function shieldHit(d, dmg, now = 0) {
  if (!d.ng2) return dmg;
  if (!(dmg > 0)) return 0; /* loop123 反例：負／零傷害不得加內力或觸發力竭 */
  let x = dmg * ((d.spentUntil ?? -1) > now ? NG2.spentMul : 1);
  const q = qiOf(d);
  if (q <= 0) return x;
  x *= 1 - mitOf(d);
  const ab = Math.min(q, x); d.qi = q - ab; x -= ab;
  if (d.qi <= 0 && !tenthOf(d)) d.spentUntil = now + NG2.spentT;
  return x;
}
export const shieldOn = (d) => !!d.ng2 && qiOf(d) > 0;
// loop117 抽象戰鬥：門派戰力加成、守柵出手加成、重傷時護體（夠內力就扣內力、改成輕傷）
export const powBonus = (d) => (d.ng2 ? NG2.powK * qiMax2(d) : 0);
export const dpsBonus = (d) => (d.ng2 ? NG2.dpsK * qiMax2(d) : 0);
export function guardHurt(d, hurtHp) { if (!d.ng2 || qiOf(d) < NG2.guard) return hurtHp; d.qi = qiOf(d) - NG2.guard; return Math.max(hurtHp, NG2.guardHp); }
// loop121 十重質變（只一項、不重複加數值）：任一內功練到圓滿十重（需熟練度十重）或化境 →「真氣綿長」：內力打空也不力竭
export const tenthOf = (d) => innerArts(d).some((id) => { const t = artTier(d, id); if (t >= 4) return true; const p = profOf(d.arts[id].xp || 0); return !!d.pf && t === 3 && p.lv === 10; });
