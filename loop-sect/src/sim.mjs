import {
  POIS, TEMPLATES, NAMES, TICKS_PER_DAY, OBJECTS, ACTS, BUSH_MAX, BUSH_REGROW,
  START_STOCK, COOK_RAW, FORAGE_TAKE, START_MATERIALS, HEARTH_LEVELS,
} from './data.mjs';
import { placeSite, removeSite, addWork, takeResource, workSpot, blockCell, cellClear } from './build.mjs';
import { raidSchedule, startRaids, stepEnemies, activeEnemies, spawnGuard } from './raid.mjs';
import { newNests, nestOf, canLaunch, retreatReason } from './expedition.mjs';
import { tally } from './chronicle.mjs';
import { stepDuty } from './duty.mjs';
import { visitSchedule, visitChance, appeal, reasonText, shouldApprentice, foundingPlan, freeName } from './recruit.mjs';
import { seedHolder, nextRand, randInt, hashString } from './rng.mjs';
import { buildMap, walkable, nearestWalkable } from './map.mjs';
import { findPath } from './path.mjs';
import { fromTemplate, makePerson, speedOf } from './person.mjs';
import { decayNeeds, applyPer, isNight } from './needs.mjs';
import { candidates, interruptible, sparInterruptible, willingToChat, willingToSpar, REFUSE_COOLDOWN } from './ai.mjs';
import { newSkills, grow, SKILL_OF_TASK, workTimeMul, buildRate, extraMeal, extraTake, skillLabel } from './skills.mjs';
import { FOOT_STEP, SOCIAL, MARTIAL, DEFENSE, RECRUIT, SECT, EXPEDITION, NESTS, FIRE, FARM } from './data.mjs';
import { addAff, compat, teachTopic, withStage, atLeast } from './social.mjs';
import { newMoves, practice, moveLabel, learn, drillMove, prowess } from './martial.mjs';

// 兩人一起做的事：先走到對方身邊、對方答應才開始。
const PAIR = new Set(['chat', 'spar']);

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
  state.ledger = { picked: 0, rawEaten: 0, rawCooked: 0, mealsMade: 0, mealsEaten: 0, woodCut: 0, stoneCut: 0, woodUsed: 0, stoneUsed: 0, woodBurned: 0, veg: 0,
    rawStolen: 0, mealsStolen: 0, woodStolen: 0, stoneStolen: 0 };
  state.mapVersion = 0;
  state.res = {};          // "x,y" → 剩餘量（未動過的樹石不列）
  state.resUser = {};      // "x,y" → 預約者
  state.sites = [];
  state.siteSeq = 0;
  state.built = [];
  state.events = [];
  state.reroute = [];
  state.aff = {};          // "p0>p1" → p0 對 p1 的好感
  state.decisions = [];    // M8 訪客去留紀錄
  state.counts = {};
  state.raids = raidSchedule(seed);   // M7：開局排好
  state.raidAt = 0;
  state.enemies = [];
  state.enemySeq = 0;
  state.fenceHp = {};      // "x,y" → 柵欄格耐久（滿血不列）
  state.repairUser = {};
  state.threat = 0;        // 危機感：被偷、被撞破時上升，慢慢消退
  Object.defineProperty(state, 'releaseFn', { value: release, enumerable: false }); // raid.mjs 的警報要釋放預約
  state.people = people.map((spec, i) => {
    const id = `p${i}`;
    const p = spec.axes ? makePerson({ ...spec, id }) : fromTemplate(spec.template, { id, name: spec.name, protagonist: !!spec.protagonist });
    const s = nearestWalkable(state.map, yard.x - 2 + i * 2, yard.y);
    p.x = s.x; p.y = s.y;
    // 開局需求錯開一點，免得三人同步。
    p.needs = { food: 70 - i * 8, energy: 80 - i * 5, social: 60 + i * 10, fun: 60 };
    return initPerson(p, i);
  });
  state.personSeq = state.people.length;
  state.visits = visitSchedule(seed);  // M8：開局排好
  state.visitAt = 0;
  state.sect = null;
  state.nests = newNests();   // M9
  state.plots = [];           // M12 菜畦
  state.duty = {};            // M18 值日：id → 職
  for (const n of state.nests) NESTS.find((x) => x.id === n.id).guards.forEach((k, i) => spawnGuard(state, n, k, i));
  state.expedition = null;
  state.log = [];
  return state;
}

function initPerson(p, i) {
    p.routine = i;
    p.carry = 0;                       // 身上的莓果
    p.load = { wood: 0, stone: 0 };    // 身上的木石
    p.hold = { meal: 0, raw: 0, wood: 0, stone: 0 };
    p.focus = null;
    p.dutyPin = null;                  // M18：玩家指定的值日（null = 自動，'none' = 不排）
    p.skills = newSkills();
    p.moves = newMoves();
    p.loadedDist = 0;
    p.refused = {};
    p.task = null;
    p.bubble = null;
    p.forced = null;
    p.guest = null;
    p.master = null;
    p.exp = false;
    p.pack = 0;
    return p;
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
  if (c.kind === 'cook') { state.stock.raw -= COOK_RAW; p.hold.raw = COOK_RAW; state.stock.wood -= FIRE.WOOD_PER_POT; p.hold.wood = FIRE.WOOD_PER_POT; }
  if (c.plot) byId(state.plots, c.plot).user = p.id;
  if (c.res) state.resUser[c.res] = p.id;
  if (c.kind === 'haul') {
    state.stock[c.mat] -= c.n; p.hold[c.mat] = c.n;
    byId(state.sites, c.site).incoming[c.mat] += c.n;
  }
  if (c.kind === 'build') byId(state.sites, c.site).workers.push(p.id);
  if (c.kind === 'repair') { state.repairUser[c.cell] = p.id; state.stock.wood--; p.hold.wood = 1; }
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
    if (t.plot) { const g = byId(state.plots, t.plot); if (g?.user === p.id) g.user = null; }
    const site = t.site && byId(state.sites, t.site);
    if (t.kind === 'haul' && site) site.incoming[t.mat] -= t.leg === 'drop' ? p.load[t.mat] : p.hold[t.mat];
    if (t.kind === 'build' && site) site.workers = site.workers.filter((w) => w !== p.id);
    if (t.kind === 'repair' && state.repairUser[t.cell] === p.id) delete state.repairUser[t.cell];
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
      if (PAIR.has(c.kind)) spot = nearestWalkable(state.map, spot.x, spot.y);
      path = spot && pathTo(state, p, spot);
      if (!path) continue;
    }
    reserve(state, p, c);
    p.task = { kind: c.kind, obj: c.obj, slot: c.slot, bush: c.bush, partner: c.partner, poi: c.poi, chase: 80,
      res: c.res, mat: c.mat, rx: c.rx, ry: c.ry, take: c.take, site: c.site, n: c.n, move: c.move, enemy: c.enemy, cell: c.cell, plot: c.plot, cx: c.cx, cy: c.cy, dealt: 0, leg: c.kind === 'haul' ? 'pickup' : undefined };
    p.actLabel = c.label;
    if (path.length) {
      p.path = path;
      p.act = 'walk';
      if (c.kind === 'wander') p.goal = c.poi;
    } else if (c.kind === 'fight') {
      engage(state, p);
    } else if (PAIR.has(c.kind)) {
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
  if (t.kind === 'hide') dur = DEFENSE.HIDE_DUR;
  t.left = dur ?? a.dur;
  p.actLabel = t.kind === 'drill' ? `練${moveLabel(t.move)}` : a.label;
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
  if (PAIR.has(t.kind)) return tryChat(state, p);
  if (t.kind === 'fight') return engage(state, p);
  if (t.kind === 'leave') return removePerson(state, p);
  if (t.kind === 'expedition') { p.task = null; p.act = 'idle'; p.wait = 3; return; }
  startDoing(state, p);
}

function tryChat(state, p) {
  const o = byId(state.people, p.task.partner);
  if (dist(p, o) > 2.5) return false;
  const kind = p.task.kind;
  const mutual = o.task && o.task.kind === kind && o.task.partner === p.id;
  if (!mutual && !(kind === 'spar' ? sparInterruptible(o) : interruptible(o))) {
    // 對方在忙：不算婉拒，等一小時再說。
    p.refused[o.id] = state.tick - REFUSE_COOLDOWN + 60;
    release(state, p);
    p.act = 'idle'; p.wait = 10; p.actLabel = `${o.name}在忙`;
    return true;
  }
  if (kind === 'spar') return trySpar(state, p, o, mutual);
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

// 切磋：對方沒力氣就算了，不扣好感（不是不喜歡你）。
function trySpar(state, p, o, mutual) {
  if (!mutual && !willingToSpar(o)) {
    p.refused[o.id] = state.tick - REFUSE_COOLDOWN + 60;
    release(state, p);
    p.act = 'idle'; p.wait = 10; p.actLabel = `${o.name}沒力氣過招`;
    return true;
  }
  release(state, o);
  o.path = []; o.wait = 0;
  const dur = ACTS.spar.dur + randInt(state, 11);
  o.task = { kind: 'spar', partner: p.id, move: drillMove(o) };
  startDoing(state, o, dur);
  startDoing(state, p, dur);
  o.actLabel = `和${p.name}切磋${moveLabel(o.task.move)}`;
  p.actLabel = `和${o.name}切磋${moveLabel(p.task.move)}`;
  p.bubble = { text: moveLabel(p.task.move), until: state.tick + 30 };
  o.bubble = { text: moveLabel(o.task.move), until: state.tick + 30 };
  return true;
}

// ---------- 行動結算 ----------
function improve(state, p, id, mul = 1) {
  const m = grow(p, id, mul);
  if (m === null) return;
  const text = `${skillLabel(id)}精進`;
  p.bubble = { text, until: state.tick + 60 };
  state.events.push({ tick: state.tick, kind: 'skill', text: `${p.name}${text}（${m}）`, who: [p.id] });
}

function maybeApprentice(state, p, o) {
  if (!shouldApprentice(state, p, o)) return;
  p.master = o.id;
  p.bubble = { text: '拜師', until: state.tick + 90 };
  state.events.push({ tick: state.tick, kind: 'master', text: `${p.name}拜${o.name}為師`, who: [p.id, o.id] });
  state.counts.apprentice = (state.counts.apprentice || 0) + 1;
}

// ---------- M8 訪客 ----------
function spawnGuest(state, v) {
  const id = `p${state.personSeq++}`;
  const p = makePerson({ id, name: freeName(state, v.nameAt), axes: v.axes, attrs: v.attrs });
  const s = nearestWalkable(state.map, RECRUIT.ENTRY.x, RECRUIT.ENTRY.y);
  p.x = s.x; p.y = s.y;
  p.needs = { food: 60, energy: 70, social: 40, fun: 50 };
  initPerson(p, state.people.length);
  p.guest = { arrived: state.tick, until: state.tick + RECRUIT.STAY };
  state.people.push(p);
  state.events.push({ tick: state.tick, kind: 'visit', text: `${p.name}從東山徑上山來訪`, who: [p.id] });
  state.counts.visitors = (state.counts.visitors || 0) + 1;
}

function decideGuest(state, p) {
  const a = appeal(state, p);
  const why = reasonText(a);
  state.decisions.push({ tick: state.tick, id: p.id, bed: a.bed, join: a.join, score: a.score });
  if (a.join) {
    p.guest = null;
    p.bubble = { text: '留下了', until: state.tick + 90 };
    state.events.push({ tick: state.tick, kind: 'join', text: `${p.name}決定留下：${why}`, who: [p.id] });
    state.counts.joined = (state.counts.joined || 0) + 1;
    return;
  }
  state.events.push({ tick: state.tick, kind: 'leave', text: `${p.name}下山了：${why}`, who: [p.id] });
  release(state, p);
  const out = nearestWalkable(state.map, RECRUIT.ENTRY.x, RECRUIT.ENTRY.y);
  const path = pathTo(state, p, out);
  p.task = { kind: 'leave' }; p.guest.leaving = true;
  p.actLabel = '下山';
  if (!path || !path.length) { removePerson(state, p); return; }
  p.path = path; p.act = 'walk';
}

// 離開地圖：先釋放自己，再讓以他為對象的人放手。
function removePerson(state, p) {
  release(state, p);
  for (const o of state.people) {
    if (o !== p && o.task?.partner === p.id) { release(state, o); o.path = []; o.act = 'idle'; o.wait = 0; }
    if (o.master === p.id) o.master = null;
  }
  state.people = state.people.filter((x) => x !== p);
}

function stepRecruit(state) {
  while (state.visitAt < state.visits.length && state.visits[state.visitAt].tick <= state.tick) {
    const v = state.visits[state.visitAt++];
    if (state.people.length < RECRUIT.CAP && v.roll < visitChance(state)) spawnGuest(state, v);
  }
  for (const p of [...state.people]) {
    if (p.guest && !p.guest.leaving && state.tick >= p.guest.until && p.act !== 'do') decideGuest(state, p);
  }
  if (state.tick % 60 === 0) {
    const plan = foundingPlan(state);
    if (plan) {
      state.sect = plan;
      const leader = byId(state.people, plan.leader);
      state.events.push({ tick: state.tick, kind: 'found', text: `立派：${plan.name}，${leader.name}為掌門，門規「${SECT.RULES[plan.rule].label}」`, who: [leader.id] });
    }
  }
}

function comprehend(state, p, id) {
  if (!id) return;
  p.bubble = { text: `領悟${moveLabel(id)}`, until: state.tick + 90 };
  state.events.push({ tick: state.tick, kind: 'move', text: `${p.name}領悟了${moveLabel(id)}`, who: [p.id] });
  state.counts.comprehend = (state.counts.comprehend || 0) + 1;
}

function finish(state, p) {
  const t = p.task;
  const L = state.ledger;
  if (t.kind === 'drill') comprehend(state, p, practice(state, p, t.move));
  if (t.kind === 'spar' && t.left <= 0) {
    const o = byId(state.people, t.partner);
    comprehend(state, p, practice(state, p, t.move, MARTIAL.SPAR_MUL));
    withStage(state, p, o, () => addAff(state, p, o, MARTIAL.SPAR_GAIN * compat(p, o)));
    maybeApprentice(state, p, o);
    // 指點：朋友以上（師父不必），對方會而我不會的招，有機會學到；師父教得更多。
    const isMaster = o.id === p.master;
    if (isMaster || atLeast(state, p, o, MARTIAL.POINT_STAGE)) {
      const teach = Object.keys(o.moves).filter((id) => !(id in p.moves));
      if (teach.length && nextRand(state) < MARTIAL.POINT_P * (isMaster ? RECRUIT.MASTER_MUL : 1)) {
        const id = teach[randInt(state, teach.length)];
        learn(p, id, MARTIAL.POINT_START);
        p.bubble = { text: `學會${moveLabel(id)}`, until: state.tick + 90 };
        state.events.push({ tick: state.tick, kind: 'move', text: `${o.name}指點${p.name}學會了${moveLabel(id)}`, who: [p.id, o.id] });
        state.counts.pointed = (state.counts.pointed || 0) + 1;
      }
    }
    state.counts.sparDone = (state.counts.sparDone || 0) + 1;
  }
  if (t.kind === 'drill') state.counts.drillDone = (state.counts.drillDone || 0) + 1;
  if (t.kind === 'fight') {
    // 打退了才算實戰；自己退下的不算。
    const e = state.enemies.find((x) => x.id === t.enemy);
    if (t.dealt > 0 && (!e || e.hp <= 0)) comprehend(state, p, practice(state, p, drillMove(p), DEFENSE.FIGHT_MUL));
  }
  if (t.kind === 'ration') { p.pack--; L.mealsEaten++; p.needs.food = Math.min(100, p.needs.food + EXPEDITION.RATION_FOOD); }
  if (t.kind === 'repair') {
    blockCell(state, { x: t.cx, y: t.cy, to: 'F' }); // 跟施工一樣：路線經過這格的人改道
    L.woodUsed += p.hold.wood; p.hold.wood = 0;
    state.events.push({ tick: state.tick, kind: 'repair', text: `${p.name}修好了南柵欄`, who: [p.id] });
    state.counts.repaired = (state.counts.repaired || 0) + 1;
  }
  if (SKILL_OF_TASK[t.kind]) improve(state, p, SKILL_OF_TASK[t.kind]); // 只有做完才成長
  if (t.kind === 'eat') {
    L.mealsEaten++; p.hold.meal = 0;
    const table = byId(state.objects, t.obj);
    for (const u of table.users) if (u && u !== p.id) { const o = byId(state.people, u); withStage(state, p, o, () => addAff(state, p, o, SOCIAL.MEAL_GAIN)); }
  }
  if (t.kind === 'chat' && t.left <= 0) {
    // 正常聊完才算；被打斷的不加。雙方各自在自己的 finish 加自己那一側。
    const o = byId(state.people, t.partner);
    const rule = state.sect?.rule === 'help' ? SECT.RULE_CHAT : 1;
    withStage(state, p, o, () => addAff(state, p, o, SOCIAL.CHAT_GAIN * compat(p, o) * (1 + 0.3 * Math.max(0, p.axes.E)) * rule));
    maybeApprentice(state, p, o);
    if (t.learn) { improve(state, p, t.learn, SOCIAL.TEACH_MUL * (o.id === p.master ? RECRUIT.MASTER_MUL : 1)); addAff(state, o, p, SOCIAL.TEACH_GAIN); state.counts.taught = (state.counts.taught || 0) + 1; }
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
  if (t.kind === 'sow') { const g = byId(state.plots, t.plot); g.stage = 'growing'; g.at = state.tick; }
  if (t.kind === 'harvest') {
    const g = byId(state.plots, t.plot);
    if (g.stage === 'ripe') {
      const n = FARM.YIELD + extraTake(p, 'forage');
      p.carry += n; L.picked += n; L.veg += n;
      g.stage = 'empty'; g.at = state.tick;
      if (!state.firstHarvest && (state.firstHarvest = true)) state.events.push({ tick: state.tick, kind: 'farm', text: `菜園頭一回收成：${p.name}收了 ${n} 份菜`, who: [p.id] });
    }
  }
  if (t.kind === 'cook') {
    const meals = HEARTH_LEVELS[byId(state.objects, t.obj).level].meals + extraMeal(p);
    L.rawCooked += p.hold.raw; p.hold.raw = 0; state.stock.meal += meals; L.mealsMade += meals;
    L.woodUsed += p.hold.wood; L.woodBurned += p.hold.wood; p.hold.wood = 0;   // M12 柴火
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
  if (PAIR.has(t.kind)) {
    const o = byId(state.people, t.partner);
    if (!o.task || o.task.kind !== t.kind || o.task.partner !== p.id) return true;
  }
  if (t.kind === 'hide') return !activeEnemies(state).some((e) => Math.hypot(e.x - p.x, e.y - p.y) <= DEFENSE.ALERT_R + 5);
  return false;
}

function stepPerson(state, p) {
  decayNeeds(p, p.act === 'walk', p.act === 'do' && (p.task.kind === 'sleep' || p.task.kind === 'sleepGround'));
  if (p.bubble && p.bubble.until <= state.tick) p.bubble = null;
  if (p.act === 'walk') {
    const t = p.task;
    if (t.kind === 'fight') {
      const e = state.enemies.find((x) => x.id === t.enemy);
      if (!e || e.hp <= 0 || e.mode === 'flee' || --t.chase <= 0) { release(state, p); p.path = []; p.act = 'idle'; p.wait = 0; return; }
      if (Math.hypot(e.x - p.x, e.y - p.y) <= 1.5) { p.path = []; engage(state, p); return; }
      if (t.chase % 10 === 0) {
        const spot = nearestWalkable(state.map, Math.round(e.x), Math.round(e.y));
        const np = spot && pathTo(state, p, spot);
        if (np) p.path = np;
      }
    }
    if (PAIR.has(t.kind)) {
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
      if (PAIR.has(t.kind)) {
        if (!tryChat(state, p)) { release(state, p); p.act = 'idle'; p.wait = 0; }
      } else if (t.kind === 'haul' && t.leg === 'drop') arriveDrop(state, p);
      else if (t.kind === 'fight') { if (p.act === 'walk' && !engage(state, p)) p.path = [{ x: Math.round(p.x), y: Math.round(p.y) }]; }
      else arrive(state, p);
    }
  } else if (p.act === 'do') {
    applyPer(p, ACTS[p.task.kind].per);
    if (p.task.kind === 'eat') {
      const table = byId(state.objects, p.task.obj);
      const company = table.users.filter((u) => u && u !== p.id).length;
      if (company) applyPer(p, { social: 0.4 * company });
    }
    if (p.task.kind === 'fight') { fightTick(state, p); return; }
    if (p.task.kind === 'raze') { razeTick(state, p); return; }
    if (p.task.kind === 'repair' && p.task.left <= 1 && !cellClear(state, { x: p.task.cx, y: p.task.cy }, p)) { p.actLabel = '等人讓開'; return; }
    if (p.task.kind === 'build') {
      const site = byId(state.sites, p.task.site);
      if (site) (site.helpers ??= []).includes(p.id) || site.helpers.push(p.id);
      const r = site ? addWork(state, site, buildRate(p)) : 'done';
      p.actLabel = r === 'wait' ? '等人讓開' : ACTS.build.label;
      if (r === 'done') { p.task.site = null; finish(state, p); return; }
      if (r === 'cell') { finish(state, p); return; } // 換下一格要換站位
    }
    if (--p.task.left <= 0 || shouldStop(state, p)) finish(state, p);
  } else if (p.wait > 0) {
    p.wait--;
    if (!p.task) applyPer(p, { fun: 0.03 });
  } else if (p.exp) {
    expAssign(state, p);
  } else {
    choose(state, p);
  }
}

// ---------- M9 遠征 ----------
export function startExpedition(state, nestId) {
  const c = canLaunch(state, nestId);
  if (!c.ok) return c;
  const nest = nestOf(state, nestId);
  let packed = 0;
  for (const p of c.party) {
    release(state, p);
    p.path = []; p.act = 'idle'; p.wait = 0; p.exp = true;
    p.pack = Math.min(EXPEDITION.PACK, state.stock.meal);
    state.stock.meal -= p.pack; packed += p.pack;
    p.bubble = { text: '出發！', until: state.tick + 60 };
  }
  state.expedition = { nest: nestId, members: c.party.map((p) => p.id), phase: 'march', started: state.tick, phaseAt: state.tick };
  state.events.push({ tick: state.tick, kind: 'exp', text: `${c.party.map((p) => p.name).join('、')}出發討伐${nest.label}（帶 ${packed} 份乾糧）`, who: c.party.map((p) => p.id) });
  state.counts.expeditions = (state.counts.expeditions || 0) + 1;
  return { ok: true, party: c.party };
}

const expMembers = (state) => state.expedition.members.map((id) => byId(state.people, id)).filter(Boolean);

function setPhase(state, phase) {
  state.expedition.phase = phase;
  state.expedition.phaseAt = state.tick;
  // 換階段時，讓隊員放下手上的事重新分派（打到一半的除外：fightTick 自己會收）。
  for (const p of expMembers(state)) if (p.task?.kind !== 'ration') { release(state, p); p.path = []; p.act = 'idle'; p.wait = 0; }
}

function stepExpedition(state) {
  const x = state.expedition;
  if (!x) return;
  const nest = nestOf(state, x.nest);
  const ppl = expMembers(state);
  const near = (p, spot, r) => Math.hypot(p.x - spot.x, p.y - spot.y) <= r;
  if (x.phase !== 'return') {
    const why = retreatReason(state, ppl, clock(state).hour);
    if (why) {
      x.result = 'retreat';
      state.events.push({ tick: state.tick, kind: 'exp', text: `遠征隊撤退：${why}`, who: [...x.members] });
      state.counts.retreats = (state.counts.retreats || 0) + 1;
      // 巢與守衛回滿血；倒下的守衛補回來。
      nest.hp = nest.hpMax;
      const alive = state.enemies.filter((e) => e.nest === nest.id);
      for (const e of alive) e.hp = e.hpMax;
      const def = NESTS.find((n) => n.id === nest.id);
      nest.guards = alive.map((e) => e.id);
      for (let i = alive.length; i < def.guards.length; i++) spawnGuard(state, nest, def.guards[i], i);
      setPhase(state, 'return');
      return;
    }
  }
  const guards = state.enemies.filter((e) => e.nest === nest.id && e.hp > 0);
  if (x.phase === 'march' && ppl.every((p) => near(p, nest, EXPEDITION.STAGE_R + 2))) setPhase(state, 'fight');
  else if (x.phase === 'fight' && !guards.length) setPhase(state, 'raze');
  else if (x.phase === 'raze' && nest.hp <= 0) {
    nest.cleared = true; x.result = 'cleared';
    state.events.push({ tick: state.tick, kind: 'cleared', text: `${nest.label}被拆了，${ENEMY_LABEL[nest.kind]}不再來了`, who: [...x.members] });
    state.counts.cleared = (state.counts.cleared || 0) + 1;
    state.clearedAt ??= {};
    state.clearedAt[nest.id] = state.tick;
    setPhase(state, 'return');
  } else if (x.phase === 'return') {
    const home = state.pois.find((q) => q.id === 'yard');
    if (ppl.every((p) => near(p, home, 4)) || state.tick - x.phaseAt > EXPEDITION.RETURN_MAX) {
      for (const p of ppl) {
        release(state, p);
        state.stock.meal += p.pack; p.pack = 0;
        p.exp = false; p.path = []; p.act = 'idle'; p.wait = 0;
      }
      state.events.push({ tick: state.tick, kind: 'exp', text: x.result === 'cleared' ? '遠征隊凱旋回山' : '遠征隊回到山上', who: [...x.members] });
      state.expedition = null;
    }
  }
}

const ENEMY_LABEL = { boar: '野豬', bandit: '山賊' };

// 隊員閒下來時由遠征分派下一件事。
function expAssign(state, p) {
  const x = state.expedition;
  const nest = nestOf(state, x.nest);
  const goTo = (spot, label) => {
    const s = nearestWalkable(state.map, spot.x, spot.y);
    const path = s && pathTo(state, p, s);
    p.task = { kind: 'expedition' };
    p.actLabel = label;
    if (path && path.length) { p.path = path; p.act = 'walk'; } else { p.task = null; p.act = 'idle'; p.wait = 5; }
  };
  if (p.needs.food < EXPEDITION.EAT_AT && p.pack > 0 && x.phase !== 'fight') {
    p.task = { kind: 'ration' };
    startDoing(state, p);
    return;
  }
  const i = x.members.indexOf(p.id);
  const side = nest.y > 20 ? -1 : 1;
  if (x.phase === 'march') return goTo({ x: nest.x - 2 + i * 2, y: nest.y + side * 3 }, `遠征：行軍到${nest.label}`);
  if (x.phase === 'return') return goTo(state.pois.find((q) => q.id === 'yard'), '遠征：回山');
  if (x.phase === 'fight') {
    const guards = state.enemies.filter((e) => e.nest === nest.id && e.hp > 0);
    if (!guards.length) { p.wait = 5; return; }
    const e = guards.reduce((a, b) => (Math.hypot(a.x - p.x, a.y - p.y) <= Math.hypot(b.x - p.x, b.y - p.y) ? a : b));
    p.task = { kind: 'fight', enemy: e.id, chase: 120, dealt: 0 };
    p.actLabel = `遠征：迎戰${e.label}`;
    engage(state, p);
    return;
  }
  // 拆巢：走到巢旁，開拆。
  if (Math.hypot(p.x - nest.x, p.y - nest.y) > 1.6) return goTo({ x: nest.x + (i - 1), y: nest.y + side }, `遠征：走到${nest.label}旁`);
  p.task = { kind: 'raze' };
  startDoing(state, p);
  p.actLabel = `拆${nest.label}`;
}

function razeTick(state, p) {
  const nest = nestOf(state, state.expedition?.nest);
  if (!nest || nest.hp <= 0 || state.expedition.phase !== 'raze') { finish(state, p); return; }
  applyPer(p, ACTS.raze.per);
  nest.hp = Math.max(0, nest.hp - EXPEDITION.RAZE * buildRate(p));
}

// 迎敵：站到敵人旁邊才開打；敵人走開就再追。回傳是否已開打。
function engage(state, p) {
  const t = p.task;
  const e = state.enemies.find((x) => x.id === t.enemy);
  if (!e || e.hp <= 0 || e.mode === 'flee') { release(state, p); p.act = 'idle'; p.wait = 0; return true; }
  if (Math.hypot(e.x - p.x, e.y - p.y) > 1.5) {
    const spot = nearestWalkable(state.map, Math.round(e.x), Math.round(e.y));
    const np = spot && pathTo(state, p, spot);
    if (!np || !np.length) return false;
    p.path = np; p.act = 'walk';
    return true;
  }
  startDoing(state, p, ACTS.fight.dur);
  p.actLabel = `迎戰${e.label}`;
  p.bubble = { text: moveLabel(drillMove(p)), until: state.tick + 30 };
  return true;
}

function fightTick(state, p) {
  const t = p.task;
  const e = state.enemies.find((x) => x.id === t.enemy);
  if (!e || e.hp <= 0 || e.mode === 'flee') { state.counts[e && e.hp <= 0 ? 'fightWon' : 'fightLost'] = (state.counts[e && e.hp <= 0 ? 'fightWon' : 'fightLost'] || 0) + 1; finish(state, p); return; }
  if (p.needs.energy < DEFENSE.FIGHT_QUIT) { p.bubble = { text: '撐不住了', until: state.tick + 40 }; state.counts.fightQuit = (state.counts.fightQuit || 0) + 1; finish(state, p); return; }
  if (Math.hypot(e.x - p.x, e.y - p.y) > 1.6) {
    // 敵人跑開了：回到追的狀態。
    p.act = 'walk'; p.actLabel = `追${e.label}`;
    if (!engage(state, p)) p.path = [];
    return;
  }
  const dmg = DEFENSE.FIGHT_DMG * (1 + prowess(p)) * (0.7 + 0.06 * p.attrs.li);
  e.hp -= dmg; t.dealt += dmg;
  if (!e.hitBy.includes(p.id)) e.hitBy.push(p.id);
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
  for (const g of state.plots) if (g.stage === 'growing' && state.tick - g.at >= FARM.GROW) g.stage = 'ripe';
}

export function step(state) {
  state.tick++;
  regrow(state);
  startRaids(state);
  stepRecruit(state);
  stepExpedition(state);
  stepDuty(state);
  for (const p of [...state.people]) if (state.people.includes(p)) stepPerson(state, p);
  for (const p of state.people) tally(p);
  stepEnemies(state);
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
    Object.values(p.needs).map((v) => v.toFixed(3)), p.carry, p.load, p.moves]);
  return hashString(JSON.stringify([state.tick, state.rng, ppl, state.stock, state.ledger, state.bushes.map((b) => b.berries),
    state.map, state.sites.map((x) => [x.id, x.work, x.have, x.incoming]), state.enemies.map((e) => [e.id, e.x.toFixed(4), e.y.toFixed(4), e.hp.toFixed(3), e.mode])]));
}

export { REFUSE_COOLDOWN };
export { setDuty } from './duty.mjs';
