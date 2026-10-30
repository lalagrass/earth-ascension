// loop1 M1：16 型人格（四軸）→ 既有性格特質的映射。純資料＋純函式，尚未接進創角或 sim（見 loop/ROADMAP.md M2）。
// 參考：MBTI 四軸只取「外向／內向、實感／直覺、思考／情感、判斷／感知」的公開概念，不用任何商標問卷原文；題目自寫。
// 對應的「武俠參考人物」只是說明文字，不代表該人物在遊戲裡的人格設定。
import { TRAITS } from './data.mjs';
import { NEW_TRAITS } from './hero-data.mjs';

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
