// 效用 AI：列出所有可做的事、打分、留下理由。只讀 state，不改。
import { ACTS, FORCE, MEAL_TARGET, COOK_RAW, FOCUS, FOCUS_BONUS, STOCK_TARGET, PILE, WORK_KINDS } from './data.mjs';
import { nearestResources, remaining, stocked, workSpot, siteWorkersFree } from './build.mjs';
import { extraTake } from './skills.mjs';
import { nextRand } from './rng.mjs';
import { urgency, isNight } from './needs.mjs';

const SLEEPS = new Set(['sleep', 'sleepGround']);
const FOCUS_KINDS = Object.fromEntries(FOCUS.filter((f) => f.id).map((f) => [f.id, new Set(f.kinds)]));
const EATS = new Set(['eat', 'eatRaw', 'eatCarried', 'forage']);
export const REFUSE_COOLDOWN = 240;

export function freeSlot(obj) {
  for (let i = 0; i < obj.slots.length; i++) if (!obj.users[i]) return i;
  return -1;
}

function spotOf(obj, i) {
  return { x: obj.slots[i][0], y: obj.slots[i][1] };
}

// 聊天對象是否能被打斷：在閒逛或發呆的人才行。
export function interruptible(o) {
  if (o.act === 'idle') return true;
  return o.act === 'walk' && o.task && o.task.kind === 'wander';
}

function score(state, p, c, { need = 0, persona = 0, work = 0 }) {
  const night = isNight(state.tick);
  let sched = 1;
  if (SLEEPS.has(c.kind)) sched = night ? 1.6 + 0.4 * Math.max(0, -p.axes.P) : p.needs.energy > 30 ? 0.5 : 1;
  else if (night) sched = WORK_KINDS.has(c.kind) && c.kind !== 'deliver' && c.kind !== 'store' ? 0.15 : 0.6;
  const d = c.spot ? Math.hypot(c.spot.x - p.x, c.spot.y - p.y) : 0;
  const dist = 1 / (1 + d / 40);
  const noise = nextRand(state) * 0.15;
  const focus = p.focus && FOCUS_KINDS[p.focus].has(c.kind) && work > 0 ? FOCUS_BONUS : 0;
  c.f = { need, persona, work, focus, sched, dist, noise };
  c.score = (need + persona + work + focus) * sched * dist + noise;
  c.label ??= ACTS[c.kind].label;
  return c;
}

export function candidates(state, p, scorePois) {
  const u = Object.fromEntries(Object.entries(p.needs).map(([k, v]) => [k, urgency(v)]));
  const { E, N, F, P } = p.axes;
  const J = Math.max(0, -P);
  // 勤勉：條理型愛做事，隨性型較懶散。所有活計共用。
  const diligence = 0.3 * J - 0.15 * Math.max(0, P);
  const empty = p.carry === 0 && p.load.wood === 0 && p.load.stone === 0;
  const out = [];
  const add = (c, parts) => out.push(score(state, p, c, parts));
  const stock = state.stock;

  for (const o of state.objects) {
    const i = freeSlot(o);
    if (i < 0) continue;
    const spot = spotOf(o, i);
    if (o.kind === 'bed') add({ kind: 'sleep', obj: o.id, slot: i, spot, label: `去${o.label}睡` }, { need: u.energy });
    if (o.kind === 'table' && stock.meal > 0) {
      const company = o.users.filter(Boolean).length;
      add({ kind: 'eat', obj: o.id, slot: i, spot }, { need: u.food * 2, persona: company ? u.social * 0.3 * (1 + 0.5 * E) : 0 });
    }
    if (o.kind === 'hearth') {
      if (stock.raw >= COOK_RAW && stock.meal < MEAL_TARGET) {
        // 鍋裡沒飯而有人餓著時，煮飯就是急事。
        const demand = 1 - stock.meal / MEAL_TARGET;
        const hungry = state.people.filter((x) => x.needs.food < 40).length;
        const urgent = stock.meal === 0 ? 1 + 0.4 * hungry : 0;
        add({ kind: 'cook', obj: o.id, slot: i, spot }, { work: demand * 1.4 + urgent, persona: 0.3 * Math.max(0, F) * demand + diligence });
      }
    }
    if (o.kind === 'bench') {
      add({ kind: 'sit', obj: o.id, slot: i, spot, label: `去${o.label}坐坐` },
        { need: u.fun * 0.8 * (1 - 0.4 * E) + u.energy * 0.1, persona: 0.2 * Math.max(0, -E) });
    }
  }
  // 送貨只是放下，不必占灶位，所以煮飯的人在用灶時也能送。
  if (p.carry > 0) {
    const h = state.objects.find((o) => o.kind === 'hearth');
    add({ kind: 'deliver', obj: h.id, slot: -1, spot: spotOf(h, 0), label: '把莓果送到灶邊' }, { work: 2.5 });
  }
  if (p.carry > 0) add({ kind: 'eatCarried' }, { need: u.food * 0.5 });

  const scarcity = Math.max(0, 1 - (stock.raw + stock.meal * 1.5) / 18);
  for (const b of state.bushes) {
    if (b.user || b.berries <= 0) continue;
    const spot = { x: b.sx, y: b.sy };
    if (p.needs.food < 60) add({ kind: 'eatRaw', bush: b.id, spot }, { need: u.food * 0.45 });
    if (empty) add({ kind: 'forage', bush: b.id, spot }, { need: u.food * 0.2, work: scarcity * 2, persona: 0.4 * J * scarcity + diligence * scarcity });
  }

  // ---------- M3 採集與營造 ----------
  const pile = { x: PILE.x, y: PILE.y };
  if (p.load.wood > 0 || p.load.stone > 0) add({ kind: 'store', spot: pile, label: '把木石扛回倉堆' }, { work: 2.5 });
  if (empty) {
    const strong = p.attrs.li >= 8 ? 1 : 0;
    for (const mat of ['wood', 'stone']) {
      const sitesWant = state.sites.reduce((a, s) => a + Math.max(0, remaining(s, mat)), 0);
      const inHand = state.people.reduce((a, x) => a + x.load[mat], 0);
      const want = Math.max(0, STOCK_TARGET[mat] + sitesWant - state.stock[mat] - inHand);
      if (want <= 0) continue;
      const demand = Math.min(1.5, want / 8);
      const kind = mat === 'wood' ? 'chop' : 'quarry';
      for (const r of nearestResources(state, mat, p, 3)) {
        add({ kind, res: `${r.x},${r.y}`, mat, rx: r.x, ry: r.y, spot: r.spot, take: 4 + strong + extraTake(p, kind) },
          { work: 0.6 + demand * 1.2, persona: diligence + 0.15 * ((p.attrs.li - 5) / 5) });
      }
    }
    for (const site of state.sites) {
      for (const mat of ['wood', 'stone']) {
        const n = Math.min(remaining(site, mat), state.stock[mat], 4 + strong);
        if (n <= 0) continue;
        add({ kind: 'haul', site: site.id, mat, n, spot: pile, label: `搬${mat === 'wood' ? '木' : '石'}到${site.label}` }, { work: 2.0, persona: diligence });
      }
      if (stocked(site) && siteWorkersFree(site)) {
        const spot = workSpot(state, site);
        if (spot) add({ kind: 'build', site: site.id, spot, label: `蓋${site.label}` }, { work: 2.2, persona: diligence });
      }
    }
  }

  if (p.needs.social < 90) {
    for (const o of state.people) {
      if (o === p || o.act === 'do' || Math.hypot(o.x - p.x, o.y - p.y) > 18) continue;
      if ((p.refused[o.id] ?? -Infinity) > state.tick - REFUSE_COOLDOWN) continue;
      add({ kind: 'chat', partner: o.id, spot: { x: Math.round(o.x), y: Math.round(o.y) }, label: `找${o.name}聊天` },
        { need: u.social * (1 + 0.5 * E), persona: 0.3 * E + 0.1 * F });
    }
  }

  const poi = scorePois(state, p)[0];
  if (poi) {
    const target = state.pois.find((x) => x.id === poi.target);
    add({ kind: 'wander', poi: poi.target, spot: { x: target.x, y: target.y }, label: `閒逛：${poi.label}` },
      { need: u.fun * 0.6 * (1 + 0.5 * N), persona: 0.1 * Math.max(0, Math.min(2, poi.score)) });
  }

  // 床都滿了或撐不住時，可以席地而睡。
  if (!out.some((c) => c.kind === 'sleep') || p.needs.energy < FORCE.energy) add({ kind: 'sleepGround' }, { need: u.energy * 0.7 });
  add({ kind: 'idle' }, { persona: 0.05 });

  let forced = null;
  let list = out;
  // 兩者都低時先顧比較缺的那個，避免「睡→餓醒→又睏」的死循環。
  const tired = p.needs.energy < FORCE.energy;
  const hungry = p.needs.food < FORCE.food;
  if (tired && (!hungry || p.needs.energy <= p.needs.food)) {
    forced = '太累了，先睡';
    list = out.filter((c) => SLEEPS.has(c.kind));
  } else if (hungry) {
    forced = '太餓了，先找吃的';
    const eats = out.filter((c) => EATS.has(c.kind) || c.kind === 'deliver');
    if (eats.length) list = eats;
  }
  list.sort((a, b) => b.score - a.score);
  return { list, forced };
}

// 被找聊天的人是否願意：交流越缺越願意，外向的人幾乎都願意。
export function willingToChat(o) {
  return urgency(o.needs.social) * (1 + 0.5 * o.axes.E) + 0.4 + 0.3 * o.axes.E >= 0.5;
}
