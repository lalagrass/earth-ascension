import {opponents,allies,loadFromForecast,coverFor,movementSpeed,distance,stepTactic} from './tactics.mjs';
import {RING} from './combat-space.mjs';
import {TECHNIQUES,TECHNIQUE_MOVES,learnFromLoss,applyTechnique,matchesTechnique} from './techniques.mjs';
import {selectAction,recordChoice,desireTraining,witnessExchange} from './decision.mjs';
import { PRACTICE, familiarReaction, practiceWindow, recordExchange } from './practice.mjs';
import { bodyMove, moveAvailable, BODY_TIMING, FOE_ACTIONS, foeAction } from './starter-combat.mjs';
import { SECTS, ARTS, TIERS, ART_GAIN, sectBiasMul, WUXING_MUL, MOVES, PERKS, VARIANTS, BREAK, GUIZHEN, RUST, TRAITS } from './data.mjs';
import { stampCard, curveMulOf, BRANCHES } from './artcard.mjs';
import { strMul } from './economy.mjs';
import { pipeline, log, chronOf } from './util.mjs';
// ==== （原 growth.mjs）====
/* loop78 成長分層（開關 s.grow）：成長門類 metadata、造詣單一結算入口、同類學習加速。
   造詣不另存門類值：造詣＝Σ 各武學紀錄 r.gm 的有界貢獻 × 門類權重（衍生值，不會與 skills.palm 漂移）。
   skills.palm／leg 是戰鬥能力值（劍招也吃 skills.palm），與造詣用途不同，不互相轉換。 */
/* 成長門類：sup = 'full' 已驗證造詣＋加速；'part' 只累積與顯示；'none' 尚未支援（不累積） */
export const CATS = {
  quanzhang: { name: '拳掌', sup: 'full' }, tuifa: { name: '腿法', sup: 'full' }, jianfa: { name: '劍法', sup: 'full' },
  neigong: { name: '內功', sup: 'part' }, shenfa: { name: '身法', sup: 'part' },
  gunbang: { name: '棍棒', sup: 'none', sup23: 'part' }, qimen: { name: '奇門', sup: 'none', sup23: 'part' }, zaxue: { name: '雜學', sup: 'none', sup23: 'part' },
  yishu: { name: '醫術', sup: 'none', sup23: 'part' }, dushu: { name: '毒術', sup: 'none', sup23: 'part' }, zhenfa: { name: '陣法', sup: 'none', sup23: 'part' },
};
/* loop150 v2.3：六門專長門類只在 v2.3 新局（d.v23）啟用為 part；CATS 是全域表，直接改 sup 會改動舊局與舊 golden（決定 146） */
/* loop198：v24 把內功、身法、棍棒升為 full，才吃同類加速與實戰。不改 CATS.sup。 */
const FULL24 = ['neigong', 'shenfa', 'gunbang'];
export const supOf = (c, d) => (!!d && FULL24.includes(c) ? 'full' : ((!!d && CATS[c].sup23) || CATS[c].sup));
export const CAT_ORDER = ['quanzhang', 'tuifa', 'jianfa', 'neigong', 'shenfa', 'gunbang', 'qimen', 'zaxue', 'yishu', 'dushu', 'zhenfa'];
/* loop209：門類權重寫在各武學的 cats。這裡只留同一份物件，normalizeArts 填進來。 */
export const ART_CAT = {};
export const GROW = {
  k: 0.05, /* 每單位原始修練投入 → 造詣 */
  src: { train: 1, fight: 0.3 }, /* 投入型來源權重 */
  pass: 0.6, /* 傳功（每對每門一次的鍵）固定造詣 */
  ms: [[1, 1], [2, 2], [4, 3]], /* 里程碑 [bit, 造詣]：自然練到小成、打坐破大成、打坐破化境 */
  cap: { 1: 20, 2: 35, 3: 55, 4: 75 }, /* 沒寫 growCap 的武學沿用這張表。出手不讀它 */
  acc: { amp: 0.8, ref: 40, fade: 55, grade: { 1: 1, 2: 0.5 }, max: 1.8 },
  init: 0.15, /* 開局既有熟練 → 造詣（一次，標 init） */
  dr: 0.03, /* loop122 投入型造詣邊際遞減：Δ ÷ (1 + 主門類造詣 × dr)；只在 d.gdr */
};
export const LEVELS = [[0, '未窺門徑'], [5, '初窺門徑'], [20, '略有小成'], [40, '融會貫通'], [60, '爐火純青'], [80, '登峰造極']];
export const levelOf = (v) => LEVELS.reduce((m, [t, n]) => (v >= t ? n : m), LEVELS[0][1]);
const artBy = (id) => ARTS.find((a) => a.id === id);
const cats = (id, d) => Object.entries(ART_CAT[id] || {}).filter(([c]) => supOf(c, d) !== 'none');
export const primaryCat = (id) => Object.entries(ART_CAT[id] || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
/* #403：造詣上限跟武學走。沒蓋章的沿用品階表，避免造詣變成第二條威力梯子。 */
export const growCapOf = (a) => a?.growCap || GROW.cap[a?.grade] || 20;
const contrib = (id, r) => (r?.gm ? Math.min(growCapOf(artBy(id)), r.gm.e) : 0);
/* 門類造詣（衍生）；skip＝排除某門武學自己的貢獻 */
export function mastery(d, cat, skip = null) {
  let v = 0; for (const [id, r] of Object.entries(d.arts || {})) { if (id === skip) continue; const w = ART_CAT[id]?.[cat]; if (w && supOf(cat, d) !== 'none') v += contrib(id, r) * w; }
  return Math.min(100, v);
}
/* 同類學習加速：用結算前的「他門」同類造詣；凡／良品、熟練未到 fade 才有 */
export function accelOf(d, a, xp) {
  const c = primaryCat(a.id), g = !!d && a.grade === 3 ? 0.35 : (GROW.acc.grade[a.grade] || 0); if (!c || supOf(c, d) !== 'full' || !g) return { mul: 1, cat: c, base: 0 }; /* loop198：v24 的三品神功吃 0.35 權重的同類底子 */
  const base = mastery(d, c, a.id), f = Math.max(0, 1 - xp / GROW.acc.fade);
  return { mul: Math.min(GROW.acc.max, 1 + GROW.acc.amp * Math.min(1, base / GROW.acc.ref) * g * f), cat: c, base };
}
/* 單一結算入口：所有造詣變動只經此處。ctx = { src:'train'|'fight'|'pass'|'break', raw, xp0, xp1, stage }
   回傳本次造詣增量 { [cat]: Δ }。練滿／卡瓶頸（xp 沒動）不給投入型造詣；里程碑以 bit 記，只領一次。 */
export function settleGrowth(d, a, r, ctx) {
  if (!cats(a.id, d).length) return {};
  r.gm ??= { e: 0, ms: 0 }; const cap = growCapOf(a), before = Object.fromEntries(cats(a.id, d).map(([c]) => [c, mastery(d, c)]));
  let add = 0;
  if (ctx.src === 'train' || ctx.src === 'fight') { if ((ctx.xp1 ?? 0) > (ctx.xp0 ?? 0) + 1e-9 && ctx.raw > 0) add += ctx.raw * GROW.k * GROW.src[ctx.src] / (d.gdr ? 1 + (before[primaryCat(a.id)] ?? 0) * GROW.dr : 1); if ((ctx.xp0 ?? 0) < 25 && (ctx.xp1 ?? 0) >= 25 && !(r.gm.ms & 1)) { r.gm.ms |= 1; add += GROW.ms[0][1]; } }
  else if (ctx.src === 'pass') add += GROW.pass;
  else if (ctx.src === 'break') { const [bit, v] = GROW.ms[ctx.stage] || []; if (bit && !(r.gm.ms & bit)) { r.gm.ms |= bit; add += v; } }
  r.gm.e = Math.min(cap, r.gm.e + add);
  const out = {}; for (const [c] of cats(a.id, d)) { const dv = mastery(d, c) - before[c]; if (dv > 0) out[c] = dv; }
  return out;
}
/* 開局一次：既有熟練折算造詣（標 init，不是新修練成果；已有 gm 的不動 → 重複呼叫冪等） */
/* 每人一次（開局或入門後第一次結算前）：入門時已有的武學折算；d.gInit 標記後不再折算 */
export function growEnsure(d) {
  if (d.gInit) return d; d.gInit = true;
  for (const [id, r] of Object.entries(d.arts || {})) { const a = artBy(id); if (!a || r.gm || !cats(id, d).length) continue; r.gm = { e: Math.min(growCapOf(a), r.xp * GROW.init), ms: r.xp >= 25 ? 1 : 0, init: true }; }
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
/* loop160：v2.4 新武學只對 v2.4 新局的人開放（舊局、舊存檔看不到） */
export const artOk = (d, a) => !a?.v24 || !!d;
/* loop164 v2.4 Batch 4.3 本門傳承鎖：他派專屬（名門 classic、非名俠招牌、在某派 tree 而不在本門 d.stree）預設不可自悟／自選；
   【宗師觸類旁通】該武學主門類造詣 ≥ LOCK24.master 時解鎖他派 grade ≤2 武學。 */
export const LOCK24 = { master: 40, maxGrade: 2 };
export const WUMING24 = { master: 38, maxGrade: 2 }; /* loop176 */
const inSomeTree = (id) => Object.values(SECTS).some((S) => S.tree.includes(id) || S.tree24?.includes(id));
export const ownArt24 = (d, a) => !!(d?.stree && d.stree.includes(a.id));
/* loop171 v2.6 鎮派絕學位階鎖（chiefOnly24）：本門 chiefOnly24 絕學只有掌門（hero）、首徒（role head）或山門大比魁首（chief24）可自悟／求學／受傳；已會者不收回 */
export const CHIEF24_WHY = '需掌門或首徒（大比魁首）位階方能修習';
export const rankOk24 = (d) => !!d && (d.id === 'hero' || d.role === 'head' || !!d.chief24);
export const chiefLocked24 = (d, a) => !!(!!d && a?.chiefOnly24 && ownArt24(d, a) && !d.arts?.[a.id] && !rankOk24(d));
/* loop191：v24 古墓門人可修小龍女招牌《玉女心經》，不必本人在場 */
export const yunvOpen24 = (d, a) => !!(a?.id === 'yunv' && !!d && d.sectId === 'gumu');
export function lockedArt24(d, a) {
  if (yunvOpen24(d, a)) return false;
  if (chiefLocked24(d, a)) return true;
  if (!d || !a || !a.classic || a.signature || ownArt24(d, a) || (d.sectId === 'wuming' && !a.own24)) return false; /* loop168 門派專屬（own24）無名派也鎖 */
  if (a.own24 && d.sectId === 'wuming' && a.own24 !== 'ban' && a.grade <= WUMING24.maxGrade && mastery(d, primaryCat(a.id)) >= WUMING24.master) return false; /* loop176 t192 待決 1A：無名派宗師觸類旁通 */
  if (a.own24) return true; /* loop168 門派專屬不吃觸類旁通（量測：拳掌造詣 ≥40 太常見，他派專屬會滿門外流），只能偷師取得 */
  if (!inSomeTree(a.id)) return false;
  const c = primaryCat(a.id); return !(c && a.grade <= LOCK24.maxGrade && mastery(d, c) >= LOCK24.master);
}
/* loop168 本門特許領悟（SECTS[k].unlock24）：如武當樹內的太極拳（名俠招牌、secret）可由武當長拳大成領悟 */
export const sectUnlock24 = (d) => { const U = !!d && SECTS[d.sectId]?.unlock24; return U ? Object.entries(U).filter(([id, req]) => !d.arts?.[id] && artById(id) && !chiefLocked24(d, artById(id)) && req.every((r) => artTier(d, r.art) >= r.tier)).map(([id]) => artById(id)) : []; };
export const ownFirst24 = (d) => (x, y) => (!!d ? ownArt24(d, y) - ownArt24(d, x) : 0);
export function artOfMove(mv) {
  const id = typeof mv === 'string' ? mv : mv?.id;
  const hit = ARTS.find((a) => a.tech === id || a.techs?.includes(id));
  if (hit) return hit;
  const fx = MOVES.find((m) => m.id === id)?.fx;
  return (fx && artById(fx)) || undefined;
}
export const tierOf = (xp) => { let t = 0; for (let i = 0; i < TIERS.length; i++) if (xp >= TIERS[i][0]) t = i; return t; };
export const artTier = (d, id) => (d.arts?.[id] ? tierOf(d.arts[id].xp) : -1);
export const tierName = (t) => (t < 0 ? '未學' : TIERS[t][1]);
export const gated = (d, a) => (d.wu ?? d.root ?? 3) < (a.wuxingMin || 0);
/* #409 拜師關卡：進高階前，這一門列出的基本功都要到指定火候。沒寫到的門派不擋。 */
export function elderMiss(d, a) {
  const rows = a?.elder?.[d?.sectId];
  if (!rows?.length) return [];
  return rows.filter((r) => artTier(d, r.art) < r.tier).map((r) => `${artById(r.art).name}${TIERS[r.tier][1]}`);
}
export function reqMissing(d, a) {
  if (!a) return [];
  const alt = a.alt24 && !!d && a.alt24.every((r) => artTier(d, r.art) >= r.tier); /* 太極劍：太極拳大成亦可（以拳通劍）。關卡仍要過。 */
  const base = alt ? [] : (a.req || []).filter((r) => artTier(d, r.art) < r.tier).map((r) => `${artById(r.art).name}${TIERS[r.tier][1]}`);
  return [...base, ...elderMiss(d, a)];
}
/* #409 臨濟十二莊：五個火候開 1、2、3、5、6 莊。效果在後一步，這裡只開名稱。 */
export function zhuangOpen(d, a = artById('linjiZhuang')) {
  if (!a?.zhuang || artTier(d, a.id) < 0) return [];
  const n = a.zhuangAt?.[artTier(d, a.id)] ?? 0;
  return a.zhuang.slice(0, n);
}
/* #409 落英神劍掌：解謎之後自己練，不進師父傳授。 */
export function ponderLuoying(d) {
  if (!d || d.sectId !== 'taohua' || d.luoyingClue || artTier(d, 'biboXinfa') < 1) return false;
  d.luoyingClue = true;
  return true;
}
export function practiceLuoying(d, now = 0) {
  if (!d?.luoyingClue || d.arts?.luoyingPalm) return false;
  learnArt(d, 'luoyingPalm', now);
  return true;
}
export function artState(d, a) {
  if (d.arts?.[a.id]) return { st: 'learned', tier: artTier(d, a.id), why: gated(d, a) ? `悟性不足（需 ${a.wuxingMin}），止於小成` : '' };
  if (d.pendingArt === a.id) return { st: 'pending', why: '可向師父求學' };
  if (chiefLocked24(d, a)) return { st: 'locked', why: CHIEF24_WHY }; /* loop171 */
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
  if (!!d && isInner(a) && dao31(d)) ext.push(['以技入道', 1.35]); /* loop202：外功造詣 ≥50 才加快修內功 */
  const [bm, om] = sectBiasMul(d, a); if (bm !== 1) talent.push(['門派偏向', bm]); if ((d.sgain || 1) !== 1) ext.push(['鎮派設施', d.sgain]); { const gt = GRADE_TRAIN24[a.grade || 1]; if (gt !== 1) ext.push(['品階難度', gt]); { const rt = rootTrain28(d, a); if (rt > 1) ext.push([baseInner28(d)?.id === 'breath' ? '築基渾厚' : '根基', rt]); } if (d.champ28) ext.push(['大比首徒', CHAMP28.train]); { const T = temperOf(d), taste = tasteLabel31(d, a); if (T.ling && taste?.[0] !== '投其所好' && (a.tags.includes('巧') || a.tags.includes('快') || (a.grade || 1) >= 2)) ext.push(['靈動跳階', TEMPER29.lingK]); if (T.qing) ext.push(['至情清修', TEMPER29.qingK]); if (taste) ext.push(taste); } const L = sectLine24(d, a); if (L) ext.push(L); const pm = polymath24(d); if (pm === 1) ext.push(['雜學分心', SYN24.distract]); else if (pm === 2) ext.push(['博覽群書', SYN24.wide]); } /* loop171 v2.6；loop203 偏好只留一個標籤，且不與靈動跳階疊「投其所好」 */ ext.push(...more); // v1.4 // v1.35 // v0.96 郭靖＋黃蓉最多 +25%
  const r = pipeline({ talent, state, ext }); r.gate = gated(d, a) ? ART_GAIN.gated : 1; r.total *= r.gate; r.outside = om; r.total *= om; return r; // v1.35 外門 ×0.7 是真乘數
}
export const artMul = (d, a) => artMulParts(d, a).total;
export const artCap = (d, a) => (gated(d, a) ? ART_GAIN.gateCap : 100);
const hasMove24 = (a) => !!(a?.tech && MOVES.some((m) => m.id === a.tech));
/* loop196：百毒譜等無招式圖譜不進主修，避免 autoFocus 空轉 */
export function autoFocus(d) {
  const own = Object.keys(d.arts || {}).map(artById).filter((a) => a && d.arts[a.id].xp < artCap(d, a) && (isInner(a) || a.school === 'step' || hasMove24(a)));
  const pref = own.filter((a) => a.school === d.style || a.school === 'fist');
  const pool = pref.length ? pref : own; if (!pool.length) return null;
  const sectish = (a) => (own28(d, a) || !!d.stree?.includes(a.id)) ? 1 : 0; /* loop193：本門／本門樹優先於外門 */
  const byDefault = (a, b) => sectish(b) - sectish(a) || (b.grade || 1) - (a.grade || 1) || d.arts[a.id].xp - d.arts[b.id].xp;
  const dflt = () => [...pool].sort(byDefault)[0].id;
  { const T = temperOf(d); /* loop187 v2.9 四種練武習性 */
    if (T.zheng) { /* loop193：先有一門外功小成能守山門。loop203：坐不住不得插在這一步前面 */
      const combat = (a) => !isInner(a) && a.school !== 'step';
      const armed = Object.keys(d.arts).some((id) => { const a = artById(id); return a && combat(a) && artTier(d, id) >= 1; });
      if (!armed) { const c = own.filter((a) => combat(a) && artTier(d, a.id) < 1); if (c.length) return [...c].sort((a, b) => sectish(b) - sectish(a) || (a.grade || 1) - (b.grade || 1) || d.arts[b.id].xp - d.arts[a.id].xp)[0].id; } }
    const Ap = appetite31(d); /* 舊檔沒有 bore31 視作 0。門檻 6−|A| */
    if (Ap && (d.bore31 || 0) >= 6 - Math.abs(Ap)) {
      const pick = Ap > 0 ? own.filter((a) => a.mode === 'da') : own.filter((a) => a.mode === 'base' || a.mode === 'lian' || (a.school === 'inner' && own28(d, a)));
      if (pick.length) return [...pick].sort(byDefault)[0].id; }
    if (T.zheng) { const b = baseInner28(d); if (b && d.arts[b.id] && d.arts[b.id].xp < ROOT28.baseXp && d.arts[b.id].xp < artCap(d, b)) { d.base28 = true; return b.id; } }
    if (T.xiao) { const f = own.filter((a) => !isInner(a) && (a.grade || 1) >= 2 && !PUBLIC28.includes(a.id) && (BAN28.includes(a.id) || (!own28(d, a) && (a.own24 || a.classic)))).sort((a, b) => (b.grade || 1) - (a.grade || 1) || d.arts[b.id].xp - d.arts[a.id].xp)[0]; if (f) { d.xiao29 = true; return f.id; } }
    if (T.ling) { const f = [...own].sort((a, b) => (b.grade || 1) - (a.grade || 1) || d.arts[b.id].xp - d.arts[a.id].xp)[0]; if (f) { if (f.id !== dflt()) d.ling29 = true; return f.id; } } }
  const pick = [...pool].sort(byDefault)[0];
  if (pick && isInner(pick)) { const fav = preferInner29(d); if (fav && pool.some((a) => a.id === fav)) return fav; }
  return pick.id;
}
/* #405 性格挑內功。只在已經會的內功裡排，不另開一套人格，也不繞過掌門鎖。 */
export function preferInner29(d) {
  if (!d?.arts) return null;
  const T = temperOf(d);
  const pool = Object.keys(d.arts).map(artById).filter((a) => a && isInner(a) && (d.arts[a.id].xp || 0) < artCap(d, a));
  if (!pool.length) return null;
  const byXp = (a, b) => (d.arts[b.id].xp || 0) - (d.arts[a.id].xp || 0);
  if (T.xiao) {
    const bad = pool.filter((a) => a.id === 'huagongDafa' || BAN28.includes(a.id) || (a.grade || 1) >= 3);
    if (bad.length) return [...bad].sort((a, b) => (a.id === 'huagongDafa' ? -1 : 0) - (b.id === 'huagongDafa' ? -1 : 0) || (b.grade || 1) - (a.grade || 1) || byXp(a, b))[0].id;
  }
  if (T.qing) {
    const soft = pool.filter((a) => a.id === 'zixia' || a.id === 'breath' || attrOf(a) === 'he');
    if (soft.length) return [...soft].sort((a, b) => (a.id === 'zixia' ? -1 : 0) - (b.id === 'zixia' ? -1 : 0) || (a.grade || 1) - (b.grade || 1))[0].id;
  }
  if (T.zheng) { const b = baseInner28(d); if (b && pool.some((a) => a.id === b.id)) return b.id; }
  if (T.ling) return [...pool].sort((a, b) => (b.grade || 1) - (a.grade || 1) || byXp(a, b))[0].id;
  return [...pool].sort((a, b) => (a.grade || 1) - (b.grade || 1) || byXp(a, b))[0].id;
}
export const focusOf = (d) => (d.task?.teach && d.teachArt && d.arts?.[d.teachArt] ? d.teachArt : d.focus && d.arts?.[d.focus] ? d.focus : autoFocus(d));
// 只自動求學：主修系、拳、內功、身法，或前置含主修系的合擊武學
export const fits = (d, a) => ['fist', 'inner', 'step', d.style].includes(a.school) || a.req.some((r) => artById(r.art).school === d.style) || yunvOpen24(d, a);
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
export const BREAK_ODDS = { midpoint: 0.5, steepness: 4, moodScale: 100, energyScale: 200, wuStep: 0.08 };
export function breakChance(d) { const B = BREAK_ODDS, score = (d.medK24 || 1) * (BREAK.base + ((d.mood ?? 50) - 50) / B.moodScale + ((d.wu ?? d.root ?? 3) - 3) * B.wuStep + ((d.needs?.energy ?? 50) - BREAK.energyMin) / B.energyScale); return 1 / (1 + Math.exp(-B.steepness * (score - B.midpoint))); }
/* #414 N11：大成突破自動依性格挑選分路 */
export function autoBranch(d, artId) {
  const br = BRANCHES[artId];
  if (!br) return null;
  const p = d.personality || [];
  if (p.includes('bold') || p.includes('brave') || p.includes('diligent')) return 'A';
  if (p.includes('gentle') || p.includes('clever') || p.includes('nimble')) return 'B';
  return 'A';
}

/* #414 N11：玩家選分路。大成突破當下先依性格自動選（branchAuto），玩家可隨時改；
   改選已生效的分路要重練 BREAK.rechoose（半日），期間分路不生效。 */
export function rechooseBranch(d, artId, newBranch, now = 0) {
  const r = d.arts?.[artId];
  if (!r || !r.bt1) return { ok: false, why: '尚未大成，無法選取高階分路' };
  if (!BRANCHES[artId]?.[newBranch]) return { ok: false, why: '沒有這條分路' };
  if (r.branch === newBranch) { r.branchAuto = false; return { ok: true, branch: r.branch }; }
  const firstPick = !r.branch || r.branchAuto && !(r.branchSince != null && now - r.branchSince > BREAK.rechoose);
  r.branch = newBranch; r.branchAuto = false;
  if (!firstPick) r.branchUntil = now + BREAK.rechoose;
  return { ok: true, branch: r.branch, wait: firstPick ? 0 : BREAK.rechoose };
}

// 衝關結算：回傳 {ok, stage, art}
export function resolveBreak(d, id, now, roll) {
  const a = artById(id), r = d.arts[id], st = stuckAt(d, a, now); if (!st) return null;
  const ok = roll < breakChance(d); const res = { ok, stage: st, art: a };
  if (!ok) { r.btCd = now + BREAK.cooldown; return res; }
  if (st === 1) {
    r.bt1 = true;
    r.xp = 55;
    if (BRANCHES[id] && !r.branch) { r.branch = autoBranch(d, id); r.branchAuto = true; r.branchSince = now; }
  } else if (st === 2) {
    r.bt2 = true;
    r.xp = 100;
  } else {
    r.guizhen = true;
    r.stars = 0;
    r.sxp = 0;
  }
  res.newMoves = unlockTechs(d, a); return res;
}
/* #403：有絕招表、且不是觀破式的武學，大成／圓滿／化境各開一招。獨孤仍走觀破，不在這裡發招。
   #408：已經傳過的招寫在 r.taught，不再受火候擋住。自己練上去的仍然看火候。 */
export function unlockTechs(d, a) {
  const out = []; const t = artTier(d, a.id);
  const taught = new Set(d.arts?.[a.id]?.taught || []);
  if (a.specials?.length && !a.forms) {
    for (const sp of a.specials) if ((t >= sp.tier || taught.has(sp.move)) && MOVES.find((x) => x.id === sp.move) && !d.moves.includes(sp.move)) { d.moves.push(sp.move); out.push(sp.move); }
    return out;
  }
  (a.techs || []).forEach((m, k) => { if (k <= t && MOVES.find((x) => x.id === m) && !d.moves.includes(m)) { d.moves.push(m); out.push(m); } });
  return out;
}
export function openSpecials(d, a) {
  const art = typeof a === 'string' ? artById(a) : a;
  if (!art?.specials || artTier(d, art.id) < 0) return [];
  const t = artTier(d, art.id);
  return art.specials.filter((sp) => t >= sp.tier);
}
/* #404 出手事件。六門絕活寫在武學的 on 上，不靠武學 id 分支。
   事件：hit 打中、block 格開、dodge 讓過、crit 打重、gethit 挨打、kill 擊倒。
   看破式（forms）的「不擋」要已經看破至少一式，跟舊的獨孤不格擋同一條件。 */
export const ART_ON_EVENTS = ['hit', 'block', 'dodge', 'crit', 'gethit', 'kill'];
const artIdOfMove = (mv) => {
  const id = mv?.id || mv;
  if (!id) return null;
  if (MOVES.find((m) => m.id === id)?.fx === 'dugu') return 'dugu';
  return artOfMove(id)?.id || null;
};
const onFx = (a, key) => Object.values(a?.on || {}).find((fx) => fx && fx[key]);
export function artNoParry(d) {
  if (!d) return false;
  for (const a of ARTS) {
    const fx = onFx(a, 'noParry');
    if (!fx) continue;
    if (fx.seen || a.forms) { if (!(d.dugu?.length)) continue; }
    else if (!d.arts?.[a.id]) continue;
    const tier = d.arts?.[a.id] ? artTier(d, a.id) : 0;
    if (tier < (fx.need ?? 0)) continue;
    return true;
  }
  return false;
}
export const LAST_SPECIAL_FX = new WeakMap();

export function applyArtOn(s, event, who, other, ctx = {}) {
  const out = { power: ctx.power, dmg: ctx.dmg, knock: 0, trip: 0, reflect: 0, see: false, noParry: false, selfHp: 0, fired: null, line: '', breakParry: false, disturb: 0, breakGuard: false, shift: 0 };
  if (!who || !ART_ON_EVENTS.includes(event)) return out;
  const only = ctx.move ? artIdOfMove(ctx.move) : null;
  if (ctx.move && !only) return out;
  const ids = only ? [only] : Object.keys(who.arts || {});
  if (!only && who.dugu?.length && !ids.includes('dugu')) ids.push('dugu');
  for (const id of ids) {
    const a = artById(id);
    let fx = a?.on?.[event];
    if (!fx) continue;
    if (!who.arts?.[id] && !(a.forms && who.dugu?.length)) continue;
    const tier = who.arts?.[id] ? artTier(who, id) : 0;
    if (tier < (fx.need ?? 0)) continue;
    if (fx.seen && !(who.dugu?.length)) continue;
    if (fx.first && other?.onOpened) continue;
    /* #414 N11：高階分路覆寫/合併 */
    const brKey = who.arts?.[id]?.branch, brWait = (who.arts?.[id]?.branchUntil || 0) > (s?.t ?? 0);
    if (brKey && !brWait && BRANCHES[id]?.[brKey]?.[event]) {
      fx = { ...fx, ...BRANCHES[id][brKey][event] };
    }
    const skip = ctx.map ? ZJ_SKIP[id] : null;
    if (skip && Object.keys(fx).filter((k) => !['need', 'seen', 'first', 'log', 'fx'].includes(k)).every((k) => skip.includes(k))) continue;
    if (fx.charge) { /* #410 蓄勢：氣血沒見底就不耗內力 */
      if ((who.hp ?? 100) >= (fx.hpBelow ?? 50)) continue;
      const max = qiMax(who);
      if (max > 0 && qiOf(who) < max * (fx.qiKeep ?? 0.5)) { out.dry = true; continue; }
    }
    if (fx.qi && !spendQi(who, fx.qi)) { out.dry = true; continue; } /* #406 內力不夠：只記原因，傷害維持原樣 */
    if (fx.first && other) other.onOpened = true;
    /* 心情只記身份。黯然的輕重在 jhMul，這裡再乘會算兩次。 */
    /* 分路的 dmg 是分路自己的取捨（黯然：心死只在低落時、懷念任何心情），與 jhMul 的心情輕重分開算。 */
    if (fx.dmg && out.power != null && (fx.moodBelow == null || (who.mood ?? 50) < fx.moodBelow)) out.power *= fx.dmg;
    if (fx.flurry && out.power != null) out.power *= fx.flurry;
    if (fx.knock) out.knock = fx.knock;
    if (fx.trip) out.trip = fx.trip;
    if (fx.reflect && !skip?.includes('reflect')) out.reflect = fx.reflect;
    if (fx.see && !skip?.includes('see')) out.see = true;
    if (fx.noParry && !skip?.includes('noParry')) out.noParry = true;
    if (fx.breakParry && !skip?.includes('breakParry')) out.breakParry = true;
    if (fx.disturb) out.disturb = fx.disturb;
    if (fx.breakGuard) out.breakGuard = true;
    if (fx.shift && out.dmg != null) { out.shift = fx.shift; out.dmg *= 1 - fx.shift; }
    if (fx.selfHp) { who.hp = Math.max(0, (who.hp ?? 0) - fx.selfHp); out.selfHp = fx.selfHp; }
    if (fx.xia && who.values) who.values.xia = Math.max(-50, Math.min(50, (who.values.xia || 0) + fx.xia));
    const line = `${who.name}${fx.log}`;
    out.fired = { art: id, event, log: line };
    out.line = line;
    if (s && !ctx.silent) log(s, line, 'mid');

    /* #413 N10：地圖浮字與特效（限地圖戰鬥，巡山抽象戰鬥不推） */
    if (s && Array.isArray(s.fx) && fx.fx && Array.isArray(who?.pos) && Array.isArray(other?.pos) && !who.away) {
      const now = s.t || 0;
      const last = LAST_SPECIAL_FX.get(who) ?? -999;
      if (now - last >= 1.5) {
        LAST_SPECIAL_FX.set(who, now);
        s.fx.push({
          kind: 'special',
          word: fx.fx.word,
          color: fx.fx.color,
          special: fx.fx.kind,
          pos: [...who.pos],
          to: [...other.pos],
          ttl: 1.0,
          maxTtl: 1.0,
        });
      }
    }
    break;
  }
  return out;
}
/* #406 一句話，不列係數，也不改傷害。招名裡會讓戰報暫停的字不寫進這句。 */
const BLOW = {
  xianglong: ['三頓飯換來的降龍', '打中會震退，很耗內力'],
  dugu: ['崖上請教換來的劍意', '看破來勢，自己不擋'],
  bixie: ['自宮換來的快劍', '先手連刺，很耗內力'],
  taijiSword: ['本門劍一路練上去', '挨打時把來力反震回去'],
  qishangFist: ['明教一路練上去的拳', '打實了自己也傷'],
  dagou: ['丐幫傳下來的棒法', '纏住對手的腳'],
  xuantie: ['斷臂換來的重劍', '壓開對手的招架'],
  anran: ['心情換來的掌', '心緒越沉，掌力越重'],
  hama: ['蓄起的掌力', '氣血見底才反擊'],
  qiankun: ['秘道裡學來的挪移', '挨打時把來力挪開並反震'],
  jiuyinClaw: ['陰損的爪功', '抓破護體，自己的俠義也傷'],
  yuxiaoSword: ['島上的簫', '簫聲擾了對手的節奏'],
  rulai: ['破道館覺醒的神掌', '萬佛朝宗自天而降，震退對手'],
  tantui: ['市井苦力隱藏的腿法', '先手起腿，踢亂下盤'],
  tiexian: ['裁縫鋪深藏的硬氣功', '雙臂鐵環沉雄，破開招架'],
  bagua: ['大雜院傳下的楊家棍法', '長兵壓陣，逼退對手'],
};
const BOUT = {
  xianglong: '這一陣打得開，是因為降龍震退。',
  dugu: '這一陣占了上風，是因為看破來勢，自己不擋。',
  bixie: '這一陣占了上風，是因為快劍連刺。',
  taijiSword: '挨打時把來力反震了回去。',
  qishangFist: '拳打實了，自己也受傷。',
  dagou: '棒法纏住了對手的腳。',
  xuantie: '重劍壓開了對手的招架。',
  anran: '心緒越沉，掌力越重。',
  hama: '氣血見底，蓄起的掌力反擊出去。',
  qiankun: '來力被挪開，餘勢反震了回去。',
  jiuyinClaw: '爪勁透進護體，自己的俠義也傷了。',
  yuxiaoSword: '簫聲擾了對手的節奏。',
  rulai: '如來神掌自天而降，掌力震退了對手。',
  tantui: '十二路譚腿先發制人，踢亂了對手下盤。',
  tiexian: '鐵線拳雙臂硬進，破開了對手的招架。',
  bagua: '五郎八卦棍長兵壓陣，逼退了對手。',
};
const BLOW_ORDER = ['xianglong', 'dugu', 'bixie', 'taijiSword', 'qishangFist', 'dagou', 'xuantie', 'anran', 'hama', 'qiankun', 'jiuyinClaw', 'yuxiaoSword', 'rulai', 'tantui', 'tiexian', 'bagua'];
function readyBlows(d) {
  const out = [];
  for (const id of BLOW_ORDER) {
    const a = artById(id);
    const fx = a?.on && Object.values(a.on).find((x) => x);
    if (!fx) continue;
    if (fx.seen || a.forms) { if (!d.dugu?.length) continue; }
    else if (!d.arts?.[id]) continue;
    const tier = d.arts?.[id] ? artTier(d, id) : 0;
    if (tier < (fx.need ?? 0)) continue;
    const qi = Object.values(a.on).reduce((m, x) => Math.max(m, x?.qi || 0), 0);
    out.push({ id, qi });
  }
  return out;
}
export function blowWhy(d) {
  if (!d) return '這一招沒有絕活，勝負看火候。';
  const ready = readyBlows(d);
  const free = ready.filter((x) => !x.qi || qiOf(d) >= x.qi);
  if (!free.length && ready.length) return '內力見底，絕活放不出來。';
  const pick = free.find((x) => x.id === d.focus) || free[0];
  if (pick) { const [cost, how] = BLOW[pick.id]; return `${cost}，${how}。`; }
  if ((d.qiInjury || 0) >= DRIVE28.injWarn) return '經脈受了內傷，硬催別派武學會痛。';
  return '這一招沒有絕活，勝負看火候。';
}
export function boutWhy(tags = []) {
  const hit = BLOW_ORDER.find((id) => tags.includes(id));
  if (hit) return BOUT[hit];
  if (tags.includes('dry')) return '這一陣沒打出絕活，是因為內力見底。';
  if (tags.includes('hurt')) return '有人傷重退下，所以收隊。';
  if (tags.includes('inner')) return '內功在這一陣裡幫上了忙。';
  return '這一陣沒有絕活，勝負看誰先倒。';
}
export function expCause(team, reason = '') {
  const why = reason || '';
  if (why.includes('重傷') || why.includes('氣血')) return (team || []).some((d) => qiOf(d) <= 0) ? '回頭是因為有人內力見底，氣血也撐不住。' : '回頭是因為氣血見底。';
  if (why.includes('心情')) return '回頭是因為心情低落。';
  if (why.includes('體力')) return '回頭是因為體力耗盡。';
  if (why.includes('耐性')) return '回頭是因為耐性磨光。';
  if (why.includes('擋')) return '打不過守關，所以退了回來。';
  if ((team || []).some((d) => artNoParry(d))) return '這一趟有人看破來勢，自己不擋。';
  return '這一趟沒有打出絕活，勝負看火候。';
}
/* 前置比例。沒有天花板回 null。有的話取那些武學裡最高的熟練，沒學會當 0。 */
export function ceilingXp(d, a) {
  const arts = a?.learn?.ceiling?.arts;
  if (!arts?.length) return null;
  return Math.max(0, ...arts.map((id) => d.arts?.[id]?.xp || 0));
}
/* 練功可以停在天花板，不可以把已經更高的熟練砍下來。 */
function clampTrainXp(d, a, cur, next) {
  const capped = ceilingXp(d, a);
  if (capped == null) return next;
  return Math.min(next, Math.max(cur, capped));
}
export function rustOf(r, now) { const idle = now - (r.last ?? now); return Math.min(RUST.max, Math.max(r.rust || 0, idle > RUST.after ? ((idle - RUST.after) / 600) * RUST.perDay : 0)); }
// 回傳 {next 可求學武學, moves 新招}
/* g（loop79 成長分層，s.grow 時才傳）＝ { raw 原始投入, src 'train'|'fight' }：同類加速以結算前造詣計，造詣只吃原始投入 */
export function gainArt(d, amt, mf = 1, now = 0, g = null) {
  const out = { next: null, moves: [], star: false };
  if (d.bare && !Object.keys(d.arts || {}).length) return out;
  const id = focusOf(d);
  if (id) { out.trained = id; const a = artById(id), r = d.arts[id]; r.rust = rustOf(r, now); r.last = now; const xp0 = r.xp;
    const acc = g && !r.guizhen ? accelOf(d, a, r.xp) : null; out.acc = acc;
    const P = artMulParts(d, a, [['心情', mf], ['荒疏', 1 - r.rust]], acc && acc.mul > 1 ? [['同類底子', acc.mul]] : []); d.growMul = { art: id, total: P.total, talent: P.talent, state: P.state, ext: P.ext, gate: P.gate };
    const gx = amt * ART_GAIN.base * P.total;
    r.rust = Math.max(0, r.rust - RUST.shake);
    if (r.guizhen) { r.sxp = (r.sxp || 0) + gx * 0.4; while (r.sxp >= starCost(r)) { r.sxp -= starCost(r); r.stars = (r.stars || 0) + 1; out.star = true; } }
    else { const next = Math.min(curCap(d, a), r.xp + gx * (1 - r.xp / 130)); r.xp = clampTrainXp(d, a, r.xp, next); out.moves = unlockTechs(d, a); }
    if (g) out.gm = settleGrowth(d, a, r, { src: g.src || 'train', raw: g.raw ?? amt, xp0, xp1: r.xp });
    const feed = !r.guizhen && feedInner31(d, a, gx, g); if (feed) { out.feed = feed; d.growMul.feed = feed.label; } }
  if (!d.pendingArt) { const next = [...sectUnlock24(d), ...ARTS.filter((a) => artOk(d, a) && !a.deprecated && (!a.secret || yunvOpen24(d, a)) && !d.arts[a.id] && !reqMissing(d, a).length && fits(d, a) && !lockedArt24(d, a)).sort((a, b) => ownFirst24(d)(a, b) || ((b.school === d.style) - (a.school === d.style)) || appetiteOrder31(d, a, b))][0]; if (next) { d.pendingArt = next.id; out.next = next; } } /* loop208：本門特許與本門、路數都先於偏好 */
  return out;
}
export function chooseVariant(d, id, v, now = 0) {
  const r = d.arts?.[id], a = artById(id); if (!r || artTier(d, id) < 2 || !VARIANTS[a.school].some((x) => x.id === v)) return false;
  if (r.variant && r.variant !== v) r.until = now + BREAK.rechoose; r.variant = v; return true;
}
export const variantOf = (d, id, now = 0) => { const r = d.arts?.[id], a = artById(id); if (!r?.variant || (r.until || 0) > now) return null; return VARIANTS[a.school].find((x) => x.id === r.variant); };
const shenfaCd24 = (d) => (!!d ? 1 - 0.0015 * mastery(d, 'shenfa') : 1); /* loop198：身法造詣最多縮 15% 冷卻 */
export const cdMul = (d, mvId, now = 0) => { const raw = artOfMove(mvId), a = raw && d.arts?.[raw.id] ? raw : null, sh = shenfaCd24(d), mc = modeMul31(d, a, 'cd'); if (!a) return swordCdMul(d, mvId) * sh * mc; const t = artTier(d, a.id); return (t >= 1 ? PERKS.small.cd : 1) * (variantOf(d, a.id, now)?.cd || 1) * swordCdMul(d, mvId) * affixMul(d, mvId, 'cd') * sh * mc; };
export const visTier = (d, mvId) => { const a = artOfMove(mvId); return a && d.arts?.[a.id] ? artTier(d, a.id) : 0; };
export const topTier = (d) => ARTS.reduce((m, a) => (artTier(d, a.id) > m.t ? { t: artTier(d, a.id), a } : m), { t: -1, a: null });
export function learnArt(d, id, now = 0) { d.arts[id] ??= { xp: 0, last: now }; const a = artById(id); if (id === 'zixia' && !d.zixia) d.zixia = 1; /* loop172 氣宗本門領悟紫霞＝第一層 */ unlockTechs(d, a); if (d.pendingArt === id) d.pendingArt = null; return a; }
const CATDMG24 = ['quanzhang', 'tuifa', 'jianfa', 'gunbang'];
const catDmg24 = (d, a) => { if (!d || !a) return 1; const c = primaryCat(a.id); return CATDMG24.includes(c) ? 1 + 0.0015 * mastery(d, c) : 1; }; /* loop198：外功造詣每 20 點 +3% 招式傷害 */
export const moveMul = (d, mvId, now = 0) => strMul(d) * moveMul0(d, mvId, now) * harmonyMul(d) * affixMul(d, mvId, 'dmg') * (d.raging ? CLASH.fret.force : 1); /* loop161 v2.4 陰陽共鳴 */ // loop127 勞作練體
const moveMul0 = (d, mvId, now = 0) => { const raw = artOfMove(mvId), a = raw && d.arts?.[raw.id] ? raw : null, q = qiStrikeMul(d, a) * swordDmgMul(d, mvId), md = modeMul31(d, a, 'dmg'); if (!a) return (d.powMul || 1) * (d.jhMul || 1) * q * styleDamage(d) * md; const t = artTier(d, a.id), r = d.arts[a.id]; return (curveMulOf(a.curve, t) / (a.bestDps || 1)) * (d.powMul || 1) * (d.jhMul || 1) * (variantOf(d, a.id, now)?.dmg || 1) * (1 + GUIZHEN.star * (r.stars || 0)) * (d.pf ? profMul(r.xp) : 1) * q * md * styleDamage(d) * innerDrive28(d, a).mul * catDmg24(d, a) /* #408 曲線是最強一招的每秒傷害，招式原傷害先除掉；悟性、性格、門派偏向與初學加成不進出手 */ /* loop201 武學 mode；loop198 外功造詣；loop181 四階內功催動 */ /* loop91 熟練度十重（d.pf 由 s.prof 設） */; };
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
  for (const a of ARTS) { if (a.deprecated || d.arts?.[a.id] || !artOk(d, a) || (a.own24 && lockedArt24(d, a) && !chiefLocked24(d, a))) continue; /* loop201 退場武學不進領悟；loop168 他派專屬不露 */
    if (a.secret) { rows.push({ id: a.id, name: '？？？', secret: true, need: [a.hint || (a.signature ? `名俠${nameOf(a.signature)}的個人絕學：他上山入門（或以他開局）才會出現` : '機緣未明')] }); continue; }
    const need = a.req.filter((r) => artTier(d, r.art) < r.tier).map((r) => `${artById(r.art).name}練到${TIERS[r.tier][1]}（現在${tierName(artTier(d, r.art))}）`);
    need.push(...elderMiss(d, a));
    if (chiefLocked24(d, a)) need.unshift(CHIEF24_WHY); /* loop171 */
    if (!fits(d, a)) need.push(`要走${SCH[a.school] || a.school}路數（目前專精${SCH[d.style] || '無'}）`);
    if (a.wuxingMin && (d.wu ?? d.root ?? 3) < a.wuxingMin) need.push(`悟性 ≥${a.wuxingMin}，否則止於小成`);
    rows.push({ id: a.id, name: a.name, secret: false, ready: !reqMissing(d, a).length && fits(d, a) && !chiefLocked24(d, a), need: need.length ? need : ['條件已足，等師父有空傳授'] }); }
  return rows;
}
export function artHintsHtml(d, nameOf) { const R = artHints(d, nameOf); if (!R.length) return ''; return `<div class="art-hints"><b>領悟線索</b>${R.map((r) => `<div class="k art-hint${r.secret ? ' secret' : ''}" data-hint="${r.id}">${r.secret ? '🔒 ' : r.ready ? '✅ ' : '⬜ '}${r.name}：${r.need.join('；')}</div>`).join('')}</div>`; }
// 武學圖（SVG）：欄＝品階，列＝系
const ROW = { fist: 0, palm: 1, leg: 2, inner: 3, step: 4 };
export function artsSvg(d) {
  const W = 118, H = 40, X = (a) => 8 + (a.grade - 1) * (W + 34) + (a.id === 'fengLei' ? 0 : 0), Y = (a) => 8 + ROW[a.school] * (H + 10);
  const pos = (a) => (a.svg ? [8 + a.svg[0] * (W + 34), 8 + a.svg[1] * (H + 10)] : a.id === 'rulai' ? [X(a), 8 + 4 * (H + 10)] : a.id === 'fengLei' ? [X(a), 8 + 1.5 * (H + 10)] : [X(a), Y(a)]);
  let lines = '', boxes = '';
  let maxY = 0; for (const a of ARTS) { if (a.deprecated) continue; if ((a.secret || !artOk(d, a) || (a.own24 && lockedArt24(d, a) && !chiefLocked24(d, a))) && !d.arts?.[a.id]) continue;
    const [x, y] = pos(a), st = artState(d, a); maxY = Math.max(maxY, y);
    for (const r of a.req) { const b = artById(r.art), [bx, by] = pos(b), ok = artTier(d, b.id) >= r.tier; lines += `<line x1="${bx + W}" y1="${by + H / 2}" x2="${x}" y2="${y + H / 2}" stroke="${ok ? '#7a9a5a' : '#bbb'}" stroke-width="2" ${ok ? '' : 'stroke-dasharray="4 3"'}/>`; }
    const fill = { learned: '#e7f0dc', pending: '#f7e6a8', open: '#f2ecd8', locked: '#eee' }[st.st];
    const xp = d.arts?.[a.id]?.xp; const sub = st.st === 'learned' ? `${TIERS[st.tier][1]} ${xp.toFixed(1)}` : st.st === 'pending' ? '可求學' : st.st === 'open' ? (fits(d, a) ? '條件已足' : '非本門路數') : clip(st.why, 9); // v1.8 A7：鎖住也直接寫出缺什麼
    const mt = modeTitle31(d, a); boxes += `<g data-art="${a.id}" class="art ${st.st}"><title>${a.name}（${'凡良精絕神'[a.grade - 1]}・${a.tags.join('')}${mt ? `・${mt}` : ''}${a.wuxingMin ? `・悟性≥${a.wuxingMin}` : ''}）${st.why ? '：' + st.why : ''}</title><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="5" fill="${fill}" stroke="${focusOf(d) === a.id ? '#b0482e' : '#998'}" stroke-width="${focusOf(d) === a.id ? 2.5 : 1}"/>`
      + `<text x="${x + 6}" y="${y + 16}" font-size="13">${a.name}${st.st === 'learned' && gated(d, a) ? ' ⛔' : ''}</text><text x="${x + 6}" y="${y + 32}" font-size="11" fill="#665">${sub}</text>`
      + (st.st === 'learned' ? `<rect x="${x + 70}" y="${y + 26}" width="${42}" height="6" fill="#ddd"/><rect x="${x + 70}" y="${y + 26}" width="${(42 * xp) / 100}" height="6" fill="#7a9a5a"/>` : '') + '</g>';
  }
  const rows = Math.max(8, Math.round((maxY - 8) / (H + 10)) + 1); return `<svg viewBox="0 0 ${8 + 3 * (W + 34)} ${8 + rows * (H + 10)}" width="100%" style="max-width:470px">${lines}${boxes}</svg>`;
}

// ==== （原 breakthru.mjs）====
// loop25 突破排程（選用，s.bt25）：卡在瓶頸且可衝關時，打坐分數不低於最高練功分數×BT25.k。
// 診斷：人多後主角升首徒（練功×1.5），練功 ~130 壓過打坐 75，武學卡 55；並非座位不足（座位滿 0%）。
export const BT25 = { k: 1.1 };
export function btBoost(s, out) {
   const m = out.find((o) => o.act === 'meditate' && o.f?.btOk); if (!m) return;
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
const open = (d, a) => a && !a.deprecated && artOk(d, a) && (!a.secret || yunvOpen24(d, a)) && !d.arts?.[a.id] && !reqMissing(d, a).length;
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
export function selfTarget(d) { if (d.pendingArt) return d.pendingArt; const u = sectUnlock24(d); if (u.length) return u[0].id; const c = ARTS.filter((a) => open(d, a) && !lockedArt24(d, a));  c.sort((a, b) => ownFirst24(d)(a, b) || appetiteOrder31(d, a, b)); /* loop208：本門特許與本門優先，偏好只排同一層 */ if (c[0] && ownArt24(d, c[0])) return c[0].id; const styled = c.filter((a) => a.school === d.style); return (styled[0] || c[0])?.id || null; }
// 活動完成時呼叫
export function comprehend(s, d, act, partner, think, log) {
  if (!COMP.gain[act]) return null;
  const tgt = selfTarget(d); let got = tgt ? add(s, d, tgt, COMP.gain[act], 'self', think, log) : null;
  if (act === 'spar' && partner) { const seen = ARTS.filter((a) => partner.arts?.[a.id] && open(d, a) && !lockedArt24(d, a)); seen.sort((a, b) => appetiteOrder31(d, a, b)); /* loop208：觀摩只在能看的功夫裡排偏好。傳功與會武偷師不走這裡 */ if (seen[0]) got = add(s, d, seen[0].id, COMP.watch, 'watch', think, log) || got; }
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
  if (!COMP.gain[act]) return null; let got = null;
  if (act === 'spar' && partner) { const id = Object.keys(d.arts || {}).find((k) => vOpen(d, k) && partner.arts?.[k]?.variant && !(partner.arts[k].until > s.t)); if (id) got = vAdd(s, d, id, partner.arts[id].variant, COMP.watch, 'watch', think, log); }
  if (!got) { const id = Object.keys(d.arts || {}).filter((k) => vOpen(d, k)).sort((a, b) => d.arts[b].xp - d.arts[a].xp)[0]; if (id) got = vAdd(s, d, id, vLean(d), COMP.gain[act], 'self', think, log); }
  return got;
}

// ==== （原 readwu.mjs）====
/* loop140 讀書長悟性 `readwu`（決定 120；借鏡大俠立志傳「悟性靠讀書」，只做最小版）。
   s.readwu 開時，每完成一次「藏經閣研讀」記一次；累積 READWU.need 次悟性 +1（每人一生一次、不超過 5）。 */
export const READWU = { need: 30, max: 5 };
export function readStudy(s, d) { if (!s || d.rwDone) return null;
  d.rw = (d.rw || 0) + 1; if (d.rw < READWU.need) return null;
  d.rwDone = true; const w0 = d.wu ?? d.root ?? 3; if (w0 >= READWU.max) return null; d.wu = w0 + 1; return d.wu; }
export const readwuNote = (s, d) => (!s ? '' : d.rwDone ? '（讀書已開竅）' : `（研讀 ${d.rw || 0}/${READWU.need}）`);

// ==== （原 neigong.mjs）====
/* loop102 最小內功（概念取自《下一站江湖》心法養內力、《逸劍風雲決》心法支撐修為，不抄碼）。
   只存目前內力 d.qi；上限由已學內功武學的階衍生、不存。不吃造詣、不吃十重：紫霞層數已決定其 xp，只看階，不另加。 */
// loop142（v2.2）：一版內功（狩獵運勁、運功療傷、20＋15×階的上限）已淘汰，護體真氣是唯一實作；NG 只留回復與衝關參數
export const NG = { med: 12, rest: 0.2, btCost: 20, btBonus: 0.1 };
export const isInner = (a) => a.school === 'inner' || !!(a?.cats?.neigong || ART_CAT[a.id]?.neigong); /* loop209：INNER 在 normalizeArts 之前就凍結，字面量上的 cats 得先算得進去 */
export const INNER = ARTS.filter(isInner).map((a) => a.id);
export const innerArts = (d) => INNER.filter((id) => d.arts?.[id]);
export const qiMax = (d) => qiMax2(d) * injuryMul28(d); /* loop181 經脈內傷壓內力上限 */
export const qiOf = (d) => Math.min(d.qi ?? 0, qiMax(d));
export function addQi(d, amt) { if (amt > 0 && d?.part?.where === 'body') return d.qi ?? 0; /* #427 身傷：內力不回 */ d.qi = Math.max(0, Math.min(qiMax(d), (d.qi ?? 0) + amt)); return d.qi; }
// 夠就扣並回 true；不夠不扣
export function spendQi(d, cost) { if (!d.ng || qiOf(d) < cost) return false; d.qi = qiOf(d) - cost; return true; }

/* loop114 二版「護體真氣」（docs/systems/neigong-rework.md §3）。d.ng2 由 sim 依 s.ngshield 設定。
   概念：靈氣護盾（了不起的修仙模擬器）、內力吸收傷害（俠客風雲傳北冥神功）。不抄碼。 */
export const NG2 = { cap: [10, 25, 45, 70, 100], mit: [0.02, 0.05, 0.08, 0.12, 0.16], mitCap: 0.3, total: 200, total24: 260, mitCap24: 0.36, spentT: 20, spentMul: 1.15, powK: 0.2, dpsK: 0.01, guard: 15, guardHp: 40 };
/* #403 退役 GRADE_NG24：內力與減傷只看火候補間，不再乘品階。品階難度仍只改練功速度。 */
export const GRADE_TRAIN24 = { 1: 1.12, 2: 1, 3: 0.78, 4: 0.65 };
export function ngTierCont24(d, id, table = NG2.cap) {
  const a = artById(id), r = d?.arts?.[id]; if (!a || !r) return 0;
  const p = profOf(r.xp || 0), cur = table[p.t] ?? 0, nxt = table[p.t + 1];
  return p.lv && nxt != null ? cur + (nxt - cur) * ((p.lv - 1) / 10) : cur;
}
export function qiMax2(d) { let v = 0; for (const id of innerArts(d)) v += !!d ? ngTierCont24(d, id) : (NG2.cap[artTier(d, id)] ?? 0); if (!d) return Math.min(NG2.total, v); v *= 1 + 0.004 * mastery(d, 'neigong'); return Math.min(NG2.total24, v); } /* loop201：先乘內功造詣，再套 260 封頂 */
export function mitOf(d) { let v = 0; for (const id of innerArts(d)) v += !!d ? ngTierCont24(d, id, NG2.mit) : (NG2.mit[artTier(d, id)] ?? 0); return Math.min(!!d ? NG2.mitCap24 : NG2.mitCap, v); }
// 受擊：先減傷、再由內力吸收，餘下回傳要扣的生命。力竭中受傷加重。now = 遊戲秒。
export function shieldHit(d, dmg, now = 0) {
  if (!d.ng2) return dmg;
  if (!(dmg > 0)) return 0; /* loop123 反例：負／零傷害不得加內力或觸發力竭 */
  let x = dmg * ((d.spentUntil ?? -1) > now ? NG2.spentMul : 1);
  const q = qiOf(d);
  if (q <= 0) return x;
  x *= 1 - mitOf(d);
  const ab = Math.min(q, x); d.qi = q - ab; x -= ab;
  if (d.qi <= 0 && !tenthOf(d)) d.spentUntil = now + NG2.spentT * (qiGreat24(d) ? 0.5 : 1); /* loop199：氣宗／紫霞大成，力竭時間減半 */
  return x;
}
export const shieldOn = (d) => !!d.ng2 && qiOf(d) > 0;
// loop117 抽象戰鬥：門派戰力加成、守柵出手加成、重傷時護體（夠內力就扣內力、改成輕傷）
export const powBonus = (d) => (d.ng2 ? NG2.powK * qiMax2(d) : 0);
export const dpsBonus = (d) => (d.ng2 ? NG2.dpsK * qiMax2(d) : 0);
export function guardHurt(d, hurtHp) { if (!d.ng2 || qiOf(d) < NG2.guard) return hurtHp; d.qi = qiOf(d) - NG2.guard; return Math.max(hurtHp, NG2.guardHp); }
// loop121 十重質變（只一項、不重複加數值）：任一內功練到圓滿十重（需熟練度十重）或化境 →「真氣綿長」：內力打空也不力竭
export const tenthOf = (d) => innerArts(d).some((id) => { const t = artTier(d, id); if (t >= 4) return true; const p = profOf(d.arts[id].xp || 0); return !!d.pf && t === 3 && p.lv === 10; });

// ---- loop151 v2.3 專長門類（陣法／毒術／醫術）：強度＝造詣／40 封頂 1 ----
export const SPEC = { k: 0.4, ref: 40, zhenMit: 0.25, zhenSlow: 0.2, zhenScout: 0.15, poisonT: 6, poisonDps: 2, poisonWeak: 0.15, healMax: 0.5, brewEvery: 3, expHeal: 5,
  grow: { brew: 'yishu', heal: 'yishu', forage: 'dushu', watch: 'zhenfa', study: 'zhenfa', train: 'zhenfa' } };
export const specM = (d, c) => (!!d ? mastery(d, c) : 0);
export const specK = (m) => Math.min(1, m / SPEC.ref);
const present = (s) => (s.ds || []).filter((d) => !d.away && d.hp > 0);
export const bestSpec = (s, c, list = present(s)) => (list.reduce((m, d) => Math.max(m, specM(d, c)), 0));
export const zhenK = (s, list) => specK(bestSpec(s, 'zhenfa', list));
export const hasPoison = (s, list) => bestSpec(s, 'dushu', list) > 0;
// 活動完成時替該門類武學累積造詣（受同一門類邊際遞減，封頂 GROW.cap）
export function specGrow(d, act) {
  const cat = !!d && SPEC.grow[act]; if (!cat) return 0; let g = 0;
  for (const [id, r] of Object.entries(d.arts || {})) { const w = ART_CAT[id]?.[cat]; if (!w) continue; const a = artBy(id); if (!a) continue;
    r.gm ??= { e: 0, ms: 0 }; const cap = growCapOf(a), b = r.gm.e; r.gm.e = Math.min(cap, b + SPEC.k * w); g += r.gm.e - b; r.xp = (r.xp || 0) + 0.2 * w; }
  return g;
}

// ---- loop153 v2.3 內功：三段腳程、御氣疾行耗氣、真氣出手、劍招、內功被動 ----
export const NG23 = { med: 16, speedPerTier: 0.06, yuqi: { base: 1.15, perTier: 0.03, drain: 0.3, keep: 0.3, minTier: 1 }, medLow: 0.45, medBoost: 1.3,
  qiSchool: 1.35, qiSchoolZx: 2, qiAoe: 15, qiAoeAt: 50, swordCd: 0.82, swordEarly: 1.1, swordEarlyTier: 1, qiStrikeK: 0.15 };
export const INNER_SPECS = {
  breath: { name: '吐納', desc: '入門起，歇息回氣 ×1.5' },
  zixia: { name: '紫霞神功', desc: '打坐多回 4 氣；小成起劍招略增，大成起劍招耗 1 氣並回 2 血' },
  jiuyang: { name: '九陽神功', desc: '不動時每秒自回 0.25 氣；大成起內傷每秒褪一點' },
  wudangJiuyang: { name: '純陽無極功', desc: '圓滿起，挨打化成少量內力與氣血' },
  huagongDafa: { name: '化功大法', desc: '小成起，打中吸走對方一點內力，這一擊不再疊別的內功被動' },
  huntianGong: { name: '混天氣功', desc: '小成起，降龍耗了內力仍震得開' },
  yunv: { name: '玉女心經', desc: '隊裡還有另一位玉女心經傳人時，出手更沉' },
  hama: { name: '蛤蟆功', desc: '大成起，氣血見底且內力還夠時，蓄勢反擊' },
  qiankun: { name: '乾坤大挪移', desc: '挨打時挪開一部分來力，餘勢反震回去。第一層是入門，練功不得高過聖火或九陽' },
  biboXinfa: { name: '碧波心法', desc: '小成起，打中時收回一點瀉出的真氣' },
  linjiZhuang: { name: '臨濟十二莊', desc: '挨打時按已開的莊托住氣血。莊數看火候，不按品階乘' },
  emeiJiuyang: { name: '峨眉九陽功', desc: '小成起，打中時把這一招化進一點內力。不是九陽神功' } };
export const innerSpecs = (d) => (!!d ? Object.keys(INNER_SPECS).filter((id) => d.arts?.[id]) : []);
export const hasSpec = (d, id) => !!(!!d && d.arts?.[id]);
export const ngTier = (d) => innerArts(d).reduce((m, id) => Math.max(m, artTier(d, id)), -1);
export const yuqiOn = (d) => !!(!!d && d.ng && ngTier(d) >= NG23.yuqi.minTier && qiOf(d) > qiMax(d) * NG23.yuqi.keep);
export const yuqiMul = (d) => (yuqiOn(d) ? NG23.yuqi.base + NG23.yuqi.perTier * ngTier(d) : 1);
export const qiSchool = (d) => !!(!!d && (d.sectId === 'qizong' || (d.zixia || 0) >= NG23.qiSchoolZx)); /* loop157：門派記在 d.sectId（每 tick 由 sim 寫入） */
// loop157 以氣御招：有內功者 ×(1+0.15×內力/100)，氣宗／紫霞 ≥2 層再 ×1.35；統一走 moveMul0。只留給非 v24。
/* loop201：築基／練法／打法寫在武學上。v24 內勁看該武學 qiScale，不再看門派。 */
export const MODE31 = {
  base: { qiScale: 0.15, dmg: 1, cd: 1 },
  lian: { qiScale: 0.40, dmg: 0.90, cd: 1 },
  da: { qiScale: 0.08, dmg: 1.12, cd: 0.92 },
};
/* 還沒寫進字面量的武學才用這條。純內功不設。一品築基；快為打法；柔或拙為練法；其餘打法。 */
export function modeDefault31(a) {
  if (!a || a.school === 'inner') return null;
  const tags = a.tags || [];
  if ((a.grade || 1) === 1) return 'base';
  if (tags.includes('快')) return 'da';
  if (tags.includes('柔') || tags.includes('拙')) return 'lian';
  return 'da';
}
export const modeMul31 = (d, a, k) => (!!d && a?.mode && MODE31[a.mode] ? MODE31[a.mode][k] : 1);
const OUTER31 = ['quanzhang', 'tuifa', 'jianfa', 'gunbang'];
/* loop202：四門外功造詣的最高值。以技入道與內勁有效造詣都讀它 */
export const outerMast31 = (d) => Math.max(0, ...OUTER31.map((c) => mastery(d, c)));
export const dao31 = (d) => !!(!!d && OUTER31.some((c) => mastery(d, c) >= 50));
/* loop202：內功造詣 + 0.2×最高外功造詣，封頂 100 */
export function neigongEff31(d) { return Math.min(100, mastery(d, 'neigong') + 0.2 * outerMast31(d)); }
export function floatMul31(a) {
  const q = Number.isFinite(a?.qiScale) ? a.qiScale : MODE31.base.qiScale;
  return 1 - (1 - DRIVE28.t3) * Math.min(1, q / 0.40);
}
/* loop201：任何門派，主運內功 ≥ 3 品且大成，力竭時間減半 */
export function qiGreat24(d) {
  if (!d) return false;
  const M = mainInner28(d);
  return !!(M && (M.grade || 1) >= 3 && artTier(d, M.id) >= 2);
}
export function qiStrikeMul(d, a) {
  if (!d) return 1;

  const scale = Number.isFinite(a?.qiScale) ? a.qiScale : MODE31.base.qiScale;
  return 1 + scale * Math.min(QI_SAT31, qiOf(d) / 100) * (1 + 0.004 * neigongEff31(d));
}
/* #405：內力飽和上限。不看品階，也不再拿來當催動倍率。 */
export const QI_SAT31 = 1.6;
export const MODE_NAME31 = { base: '築基', lian: '練法', da: '打法' };
/* 武學圖與練功列共用。純內功沒有 mode，回空字串。 */
export function modeTitle31(d, a) {
  if (!a?.mode || !MODE_NAME31[a.mode]) return '';
  const q = Number.isFinite(a.qiScale) ? a.qiScale : MODE31[a.mode].qiScale;
  return `${MODE_NAME31[a.mode]}・內勁係數 ${q}・內勁 ×${qiStrikeMul(d, a).toFixed(2)}`;
}
export const qiAoeAdd = (d, mv) => (!!d && mv.aoe && qiOf(d) >= NG23.qiAoeAt ? NG23.qiAoe : 0);
// loop157 修正：招式沒有 skill:'sword'，改看所屬武學是否劍法；獨孤九劍各式不在 techs，以 fx 'dugu' 認
/* loop159 v2.4 Batch 0.2：isSwordArt 依規格（ART_CAT 劍法、weapon:'sword'、id 含 sword、三門經典劍法）；swordArtOf 改經 isSwordArt，與 loop157 修正同一入口，不重複乘 */
export function isSwordArt(id) { return ART_CAT[id]?.jianfa > 0 || ARTS.find((x) => x.id === id)?.weapon === 'sword' || String(id).toLowerCase().includes('sword') || ['dugu', 'bixie', 'xuantie'].includes(id); }
const swordArtOf = (mv) => { const id = mv?.id || mv; if (MOVES.find((m) => m.id === id)?.fx === 'dugu') return 'dugu'; const a = artOfMove(id); return a && isSwordArt(a.id) ? a.id : null; };
export const isSwordMove = (mv) => !!swordArtOf(mv);
/* #408 絕活與內功被動的期望。會武、江湖挑戰只看 dpsOf，所以期望要算在這裡。
   巡山的實際扣血用同一段 mul，氣血自損與反震留在出手當下，避免算兩次。
   辟邪的先手連刺攤進 EXPECT_SWINGS 下，不把第一下的全額再乘進每秒傷害。 */
export const EXPECT_SWINGS = 8;
/* 隊裡還有另一位玉女心經傳人。會武讀 expectOf，所以這份倍率要在這裡，不能只寫在巡獵。 */
export const YUNV_PAIR = 1.15;
const chargeReady = (d, fx) => {
  if (!fx?.charge) return true;
  if ((d.hp ?? 100) >= (fx.hpBelow ?? 50)) return false;
  const max = qiMax(d);
  return !(max > 0 && qiOf(d) < max * (fx.qiKeep ?? 0.5));
};
export function expectOf(d, mv, now = 0) {
  const out = { mul: 1, selfPerSec: 0, reflect: 0 };
  if (!d || !mv) return out;
  const id = mv.id || mv;
  const move = typeof mv === 'string' ? MOVES.find((m) => m.id === id) : mv;
  const a = artOfMove(id);
  if (a && (d.arts?.[a.id] || (a.forms && d.dugu?.length))) {
    const tier = d.arts?.[a.id] ? artTier(d, a.id) : 0;
    const fx = a.on?.hit;
    const ready = (spec) => spec && tier >= (spec.need ?? 0) && !(spec.seen && !(d.dugu?.length));
    /* mood 不進期望。黯然已經在出手的 jhMul 裡。 */
    if (ready(fx) && !fx.mood && chargeReady(d, fx) && !(fx.qi && qiOf(d) < fx.qi)) {
      if (fx.dmg) out.mul *= fx.dmg;
      if (fx.flurry) out.mul *= 1 + (fx.flurry - 1) / EXPECT_SWINGS;
      if (fx.selfHp && move?.cd) out.selfPerSec += fx.selfHp / (move.cd * cdMul(d, id, now));
    }
    const back = a.on?.gethit;
    if (ready(back) && back.reflect) out.reflect = back.reflect;
  }
  if (isSwordMove(id) && artTier(d, 'zixia') >= 1) out.mul *= 1.05;
  if (d.yunvLink) out.mul *= YUNV_PAIR;
  return out;
}
/* loop201：v24 不再一律給劍法冷卻或傷害。非 v24 仍是冷卻 0.82、小成及以下 ×1.1。 */
export const swordCdMul = () => 1; /* #390：v2.4 起劍招不另減冷卻（舊 v2.3 規則已刪） */
export const swordDmgMul = (d, mv) => { return 1; const id = swordArtOf(mv); if (!id) return 1; return artTier(d, id) <= NG23.swordEarlyTier ? NG23.swordEarly : 1; };
/* loop204：主修外功是打法且已大成。不看門派、不看是不是劍。 */
export const swordFast24 = (d) => { const o = !!d ? mainOuterArt(d) : null; return !!(o?.mode === 'da' && artTier(d, o.id) >= 2); };
/* loop204：主修外功是練法，且這門的內勁倍率 ≥ 1.25。 */
export const qiArtBadge24 = (d) => { const o = !!d ? mainOuterArt(d) : null; return !!(o?.mode === 'lian' && qiStrikeMul(d, o) >= 1.25); };
const ngMast24 = (d) => (!!d ? 1 + 0.004 * mastery(d, 'neigong') : 1); /* loop198：內功造詣每 10 點，打坐與歇息 +4% */
export const medQi = (d) => (!!d ? (NG23.med + (hasSpec(d, 'zixia') ? 4 : 0)) * ((d.medK24 || 1) * (sectClasses24(d) >= 3 ? SYN24.med3 : 1)) * ngMast24(d) : NG.med); /* loop196 本門正宗打坐 ×1.15 */ /* loop168 古墓寒玉床打坐 ×1.5 */
export const restQi = (d) => NG.rest * (hasSpec(d, 'breath') ? 1.5 : 1) * ngMast24(d);

// ---- loop160 v2.4 Batch 1.2：藏經閣圖譜：讀書完成時，若門內該門類無人懂（best < CHART24.need），以 chance 機率取得對應抄本 ----
export const CHART24 = { chance: 0.25, need: 1, arts: { zhenfa: 'zhenTu', yishu: 'yiJing', dushu: 'duPu' } };
export function studyChart24(s, d, r) {
  if (!s || !d) return null; /* study 動作本身已需藏經閣 */
  const need = Object.entries(CHART24.arts).filter(([c, id]) => !d.arts[id] && bestSpec(s, c, s.ds || []) < CHART24.need); if (!need.length) return null;
  if (r() >= CHART24.chance) return null; const [c, id] = need[0]; learnArt(d, id, s.t); (s.v24n ??= {}).chart = (s.v24n.chart || 0) + 1; return { cat: c, art: artBy(id) };
}

// ---- loop161 v2.4 Batch 2：陰陽剛柔共鳴、奇門點穴／封穴 ----
/* 共鳴：身上已入門（tier ≥ 1）的武學同時有陰、陽屬性 ×1.08；再兼「和」×1.12。無屬性的舊武學不參與 */
export const HARMONY24 = { yy: 1.08, all: 1.12, minTier: 1, fengCd: 0.3 };
/* 屬性：新武學有 attr；舊武學依 tags 推（剛→陽、柔→陰，兩者皆有→和） */
export const attrOf = (a) => a?.attr || (a?.tags?.includes('剛') && a?.tags?.includes('柔') ? 'he' : a?.tags?.includes('剛') ? 'yang' : a?.tags?.includes('柔') ? 'yin' : null);
export function harmonyOf(d) { if (!d) return null; const at = new Set();
  for (const id of Object.keys(d.arts || {})) { const a = artBy(id); const x = attrOf(a); if (x && artTier(d, id) >= HARMONY24.minTier) at.add(x); }
  return at.has('yin') && at.has('yang') ? (at.has('he') ? 'all' : 'yy') : null; }
export const harmonyMul = (d) => { if (!d) return 1; const h = harmonyOf(d); return h ? HARMONY24[h] : 1; };
/* 封穴：隊中有懂奇門（造詣 > 0）的人，敵人出手間隔 ×(1 + fengCd × 奇門強度) */
export const fengxueK = (s, team) => (!!s ? specK(bestSpec(s, 'qimen', team)) : 0);

// ---- loop162 v2.4 Batch 3：頓悟詞綴：武學練到大成（tier ≥ AFFIX24.tier）時頓悟一個詞綴，依種子＋人＋武學雜湊決定（不吃 RNG 流） ----
export const AFFIX24 = { tier: 2, list: [{ id: 'xun', name: '迅', cd: 0.94 }, { id: 'jin', name: '勁', dmg: 1.06 }, { id: 'mian', name: '綿', dmg: 1.03, cd: 0.97 }] };
const h24 = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export const affixOf = (d, id) => (!!d && d.arts?.[id]?.affix ? AFFIX24.list.find((x) => x.id === d.arts[id].affix) : null);
export const affixMul = (d, mvId, k) => { if (!d) return 1; const a = artOfMove(mvId); return (a && affixOf(d, a.id)?.[k]) || 1; };
export function affix24(s, d) { if (!s || !d) return null; let got = null;
  for (const [id, r] of Object.entries(d.arts || {})) { if (r.affix || artTier(d, id) < AFFIX24.tier || !artBy(id)?.techs?.length) continue;
    const x = AFFIX24.list[h24(`${s.seed}:${d.id}:${id}`) % AFFIX24.list.length]; r.affix = x.id; (s.v24n ??= {}).affix = (s.v24n.affix || 0) + 1; got = { art: artBy(id), x }; }
  return got; }

// ---- loop165 v2.5 Batch 5.1：宗師合參推演（左冷禪式）。掌門（hero）或內門／首徒在研讀、打坐完成時檢查 ----
/* 條件：兩門指定類別武學都練到大成（tier ≥ DERIVE24.tier）＋主門類造詣達標。剛猛內功在現有資料極少，乾坤霸刀的內功條件放寬為任一內功。 */
export const DERIVE24 = { tier: 2, xp: 10, roles: ['hero', 'inner', 'head'], max: 1, maxWuming: 2 };
/* loop176 t192 待決 3：名門每局 1 門、無名派 2 門 */
export const deriveMax24 = (s) => (s?.sect?.id === 'wuming' ? DERIVE24.maxWuming : DERIVE24.max);
const t2 = (d, f) => Object.keys(d.arts || {}).some((id) => { const a = artBy(id); return a && !a.derived && artTier(d, id) >= DERIVE24.tier && f(a, ART_CAT[id] || {}); });
export const DERIVE_RULES24 = [
  { id: 'hanbingPalm', cat: 'quanzhang', min: 52, a: (a) => (a.school === 'palm' || a.school === 'fist') && a.tags.includes('剛') && !isSwordArt(a.id), b: (a) => a.school === 'inner' || attrOf(a) === 'yin' },
  { id: 'liufengSword', cat: 'jianfa', min: 52, a: (a) => isSwordArt(a.id), b: (a) => a.school === 'step' },
  { id: 'fuguFinger', cat: 'quanzhang', min: 48, a: (a, c) => (c.qimen || 0) > 0, b: (a, c) => (c.dushu || 0) > 0 },
  { id: 'qiankunBlade', cat: 'gunbang', min: 52, a: (a, c) => (c.gunbang || 0) > 0 || a.weapon === 'blade' || a.weapon === 'staff', b: (a) => a.school === 'inner' },
];
/* loop169 t190 待決 2：(a) 本門樹已有該合參絕學（前輩已開創）就不再推演；(b) 每局每派上限 DERIVE24.max 門；造詣門檻 45/40 → 52/48 */
export function deriveReady24(d, s) { if (s && (s.v24n?.derive || 0) >= deriveMax24(s)) return []; return DERIVE_RULES24.filter((R) => !d.arts?.[R.id] && !s?.sect?.tree?.includes(R.id) && mastery(d, R.cat) >= R.min && t2(d, R.a) && t2(d, R.b)); }
export function checkDeriveArt(s, d) {
  if (!s || !d || !(d.id === 'hero' || DERIVE24.roles.includes(d.role))) return null;
  const R = deriveReady24(d, s)[0]; if (!R) return null; const a = learnArt(d, R.id, s.t); d.arts[R.id].xp = Math.max(d.arts[R.id].xp, DERIVE24.xp);
  if (s.sect && !s.sect.tree.includes(R.id)) s.sect.tree.push(R.id); (s.v24n ??= {}).derive = (s.v24n.derive || 0) + 1; return a;
}

/* ---- loop171 v2.6 正統同門成套加成（sectSynergy）與雜學曲線（polymath） ---- */
export const SYN24 = { base: 1.18, line: 1.28, med3: 1.15, distract: 0.82, wide: 1.15, conv: 1.20, lineages: 2, convLin: 3, convMast: 58, distMast: 55 }; /* loop182 v2.8：分心 0.82、萬流歸宗 ×1.20 */
const OUTER24 = ['fist', 'palm', 'leg'];
/* loop191：內功類看 isInner（含玉女心經等 hybrid），不再只看 school === 'inner' */
const cls24 = (a) => (!a || typeof a !== 'object' ? null : isInner(a) ? 'inner' : a.school === 'step' ? 'step' : OUTER24.includes(a.school) ? 'outer' : null);
/* 本門樹（d.stree）內、已達小成的武學涵蓋幾類（內功／身法／外功） */
/* loop196：廢三才計數。本門正宗＝本門內功大成，且至少一門本門外功或本門輕功小成。回 3／0，舊測試仍讀 sectClasses24。 */
const ownCombat28 = (a) => !!(a && !isInner(a) && (a.school === 'step' || a.school === 'fist' || a.school === 'palm' || a.school === 'leg'));
export function orthodox28(d) {
  if (!d || ownMaxTier28(d) < 2) return false;
  return Object.keys(d.arts || {}).some((id) => { const a = artById(id); return ownCombat28(a) && own28(d, a) && artTier(d, id) >= 1; });
}
export function sectClasses24(d) { return orthodox28(d) ? 3 : 0; }
/* 同門前階帶後階：修本門樹武學，已會本門前置（達 req 階）或本門內功小成 → 同門根基；本門內功與本門外功皆大成 → 一脈相承 */
export function sectLine24(d, a) {
  if (!d || !d.stree?.includes(a.id)) return null; let inT = -1, outT = -1;
  for (const id of Object.keys(d.arts || {})) { if (id === a.id || !d.stree.includes(id)) continue; const k = cls24(artById(id)), t = artTier(d, id); if (k === 'inner') inT = Math.max(inT, t); else if (k === 'outer') outT = Math.max(outT, t); }
  if (inT >= 2 && outT >= 2) return ['一脈相承', SYN24.line];
  if (inT >= 1 || a.req.some((r) => d.stree.includes(r.art) && artTier(d, r.art) >= r.tier)) return ['同門根基', SYN24.base]; return null;
}
/* loop182 v2.8 雜學收緊：只算非公共（PUBLIC28 以外）、具 own24（禁學 'ban' 不算）或非招牌名門 classic 的武學，依門派血統分組（classic 無 own24 者取第一個收錄它的門派樹）。
   回 0＝不適用；1＝雜學分心（跨 ≥2 派，且大成血統 <3 或最高造詣 <55）；2＝萬流歸宗（≥3 派血統各有大成武學，且最高造詣 ≥58） */
const PM24 = new WeakMap(), LIN28 = new Map();
const lineage28 = (a) => { if (!a || PUBLIC28.includes(a.id) || a.own24 === 'ban') return null; if (a.own24) return a.own24; if (!a.classic || a.signature) return null;
  if (!LIN28.has(a.id)) LIN28.set(a.id, Object.entries(SECTS).find(([, S]) => S.tree.includes(a.id) || S.tree24?.includes(a.id))?.[0] || a.id); return LIN28.get(a.id); };
export function polymath24(d) {
  if (!d || !d.arts) return 0; const ids = Object.keys(d.arts), sig = ids.reduce((x, id) => x + d.arts[id].xp, ids.length * 1e6), c = PM24.get(d); if (c && c.sig === sig) return c.v;
  const lin = new Set(), big = new Set(); for (const id of ids) { const k = lineage28(artById(id)); if (!k) continue; lin.add(k); if (artTier(d, id) >= 2) big.add(k); }
  let v = 0; if (lin.size >= SYN24.lineages) { const m = Math.max(0, ...Object.keys(CATS).map((k) => mastery(d, k))); v = big.size >= SYN24.convLin && m >= SYN24.convMast ? 2 : big.size < SYN24.convLin || m < SYN24.distMast ? 1 : 0; }
  PM24.set(d, { sig, v }); return v;
}
/* ---- loop187 v2.9 練武習性（沿用既有 25 特質與 6 價值觀，不另立欄位） ---- */
export const TEMPER29 = { zheng: ['honest', 'diligent', 'stubborn', 'rigid'], sectV: 25, fameV: 25, xiaV: 25, lingK: 1.12, steal: 6, qingK: 1.18, small: 6 }; /* loop193：價值觀是 -30..40，不是 0..100 */
const TRAITS29 = { zheng: ['honest', 'diligent', 'stubborn', 'rigid'], ling: ['clever', 'free', 'nimble'], xiao: ['hypocrite', 'bold', 'rascal', 'glib'] };
/* loop203：衍生、不存檔。負＝好練法，正＝好打法，夾在 −3..3。 */
export function appetite31(d) {
  if (!d) return 0;
  const p = d.personality || [], v = d.values || {};
  let a = 0;
  for (const t of ['honest', 'diligent', 'rigid', 'quiet']) if (p.includes(t)) a -= 2;
  for (const t of ['stubborn', 'gentle', 'kind', 'worrier']) if (p.includes(t)) a -= 1;
  if ((v.sect ?? 0) >= 25) a -= 1;
  for (const t of ['bold', 'nimble', 'playful']) if (p.includes(t)) a += 2;
  for (const t of ['brave', 'clever', 'free', 'glib', 'rascal', 'hypocrite', 'drinker', 'lazy']) if (p.includes(t)) a += 1;
  if ((v.fame ?? 0) >= 25 || (v.free ?? 0) >= 25) a += 1;
  return Math.max(-3, Math.min(3, a));
}
/* 純內功沒有 mode，練功類別視同練法。 */
export const trainKind31 = (a) => (!a ? null : a.school === 'inner' ? 'lian' : (a.mode || null));
/* loop208：只在同一優先層裡改次序。A>0 打法靠前。A<0 打法靠後，築基、練法、內功維持原順序。 */
export function appetiteOrder31(d, a, b) {
  if (!d) return 0;
  const A = appetite31(d);
  if (!A || !a || !b) return 0;
  const da = (x) => trainKind31(x) === 'da';
  if (A > 0) return da(b) - da(a);
  return da(a) - da(b);
}
/* 正好一個標籤，或沒有。懲罰幅度：勤奮或 values.wu≥25 時把「從 1 扣掉的量」減半，再套下限。 */
export function tasteLabel31(d, a) {
  if (!d) return null;
  const A = appetite31(d), k = trainKind31(a);
  if (!A || (k !== 'da' && k !== 'lian' && k !== 'base')) return null;
  const abs = Math.abs(A), half = (d.personality || []).includes('diligent') || (d.values?.wu ?? 0) >= 25;
  if ((A > 0 && k === 'da') || (A < 0 && (k === 'lian' || k === 'base'))) return ['投其所好', 1 + 0.04 * abs];
  if (A > 0) return ['枯燥難耐', 1 / (1 + 0.05 * abs * (half ? 0.5 : 1))];
  return ['嫌其花俏', 1 / (1 + 0.025 * abs * (half ? 0.5 : 1))];
}
/* loop205：診斷鉤子。預設不掛，不寫進存檔、不抽 rand。沒人聽的時候多一次屬性讀取。 */
export const meter32 = { note: null };
/* 完成一次練功才呼叫。A>0：非打法 +1、打法 −2。A<0 用對稱計數（規格只寫了 A>0 的加減），否則坐不住門檻到不了。樂趣只改 A>0。 */
export function noteTrain31(d, a) {
  if (!d || !a) return null;
  const A = appetite31(d);
  if (meter32.note) meter32.note({ kind: 'train', id: d.id, sect: d.sectId || null, A, k: trainKind31(a), post: !!(A && (d.bore31 || 0) >= 6 - Math.abs(A)), dao: a.school === 'inner' && dao31(d) }); /* loop208：坐不住是加點前的門檻，分派只給診斷 */
  if (!A) return null;
  const k = trainKind31(a), da = k === 'da';
  let delta = 0;
  if (A > 0) delta = da ? -2 : 1;
  else if (da) delta = 1;
  else if (k === 'base' || k === 'lian') delta = -2;
  if (delta) d.bore31 = Math.max(0, (d.bore31 || 0) + delta);
  if (A > 0) { const fun0 = d.needs?.fun ?? 60; (d.needs ??= {}).fun = Math.max(0, Math.min(100, fun0 + (da ? 2 : -Math.abs(A) * 0.7))); }
  return { bore: d.bore31 || 0, fun: d.needs?.fun };
}
const ACT_OUT31 = ['hunt', 'spar', 'defend'], ACT_IN31 = ['train', 'meditate', 'study'];
/* 取代 fieldLeanMul29。遠征不在評分動作裡，這裡不加。不抽 rand。 */
export function appetiteActMul31(d, act) {
  const A = appetite31(d);
  if (A > 0 && ACT_OUT31.includes(act)) return 1 + 0.03 * A;
  if (A < 0 && ACT_IN31.includes(act)) return 1 + 0.03 * Math.abs(A);
  return 1;
}
/* 回 { zheng 守正厚積, ling 靈動跳階, xiao 梟雄強練, qing 至情清修（本刻是否生效） } */
export function temperOf(d) { if (!d) return {}; const p = d.personality || [], v = d.values || {}, has = (L) => L.some((t) => p.includes(t));
  const A = appetite31(d), xiao = !p.includes('honest') && !p.includes('rigid') && (has(TRAITS29.xiao) || (v.fame ?? 0) >= TEMPER29.fameV || (v.wu ?? 0) >= TEMPER29.fameV);
  const zheng = has(TRAITS29.zheng) || (v.sect ?? 0) >= TEMPER29.sectV || A <= -2;
  const qing = (p.includes('chi') && d.pairMul > 0) || (p.includes('quiet') && !!d.small29);
  return { zheng, ling: has(TRAITS29.ling) || (A >= 2 && !xiao), xiao, qing }; }
/* ---- loop181 v2.8 四階內功催動（innerDrive28）與經脈內傷（qiInjury） ---- */
export const CHAMP28 = { train: 1.25, aoe: 0.25 }; /* loop183 當屆大比首徒＝首徒 headTrain 1.5 的一半加成 */
export const DRIVE28 = { t1: 1.25, t1s: 1.25, t2: 1, t3: 0.78, t4: 0.65, med3: 1.15, inj: 8, injSub: 5, injWarn: 20, injHeavy: 50, injMin: 0.10, injMax: 0.25, hp: 8, mood: 4, med: 8, heal: 25, rest: 6 }; /* loop196：t1＝本門正宗；t1s 退役（不再另乘三才） */
/* loop209：公共武學看各武學的 isPublic。順序跟武學表，呼叫端只用 includes。 */
export const PUBLIC28 = [];
/* 最強一招的每秒傷害（傷害 ÷ 冷卻）。範圍留在結算，不進這個分母。沒有招式的內功當 1，曲線不進出手。 */
function bindBestDps(a) {
  const ids = new Set();
  if (a.tech) ids.add(a.tech);
  for (const m of a.techs || []) ids.add(m);
  for (const sp of a.specials || []) if (sp.move) ids.add(sp.move);
  for (const m of MOVES) if (m.fx === a.id) ids.add(m.id);
  let best = 0;
  for (const id of ids) {
    const mv = MOVES.find((m) => m.id === id);
    if (!mv || !(mv.cd > 0) || !(mv.dmg > 0)) continue;
    const dps = mv.dmg / mv.cd;
    if (dps > best) best = dps;
  }
  a.bestDps = best || 1;
}
/* loop209：mode、qiScale、cats、isPublic 已在字面量。這裡只補 isInner／kind，並讓 ART_CAT、PUBLIC28 指向同一份。缺了就丟。 */
export function normalizeArts(list = ARTS) {
  for (const a of list) {
    if (!a?.id || !a.cats || typeof a.cats !== 'object') throw new Error(`${a?.id || '?'} 缺 cats`);
    if (typeof a.isPublic !== 'boolean') throw new Error(`${a.id} 缺 isPublic`);
    if (a.school === 'inner') {
      if (a.mode != null || a.qiScale != null) throw new Error(`${a.id} 純內功不設 mode`);
    } else if (a.mode !== 'base' && a.mode !== 'lian' && a.mode !== 'da') throw new Error(`${a.id} 缺 mode`);
    else if (!(typeof a.qiScale === 'number' && a.qiScale >= 0 && a.qiScale <= 0.6)) throw new Error(`${a.id} 缺 qiScale`);
  }
  for (const a of list) {
    a.isInner = a.school === 'inner' || !!a.cats.neigong;
    a.kind = a.isInner ? 'inner' : a.school === 'step' ? 'step' : 'outer';
    ART_CAT[a.id] = a.cats;
    stampCard(a);
    bindBestDps(a);
  }
  if (list === ARTS) {
    const next = list.filter((a) => a.isPublic).map((a) => a.id);
    PUBLIC28.length = 0;
    for (const id of next) PUBLIC28.push(id);
  }
  return list;
}
normalizeArts();
export const BAN28 = ['jiuyinClaw', 'qishangFist'];
/* 本門專屬：own24＝本門；或沒有 own24 的本門樹名門 classic（如華山紫霞） */
export const own28 = (d, a) => !!(a && d && !PUBLIC28.includes(a.id) && (a.own24 ? a.own24 === d.sectId : !!(a.classic && d.stree?.includes(a.id))));
/* loop183（t194 addendum）主修內功＝有效分最高 */
export const innerScore28 = (d, m) => artTier(d, m.id) * 30 + (m.grade || 1) * 15 + (d.arts?.[m.id]?.xp || 0) * 0.2 + (m.own24 === d.sectId ? 20 : 0);
/* loop202：練法把本次 gx 的 30% 回饋內功，築基回饋 15%。打法不回饋。只在有修練結算時 */
const FEED31 = { lian: 0.3, base: 0.15, lianLabel: '練招養氣', baseLabel: '築基培元' };
function feedTarget31(d, mode) {
  if (mode === 'base') return baseInner28(d);
  const M = mainInner28(d);
  if (M && own28(d, M)) return M;
  return ownInners28(d).sort((x, y) => innerScore28(d, y) - innerScore28(d, x))[0] || null;
}
export function feedInner31(d, a, gx, g) {
  if (!d || !g || !((g.raw ?? 0) > 0) || !(gx > 0) || !a || isInner(a)) return null;
  const share = FEED31[a.mode]; if (!share) return null;
  const target = feedTarget31(d, a.mode);
  if (!target || target.id === a.id || !d.arts?.[target.id]) return null;
  const ir = d.arts[target.id], xp0 = ir.xp || 0;
  ir.xp = clampTrainXp(d, target, xp0, Math.min(curCap(d, target), xp0 + share * gx));
  const gm = settleGrowth(d, target, ir, { src: 'train', raw: g.raw * share, xp0, xp1: ir.xp });
  if (!(ir.xp > xp0 + 1e-9)) return null;
  const xp = ir.xp - xp0;
  if (meter32.note) meter32.note({ kind: 'feed', mode: a.mode, xp });
  return { id: target.id, name: target.name, label: a.mode === 'lian' ? FEED31.lianLabel : FEED31.baseLabel, xp, gm };
}
export function mainInner28(d) {
  if (!d?.arts) return null; let best = null, bs = -Infinity;
  for (const id of Object.keys(d.arts)) { const a = artById(id); if (!a || !isInner(a)) continue; const v = innerScore28(d, a); if (v > bs) { best = a; bs = v; } }
  return best;
}
const ownInners28 = (d) => Object.keys(d?.arts || {}).map(artById).filter((a) => a && isInner(a) && own28(d, a));
/* 本門內功最高火候（學新高階內功不掉功力） */
export const ownMaxTier28 = (d) => ownInners28(d).reduce((m, a) => Math.max(m, artTier(d, a.id)), -1);
/* 根基：本門一品內功火候 */
/* loop186 v2.9 決定 3：本門一品內功優先；無則取本門樹最低品本門內功（二品）或吐納（在本門樹或為本門內功前置），取火候高者，同階偏本門 */
const bxp28 = (d, a) => d.arts[a.id].xp;
export function baseInner28(d) {
  const own = ownInners28(d), g1 = own.filter((a) => (a.grade || 1) <= 1).sort((a, b) => bxp28(d, b) - bxp28(d, a))[0]; if (g1) return g1;
  const lo = own.filter((a) => d.stree?.includes(a.id) || a.own24 === d.sectId).sort((a, b) => (a.grade || 1) - (b.grade || 1) || bxp28(d, b) - bxp28(d, a))[0] || null;
  const br = d.arts?.breath && (d.stree?.includes('breath') || (d.stree || []).some((id) => { const x = artById(id); return isInner(x) && own28(d, x) && x.req.some((r) => r.art === 'breath'); })) ? artById('breath') : null;
  if (!br) return lo; if (!lo) return br; return artTier(d, br.id) > artTier(d, lo.id) ? br : lo;
}
export const ROOT28 = { train: [1, 1, 1.15, 1.28, 1.40], move: [0, 0, 0.06, 0.12, 0.18], baseXp: 55, traits: ['honest', 'diligent', 'stubborn', 'rigid'], breathMove: [0, 0, 0.06, 0.10, 0.10] };
export function rootFoundation28(d) { const b = baseInner28(d); return b ? Math.max(0, artTier(d, b.id)) : 0; }
/* 練功加速：根基 b 練到大成以上，修更高品本門內功（吐納根基：修二品以上本門內功） */
export function rootTrain28(d, a) { const b = baseInner28(d); if (!b || b.id === a.id || !isInner(a) || !own28(d, a)) return 1; const t = artTier(d, b.id); if (t < 2) return 1; if (b.id !== 'breath' && (a.grade || 1) <= (b.grade || 1)) return 1; return ROOT28.train[Math.min(4, t)]; }
const rootMove28 = (d) => { const b = baseInner28(d); if (!b) return 0; const t = artTier(d, b.id); if (t < 2) return 0; const hi = ownInners28(d).some((a) => a.id !== b.id && (a.grade || 1) >= Math.max(2, (b.id === 'breath' ? 2 : (b.grade || 1) + 1)) && artTier(d, a.id) >= 1);
  if (b.id === 'breath') return hi ? ROOT28.breathMove[Math.min(4, t)] : 0; return hi || ((b.grade || 1) >= 2 && Object.keys(d.arts).some((id) => { const x = artById(id); return x && !isInner(x) && own28(d, x) && (x.grade || 1) > (b.grade || 1) && artTier(d, id) >= 1; })) ? ROOT28.move[Math.min(4, t)] : 0; };
const clash28 = (x, y) => (x === 'yang' && y === 'yin') || (x === 'yin' && y === 'yang');
/* #408 回 { tier, mul }。正宗的 1.25 與虛浮的 0.78 仍不乘。第四階是硬催別派武學，威力代價恢復 0.65。根基那一截另算。 */
const ownInnerHolds28 = (d, g) => ownInners28(d).some((x) => (x.grade || 1) >= g - 1 && artTier(d, x.id) >= Math.max(1, g - 1));
export function innerDrive28(d, a) {
  if (!d || !a || (isInner(a) && a.school === 'inner')) return { tier: 0, mul: 1 }; /* 純內功不催動。玉女心經 school 是 palm，仍算催動 */
  const M = mainInner28(d), g = a.grade || 1, conv = polymath24(d) === 2;
  const held = !!(M && (M.grade || 1) >= g - 1 && artTier(d, M.id) >= g - 1); /* 主運內功品階與火候都撐得住 */
  const rb = 1 + rootMove28(d);
  const root = rb > 1 ? { root: true } : {};
  if (a.id === 'qishangFist' && !conv && artTier(d, 'shenghuoXinfa') < 2 && artTier(d, 'jiuyang') < 2) return { tier: 4, mul: DRIVE28.t4 }; /* 一練七傷：第四階，並吃逆催的威力代價 */
  if (a.id === 'jiuyinClaw' && !conv && (!M || (M.grade || 1) < 2 || artTier(d, M.id) < 2)) return { tier: 4, mul: DRIVE28.t4 }; /* 強練禁術：第四階，並吃逆催的威力代價 */
  if (own28(d, a) && ownInnerHolds28(d, g)) return { tier: 1, mul: rb, ...root };
  const foreign = (a.own24 && a.own24 !== d.sectId) || (BAN28.includes(a.id) && !own28(d, a));
  if (foreign && !conv) {
    /* 第四階只在真陰陽相沖，或名門沒有二品內功卻硬催三品陰／陽外功。威力代價是 0.65，內傷另記。 */
    const clash = !!(M && clash28(attrOf(M), attrOf(a)));
    const bare = d.sectId !== 'wuming' && g >= 3 && (attrOf(a) === 'yin' || attrOf(a) === 'yang') && (!M || (M.grade || 1) < 2);
    if (clash || bare) return { tier: 4, mul: DRIVE28.t4 }; /* 異屬相沖，或沒有夠深的內功卻硬催：威力 ×0.65 */
    if (held && (M.grade || 1) >= 2 && (attrOf(M) === 'he' || attrOf(M) === attrOf(a))) return { tier: 2, mul: 1 };
    return { tier: 3, mul: 1 };
  }
  if (a.isPublic && held) return { tier: 2, mul: rb, ...root };
  if (g >= 2 && !held) return { tier: 3, mul: 1 };
  return { tier: 2, mul: rb, ...root };
}
/* #405 六門內功被動。吐納的回氣仍走 restQi，這裡不另乘。化功發動時，這一擊不再疊別的被動。 */
export const NG_EASE = 0.02;
export function jiuyangEase(d, dt) {
  if (!d || artTier(d, 'jiuyang') < 2 || !(d.qiInjury > 0)) return 0;
  const q0 = d.qiInjury;
  d.qiInjury = Math.max(0, q0 - NG_EASE * dt);
  return q0 - d.qiInjury;
}
export function innerOnHit(s, who, other, ctx = {}) {
  const out = { power: ctx.power, heal: 0, steal: 0, huntian: false, line: '' };
  if (!who) return out;
  if (artTier(who, 'huagongDafa') >= 1) {
    const take = Math.min(3, Math.max(0, other?.qi || 0));
    if (other && take > 0) { other.qi -= take; out.steal = take; out.line = `${who.name}化功大法吸走一點內力`; if (s && !ctx.silent) log(s, out.line, 'mid'); }
    return out;
  }
  if (ctx.fired?.art === 'xianglong' && artTier(who, 'huntianGong') >= 1) {
    out.huntian = true;
    out.line = `${who.name}混天氣功托住降龍的內力，這一掌仍震得開`;
    if (s && !ctx.silent) log(s, out.line, 'mid');
  }
  if (ctx.move && isSwordMove(ctx.move) && artTier(who, 'zixia') >= 1) {
    if (out.power != null) out.power *= 1.05;
    if (artTier(who, 'zixia') >= 2 && spendQi(who, 1)) {
      who.hp = Math.min(100, (who.hp ?? 0) + 2);
      out.heal = 2;
      const line = `${who.name}紫霞神功在劍招裡補了一口氣`;
      out.line = out.line ? `${out.line}；${line}` : line;
      if (s && !ctx.silent) log(s, line, 'mid');
    }
  }
  if (yunvLinked(s, who) && out.power != null) out.power *= YUNV_PAIR;
  if (artTier(who, 'biboXinfa') >= 1 && noteQi(who, 1)) {
    const line = `${who.name}碧波心法把瀉出的真氣收回來一點`;
    out.bibo = true;
    out.line = out.line ? `${out.line}；${line}` : line;
    if (s && !ctx.silent) log(s, line, 'mid');
  }
  if (artTier(who, 'emeiJiuyang') >= 1 && noteQi(who, 1)) {
    const line = `${who.name}峨眉九陽功把這一招化進內力`;
    out.emei = true;
    out.line = out.line ? `${out.line}；${line}` : line;
    if (s && !ctx.silent) log(s, line, 'mid');
  }
  return out;
}
const yunvLinked = (s, who) => !!(who?.arts?.yunv && s?.ds?.some((o) => o !== who && o.arts?.yunv && !o.away && (o.hp ?? 1) > 0));
const noteQi = (who, n) => { const before = qiOf(who); addQi(who, n); return qiOf(who) > before; };
export function innerOnGetHit(s, who, ctx = {}) {
  const out = { qi: 0, hp: 0, line: '' };
  if (!who) return out;
  if (artTier(who, 'wudangJiuyang') >= 3) {
    addQi(who, 2);
    who.hp = Math.min(100, (who.hp ?? 0) + 1);
    out.qi = 2;
    out.hp = 1;
    out.line = `${who.name}純陽無極功把來力化進氣血`;
    if (s && !ctx.silent) log(s, out.line, 'mid');
  }
  const n = zhuangOpen(who).length;
  if (n > 0) {
    who.hp = Math.min(100, (who.hp ?? 0) + n);
    out.hp += n;
    out.zhuang = n;
    const line = `${who.name}臨濟十二莊托住這一擊`;
    out.line = out.line ? `${out.line}；${line}` : line;
    if (s && !ctx.silent) log(s, line, 'mid');
  }
  return out;
}
/* loop196：腳程與閃避用熟練最高的輕功身法催動係數 */
export function stepDrive28(d) {
  if (!d) return 1; let b = null;
  for (const id of Object.keys(d.arts || {})) { const a = artById(id); if (a?.school !== 'step') continue; if (!b || (d.arts[id].xp || 0) > (d.arts[b.id].xp || 0)) b = a; }
  return b ? innerDrive28(d, b).mul : 1;
}
/* 主修外功：指定的非內功 focus，否則熟練最高的非內功 */
export function mainOuterArt(d) {
  const f = d?.focus && d.arts?.[d.focus] ? artById(d.focus) : null; if (f && !isInner(f)) return f;
  let best = null; for (const id of Object.keys(d?.arts || {})) { const a = artById(id); if (a && !isInner(a) && (!best || d.arts[id].xp > d.arts[best.id].xp || (d.arts[id].xp === d.arts[best.id].xp && (a.grade || 1) > (best.grade || 1)))) best = a; } return best; /* 同熟練取高品 */
}
export const injuryMul28 = (d) => { const q = !!d ? d.qiInjury || 0 : 0; return q < DRIVE28.injWarn ? 1 : 1 - (DRIVE28.injMin + (DRIVE28.injMax - DRIVE28.injMin) * Math.min(1, (q - DRIVE28.injWarn) / (100 - DRIVE28.injWarn))); };
/* 練功／切磋／參戰後：主修外功逆催則累積內傷；回 true＝本次首次跨過 20 */
export function qiInjuryAdd28(s, d) {
  if (!s || !d) return false; const m = mainOuterArt(d), mainHit = !!m && innerDrive28(d, m).tier === 4, a = mainHit ? m : clashOuter28(d); if (!a) return false;
  const q0 = d.qiInjury || 0; d.qiInjury = Math.min(100, q0 + (mainHit ? DRIVE28.inj : DRIVE28.injSub)); /* loop186 決定 1：主修 +8、副修第四階 +5 */
  if (q0 < DRIVE28.injWarn && d.qiInjury >= DRIVE28.injWarn) { (s.v28n ??= {}).inj = (s.v28n.inj || 0) + 1; return a; } return false;
}
/* loop186：主修外功非第四階時，找身上其他第四階外功（高品優先，再比熟練） */
export function clashOuter28(d) { if (!d || !d.arts) return null; const m = mainOuterArt(d); if (m && innerDrive28(d, m).tier === 4) return m; let best = null;
  for (const id of Object.keys(d.arts)) { const a = artById(id); if (!a || isInner(a) || innerDrive28(d, a).tier !== 4) continue; if (!best || (a.grade || 1) > (best.grade || 1) || ((a.grade || 1) === (best.grade || 1) && d.arts[id].xp > d.arts[best.id].xp)) best = a; } return best; }
/* loop186：一群人實戰後累積並記日誌 */
export function qiInjuryFight28(s, team, logf) { if (!s) return; for (const d of team) { const w = qiInjuryAdd28(s, d); if (w && logf) logf(s, `【經脈暗傷】${d.name}強以異種內息催動他派武學《${w.name}》，真氣逆行，經脈隱隱作痛！`); } }
export function qiInjuryCure28(s, d, amt) { const q0 = d?.qiInjury || 0; if (!q0) return false; d.qiInjury = Math.max(0, q0 - amt); if (!d.qiInjury) { (s.v28n ??= {}).cure = (s.v28n.cure || 0) + 1; return true; } return false; }
export const styleDamage = (d) => { if (!d) return 1; return (polymath24(d) === 2 ? SYN24.conv : 1) * injuryMul28(d); }; /* loop181：同門成套傷害改由 innerDrive28 逐招給 */
export const styleBadges24 = (d) => [d?.champ28 ? '【大比首徒】' : '', polymath24(d) === 2 ? '【萬流歸宗】' : polymath24(d) === 1 ? '【雜學分心】' : '', (d?.qiInjury || 0) >= DRIVE28.injWarn ? '⚠️【經脈內傷】' : '', !!d && rootMove28(d) > 0 ? '【根基渾厚】' : '', qiArtBadge24(d) ? '【以氣御劍】' : '', swordFast24(d) ? '【唯快不破】' : '', d?.xiao29 ? '【梟雄強練】' : d?.base28 ? '【守正厚積】' : temperOf(d).qing ? '【至情清修】' : temperOf(d).ling ? '【靈動跳階】' : ''].filter(Boolean); /* loop204：本門正宗改逐招顯示；以氣御劍／唯快不破看武學類別 */

// ==== #435 N27 見招拆招：前搖起手抽反應，截擊 → 進身閃 → 招架 → 中招；巡山、會武、江湖挑戰用期望值 ====
// 架勢空了：對方下一招不判接法，直接重擊 ×CLASH.heavy，蓋「現」。看破成立：攻方架勢大掉，守方下一招必中。
export const CLASH = {
  windIn: 0.5, windHua: 0.2,                 /* 前搖佔冷卻：入門 0.5、化境 0.2，中間照火候線性 */
  monWind: 0.45,                             /* 鼠、野豬的前搖佔牠的冷卻 */
  post: { d: 100, rat: 30, boar: 70, bandit: 60, def: 50 }, regenDelay: 2.5, regen: 12,
  heavy: 2,
  read: { drop: 45 },
  dodge: { qi: 3 },
  time: { reaction: 0.36, insight: 30, tier: 0.6, agility: 50, depthHalf: 10, wuHalf: 10, strike: 0.55, strikeTier: 0.4, step: 0.26, guard: 0.1, jitter: 0.25, fret: 0.6, counterForce: 0.5, parryRecover: 0.2, hitRecover: 0.35 },
  fret: { dodge: 0.18, parry: 0.12, hit: 0.32, strike: 0.22, steady: 1.5, hot: 0.7, normal: 1, rageTime: 3, rageFxTime: 0.8, force: 1.3, qi: 1.5, attackQi: 2 },
  parry: { drop: 14, joltDrop: 20 },
  depth: { rat: 1, boar: 2, bandit: 2 }, monQi: { rat: 4, boar: 12, bandit: 10 },
};
const clamp01 = (x, hi = 1) => Math.max(0, Math.min(hi, x));
export const windFrac = (tier) => CLASH.windIn + (CLASH.windHua - CLASH.windIn) * Math.max(0, Math.min(4, tier | 0)) / 4;
/* 一招的前搖秒數：cd × 前搖比例（看這招所屬武學的火候） */
export function windOf(d, mvId, cd) {
  const body=bodyMove(mvId)||TECHNIQUE_MOVES.find(m=>m.id===mvId), a = artOfMove(mvId) || artById(mvId), tier = a && d?.arts?.[a.id] ? artTier(d,a.id) : 0;
  const start = body?.wind ?? cd * windFrac(0) * (a?.tags?.includes('快') ? .75 : 1) * (a?.id === 'kuihua' && zjHas(d,'kuihua') ? .1 : 1);
  const skill = body?.skill === 'strength' || a?.weapon === 'staff' ? 'strength' : 'agility';
  return practiceWindow(d,mvId,start,{tier,skill}).wind * (d?.part?.where === 'hand' ? PART.hand : 1);
}
export function combatMoves(d,distance=0) {
  if(isMon(d)&&FOE_ACTIONS[d.k]){
    const weapon=d.weapon||['blade','staff','fist'][(d.i||0)%3];
    return [...FOE_ACTIONS[d.k].moves,...TECHNIQUE_MOVES.filter(m=>d.glimmer?.known.includes(m.id)&&moveAvailable(d,m))].filter(m=>(!m.requiresSurvived||d.survived)&&(!m.once||!d.opened)&&(!m.minDistance||distance>=m.minDistance)&&(!m.weapon||m.weapon===weapon)).map(m=>({...m,cd:m.wind+BODY_TIMING.recovery}));
  }
  return (d.moves||['fist']).map(id=>MOVES.find(m=>m.id===id)).filter(m=>m&&moveAvailable(d,m));
}
export function chooseCombatMove(s,d,target,rnd,options={}) {
  const distance=options.distance??Math.hypot((d.pos?.[0]||0)-(target.pos?.[0]||0),(d.pos?.[1]||0)-(target.pos?.[1]||0));
  const facts=techniqueFacts(s,d,target);
  const choices=(options.moves||combatMoves(d,distance)).filter(m=>!m.technique||matchesTechnique(TECHNIQUES.find(r=>r.id===m.id),facts)).map(m=>({...m,actualWind:isMon(d)?practiceWindow(d,m.id,m.wind).wind:windOf(d,m.id,m.cd),force:moveStats(d,m.id).force}));
  return selectAction(s,d,target,choices,rnd,{distance,composure:composure(d),postureCapacity:postureMax(d),armor:moveStats(target).armor,...options});
}
export function fastestMove(d) {
  const moves = (d?.moves || []).map((id) => MOVES.find((m) => m.id === id)).filter((m) => m && (!m.tool || d.tools?.[m.tool]));
  return moves.sort((a,b) => windOf(d,a.id,a.cd) - windOf(d,b.id,b.cd))[0] || bodyMove('bodyPunch');
}
export function timedMoveId(w,move){const declared=w?.swing?.mv||w?.bswing?.mv;return move||(typeof declared==='object'?declared.id:declared)||(isMon(w)?foeAction(w)?.id:fastestMove(w)?.id)||'fist';}

export const isMon = (w) => !!w && w.k != null && !w.arts;
export const postureMax = (w) => (isMon(w) ? CLASH.post[w.k] ?? CLASH.post.def : CLASH.post.d);
export function postureOf(w) { if (w.posture == null) w.posture = postureMax(w); return w.posture; }
export function postureHit(s, w, amt) { postureOf(w); w.posture = Math.max(0, w.posture - amt); w.postT = s?.t ?? 0; return w.posture; }
export function postureRegen(s, w, dt) { postureOf(w); if ((s?.t ?? 0) - (w.postT ?? -1e9) >= CLASH.regenDelay) w.posture = Math.min(postureMax(w), w.posture + CLASH.regen * dt); }
/* 招式深淺：弟子＝這招所屬武學火候 + 1；獸看種類 */
export function depthOf(atk, mvId) { if (isMon(atk)) return CLASH.depth[atk.k] ?? 1; const a = artOfMove(mvId); return (a && atk.arts?.[a.id] ? artTier(atk, a.id) : 0) + 1; }
const qiPow = (w) => (isMon(w) ? CLASH.monQi[w.k] ?? 6 : (qiOf(w) || 0) + (w.skills?.strength || 0));
export const MOVE = {
  force: 14, tierForce: 6, strengthForce: 0.2, hardForce: 12, plainForce: 10,
  speed: 20, tierSpeed: 5, quickSpeed: 18, windSpeed: 5, minWind: 0.1, windSpeedMax: 18,
  armor: 5, tierArmor: 4, hardArmor: 10, jiuyangArmor: 25, taijiHalfForce: 20,
  monsters: { boar: { force: 40, speed: 18, armor: 32, type: 'charge' }, rat: { force: 6, speed: 30, armor: 0, type: 'bite' }, blade: { force: 25, speed: 22, armor: 16, type: 'blade' }, fist: { force: 14, speed: 28, armor: 8, type: 'fist' } },
  extremes: { xuantie: { force: 100, armor: 55 }, xianglong: { force: 95, armor: 45 }, dugu: { force: 12, speed: 80 }, taiji: { force: 8 }, taijiSword: { force: 8 }, kuihua: { speed: 95 } },
};
/* 每招同一套屬性：勁、速（數字越高越快）、霸體。山賊的刀與空手輪流分配。 */
export function moveStats(w, moveId, wind = 0.5) {
  if (isMon(w)) {
    const p=FOE_ACTIONS[w.k],m=TECHNIQUE_MOVES.find(m=>m.id===moveId)||p?.moves.find(m=>m.id===moveId)||foeAction(w);
    if (p) return { force: m.force * (w.raging ? CLASH.fret.force : 1), speed: p.speed, armor: p.armor, type: m.cut ? 'blade' : m.bite ? 'bite' : 'fist' };
    return MOVE.monsters[w.k] || MOVE.monsters.fist;
  }
  const body=bodyMove(moveId)||TECHNIQUE_MOVES.find(m=>m.id===moveId); if (body) return { force: body.force + (w.skills?.strength || 0) * BODY_TIMING.forceSkill, speed: 1 / body.wind, armor: MOVE.armor, type: body.type };
  const a = artOfMove(moveId) || artById(moveId), t = a && w?.arts?.[a.id] ? artTier(w, a.id) : 0, tags = a?.tags || [];
  const force = MOVE.force + t * MOVE.tierForce + (w?.skills?.strength || 0) * MOVE.strengthForce + (tags.includes('剛') ? MOVE.hardForce : 0) + (tags.includes('拙') ? MOVE.plainForce : 0);
  const speed = MOVE.speed + t * MOVE.tierSpeed + (tags.includes('快') ? MOVE.quickSpeed : 0) + Math.min(MOVE.windSpeedMax, MOVE.windSpeed / Math.max(MOVE.minWind, wind));
  const armor = MOVE.armor + t * MOVE.tierArmor + (tags.includes('剛') || tags.includes('拙') ? MOVE.hardArmor : 0) + (w?.arts?.jiuyang && artTier(w, 'jiuyang') >= 3 ? MOVE.jiuyangArmor : 0);
  const extreme = MOVE.extremes[a?.id] || {};
  return { force: (extreme.force ?? force) * (w?.raging ? CLASH.fret.force : 1), speed: extreme.speed ?? speed, armor: extreme.armor ?? armor, type: a?.type || 'fist' };
}
/* 太極借來勁：來招越重，可卸回去的比例越高；人、獸、賊共用。 */
export const taijiReturn = (atk, moveId, wind) => { const force = moveStats(atk, moveId, wind).force; return force / (force + MOVE.taijiHalfForce); };
export function breakWindup(s, atk, def, moveId, wind) {
  if (!def?.swing && !def?.bswing) return false;
  const strike = moveStats(atk, moveId, wind), guard = moveStats(def, def.swing?.mv || def.bswing?.mv, def.swing?.wind || def.bswing?.wind);
  const observed = artOfMove(moveId)?.id === 'dugu' && isMon(def) && (s?.codex?.[def.k]?.insight || 0) >= ZJ.dugu.insight;
  const bypass=atk.techniqueContact?.at===s?.t&&atk.techniqueContact.target===(def.uid||def.id||def.k)&&atk.techniqueContact.bypassArmor;
  if(!observed&&!bypass&&strike.force<=guard.armor)return false;
  def.swing = null; def.bswing = null; postureHit(s, def, 25 + strike.force * 0.25);
  if (s) { (s.fx ||= []).push({ kind: 'clash', word: '斷', color: '#ffb05a', pos: [...(def.pos || [0, 0])], ttl: 0.8 }); s.breakN = (s.breakN || 0) + 1; }
  return true;
}
// N36 預測包含走近的對手；已起手者不能藉靠牆刪掉來招。
export function assessLoad(s,def,extra=null,ctx={}) {
  const busy=Math.max(0,(def.busyUntil||0)-(s?.t||0),(def.swing?.at||0)-(s?.t||0),(def.bswing?.at||0)-(s?.t||0),(def.downUntil||0)-(s?.t||0));
  const rows=opponents(s||{},def,extra).filter(a=>a.pos&&def.pos).filter(a=>{
    const target=a.swing?.tgt||a.bswing?.tgt||a.intentTarget||a.foe;
    if(a===extra)return true;
    if(!a.swing&&!a.bswing&&a.tactics?.action==='flee')return false;
    // 持械待命不是已選的攻擊；只有宣告目標/在途招納入，避免兩個守勢角色互算假來招而永久停住。
    return !!target&&target===(def.id||def.uid);
  }).map(a=>{
    const swing=a.swing||a.bswing,move=a===extra?timedMoveId(a,ctx.move):timedMoveId(a),action=FOE_ACTIONS[a.k]?.moves.find(m=>m.id===move)||MOVES.find(m=>m.id===move);
    const wind=a===extra&&ctx.wind!=null?ctx.wind:swing?.wind??(isMon(a)?practiceWindow(a,move,action?.wind||BODY_TIMING.reaction).wind:windOf(a,move,action?.cd||1));
    const travel=Math.max(0,distance(a.pos,def.pos)-(action?.range||RING.engage))/movementSpeed(a);
    const guard=def.bare?BODY_TIMING.guard:CLASH.time.guard;
    return {attacker:a.uid||a.id||a.k,move,need:familiarReaction(def,a,move,s?.codex)+guard+busy,window:Math.max(BODY_TIMING.simple,wind),travel,active:!!swing};
  });
  return loadFromForecast(def,rows);
}
export function combatTacticStep(s,d,dt,H={}){
  return stepTactic(s,d,assessLoad(s,d),dt,{temper:composure(d),normalTemper:CLASH.fret.normal,anger:a=>{a.raging=true;a.rageUntil=s.t+CLASH.fret.rageTime;},...H});
}
/* 同一組反應時間區間決定截擊、進身閃、招架。面板讀的是各結果的無條件機率。 */
export function clashTimes(s, atk, def, ctx = {}) {
  const T = CLASH.time;
  const wind = Math.max(0, ctx.available ?? ctx.wind ?? 0.5);
  const agi = isMon(def) ? (def.agi ?? moveStats(def).speed) : (def.skills?.agility || 0);
  const move = timedMoveId(atk,ctx.move), reaction = familiarReaction(def, atk, move, s?.codex);
  const jitter = (1 / PRACTICE.reactionShape) * (1 + (def.fret || 0) * T.fret);
  const response = isMon(def) ? foeAction(def) : fastestMove(def);
  const strike = isMon(def) ? practiceWindow(def,response?.id || 'fist',response?.wind || T.strike).wind : windOf(def,response.id,response.cd);
  const step=BODY_TIMING.step/(1+agi/T.agility)*reaction/(PRACTICE.reactionFloor+PRACTICE.reactionSpan);
  const guard = def.bare ? BODY_TIMING.guard : T.guard;
  const busy = Math.max(0, (def.busyUntil || 0) - (s?.t ?? 0), (def.swing?.at || 0) - (s?.t ?? 0), (def.bswing?.at || 0) - (s?.t ?? 0),(def.downUntil||0)-(s?.t??0));
  const load=assessLoad(s,def,atk,ctx).L;
  return { wind: Math.max(0, wind - busy), reaction, jitter, strike, step, guard, busy,load,canCounter:load<1 };
}
// 平移 log-logistic：簡單反應 .2 秒為物理下限，其餘有正尾，不造勝率保底。
export const drawReaction = (T, rnd) => { const u = rnd(); return PRACTICE.reactionFloor + (T.reaction - PRACTICE.reactionFloor) * (u / (1 - u)) ** T.jitter; };
const reactionOdds = (T, action) => { const available = T.wind - action - PRACTICE.reactionFloor; if (!(available > 0)) return 0; return 1 / (1 + ((T.reaction - PRACTICE.reactionFloor) / available) ** (1 / T.jitter)); };
/* 起手時先抽反應；截擊立即發生，其餘接法帶同一次抽樣等來招落下。 */
export function interceptOpening(s, atk, def, rnd, ctx = {}) {
  const T = clashTimes(s, atk, def, ctx), reaction = drawReaction(T,rnd);
  const opening = { T, reaction, odds:clashOdds(s,atk,def,ctx), p: clashOdds(s,atk,def,ctx).hit, at: s?.t ?? 0 };
  if (T.canCounter && postureOf(def) > 0 && !(atk.sure && atk.sure === (def.uid || def.id)) && def.part?.where!=='eye'&&!(def.visionUntil>(s?.t??0)) && !(def.rageUntil > (s?.t ?? 0)) && reaction+T.strike<T.wind && !(reaction+T.step+T.strike<T.wind)) {
    return { opening, read: resolveSwing(s, atk, def, rnd, { ...ctx, opening }) };
  }
  return { opening, read: null };
}
export function clashOdds(s, atk, def, ctx = {}) {
  const T = clashTimes(s, atk, def, ctx);
  const canRead=T.canCounter&&def.part?.where!=='eye'&&!(def.visionUntil>(s?.t??0))&&!(def.rageUntil>(s?.t??0));
  const readTotal=canRead?reactionOdds(T,T.strike):0;
  const dodgeCounter=canRead?reactionOdds(T,T.step+T.strike):0;
  const dodgeTotal=def.rageUntil>(s?.t??0)?0:reactionOdds(T,T.step);
  const parryTotal=reactionOdds(T,T.guard);
  return {read:Math.max(0,readTotal-dodgeCounter),dodge:dodgeCounter+Math.max(0,dodgeTotal-readTotal),dodgeCounter,parry:Math.max(0,parryTotal-Math.max(readTotal,dodgeTotal)),hit:1-Math.max(readTotal,dodgeTotal,parryTotal)};
}
/* 前搖起手可用 interceptOpening 立即截擊；未截者在來招結束時用同一反應抽樣接法。
   rnd 是固定種子亂數。ctx.force 只用於架勢崩潰等既有必中規則。 */
function settleDefense(s, def, T, result) {
  const now = s?.t ?? 0;
  const recovery = result.kind === 'parry' ? CLASH.time.parryRecover : result.kind === 'hit' ? CLASH.time.hitRecover : 0;
  const used = result.used ?? (result.kind === 'hit' ? 0 : T.guard);
  def.busyUntil = Math.max(def.busyUntil || 0, now) + used + recovery;
  def.ring = { intercept: result.kind === 'read', t: now, busy: def.busyUntil - now };
  noteFret(s, def, result.kind);
  return result;
}
export function composure(d) {
  const p = d?.personality || [];
  if (p.some((x) => TRAITS[x]?.composure === 'steady')) return CLASH.fret.steady;
  if (p.some((x) => TRAITS[x]?.composure === 'hot') || temperOf(d).xiao) return CLASH.fret.hot;
  return CLASH.fret.normal;
}
export function noteFret(s, d, event) {
  if (!d || isMon(d)) return;
  if (d.raging) return;
  const F = CLASH.fret, delta = event === 'dodge' ? F.dodge : event === 'parry' ? F.parry : event === 'hit' ? F.hit : event === 'strike' || event === 'read' ? -F.strike : 0;
  d.fret = Math.max(0, (d.fret || 0) + delta);
  if (d.fret >= composure(d)) {
    d.raging = true; d.rageUntil = (s?.t ?? 0) + F.rageTime; d.fret = composure(d);
    if (s) { s.rageN = (s.rageN || 0) + 1; (s.fx ||= []).push({ kind: 'clash', word: '怒', color: '#d0302a', pos: [...(d.pos || [0, 0])], ttl: F.rageFxTime }); log(s, `【惱羞】${d.name}被纏得忍不住，改為硬攻`); }
  }
}
export function fretStep(s, d) {
  if (!d?.raging || (d.rageUntil || 0) > (s?.t ?? 0)) return false;
  d.raging = false; d.rageUntil = 0; d.fret = 0; return true;
}
function advanceAfterDodge(s, atk, def) {
  if (!atk.pos || !def.pos) return;
  const dx = atk.pos[0] - def.pos[0], dy = atk.pos[1] - def.pos[1], dist = Math.hypot(dx, dy);
  if (dist <= RING.step) return;
  const from = [...def.pos], step = Math.min(RING.step, dist - RING.step);
  def.pos = [def.pos[0] + dx / dist * step, def.pos[1] + dy / dist * step];
  if (s) (s.fx ||= []).push({ kind: 'dash', from, to: [...def.pos], ttl: 0.35, color: '#cfe0f5' });
}
function resolveSwingCore(s, atk, def, rnd, ctx = {}) {
  postureOf(atk); postureOf(def);
  const T = ctx.opening?.T
    ? ((s?.t ?? 0) > ctx.opening.at + 1e-9
      ? { ...ctx.opening.T, wind: Math.min(ctx.opening.T.wind, Math.max(0, (s?.t ?? 0) - Math.max(ctx.opening.at, def.busyUntil || 0))) }
      : ctx.opening.T)
    : clashTimes(s, atk, def, ctx);
  if (def.posture <= 0) { def.posture = postureMax(def) * 0.5; def.postT = s?.t ?? 0; return settleDefense(s, def, T, { kind: 'hit', heavy: true, why: 'open' }); }
  if (ctx.force || (atk.sure && atk.sure === (def.uid || def.id))) { if (atk.sure === (def.uid || def.id)) atk.sure = null; return settleDefense(s, def, T, { kind: 'hit', heavy: false, why: ctx.force || 'sure' }); }
  const reaction = ctx.opening?.reaction ?? drawReaction(T,rnd);
  const load=ctx.opening?assessLoad(s,def,atk,ctx).L:T.load,canCounter=load<1;
  const timing={T:T.wind,r:reaction,step:T.step,strike:T.strike,guard:T.guard,L:load};
  const zjAtk = ctx.map && !isMon(atk) ? zjOfMove(ctx.move) : null; /* #426 */
  const duguPassive = ctx.map && isMon(atk) && zjHas(def, 'dugu') && (s?.codex?.[atk.k]?.insight || 0) >= ZJ.dugu.insight; /* 獨孤：讀招改成被動截，不再擲讀招 */
  if(canCounter&&!duguPassive&&def.part?.where!=='eye'&&!(def.visionUntil>(s?.t??0))&&!(def.rageUntil>(s?.t??0))&&reaction+T.step+T.strike<T.wind){advanceAfterDodge(s,atk,def);return settleDefense(s,def,T,{timing,kind:'dodge',used:reaction+T.step+T.strike,counter:moveStats(def,fastestMove(def)?.id).force*CLASH.time.counterForce,strain:(reaction+T.step)/T.wind});}
  if (canCounter && !duguPassive && def.part?.where!=='eye'&&!(def.visionUntil>(s?.t??0)) && !(def.rageUntil > (s?.t ?? 0)) && reaction + T.strike < T.wind) { postureHit(s, atk, CLASH.read.drop); def.sure = atk.uid || atk.id; return settleDefense(s, def, T, { timing,kind: 'read', used: reaction + T.strike, counter: moveStats(def, fastestMove(def)?.id).force * CLASH.time.counterForce }); }
  if (!(def.rageUntil > (s?.t ?? 0)) && reaction + T.step < T.wind) { if (!isMon(def)) spendQi(def, CLASH.dodge.qi * (reaction + T.step) / Math.max(T.wind, 1e-9)); advanceAfterDodge(s, atk, def); return settleDefense(s, def, T, { timing,kind: 'dodge', used: reaction + T.step, strain: (reaction + T.step) / Math.max(T.wind, 1e-9) }); }
  if (reaction + T.guard < T.wind) {
    const force = moveStats(atk, ctx.move, ctx.wind).force, guard = isMon(def) ? moveStats(def).force : qiPow(def);
    const jolt = guard > force * 1.4;
    postureHit(s, def, CLASH.parry.drop * Math.max(0.5, force / Math.max(1, guard))); postureHit(s, atk, CLASH.parry.drop * Math.max(0.5, guard / force) + (jolt ? CLASH.parry.joltDrop : 0));
    return settleDefense(s, def, T, { timing,kind: 'parry', jolt, used: reaction + T.guard });
  }
  return settleDefense(s, def, T, { timing,kind: 'hit', heavy: false });
}

export function techniqueFacts(s,a,t,move=null){
  const allMoves=[...MOVES,...Object.values(FOE_ACTIONS).flatMap(p=>p.moves)],mine=allMoves.find(m=>m.id===move),incoming=allMoves.find(m=>m.id===(t.swing?.mv||t.bswing?.mv||t.lastCombatMove));
  const last=a.lastDodge,afterDodge=last?.target===(t.uid||t.id||t.k)&&last.until>=(s?.t||0);
  const enemies=isMon(a)?(s?.ds||[]).filter(d=>!d.away&&d.hp>0):(s?.mons||[]).concat(s?.band?.members||[]).filter(d=>!d.gone&&d.hp>0);
  const close=enemies.filter(d=>d.pos&&a.pos&&Math.hypot(d.pos[0]-a.pos[0],d.pos[1]-a.pos[1])<=RING.outer);
  const weapon=t.weapon||incoming?.tool||incoming?.weapon||(t.k&&FOE_ACTIONS[t.k]?.moves.some(m=>m.weapon)?['blade','staff','fist'][(t.i||0)%3]:null);
  return {hands:FOE_ACTIONS[a.k]?.hands??2,weapon,opponentWind:!!(t.swing||t.bswing),afterDodge,opponentCharge:!!(afterDodge?last.charging:incoming?.travel),enemies:close.length,opponentUnbalanced:(t.posture??postureMax(t))<postureMax(t)/2,losing:a.hp<(a.max||100)/2,cornered:!!coverFor(a),approaching:!!t.path?.length&&!t.swing&&!t.bswing,force:moveStats(a,move).force,opponentForce:moveStats(t).force};
}
function moveParents(move){const m=MOVES.find(m=>m.id===move)||Object.values(FOE_ACTIONS).flatMap(p=>p.moves).find(m=>m.id===move);return [move,m?.type,m?.weapon,m?.tool==='stone'?'stone':null].filter(Boolean);}
function noteDiscoveries(s,d,rows){for(const row of rows){const text=`${d.name||d.k}在吃虧後悟出「${row.name}」`;log(s,text);if(d.id)chronOf(s,d,'glimmer',{chron:text});}}
export function resolveSwing(s, atk, def, rnd, ctx = {}) {
  const move = timedMoveId(atk,ctx.move), odds = clashOdds(s,atk,def,{ ...ctx, move });
  const initialT=ctx.opening?.T||clashTimes(s,atk,def,ctx),atkFacts=techniqueFacts(s,atk,def,move),defFacts={...techniqueFacts(s,def,atk),opponentWind:true};
  atk.lastCombatMove=move;
  const result = resolveSwingCore(s,atk,def,rnd,{ ...ctx, move });
  result.learning = recordExchange(s,atk,def,move,ctx.opening?.p ?? odds.hit,result);
  recordChoice(s,atk,def,move,result.kind==='hit');
  if(result.kind==='dodge'){const action=Object.values(FOE_ACTIONS).flatMap(p=>p.moves).find(m=>m.id===move);def.lastDodge={target:atk.uid||atk.id||atk.k,move,charging:!!action?.travel,until:(s?.t||0)+(action?.wind||ctx.wind||BODY_TIMING.reaction)+BODY_TIMING.recovery};}
  noteDiscoveries(s,atk,learnFromLoss(s,atk,moveParents(move),atkFacts,result.learning.p,{lost:result.kind!=='hit'}));
  noteDiscoveries(s,def,learnFromLoss(s,def,['guard'],defFacts,1-result.learning.p,{lost:result.kind==='hit'}));
  if(result.kind==='hit'&&def.tactics?.action==='flee')(def.flightSeen??={})[atk.k||atk.id]=true;
  if(result.kind==='hit')result.technique=applyTechnique(s,atk,def,move,atkFacts);
  witnessExchange(s,atk,def,move,result.learning.p);
  const T=initialT;
  if(result.kind==='hit')desireTraining(s,def,'timing',{move,wind:T.wind,reaction:T.reaction,deficit:T.reaction+Math.min(T.step,T.guard,T.strike)-T.wind});
  if(result.kind==='hit'&&moveStats(atk,move,ctx.wind).force<=moveStats(def).armor)desireTraining(s,atk,'power',{move,force:moveStats(atk,move,ctx.wind).force,armor:moveStats(def).armor});
  if(result.counter)result.counterLearning = recordExchange(s,def,atk,timedMoveId(def),(ctx.opening?.odds||odds)[result.kind==='read'?'read':'dodgeCounter'],{kind:'counter'});
  return result;
}

// ==== #419 N15 交戰圈與應接 ====
/* slots：一人身邊最多 4 個近戰位，第 5 隻起在外圈繞；win 只作應接紀錄窗口，不再硬限次數。 */
export {RING} from './combat-space.mjs';
export function topTierOf(d) { let t = 0; for (const id of Object.keys(d?.arts || {})) { const c = ART_CAT[id] || {}; if (['quanzhang', 'tuifa', 'jianfa', 'gunbang', 'qimen'].some((k) => (c[k] || 0) > 0)) t = Math.max(t, artTier(d, id) | 0); } return Math.min(4, t); }
export const handleThroughput = (d) => 1 / (CLASH.time.strike / (1 + topTierOf(d) * CLASH.time.strikeTier));
/* 統計一段時間的應接紀錄；能否接下由未完成動作與剩餘前搖決定，不設次數硬上限。 */
export function handleTake(s, d) {
  const now = s?.t ?? 0, L = (d.handled ||= []).filter((x) => now - x < RING.win); d.handled = L;
  L.push(now);
  if (L.length > (d.maxHandled || 0)) { d.maxHandled = L.length; if (d.maxHandled >= 2 && s && d.name) chronOf(s, d, 'handled', { chron: `${d.name}一口氣接下 ${d.maxHandled} 路來招，破了自己的紀錄` }); }
  return true;
}
// ==== #425 N19 林克時間與輕功交錯 ====
/* 林克時間：真的進身閃成立、耗用時間達 strain，且落在身法換算的最後一小段；悟性 ≥ wu。
   林克時間：以閃避者為圓心 r px 內的敵人，前搖與移動乘 k，持續 dur 秒；閃避者自己照常。只在模擬步長裡把圈內敵人的計時乘上倍數，不改全域 dt。
   輕功交錯：雙方身法都 ≥ crossAgi、出手時間差 < crossGap 秒，機率 crossP 互相穿過，雙方各掉 crossDrop 架勢、兩招都落空。 */
export const WITCH = { windowBase: 0.05, windowGain: 0.2, agilityHalf: 80, strain: 0.7, wu: 3, r: 80, k: 0.3, dur: 1, cool: 4, crossAgi: 40, crossGap: 0.3, crossP: 0.3, crossDrop: 25 };
/* 閃開的時機：身法越高越能壓到最後一刻；回傳 [0,1) 的「閃開時在前搖的哪一段」。 */
export function perfectDodge(s, def, rnd, ctx = {}) {
  if (!def || def.arts == null || (def.wu ?? def.root ?? 3) < WITCH.wu || (def.witchT ?? -1e9) > (s?.t ?? 0)) return false;
  const dangerous = (ctx.strain ?? 0) >= WITCH.strain;
  if (!dangerous) return false;
  if (s.witch?.some((w) => w.until > s.t)) return false; /* 同時只留一圈 */
  const agi = Math.max(0, def.skills?.agility || 0), win = WITCH.windowBase + WITCH.windowGain * agi / (agi + WITCH.agilityHalf);
  const at = rnd(); if (at < 1 - win) return false;
  def.witchT = (s?.t ?? 0) + WITCH.cool; s.witch = [{ who: def.id, pos: [...def.pos], until: s.t + WITCH.dur }];
  (s.fx ||= []).push({ kind: 'witch', pos: [...def.pos], r: WITCH.r, ttl: WITCH.dur });
  s.witchN = (s.witchN || 0) + 1; const key = `${s.day}:${def.id}`; (s.witchLog ||= {}); if (def.name && !s.witchLog[key]) { s.witchLog[key] = true; log(s, `【林克時間】${def.name}在最後一刻閃開，身邊一圈的敵人慢了下來`); }
  return true;
}
/* 敵人所在位置的時間倍數：在任何一個林克時間圈內就是 k，否則 1。過期的圈順手清掉。 */
export function witchK(s, pos) {
  const W = s?.witch; if (!W?.length || !pos) return 1; const now = s.t; s.witch = W.filter((w) => w.until > now); if (!s.witch.length) { s.witch = undefined; return 1; }
  return s.witch.some((w) => Math.hypot(pos[0] - w.pos[0], pos[1] - w.pos[1]) <= WITCH.r) ? WITCH.k : 1;
}
/* 輕功交錯：雙方身法都 ≥ crossAgi、兩招出手時間差 < crossGap 秒，擲一次 crossP。成立時由呼叫端讓兩招落空、各掉架勢、畫火花。 */
export const lightCross = (agiA, agiB, atA, atB, rnd) => agiA >= WITCH.crossAgi && agiB >= WITCH.crossAgi && Math.abs(atA - atB) < WITCH.crossGap && rnd() < WITCH.crossP;

// ==== #426 N20 絕學改規則 ====
/* 每門絕學只改一條規則，只走 N14 的接法鉤子（resolveSwing／前搖／挨打），不乘曲線倍數；只在地圖戰（打獵、守柵、試煉）生效，巡山與會武仍走 dpsOf 期望值。
   和舊 on 絕活重複的那一條，地圖戰改走這裡（ZJ_SKIP），不兩條一起算。 */
export const ZJ = {
  dugu: { char: '破', rule: '觀破即截', reach: 70, drop: 40, cool: 2, insight: 30 },
  taiji: { char: '圓', rule: '圓轉卸力', r: 60, wind: 1.5, cool: 3 },
  taijiSword: { char: '圓', rule: '圓轉卸力', r: 60, wind: 1.5, cool: 3 },
  kuihua: { char: '針', rule: '無前搖', fall: 0.4 },
  jiuyang: { char: '陽', rule: '挨打自震', need: 3, shock: 30, regen: 3, cap: 0.7 },
  xianglong: { char: '龍', rule: '不可格', drop: 30 },
  xuantie: { char: '重', rule: '破招架' },
};
export const ZJ_NEED = 2;
/* 地圖戰裡被絕學規則取代的舊 on 絕活：event 列表 */
export const ZJ_SKIP = { xuantie: ['breakParry'], dugu: ['see', 'noParry'], taijiSword: ['reflect'] };
export function zjHas(d, id) {
  if (!d || isMon(d) || !ZJ[id]) return false;
  if (id === 'dugu') return !!d.dugu?.length;
  return !!d.arts?.[id] && artTier(d, id) >= (ZJ[id].need ?? ZJ_NEED);
}
const zjOfMove = (mvId) => { const a = artOfMove(mvId); return a && ZJ[a.id] ? a.id : null; };
/* 第一次在實戰中用到：蓋上這門武學的字、記大事記 */
export function zjMark(s, d, id) {
  const z = ZJ[id]; if (!s || !d || !z) return;
  const used = (d.zjUsed ||= []); if (used.includes(id)) return; used.push(id);
  (s.fx ||= []).push({ kind: 'stamp', char: z.char, pos: [...(d.pos || [0, 0])], ttl: 1.4 });
  if (d.name) chronOf(s, d, 'zj_' + id, { chron: `${d.name}第一次在實戰中以${artById(id)?.name || id}「${z.rule}」` });
  s.zjN = s.zjN || {}; s.zjN[id] = (s.zjN[id] || 0) + 1;
}
const zjCount = (s, id) => { s.zjN = s.zjN || {}; s.zjN[id] = (s.zjN[id] || 0) + 1; };
/* 太極圈：pos 在某個太極弟子 r 內 → 前搖乘 wind */
export function zjWindK(s, pos, team) {
  for (const d of team || []) if (d.hp > 25 && (zjHas(d, 'taiji') || zjHas(d, 'taijiSword')) && Math.hypot(pos[0] - d.pos[0], pos[1] - d.pos[1]) <= ZJ.taiji.r) { zjMark(s, d, zjHas(d, 'taiji') ? 'taiji' : 'taijiSword'); return ZJ.taiji.wind; }
  return 1;
}
/* 獨孤：已觀破（圖鑑觀破 ≥ insight）的獸一進前搖，身邊 reach 內有獨孤弟子就自動截下 */
export function zjIntercept(s, m, team) {
  if (!isMon(m) || (s?.codex?.[m.k]?.insight || 0) < ZJ.dugu.insight) return null;
  const d = (team || []).find((x) => x.hp > 25 && assessLoad(s,x,m).L<1 && zjHas(x, 'dugu') && (x.zjT ?? -1e9) <= s.t && Math.hypot(m.pos[0] - x.pos[0], m.pos[1] - x.pos[1]) <= ZJ.dugu.reach);
  if (!d) return null;
  d.zjT = s.t + ZJ.dugu.cool; postureHit(s, m, ZJ.dugu.drop); d.sure = m.uid || m.id;
  (s.fx ||= []).push({ kind: 'cut', from: [...d.pos], to: [...m.pos], ttl: 0.5 }); zjMark(s, d, 'dugu'); zjCount(s, 'duguCut');
  return d;
}
/* 九陽：圓滿起內力快回，回到上限 cap 為止 */
export function zjRegen(d, dt) { if (!zjHas(d, 'jiuyang') || d.part?.where === 'body') return; const cap = qiMax(d) * ZJ.jiuyang.cap; if ((d.qi ?? 0) < cap) d.qi = Math.min(cap, (d.qi ?? 0) + ZJ.jiuyang.regen * dt); }

// ==== #427 N21 部位傷 ====
/* 只在「架勢已空的重擊」或「精準武學（劍、指）的重擊」時發生。三處：目（看不清來招，讀招失效）、手（出手變慢）、身（內力不回）。
   帶回日常：最多 days 天自己好；去療傷每次少 1 天，有醫術專長的人照料直接好。不斷肢、不留殘疾。 */
export const PART = { days: 3, hand: 1.3, where: ['eye', 'hand', 'body'], name: { eye: '目', hand: '手', body: '身' }, what: { eye: '看不清來招', hand: '出手慢了半拍', body: '內息回不上來' } };
const preciseArt = (mvId) => { const a = artOfMove(mvId); return !!a && (a.weapon === 'sword' || a.type === 'finger'); };
export const partOf = (d, w) => (d?.part && d.part.where === w ? d.part : null);
export function partHit(s, def, r, ctx = {}) {
  if (!def || isMon(def) || !r?.heavy || def.part) return null;
  if (!(r.why === 'open' || preciseArt(ctx.move))) return null;
  const rnd = ctx.rnd || Math.random, type = moveStats(ctx.attack, ctx.move).type;
  const where = type === 'sword' || type === 'finger' || type === 'blade' ? (rnd() < 0.5 ? 'eye' : 'hand') : type === 'bite' ? 'hand' : 'body';
  const side = rnd() < 0.5 ? '左' : '右';
  def.part = { where, side: where === 'body' ? '' : side, days: PART.days };
  s.partN = (s.partN || 0) + 1;
  if (def.name) log(s, `【負傷】${def.name}${partText(def)}`);
  return def.part;
}
export function partText(d) { const p = d?.part; if (!p) return ''; const n = ['', '一', '兩', '三'][Math.min(3, p.days)] || p.days; return `${p.side}${PART.name[p.where]}受傷，${n}日內${PART.what[p.where]}`; }
/* 每日：少一天；療傷（heal）再少一天；doctor＝直接好 */
export function partHeal(s, d, how) {
  if (!d?.part) return; if (how === 'doctor') d.part.days = 0; else d.part.days -= 1;
  if (d.part.days <= 0) { d.part = null; if (d.name) log(s, `${d.name}的傷好了`); }
}

// ==== #420 N16 招式的樣子 ====
/* name：招名浮字每人每 gap 秒最多一次；dash：大成起、射程 ≥ minRange 的招可滑步上前 add px（離守點 ≤ RING.leash）；hua：化境的範圍招逐個目標判接法、看破率再打 readK 折。 */
export const FLAIR = { nameGap: 2, nameTtl: 1.2, dash: { tier: 3, minRange: 50, add: 30 }, hua: 4, readK: 0.5 };
