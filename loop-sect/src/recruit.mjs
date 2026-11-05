// 招人與成派：來訪排程、去留、拜師、立派。只放規則；人物的出生與離開由 sim 做。
import { RECRUIT, SECT, TICKS_PER_DAY, ATTRS, ATTR_TOTAL, ATTR_MAX, NAMES } from './data.mjs';
import { seedHolder, nextRand, randInt } from './rng.mjs';
import { prestige, aff, atLeast } from './social.mjs';

// 排程與訪客的個性、天賦都只看種子，不吃主 RNG。
export function visitSchedule(seed) {
  const h = seedHolder(seed * 53 + 11);
  const out = [];
  for (let d = RECRUIT.START_DAY; d < RECRUIT.DAYS; d++) {
    const minute = Math.floor((RECRUIT.HOUR_FROM + nextRand(h) * (RECRUIT.HOUR_TO - RECRUIT.HOUR_FROM)) * 60);
    const axes = {};
    for (const k of ['E', 'N', 'F', 'P']) axes[k] = Math.round((nextRand(h) * 2 - 1) * 10) / 10;
    const attrs = Object.fromEntries(ATTRS.map((a) => [a.id, 1]));
    for (let left = ATTR_TOTAL - ATTRS.length; left > 0;) {
      const a = ATTRS[randInt(h, ATTRS.length)].id;
      if (attrs[a] < ATTR_MAX) { attrs[a]++; left--; }
    }
    out.push({ tick: d * TICKS_PER_DAY + minute, roll: nextRand(h), axes, attrs, nameAt: randInt(h, NAMES.length) });
  }
  return out;
}

export const members = (state) => state.people.filter((p) => !p.guest);
export const topPrestige = (state) => Math.max(0, ...members(state).map(prestige));
export const bedCount = (state) => state.objects.filter((o) => o.kind === 'bed').length;

export function visitChance(state) {
  return Math.max(0, Math.min(RECRUIT.MAX, RECRUIT.BASE + topPrestige(state) / RECRUIT.PRESTIGE_DIV));
}

export function freeName(state, at) {
  const used = new Set(state.people.map((p) => p.name));
  for (let i = 0; i < NAMES.length; i++) {
    const n = NAMES[(at + i) % NAMES.length];
    if (!used.has(n)) return n;
  }
  return `訪客${state.personSeq}`;
}

// 去留：回傳分數、各項與是否留下。沒有空床就一定不留。
export function appeal(state, g) {
  const ms = members(state);
  const top = topPrestige(state);
  let best = null, bestAff = 0;
  for (const m of ms) { const v = aff(state, g, m); if (v > bestAff) { bestAff = v; best = m; } }
  const food = state.stock.meal + state.stock.raw / 2 >= state.people.length;
  const parts = [
    { id: 'prestige', good: top >= RECRUIT.PRESTIGE_REF / 2, label: top >= RECRUIT.PRESTIGE_REF / 2 ? '這裡有高手' : '沒什麼高手', v: 0.5 * Math.min(1, top / RECRUIT.PRESTIGE_REF) },
    { id: 'aff', good: bestAff >= RECRUIT.AFF_REF / 2, label: bestAff >= RECRUIT.AFF_REF / 2 ? `跟${best.name}投緣` : '跟誰都不熟', v: 0.4 * Math.min(1, bestAff / RECRUIT.AFF_REF) },
    { id: 'food', good: food, label: food ? '糧夠' : '糧不夠', v: food ? 0.2 : -0.3 },
    { id: 'persona', good: g.axes.E > 0, label: g.axes.E > 0 ? '喜歡熱鬧' : '怕生', v: 0.1 * g.axes.E },
  ];
  if (state.sect?.rule === 'open') parts.push({ id: 'rule', good: true, label: '門規廣納', v: SECT.RULE_JOIN });
  const bed = bedCount(state) > ms.length;
  const score = parts.reduce((s, x) => s + x.v, 0);
  const join = bed && score >= RECRUIT.JOIN_MIN;
  return { score, parts, bed, join };
}

export function reasonText(a) {
  if (!a.bed) return '沒有空床';
  // 留下就列好的理由，不留就列顧慮；「沒什麼高手」雖然分數 > 0，仍算顧慮（loop 8 截圖看到它被當成留下的理由）。
  const sorted = [...a.parts].sort((x, y) => (a.join ? y.v - x.v : x.v - y.v));
  return sorted.filter((x) => x.good === a.join).slice(0, 3).map((x) => x.label).join('、') || (a.join ? '覺得這裡不錯' : '說不上來');
}

// 拜師：朋友以上、對方名望高我 MASTER_GAP 以上，我還沒師父、他也不是我徒弟。
export function shouldApprentice(state, p, o) {
  if (p.guest || o.guest || p.master || o.master === p.id) return false;
  if (!atLeast(state, p, o, 'friend')) return false;
  return prestige(o) - prestige(p) >= RECRUIT.MASTER_GAP;
}

// 立派：同門夠多、最強的人夠強。回傳要立的派（或 null）。
export function foundingPlan(state) {
  if (state.sect) return null;
  const ms = members(state);
  if (ms.length < SECT.FOUND_MIN) return null;
  const leader = [...ms].sort((a, b) => prestige(b) - prestige(a))[0];
  if (prestige(leader) < SECT.FOUND_PRESTIGE) return null;
  const { E, F, P } = leader.axes;
  const rule = P <= -0.4 ? 'drill' : F >= 0.4 ? 'help' : E >= 0.4 ? 'open' : 'free';
  const h = seedHolder(state.seed * 97 + 1);
  return { name: SECT.NAMES[randInt(h, SECT.NAMES.length)], rule, leader: leader.id, tick: state.tick };
}

export function titleOf(state, p) {
  if (p.guest) return '訪客';
  if (!state.sect) return null;
  if (p.id === state.sect.leader) return '掌門';
  const rest = members(state).filter((x) => x.id !== state.sect.leader).sort((a, b) => prestige(b) - prestige(a));
  return rest[0] === p ? '大弟子' : '弟子';
}
