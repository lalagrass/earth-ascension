// v1.1 名俠奇遇（ROADMAP §13）：名俠池（扣掉主角／同門）、觸發（巡山深度、下山、名聲、下廚）、突然入門的高手、
// 第一組：郭靖、黃蓉（只有這兩位能入門當弟子）、洪七公（傳完就走的師父）；名俠只會離開，不會死
import { favSort } from './sect.mjs';
import { DAY, TIERS } from './data.mjs';
import { think } from './mind.mjs';
import { encounterPool, mkComp, heroById } from './hero.mjs';
import { learnArt, artById } from './arts.mjs';
import { log } from './util.mjs';
import { initPair } from './social.mjs';
import { onJoin13 } from './jianghu.mjs';
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
  return favSort(s, Object.keys(XIA)).filter((k) => pool.has(k) && !ex.has(k) && !present(s, k) && s.xia.teacher?.id !== k && !s.xia.done[k] && !s.xia.left[k]);
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
    if (d.lowT >= DAY) { s.ds = s.ds.filter((x) => x !== d); s.xia.left[d.xia] = true; log(s, `${d.name}心灰意冷，留書一封，下山去了。（名俠不死，只是離開）`); } }
}
// 郭靖模板主線：一、洪七公聞香（v0.96）→ 二、吃人嘴軟（洪七公留下）→ 三、降龍傳人 → 四、華山論劍之約
export const GUOJING_ARC = ['洪七公聞香而來', '吃人嘴軟', '降龍傳人', '華山論劍之約'];
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
