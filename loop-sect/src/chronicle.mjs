// M10 觀察：每人的時間帳、生平（自己的紀事＋跟同門比的習性）、紀事分類、門派統計。只讀 state。
import { TICKS_PER_DAY } from './data.mjs';

export const LIFE_CATS = [
  { id: 'work', label: '幹活', kinds: ['chop', 'quarry', 'build', 'haul', 'store', 'deliver', 'cook', 'forage', 'repair', 'sow', 'harvest', 'hunt'] },
  { id: 'social', label: '聊天切磋', kinds: ['chat', 'spar', 'serve'] },
  { id: 'drill', label: '練功', kinds: ['drill', 'trial'] },
  { id: 'leisure', label: '閒坐閒逛', kinds: ['sit', 'wander', 'idle', 'leave'] },
  { id: 'sleep', label: '睡覺', kinds: ['sleep', 'sleepGround'] },
  { id: 'eat', label: '吃飯', kinds: ['eat', 'eatRaw', 'eatCarried', 'ration', 'medicate'] },
  { id: 'guard', label: '迎敵躲避', kinds: ['fight', 'hide', 'watch'] },
  { id: 'away', label: '遠征', kinds: ['expedition', 'raze'] },
];
const CAT_OF = Object.fromEntries(LIFE_CATS.flatMap((c) => c.kinds.map((k) => [k, c.id])));
export const catOf = (p) => CAT_OF[p.task?.kind ?? 'idle'] ?? 'other';

// sim 每 tick 為每人記一筆；走去做某事也算那件事（「走去吃」算吃飯）。
export function tally(p) {
  const c = catOf(p);
  p.life ??= {};
  p.life[c] = (p.life[c] || 0) + 1;
}

export function lifeShares(p) {
  const tot = Object.values(p.life ?? {}).reduce((a, b) => a + b, 0);
  return Object.fromEntries(LIFE_CATS.map((c) => [c.id, tot ? (p.life[c.id] || 0) / tot : 0]));
}

// 跟同門平均比，差最多的兩類寫成一句。在山上不到半天的人資料太少，不比。
export const LIFE_MIN = TICKS_PER_DAY / 2;
export function habits(state, p) {
  const tot = Object.values(p.life ?? {}).reduce((a, b) => a + b, 0);
  const others = state.people.filter((o) => o !== p && !o.guest && Object.values(o.life ?? {}).reduce((a, b) => a + b, 0) >= LIFE_MIN);
  if (tot < LIFE_MIN || !others.length) return [];
  const mine = lifeShares(p);
  const avg = Object.fromEntries(LIFE_CATS.map((c) => [c.id, others.reduce((a, o) => a + lifeShares(o)[c.id], 0) / others.length]));
  return LIFE_CATS.filter((c) => c.id !== 'sleep' && c.id !== 'eat')
    .map((c) => ({ id: c.id, label: c.label, mine: mine[c.id], avg: avg[c.id], diff: mine[c.id] - avg[c.id] }))
    .filter((h) => Math.abs(h.diff) >= 0.03)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 2);
}

export function habitText(state, p) {
  const hs = habits(state, p);
  if (!hs.length) return '跟同門過得差不多';
  return hs.map((h) => `${h.diff > 0 ? '比同門多' : '比同門少'}花時間${h.label}（${Math.round(100 * h.mine)}% 對 ${Math.round(100 * h.avg)}%）`).join('；');
}

export const personEvents = (state, p) => state.events.filter((e) => e.who?.includes(p.id));

export const EVENT_GROUPS = [
  { id: 'all', label: '全部', kinds: null },
  { id: 'war', label: '戰事', kinds: ['raid', 'stolen', 'breach', 'repel', 'calm', 'guard', 'exp', 'cleared', 'repair', 'hurt'] },
  { id: 'people', label: '人事', kinds: ['visit', 'join', 'leave', 'found', 'master', 'rel', 'family'] },
  { id: 'growth', label: '成長', kinds: ['skill', 'move', 'trial'] },
  { id: 'build', label: '營造', kinds: ['built', 'farm'] },
];
export function eventsIn(state, groupId) {
  const g = EVENT_GROUPS.find((x) => x.id === groupId) ?? EVENT_GROUPS[0];
  return g.kinds ? state.events.filter((e) => g.kinds.includes(e.kind)) : state.events;
}

export function sectStats(state) {
  const L = state.ledger, C = state.counts;
  const n = (k) => state.events.filter((e) => e.kind === k).length;
  return [
    ['在山上', `${Math.floor(state.tick / TICKS_PER_DAY) + 1} 日`],
    ['同門', `${state.people.filter((p) => !p.guest).length} 人`],
    ['煮好／吃掉的飯', `${L.mealsMade}／${L.mealsEaten}`],
    ['被偷', `生莓 ${L.rawStolen ?? 0}、飯 ${L.mealsStolen ?? 0}、木 ${L.woodStolen ?? 0}、石 ${L.stoneStolen ?? 0}`],
    ['完工', `${state.built.length} 處`],
    ['來犯／打退', `${C.enemies ?? 0}／${C.repelled ?? 0}`],
    ['領悟新招', `${n('move')} 次`],
    ['來訪／留下', `${n('visit')}／${n('join')}`],
    ['拆掉的巢', `${state.nests.filter((x) => x.cleared).length} 處`],
  ];
}
