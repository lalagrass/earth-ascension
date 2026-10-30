// 資源與工地：地圖格的變更、可到達區域、藍圖放置／取消／施工／完工。
import { BLUEPRINTS, TREE_WOOD, ROCK_STONE, PILE, SITE_WORKERS } from './data.mjs';
import { walkable } from './map.mjs';

// ---------- 地圖與可到達區域 ----------
const reachCache = new WeakMap();

export function setTile(state, x, y, ch) {
  const row = state.map[y];
  state.map[y] = row.slice(0, x) + ch + row.slice(x + 1);
  state.mapVersion = (state.mapVersion || 0) + 1;
}

export function reachMap(state) {
  const hit = reachCache.get(state);
  if (hit && hit.v === state.mapVersion) return hit.seen;
  const map = state.map, W = map[0].length, H = map.length;
  const seen = new Uint8Array(W * H);
  const q = [[PILE.x, PILE.y]];
  seen[PILE.y * W + PILE.x] = 1;
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
  reachCache.set(state, { v: state.mapVersion, seen });
  return seen;
}

export function reachable(state, x, y) {
  return !!reachMap(state)[y * state.map[0].length + x];
}

// 擋路資源（樹、石）旁邊的可到站位；站位不能是工地格。
export function standSpot(state, x, y) {
  const blocked = siteCellSet(state);
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
    const sx = x + dx, sy = y + dy;
    if (walkable(state.map, sx, sy) && reachable(state, sx, sy) && !blocked.has(`${sx},${sy}`)) return { x: sx, y: sy };
  }
  return null;
}

// ---------- 樹與石 ----------
export const RES_TILE = { wood: 'T', stone: 'R' };
const RES_FULL = { wood: TREE_WOOD, stone: ROCK_STONE };

export function resAmount(state, x, y, mat) {
  return state.res[`${x},${y}`] ?? RES_FULL[mat];
}

// 離 from 最近的 k 個可採資源（未被預約、有站位）。
export function nearestResources(state, mat, from, k = 5) {
  const ch = RES_TILE[mat];
  const found = [];
  for (let y = 0; y < state.map.length; y++) {
    const row = state.map[y];
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== ch || state.resUser[`${x},${y}`]) continue;
      found.push({ x, y, d: Math.hypot(x - from.x, y - from.y) });
    }
  }
  found.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  const out = [];
  for (const r of found) {
    const spot = standSpot(state, r.x, r.y);
    if (spot) out.push({ ...r, spot });
    if (out.length >= k) break;
  }
  return out;
}

// 採下 n 單位；用完則該格變通行地。回傳實際取得量。
export function takeResource(state, x, y, mat, n) {
  const key = `${x},${y}`;
  const left = resAmount(state, x, y, mat);
  const got = Math.min(n, left);
  if (left - got <= 0) {
    delete state.res[key];
    setTile(state, x, y, mat === 'wood' ? ',' : ';');
  } else state.res[key] = left - got;
  return got;
}

// ---------- 工地 ----------
export function blueprint(id) {
  return BLUEPRINTS.find((b) => b.id === id);
}

function hutCells(bp) {
  const [x0, y0, x1, y1] = bp.rect;
  const cells = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const edge = x === x0 || x === x1 || y === y0 || y === y1;
    const door = x === bp.door[0] && y === bp.door[1];
    cells.push({ x, y, to: edge && !door ? '#' : '_' });
  }
  return cells;
}

export function siteCellSet(state) {
  const s = new Set();
  for (const site of state.sites) for (const c of site.cells) if (c.to === '#' || c.to === 'F') s.add(`${c.x},${c.y}`);
  return s;
}

export function placeSite(state, id) {
  const bp = blueprint(id);
  if (!bp) return { ok: false, reason: '沒有這張藍圖' };
  if (state.sites.some((s) => s.bp === id) || state.built.includes(id)) return { ok: false, reason: '已經放過或蓋好了' };
  let cells = [], need, work;
  if (bp.kind === 'fence') {
    cells = bp.cells.map(([x, y]) => ({ x, y, to: 'F' }));
    need = { wood: (bp.costPerCell.wood || 0) * cells.length, stone: (bp.costPerCell.stone || 0) * cells.length };
    work = bp.workPerCell * cells.length;
  } else {
    if (bp.kind === 'hut') cells = hutCells(bp);
    need = { wood: bp.cost.wood || 0, stone: bp.cost.stone || 0 };
    work = bp.work;
  }
  for (const c of cells) {
    const t = state.map[c.y][c.x];
    if (t === '#' || t === 'W' || t === 'F') return { ok: false, reason: '位置被擋住了' };
  }
  const site = {
    id: `s${state.siteSeq++}`, bp: id, label: bp.label, kind: bp.kind, cells, cellsDone: 0,
    need, have: { wood: 0, stone: 0 }, incoming: { wood: 0, stone: 0 },
    work: 0, workTotal: work, workers: [],
  };
  state.sites.push(site);
  return { ok: true, site };
}

export function remaining(site, mat) {
  return site.need[mat] - site.have[mat] - site.incoming[mat];
}

export function stocked(site) {
  return site.have.wood >= site.need.wood && site.have.stone >= site.need.stone;
}

// 施工站位：柵欄站在下一格旁邊；茅屋站在門外；灶台站在灶旁。
export function workSpot(state, site) {
  const blocked = siteCellSet(state);
  const free = (x, y) => walkable(state.map, x, y) && reachable(state, x, y) && !blocked.has(`${x},${y}`);
  let targets;
  if (site.kind === 'fence') {
    const c = site.cells[site.cellsDone];
    targets = [[c.x, c.y - 1], [c.x, c.y + 1], [c.x - 1, c.y - 1], [c.x + 1, c.y - 1]];
  } else if (site.kind === 'hut') {
    const b = blueprint(site.bp);
    targets = [[b.door[0], b.door[1] + 1], [b.door[0] - 1, b.door[1] + 1], [b.door[0] + 1, b.door[1] + 1]];
  } else {
    const h = state.objects.find((o) => o.kind === 'hearth');
    const [hx, hy] = h.slots[0];
    targets = [[hx + 1, hy], [hx - 1, hy], [hx, hy + 1]];
  }
  for (const [x, y] of targets) if (free(x, y)) return { x, y };
  return null;
}

// 格子上有人就不能立起擋路的牆或柵。
export function cellClear(state, c) {
  return ![...state.people, ...(state.enemies ?? [])].some((p) => Math.hypot(p.x - c.x, p.y - c.y) < 1);
}

export function blockCell(state, c) {
  setTile(state, c.x, c.y, c.to);
  // 路線經過這格的人改道。
  for (const p of state.people) {
    if (!p.path.some((n) => n.x === c.x && n.y === c.y)) continue;
    state.reroute.push(p.id);
  }
}

// 加工時；回傳 'done' 表示整個工地完工，'wait' 表示被人擋住暫停。
export function addWork(state, site, amount) {
  if (site.kind === 'fence') {
    const per = site.workTotal / site.cells.length;
    const c = site.cells[site.cellsDone];
    const cap = (site.cellsDone + 1) * per;
    if (site.work + amount >= cap) {
      if (!cellClear(state, c)) { site.work = cap - 0.001; return 'wait'; }
      site.work = cap;
      blockCell(state, c);
      site.cellsDone++;
      if (site.cellsDone >= site.cells.length) { completeSite(state, site); return 'done'; }
      return 'cell';
    }
    site.work += amount;
    return 'work';
  }
  if (site.work + amount < site.workTotal) { site.work += amount; return 'work'; }
  const walls = site.cells.filter((c) => c.to === '#');
  if (!walls.every((c) => cellClear(state, c))) { site.work = site.workTotal - 0.001; return 'wait'; }
  site.work = site.workTotal;
  for (const c of site.cells) {
    if (c.to === '#') blockCell(state, c);
    else setTile(state, c.x, c.y, c.to);
  }
  completeSite(state, site);
  return 'done';
}

function completeSite(state, site) {
  const bp = blueprint(site.bp);
  state.ledger.woodUsed += site.have.wood;
  state.ledger.stoneUsed += site.have.stone;
  site.have = { wood: 0, stone: 0 };
  if (bp.kind === 'hut') {
    for (const [x, y] of bp.beds) {
      state.objects.push({ id: `o${state.objects.length}`, kind: 'bed', label: '茅屋床', slots: [[x, y]], users: [null] });
    }
  }
  if (bp.kind === 'upgrade') state.objects.find((o) => o.kind === bp.target).level = 1;
  state.sites = state.sites.filter((s) => s !== site);
  state.built.push(site.bp);
  state.events.push({ tick: state.tick, kind: 'built', text: `${site.label}完工`, who: [...(site.helpers ?? [])] });
}

// 取消：退回已到材料；搬運者與施工者由呼叫端釋放（sim.cancel 會處理）。
export function removeSite(state, id) {
  const site = state.sites.find((s) => s.id === id);
  if (!site) return null;
  state.stock.wood += site.have.wood;
  state.stock.stone += site.have.stone;
  site.have = { wood: 0, stone: 0 };
  state.sites = state.sites.filter((s) => s !== site);
  return site;
}

export function siteWorkersFree(site) {
  return site.workers.length < SITE_WORKERS;
}
