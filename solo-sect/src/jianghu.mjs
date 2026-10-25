// v1.3 江湖群像（ROADMAP §13.8–13.11）：楊過（黯然銷魂掌、神鵰、斷臂）、小龍女（玉女心經、玉蜂、雙劍合璧）、周伯通（賭贏才教左右互搏／空明拳）、
// 東方不敗（反派，葵花＝斷情）、韋小寶（賭坊收益有上限）、海大富（1992 電影版：化骨綿掌與喜劇卡）、張無忌／韋小寶／阿星模板主線、
// 《功夫》：包租公婆（獅子吼＋太極，夫妻連攜）、具名雜工裡的隱藏高手（每圖最多 3 人，揭露即大成、不再進步）、火雲邪神（反派，蛤蟆功）、
// 喜劇卡每週最多 2 張（不造成永久損失）、晨課令（每日 2–3 選 1，可關）
import { DAY, TIERS, JH } from './data.mjs';
import { learnArt, artTier } from './arts.mjs';
import { log } from './util.mjs';
import { initPair } from './social.mjs';
import { xidOf, present, join } from './wuxia.mjs';
export const jhInit = () => ({ cards: {}, comedy: [], comedyOn: true, morningOn: true, morningDay: -1, morning: null, diao: 0, armLost: false, honey: 0, zbt: null, dfbb: 0, hy: 0, hidden: 0, gambleDay: -1, gambleSum: 0, poison: null, arcs: {}, residue: {} });
const P = (k) => `assets/portraits/${k}.png`;
const find = (s, x) => s.ds.find((d) => xidOf(s, d) === x);
const heroD = (s) => s.ds.find((d) => d.id === 'hero');
const isHero = (s, id) => s.hero?.kind === 'template' && s.hero.id === id;
const fu = (s) => s.hero?.stats?.fu ?? 3;
const R = (s, H) => { if (H?.rand) return H.rand(s); const J = s.jh; J.rng = ((J.rng || ((s.seed || 1) * 977 + 13) % 2147483647) * 16807) % 2147483647; return J.rng / 2147483647; };
const fighters = (s) => s.ds.filter((d) => d.role !== 'laborer' && !d.away);
export const teachJ = (s, d, id, xp) => { learnArt(d, id, s.t); const r = d.arts[id]; r.xp = Math.max(r.xp, xp); if (r.xp >= 55) r.bt1 = true; if (r.xp >= 100) r.bt2 = true; learnArt(d, id, s.t); };
const DA = TIERS[2][0] + 1; // 大成
// 門派戰力（反派事件用）：最強三人的武學階數×品階＋技藝
export const power = (s) => fighters(s).map((d) => Object.keys(d.arts || {}).reduce((a, k) => a + (artTier(d, k) + 1) * 3, 0) + (d.skills?.palm || 0) / 4 + (d.powMul || 1) * 5).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0);
// ---- 喜劇卡閘門：每 7 天最多 2 張；設定可關 ----
export const comedyOk = (s) => { const J = s.jh; if (!J.comedyOn) return false; J.comedy = J.comedy.filter((t) => s.t - t < JH.comedyDays * DAY); return J.comedy.length < JH.comedyWeek; };
// ---- 抉擇卡 ----
const mood = (d, v) => { if (d) d.mood = Math.max(0, Math.min(100, d.mood + v)); };
export const CARDS = {
  diao: { who: 'yangguo', title: '後山的神鵰', text: '一頭醜陋巨鵰立在後山崖邊，不避人也不吃人給的生肉。楊過說：「牠只吃毒蛇膽。」', opts: [['抓蛇膽餵牠（糧 −3）', (s) => { s.res.food = Math.max(0, s.res.food - 3); s.jh.diao++; log(s, `餵了神鵰一次（${s.jh.diao}/${JH.diaoFeeds}）。`); if (s.jh.diao >= JH.diaoFeeds) log(s, '神鵰低鳴一聲，用翅膀拍了拍楊過——結緣了。'); }], ['敬而遠之', () => {}]] },
  arm: { who: 'yangguo', title: '斷臂', text: '楊過為了護住師妹，被人一劍削斷左臂。他倒在劍塚前，神鵰銜來一柄黝黑的重劍。', opts: [['讓他在劍塚養傷、練重劍', (s) => armLoss(s)], ['先送下山治傷（錯過劍塚）', (s) => { const y = find(s, 'yangguo'); mood(y, -10); }]] },
  tomb: { who: 'xiaolongnv', title: '古墓玉蜂', text: '小龍女在後山古墓口養了一窩玉蜂：「蜂漿能治傷。誰要來，先學會不吵。」', opts: [['在後山養玉蜂（每日玉蜂漿 +1）', (s) => { s.jh.bees = true; }], ['怕被螫，算了', () => {}]] },
  zbt: { who: 'zhoubotong', title: '老頑童的賭約', text: '「捉迷藏！比耐力！猜拳！贏了我就教一招，輸了你們幫我抓蟋蟀！」', opts: [['陪他捉迷藏（看福緣）', (s, H) => zbtBet(s, H, 0)], ['跟他比耐力（看定力）', (s, H) => zbtBet(s, H, 1)], ['今天不玩', () => {}]] },
  dfbb: { who: 'dongfangbubai', title: '日月神教：東方不敗', text: '一襲紅衣落在山門前，指間一根繡花針：「聽說你們門派最近很囂張？」', opts: [['全派迎戰', (s, H) => villain(s, H, 'dfbb')], ['閉門不出（名聲 −3）', (s) => { s.rep = Math.max(0, (s.rep || 0) - 3); }]] },
  kuihua: { who: 'dongfangbubai', title: '葵花寶典殘頁', text: '東方不敗遺下的殘頁上寫著：「欲練神功，必先自宮。」練了就斷情：不能結義、不能配對，心情上限 −20。', opts: [['掌門親自修練（斷情）', (s) => { const d = heroD(s); teachJ(s, d, 'kuihua', DA); d.duanqing ??= s.t; d.moodCap = 80; log(s, `【葵花寶典】${d.name}斷情練成，出手快得只見紅影。`); }], ['燒了它', () => {}]] },
  hy: { who: 'huoyunxieshen', title: '火雲邪神', text: '斧頭幫請來一個穿拖鞋背心的邋遢老頭：「天下武功，無堅不破，唯快不破。」——終極殺人王來了。', opts: [['全派迎戰', (s, H) => villain(s, H, 'hy')], ['交保護費（香火錢 −20）', (s) => { s.res.coin = Math.max(0, s.res.coin - 20); }]] },
  axe: { who: 'kulijiang', title: '斧頭幫收保護費', text: '斧頭幫的人衝上山來勒索雜工。一個平時悶不吭聲的雜工放下扁擔……', opts: [['讓他出手', (s) => revealHidden(s)], ['破財消災（香火錢 −10）', (s) => { s.res.coin = Math.max(0, s.res.coin - 10); }]] },
  hai: { who: 'haidafu', title: '海大富', text: '一個咳個不停的老太監找上山：「小桂子……不，韋小寶，你偷了我的經書？」', opts: [['留他住下（化骨綿掌學三五十年才小成）', (s) => { s.jh.hai = s.t; const w = find(s, 'weixiaobao'); if (w) teachJ(s, w, 'huagu', 2); log(s, '海大富住進了柴房，每天咳嗽、偷看韋小寶。'); }], ['請他走', () => {}]] },
  // 喜劇卡（tone: comedy）：不造成永久損失
  paicuo: { comedy: true, who: 'haidafu', title: '排錯隊', text: '來應徵雜工的人排錯了隊，站到「拜師」那一排去了。海大富：「排錯隊，就是緣分！」', opts: [['那就收他當外門（雜工轉弟子）', (s) => { const l = s.ds.find((d) => d.role === 'laborer'); if (l) { l.role = 'outer'; delete l.unpaid; log(s, `${l.name}糊里糊塗成了外門弟子。`); } else s.rep = (s.rep || 0) + 1; }], ['叫他回去重排', () => {}]] },
  huagu: { comedy: true, who: 'haidafu', title: '慢性化骨綿掌', text: '海大富笑咪咪拍了一下：「中了我的慢性化骨綿掌，三天內找不到解藥，骨頭會軟喔。」', opts: [['乖乖去採藥找解藥（藥材 −2）', (s) => { s.res.herb = Math.max(0, (s.res.herb || 0) - 2); log(s, '解藥到手——其實他只是想要藥材。'); }], ['不理他（中招者心情 −10，三天後自癒）', (s) => { const d = fighters(s)[0]; mood(d, -10); s.jh.poison = { id: d?.id, until: s.t + 3 * DAY }; }]] },
  zhabo: { comedy: true, who: 'haidafu', title: '揸波龍爪手', text: '「我教你一招龍爪手！」「抓……抓什麼？」聽錯了招名，練成了一招不知所云的爪功。', opts: [['笑著練下去（心情 +8）', (s) => { for (const d of fighters(s)) mood(d, 8); }], ['正經點', () => {}]] },
  beggar: { comedy: true, who: 'axing', title: '路邊乞丐賣秘笈', text: '「小朋友，我看你骨骼精奇，是萬中無一的武學奇才。這本《如來神掌》，十文賣你。」', opts: [['掏十文買下', (s, H) => { s.res.coin = Math.max(0, s.res.coin - 10); if (isHero(s, 'axing')) { s.hero.flags = { ...(s.hero.flags || {}), book: true }; arc(s, 'axing', 2, '如來神掌（十文錢的）'); } else if (R(s, H) < 0.01) { s.jh.realBook = true; log(s, '……竟然是真的！可惜要潛能覺醒才看得懂。'); } else { const d = heroD(s); mood(d, 3); log(s, '翻開一看：九成是插圖。'); } }], ['不買', () => {}]] },
  bao: { comedy: true, who: 'baozupo', title: '包租婆追打', text: '包租公又偷看女弟子練功，包租婆拖鞋一甩，從東廂追到西廂。', opts: [['看熱鬧（全員心情 +5）', (s) => { for (const d of fighters(s)) mood(d, 5); }], ['勸架', (s) => { const g = find(s, 'baozugong'); mood(g, 5); }]] },
  // 張無忌主線
  zwj2: { who: 'zhangwuji', title: '猿腹經書', text: '寒毒發作的少年墜崖，在一頭白猿腹中摸出一部經書：《九陽真經》。', opts: [['苦練九陽（寒毒自解）', (s) => { teachJ(s, heroD(s), 'jiuyang', DA); arc(s, 'zhangwuji', 2, '九陽神功'); }]] },
  zwj3: { who: 'zhangwuji', title: '光明頂密道', text: '光明頂密道裡，羊皮上寫著乾坤大挪移心法。九陽真氣在體內翻湧。', opts: [['練乾坤大挪移（借力反打 30%）', (s) => { const d = heroD(s); teachJ(s, d, 'qiankun', DA); d.reflect = JH.reflect; arc(s, 'zhangwuji', 3, '乾坤大挪移'); }], ['不碰明教的東西', () => {}]] },
  zwj4: { who: 'zhangwuji', title: '太師父現教太極', text: '張三丰當著眾人慢慢打了一遍：「都記得了嗎？」「忘了一大半……」「好，再忘。」', opts: [['學完就忘（悟性 ≥4 才行）', (s) => { const d = heroD(s); if ((d.wu ?? 3) >= 4) { teachJ(s, d, 'taiji', DA); arc(s, 'zhangwuji', 4, '太極拳：忘光了，才算學會'); } else log(s, '忘是忘了，可是也沒學會。（悟性不足 4）'); }]] },
  zwj5: { who: 'zhangwuji', title: '四女同舟', text: '趙敏、周芷若、小昭、殷離——她們都在等你一句話。', opts: [['趙敏（自由 +10）', (s) => fourGirls(s, 'zhaomin', { free: 10, qing: 5 })], ['周芷若（門派 +10）', (s) => fourGirls(s, 'zhouzhiruo', { sect: 10 })], ['小昭（情 +10）', (s) => fourGirls(s, 'xiaozhao', { qing: 10 })], ['殷離（俠 +10）', (s) => fourGirls(s, 'yinli', { xia: 10 })]] },
  // 韋小寶主線
  wxb2: { who: 'weixiaobao', title: '開賭坊', text: '「掌門，我在村路開個小賭坊，抽頭給門派，保證不出老千……大概。」', opts: [['開！（每日抽頭，有上限）', (s) => { s.jh.casino = true; arc(s, 'weixiaobao', 2, '賭坊開張'); }], ['不開', () => {}]] },
  wxb4: { who: 'weixiaobao', title: '烏蠶寶衣', text: '從鰲拜府裡抄出一件烏黑背心，刀槍不入。', opts: [['自己穿上（受傷 −50%）', (s) => { heroD(s).takeMul = JH.baoyi; arc(s, 'weixiaobao', 4, '寶衣護身'); }]] },
  wxb5: { who: 'weixiaobao', title: '小玄子', text: '跟你摔跤的小玄子，原來是當今皇上。', opts: [['講義氣，兩頭都保（名聲 +10）', (s) => { s.rep = (s.rep || 0) + 10; arc(s, 'weixiaobao', 5, '皇上的朋友'); }]] },
  // 阿星主線
  ax3: { who: 'huoyunxieshen', title: '斧頭幫的王牌', text: '琛哥把火雲邪神從精神病院放出來了。阿星縮在牆角：這次逃不掉了。', opts: [['擋在前面（瀕死才能覺醒）', (s) => { const d = heroD(s); d.hp = Math.min(d.hp, 4); arc(s, 'axing', 3, '火雲邪神'); }], ['跑', () => {}]] },
  // 晨課令（每日，可關）
  morning: { morning: true, who: null, title: '晨課令', text: '晨鐘響了。今天的早課練什麼？', opts: [['站樁（全員技藝 +1）', (s) => { for (const d of fighters(s)) for (const k of ['palm', 'leg', 'strength']) d.skills[k] = Math.min(100, d.skills[k] + 1); }], ['誦經靜坐（全員心情 +5）', (s) => { for (const d of fighters(s)) mood(d, 5); }], ['幫工（香火錢 +3）', (s) => { s.res.coin += 3; }]] },
};
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
export const ARC13 = { zhangwuji: ['明教殘部求救', '九陽神功', '乾坤大挪移', '太極拳', '四女同舟'], weixiaobao: ['天地會來人', '賭坊開張', '海大富', '寶衣護身', '皇上的朋友'], axing: ['豬籠城寨的包租婆', '如來神掌（十文錢的）', '火雲邪神', '瀕死覺醒', '如來神掌'] };
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
    if (J.casino && (present(s, 'weixiaobao'))) { const g = Math.min(JH.gambleCap, JH.gambleBase + Math.floor((s.rep || 0) / 10)); s.res.coin += g; J.gambleSum += g; }
    // 晨課令
    if (J.morningOn && !s.choices?.some((c) => c.jh === 'morning')) J.morning = card(s, 'morning', true)?.id || null;
  }
  // 隱藏高手：新雇的具名雜工擲一次（每圖最多 3）
  const NAMES = [['kulijiang', '苦力強', 'tantui'], ['caifeng', '裁縫', 'tiexian'], ['youzhagui', '油炸鬼', 'bagua']];
  for (const d of s.ds) if (d.role === 'laborer' && !d.hiddenRolled) { d.hiddenRolled = true; if (J.hidden < JH.hiddenMax && R(s, H) < JH.hiddenP) { const [id, nm, art] = NAMES[J.hidden]; J.hidden++; d.name = nm; d.portrait = P(id); d.hidden = { art, shown: false }; } }
  if (s.choices?.some((c) => c.jh && c.jh !== 'morning')) return; // 一次一張
  const d0 = heroD(s);
  // 楊過：神鵰（三次餵食）→ 斷臂；小龍女：玉蜂
  if (yg && J.diao < JH.diaoFeeds && s.t - (s.xia?.joinT?.yangguo ?? s.t) > DAY * 0.5 && !J.cards['diao' + J.diao]) { J.cards['diao' + J.diao] = true; card(s, 'diao', true); return; }
  if (yg && J.diao >= JH.diaoFeeds && !J.armLost && card(s, 'arm')) return;
  if (xl && !J.bees && card(s, 'tomb')) return;
  if (J.zbt && s.day !== J.zbtDay) { J.zbtDay = s.day; card(s, 'zbt', true); return; }
  // 反派：東方不敗（第 8 天或名聲 30）、火雲邪神（揭露過隱藏高手或包租婆在，第 6 天後）
  if ((J.dfbb || 0) < 2 && ((s.day >= 8) || (s.rep || 0) >= 30) && s.day !== J.dfbbDay && (J.dfbb === 0 || s.day - (J.dfbbDay || 0) >= 5)) { J.dfbbDay = s.day; card(s, 'dfbb', true); return; }
  if ((J.hy || 0) < 2 && s.day >= 6 && (s.ds.some((d) => d.hidden?.shown) || present(s, 'baozupo')) && (J.hy === 0 || s.day - (J.hyDay || 0) >= 5) && s.day !== J.hyDay) { J.hyDay = s.day; card(s, 'hy', true); return; }
  if (s.ds.some((d) => d.hidden && !d.hidden.shown) && s.day >= 3 && s.day !== J.axeDay && s.day % 3 === 0) { J.axeDay = s.day; card(s, 'axe', true); return; }
  if (present(s, 'weixiaobao') && !J.hai && s.day >= 5 && card(s, 'hai')) { if (isHero(s, 'weixiaobao')) arc(s, 'weixiaobao', 3, '海大富'); return; }
  // 模板主線
  if (isHero(s, 'zhangwuji') && d0) { const n = s.hero.arcStep || 0;
    if (n >= 1 && n < 2 && s.day >= 3 && card(s, 'zwj2')) return; if (n === 2 && artTier(d0, 'jiuyang') >= 2 && s.day >= 5 && card(s, 'zwj3')) return; if (n === 3 && s.day >= 7 && card(s, 'zwj4')) return; if (n >= 3 && s.day >= 9 && card(s, 'zwj5')) return; }
  if (isHero(s, 'weixiaobao') && d0) { const n = s.hero.arcStep || 0;
    if (n >= 1 && n < 2 && s.day >= 2 && card(s, 'wxb2')) return; if (n === 2 && s.day >= 4 && !J.hai) { if (card(s, 'hai')) { arc(s, 'weixiaobao', 3, '海大富'); return; } } if (n === 3 && s.day >= 6 && card(s, 'wxb4')) return; if (n === 4 && s.day >= 8 && card(s, 'wxb5')) return; }
  if (isHero(s, 'axing') && d0) { const n = s.hero.arcStep || 0;
    if (n >= 1 && n < 2 && s.day >= 2 && card(s, 'beggar', true)) return; if (n === 2 && s.day >= 4 && card(s, 'ax3')) return;
    if (s.hero.awakened && n >= 3 && n < 5) { arc(s, 'axing', 4, '瀕死覺醒：任督二脈打通'); arc(s, 'axing', 5, '如來神掌：從天而降的掌法'); } }
  // 喜劇卡（每週最多 2）
  if (comedyOk(s) && s.day !== J.comedyDay && s.t % DAY > DAY * 0.5) { J.comedyDay = s.day; const pool = [J.hai && 'paicuo', J.hai && 'huagu', J.hai && 'zhabo', present(s, 'baozupo') && 'bao', s.day >= 2 && 'beggar'].filter(Boolean);
    if (pool.length) { card(s, pool[Math.floor(R(s, H) * pool.length)]); return; } }
}
