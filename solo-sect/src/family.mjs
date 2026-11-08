// R7 #524：成親的人自己決定要不要孩子；孩子由父母所生，跟大人同一個年曆長大。
// 參考 RimWorld Biotech（懷孕、父母遺傳、兒童階段）與 The Sims 的「想要孩子」。只借機制，不抄數值。
import { BODY_MECHANICS } from './contact.mjs';
import { makeBare } from './starter-combat.mjs';
import { DAY, NODES, TRAITS } from './data.mjs';
import { bedCount } from './recruitment.mjs';
import { affKey, relKey, log } from './util.mjs';
import { canHaveChildren } from './rare-arts.mjs';
import { DAYS_PER_YEAR } from './time-scale.mjs';

export const FAMILY = Object.freeze({
  yearDays: DAYS_PER_YEAR, // 第 26 輪 #488：與季節、體能成長共用 28 日年；大人孩子同鐘。
  adultAge: 14, // 沿用既有成年年紀。
  gestationYears: 0.75, // 量測：足月妊娠約 40 週，約 9 個月。
  conceiveYear: 0.85, // 量測：想要孩子的伴侶約 85% 在一年內懷上（Gnoth 等 2003）。
  knownYears: 1 / 13, // 量測：約第 4 週停經才知道有孕（4／52 年）。
  motherMaxAge: 40, // 量測：40 歲後自然受孕率大幅下降（ACOG 第 589 號意見）。
  massGain: 0.22, // 量測：正常體重孕婦建議增重 11.5–16 公斤（IOM 2009），約為 57 公斤體重的兩成。
  girlShare: 100 / 205, // 量測：出生性別比約 105 男比 100 女（WHO）。
  babyAge: 3, // 參考：RimWorld Biotech 的嬰兒期到 3 歲；之前只吃和睡。
  cautious: Object.freeze(['free', 'wu']), // 主要價值是逍遙或武道的人，不想被家室牽住。
  coldTraits: Object.freeze(['free']), // 沒有價值觀的人，以性格「灑脫」代表同一種不想安定。
});
const KID_NAMES = ['小石', '阿蓮', '小虎', '青兒', '小滿', '念慈', '承志', '若蘭', '小魚', '阿福'];
export const gestationDays = () => FAMILY.gestationYears * FAMILY.yearDays;
// 推導：一年內懷上的機率 conceiveYear，換成每日機率。
export const conceiveDaily = () => 1 - (1 - FAMILY.conceiveYear) ** (1 / FAMILY.yearDays);

const present = (d) => d && !d.removed && !d.away && d.adult !== false;
export const pregnancyOf = (s, d) => (d?.pregnant ? Math.min(1, (s.t - d.pregnant.since) / (gestationDays() * DAY)) : 0);
// 增重多半在後兩期；以懷孕進度線性近似。
export const bodyMassMul = (s, d) => 1 + FAMILY.massGain * pregnancyOf(s, d);
// 知道有孕後不上陣：ACOG 第 804 號意見建議孕期避免有碰撞風險的運動。
export const expecting = (s, d) => !!d?.pregnant && pregnancyOf(s, d) >= FAMILY.knownYears / FAMILY.gestationYears;
export const isBaby = (d) => !!d?.child && !d.adult && (d.age ?? 0) < FAMILY.babyAge;

// 處境：與 N58 收徒同格式的糧、床、安全三項。
export function householdSituation(s) {
  // 糧：山上自給自足，存糧本來就隨吃隨煮；看的是有沒有在挨餓（斷糧或有人餓得發昏），不是囤了多少。
  const mouths = s.ds.filter((d) => !d.removed).length + 1, beds = bedCount(s);
  const hungry = !!s.emergency || s.ds.some((d) => !d.removed && d.famished);
  const safe = !s.band && !s.threat?.pending;
  return { food: !hungry, bed: beds >= mouths, safety: safe, beds, mouths };
}

// 每個人自己決定：性格／價值觀、年紀、處境。回傳 { want, why }。
export function childWish(s, d, spouse) {
  const why = [];
  if (!present(d) || !present(spouse)) return { want: false, why: ['兩人不在一起'] };
  const mother = d.fem ? d : spouse.fem ? spouse : null;
  if (mother && (mother.age ?? 0) > FAMILY.motherMaxAge) why.push('年紀大了');
  if (d.values) { const main = Object.entries(d.values).sort((x, y) => y[1] - x[1])[0]?.[0]; if (FAMILY.cautious.includes(main)) why.push(main === 'wu' ? '一心在武道' : '想過逍遙日子'); }
  else if ((d.personality || []).some((t) => FAMILY.coldTraits.includes(t))) why.push('性子灑脫，不想安定');
  if (!canHaveChildren(d) || !canHaveChildren(spouse)) why.push('已自宮，不能有後代'); // R11 #531
  const sit = householdSituation(s);
  if (!sit.food) why.push('家裡正在挨餓');
  if (!sit.bed) why.push(`床位不夠（${sit.beds}/${sit.mouths}）`);
  if (!sit.safety) why.push('山上不太平');
  return { want: !why.length, why: why.length ? why : ['想要個孩子'] };
}

export function bearChild(s, mother, father, rnd) {
  const G = s.gen, ps = [mother, father].filter(Boolean), id = `kid${++G.kidN}`, name = KID_NAMES[(G.kidN - 1) % KID_NAMES.length];
  // 遺傳：根骨、悟性落在父母之間。
  const between = (f) => { const v = ps.map((p) => f(p) ?? 3), lo = Math.min(...v), hi = Math.max(...v); return lo + Math.floor(rnd() * (hi - lo + 1)); };
  // 性格一半來自養育（父母之一），一半是天性。
  const nurture = ps.flatMap((p) => p.personality || []), keys = Object.keys(TRAITS);
  const pers = [...new Set([nurture[Math.floor(rnd() * nurture.length)], keys[Math.floor(rnd() * keys.length)]].filter(Boolean))];
  let values = null; if (ps.some((p) => p.values)) { values = {}; for (const k of ['xia', 'sect', 'qing', 'free', 'wu', 'fame']) values[k] = Math.round(ps.reduce((a, p) => a + (p.values?.[k] || 0), 0) / ps.length / 2); }
  const d = { ...JSON.parse(JSON.stringify(mother)), id, name, adult: false, birthDay: s.day, child: { since: s.t, born: s.day, parents: ps.map((p) => p.id) }, age: 0, fem: rnd() < FAMILY.girlShare, sprite: 'cousin', role: 'inner', personality: pers, known: pers.slice(0, 1), values, wexin: 0, classic: false, xia: null, portrait: null, spouse: null, sweet: null, wed: undefined, pregnant: undefined, acts: undefined, deeds: undefined, deedN: undefined,
    root: between((p) => p.root), wu: between((p) => p.wu ?? p.root), rootKnown: true, arts: {}, moves: ['fist'], pendingArt: null, focus: null, skills: { leg: 0, palm: 0, strength: 1, farming: 0, herbal: 0, agility: 1, cooking: 0 },
    needs: { energy: 80, hunger: 70, social: 50, fun: 70 }, hp: 100, mood: 60, thoughts: [], why: [], task: null, path: [], order: null, carry: null, away: false, at: mother.at || 'hall', pos: [...(mother.pos || NODES.hall)], reason: '剛出生', together: 0, master: null, oneArm: false, hidden: null, takeMul: null, reflect: null, awakened: false, duanqing: null, moodCap: null };
  makeBare(d); d.practice = { hands: {}, eyes: {}, origin: {} };
  for (const k of ['glimmer', 'selection', 'trainingWish', 'trainingWishes', 'timeToday', 'timePrev', 'guidanceTotal', 'guidanceMentor', 'originRelation', 'originRelationKind', 'originInvented', 'lastDodge', 'techniqueContact', 'flightSeen', 'lastCombatMove', 'sure', 'intentTarget', 'foe', 'tactics', 'lureUntil', 'lurePos', 'lastHelpAt', 'scarred', 'survived', 'bodyBase', 'fitness', 'bodyFatigue', 'nutrition', 'soreness', 'muscleFatigue', 'herbalDietUntil', 'childWish', 'awakeningStage', 'awakeningPath', 'originSect', 'mealName', 'affinity', 'traits']) delete d[k];
  d.traits = {};
  Object.assign(d, { wounds: [], part: null, pain: 0, painAt: s.t, fret: 0, raging: false, rageUntil: 0, visionUntil: 0, posture: BODY_MECHANICS.balance, downUntil: 0, faintUntil: 0, balanceOpenUntil: 0, busyUntil: 0, swing: null, bswing: null });
  s.ds.push(d); G.kids.push(id);
  for (const o of s.ds) if (o !== d) { const v = ps.includes(o) ? 60 : 15; s.aff[affKey(o.id, d.id)] = v; s.aff[affKey(d.id, o.id)] = v; s.rel[relKey(o.id, d.id)] = v; }
  log(s, `【出生】${ps.map((p) => p.name).join('與')}的孩子${name}出生了（悟性${d.wu}・根骨${d.root}；${pers.map((t) => TRAITS[t]?.name).join('、')}）。`);
  return d;
}

// 成年時身體起點改為父母體格的平均（遺傳），再從這裡依負荷長。
function grownBody(s, d) {
  const ps = (d.child?.parents || []).map((id) => s.ds.find((x) => x.id === id)).filter(Boolean);
  for (const k of ['strength', 'agility']) { const v = ps.map((p) => p.bodyBase?.[k] ?? p.skills?.[k]).filter((x) => x != null); if (v.length) d.skills[k] = Math.max(d.skills[k] || 0, v.reduce((a, b) => a + b, 0) / v.length); }
  for (const k of ['bodyBase', 'fitness', 'bodyFatigue']) delete d[k];
}

// 每日：所有人按同一個年曆長一歲；夫妻各自決定；懷孕到期生產。
export function familyStep(s, rnd) {
  const G = s.gen;
  for (const d of s.ds) {
    if (s.day > (d.birthDay ?? 0) && (s.day - (d.birthDay ?? 0)) % FAMILY.yearDays === 0) d.age++;
    if (d.child && !d.adult && d.age >= FAMILY.adultAge) { d.adult = true; d.sprite = (d.personality || []).includes('gentle') ? 'senior' : 'hero'; d.child.grown = s.day; if (d.child.born != null) grownBody(s, d); log(s, `【成年】${d.name}長大成人（${d.age} 歲），可以練高深武學、出巡、成親了。`); }
  }
  for (const d of s.ds) {
    if (!d.pregnant || pregnancyOf(s, d) < 1) continue;
    const father = s.ds.find((x) => x.id === d.pregnant.father); d.pregnant = undefined; bearChild(s, d, father, rnd);
  }
  for (const c of G.couples) {
    const [a, b] = c.map((id) => s.ds.find((d) => d.id === id)); if (!a || !b) continue;
    const wa = childWish(s, a, b), wb = childWish(s, b, a); a.childWish = wa; b.childWish = wb;
    const mother = a.fem && !b.fem ? a : b.fem && !a.fem ? b : null;
    if (!mother || mother.pregnant || !wa.want || !wb.want) continue;
    if (rnd() < conceiveDaily()) { mother.pregnant = { since: s.t, father: (mother === a ? b : a).id }; log(s, `【有喜】${a.name}與${b.name}都想要孩子；${mother.name}有了身孕。`); }
  }
}
