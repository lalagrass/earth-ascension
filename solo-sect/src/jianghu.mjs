import { seedMix, log, resAdd, resSet } from './util.mjs';
import { DAY, TIERS, JH, TREES, buildCards, destinyStep, ARTS, ENEMIES, NODES, SOURCES } from './data.mjs';
import { lockedArt24, growEnsure, learnArt, watchMove, artTier, powBonus, autoFocus, artById, curCap, reqMissing, fits, qiMax, mitOf } from './arts.mjs';
import { rareBookStatus, readRareBook } from './rare-arts.mjs';
import { dpsOf, toWorld, guardOf } from './world.mjs';
import { points, majorThreatAvailable, reserveMajorThreat } from './threat.mjs';
import { rumorForVisitor } from './rumors.mjs';
import { startMapBout, stepMapBout } from './exp-map-combat.mjs';
import { laborPow } from './economy.mjs';
import { valorPowMul, valorAdd, VALOR } from './sect.mjs';
import { initPair } from './social.mjs';
import { xidOf, present, join } from './wuxia.mjs';
// ==== （原 jianghu.mjs）====
// v1.3 江湖群像（ROADMAP §13.8–13.11）：楊過（黯然銷魂掌、神鵰、斷臂）、小龍女（玉女心經、玉蜂、雙劍合璧）、周伯通（賭贏才教左右互搏／空明拳）、
// 東方不敗（反派，葵花＝斷情）、韋小寶（賭坊收益有上限）、海大富（1992 電影版：化骨綿掌與喜劇卡）、張無忌／韋小寶／阿星模板主線、
// 《功夫》：包租公婆（獅子吼＋太極，夫妻連攜）、具名雜工裡的隱藏高手（每圖最多 3 人，揭露即大成、不再進步）、火雲邪神（反派，蛤蟆功）、
// 喜劇卡每週最多 2 張（不造成永久損失）；每天例行作息由門規表決定。
export const jhInit = () => ({ cards: {}, comedy: [], comedyOn: true, diao: 0, armLost: false, honey: 0, zbt: null, dfbb: 0, hy: 0, hidden: 0, gambleDay: -1, gambleSum: 0, poison: null, arcs: {}, residue: {} });
const P = (k) => `assets/portraits/${k}.png`;
const find = (s, x) => s.ds.find((d) => xidOf(s, d) === x);
const heroD = (s) => s.ds.find((d) => d.id === 'hero');
const isHero = (s, id) => s.hero?.kind === 'template' && s.hero.id === id;
const fu = (s) => s.hero?.stats?.fu ?? 3;
const R = (s, H) => { if (H?.rand) return H.rand(s); const J = s.jh; J.rng = ((J.rng || seedMix(s.seed || 1, 977)) * 16807) % 2147483647; return J.rng / 2147483647; };
const fighters = (s) => s.ds.filter((d) => d.role !== 'laborer' && !d.away);
// Only character data at arrival (or the hidden laborer's existing skill), never an event reward.
export const giveArrivalArt = (s, d, id, xp) => { learnArt(d, id, s.t); const r = d.arts[id]; r.xp = Math.max(r.xp, xp); if (r.xp >= 55) r.bt1 = true; if (r.xp >= 100) r.bt2 = true; learnArt(d, id, s.t); };
const DA = TIERS[2][0] + 1; // 大成
// 門派戰力（反派事件用）：最強三人的武學階數×品階＋技藝
export const power = (s) => fighters(s).map((d) => Object.keys(d.arts || {}).reduce((a, k) => a + (artTier(d, k) + 1) * 3, 0) + (d.skills?.palm || 0) / 4 + (d.powMul || 1) * 5 + powBonus(d) + laborPow(d)).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) * valorPowMul(s); // loop129 勇名
/* loop206：跟 power() 同一批人。出手是 dpsOf 最高的三個加總。減傷、內力上限是這三個人的平均，不乘進出手，也不改 power()。 */
export function strikeLedger(s) {
  const rows = fighters(s).map((d) => ({ d, dps: dpsOf(s, d) })).sort((a, b) => b.dps - a.dps || (a.d.id < b.d.id ? -1 : 1)).slice(0, 3);
  const n = rows.length;
  const mean = (f) => (n ? rows.reduce((a, r) => a + f(r.d), 0) / n : 0);
  return { power: power(s), dps: rows.reduce((a, r) => a + r.dps, 0), mit: mean(mitOf), qi: mean(qiMax), n };
}
// ---- 喜劇卡閘門：每 7 天最多 2 張；設定可關 ----
export const comedyOk = (s) => { const J = s.jh; if (!J.comedyOn) return false; J.comedy = J.comedy.filter((t) => s.t - t < JH.comedyDays * DAY); return J.comedy.length < JH.comedyWeek; };
// ---- 抉擇卡 ----
const mood = (d, v) => { if (d) d.mood = Math.max(0, Math.min(100, d.mood + v)); };
// v2.0 A8：卡文字／選項／價值觀移至 destiny-trees.json；此處只留效果函式（依選項序號）
const FX = {
  diao: [(s) => { resSet(s, 'food', Math.max(0, s.res.food - 3), 'eagle'); s.jh.diao++; log(s, `餵了神鵰一次（${s.jh.diao}/${JH.diaoFeeds}）。`); if (s.jh.diao >= JH.diaoFeeds) log(s, '神鵰低鳴一聲，用翅膀拍了拍楊過——結緣了。'); }, () => {}],
  arm: [(s) => armLoss(s), (s) => { const y = find(s, 'yangguo'); mood(y, -10); }],
  tomb: [(s) => { s.jh.bees = true; }, () => {}],
  zbt: [(s, H) => zbtBet(s, H, 0), (s, H) => zbtBet(s, H, 1), () => {}],
  dfbb: [(s, H) => startVisitorFight(s, H, 'dfbb'), (s) => declineVisitor(s, 'dfbb')],
  kuihua: [(s) => { const d = heroD(s); if (!rareBookStatus(s, d, 'kuihua-book').ok) { log(s, '【葵花寶典】殘頁只讓人看見一招；整本須先取得實物並親自確認自宮。'); return; } if (readRareBook(s, d, 'kuihua-book').learned) { d.duanqing ??= s.t; d.moodCap = 80; } }, () => {}],
  hy: [(s, H) => startVisitorFight(s, H, 'hy'), (s) => declineVisitor(s, 'hy')],
  axe: [(s) => revealHidden(s), (s) => { resSet(s, 'coin', Math.max(0, s.res.coin - 10)); }],
  hai: [(s) => { s.jh.hai = s.t; const w = find(s, 'weixiaobao'); if (w) watchMove(w, artById('huagu')); log(s, '海大富住進了柴房，每天咳嗽、偷看韋小寶；韋小寶只看會一招。'); }, () => {}],
  paicuo: [(s) => { const l = s.ds.find((d) => d.role === 'laborer'); if (l) { l.role = 'outer'; delete l.unpaid; log(s, `${l.name}糊里糊塗成了外門弟子。`); } else s.rep = (s.rep || 0) + 1; }, () => {}],
  huagu: [(s) => { resSet(s, 'herb', Math.max(0, (s.res.herb || 0) - 2)); log(s, '解藥到手——其實他只是想要藥材。'); }, (s) => { const d = fighters(s)[0]; mood(d, -10); s.jh.poison = { id: d?.id, until: s.t + 3 * DAY }; }],
  zhabo: [(s) => { for (const d of fighters(s)) mood(d, 8); }, () => {}],
  beggar: [(s, H) => { resSet(s, 'coin', Math.max(0, s.res.coin - 10)); if (isHero(s, 'axing')) { s.hero.flags = { ...(s.hero.flags || {}), book: true }; arc(s, 'axing', 2, '如來神掌（十文錢的）'); } else if (R(s, H) < 0.01) { s.jh.realBook = true; log(s, '……竟然是真的！可惜要潛能覺醒才看得懂。'); } else { const d = heroD(s); mood(d, 3); log(s, '翻開一看：九成是插圖。'); } }, () => {}],
  bao: [(s) => { for (const d of fighters(s)) mood(d, 5); }, (s) => { const g = find(s, 'baozugong'); mood(g, 5); }],
  zwj5: [(s) => fourGirls(s, 'zhaomin', { free: 10, qing: 5 }), (s) => fourGirls(s, 'zhouzhiruo', { sect: 10 }), (s) => fourGirls(s, 'xiaozhao', { qing: 10 }), (s) => fourGirls(s, 'yinli', { xia: 10 })],
  wxb2: [(s) => { s.jh.casino = true; arc(s, 'weixiaobao', 2, '賭坊開張'); }, () => {}],
  wxb4: [(s) => { heroD(s).takeMul = JH.baoyi; arc(s, 'weixiaobao', 4, '寶衣護身'); }],
  wxb5: [(s) => { s.rep = (s.rep || 0) + 10; arc(s, 'weixiaobao', 5, '皇上的朋友'); }],
  ax3: [(s) => { const d = heroD(s); d.hp = Math.min(d.hp, 4); arc(s, 'axing', 3, '火雲邪神'); }, () => {}],
};
export const CARDS = buildCards(TREES.cards.jianghu, FX);
const once = (s, k) => { if (s.jh.cards[k]) return false; s.jh.cards[k] = true; return true; };
export function card(s, id, force, reason = '') {
  const C = CARDS[id]; if (!C) return null; if (!force && !C.comedy && !once(s, id)) return null;
  if (C.comedy && !force) { if (!comedyOk(s)) return null; s.jh.comedy.push(s.t); }
  const ch = { id: `jh-${id}-${Math.floor(s.t)}`, jh: id, tone: C.comedy ? 'comedy' : 'serious', title: `【${C.comedy ? '喜劇・' : ''}${C.title}】`, text: reason ? `${reason} ${C.text}` : C.text, opts: C.opts.map((o) => o[0]), portrait: C.who ? P(C.who) : null, at: s.t };
  s.choices ??= []; s.choices.push(ch); log(s, `【抉擇】${C.title}：${C.text}`); if (!s.hero?.askMajor) s.autoAt = s.t; return ch;
}
export const jhAutoPick = (s, ch) => (ch.jh === 'zwj5' ? ({ qing: 2, free: 0, sect: 1, xia: 3 })[Object.entries(s.hero?.values || {}).filter(([k]) => ['free', 'sect', 'qing', 'xia'].includes(k)).sort((a, b) => b[1] - a[1])[0]?.[0]] ?? 0 : 0);
export function jhResolve(s, ch, i, H) { const C = CARDS[ch.jh]; s.choices = s.choices.filter((c) => c !== ch); const o = C.opts[Math.min(i, C.opts.length - 1)]; log(s, `決定：${o[0]}`); o[1](s, H); return true; }
// ---- 機制 ----
function armLoss(s) { const y = find(s, 'yangguo'); if (!y) return; s.jh.armLost = true; y.oneArm = true; y.skills.agility = Math.round(y.skills.agility * 0.9); log(s, '【斷臂】楊過改用原已會的玄鐵重劍——重劍無鋒，大巧不工。（雙手兵器失效、身法 −10%）'); }
function zbtBet(s, H, kind) {
  const Z = s.jh.zbt; if (!Z) return; const d = heroD(s), p = kind === 0 ? 0.3 + fu(s) * 0.08 : 0.3 + (d?.ding ?? 3) * 0.08;
  if (R(s, H) < p) { Z.wins++; const art = Z.taught.includes('zuoyou') ? 'kongming' : 'zuoyou';
    // 左右互搏：心無旁騖才學得會（憨厚／悟性低）；空明拳誰都能學
    const c = fighters(s).filter((x) => !x.arts?.[art]); const st = art === 'zuoyou' ? c.sort((a, b) => ((a.personality || []).includes('honest') ? -9 : a.wu ?? 3) - ((b.personality || []).includes('honest') ? -9 : b.wu ?? 3))[0] : c[0];
    if (st) { const mv = watchMove(st, artById(art)); Z.taught.push(art); log(s, `【老頑童輸了】周伯通耍賴三次才認輸，讓${st.name}看會${art === 'zuoyou' ? '左右互搏' : '空明拳'}${mv ? `的一招「${mv.name}」` : '的一段動作'}；整門仍須師傳。`); }
    if (Z.taught.length >= 2) { s.jh.zbt = null; s.xia.left.zhoubotong = true; log(s, '周伯通：「好玩的都教完啦！」一溜煙跑了。'); }
  } else { Z.losses++; for (const x of fighters(s)) mood(x, 2); log(s, '輸了。全派陪周伯通抓了一下午蟋蟀（心情 +2，沒有損失）。'); }
}
/* loop148 v2.25（決定 141）：v22 反派登門冷卻——上次登門後至少 VILLAIN.cool 日；婉拒／閉門不出後最多再來 VILLAIN.more 次。
   根因：舊條件 `J.dfbb === 0 || 隔 5 日` 在婉拒時 J.dfbb 仍為 0，冷卻被跳過，於是每天登門。 */
export const VILLAIN = { cool: 8, more: 2 };
function vNo(s, k) { s.jh[k + 'No'] = (s.jh[k + 'No'] || 0) + 1; }
export function villainOk(s, k) { const J = s.jh, last = J[k + 'Day']; if ((J[k + 'No'] || 0) > VILLAIN.more) return false; return last == null || s.day - last >= VILLAIN.cool; }
// N51：每位敵意訪客是一列 incident。理由同時是准入條件；強度取既有敵人耐力，
// 同一個 N43 點數與來犯檔期決定是否足以引來他，不再用門派總戰力骰勝負。
export const VISITOR_INCIDENTS = [
  { id: 'dfbb', who: '東方不敗', enemy: 'dfbb', after: 8, reasonAny: [
    { kind: 'art', art: 'kuihua', text: '聽說你們藏有葵花寶典殘頁，特來尋回。' },
    { kind: 'rumor', text: '會武的見聞傳進日月神教，特來探個虛實。' },
  ], win: { rep: 8, residue: 'kuihua', card: 'kuihua' }, lose: { mood: -10 }, refuse: { rep: -3 } },
  { id: 'hy', who: '火雲邪神', enemy: 'hy', after: 6, reasonAny: [
    { kind: 'hidden', text: '聽說這裡有個深藏不露的高手，特來會一會。' },
    { kind: 'present', who: 'baozupo', text: '聞得包租婆在此，要找她比試。' },
  ], win: { rep: 8, residue: 'hama' }, lose: { mood: -10 }, refuse: { coin: -20 } },
];
const visitorRow = id => VISITOR_INCIDENTS.find(row => row.id === id);
export function visitorReason(s, row) {
  const reason = row.reasonAny.find(r => r.kind === 'art'
    ? s.ds.some(d => d.arts?.[r.art]) || !!s.jh?.residue?.[r.art]
    : r.kind === 'rumor' ? !!rumorForVisitor(s, ['martial'], true)
      : r.kind === 'hidden' ? s.ds.some(d => d.hidden?.shown)
        : r.kind === 'present' ? present(s, r.who) : false);
  const rumor = rumorForVisitor(s, ['martial'], true);
  return reason && rumor ? `在${rumor.where}聽${rumor.witness}說「${rumor.text}」；${reason.text}` : null;
}
export function visitorEligible(s, row) {
  return s.day >= row.after && (s.jh?.[row.id] || 0) < 2 && villainOk(s, row.id)
    && !!visitorReason(s, row) && !!rumorForVisitor(s, ['martial'], true) && !s.exp && !s.lair?.trip
    && points(s) >= ENEMIES[row.enemy].hp && majorThreatAvailable(s, 'visitor');
}
function declineVisitor(s, id) {
  const row = visitorRow(id), fx = row.refuse;
  if (fx.rep) s.rep = Math.max(0, (s.rep || 0) + fx.rep);
  if (fx.coin) resSet(s, 'coin', Math.max(0, s.res.coin + fx.coin));
  vNo(s, id); s.jh.visitorPending = null;
}
function startVisitorFight(s, H, id) {
  const row = visitorRow(id), reason = s.jh.visitorPending?.reason || visitorReason(s, row);
  const team = fighters(s).filter(d => d.hp > 0);
  s.jh.visitorPending = null;
  if (!team.length) { log(s, `【${row.who}】山門無人應戰，來客留下話後離去。`); return; }
  const homes = Object.fromEntries(team.map(d => [d.id, [...d.pos]]));
  s.jh.visitor = { id, reason, homes, n: s.day };
  startMapBout(s, s.jh.visitor, row.enemy, { id: 'visitor', from: 0 }, team, toWorld(NODES.v2), toWorld(SOURCES.gate.pos));
  log(s, `【${row.who}登門】${reason} 山門前逐招交手。`);
}
function finishVisitorFight(s, result) {
  const J = s.jh, visit = J.visitor, row = visitorRow(visit.id);
  for (const id of visit.bout?.team || Object.keys(visit.homes)) {
    const d = s.ds.find(x => x.id === id); if (!d) continue;
    d.pos = visit.homes[id]; d.swing = null;
    if (d.hp <= 0) d.hp = 10; // 既有登門事件不殺死門人；實際傷害仍由逐招交手決定。
  }
  J.visitorResult = { id: row.id, day: s.day, won: result.won, exchanges: result.exchanges };
  J[row.id] = result.won ? 2 : 1;
  if (result.won) {
    s.rep = (s.rep || 0) + row.win.rep;
    const d = fighters(s).sort((a, b) => (b.skills?.palm || 0) - (a.skills?.palm || 0))[0];
    if (d) { watchMove(d, artById(row.win.residue)); J.residue[row.win.residue] = d.id; }
    log(s, `【擊退${row.who}】${d?.name || '門人'}看會來客一招，留下的殘頁不是整本奇書。`);
    if (row.win.card) card(s, row.win.card);
  } else {
    for (const d of fighters(s)) mood(d, row.lose.mood);
    log(s, `【${row.who}離去】門人擋不住這位江湖客；傷勢照地圖交手結算。`);
  }
  J.visitor = null;
}
function revealHidden(s) {
  const l = s.ds.find((d) => d.hidden && !d.hidden.shown); if (!l) return; l.hidden.shown = true; l.noGrow = l.hidden.art; l.hidden.xp = l.arts[l.hidden.art].xp;  /* loop155 v2.3：高人仍當幫工，可守柵；要收入門走邀請 */
  log(s, `【深藏不露】${l.name}一出手就是大成的${({ tantui: '十二路譚腿', tiexian: '洪家鐵線拳', bagua: '五郎八卦棍' })[l.hidden.art]}，斧頭幫抱頭鼠竄！（${'仍在村裡幫工，山賊來時會守柵；可邀入門'}；老了，不再進步）`); s.rep = (s.rep || 0) + 3;
  if (isHero(s, 'axing')) arc(s, 'axing', 3, '豬籠城寨臥虎藏龍');
}
function fourGirls(s, who, dv) { const d = heroD(s); s.hero.flags = { ...(s.hero.flags || {}), girl: who }; if (d?.values) for (const [k, x] of Object.entries(dv)) d.values[k] = Math.max(-50, Math.min(50, (d.values[k] || 0) + x)); arc(s, 'zhangwuji', 5, `四女之中，選了${({ zhaomin: '趙敏', zhouzhiruo: '周芷若', xiaozhao: '小昭', yinli: '殷離' })[who]}`); }
export const ARC13 = { zhangwuji: TREES.arcs.zhangwuji, weixiaobao: TREES.arcs.weixiaobao, axing: TREES.arcs.axing };
function arc(s, id, n, text) { const H = s.hero; if (!isHero(s, id) || (H.arcStep || 0) >= n) return; H.arcStep = n; s.rep = (s.rep || 0) + 2; log(s, `【主線 ${n}/5】${text}`); }
export function onJoin13(s, d, k) {
  if (k === 'yangguo') d.personality.push('chi');
  if (k === 'baozupo' && !find(s, 'baozugong')) join(s, 'baozugong');
  if (['chengying', 'azi', 'chenglingsu'].includes(k)) { d.gInit = false; growEnsure(d); } /* loop151 v2.3：入門帶來的招牌立即折算造詣 */
  if (k === 'weixiaobao') { s.jh.casino = true; if (s.hero?.kind === 'template') { /* 招募 +40% */ } }
}
// 每 tick
export function jhStep(s, dt, H) {
  s.jh ??= jhInit(); const J = s.jh;
  if (J.visitor?.bout) {
    const result = stepMapBout(s, J.visitor, dt, { ...H, guardOf });
    if (result) finishVisitorFight(s, result);
    return;
  }
  // 黯然銷魂掌：心情 ≤30 威力 ×1.5，越低越強；癡：楊過心情隨小龍女；左右互搏、空明拳
  const yg = find(s, 'yangguo'), xl = find(s, 'xiaolongnv');
  for (const d of s.ds) { let m = 1;
    d.yunvLink = !!(d.arts?.yunv && s.ds.some((o) => o !== d && o.arts?.yunv && !o.away && (o.hp ?? 1) > 0));
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
  }
  // 隱藏高手：新雇的具名雜工擲一次（每圖最多 3）
  const NAMES = [['kulijiang', '苦力強', 'tantui'], ['caifeng', '裁縫', 'tiexian'], ['youzhagui', '油炸鬼', 'bagua']];
  for (const d of s.ds) if (d.role === 'laborer' && !d.hiddenRolled) { d.hiddenRolled = true; if (J.hidden < JH.hiddenMax && R(s, H) < JH.hiddenP) { const [id, nm, art] = NAMES[J.hidden]; J.hidden++; d.name = nm; d.portrait = P(id); d.hidden = { art, shown: false }; giveArrivalArt(s, d, art, DA); } }
  if (s.choices?.some((c) => c.jh)) return; // 一次一張
  const d0 = heroD(s);
  // 楊過：神鵰（三次餵食）→ 斷臂；小龍女：玉蜂
  if (yg && J.diao < JH.diaoFeeds && s.t - (s.xia?.joinT?.yangguo ?? s.t) > DAY * 0.5 && !J.cards['diao' + J.diao]) { J.cards['diao' + J.diao] = true; card(s, 'diao', true); return; }
  if (yg && J.diao >= JH.diaoFeeds && !J.armLost && card(s, 'arm')) return;
  if (xl && !J.bees && card(s, 'tomb')) return;
  if (J.zbt && s.day !== J.zbtDay) { J.zbtDay = s.day; card(s, 'zbt', true); return; }
  // 敵意訪客共用 incident 准入：理由、點數、來犯期及檔期均由資料列與 N43 決定。
  if (J.visitorCheckedDay !== s.day) {
    J.visitorCheckedDay = s.day; // N43 來犯檔期按遊戲日排；只在每日第一次有空卡時檢核。
    for (const row of VISITOR_INCIDENTS) if (visitorEligible(s, row)) {
      const reason = visitorReason(s, row); // 保留聽到的原話；消耗大威脅名額後不能再從未用見聞查回。
      if (!reserveMajorThreat(s, 'visitor')) continue;
      J[row.id + 'Day'] = s.day; J.visitorPending = { id: row.id, reason };
      card(s, row.id, true, reason); return;
    }
  }
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
export const letterP = (s, day) => { const pow = power(s), pts = JHEV.letter.base * (1 + day / JHEV.letter.grow); return pow / (pow + pts); };
export function jhevDaily(s) {
  const E = (s.jhev = typeof s.jhev === 'object' ? s.jhev : { m: 0, l: 0, lw: 0, mNext: 0, lNext: 0 }), day = s.day, M = JHEV.master, L = JHEV.letter;
  if (day >= M.after && day >= E.mNext && RJ(s) < M.p) { const c = here(s).filter((d) => autoFocus(d)); const d = c[Math.floor(RJ(s) * c.length)];
    if (d) { E.m++; E.mNext = day + M.cool; const teach = RJ(s) < M.teach; /* 傳功骰先擲，亂數流與舊版相同 */
      /* loop59「高人指點誰由我定」（s.masterask）：勾了「重大抉擇問我」時，改成抉擇卡：高人看中的人＋最多兩位在山上的同門，玩家挑一位 */
      if (s.hero?.askMajor && s.choices) { const alt = [d, ...c.filter((x) => x !== d)].slice(0, 3); s.choices.push({ id: `jhm-${day}-${Math.floor(s.t)}`, mvisit: true, who: alt.map((x) => x.id), teach, title: '【過路高人】雲遊高人借宿一晚', text: `高人願意指點一人。他看中了${d.name}，也可以請他改指點別人。`, opts: alt.map((x, k) => `${x.name}（${artById(autoFocus(x)).name}）${k ? '' : '・高人看中'}`) }); }
      else masterOutcome(s, d, teach); } }
  if (day >= L.after && day >= E.lNext && RJ(s) < L.p) { const c = here(s); if (c.length) { const champ = c.sort((a, b) => (b.skills?.[b.style] || 0) - (a.skills?.[a.style] || 0))[0], p = letterP(s, day), win = RJ(s) < p; E.lNext = day + L.cool;
    // loop40「量力而為」（s.jhrefuse）：勝算 < refuse.below 時婉拒，名聲 −1、無人心情受損。勝負骰照擲，亂數流與未開時一致。
    /* loop49「挑戰帖由我定奪」（s.letterask）：玩家選了「重大抉擇問我」時，改成抉擇卡（應戰／婉拒），勝負骰已擲好、卡上只顯示勝算。 */
    if (s.hero?.askMajor && s.choices) { s.choices.push({ id: `jhl-${day}-${Math.floor(s.t)}`, letter: true, who: champ.id, p, win, title: '【挑戰帖】有人上山下帖', text: `一位江湖客指名要與${champ.name}切磋（點到為止，不會受傷）。看來勝算約 ${Math.round(p * 100)}%。`, opts: ['應戰', `婉拒（名聲 -${L.refuse.rep}）`], at: s.t }); log(s, `【挑戰帖】有人指名${champ.name}切磋，等掌門定奪。`); return; }
    if (p < L.refuse.below) return letterOutcome(s, champ, win, true);
    letterOutcome(s, champ, win, false); } }
}
export function masterOutcome(s, d, teach) {
  const E = s.jhev, M = JHEV.master, id = autoFocus(d), a = artById(id), r = d.arts[id];
  r.xp = Math.min(curCap(d, a), r.xp + M.xp); md(d, M.mood);
  log(s, `【過路高人】一位雲遊高人借宿一晚，指點了${d.name}的「${a.name}」幾招。`);
  if (!teach) return;
  // This visitor has no persistent teacher actor. Watching one move cannot confer a whole art.
  const candidate = ARTS.find((x) => !x.secret && !lockedArt24(d, x) && !d.arts[x.id] && !reqMissing(d, x).length && fits(d, x) && x.school === d.style)
    || ARTS.find((x) => !x.secret && !lockedArt24(d, x) && !d.arts[x.id] && !reqMissing(d, x).length && fits(d, x));
  const mv = candidate && watchMove(d, candidate);
  if (mv) { E.mv = (E.mv || 0) + 1; log(s, `【過路高人】臨別前只示範「${mv.name}」；整門仍須拜師或讀譜。`); }
}
export function masterResolve(s, ch, i) { s.choices = s.choices.filter((c) => c !== ch); const d = s.ds.find((x) => x.id === ch.who[i] && !x.away) || s.ds.find((x) => x.id === ch.who[0] && !x.away); if (!d || !autoFocus(d)) { log(s, '【過路高人】要指點的人不在山上，高人留下一句「後會有期」就走了。'); return true; } masterOutcome(s, d, ch.teach); return true; }
export function letterOutcome(s, champ, win, refuse) { const E = s.jhev, L = JHEV.letter; valorAdd(s, refuse ? VALOR.refuse : VALOR.accept); /* loop129 勇名 */
  if (refuse) { E.lr = (E.lr || 0) + 1; s.rep = Math.max(0, (s.rep || 0) - L.refuse.rep); log(s, refuse === 'player' ? `【挑戰帖】掌門決定婉拒，${champ.name}客氣地送走來客，名聲 -${L.refuse.rep}。` : `【挑戰帖】來者武功明顯高出一截，${champ.name}代師門婉拒，名聲 -${L.refuse.rep}。`); return; }
  E.l++;
  if (win) { E.lw++; s.rep = (s.rep || 0) + L.win.rep; md(champ, L.win.mood); resAdd(s, 'coin', L.win.coin); const fid = autoFocus(champ); if (fid) { const r = champ.arts[fid]; r.xp = Math.min(curCap(champ, artById(fid)), r.xp + L.win.xp); } log(s, `【挑戰帖】${champ.name}應戰得勝，名聲 +${L.win.rep}、彩頭 ${L.win.coin} 文。`); }
    else { s.rep = Math.max(0, (s.rep || 0) - L.lose.rep); md(champ, -L.lose.mood); log(s, `【挑戰帖】${champ.name}應戰落敗，名聲 -${L.lose.rep}（點到為止，無人受傷）。`); }
}
export function letterResolve(s, ch, i) { s.choices = s.choices.filter((c) => c !== ch); const champ = s.ds.find((d) => d.id === ch.who); if (!champ) { log(s, '【挑戰帖】應戰的人不在山上，帖子作罷。'); return true; } letterOutcome(s, champ, ch.win, i === 1 ? 'player' : false); return true; }
