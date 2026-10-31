import { REL_STAGES, OPPOSE, LIKES, TRAITS, THOUGHTS, NEED_MOOD, MOOD, WORK_ACTS, LEISURE_ACTS, REVEAL_AT, NEW_TRAITS } from './data.mjs';
import { clamp, log, relKey, affKey } from './util.mjs';
import { wexinMood } from './hero.mjs';
import { seasonOf } from './economy.mjs';
// ==== （原 social.mjs）====
// 人際（v0.7）：雙向好感 aff[a>b]、相容度、關係階段由雙向平均決定
export const relStage = (v) => { let n = REL_STAGES[0][1]; for (const [t, name] of REL_STAGES) if (v >= t) n = name; return n; };
// a 看 b 的相容係數 0.4–1.6
export function compat(a, b) {
  let sc = 0; const A = a.personality || [], B = b.personality || [];
  for (const x of A) for (const y of B) { if (OPPOSE.some(([p, q]) => (p === x && q === y) || (p === y && q === x))) sc -= 1; if ((LIKES[x] || []).includes(y)) sc += 1; }
  return clamp(1 + 0.3 * sc, 0.4, 1.6);
}
export const aff = (s, a, b) => s.aff[affKey(a.id ?? a, b.id ?? b)] ?? 0;
export function initPair(s, a, b, v) { s.aff[affKey(a.id, b.id)] = v; s.aff[affKey(b.id, a.id)] = v; s.rel[relKey(a.id, b.id)] = v; }
export function relAdd(s, a, b, amt) {
  const k = relKey(a.id, b.id), before = s.rel[k] || 0, cap = a.adult && b.adult ? 100 : 89; // 未成年不進道侶
  for (const [x, y] of [[a, b], [b, a]]) { const kk = affKey(x.id, y.id); s.aff[kk] = clamp((s.aff[kk] ?? before) + amt * compat(x, y), 0, cap); }
  s.rel[k] = (aff(s, a, b) + aff(s, b, a)) / 2;
  if (relStage(before) !== relStage(s.rel[k])) {
    log(s, `${a.name}與${b.name}成了「${relStage(s.rel[k])}」`);
    if (s.rel[k] >= 90 && !s.families.includes(k) && (!a.sweet || a.sweet === b.id) && (!b.sweet || b.sweet === a.id)) { s.families.push(k); a.sweet = b.id; b.sweet = a.id; log(s, `${a.name}與${b.name}結為道侶，認定了彼此是心上人。`); } // v1.8 心上人唯一
  }
}

// ==== （原 draw.mjs）====
// loop6 M6：人以群分——外向的人主動交友、強者吸引人靠近。只在 s.draw 開啟時生效（golden 不變）。
export const DRAW = {
  extroTraits: ['sociable', 'glib', 'playful', 'bold'], // 只出現在 E 型的特質
  chatMul: 1.35,       // 外向者想找人聊的意願
  extroPull: 6,        // 被選為聊天對象時，外向者加分（同好感度刻度）
  powPull: 0.25,       // 每 1 點武力差加分，上限 powCap
  powCap: 12,
  admireGap: 20,       // 對方武力高出這麼多 → 仰慕
  admireRel: 2,
  affBand: 10,         // 只在好感度接近最佳者的人選裡比吸引力（避免拆散既有交情）        // 仰慕額外關係
};
export const isExtro = (d) => (d.mbti ? d.mbti[0] === 'E' : (d.personality || []).some((t) => DRAW.extroTraits.includes(t)));
const MARTIAL = ['palm', 'leg', 'sword', 'fist', 'staff', 'blade'];
export function powOf(d) { const k = d.skills || {}; return (k.strength || 0) + (k.agility || 0) + Math.max(0, ...MARTIAL.map((m) => k[m] || 0)); }
export function drawOf(d, o) { return (isExtro(o) ? DRAW.extroPull : 0) + Math.min(DRAW.powCap, Math.max(0, powOf(o) - powOf(d)) * DRAW.powPull); }
export function drawBoost(s, d, out) { if (!s.draw || !isExtro(d)) return; for (const o of out) if (o.act === 'chat') o.score *= DRAW.chatMul; }
export function pickChatMate(s, d, mates, aff) { if (!mates.length) return undefined; const best = Math.max(...mates.map((o) => aff(s, d, o))); return mates.filter((o) => aff(s, d, o) >= best - DRAW.affBand).sort((a, b) => (aff(s, d, b) + drawOf(d, b)) - (aff(s, d, a) + drawOf(d, a)))[0]; }
// 聊完：弱的一方若對方明顯更強 → 仰慕（多一點關係＋一則想法）
export function admire(s, d, p, relAdd, think, log) {
  if (!s.draw) return;
  for (const [a, b] of [[d, p], [p, d]]) if (powOf(b) - powOf(a) >= DRAW.admireGap) {
    relAdd(s, a, b, DRAW.admireRel); think(s, a, 'admire', `（${b.name}）`);
    const K = `adm|${a.id}|${b.id}`; (s.memTalk ??= {}); if (s.memTalk[K] !== s.day) { s.memTalk[K] = s.day; log(s, `${a.name}對${b.name}的功夫心生仰慕`, 'low'); }
  }
}

// ==== （原 mentor.mjs）====
// loop8 M8 同修與請教：一起練功互相砥礪、向強者請教得武學經驗、常一起練的人會結伴。
// 只在 s.mentor 開啟時生效（golden 不變）；不改任何既有成長數值，只在新路徑上「另加」一小筆。
export const MENTOR = {
  coMul: 0.25,      // 同修：同時在練的人，額外加一次 25% 的練功量
  coRel: 1,         // 同修一次加關係
  askGap: 20,       // 對方武力高出這麼多才算「請教」
  askAmt: 2,        // 請教一次的主修路數經驗（原練功一次為 5）
  pairAt: 3,        // 同修這麼多次算「練功搭子」
  pairMul: 1.15,    // 搭子正在練時，自己去練的意願
};
const training = (s, d) => s.ds.filter((o) => o !== d && !o.away && o.task?.act === 'train' && !o.path?.length);
// 練功完成時
export function coTrain(s, d, amt, grow, relAdd, log) {
  if (!s.mentor) return 0; const mates = training(s, d); if (!mates.length) return 0;
  grow(s, d, 'style', amt * MENTOR.coMul);
  for (const m of mates) { (d.mates ??= {}); d.mates[m.id] = (d.mates[m.id] || 0) + 1; if (d.id < m.id) relAdd(s, d, m, MENTOR.coRel);
    if (d.mates[m.id] === MENTOR.pairAt) log(s, `${d.name}和${m.name}常一起練功，成了練功搭子`, 'low'); }
  (s.mentorN ??= { co: 0, ask: 0 }).co++; return mates.length;
}
// 聊天／切磋完成時：弱的一方向強的一方請教
export function askStrong(s, d, p, grow, think, log) {
  if (!s.mentor || !p) return null;
  for (const [a, b] of [[d, p], [p, d]]) if (powOf(b) - powOf(a) >= MENTOR.askGap) {
    grow(s, a, 'style', MENTOR.askAmt); (s.mentorN ??= { co: 0, ask: 0 }).ask++;
    const K = `ask|${a.id}|${b.id}`; (s.memTalk ??= {}); if (s.memTalk[K] !== s.day) { s.memTalk[K] = s.day; log(s, `${a.name}向${b.name}請教功夫，頗有心得`, 'low'); }
    return a;
  }
  return null;
}
// 評分：搭子正在練 → 想去一起練
export function pairBoost(s, d, out) {
  if (!s.mentor || !d.mates) return; const pals = training(s, d).filter((o) => (d.mates[o.id] || 0) >= MENTOR.pairAt);
  if (pals.length) for (const o of out) if (o.act === 'train') { o.score *= MENTOR.pairMul; o.why = `${pals[0].name}在練功，一起去`; }
}

// ==== （原 mind.mjs）====
// 心智（v0.6→v0.7 拆檔）：性格、想法、心情、特質揭露
export function think(s, d, id, extra = '') {
  const T = THOUGHTS[id]; if (!T) return;
  let v = T.v; for (const p of d.personality || []) { const m = TRAITS[p]?.thoughtMul; if (m?.[T.tag]) v *= m[T.tag]; else if (m?.bad && v < 0) v *= m.bad; }
  const ex = d.thoughts.find((x) => x.id === id);
  if (ex) { ex.left = T.ttl; ex.v = Math.round(v); } else d.thoughts.push({ id, text: T.text + extra, v: Math.round(v), left: T.ttl });
}
export function moodParts(d, s) {
  const parts = [['基線', MOOD.base]];
  for (const p of d.personality || []) if (TRAITS[p]?.moodBase) parts.push([TRAITS[p].name, TRAITS[p].moodBase]);
  for (const th of d.thoughts) parts.push([th.text, th.v]);
  for (const [k, [thr, v, tag]] of Object.entries(NEED_MOOD)) if ((d.needs[k] ?? 100) < thr) { let x = v; for (const p of d.personality || []) { const m = TRAITS[p]?.thoughtMul; if (m?.[tag]) x *= m[tag]; } parts.push([{ hunger: '肚子餓', energy: '累', social: '寂寞', fun: '悶' }[k], Math.round(x)]); }
  if (d.id === 'hero' && s) { parts.push(['一派之主的心氣', 5]); if (s.t < 3 * 600) parts.push(['開山之初，滿懷期待', 6]); } // v0.97 修正前期主角心情偏低
  if (d.wexin) parts.push([`違心×${d.wexin}`, Math.round(wexinMood(d))]);
  if (s) { const se = seasonOf(s); if (se.mood) parts.push([`${se.name}天`, se.mood]); }
  return parts;
}
export const moodTarget = (d, s) => clamp(moodParts(d, s).reduce((a, [, v]) => a + v, 0), 0, 100);
export function moodStep(s, d, dt) {
  for (const th of d.thoughts) th.left -= dt; d.thoughts = d.thoughts.filter((x) => x.left > 0);
  const diff = moodTarget(d, s) - d.mood; d.mood = clamp(d.mood + clamp(diff, -MOOD.down * dt, MOOD.up * dt), 0, 100);
}
export function traitMul(d, act) { let m = 1; for (const p of d.personality || []) m *= TRAITS[p]?.mods?.[act] || 1; return m; }
export function moodMul(d, act) {
  if (d.mood < MOOD.low) return WORK_ACTS.includes(act) ? 0.6 : LEISURE_ACTS.includes(act) ? 1.35 : 1;
  if (d.mood > MOOD.high) return WORK_ACTS.includes(act) ? 1.15 : 1;
  return 1;
}
export const focusMul = (d) => 0.8 + 0.4 * (d.mood / 100);
export const moodLabel = (m) => (m < 15 ? '崩潰邊緣' : m < MOOD.low ? '低落' : m < MOOD.high ? '平穩' : m < 90 ? '愉快' : '意氣風發');
// 揭露：相處時間累積；聊天、被鼓勵時額外加
export function revealStep(s, d, dt) {
  d.together = (d.together || 0) + dt;
  d.personality.forEach((p, i) => {
    if (d.known.includes(p)) return;
    if (d.together >= (d.revealAt?.[i] ?? REVEAL_AT[i] ?? 900)) { d.known.push(p); log(s, `相處日久，看出${d.name}${TRAITS[p].name}：${TRAITS[p].desc}`); }
  });
}
export const knownTraits = (d) => d.personality.map((p) => (d.known.includes(p) ? p : null));

// ==== （原 mbti.mjs）====
// loop1 M1：16 型人格（四軸）→ 既有性格特質的映射。純資料＋純函式，尚未接進創角或 sim（見 loop/ROADMAP.md M2）。
// 參考：MBTI 四軸只取「外向／內向、實感／直覺、思考／情感、判斷／感知」的公開概念，不用任何商標問卷原文；題目自寫。
// 對應的「武俠參考人物」只是說明文字，不代表該人物在遊戲裡的人格設定。

export const AXES = [['E', 'I', '外向', '內向'], ['S', 'N', '實感', '直覺'], ['T', 'F', '思考', '情感'], ['J', 'P', '判斷', '感知']];
// 每型兩個既有特質（順序＝主、次），外加一位參考人物
export const TYPES = {
  ISTJ: { name: '守成', traits: ['rigid', 'diligent'], ref: '滅絕師太' },
  ISFJ: { name: '篤實', traits: ['honest', 'gentle'], ref: '郭靖' },
  INFJ: { name: '仁心', traits: ['kind', 'worrier'], ref: '張無忌' },
  INTJ: { name: '謀略', traits: ['clever', 'diligent'], ref: '黃藥師' },
  ISTP: { name: '孤劍', traits: ['nimble', 'free'], ref: '風清揚' },
  ISFP: { name: '清逸', traits: ['gentle', 'free'], ref: '小龍女' },
  INFP: { name: '痴情', traits: ['free', 'worrier'], ref: '段譽' },
  INTP: { name: '博覽', traits: ['clever', 'lazy'], ref: '王語嫣' },
  ESTP: { name: '機變', traits: ['glib', 'playful'], ref: '韋小寶' },
  ESFP: { name: '豪食', traits: ['glutton', 'bold'], ref: '洪七公' },
  ENFP: { name: '頑童', traits: ['playful', 'sociable'], ref: '周伯通' },
  ENTP: { name: '巧辯', traits: ['clever', 'glib'], ref: '黃蓉' },
  ESTJ: { name: '豪俠', traits: ['brave', 'bold'], ref: '喬峰' },
  ESFJ: { name: '溫厚', traits: ['sociable', 'gentle'], ref: '穆念慈' },
  ENFJ: { name: '俠義', traits: ['kind', 'sociable'], ref: '郭襄' },
  ENTJ: { name: '霸主', traits: ['clever', 'brave'], ref: '東方不敗' },
};
export const traitExists = (t) => !!(TRAITS[t] || NEW_TRAITS[t]);
export const isType = (x) => typeof x === 'string' && Object.hasOwn(TYPES, x);
export const traitsOf = (type) => { if (!isType(type)) throw new Error(`未知人格型：${type}`); return [...TYPES[type].traits]; };

// 八題問心（每軸兩題）：答案 [文字, 該軸的極]；同分時取第一個極（E/S/T/J），可重現
export const MBTI_Q = [
  { axis: 0, q: '練完功，你想？', a: [['找師兄弟喝一杯', 'E'], ['回房靜坐', 'I']] },
  { axis: 0, q: '山門來了生人', a: [['上前招呼', 'E'], ['遠遠看著', 'I']] },
  { axis: 1, q: '學一套新拳', a: [['照譜一招一式', 'S'], ['先想通拳意', 'N']] },
  { axis: 1, q: '看到一面石壁刻痕', a: [['數數有幾道', 'S'], ['猜是誰留下的劍意', 'N']] },
  { axis: 2, q: '同門犯錯', a: [['照門規辦', 'T'], ['先問他難處', 'F']] },
  { axis: 2, q: '比武贏了', a: [['檢討哪招可再快', 'T'], ['扶對手起來', 'F']] },
  { axis: 3, q: '明日下山', a: [['今晚收好行囊', 'J'], ['到時再說', 'P']] },
  { axis: 3, q: '師父交代的功課', a: [['按日排好', 'J'], ['興致來了一口氣練完', 'P']] },
];
export function typeFromAnswers(picks) {
  if (!Array.isArray(picks) || picks.length !== MBTI_Q.length) throw new Error(`需要 ${MBTI_Q.length} 個答案`);
  const score = [0, 0, 0, 0];
  picks.forEach((i, k) => { const Q = MBTI_Q[k], a = Q.a[i]; if (!a) throw new Error(`第 ${k + 1} 題沒有選項 ${i}`); score[Q.axis] += a[1] === AXES[Q.axis][0] ? 1 : -1; });
  return AXES.map((ax, i) => (score[i] >= 0 ? ax[0] : ax[1])).join('');
}
// 反查：由既有特質找最接近的型（重疊數最多；同分取 TYPES 宣告順序）。給舊角色顯示用，不改其特質。
export function nearestType(personality = []) {
  let best = null, bs = -1;
  for (const [k, v] of Object.entries(TYPES)) { const sc = v.traits.filter((t) => personality.includes(t)).length * 2 + (personality[0] === v.traits[0] ? 1 : 0); if (sc > bs) { bs = sc; best = k; } }
  return bs > 0 ? best : null;
}
// loop5：顯示用標籤；參考人物一律只標「參考」
export const typeLabel = (type) => (isType(type) ? `${type}・${TYPES[type].name}（參考：${TYPES[type].ref}）` : '');
// loop5：創角選 16 型時的特質；悟性 1 照舊先得「憨厚」（笨功夫），總數維持 2 個可見特質
export function mbtiPersonality(type, wu) { const p = traitsOf(type); if (wu === 1 && !p.includes('honest')) p.unshift('honest'); return p.slice(0, 2); }
// loop13：問卷 UI 用；未答完回 null
export function quizResult(picks) { if (!Array.isArray(picks) || picks.length !== MBTI_Q.length || picks.some((x) => x == null || x === '')) return null; return typeFromAnswers(picks.map(Number)); }

// ==== （原 archetype.mjs）====
// loop21 武俠人物原型：只借「性格／資質」的公開印象，人物一律只標「參考」；不用任何立繪、不借臉。
// 主角：自創時可選原型＝一組合法六項點數＋兩個明面特質（價值觀與暗特質仍看九問）。
// 招募：江湖規則「人以群分」（s.draw）開時，新弟子抽一個原型，根骨／悟性落在原型附近（±1），原型首特質補為暗特質。
export const ARCH = {
  kulian: { name: '苦練憨直', ref: '郭靖', stats: { wu: 1, gen: 5, li: 3, shen: 1, ding: 2, fu: 1 }, traits: ['honest', 'diligent'], desc: '悟性低、根骨好，肯下笨功夫' },
  caizi: { name: '灑脫才子', ref: '令狐沖', stats: { wu: 5, gen: 2, li: 1, shen: 2, ding: 1, fu: 1 }, traits: ['free', 'sociable'], desc: '悟性極高，愛交朋友，不拘一格' },
  renhou: { name: '仁厚溫和', ref: '張無忌', stats: { wu: 3, gen: 4, li: 1, shen: 1, ding: 2, fu: 1 }, traits: ['gentle', 'worrier'], desc: '根骨好、心軟，愛照顧人，常多慮' },
  jiling: { name: '機靈百變', ref: '黃蓉', stats: { wu: 4, gen: 2, li: 1, shen: 3, ding: 1, fu: 1 }, traits: ['playful', 'sociable'], desc: '聰明身輕，愛往外跑、愛說話' },
  haomai: { name: '豪邁俠客', ref: '喬峰', stats: { wu: 2, gen: 3, li: 4, shen: 1, ding: 1, fu: 1 }, traits: ['brave', 'optimist'], desc: '力大膽大，天塌下來也笑' },
  laowan: { name: '天真頑童', ref: '周伯通', stats: { wu: 4, gen: 3, li: 1, shen: 2, ding: 1, fu: 1 }, traits: ['playful', 'glutton'], desc: '貪玩貪吃，悟性不差' },
};
export const isArch = (id) => !!ARCH[id];
export const archLabel = (id) => (isArch(id) ? `${ARCH[id].name}（參考：${ARCH[id].ref}）` : '');
const clamp15 = (x) => Math.max(1, Math.min(5, x));
// 招募用：r() 為 0–1 亂數
export function archRecruit(r) { const ids = Object.keys(ARCH), id = ids[Math.floor(r() * ids.length)], A = ARCH[id];
  return { id, root: clamp15(A.stats.gen + Math.floor(r() * 3) - 1), wu: clamp15(A.stats.wu + Math.floor(r() * 3) - 1), trait: A.traits[0] }; }
