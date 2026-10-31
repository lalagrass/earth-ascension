import { seedMix, log, resAdd, resSet } from './util.mjs';
import { DAY, TIERS, JH, TREES, buildCards, destinyStep, ARTS, MOVES } from './data.mjs';
import { learnArt, artTier, powBonus, autoFocus, artById, curCap, reqMissing, fits } from './arts.mjs';
import { laborPow } from './economy.mjs';
import { valorPowMul, valorAdd, VALOR } from './sect.mjs';
import { initPair } from './social.mjs';
import { xidOf, present, join } from './wuxia.mjs';
// ==== （原 jianghu.mjs）====
// v1.3 江湖群像（ROADMAP §13.8–13.11）：楊過（黯然銷魂掌、神鵰、斷臂）、小龍女（玉女心經、玉蜂、雙劍合璧）、周伯通（賭贏才教左右互搏／空明拳）、
// 東方不敗（反派，葵花＝斷情）、韋小寶（賭坊收益有上限）、海大富（1992 電影版：化骨綿掌與喜劇卡）、張無忌／韋小寶／阿星模板主線、
// 《功夫》：包租公婆（獅子吼＋太極，夫妻連攜）、具名雜工裡的隱藏高手（每圖最多 3 人，揭露即大成、不再進步）、火雲邪神（反派，蛤蟆功）、
// 喜劇卡每週最多 2 張（不造成永久損失）、晨課令（每日 2–3 選 1，可關）
export const jhInit = () => ({ cards: {}, comedy: [], comedyOn: true, morningOn: true, morningDay: -1, morning: null, diao: 0, armLost: false, honey: 0, zbt: null, dfbb: 0, hy: 0, hidden: 0, gambleDay: -1, gambleSum: 0, poison: null, arcs: {}, residue: {} });
const P = (k) => `assets/portraits/${k}.png`;
const find = (s, x) => s.ds.find((d) => xidOf(s, d) === x);
const heroD = (s) => s.ds.find((d) => d.id === 'hero');
const isHero = (s, id) => s.hero?.kind === 'template' && s.hero.id === id;
const fu = (s) => s.hero?.stats?.fu ?? 3;
const R = (s, H) => { if (H?.rand) return H.rand(s); const J = s.jh; J.rng = ((J.rng || seedMix(s.seed || 1, 977)) * 16807) % 2147483647; return J.rng / 2147483647; };
const fighters = (s) => s.ds.filter((d) => d.role !== 'laborer' && !d.away);
export const teachJ = (s, d, id, xp) => { learnArt(d, id, s.t); const r = d.arts[id]; r.xp = Math.max(r.xp, xp); if (r.xp >= 55) r.bt1 = true; if (r.xp >= 100) r.bt2 = true; learnArt(d, id, s.t); };
const DA = TIERS[2][0] + 1; // 大成
// 門派戰力（反派事件用）：最強三人的武學階數×品階＋技藝
export const power = (s) => fighters(s).map((d) => Object.keys(d.arts || {}).reduce((a, k) => a + (artTier(d, k) + 1) * 3, 0) + (d.skills?.palm || 0) / 4 + (d.powMul || 1) * 5 + powBonus(d) + laborPow(d)).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) * valorPowMul(s); // loop129 勇名
// ---- 喜劇卡閘門：每 7 天最多 2 張；設定可關 ----
export const comedyOk = (s) => { const J = s.jh; if (!J.comedyOn) return false; J.comedy = J.comedy.filter((t) => s.t - t < JH.comedyDays * DAY); return J.comedy.length < JH.comedyWeek; };
// ---- 抉擇卡 ----
const mood = (d, v) => { if (d) d.mood = Math.max(0, Math.min(100, d.mood + v)); };
// v2.0 A8：卡文字／選項／價值觀移至 destiny-trees.json；此處只留效果函式（依選項序號）
const FX = {
  diao: [(s) => { resSet(s, 'food', Math.max(0, s.res.food - 3)); s.jh.diao++; log(s, `餵了神鵰一次（${s.jh.diao}/${JH.diaoFeeds}）。`); if (s.jh.diao >= JH.diaoFeeds) log(s, '神鵰低鳴一聲，用翅膀拍了拍楊過——結緣了。'); }, () => {}],
  arm: [(s) => armLoss(s), (s) => { const y = find(s, 'yangguo'); mood(y, -10); }],
  tomb: [(s) => { s.jh.bees = true; }, () => {}],
  zbt: [(s, H) => zbtBet(s, H, 0), (s, H) => zbtBet(s, H, 1), () => {}],
  dfbb: [(s, H) => villain(s, H, 'dfbb'), (s) => { s.rep = Math.max(0, (s.rep || 0) - 3); vNo(s, 'dfbb'); }],
  kuihua: [(s) => { const d = heroD(s); teachJ(s, d, 'kuihua', DA); d.duanqing ??= s.t; d.moodCap = 80; log(s, `【葵花寶典】${d.name}斷情練成，出手快得只見紅影。`); }, () => {}],
  hy: [(s, H) => villain(s, H, 'hy'), (s) => { resSet(s, 'coin', Math.max(0, s.res.coin - 20)); vNo(s, 'hy'); }],
  axe: [(s) => revealHidden(s), (s) => { resSet(s, 'coin', Math.max(0, s.res.coin - 10)); }],
  hai: [(s) => { s.jh.hai = s.t; const w = find(s, 'weixiaobao'); if (w) teachJ(s, w, 'huagu', 2); log(s, '海大富住進了柴房，每天咳嗽、偷看韋小寶。'); }, () => {}],
  paicuo: [(s) => { const l = s.ds.find((d) => d.role === 'laborer'); if (l) { l.role = 'outer'; delete l.unpaid; log(s, `${l.name}糊里糊塗成了外門弟子。`); } else s.rep = (s.rep || 0) + 1; }, () => {}],
  huagu: [(s) => { resSet(s, 'herb', Math.max(0, (s.res.herb || 0) - 2)); log(s, '解藥到手——其實他只是想要藥材。'); }, (s) => { const d = fighters(s)[0]; mood(d, -10); s.jh.poison = { id: d?.id, until: s.t + 3 * DAY }; }],
  zhabo: [(s) => { for (const d of fighters(s)) mood(d, 8); }, () => {}],
  beggar: [(s, H) => { resSet(s, 'coin', Math.max(0, s.res.coin - 10)); if (isHero(s, 'axing')) { s.hero.flags = { ...(s.hero.flags || {}), book: true }; arc(s, 'axing', 2, '如來神掌（十文錢的）'); } else if (R(s, H) < 0.01) { s.jh.realBook = true; log(s, '……竟然是真的！可惜要潛能覺醒才看得懂。'); } else { const d = heroD(s); mood(d, 3); log(s, '翻開一看：九成是插圖。'); } }, () => {}],
  bao: [(s) => { for (const d of fighters(s)) mood(d, 5); }, (s) => { const g = find(s, 'baozugong'); mood(g, 5); }],
  zwj2: [(s) => { teachJ(s, heroD(s), 'jiuyang', DA); arc(s, 'zhangwuji', 2, '九陽神功'); }],
  zwj3: [(s) => { const d = heroD(s); teachJ(s, d, 'qiankun', DA); d.reflect = JH.reflect; arc(s, 'zhangwuji', 3, '乾坤大挪移'); }, () => {}],
  zwj4: [(s) => { const d = heroD(s); if ((d.wu ?? 3) >= 4) { teachJ(s, d, 'taiji', DA); arc(s, 'zhangwuji', 4, '太極拳：忘光了，才算學會'); } else log(s, '忘是忘了，可是也沒學會。（悟性不足 4）'); }],
  zwj5: [(s) => fourGirls(s, 'zhaomin', { free: 10, qing: 5 }), (s) => fourGirls(s, 'zhouzhiruo', { sect: 10 }), (s) => fourGirls(s, 'xiaozhao', { qing: 10 }), (s) => fourGirls(s, 'yinli', { xia: 10 })],
  wxb2: [(s) => { s.jh.casino = true; arc(s, 'weixiaobao', 2, '賭坊開張'); }, () => {}],
  wxb4: [(s) => { heroD(s).takeMul = JH.baoyi; arc(s, 'weixiaobao', 4, '寶衣護身'); }],
  wxb5: [(s) => { s.rep = (s.rep || 0) + 10; arc(s, 'weixiaobao', 5, '皇上的朋友'); }],
  ax3: [(s) => { const d = heroD(s); d.hp = Math.min(d.hp, 4); arc(s, 'axing', 3, '火雲邪神'); }, () => {}],
  morning: [(s) => { for (const d of fighters(s)) for (const k of ['palm', 'leg', 'strength']) d.skills[k] = Math.min(100, d.skills[k] + 1); }, (s) => { for (const d of fighters(s)) mood(d, 5); }, (s) => { resAdd(s, 'coin', 3); }],
  // v2.1 無名主線：兩條都把本門風雷掌腿教到大成。照舊開局無人值守時走第一條。
  wuming: [
    (s) => { const d = heroD(s); if (d) teachJ(s, d, 'fengLei', DA); s.jh.wuming = s.t || 1; log(s, '主角在木樁前把風雷掌腿悟到了大成。'); },
    (s) => { const d = heroD(s); if (d) teachJ(s, d, 'fengLei', DA); s.jh.wuming = s.t || 1; s.jh.guestUntil = s.t + 7 * DAY; log(s, '過路拳師住了七日，把風雷掌腿教到大成，之後下山去了。'); },
  ],
};
export const CARDS = buildCards(TREES.cards.jianghu, FX);
const once = (s, k) => { if (s.jh.cards[k]) return false; s.jh.cards[k] = true; return true; };
export function card(s, id, force) {
  const C = CARDS[id]; if (!force && !C.comedy && !C.morning && !once(s, id)) return null;
  if (C.comedy && !force) { if (!comedyOk(s)) return null; s.jh.comedy.push(s.t); }
  const ch = { id: `jh-${id}-${Math.floor(s.t)}`, jh: id, tone: C.comedy ? 'comedy' : 'serious', title: `【${C.comedy ? '喜劇・' : ''}${C.title}】`, text: C.text, opts: C.opts.map((o) => o[0]), portrait: C.who ? P(C.who) : null, at: s.t };
  s.choices ??= []; s.choices.push(ch); log(s, `【${C.morning ? '晨課' : '抉擇'}】${C.title}：${C.text}`); if (!s.hero?.askMajor) s.autoAt = s.t; return ch;
}
export const jhAutoPick = (s, ch) => (ch.jh === 'zwj5' ? ({ qing: 2, free: 0, sect: 1, xia: 3 })[Object.entries(s.hero?.values || {}).filter(([k]) => ['free', 'sect', 'qing', 'xia'].includes(k)).sort((a, b) => b[1] - a[1])[0]?.[0]] ?? 0 : ch.jh === 'morning' ? (s.day % 3) : 0);
export function jhResolve(s, ch, i, H) { const C = CARDS[ch.jh]; s.choices = s.choices.filter((c) => c !== ch); const o = C.opts[Math.min(i, C.opts.length - 1)]; log(s, `決定：${o[0]}`); o[1](s, H); return true; }
// ---- 機制 ----
function armLoss(s) { const y = find(s, 'yangguo'); if (!y) return; s.jh.armLost = true; y.oneArm = true; y.skills.agility = Math.round(y.skills.agility * 0.9); teachJ(s, y, 'xuantie', DA); log(s, '【斷臂】楊過單手提起玄鐵重劍——重劍無鋒，大巧不工。（雙手兵器失效、身法 −10%）'); }
function zbtBet(s, H, kind) {
  const Z = s.jh.zbt; if (!Z) return; const d = heroD(s), p = kind === 0 ? 0.3 + fu(s) * 0.08 : 0.3 + (d?.ding ?? 3) * 0.08;
  if (R(s, H) < p) { Z.wins++; const art = Z.taught.includes('zuoyou') ? 'kongming' : 'zuoyou';
    // 左右互搏：心無旁騖才學得會（憨厚／悟性低）；空明拳誰都能學
    const c = fighters(s).filter((x) => !x.arts?.[art]); const st = art === 'zuoyou' ? c.sort((a, b) => ((a.personality || []).includes('honest') ? -9 : a.wu ?? 3) - ((b.personality || []).includes('honest') ? -9 : b.wu ?? 3))[0] : c[0];
    if (st) { teachJ(s, st, art, DA); Z.taught.push(art); log(s, `【老頑童輸了】周伯通耍賴三次才認輸，把${art === 'zuoyou' ? '左右互搏' : '空明拳'}教給了${st.name}。`); }
    if (Z.taught.length >= 2) { s.jh.zbt = null; s.xia.left.zhoubotong = true; log(s, '周伯通：「好玩的都教完啦！」一溜煙跑了。'); }
  } else { Z.losses++; for (const x of fighters(s)) mood(x, 2); log(s, '輸了。全派陪周伯通抓了一下午蟋蟀（心情 +2，沒有損失）。'); }
}
/* loop148 v2.25（決定 141）：v22 反派登門冷卻——上次登門後至少 VILLAIN.cool 日；婉拒／閉門不出後最多再來 VILLAIN.more 次。
   根因：舊條件 `J.dfbb === 0 || 隔 5 日` 在婉拒時 J.dfbb 仍為 0，冷卻被跳過，於是每天登門。 */
export const VILLAIN = { cool: 8, more: 2 };
function vNo(s, k) { if (s.v22) s.jh[k + 'No'] = (s.jh[k + 'No'] || 0) + 1; }
export function villainOk(s, k) { const J = s.jh, last = J[k + 'Day']; if ((J[k + 'No'] || 0) > VILLAIN.more) return false; return last == null || s.day - last >= VILLAIN.cool; }
function villain(s, H, k) {
  const need = k === 'dfbb' ? JH.dfbbPow : JH.hyPow, pw = power(s), win = pw >= need || R(s, H) < 0.1;
  if (win) { s.jh[k] = 2; s.rep = (s.rep || 0) + 8; const art = k === 'dfbb' ? 'kuihua' : 'hama', d = fighters(s).sort((a, b) => (b.skills.palm || 0) - (a.skills.palm || 0))[0];
    if (d) { learnArt(d, art, s.t); d.arts[art].xp = Math.max(d.arts[art].xp, JH.residueXp); s.jh.residue[art] = d.id; }
    log(s, k === 'dfbb' ? `【擊退東方不敗】紅影一閃即逝，留下一頁殘譜（葵花寶典 20%，${d?.name}）。` : `【火雲邪神跪地認輸】「我輸了……」留下蛤蟆功殘頁（20%，${d?.name}）。`);
    if (k === 'dfbb') card(s, 'kuihua');
  } else { s.jh[k] = 1; for (const d of fighters(s)) { d.hp = Math.max(10, d.hp - 40); mood(d, -10); } log(s, `打不過（門派戰力 ${Math.round(pw)} / ${need}）：眾人重傷，${k === 'dfbb' ? '東方不敗' : '火雲邪神'}揚長而去。（不會死人；之後還會再來）`); }
}
function revealHidden(s) {
  const l = s.ds.find((d) => d.hidden && !d.hidden.shown); if (!l) return; l.hidden.shown = true; teachJ(s, l, l.hidden.art, DA); l.noGrow = l.hidden.art; l.hidden.xp = l.arts[l.hidden.art].xp; l.role = 'outer'; delete l.unpaid;
  log(s, `【深藏不露】${l.name}一出手就是大成的${({ tantui: '十二路譚腿', tiexian: '洪家鐵線拳', bagua: '五郎八卦棍' })[l.hidden.art]}，斧頭幫抱頭鼠竄！（轉為外門弟子；老了，不再進步）`); s.rep = (s.rep || 0) + 3;
  if (isHero(s, 'axing')) arc(s, 'axing', 3, '豬籠城寨臥虎藏龍');
}
function fourGirls(s, who, dv) { const d = heroD(s); s.hero.flags = { ...(s.hero.flags || {}), girl: who }; if (d?.values) for (const [k, x] of Object.entries(dv)) d.values[k] = Math.max(-50, Math.min(50, (d.values[k] || 0) + x)); arc(s, 'zhangwuji', 5, `四女之中，選了${({ zhaomin: '趙敏', zhouzhiruo: '周芷若', xiaozhao: '小昭', yinli: '殷離' })[who]}`); }
export const ARC13 = { zhangwuji: TREES.arcs.zhangwuji, weixiaobao: TREES.arcs.weixiaobao, axing: TREES.arcs.axing };
function arc(s, id, n, text) { const H = s.hero; if (!isHero(s, id) || (H.arcStep || 0) >= n) return; H.arcStep = n; s.rep = (s.rep || 0) + 2; log(s, `【主線 ${n}/5】${text}`); }
export function onJoin13(s, d, k) {
  if (k === 'yangguo') { teachJ(s, d, 'anran', DA); d.personality.push('chi'); }
  if (k === 'xiaolongnv') teachJ(s, d, 'yunv', DA);
  if (k === 'baozupo') { teachJ(s, d, 'shihou', DA); if (!find(s, 'baozugong')) join(s, 'baozugong'); }
  if (k === 'baozugong') teachJ(s, d, 'taiji', DA);
  if (k === 'weixiaobao') { s.jh.casino = true; if (s.hero?.kind === 'template') { /* 招募 +40% */ } }
}
// 每 tick
export function jhStep(s, dt, H) {
  s.jh ??= jhInit(); const J = s.jh;
  // 黯然銷魂掌：心情 ≤30 威力 ×1.5，越低越強；癡：楊過心情隨小龍女；左右互搏、空明拳
  const yg = find(s, 'yangguo'), xl = find(s, 'xiaolongnv');
  for (const d of s.ds) { let m = 1;
    if (d.arts?.anran) m *= d.mood <= JH.anranMood ? JH.anranMax : 1 + (JH.anranMax - 1) * Math.max(0, (60 - d.mood) / 30) * 0.5;
    if (d.arts?.zuoyou && artTier(d, 'zuoyou') >= 2) m *= JH.twin; if (d.arts?.kongming) m *= JH.kongming;
    if (s.jh.residue && d.noGrow && d.hidden && d.arts?.[d.noGrow]) d.arts[d.noGrow].xp = d.hidden.xp; // 隱藏高手不再進步
    if (d.moodCap && d.mood > d.moodCap) d.mood = d.moodCap;
    if (d.arts?.jiuyang && artTier(d, 'jiuyang') >= 3) d.staBonus = JH.jiuyangSta;
    d.jhMul = m; }
  if (yg && xl) yg.mood += (xl.mood - yg.mood) * 0.002; else if (yg && s.xia?.left?.xiaolongnv) yg.mood = Math.min(yg.mood, 60);
  if (xl) { const crowd = s.ds.filter((d) => !d.away).length; if (crowd > 10) xl.mood = Math.max(0, xl.mood - 0.002 * (crowd - 10)); }
  if (J.poison && s.t >= J.poison.until) J.poison = null;
  // 每日：玉蜂漿、賭坊抽頭（有上限）
  if (s.day !== J.gambleDay) { J.gambleDay = s.day;
    if (J.bees) { J.honey++; const h = s.ds.filter((d) => d.hp < 100).sort((a, b) => a.hp - b.hp)[0]; if (h && J.honey > 0) { J.honey--; h.hp = Math.min(100, h.hp + JH.honeyHeal); } }
    if (J.casino && (present(s, 'weixiaobao'))) { const g = Math.min(JH.gambleCap, JH.gambleBase + Math.floor((s.rep || 0) / 10)); resAdd(s, 'coin', g); J.gambleSum += g; }
    // 晨課令
    if (J.morningOn && !s.choices?.some((c) => c.jh === 'morning')) J.morning = card(s, 'morning', true)?.id || null;
  }
  // 隱藏高手：新雇的具名雜工擲一次（每圖最多 3）
  const NAMES = [['kulijiang', '苦力強', 'tantui'], ['caifeng', '裁縫', 'tiexian'], ['youzhagui', '油炸鬼', 'bagua']];
  for (const d of s.ds) if (d.role === 'laborer' && !d.hiddenRolled) { d.hiddenRolled = true; if (J.hidden < JH.hiddenMax && R(s, H) < JH.hiddenP) { const [id, nm, art] = NAMES[J.hidden]; J.hidden++; d.name = nm; d.portrait = P(id); d.hidden = { art, shown: false }; } }
  // v2.1：照舊開局沒有模板主角。檢核在 destiny-trees.json。已掛著的江湖卡不會擋它；沒有人點選，就當場走第一條。
  if (!s.hero && heroD(s) && destinyStep(s, 'plain', { d0: heroD(s), card, arc, artTier })) {
    const ch = (s.choices || []).find((c) => c.jh === 'wuming');
    if (ch) jhResolve(s, ch, jhAutoPick(s, ch), H);
    return;
  }
  if (s.choices?.some((c) => c.jh && c.jh !== 'morning')) return; // 一次一張
  const d0 = heroD(s);
  // 楊過：神鵰（三次餵食）→ 斷臂；小龍女：玉蜂
  if (yg && J.diao < JH.diaoFeeds && s.t - (s.xia?.joinT?.yangguo ?? s.t) > DAY * 0.5 && !J.cards['diao' + J.diao]) { J.cards['diao' + J.diao] = true; card(s, 'diao', true); return; }
  if (yg && J.diao >= JH.diaoFeeds && !J.armLost && card(s, 'arm')) return;
  if (xl && !J.bees && card(s, 'tomb')) return;
  if (J.zbt && s.day !== J.zbtDay) { J.zbtDay = s.day; card(s, 'zbt', true); return; }
  // 反派：東方不敗（第 8 天或名聲 30）、火雲邪神（揭露過隱藏高手或包租婆在，第 6 天後）
  if ((J.dfbb || 0) < 2 && ((s.day >= 8) || (s.rep || 0) >= 30) && s.day !== J.dfbbDay && (s.v22 ? villainOk(s, 'dfbb') : (J.dfbb === 0 || s.day - (J.dfbbDay || 0) >= 5))) { J.dfbbDay = s.day; card(s, 'dfbb', true); return; }
  if ((J.hy || 0) < 2 && s.day >= 6 && (s.ds.some((d) => d.hidden?.shown) || present(s, 'baozupo')) && (s.v22 ? villainOk(s, 'hy') : (J.hy === 0 || s.day - (J.hyDay || 0) >= 5)) && s.day !== J.hyDay) { J.hyDay = s.day; card(s, 'hy', true); return; }
  if (s.ds.some((d) => d.hidden && !d.hidden.shown) && s.day >= 3 && s.day !== J.axeDay && s.day % 3 === 0) { J.axeDay = s.day; card(s, 'axe', true); return; }
  if (present(s, 'weixiaobao') && !J.hai && s.day >= 5 && card(s, 'hai')) { if (isHero(s, 'weixiaobao')) arc(s, 'weixiaobao', 3, '海大富'); return; }
  // 模板主線
  for (const id of ['zhangwuji', 'weixiaobao', 'axing']) if (isHero(s, id) && d0 && destinyStep(s, id, { d0, card, arc, artTier })) return; // v2.0 A8：檢核在 destiny-trees.json
  // 喜劇卡（每週最多 2）
  if (comedyOk(s) && s.day !== J.comedyDay && s.t % DAY > DAY * 0.5) { J.comedyDay = s.day; const pool = [J.hai && 'paicuo', J.hai && 'huagu', J.hai && 'zhabo', present(s, 'baozupo') && 'bao', s.day >= 2 && 'beggar'].filter(Boolean);
    if (pool.length) { card(s, pool[Math.floor(R(s, H) * pool.length)]); return; } }
}

// ==== （原 jhevents.mjs）====
// loop23 江湖事件（選用，s.jhev）：過路高人指點、挑戰帖。獨立亂數流，不擾動主亂數；golden 不變。
export const JHEV = { master: { p: 0.12, after: 4, cool: 6, xp: 8, mood: 5, teach: 0.3 }, letter: { p: 0.08, after: 8, cool: 9, base: 75, grow: 30, win: { rep: 6, mood: 6, coin: 10, xp: 5 }, lose: { rep: 2, mood: 8 }, refuse: { below: 0.3, rep: 1 } } };
const RJ = (s) => { const E = s.jhev; E.rng = ((E.rng || seedMix(s.seed || 1, 7919)) * 16807) % 2147483647; return E.rng / 2147483647; };
const here = (s) => s.ds.filter((d) => !d.away && d.role !== 'laborer' && d.hp > 30);
const md = (d, v) => { d.mood = Math.max(0, Math.min(100, d.mood + v)); };
export const letterP = (s, day) => { const pow = power(s), pts = JHEV.letter.base * (1 + day / JHEV.letter.grow); return Math.max(0.15, Math.min(0.85, pow / (pow + pts))); };
export function jhevDaily(s) {
  const E = (s.jhev = typeof s.jhev === 'object' ? s.jhev : { m: 0, l: 0, lw: 0, mNext: 0, lNext: 0 }), day = s.day, M = JHEV.master, L = JHEV.letter;
  if (day >= M.after && day >= E.mNext && RJ(s) < M.p) { const c = here(s).filter((d) => autoFocus(d)); const d = c[Math.floor(RJ(s) * c.length)];
    if (d) { E.m++; E.mNext = day + M.cool; const teach = RJ(s) < M.teach; /* 傳功骰先擲，亂數流與舊版相同 */
      /* loop59「高人指點誰由我定」（s.masterask）：勾了「重大抉擇問我」時，改成抉擇卡：高人看中的人＋最多兩位在山上的同門，玩家挑一位 */
      if (s.masterask && s.hero?.askMajor && s.choices) { const alt = [d, ...c.filter((x) => x !== d)].slice(0, 3); s.choices.push({ id: `jhm-${day}-${Math.floor(s.t)}`, mvisit: true, who: alt.map((x) => x.id), teach, title: '【過路高人】雲遊高人借宿一晚', text: `高人願意指點一人。他看中了${d.name}，也可以請他改指點別人。`, opts: alt.map((x, k) => `${x.name}（${artById(autoFocus(x)).name}）${k ? '' : '・高人看中'}`) }); }
      else masterOutcome(s, d, teach); } }
  if (day >= L.after && day >= E.lNext && RJ(s) < L.p) { const c = here(s); if (c.length) { const champ = c.sort((a, b) => (b.skills?.[b.style] || 0) - (a.skills?.[a.style] || 0))[0], p = letterP(s, day), win = RJ(s) < p; E.lNext = day + L.cool;
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
export function letterOutcome(s, champ, win, refuse) { const E = s.jhev, L = JHEV.letter; valorAdd(s, refuse ? VALOR.refuse : VALOR.accept); /* loop129 勇名 */
  if (refuse) { E.lr = (E.lr || 0) + 1; s.rep = Math.max(0, (s.rep || 0) - L.refuse.rep); log(s, refuse === 'player' ? `【挑戰帖】掌門決定婉拒，${champ.name}客氣地送走來客，名聲 -${L.refuse.rep}。` : `【挑戰帖】來者武功明顯高出一截，${champ.name}代師門婉拒，名聲 -${L.refuse.rep}。`); return; }
  E.l++;
  if (win) { E.lw++; s.rep = (s.rep || 0) + L.win.rep; md(champ, L.win.mood); resAdd(s, 'coin', L.win.coin); const fid = autoFocus(champ); if (fid) { const r = champ.arts[fid]; r.xp = Math.min(curCap(champ, artById(fid)), r.xp + L.win.xp); } log(s, `【挑戰帖】${champ.name}應戰得勝，名聲 +${L.win.rep}、彩頭 ${L.win.coin} 文。`); }
    else { s.rep = Math.max(0, (s.rep || 0) - L.lose.rep); md(champ, -L.lose.mood); log(s, `【挑戰帖】${champ.name}應戰落敗，名聲 -${L.lose.rep}（點到為止，無人受傷）。`); }
}
export function letterResolve(s, ch, i) { s.choices = s.choices.filter((c) => c !== ch); const champ = s.ds.find((d) => d.id === ch.who); if (!champ) { log(s, '【挑戰帖】應戰的人不在山上，帖子作罷。'); return true; } letterOutcome(s, champ, ch.win, i === 1 ? 'player' : false); return true; }
