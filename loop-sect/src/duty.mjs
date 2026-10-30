// M18 值日：誰負責伙房、採集、柴火；值日的迫切程度。只讀 state，除了 assignDuty 寫 state.duty。
import { DUTY, MEAL_TARGET, STOCK_TARGET, TICKS_PER_DAY } from './data.mjs';
import { remaining } from './build.mjs';

export const ROLE = Object.fromEntries(DUTY.ROLES.map((r) => [r.id, r]));
export const ROLE_OF_KIND = Object.fromEntries(DUTY.ROLES.flatMap((r) => r.kinds.map((k) => [k, r.id])));

// 排得到值日的人：在山上的同門。
const onDutyRoster = (state) => state.people.filter((p) => !p.guest && !p.exp);

// 合適程度：本職技能＋條理。
const fit = (p, role) => p.skills[ROLE[role].skill] / 100 + 0.3 * Math.max(0, -p.axes.P);

export function assignDuty(state) {
  const duty = {};
  const roster = onDutyRoster(state);
  const free = [];
  for (const p of roster) {
    if (p.dutyPin === 'none') continue;
    if (p.dutyPin) duty[p.id] = p.dutyPin;
    else free.push(p);
  }
  const slots = DUTY.ORDER.slice(0, roster.length);
  for (const r of Object.values(duty)) { const i = slots.indexOf(r); if (i >= 0) slots.splice(i, 1); }
  // 玩家給的專長正好是某一職（專長 id 跟職 id 同名）就先排那一職，再依序挑。
  for (let i = 0; i < slots.length; i++) {
    const k = free.findIndex((p) => p.focus === slots[i]);
    if (k < 0) continue;
    duty[free[k].id] = slots[i];
    free.splice(k, 1); slots.splice(i--, 1);
  }
  // 每次挑全部（職, 人）裡最合適的一對；同分先照職的順序、再照編號。
  while (slots.length && free.length) {
    let bi = 0, bk = 0;
    for (let i = 0; i < slots.length; i++) for (let k = 0; k < free.length; k++) if (fit(free[k], slots[i]) > fit(free[bk], slots[bi])) { bi = i; bk = k; }
    duty[free[bk].id] = slots[bi];
    free.splice(bk, 1); slots.splice(bi, 1);
  }
  state.duty = duty;
  state.dutyKey = dutyKey(state);
}

const dutyKey = (state) => onDutyRoster(state).map((p) => `${p.id}:${p.dutyPin ?? ''}`).join();

// 每 tick 呼叫：每日 5 時或名單變了才重排。
export function stepDuty(state) {
  if (!DUTY.ON) { state.duty = {}; return; }
  if (state.tick % TICKS_PER_DAY === DUTY.HOUR * 60 || state.dutyKey !== dutyKey(state)) assignDuty(state);
}

export const dutyOf = (state, p) => (DUTY.ON ? state.duty?.[p.id] ?? null : null);
export const reliability = (p) => 1 - DUTY.SLACK * Math.max(0, p.axes.P);

export function woodWant(state) {
  const sitesWant = state.sites.reduce((a, s) => a + Math.max(0, remaining(s, 'wood')), 0);
  const inHand = state.people.reduce((a, x) => a + x.load.wood, 0);
  return Math.max(0, STOCK_TARGET.wood + sitesWant - state.stock.wood - inHand);
}

export const scarcityOf = (stock) => Math.max(0, 1 - (stock.raw + stock.meal * 1.5) / 18);

// 值日的迫切（0–1）。
export function pressure(state, role) {
  const s = state.stock;
  if (role === 'cook') return Math.min(1, 1 - s.meal / MEAL_TARGET + (s.meal === 0 ? 0.5 : 0));
  if (role === 'gather') return scarcityOf(s);
  if (role === 'wood') return Math.min(1, woodWant(state) / 8);
  return 0;
}

export function setDuty(state, personId, role) {
  const p = state.people.find((x) => x.id === personId);
  if (!p) return;
  p.dutyPin = role;   // null = 自動
  assignDuty(state);
}

export function dutyText(state) {
  const by = DUTY.ROLES.map((r) => {
    const names = state.people.filter((p) => dutyOf(state, p) === r.id).map((p) => p.name);
    return `${r.label} ${names.join('、') || '（沒人）'}`;
  });
  return by.join('、');
}
