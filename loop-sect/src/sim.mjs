import {
  POIS, TEMPLATES, NAMES, TICKS_PER_DAY, OBJECTS, ACTS, BUSH_MAX, BUSH_REGROW,
  START_STOCK, COOK_RAW, FORAGE_TAKE, START_MATERIALS, HEARTH_LEVELS,
} from './data.mjs';
import { placeSite, removeSite, addWork, takeResource, workSpot } from './build.mjs';
import { seedHolder, nextRand, randInt, hashString } from './rng.mjs';
import { buildMap, walkable, nearestWalkable } from './map.mjs';
import { findPath } from './path.mjs';
import { fromTemplate, makePerson, speedOf } from './person.mjs';
import { decayNeeds, applyPer, isNight } from './needs.mjs';
import { candidates, interruptible, willingToChat, REFUSE_COOLDOWN } from './ai.mjs';
import { newSkills, grow, SKILL_OF_TASK, workTimeMul, buildRate, extraMeal, extraTake, skillLabel } from './skills.mjs';
import { FOOT_STEP, SOCIAL } from './data.mjs';
import { addAff, compat, teachTopic, withStage } from './social.mjs';

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

function nearestReachable(map, reach, x0, y0, maxR = 12) {
  const W = map[0].length;
  for (let r = 0; r < maxR; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = x0 + dx, y = y0 + dy;
      if (walkable(map, x, y) && reach[y * W + x]) return { x, y };
    }
  }
  return null;
}

function resolvePois(map, reach) {
  const out = [];
  for (const p of POIS) {
    const spot = nearestReachable(map, reach, p.x, p.y);
    if (spot) out.push({ ...p, x: spot.x, y: spot.y });
  }
  return out;
}

// 每叢莓找一個相鄰可到的站位；沒有的就不當成資源。
function resolveBushes(map, reach) {
  const W = map[0].length;
  const out = [];
  for (let y = 0; y < map.length; y++) for (let x = 0; x < W; x++) {
    if (map[y][x] !== 'B') continue;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const sx = x + dx, sy = y + dy;
      if (walkable(map, sx, sy) && reach[sy * W + sx]) {
        out.push({ id: `b${out.length}`, x, y, sx, sy, berries: 3, user: null });
        break;
      }
    }
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
  state.bushes = resolveBushes(state.map, reach);
  state.objects = OBJECTS.map((o, i) => ({ id: `o${i}`, ...o, slots: o.slots.map((s) => [...s]), users: o.slots.map(() => null) }));
  state.objects.find((o) => o.kind === 'hearth').level = 0;
  state.stock = { ...START_STOCK, ...START_MATERIALS };
  state.ledger = { picked: 0, rawEaten: 0, rawCooked: 0, mealsMade: 0, mealsEaten: 0, woodCut: 0, stoneCut: 0, woodUsed: 0, stoneUsed: 0 };
  state.mapVersion = 0;
  state.res = {};          // "x,y" → 剩餘量（未動過的樹石不列）
  state.resUser = {};      // "x,y" → 預約者
  state.sites = [];
  state.siteSeq = 0;
  state.built = [];
  state.events = [];
  state.reroute = [];
  state.aff = {};          // "p0>p1" → p0 對 p1 的好感
  state.counts = {};
  state.people = people.map((spec, i) => {
    const id = `p${i}`;
    const p = spec.axes ? makePerson({ ...spec, id }) : fromTemplate(spec.template, { id, name: spec.name, protagonist: !!spec.protagonist });
    const s = nearestWalkable(state.map, yard.x - 2 + i * 2, yard.y);
    p.x = s.x; p.y = s.y;
    p.routine = i;
    // 開局需求錯開一點，免得三人同步。
    p.needs = { food: 70 - i * 8, energy: 80 - i * 5, social: 60 + i * 10, fun: 60 };
    p.carry = 0;                       // 身上的莓果
    p.load = { wood: 0, stone: 0 };    // 身上的木石
    p.hold = { meal: 0, raw: 0, wood: 0, stone: 0 };
    p.focus = null;
    p.skills = newSkills();
    p.loadedDist = 0;
    p.refused = {};
    p.task = null;
    p.bubble = null;
    p.forced = null;
    return p;
  });
  state.log = [];
  return state;
}

const byId = (arr, id) => arr.find((x) => x.id === id);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function othersNear(state, p, spot, r = 5) {
  return state.people.filter((o) => o !== p && dist(o, spot) <= r).length;
}

// M1 的去處評分，M2 起當作「閒逛」候選的一個來源。
export function scorePois(state, p) {
  const { E, N, P } = p.axes;
  const here = p.goal;
  const order = state.pois;
  const rot = order[p.routine % order.length];
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

// ---------- 預約 ----------
function reserve(state, p, c) {
  if (c.obj && c.slot >= 0) byId(state.objects, c.obj).users[c.slot] = p.id;
  if (c.bush) byId(state.bushes, c.bush).user = p.id;
  if (c.kind === 'eat') { state.stock.meal--; p.hold.meal = 1; }
  if (c.kind === 'cook') { state.stock.raw -= COOK_RAW; p.hold.raw = COOK_RAW; }
  if (c.res) state.resUser[c.res] = p.id;
  if (c.kind === 'haul') {
    state.stock[c.mat] -= c.n; p.hold[c.mat] = c.n;
    byId(state.sites, c.site).incoming[c.mat] += c.n;
  }
  if (c.kind === 'build') byId(state.sites, c.site).workers.push(p.id);
}

export function release(state, p) {
  const t = p.task;
  if (t) {
    if (t.obj && t.slot >= 0) {
      const o = byId(state.objects, t.obj);
      if (o.users[t.slot] === p.id) o.users[t.slot] = null;
    }
    if (t.bush) {
      const b = byId(state.bushes, t.bush);
      if (b.user === p.id) b.user = null;
    }
    if (t.res && state.resUser[t.res] === p.id) delete state.resUser[t.res];
    const site = t.site && byId(state.sites, t.site);
    if (t.kind === 'haul' && site) site.incoming[t.mat] -= t.leg === 'drop' ? p.load[t.mat] : p.hold[t.mat];
    if (t.kind === 'build' && site) site.workers = site.workers.filter((w) => w !== p.id);
  }
  for (const k of ['meal', 'raw', 'wood', 'stone']) { state.stock[k] += p.hold[k]; p.hold[k] = 0; }
  p.task = null;
}

// ---------- 選擇 ----------
function pathTo(state, p, spot) {
  return findPath(state.map, Math.round(p.x), Math.round(p.y), spot.x, spot.y);
}

function choose(state, p) {
  const { list, forced } = candidates(state, p, scorePois);
  // 同一種念頭（例如三張床）只列最高的一個。
  const seen = new Set();
  p.why = list.filter((c) => { const k = c.kind === 'sleep' ? 'sleep' : c.label; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3);
  p.forced = forced;
  for (const c of list) {
    let path = [];
    if (c.spot) {
      let spot = c.spot;
      if (c.kind === 'chat') spot = nearestWalkable(state.map, spot.x, spot.y);
      path = spot && pathTo(state, p, spot);
      if (!path) continue;
    }
    reserve(state, p, c);
    p.task = { kind: c.kind, obj: c.obj, slot: c.slot, bush: c.bush, partner: c.partner, poi: c.poi, chase: 80,
      res: c.res, mat: c.mat, rx: c.rx, ry: c.ry, take: c.take, site: c.site, n: c.n, leg: c.kind === 'haul' ? 'pickup' : undefined };
    p.actLabel = c.label;
    if (path.length) {
      p.path = path;
      p.act = 'walk';
      if (c.kind === 'wander') p.goal = c.poi;
    } else if (c.kind === 'chat') {
      // 已經站在對方旁邊：直接開口（之前誤走 startDoing，對方沒進入聊天，立刻被 shouldStop 收掉）。
      if (!tryChat(state, p)) { release(state, p); p.act = 'idle'; p.wait = 0; }
    } else {
      startDoing(state, p);
    }
    return;
  }
  p.act = 'idle'; p.actLabel = '發呆'; p.wait = 20;
}

function startDoing(state, p, dur = null) {
  const t = p.task;
  const a = ACTS[t.kind];
  p.act = 'do';
  if (t.kind === 'cook') dur = Math.round(HEARTH_LEVELS[byId(state.objects, t.obj).level].cookDur * workTimeMul(p, 'cook'));
  if (t.kind === 'chop' || t.kind === 'quarry') dur = Math.round(a.dur * workTimeMul(p, t.kind));
  t.left = dur ?? a.dur;
  p.actLabel = a.label;
  state.counts[t.kind] = (state.counts[t.kind] || 0) + 1;
}

// 走到目的地後：聊天要先確認對方、閒逛改成停留，其餘直接開始。
function arrive(state, p) {
  const t = p.task;
  if (t.kind === 'wander') {
    const poi = byId(state.pois, t.poi);
    p.visits[t.poi] = (p.visits[t.poi] || 0) + 1;
    if (p.axes.P < 0) p.routine = (p.routine + 1) % state.pois.length;
    p.task = null;
    p.act = 'idle';
    p.actLabel = `在${poi.label}待著`;
    p.wait = Math.round(60 + 60 * -p.axes.P + nextRand(state) * 40);
    return;
  }
  if (t.kind === 'chat') return tryChat(state, p);
  startDoing(state, p);
}

function tryChat(state, p) {
  const o = byId(state.people, p.task.partner);
  if (dist(p, o) > 2.5) return false;
  const mutual = o.task && o.task.kind === 'chat' && o.task.partner === p.id;
  if (!mutual && !interruptible(o)) {
    // 對方在忙：不算婉拒，等一小時再說。
    p.refused[o.id] = state.tick - REFUSE_COOLDOWN + 60;
    release(state, p);
    p.act = 'idle'; p.wait = 10; p.actLabel = `${o.name}在忙`;
    return true;
  }
  if (!mutual && !willingToChat(o)) {
    p.refused[o.id] = state.tick;
    p.bubble = { text: '被婉拒', until: state.tick + 40 };
    o.bubble = { text: '想靜一靜', until: state.tick + 40 };
    p.needs.fun = Math.max(0, p.needs.fun - 3);
    addAff(state, p, o, -SOCIAL.REFUSE_LOSS * (1 + 0.5 * Math.max(0, p.axes.F)));
    state.counts.refused = (state.counts.refused || 0) + 1;
    release(state, p);
    p.act = 'idle'; p.wait = 10; p.actLabel = '被婉拒了';
    return true;
  }
  release(state, o);
  o.path = []; o.wait = 0;
  const dur = ACTS.chat.dur + randInt(state, 21);
  // 話題：誰比誰強就由弱的那方請教；都差不多就閒聊。
  const pLearns = teachTopic(p, o), oLearns = teachTopic(o, p);
  o.task = { kind: 'chat', partner: p.id, learn: oLearns };
  startDoing(state, o, dur);
  p.task.learn = pLearns;
  startDoing(state, p, dur);
  const topic = (x) => (x ? `請教${skillLabel(x)}` : '閒聊');
  o.actLabel = `和${p.name}${topic(oLearns)}`;
  p.actLabel = `和${o.name}${topic(pLearns)}`;
  p.bubble = { text: topic(pLearns), until: state.tick + 30 };
  o.bubble = { text: topic(oLearns), until: state.tick + 30 };
  return true;
}

// ---------- 行動結算 ----------
function improve(state, p, id, mul = 1) {
  const m = grow(p, id, mul);
  if (m === null) return;
  const text = `${skillLabel(id)}精進`;
  p.bubble = { text, until: state.tick + 60 };
  state.events.push({ tick: state.tick, kind: 'skill', text: `${p.name}${text}（${m}）` });
}

function finish(state, p) {
  const t = p.task;
  const L = state.ledger;
  if (SKILL_OF_TASK[t.kind]) improve(state, p, SKILL_OF_TASK[t.kind]); // 只有做完才成長
  if (t.kind === 'eat') {
    L.mealsEaten++; p.hold.meal = 0;
    const table = byId(state.objects, t.obj);
    for (const u of table.users) if (u && u !== p.id) { const o = byId(state.people, u); withStage(state, p, o, () => addAff(state, p, o, SOCIAL.MEAL_GAIN)); }
  }
  if (t.kind === 'chat' && t.left <= 0) {
    // 正常聊完才算；被打斷的不加。雙方各自在自己的 finish 加自己那一側。
    const o = byId(state.people, t.partner);
    withStage(state, p, o, () => addAff(state, p, o, SOCIAL.CHAT_GAIN * compat(p, o) * (1 + 0.3 * Math.max(0, p.axes.E))));
    if (t.learn) { improve(state, p, t.learn, SOCIAL.TEACH_MUL); addAff(state, o, p, SOCIAL.TEACH_GAIN); state.counts.taught = (state.counts.taught || 0) + 1; }
  }
  if (t.kind === 'build') {
    const site = t.site && byId(state.sites, t.site);
    for (const w of site?.workers ?? []) if (w !== p.id) { const o = byId(state.people, w); withStage(state, p, o, () => addAff(state, p, o, SOCIAL.WORK_GAIN)); }
  }
  if (t.kind === 'eatRaw') {
    const b = byId(state.bushes, t.bush);
    if (b.berries > 0) { b.berries--; L.picked++; L.rawEaten++; }
  }
  if (t.kind === 'eatCarried' && p.carry > 0) { p.carry--; L.rawEaten++; }
  if (t.kind === 'forage') {
    const b = byId(state.bushes, t.bush);
    const n = Math.min(FORAGE_TAKE + extraTake(p, 'forage'), b.berries);
    b.berries -= n; p.carry += n; L.picked += n;
  }
  if (t.kind === 'deliver') { state.stock.raw += p.carry; p.carry = 0; }
  if (t.kind === 'cook') {
    const meals = HEARTH_LEVELS[byId(state.objects, t.obj).level].meals + extraMeal(p);
    L.rawCooked += p.hold.raw; p.hold.raw = 0; state.stock.meal += meals; L.mealsMade += meals;
  }
  if (t.kind === 'chop' || t.kind === 'quarry') {
    const got = takeResource(state, t.rx, t.ry, t.mat, t.take);
    p.load[t.mat] += got;
    L[t.mat === 'wood' ? 'woodCut' : 'stoneCut'] += got;
  }
  if (t.kind === 'store') {
    for (const m of ['wood', 'stone']) { state.stock[m] += p.load[m]; p.load[m] = 0; }
  }
  if (t.kind === 'haul' && t.leg === 'pickup') {
    // 拿到料：改走去工地。工地若已取消，就留在身上之後送回倉堆。
    p.load[t.mat] += p.hold[t.mat]; p.hold[t.mat] = 0;
    const site = byId(state.sites, t.site);
    const spot = site && workSpot(state, site);
    const path = spot && pathTo(state, p, spot);
    if (path) {
      t.leg = 'drop';
      p.path = path; p.act = 'walk'; p.actLabel = `扛料去${site.label}`;
      if (!path.length) arriveDrop(state, p);
      return;
    }
    t.leg = 'drop'; // 走不到工地：在途改由身上的料計算，release 會扣回
  }
  if (t.kind === 'haul' && t.leg === 'drop') {
    const site = byId(state.sites, t.site);
    if (site) {
      const n = p.load[t.mat];
      site.have[t.mat] += n; site.incoming[t.mat] -= n; p.load[t.mat] = 0;
      t.site = null; // 已交清，release 不再扣在途
    }
  }
  release(state, p);
  p.act = 'idle';
  p.wait = 0;
}

function arriveDrop(state, p) {
  startDoing(state, p, 3);
  p.actLabel = '卸料';
}

function shouldStop(state, p) {
  const t = p.task;
  if (t.kind === 'sleep' || t.kind === 'sleepGround') {
    if (p.needs.energy >= 98) return true;
    if (p.needs.food < 12 && p.needs.energy >= 40) return true;
    if (!isNight(state.tick) && p.needs.energy > 85 && p.axes.P > 0.3) return true;
  }
  if (t.kind === 'chat') {
    const o = byId(state.people, t.partner);
    if (!o.task || o.task.kind !== 'chat' || o.task.partner !== p.id) return true;
  }
  return false;
}

function stepPerson(state, p) {
  decayNeeds(p, p.act === 'walk', p.act === 'do' && (p.task.kind === 'sleep' || p.task.kind === 'sleepGround'));
  if (p.bubble && p.bubble.until <= state.tick) p.bubble = null;
  if (p.act === 'walk') {
    const t = p.task;
    if (t.kind === 'chat') {
      // 對方會走動：每 15 tick 重新追，追太久就放棄。
      if (tryChatIfClose(state, p)) return;
      if (--t.chase <= 0) { release(state, p); p.act = 'idle'; p.wait = 0; return; }
      if (t.chase % 15 === 0) {
        const o = byId(state.people, t.partner);
        const spot = nearestWalkable(state.map, Math.round(o.x), Math.round(o.y));
        const np = spot && pathTo(state, p, spot);
        if (np) p.path = np;
      }
    }
    const moved = moveAlong(p);
    // 負重走路練腳力：每走 FOOT_STEP 格算一次完成。
    if (p.carry > 0 || p.load.wood > 0 || p.load.stone > 0) {
      p.loadedDist += moved;
      while (p.loadedDist >= FOOT_STEP) { p.loadedDist -= FOOT_STEP; improve(state, p, 'foot'); }
    }
    if (t.kind === 'wander') applyPer(p, { fun: 0.06 * (1 + 0.5 * p.axes.N) });
    if (!p.path.length) {
      if (t.kind === 'chat') {
        if (!tryChat(state, p)) { release(state, p); p.act = 'idle'; p.wait = 0; }
      } else if (t.kind === 'haul' && t.leg === 'drop') arriveDrop(state, p);
      else arrive(state, p);
    }
  } else if (p.act === 'do') {
    applyPer(p, ACTS[p.task.kind].per);
    if (p.task.kind === 'eat') {
      const table = byId(state.objects, p.task.obj);
      const company = table.users.filter((u) => u && u !== p.id).length;
      if (company) applyPer(p, { social: 0.4 * company });
    }
    if (p.task.kind === 'build') {
      const site = byId(state.sites, p.task.site);
      const r = site ? addWork(state, site, buildRate(p)) : 'done';
      p.actLabel = r === 'wait' ? '等人讓開' : ACTS.build.label;
      if (r === 'done') { p.task.site = null; finish(state, p); return; }
      if (r === 'cell') { finish(state, p); return; } // 換下一格要換站位
    }
    if (--p.task.left <= 0 || shouldStop(state, p)) finish(state, p);
  } else if (p.wait > 0) {
    p.wait--;
    if (!p.task) applyPer(p, { fun: 0.03 });
  } else {
    choose(state, p);
  }
}

function tryChatIfClose(state, p) {
  const o = byId(state.people, p.task.partner);
  if (dist(p, o) > 1.5) return false;
  p.path = [];
  if (!tryChat(state, p)) { release(state, p); p.act = 'idle'; p.wait = 0; }
  return true;
}

function moveAlong(p) {
  const full = speedOf(p);
  let budget = full;
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
  return full - budget;
}

function regrow(state) {
  state.bushes.forEach((b, i) => {
    if ((state.tick + i * 37) % BUSH_REGROW === 0 && b.berries < BUSH_MAX) b.berries++;
  });
}

export function step(state) {
  state.tick++;
  regrow(state);
  for (const p of state.people) stepPerson(state, p);
  // 新立起的牆或柵擋住了別人的路：沿原終點重找，找不到就放棄手上的事。
  while (state.reroute.length) {
    const p = byId(state.people, state.reroute.pop());
    if (!p.path.length) continue;
    const end = p.path[p.path.length - 1];
    const np = pathTo(state, p, end);
    if (np) p.path = np;
    else { release(state, p); p.path = []; p.act = 'idle'; p.wait = 0; }
  }
}

// ---------- 玩家操作 ----------
export function placeBlueprint(state, id) {
  return placeSite(state, id);
}

export function cancelSite(state, id) {
  for (const p of state.people) {
    if (p.task && p.task.site === id) { release(state, p); p.path = []; p.act = 'idle'; p.wait = 0; }
  }
  return removeSite(state, id);
}

export function setFocus(state, personId, focus) {
  const p = byId(state.people, personId);
  if (p) p.focus = focus;
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
  const ppl = state.people.map((p) => [p.id, p.x.toFixed(4), p.y.toFixed(4), p.act, p.task?.kind, p.wait,
    Object.values(p.needs).map((v) => v.toFixed(3)), p.carry, p.load]);
  return hashString(JSON.stringify([state.tick, state.rng, ppl, state.stock, state.ledger, state.bushes.map((b) => b.berries),
    state.map, state.sites.map((x) => [x.id, x.work, x.have, x.incoming])]));
}

export { REFUSE_COOLDOWN };
