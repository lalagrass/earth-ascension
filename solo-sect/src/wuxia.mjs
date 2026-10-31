import { styleOk } from './bonds.mjs';
import { favSort } from './sect.mjs';
import { DAY, TIERS, TREES, HS, DUGU, MOVES, buildCards } from './data.mjs';
import { think, initPair } from './social.mjs';
import { encounterPool, mkComp, heroById, addWexin } from './hero.mjs';
import { learnArt, artById, artTier } from './arts.mjs';
import { log, resAdd } from './util.mjs';
import { removeActor } from './core.mjs';
import { onJoin13 } from './jianghu.mjs';
// ==== （原 wuxia.mjs）====
// v1.1 名俠奇遇（ROADMAP §13）：名俠池（扣掉主角／同門）、觸發（巡山深度、下山、名聲、下廚）、突然入門的高手、
// 第一組：郭靖、黃蓉（只有這兩位能入門當弟子）、洪七公（傳完就走的師父）；名俠只會離開，不會死
export const xidOf = (s, d) => (d.id === 'hero' ? s.hero?.id || 'hero' : d.id);
export const present = (s, x) => s.ds.some((d) => xidOf(s, d) === x);
const kitchenLv = (s) => s.fac?.kitchen?.stage || 0;
// 拙／剛的脾性：憨厚、較真、膽大，或悟性 ≤2
export const dragonFit = (d) => (d.personality || []).some((p) => ['honest', 'stubborn', 'brave'].includes(p)) || (d.wu ?? 3) <= 2;
export const XIA = {
  guojing: { name: '郭靖', role: 'disciple', where: '村路', title: '村路上的憨厚少年', text: '一個背著長弓的少年在山門外跪了一夜：「求師父收我。我笨，可我肯練。」',
    need: (s) => (s.records?.sect || 0) >= 250 || (s.rep || 0) >= 12, why: '巡山走過林地（250 步）或名聲 12' },
  huangrong: { name: '黃蓉', role: 'disciple', where: '下山採買', title: '追上山的俏姑娘', text: '下山採買的弟子回來說，鎮上有個小叫化一路跟著郭靖，洗了臉竟是個俏姑娘：「靖哥哥，我也要拜師。」',
    need: (s) => present(s, 'guojing') && s.t - (s.xia.joinT.guojing ?? (s.hero?.id === 'guojing' ? 0 : s.t)) >= DAY * 0.5, why: '郭靖在門中半天以上（下山採買時遇上）' },
  linghuchong: { name: '令狐沖', role: 'disciple', where: '斷崖', title: '斷崖上喝酒的浪子', text: '巡山隊在斷崖邊遇到一個抱著酒罈的年輕人：「好酒！各位要不要來一碗？聽說你們門派不拘一格，我來討口酒喝。」',
    need: (s) => (s.records?.sect || 0) >= 700 || (s.rep || 0) >= 25, why: '巡山走到斷崖（700 步）或名聲 25' },
  hongqigong: { name: '洪七公', role: 'teacher', where: '膳房', title: '洪七公聞香而來', text: '一個背酒葫蘆的老叫化蹲在膳房門口吞口水：「好香！這手藝……是誰燒的？老叫化走不動了。」',
    need: (s) => present(s, 'huangrong') && (s.xia.cooks || 0) >= (s.hero?.flags?.hong ? 1 : 2) && (kitchenLv(s) >= 1 || s.hero?.flags?.hong), why: '黃蓉在門中且下過廚（膳房或郭靖主線）' },
};
// v1.3 第二組名俠（客卿）：楊過、小龍女、周伯通（師父，賭贏才教）、韋小寶（喜劇非戰鬥）、包租公／包租婆（功夫）
const T13 = (name, stats, personality, skills) => ({ name, stats, personality, skills });
export const XIA_T = {
  yangguo: T13('楊過', { wu: 5, gen: 4, li: 3 }, ['free', 'brave', 'sociable'], { leg: 20, palm: 40, strength: 26, farming: 2, herbal: 2, agility: 28, cooking: 2 }),
  xiaolongnv: T13('小龍女', { wu: 5, gen: 4, li: 2 }, ['quiet', 'kind'], { leg: 24, palm: 32, strength: 10, farming: 4, herbal: 16, agility: 40, cooking: 4 }),
  weixiaobao: T13('韋小寶', { wu: 1, gen: 1, li: 1 }, ['glib', 'lazy', 'optimist'], { leg: 6, palm: 4, strength: 4, farming: 2, herbal: 2, agility: 30, cooking: 10 }),
  baozupo: T13('包租婆', { wu: 3, gen: 4, li: 4 }, ['stubborn', 'brave'], { leg: 26, palm: 40, strength: 36, farming: 4, herbal: 2, agility: 22, cooking: 8 }),
  baozugong: T13('包租公', { wu: 4, gen: 4, li: 2 }, ['lazy', 'gentle'], { leg: 30, palm: 38, strength: 16, farming: 4, herbal: 2, agility: 34, cooking: 2 }),
};
const XIA13 = {
  yangguo: { name: '楊過', role: 'guest', where: '後山', title: '後山的獨臂少年與神鵰', text: '後山出現一頭醜陋巨鵰，鵰後跟著一個灰衣少年：「借貴派一塊地方住幾天，我在等一個人。」',
    need: (s) => (s.records?.sect || 0) >= 500 || (s.rep || 0) >= 18, why: '巡山走到山腰（500 步）或名聲 18' },
  xiaolongnv: { name: '小龍女', role: 'guest', where: '古墓', title: '古墓裡的白衣女子', text: '後山石墓的門開了一道縫。一個白衣女子冷冷地說：「這裡太吵。」——她在找一個叫過兒的人。',
    need: (s) => present(s, 'yangguo') || (s.records?.sect || 0) >= 900, why: '楊過在門中，或巡山 900 步' },
  zhoubotong: { name: '周伯通', role: 'teacher', where: '村路', title: '老頑童要打賭', text: '一個白鬍子老頭攔住巡山隊：「來來來，陪老頑童玩！贏了我就教你們好玩的功夫！」',
    need: (s) => (s.day || 0) >= 4 && ((s.rep || 0) >= 10 || present(s, 'xiaolongnv')), why: '第 4 天後且名聲 10（或小龍女在門中）' },
  weixiaobao: { name: '韋小寶', role: 'guest', where: '賭坊', title: '賭坊裡的小混混', text: '村路賭坊裡一個小滑頭贏光了全場：「這位掌門，收不收徒弟？我會拍馬屁、會賭錢、還會跑！」',
    need: (s) => (s.res?.coin || 0) >= 20 && (s.day || 0) >= 3, why: '第 3 天後且香火錢 20' },
  baozupo: { name: '包租婆', role: 'guest', where: '豬籠城寨', title: '豬籠城寨的包租婆', text: '一陣獅吼震得瓦片亂飛：「交租啊！」——山下大雜院的包租婆帶著老公搬上山來，說是避斧頭幫。',
    need: (s) => (s.res && (s.ds || []).filter((d) => d.role === 'laborer').length >= 2) || s.hero?.id === 'axing', why: '雇了 2 個雜工（或阿星開局）' },
  baozugong: { name: '包租公', role: 'guest', where: '豬籠城寨', title: '包租公', text: '', need: () => false, why: '跟包租婆一起來' },
};
export const XIA_PAIRS = { 'guojing+huangrong': 0.25, 'hongqigong+huangrong': 0.1, 'xiaolongnv+yangguo': 0.25, 'baozugong+baozupo': 0.25 };
Object.assign(XIA, XIA13);
export const PAIR_CAP = 0.25;
export const xiaInit = () => ({ done: {}, declined: {}, joinT: {}, cooks: 0, lastT: -1e9, pending: null, teacher: null, left: {} });
export function xiaPool(s) {
  const ex = new Set(s.encExclude || []), pool = new Set([...encounterPool(s), 'hongqigong', ...Object.keys(XIA13)]);
  return favSort(s, Object.keys(XIA)).filter((k) => pool.has(k) && !ex.has(k) && !present(s, k) && s.xia.teacher?.id !== k && !s.xia.done[k] && !s.xia.left[k] && styleOk(s, k));
}
// 每 tick：一天最多一個奇遇；不在場、未拒絕三天內
export function xiaStep(s, H) {
  s.xia ??= xiaInit(); const X = s.xia;
  teachStep(s, H); leaveStep(s);
  if (X.pending || s.t - X.lastT < DAY || !s.choices) return;
  for (const k of xiaPool(s)) {
    if ((X.declined[k] || -1e9) > s.t - 3 * DAY || !XIA[k].need(s)) continue;
    const A = XIA[k]; X.pending = k; X.lastT = s.t;
    s.choices.push({ id: `xia-${k}`, xia: k, portrait: `assets/portraits/${k}.png`, title: `【奇遇・${A.where}】${A.title}`, text: A.text, opts: A.role === 'teacher' ? ['好酒好菜招待他', '門派窮，請他走'] : ['收入門下', '婉拒'], at: s.t });
    log(s, `【奇遇】${A.title}：${A.text}`); if (!s.hero?.askMajor) s.autoAt = s.t; return;
  }
}
/* loop68：奇遇卡各選項的後果說明（只寫玩家看得到的結果，不透露暗特質或時機）；純顯示，不寫入狀態 */
export function xiaHints(ch) {
  const A = XIA[ch?.xia]; if (!A) return null; const no = '三天後或許還會再來';
  if (A.role === 'teacher') return [ch.xia === 'zhoubotong' ? '他在山門邊住下，找弟子打賭比武' : '名聲 +3；他在膳房邊住下，吃得好就肯教東西', no];
  return [A.role === 'guest' ? '以客人身分住下：多一張嘴吃飯、佔一個床位；長期心情太差會下山' : '入門成為弟子：多一張嘴吃飯、佔一個床位；長期心情太差會下山', no];
}
export function xiaResolve(s, ch, i) {
  const k = ch.xia, A = XIA[k]; s.choices = s.choices.filter((c) => c !== ch); s.xia.pending = null;
  if (i !== 0) { s.xia.declined[k] = s.t; log(s, `婉拒了${A.name}。（三天後或許還會再來）`); return true; }
  if (A.role === 'teacher' && k === 'zhoubotong') { s.jh ??= {}; s.jh.zbt = { since: s.t, wins: 0, losses: 0, taught: [] }; s.xia.done[k] = true; log(s, '周伯通拍手大笑：「好好好，有人陪我玩了！」在山門邊搭了個草窩。'); return true; }
  if (A.role === 'teacher') { s.xia.teacher = { id: k, name: A.name, stage: 0, meals: 0, since: s.t, lastStageT: s.t - DAY, student: null }; s.rep = (s.rep || 0) + 3;
    const hr = s.ds.find((d) => xidOf(s, d) === 'huangrong'); if (hr) s.aff[`${hr.id}>hongqigong`] = 40;
    log(s, `洪七公在膳房邊上住下：「女娃娃的菜好吃，老叫化就教點東西。」（吃人嘴軟）`); arcAdvance(s, 2, '吃人嘴軟：洪七公留下了'); return true; }
  join(s, k); return true;
}
// 突然入門的高手：帶著底子來（技藝高、心情好）
export function join(s, k) {
  let d;
  const Y = XIA_T[k];
  if (Y) { d = mkComp('huangrong', s.ds.length); Object.assign(d, { id: k, name: Y.name, root: Y.stats.gen, wu: Y.stats.wu, personality: [...Y.personality], known: Y.personality.slice(0, 2), sprite: 'hero', portrait: `assets/portraits/${k}.png`, skills: { ...Y.skills }, values: null, guest: XIA[k].role === 'guest' }); }
  else if (k === 'huangrong') d = mkComp('huangrong', s.ds.length);
  else { const T = heroById(k); d = mkComp('huangrong', s.ds.length); Object.assign(d, { id: k, name: T.name, root: T.stats.gen, wu: T.stats.wu, style: T.style, personality: [...T.personality], known: T.personality.slice(0, 2), sprite: 'hero', portrait: `assets/portraits/${k}.png`,
    skills: k === 'linghuchong' ? { leg: 16, palm: 36, strength: 14, farming: 2, herbal: 2, agility: 30, cooking: 2 } : { leg: 14, palm: 30, strength: 36, farming: 6, herbal: 2, agility: 14, cooking: 2 }, values: null }); }
  Object.assign(d, { companion: false, xia: k, reason: '名俠入門', mood: 80, role: 'inner' });
  d.skills.palm = Math.max(d.skills.palm, k === 'weixiaobao' ? 4 : 30); s.ds.push(d); if (Y) onJoin13(s, d, k);
  for (const o of s.ds) if (o !== d) initPair(s, d, o, 10);
  const mate = s.ds.find((o) => xidOf(s, o) === ({ guojing: 'huangrong', huangrong: 'guojing', yangguo: 'xiaolongnv', xiaolongnv: 'yangguo', baozupo: 'baozugong' })[k]); if (mate) initPair(s, d, mate, 45);
  s.xia.joinT[k] = s.t; s.xia.done[k] = true; s.rep = (s.rep || 0) + 3; for (const o of s.ds) if (o.role !== 'laborer') think(s, o, 'xiaJoin');
  log(s, `【名俠入門】${XIA[k].name}拜入門下！`); return d;
}
// 洪七公分三段傳降龍十八掌：每段要先吃到黃蓉一頓菜（食誘），傳人要有拙／剛的脾性；第三段順帶把打狗棒法傳給黃蓉，然後飄然而去
export const TEACH = { stages: 3, gap: DAY / 2, xp: [1, TIERS[1][0] + 1, TIERS[2][0] + 1], stay: 4 * DAY };
export function pickStudent(s) {
  const c = s.ds.filter((d) => d.role !== 'laborer' && dragonFit(d));
  return c.find((d) => xidOf(s, d) === 'guojing') || c.sort((a, b) => (a.wu ?? 3) - (b.wu ?? 3))[0] || null;
}
function teachStep(s, H) {
  const T = s.xia.teacher; if (!T) return;
  if (T.stage >= TEACH.stages || s.t - T.since > TEACH.stay) return leaveTeacher(s);
  if (T.meals < T.stage + 1 || s.t - T.lastStageT < TEACH.gap) return;
  const st = pickStudent(s); if (!st) { if (!T.warned) { T.warned = true; log(s, '洪七公搖頭：「降龍十八掌講的是剛猛笨拙，你們這兒沒一個傻小子。」'); } return; }
  if (st.away) return;
  T.stage++; T.lastStageT = s.t; T.student = st.id; teach(s, st, 'xianglong', TEACH.xp[T.stage - 1]); think(s, st, 'xiaTaught');
  const mv = artById('xianglong').techs[T.stage - 1];
  log(s, `【傳功 ${T.stage}/3】洪七公吃飽了，把降龍十八掌第 ${T.stage} 段傳給${st.name}——「${({ jianlong: '見龍在田', feilong: '飛龍在天', kanglong: '亢龍有悔' })[mv]}」！`);
  s.fx?.push({ kind: 'dragon', pos: [...(st.pos || [800, 450])], ttl: 2.2 });
  const hr = s.ds.find((d) => xidOf(s, d) === 'huangrong');
  if (hr && T.stage >= 2) { teach(s, hr, 'dagou', TEACH.xp[T.stage - 1]); log(s, `洪七公把打狗棒法${T.stage === 2 ? '起手' : '要訣'}傳給${hr.name}。`); }
  if (T.stage === 3) arcAdvance(s, 3, '降龍傳人');
}
export function teach(s, d, id, xp) { learnArt(d, id, s.t); const r = d.arts[id]; r.xp = Math.max(r.xp, xp); learnArt(d, id, s.t); }
function leaveTeacher(s) {
  const T = s.xia.teacher; s.xia.teacher = null; s.xia.done[T.id] = true; s.xia.left[T.id] = true;
  log(s, T.stage >= TEACH.stages ? '洪七公抹抹嘴：「吃人嘴軟，該教的都教了。」背起酒葫蘆，飄然下山。' : '洪七公等不到合意的傳人，留下一句「後會有期」便下山去了。');
  arcAdvance(s, 4, '華山論劍之約：洪七公臨走說，五年後華山頂上見');
}
// 名俠不會死，只會離開：心情長期低落（一整天低於 15）就下山
function leaveStep(s) {
  for (const d of [...s.ds]) { if (!d.xia || d.away) continue; d.lowT = d.mood < 15 ? (d.lowT || 0) + 0.25 : 0;
    if (d.lowT >= DAY) { removeActor(s, d, '', { quiet: true }); s.xia.left[d.xia] = true; log(s, `${d.name}心灰意冷，留書一封，下山去了。（名俠不死，只是離開）`); } }
}
// 郭靖模板主線：一、洪七公聞香（v0.96）→ 二、吃人嘴軟（洪七公留下）→ 三、降龍傳人 → 四、華山論劍之約
export const GUOJING_ARC = TREES.arcs.guojing;
function arcAdvance(s, n, text) { const H = s.hero; if (!H || H.id !== 'guojing' || (H.arcStep || 0) >= n) return; H.arcStep = n; s.rep = (s.rep || 0) + 2; log(s, `【主線 ${n}/4】${text}`); }
export const onCook = (s, d) => { if (s.xia && xidOf(s, d) === 'huangrong') { s.xia.cooks++; if (s.xia.teacher) s.xia.teacher.meals++; } };
// 同門默契：名俠配對（郭靖＋黃蓉 25%）、主角＋同門預設 10%；上限 25%
export function pairBest(s, d, affFn, compPair) {
  let best = 0; const a = xidOf(s, d);
  for (const o of s.ds) { if (o === d || o.away !== d.away || o.role === 'laborer') continue; const b = xidOf(s, o);
    let cap = XIA_PAIRS[[a, b].sort().join('+')]; if (cap == null) cap = compPair(d, o); if (!cap) continue;
    best = Math.max(best, cap * Math.min(1, Math.max(0, affFn(s, d, o)) / 60)); }
  return Math.min(PAIR_CAP, best);
}

// ==== （原 huashan.mjs）====
// v1.2 華山線（PROTAGONIST §4.3、ROADMAP §11）：岳不群（紫霞九層、辟邪三卡、嵩山施壓、嫉令狐沖與逐出）、
// 令狐沖（模板主線＋名俠奇遇）、風清揚（思過崖傳獨孤九劍，傳完就走）
export const hsInit = () => ({ zx: 0, cave: false, carv: 0, lastCarvDay: -1, bixie: 0, bixieT: null, songN: 0, songLast: 0, siguo: false, feng: null, fengLeft: false, fengTries: 0, jealous: false, lhc: 'stay', cards: {}, arcN: 0 });
const heroD = (s) => s.ds.find((d) => d.id === 'hero');
const isHero = (s, id) => s.hero?.kind === 'template' && s.hero.id === id;
const find = (s, x) => s.ds.find((d) => xidOf(s, d) === x);
const once = (s, k) => { if (s.hs.cards[k]) return false; s.hs.cards[k] = true; return true; };
// ---- 抉擇卡（自動駕駛依價值觀；偽君子做虧心事一律添違心） ----
const P = (k) => `assets/portraits/${k}.png`;
// v2.0 A8：卡文字／選項／價值觀移至 destiny-trees.json；此處只留效果函式（依選項序號）
const FX = {
  lin2: [(s) => { s.hs.bixie = 2; s.align = (s.align ?? 40) - 10; const l = find(s, 'linghuchong'); if (l) bump(s, l, heroD(s), -15); }, (s) => { s.hs.bixie = -1; }],
  lin3: [(s) => bixie(s, heroD(s)), (s) => { s.hs.bixie = -1; log(s, '袈裟化作灰燼。華山派仍得一步一步練紫霞。'); }],
  song: [(s) => { s.rep = (s.rep || 0) + 1; }, (s) => { s.raidT = 1e9; s.rep = (s.rep || 0) + 3; }, (s) => { s.rep = Math.max(0, (s.rep || 0) - 5); resAdd(s, 'coin', 30); }],
  siguo: [(s) => { s.hs.siguo = true; log(s, '令狐沖背著酒葫蘆上了思過崖。'); }, () => {}],
  feng: [(s) => fengStart(s), (s) => { s.hs.fengTries = 99; }],
  cave: [(s) => { s.hs.cave = true; log(s, '【華山祕洞】開啟：每日可讀壁刻（紫霞四至六層要靠它，觀破值同時增加）'); }, (s) => { s.hs.cave = 'sealed'; }],
  expel: [(s) => expel(s), (s) => { s.hs.lhc = 'kept'; log(s, '岳不群拍拍令狐沖的肩：「華山有你，是華山的福氣。」'); }],
};
export const CARDS = buildCards(TREES.cards.huashan, FX);
function bump(s, a, b, v) { if (!a || !b) return; const k = `${a.id}>${b.id}`; s.aff[k] = Math.max(-100, Math.min(100, (s.aff[k] || 0) + v)); }
export function card(s, id) {
  if (!once(s, id) && id !== 'song') return null; const C = CARDS[id];
  const ch = { id: `hs-${id}-${Math.floor(s.t)}`, hs: id, title: `【${C.title}】`, text: C.text, opts: C.opts.map((o) => o[0]), portrait: P(C.who), at: s.t };
  s.choices ??= []; s.choices.push(ch); log(s, `【抉擇】${C.title}：${C.text}`); if (!s.hero?.askMajor) s.autoAt = s.t; return ch;
}
export function hsAutoPick(s, ch) { if (ch.hs === 'feng') return 0; const v = s.hero?.values || {}; let b = 0, bv = -1e9; CARDS[ch.hs].opts.forEach(([, dv], i) => { const sc = Object.entries(dv).reduce((a, [k, x]) => a + x * (v[k] || 0), 0); if (sc > bv) { bv = sc; b = i; } }); return b; }
export function hsResolve(s, ch, i) {
  const [text, dv, run] = CARDS[ch.hs].opts[i], d = heroD(s); s.choices = s.choices.filter((c) => c !== ch);
  if (d?.values) { for (const [k, x] of Object.entries(dv)) d.values[k] = Math.max(-50, Math.min(50, (d.values[k] || 0) + x));
    const hyp = (d.personality || []).includes('hypocrite') && (dv.xia || 0) < 0; if (hyp || Object.entries(dv).some(([k, x]) => x < 0 && (d.values[k] || 0) >= 20)) addWexin(s, d, `抉擇「${text}」${hyp ? '（人前君子，人後虧心）' : '違背本心'}`); }
  log(s, `決定：${text}`); run(s); return true;
}
// ---- 紫霞神功九層：1–3 閉關、4–6 華山祕洞壁刻、7–9 連續 7 天沒有違心（且定力 ≥4、心情 ≥60） ----
export const zxLayer = (d) => d.zixia || 0;
export function zxGate(s, d) {
  const L = zxLayer(d); if (L >= 9) return '已至第九層';
  if (L >= 3 && L < 6 && s.hs.carv < L - 2) return `要讀華山祕洞壁刻（${s.hs.carv}/${L - 2}）`;
  if (L >= 6) { const clean = (s.t - (d.lastWexinT ?? -1e9)) / DAY; if ((d.ding || 3) < HS.zxDingMin) return '定力不足 4'; if (d.mood < HS.zxMoodMin) return '心情不足 60';
    if (clean < HS.cleanDays) return `需連續 ${HS.cleanDays} 天沒有違心（目前 ${Math.max(0, clean).toFixed(1)} 天）`; }
  return null;
}
export function zxUp(s, d) {
  d.zixia = zxLayer(d) + 1; s.hs.zx = 0; learnArt(d, 'zixia', s.t); d.arts.zixia.xp = Math.min(100, d.zixia * 11 + 1); think(s, d, 'zixiaUp');
  s.fx?.push({ kind: 'zixia', pos: [...(d.pos || [800, 450])], ttl: 2.0 }); log(s, `【紫霞神功 第 ${d.zixia} 層】${d.name}閉關衝關，紫氣自頂門升起${d.zixia >= 5 ? '，劍刃隱隱泛紫' : ''}。`);
  if (d.zixia === 3 && isHero(s, 'yuebuqun')) card(s, 'cave'); if (d.zixia === 7 && isHero(s, 'yuebuqun')) arc(s, 4, '紫霞七層：偽君子能否撐過七天不虧心？');
}
// ---- 辟邪劍譜：捷徑，自宮＋斷情 ----
export function bixie(s, d) {
  s.hs.bixie = 3; s.hs.bixieT = s.t; d.duanqing = s.t; learnArt(d, 'bixie', s.t); d.arts.bixie.xp = TIERS[2][0] + 5; d.arts.bixie.bt1 = true; learnArt(d, 'bixie', s.t);
  for (const k of Object.keys(s.rel || {})) if (k.includes(d.id) && /couple|spouse|lover/.test(JSON.stringify(s.rel[k]))) delete s.rel[k];
  const n = find(s, 'ningzhongze'), y = find(s, 'yuelingshan'); if (n) { bump(s, n, d, -40); n.lockDown = true; } if (y) think(s, y, 'bixieShock');
  for (const o of s.ds) if (o !== d && o.role !== 'laborer') think(s, o, 'bixieShock');
  log(s, `【辟邪劍法】${d.name}閉門七日，再出來時嗓音尖細、出劍快如鬼魅。（斷情：從此不近道侶，寧中則好感只會往下掉）`); arc(s, 3, '辟邪：捷徑到手，人心盡失');
}
// ---- 獨孤九劍 ----
export const duguForms = (d) => (d.dugu || []).length;
export function fengFit(d) { const p = d.personality || [];
  const orthodox = p.includes('rigid') && Object.entries(d.arts || {}).some(([id, r]) => !['dugu'].includes(id) && artTier(d, id) >= 3);
  return { ok: (d.wu ?? 3) >= 4 && (p.includes('free') || p.includes('bold')) && !p.includes('worrier') && !p.includes('rigid'), orthodox }; }
export function fengStudent(s) {
  const lhc = find(s, 'linghuchong'); if (lhc && !lhc.away && !fengFit(lhc).orthodox) return lhc;
  return s.ds.filter((d) => d.role !== 'laborer' && !d.away && !fengFit(d).orthodox).sort((a, b) => (fengFit(b).ok - fengFit(a).ok) || (b.wu ?? 3) - (a.wu ?? 3))[0] || null;
}
function fengStart(s) { const st = fengStudent(s); s.hs.feng = { night: 0, student: st?.id || null, lastDay: s.day }; log(s, `風清揚：「我只教三晚，第四晚跟你過招。」${st ? `（傳人：${st.name}）` : ''}`); arc(s, 2, '思過崖遇風清揚'); }
function fengStep(s, H) {
  const F = s.hs.feng; if (!F || s.day === F.lastDay) return; F.lastDay = s.day; const st = s.ds.find((d) => d.id === F.student) || fengStudent(s); if (!st) return; F.student = st.id;
  if (st.away) return; F.night++;
  if (F.night <= HS.fengNights) { log(s, `【思過崖・第 ${F.night} 晚】風清揚指點${st.name}：「活學活使，無招勝有招。」`); return; }
  const fit = fengFit(st), p = fit.orthodox ? 0 : fit.ok ? 1 : HS.softP, r = (H?.rand ? H.rand(s) : Math.random());
  if (r < p) { learnDugu(s, st, 'dg0'); for (const f of DUGU) if (formReady(s, st, f)) learnDugu(s, st, f.id); s.hs.feng = null; s.hs.fengLeft = true;
    log(s, `【獨孤九劍】第四晚對練，${st.name}劍隨意走，風清揚點頭：「總訣你懂了。」說罷飄然入崖，不知所蹤。`); arc(s, 3, '總訣式'); return; }
  s.hs.fengTries++; F.night = 0; log(s, `風清揚搖頭：「${fit.orthodox ? '你的劍已經被規矩捆死了' : '心裡掛的事太多'}。」${fit.orthodox ? '（拘謹＋正統劍法圓滿：互斥）' : `（性格不合，只有 ${Math.round(HS.softP * 100)}% 機會）`}`);
  if (s.hs.fengTries >= 3) { s.hs.feng = null; s.hs.fengLeft = true; log(s, '風清揚嘆了口氣，從此思過崖再無人影。'); }
}
export function formReady(s, d, f) { if (f.id === 'dg0') return true; if (!(d.dugu || []).includes('dg0')) return false;
  const ins = Math.max(0, ...f.foes.map((k) => s.codex?.[k]?.insight || 0)); if (ins < f.need) return false;
  return !f.inner || Object.keys(d.arts || {}).some((id) => artTier(d, id) >= 4) || zxLayer(d) >= 9; }
export function learnDugu(s, d, id) {
  d.dugu ??= []; if (d.dugu.includes(id)) return false; d.dugu.push(id); learnArt(d, 'dugu', s.t); d.arts.dugu.xp = Math.min(100, d.dugu.length * 11 + 1); if (!d.moves.includes(id)) d.moves.push(id);
  const f = DUGU.find((x) => x.id === id); if (id === 'dg0') think(s, d, 'duguGot'); log(s, `【獨孤九劍・${f.name}】${d.name}${id === 'dg0' ? '悟通總訣' : `見識過${f.foes.map((k) => k).length ? '對應的敵人' : ''}，悟出${f.name}`}（${d.dugu.length}/9）`);
  s.fx?.push({ kind: 'dugu', pos: [...(d.pos || [800, 450])], ttl: 1.6 });
  if (d.dugu.length >= 3) arc(s, 4, '九劍湊齊三式'); return true;
}
// ---- 逐出令狐沖 ----
function expel(s) { const l = find(s, 'linghuchong'); s.hs.lhc = 'expelled'; if (!l) return; removeActor(s, l, '', { quiet: true }); s.xia && (s.xia.left.linghuchong = true);
  log(s, `【逐出師門】${l.name}跪著磕了三個頭，背起酒葫蘆下山。江湖從此多了個浪子。`); arc(s, 5, '令狐沖去留：逐出'); }
// ---- 主線（岳不群 5 步、令狐沖 5 步） ----
export const ARC_YUE = TREES.arcs.yuebuqun;
export const ARC_LHC = TREES.arcs.linghuchong;
function arc(s, n, text) { const H = s.hero; if (!H || H.kind !== 'template' || !['yuebuqun', 'linghuchong'].includes(H.id)) return; if ((H.arcStep || 0) >= n) return; H.arcStep = n; s.rep = (s.rep || 0) + 2; log(s, `【主線 ${n}/5】${text}`); }
// ---- 每 tick ----
export function hsStep(s, dt, H) {
  s.hs ??= hsInit(); const X = s.hs, d = heroD(s), yue = isHero(s, 'yuebuqun'), lhcH = isHero(s, 'linghuchong');
  // 開局：岳不群帶紫霞第一層
  if (yue && d && !d.zixia) { d.zixia = 1; learnArt(d, 'zixia', s.t); d.arts.zixia.xp = 12; }
  // 紫霞衝關：打坐／練功累積
  for (const p of s.ds) if (p.zixia && !p.away && ['meditate', 'train'].includes(p.task?.act)) { X.zx += dt; if (X.zx >= HS.zxNeed * zxLayer(p) && !zxGate(s, p)) zxUp(s, p); }
  for (const p of s.ds) if (p.arts?.zixia) p.arts.zixia.xp = Math.min(100, zxLayer(p) * 11 + 1);
  // 壁刻：每天讀一次
  if (X.cave === true && X.carv < 3 && s.day !== X.lastCarvDay && d && !d.away) { X.lastCarvDay = s.day; X.carv += HS.carvPer; for (const k of ['hermit', 'swordtomb', 'bandit', 'chief']) { s.codex[k] ??= { seen: 0, kills: 0, fled: 0, insight: 0 }; s.codex[k].insight += HS.carvInsight; } log(s, `讀華山祕洞壁刻（${X.carv}）：五嶽劍法與破法一一印在心裡。`); }
  // 力量倍率（紫霞每層 +3%，辟邪隨斷情天數上升）
  for (const p of s.ds) { let m = 1 + HS.zxPow * zxLayer(p); if (p.duanqing != null) m *= 1 + Math.min(HS.bixieCap, (s.t - p.duanqing) / DAY * HS.bixieDayPow); p.powMul = m; if (p.lockDown) { const n = find(s, 'ningzhongze'); if (n) bump(s, n, p, -0.002); } }
  // 九劍：每天檢查一次，見過的敵人夠多就悟出新式
  if (s.day !== X.duguDay) { X.duguDay = s.day; for (const p of s.ds) if (p.dugu?.length) for (const f of DUGU) if (!p.dugu.includes(f.id) && formReady(s, p, f)) learnDugu(s, p, f.id); }
  fengStep(s, H);
  if (s.choices?.some((c) => c.hs)) return; // 一次一張
  if (yue) {
    const H0 = s.hero; if (H0.flags?.lin && !find(s, 'linpingzhi') && !X.cards.linJoin) { X.cards.linJoin = true; const l = mkComp('linpingzhi', s.ds.length); Object.assign(l, { companion: false, reason: '投靠', xia: 'linpingzhi' }); s.ds.push(l); for (const o of s.ds) if (o !== l) initPair(s, l, o, 10); log(s, '林平之磕頭拜師，成了華山弟子。'); X.bixie = 1; X.linT = s.t; }
    if (X.bixie === 1 && s.t - X.linT >= DAY && card(s, 'lin2')) return;
    if (X.bixie === 2 && card(s, 'lin3')) { arc(s, 2, '暗查劍譜'); return; }
    if (s.day >= 3 && s.day - X.songLast >= HS.songEvery) { X.songLast = s.day; X.songN++; card(s, 'song'); return; }
    const lhc = find(s, 'linghuchong');
    if (lhc && s.day >= 4 && !X.cards.siguo) { card(s, 'siguo'); return; }
    if (lhc && X.lhc === 'stay' && d && ((lhc.dugu?.length || 0) >= 1 || (lhc.skills.palm > d.skills.palm + 10))) { if (!X.jealous) { X.jealous = true; think(s, d, 'jealous'); log(s, `${d.name}看著${lhc.name}練劍，臉上笑著，心裡發酸。（嫉）`); } card(s, 'expel'); return; }
  }
  // 風清揚：令狐沖上了思過崖（岳不群罰）、令狐沖主角選了「進洞」、或令狐沖以名俠身分入門一天後
  const lhc = find(s, 'linghuchong');
  if (!X.feng && !X.fengLeft && X.fengTries < 3 && !X.cards.feng && lhc && (X.siguo || (lhcH && s.hero.flags?.feng) || (lhc.xia && s.t - (s.xia?.joinT?.linghuchong ?? s.t) >= DAY))) { card(s, 'feng'); return; }
  if (lhcH && d && duguForms(d) >= 3 && !X.cards.free) { X.cards.free = true; arc(s, 5, '自立門戶：被逐出華山的浪子，在破道館掛起自己的匾'); }
}
