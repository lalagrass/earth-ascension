import { POIS, TEMPLATES, NAMES, TICKS_PER_DAY } from './data.mjs';
import { seedHolder, nextRand, randInt, hashString } from './rng.mjs';
import { buildMap, walkable, nearestWalkable } from './map.mjs';
import { findPath } from './path.mjs';
import { fromTemplate, makePerson, speedOf } from './person.mjs';

// 從院子灌水找出可到達的格，避免 POI 或出生點落在被樹圍住的口袋裡。
function reachableFrom(map, sx, sy) {
  const W = map[0].length, H = map.length;
  const seen = new Uint8Array(W * H);
  const q = [[sx, sy]];
  seen[sy * W + sx] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (seen[ny * W + nx] || !walkable(map, nx, ny)) continue;
      seen[ny * W + nx] = 1;
      q.push([nx, ny]);
    }
  }
  return seen;
}

function resolvePois(map, reach) {
  const W = map[0].length;
  const out = [];
  for (const p of POIS) {
    // 由近到遠找第一個可站且可到的格。
    let spot = null;
    for (let r = 0; r < 12 && !spot; r++) {
      for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = p.x + dx, y = p.y + dy;
        if (walkable(map, x, y) && reach[y * W + x]) spot = { x, y };
      }
    }
    if (spot) out.push({ ...p, x: spot.x, y: spot.y });
  }
  return out;
}

// 依種子挑兩位同住者：不重複主角的模板，名字另取。
export function companionsFor(seed, excludeTemplate = null) {
  const h = seedHolder(seed * 7 + 13);
  const pool = TEMPLATES.filter((t) => t.id !== excludeTemplate);
  const out = [];
  while (out.length < 2) {
    const t = pool.splice(randInt(h, pool.length), 1)[0];
    out.push({ template: t.id, name: NAMES[randInt(h, NAMES.length)] });
  }
  if (out[0].name === out[1].name) out[1].name = NAMES[(NAMES.indexOf(out[1].name) + 1) % NAMES.length];
  return out;
}

// people：[{ name, axes, attrs, template?, protagonist? } 或 { template, name }]
export function createWorld({ seed = 1, people }) {
  const state = { seed, tick: 0, ...seedHolder(seed) };
  state.map = buildMap(state);
  const yard = POIS.find((p) => p.id === 'yard');
  const reach = reachableFrom(state.map, yard.x, yard.y);
  state.pois = resolvePois(state.map, reach);
  state.people = people.map((spec, i) => {
    const id = `p${i}`;
    const p = spec.axes ? makePerson({ ...spec, id }) : fromTemplate(spec.template, { id, name: spec.name, protagonist: !!spec.protagonist });
    // 出生在院子周圍不重疊的格。
    const s = nearestWalkable(state.map, yard.x - 2 + i * 2, yard.y);
    p.x = s.x; p.y = s.y;
    p.routine = i;
    return p;
  });
  state.log = [];
  return state;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function othersNear(state, p, spot, r = 5) {
  return state.people.filter((o) => o !== p && dist(o, spot) <= r).length;
}

// M1 的走動 AI：每個去處打分，因子分開存，給玩家看理由。
export function scorePois(state, p) {
  const { E, N, P } = p.axes;
  const here = p.goal;
  const order = state.pois;
  const rot = order[(p.routine) % order.length];
  const out = [];
  for (const poi of order) {
    if (here && poi.id === here) continue;
    const t = poi.tags;
    const d = dist(p, poi);
    const crowd = othersNear(state, p, poi);
    const visits = p.visits[poi.id] || 0;
    const f = {
      base: 1,
      social: E * ((t.social || 0) * 1.2 + crowd * 0.4),
      quiet: -E * (t.quiet || 0),
      novelty: N * (d / 40 + 0.6 / (1 + visits)),
      familiar: -N * ((t.home || 0) + Math.min(visits, 5) / 5) * 0.8,
      routine: P < 0 && poi.id === rot.id ? -P * 1.5 : 0,
      noise: nextRand(state) * (0.3 + 0.5 * Math.max(P, 0)),
    };
    const score = Object.values(f).reduce((s, v) => s + v, 0);
    out.push({ act: 'go', target: poi.id, label: `去${poi.label}`, score, f });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

function choose(state, p) {
  const cands = scorePois(state, p);
  p.why = cands.slice(0, 3);
  for (const c of cands) {
    const poi = state.pois.find((x) => x.id === c.target);
    const path = findPath(state.map, Math.round(p.x), Math.round(p.y), poi.x, poi.y);
    if (!path) continue;
    p.path = path;
    p.goal = poi.id;
    p.act = 'walk';
    p.actLabel = c.label;
    return;
  }
  // 哪都去不了：原地發呆一陣。
  p.act = 'idle'; p.actLabel = '發呆'; p.wait = 30;
}

function arrive(state, p) {
  const poi = state.pois.find((x) => x.id === p.goal);
  p.visits[p.goal] = (p.visits[p.goal] || 0) + 1;
  if (p.axes.P < 0) p.routine = (p.routine + 1) % state.pois.length;
  p.act = 'idle';
  p.actLabel = `在${poi.label}待著`;
  // 條理型停固定久；隨性的人待不住。
  p.wait = Math.round(60 + 60 * -p.axes.P + nextRand(state) * 40);
}

function moveAlong(p) {
  let budget = speedOf(p);
  while (budget > 0 && p.path.length) {
    const n = p.path[0];
    const d = Math.hypot(n.x - p.x, n.y - p.y);
    if (d <= budget) {
      p.x = n.x; p.y = n.y; budget -= d;
      p.path.shift();
    } else {
      p.x += ((n.x - p.x) / d) * budget;
      p.y += ((n.y - p.y) / d) * budget;
      budget = 0;
    }
  }
}

export function step(state) {
  state.tick++;
  for (const p of state.people) {
    if (p.act === 'walk') {
      moveAlong(p);
      if (!p.path.length) arrive(state, p);
    } else if (p.wait > 0) {
      p.wait--;
    } else {
      choose(state, p);
    }
  }
}

export function run(state, ticks) {
  for (let i = 0; i < ticks; i++) step(state);
  return state;
}

export function clock(state) {
  const day = Math.floor(state.tick / TICKS_PER_DAY) + 1;
  const m = state.tick % TICKS_PER_DAY;
  return { day, hour: Math.floor(m / 60), minute: m % 60 };
}

export function stateHash(state) {
  const ppl = state.people.map((p) => [p.id, p.x.toFixed(4), p.y.toFixed(4), p.act, p.goal, p.wait]);
  return hashString(JSON.stringify([state.tick, state.rng, ppl]));
}
