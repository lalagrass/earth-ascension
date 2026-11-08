// N58: visitors respond to the sect's reputation and what it has made or defended.
// A policy limits the number of residents; it never admits anyone without the player's choice.
import { ACTIVITIES, DAY, FACILITIES, RECRUIT } from './data.mjs';

export const RECRUIT_POLICIES = { closed: '閉門不收', casual: '隨緣', wide: '廣收' };
export const discipleCount = (s) => s.ds?.filter((d) => d.role !== 'laborer').length || 0;
export const recruitmentInit = (basePeople = 0) => ({ policy: 'casual', basePeople, cap: null, departures: 0, away: [], returned: {}, workBooked: { day: 0, slots: [] } });
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

// A work-for-board promise uses a real place available this day. Plot keys are
// the same reservations used by farming; each resource site provides one new
// applicant's work shift without changing ordinary workers' task capacities.
export function availableAdmissionWork(s) {
  const booked = recruitmentOf(s).workBooked;
  const held = new Set(booked?.day === s.day ? booked.slots : []);
  for (let i = 0; i < (s.plots?.length || 0); i++) {
    const plot = s.plots[i], key = `plot:${i}`;
    if (['empty', 'ripe'].includes(plot.st) && !s.resv?.[key] && !held.has(key)) return key;
  }
  for (const [fac, act, mat] of [['forest', 'chop', 'wood'], ['quarry', 'quarry', 'stone']]) {
    const offers = FACILITIES.find((f) => f.id === fac)?.stages[s.fac?.[fac]?.stage || 0]?.offers || [];
    const key = `${fac}:${act}:*`;
    if (offers.includes(act) && (s.res?.[mat] || 0) < (s.cap?.[mat] || 0) && !s.resv?.[key] && !held.has(key)
      && !s.ds.some((d) => !d.away && d.task?.act === act && d.task.fac === fac)) return key;
  }
  return null;
}
export function bookAdmissionWork(s, slot) {
  const r = recruitmentOf(s);
  if (r.workBooked?.day !== s.day) r.workBooked = { day: s.day, slots: [] };
  r.workBooked.slots.push(slot);
}

// The candidate brings their own dues or contributes work. Food in the sect is
// checked only for the next meal, not as a one-day reserve for the whole sect.
export function supportOffer(s, candidate) {
  const brought = candidate.support || candidate.situation?.support || {};
  const meal = ACTIVITIES.eat.use.food;
  const returnedFood = recruitmentOf(s).returned[candidate.id] ? RECRUIT.food : 0;
  if ((brought.food || 0) + returnedFood >= RECRUIT.food) return { kind: 'food', amount: RECRUIT.food };
  if (s.res.food >= meal && (brought.coin || 0) >= RECRUIT.food) return { kind: 'coin', amount: RECRUIT.food };
  const slot = candidate.canWork !== false && candidate.adult !== false ? availableAdmissionWork(s) : null;
  if (s.res.food >= meal && slot) return { kind: 'work', amount: 0, slot };
  return null;
}
