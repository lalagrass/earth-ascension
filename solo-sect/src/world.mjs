// v1.55a 同圖延伸：世界座標、7 環、巢點與山徑、各環族群、獸襲下山（演出）、鏡頭邊界、256px 區塊
// 原則：權威模擬不看鏡頭；這裡只有 popStep 會寫狀態，而且不用亂數。
import { ROUTE, NODES, ENEMIES, RAID_EVERY } from './data.mjs';
export const WORLD = { w: 6400, h: 4800 };
export const HOME = { x: 0, y: 3900, w: 1600, h: 900 }; // 門派地圖放左下角
export const CHUNK = 256;
export const PX = 2.4; // 巡山 1 步＝世界 2.4px
export const toWorld = ([x, y]) => [x + HOME.x, y + HOME.y];
export const DEN = toWorld(NODES.den);
const RING_COL = { foot: '#9cbf78', wood: '#5f8f4a', slope: '#a7a074', gorge: '#7d8a6e', cliff: '#9a8f86', cave: '#6e6872', peak: '#d8d6dc' };
// 每環：以 den 為圓心的弧帶（往右上展開），巢點在弧帶中線上
export const RINGS = ROUTE.map((g, i) => { const r0 = g.from * PX, r1 = g.to * PX, rm = (r0 + r1) / 2, a = -Math.PI / 4 + (i % 2 ? 0.28 : -0.28);
  return { id: g.id, name: g.name, i, r0, r1, col: RING_COL[g.id], nest: [Math.round(DEN[0] + Math.cos(a) * rm), Math.round(DEN[1] + Math.sin(a) * rm)] }; });
export const CLOUD = { r0: RINGS[RINGS.length - 1].r1, col: '#eef2f7' }; // 雲霧入口（v1.55d 拉近進雲海圖）
// 山徑：den → 各環巢點依序往外（v1.55b 再換成正式 polyline 與 dist 對應）
export const TRAIL = [DEN, ...RINGS.map((r) => r.nest)];
const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export function alongPath(path, d) { for (let i = 1; i < path.length; i++) { const L = len(path[i - 1], path[i]); if (d <= L) { const k = L ? d / L : 0; return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * k, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * k]; } d -= L; } return [...path[path.length - 1]]; }
export const pathLen = (path) => path.slice(1).reduce((a, p, i) => a + len(path[i], p), 0);
export function ringAt([x, y]) { if (x >= HOME.x && x < HOME.x + HOME.w && y >= HOME.y) return 'home'; const dx = x - DEN[0], dy = y - DEN[1], r = Math.hypot(dx, dy);
  if (dx < -260 || dy > 120) return 'void'; for (const R of RINGS) if (r < R.r1) return R.id; return 'cloud'; }
// 巡山隊在世界上的位置：沿山徑走 dist 步（往回走用 backPos）
export function partyPos(s) { const X = s.exp; if (!X) return null; const d = X.phase === 'back' ? (X.backPos ?? X.dist) : X.dist; return alongPath(TRAIL, Math.min(d * PX, pathLen(TRAIL))); }
// ---- 各環族群：開局值＝名單權重×3；無亂數定時回補；巡山擊倒扣該環 ----
export const POP = Object.fromEntries(ROUTE.map((g) => { const n = g.roster.reduce((a, [, w]) => a + w, 0) * 3; return [g.id, { start: n, max: Math.ceil(n * 1.5), regen: g.every * 6 }]; }));
export const initPop = () => Object.fromEntries(Object.entries(POP).map(([k, p]) => [k, { n: p.start, t: 0 }]));
export function popStep(s, dt) { const P = (s.pop ??= initPop()); for (const [k, p] of Object.entries(POP)) { const e = (P[k] ??= { n: p.start, t: 0 }); if (e.n < p.max) { e.t += dt; if (e.t >= p.regen) { e.n++; e.t = 0; } } else e.t = 0; } }
export function popKill(s, id, n = 1) { const e = s.pop?.[id]; if (e) e.n = Math.max(0, e.n - n); }
// ---- 獸襲下山（演出）：權威獸襲仍在 raidT 到點時從 den 出現；之前 DESC 秒，畫面上讓牠從所屬環巢點沿山徑走到 den ----
export const DESC = 20;
export function raidDescent(s, mul = 1) { const T = RAID_EVERY * mul; if (s.hunt || !(s.eco?.boar?.n > 0) || s.mons?.some((m) => m.raid) || s.raidT < T - DESC) return null;
  const k = 'boar', ring = ENEMIES[k].ring, i = RINGS.findIndex((r) => r.id === ring), path = [RINGS[i].nest, ...RINGS.slice(0, i).reverse().map((r) => r.nest), DEN];
  const p = Math.min(1, (s.raidT - (T - DESC)) / DESC); return { k, ring, p, pos: alongPath(path, p * pathLen(path)), path }; }
// ---- 鏡頭邊界：門派＋已揭露各環＋一圈 ----
export function revealedRing(s) { let best = -1; const seen = { ...(s.records?.clear || {}), ...(s.exp?.seg || {}) }; ROUTE.forEach((g, i) => { if (seen[g.id] != null) best = i; }); if (s.exp) best = Math.max(best, ROUTE.findIndex((g) => (s.exp.dist ?? 0) < g.to)); return best; }
export function camBounds(s) { const i = Math.min(RINGS.length - 1, revealedRing(s) + 1), R = i >= 0 ? RINGS[i].r1 : 0;
  return { x0: HOME.x, y0: Math.max(0, Math.min(HOME.y, DEN[1] - R)), x1: Math.min(WORLD.w, Math.max(HOME.x + HOME.w, DEN[0] + R)), y1: HOME.y + HOME.h }; }
export function clampCam(c, b, vw = 1600, vh = 900) { const hw = vw / 2 / c.z, hh = vh / 2 / c.z;
  const cl = (v, a, z, h) => (z - a <= 2 * h ? (a + z) / 2 : Math.min(z - h, Math.max(a + h, v)));
  return { ...c, x: cl(c.x, b.x0, b.x1, hw), y: cl(c.y, b.y0, b.y1, hh) }; }
export const HOME_VIEW = { x: HOME.x + 800, y: HOME.y + 450, z: 1 };
// ---- 區塊：座標 → 鍵；視窗內有哪些區塊 ----
export const chunkKey = (cx, cy) => `${cx},${cy}`;
export function chunksInView(c, vw = 1600, vh = 900) { const hw = vw / 2 / c.z, hh = vh / 2 / c.z, out = [];
  for (let cy = Math.max(0, Math.floor((c.y - hh) / CHUNK)); cy <= Math.min(Math.ceil(WORLD.h / CHUNK) - 1, Math.floor((c.y + hh) / CHUNK)); cy++)
    for (let cx = Math.max(0, Math.floor((c.x - hw) / CHUNK)); cx <= Math.min(Math.ceil(WORLD.w / CHUNK) - 1, Math.floor((c.x + hw) / CHUNK)); cx++) out.push([cx, cy]);
  return out; }
// 決定性雜湊（座標→0..1），不碰 s.rng
export const h2 = (x, y, k = 0) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const CELL = 32;
export function cellColor(x, y) { const r = ringAt([x, y]); return r === 'home' ? null : r === 'void' ? '#b9ad8f' : r === 'cloud' ? CLOUD.col : RING_COL[r]; }
// 把一個區塊畫進 2D context（離屏 canvas）；同座標永遠畫一樣
export function paintChunk(g, cx, cy) { const X0 = cx * CHUNK, Y0 = cy * CHUNK;
  for (let y = 0; y < CHUNK; y += CELL) for (let x = 0; x < CHUNK; x += CELL) { const c = cellColor(X0 + x + CELL / 2, Y0 + y + CELL / 2); if (!c) continue; g.fillStyle = c; g.fillRect(x, y, CELL, CELL);
    const n = h2(X0 + x, Y0 + y); if (n < 0.18) { g.fillStyle = '#0002'; g.beginPath(); g.arc(x + CELL * h2(x, y, 1), y + CELL * h2(x, y, 2), 3 + 6 * n, 0, 7); g.fill(); } } }
