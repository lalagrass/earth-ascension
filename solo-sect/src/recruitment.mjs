// N58: visitors respond to the sect's reputation and what it has made or defended.
// A policy limits the number of residents; it never admits anyone without the player's choice.
import { ACTIVITIES, DAY, FACILITIES, RECRUIT, REP } from './data.mjs';

export const RECRUIT_POLICIES = { closed: '閉門不收', casual: '隨緣', wide: '廣收' };
export const discipleCount = (s) => s.ds?.filter((d) => d.role !== 'laborer').length || 0;
export const recruitmentInit = (basePeople = 0) => ({ policy: 'casual', basePeople, cap: null, produced: 0, departures: 0, away: [], returned: {} });
export const recruitmentOf = (s) => (s.recruitment ??= recruitmentInit(discipleCount(s)));
export const bedCount = (s) => FACILITIES.reduce((n, f) => n + (f.stages[s.fac?.[f.id]?.stage || 0]?.beds || 0), 0);

export function policyCap(s) {
  const r = recruitmentOf(s), base = r.basePeople, beds = bedCount(s);
  const available = Math.max(0, beds - base);
  const policy = r.policy === 'closed' ? base : r.policy === 'wide' ? beds : base + Math.ceil(available / 2);
  return Math.min(beds, r.cap == null ? policy : Math.max(base, Math.min(policy, r.cap)));
}
export function setRecruitPolicy(s, policy, cap = recruitmentOf(s).cap) {
  if (!Object.hasOwn(RECRUIT_POLICIES, policy)) return { ok: false, why: '未知收徒方針' };
  const r = recruitmentOf(s); r.policy = policy;
  r.cap = cap == null || cap === '' ? null : Math.max(r.basePeople, Math.floor(Number(cap) || 0));
  return { ok: true, cap: policyCap(s) };
}

// Each work-produced item contributes one item, not a traded coin. The existing
// RECRUIT.food converts three such items into one reputation-equivalent unit.
export function attraction(s) {
  const r = recruitmentOf(s);
  return (s.rep || 0) + r.produced / RECRUIT.food + (s.threat?.won || 0) * REP.kill - (s.threat?.deaths || 0) * RECRUIT.stepRep;
}

export function applicantAway(s, id) { return recruitmentOf(s).away.some((x) => x.id === id && x.until > s.t); }
export function sendApplicantToWork(s, id) {
  const r = recruitmentOf(s);
  if (applicantAway(s, id)) return false;
  r.away = r.away.filter((x) => x.id !== id);
  r.away.push({ id, until: s.t + DAY }); r.departures++;
  return true;
}
export function returnFromWork(s) {
  const r = recruitmentOf(s), due = r.away.filter((x) => x.until <= s.t);
  r.away = r.away.filter((x) => x.until > s.t);
  for (const x of due) r.returned[x.id] = true;
  return due;
}

// The candidate brings their own dues or contributes work. Food in the sect is
// checked only for the next meal, not as a one-day reserve for the whole sect.
export function supportOffer(s, candidate) {
  const brought = candidate.support || candidate.situation?.support || {};
  const meal = ACTIVITIES.eat.use.food;
  const returnedFood = recruitmentOf(s).returned[candidate.id] ? RECRUIT.food : 0;
  if ((brought.food || 0) + returnedFood >= RECRUIT.food) return { kind: 'food', amount: RECRUIT.food };
  if (s.res.food >= meal && (brought.coin || 0) >= RECRUIT.food) return { kind: 'coin', amount: RECRUIT.food };
  const work = candidate.canWork !== false && candidate.adult !== false &&
    ((s.res.wood || 0) < (s.cap?.wood ?? 0) || (s.res.stone || 0) < (s.cap?.stone ?? 0) || (s.plots?.length || 0) > 0);
  if (s.res.food >= meal && work) return { kind: 'work', amount: 0 };
  return null;
}
