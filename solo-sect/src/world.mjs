// v1.55a 同圖延伸：世界座標、7 環、巢點與山徑、各環族群、獸襲下山（演出）、鏡頭邊界、256px 區塊
// 原則：權威模擬不看鏡頭；這裡只有 popStep 會寫狀態，而且不用亂數。
import { ROUTE, NODES, ENEMIES, RAID_EVERY } from './data.mjs';
export const WORLD = { w: 6400, h: 4800 };
export const HOME = { x: 0, y: 3900, w: 1600, h: 900 }; // 門派地圖放左下角
export const CHUNK = 256;
// 決定性雜湊（座標→0..1），不碰 s.rng
export const h2 = (x, y, k = 0) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const PX = 2.4; // 巡山 1 步＝世界 2.4px
export const toWorld = ([x, y]) => [x + HOME.x, y + HOME.y];
export const DEN = toWorld(NODES.den);
// v1.55b 山徑：以 dist 取樣（每 5 步一點），半徑＝dist×PX，所以「第幾環」和巡山段落一一對應；角度用兩個正弦彎來彎去
export const TRAIL_STEP = 5, TRAIL_END = ROUTE[ROUTE.length - 1].to;
const ang = (d) => -Math.PI / 4 + 0.38 * Math.sin(d / 95) + 0.14 * Math.sin(d / 33 + 1);
export const TRAIL = Array.from({ length: TRAIL_END / TRAIL_STEP + 1 }, (_, k) => { const d = k * TRAIL_STEP, r = d * PX; return [DEN[0] + Math.cos(ang(d)) * r, DEN[1] + Math.sin(ang(d)) * r]; });
export function trailAt(d) { d = Math.max(0, Math.min(TRAIL_END, d)); const k = d / TRAIL_STEP, i = Math.min(TRAIL.length - 2, Math.floor(k)), f = k - i, a = TRAIL[i], b = TRAIL[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
const perp = (d, off) => { const a = trailAt(Math.max(0, d - 2)), b = trailAt(d + 2), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, p = trailAt(d); return [p[0] - (b[1] - a[1]) / L * off, p[1] + (b[0] - a[0]) / L * off]; };
const RING_COL = { foot: '#9cbf78', wood: '#5f8f4a', slope: '#a7a074', gorge: '#7d8a6e', cliff: '#9a8f86', cave: '#6e6872', peak: '#d8d6dc' };
// 每環：以 den 為圓心的弧帶（往右上展開），巢點在弧帶中線、山徑旁 70px
export const RINGS = ROUTE.map((g, i) => { const r0 = g.from * PX, r1 = g.to * PX, md = (g.from + g.to) / 2;
  return { id: g.id, name: g.name, i, r0, r1, col: RING_COL[g.id], md, nest: perp(md, i % 2 ? 70 : -70).map(Math.round) }; });
export const CLOUD = { r0: RINGS[RINGS.length - 1].r1, col: '#eef2f7' }; // 雲霧入口（v1.55d 拉近進雲海圖）
// 固定怪點（山腳、林地）：與模擬遭遇點同一串 dist（nextAt 起點＋每段 every），位置在山徑兩側；種類只是畫面（實際對手由模擬抽）
const segOf = (d) => ROUTE.find((g) => d < g.to) || ROUTE[ROUTE.length - 1];
export function encounterDists(from = 0, to = 250) { const out = []; let n = from + segOf(from).every; while (n <= to) { out.push(n); n += segOf(n - 0.01).every; } return out; }
export const SPOTS = encounterDists(0, ROUTE[1].to).map((d, i) => { const g = segOf(d - 0.01), tot = g.roster.reduce((a, [, w]) => a + w, 0); let r = h2(i, 7, 3) * tot, k = g.roster[0][0]; for (const [x, w] of g.roster) { r -= w; if (r < 0) { k = x; break; } }
  return { i, d, ring: g.id, k, pos: perp(d, (i % 2 && g.id !== 'foot' ? 1 : -1) * (34 + 16 * h2(i, 3, 1))) }; })
  .concat(ROUTE.slice(0, 2).map((g, j) => ({ i: 100 + j, d: g.to, ring: g.id, k: g.gate, gate: g.gateName, pos: trailAt(g.to - 3) }))).sort((a, b) => a.d - b.d || !!a.gate - !!b.gate); // 段尾守關擋在路上
const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export function alongPath(path, d) { for (let i = 1; i < path.length; i++) { const L = len(path[i - 1], path[i]); if (d <= L) { const k = L ? d / L : 0; return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * k, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * k]; } d -= L; } return [...path[path.length - 1]]; }
export const pathLen = (path) => path.slice(1).reduce((a, p, i) => a + len(path[i], p), 0);
export function ringAt([x, y]) { if (x >= HOME.x && x < HOME.x + HOME.w && y >= HOME.y) return 'home'; const dx = x - DEN[0], dy = y - DEN[1], r = Math.hypot(dx, dy);
  if (dx < -260 || dy > 120) return 'void'; for (const R of RINGS) if (r < R.r1) return R.id; return 'cloud'; }
// 巡山隊在世界上的位置：沿山徑走 dist 步（往回走用 backPos）
export function partyPos(s) { const X = s.exp; if (!X) return null; const d = X.phase === 'back' ? (X.backPos ?? X.dist) : X.dist; return trailAt(d); }
export const partyDist = (s) => { const X = s.exp; return X ? (X.phase === 'back' ? (X.backPos ?? X.dist) : X.dist) : null; };
// ---- 各環族群：開局值＝名單權重×3；無亂數定時回補；巡山擊倒扣該環 ----
export const POP = Object.fromEntries(ROUTE.map((g) => { const n = g.roster.reduce((a, [, w]) => a + w, 0) * 3; return [g.id, { start: n, max: Math.ceil(n * 1.5), regen: g.every * 6 }]; }));
export const initPop = () => Object.fromEntries(Object.entries(POP).map(([k, p]) => [k, { n: p.start, t: 0 }]));
export function popStep(s, dt) { const P = (s.pop ??= initPop()); for (const [k, p] of Object.entries(POP)) { const e = (P[k] ??= { n: p.start, t: 0 }); if (e.n < p.max) { e.t += dt; if (e.t >= p.regen) { e.n++; e.t = 0; } } else e.t = 0; } }
export function popKill(s, id, n = 1) { const e = s.pop?.[id]; if (e) e.n = Math.max(0, e.n - n); }
// ---- 獸襲下山（演出）：權威獸襲仍在 raidT 到點時從 den 出現；之前 DESC 秒，畫面上讓牠從所屬環巢點沿山徑走到 den ----
export const DESC = 20;
export function raidDescent(s, mul = 1) { const T = RAID_EVERY * mul; if (s.hunt || !(s.eco?.boar?.n > 0) || s.mons?.some((m) => m.raid) || s.raidT < T - DESC) return null;
  const k = 'boar', ring = ENEMIES[k].ring, i = RINGS.findIndex((r) => r.id === ring), path = [RINGS[i].nest, ...TRAIL.slice(0, Math.floor(RINGS[i].md / TRAIL_STEP) + 1).reverse()];
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
const CELL = 32;
export function cellColor(x, y) { const r = ringAt([x, y]); return r === 'home' ? null : r === 'void' ? '#b9ad8f' : r === 'cloud' ? CLOUD.col : RING_COL[r]; }
// 把一個區塊畫進 2D context（離屏 canvas）；同座標永遠畫一樣
// v1.55b：山腳、林地用正式素材（地面紋理＋草叢／松竹）；其餘環仍是色塊（v1.55c）。art＝{ ground, grass, pine, bamboo }（Image），沒給就只畫色塊
const TINT = { foot: 'rgba(150,190,100,.42)', wood: 'rgba(60,110,50,.5)' };
export function paintChunk(g, cx, cy, art) { const X0 = cx * CHUNK, Y0 = cy * CHUNK, deco = [];
  for (let y = 0; y < CHUNK; y += CELL) for (let x = 0; x < CHUNK; x += CELL) { const wx = X0 + x + CELL / 2, wy = Y0 + y + CELL / 2, c = cellColor(wx, wy); if (!c) continue; const r = ringAt([wx, wy]);
    if (art?.ground?.width && TINT[r]) { const gx = ((X0 + x) % 480 + 480) % 480, gy = ((Y0 + y) % 400 + 400) % 400; g.drawImage(art.ground, gx, gy, CELL, CELL, x, y, CELL, CELL); g.fillStyle = TINT[r]; g.fillRect(x, y, CELL, CELL);
      const n = h2(X0 + x, Y0 + y, 5); if (r === 'foot' && n < 0.22) deco.push(['grass', x + CELL * h2(x, y, 1), y + CELL * h2(x, y, 2), 0.45 + 0.3 * n]); else if (r === 'foot' && n > 0.96) deco.push(['rock', x + 16, y + 16, 0]);
      else if (r === 'wood' && n < 0.3) deco.push([n < 0.06 ? 'bamboo' : 'pine', x + CELL * h2(x, y, 1), y + CELL, 0.45 + 0.5 * n]); else if (r === 'wood' && n > 0.85) deco.push(['grass', x + 16, y + 20, 0.4]);
      continue; }
    g.fillStyle = c; g.fillRect(x, y, CELL, CELL);
    const n = h2(X0 + x, Y0 + y); if (n < 0.18) { g.fillStyle = '#0002'; g.beginPath(); g.arc(x + CELL * h2(x, y, 1), y + CELL * h2(x, y, 2), 3 + 6 * n, 0, 7); g.fill(); } }
  deco.sort((a, b) => a[2] - b[2]); for (const [k, x, y, s] of deco) { if (k === 'rock') { g.fillStyle = '#8c8c8c'; g.beginPath(); g.ellipse(x, y, 9, 6, 0, 0, 7); g.fill(); continue; } const im = art[k]; if (!im?.width) continue; const w = im.width * s, h = im.height * s; if (x - w / 2 < 0 || x + w / 2 > CHUNK || y - h < 0) continue; g.drawImage(im, x - w / 2, y - h, w, h); }
  return deco.length; }
