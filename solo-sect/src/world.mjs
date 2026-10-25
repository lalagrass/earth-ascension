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
export function camBounds(s) { if (s.fog != null) { const b = fogBounds(s); return { x0: b.x0, y0: b.y0, x1: Math.max(b.x1, HOME.x + HOME.w), y1: Math.max(b.y1, HOME.y + HOME.h) }; } const i = Math.min(RINGS.length - 1, revealedRing(s) + 1), R = i >= 0 ? RINGS[i].r1 : 0;
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
// v1.55c：七環都有素材。每環：底色疊色＋點綴規則 [機率門檻, 種類, 大小]
const TINT = { foot: 'rgba(150,190,100,.42)', wood: 'rgba(60,110,50,.5)', slope: 'rgba(170,150,90,.45)', gorge: 'rgba(70,95,80,.55)', cliff: 'rgba(130,125,120,.6)', cave: 'rgba(70,60,80,.62)', peak: 'rgba(235,235,245,.62)' };
const DECO = { foot: [[0.22, 'grass', 0.45], [0.96, 'rock', 0, 1]], wood: [[0.06, 'bamboo', 0.5], [0.3, 'pine', 0.5], [0.85, 'grass', 0.4, 1]],
  slope: [[0.1, 'pine', 0.45], [0.2, 'grass', 0.4], [0.9, 'rock', 0, 1]], gorge: [[0.12, 'bamboo', 0.45], [0.2, 'pine', 0.4], [0.93, 'water', 0, 1]],
  cliff: [[0.05, 'pine', 0.35], [0.7, 'rock', 0, 1]], cave: [[0.08, 'cave', 0], [0.75, 'rock', 0, 1]], peak: [[0.04, 'pine', 0.3], [0.6, 'snow', 0, 1]] };
export function paintChunk(g, cx, cy, art) { const X0 = cx * CHUNK, Y0 = cy * CHUNK, deco = [];
  for (let y = 0; y < CHUNK; y += CELL) for (let x = 0; x < CHUNK; x += CELL) { const wx = X0 + x + CELL / 2, wy = Y0 + y + CELL / 2, c = cellColor(wx, wy); if (!c) continue; const r = ringAt([wx, wy]);
    if (art?.ground?.width && TINT[r]) { const gx = ((X0 + x) % 480 + 480) % 480, gy = ((Y0 + y) % 400 + 400) % 400; g.drawImage(art.ground, gx, gy, CELL, CELL, x, y, CELL, CELL); g.fillStyle = TINT[r]; g.fillRect(x, y, CELL, CELL);
      const n = h2(X0 + x, Y0 + y, 5); for (const [th, k, sz, hi] of DECO[r]) if (hi ? n > th : n < th) { deco.push([k, x + CELL * h2(x, y, 1), y + (k === 'pine' || k === 'bamboo' ? CELL : CELL * h2(x, y, 2)), sz + 0.4 * n]); break; }
      continue; }
    g.fillStyle = c; g.fillRect(x, y, CELL, CELL);
    const n = h2(X0 + x, Y0 + y); if (n < 0.18) { g.fillStyle = '#0002'; g.beginPath(); g.arc(x + CELL * h2(x, y, 1), y + CELL * h2(x, y, 2), 3 + 6 * n, 0, 7); g.fill(); } }
  deco.sort((a, b) => a[2] - b[2]); for (const [k, x, y, s] of deco) { const BLOB = { rock: ['#8c8c8c', 9, 6], water: ['#5f8fb0', 14, 6], snow: ['#fbfbff', 13, 7], cave: ['#1e1a24', 10, 8] }; if (BLOB[k]) { const [c, rx, ry] = BLOB[k]; if (x < rx || x > CHUNK - rx || y < ry || y > CHUNK - ry) continue; g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); continue; } const im = art[k]; if (!im?.width) continue; const w = im.width * s, h = im.height * s; if (x - w / 2 < 0 || x + w / 2 > CHUNK || y - h < 0) continue; g.drawImage(im, x - w / 2, y - h, w, h); }
  return deco.length; }

// ---- v1.55c 迷霧：每區塊 1 bit（25×19＝475 塊 → base64 約 80 字）；視野以隊伍為圓心 VISION px ----
export const FOG_W = Math.ceil(WORLD.w / CHUNK), FOG_H = Math.ceil(WORLD.h / CHUNK), VISION = 420;
const b64 = (u) => (typeof Buffer !== 'undefined' ? Buffer.from(u).toString('base64') : btoa(String.fromCharCode(...u)));
const unb64 = (s) => (typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
const FOGC = new WeakMap(); // 解碼快取，不進存檔
export const fogBytes = (s) => { let c = FOGC.get(s); if (!c || c.str !== s.fog) { c = { str: s.fog, u: s.fog ? unb64(s.fog) : new Uint8Array(Math.ceil(FOG_W * FOG_H / 8)) }; FOGC.set(s, c); } return c.u; };
export const fogSave = (s, u) => { s.fog = b64(u); FOGC.set(s, { str: s.fog, u }); };
export const fogged = (s, cx, cy) => { if (s.fog == null) return false; const i = cy * FOG_W + cx; return !(fogBytes(s)[i >> 3] & (1 << (i & 7))); };
export function revealAt(s, [x, y], R) { const u = fogBytes(s); let ch = false;
  for (let cy = Math.max(0, Math.floor((y - R) / CHUNK)); cy <= Math.min(FOG_H - 1, Math.floor((y + R) / CHUNK)); cy++) for (let cx = Math.max(0, Math.floor((x - R) / CHUNK)); cx <= Math.min(FOG_W - 1, Math.floor((x + R) / CHUNK)); cx++) {
    const nx = Math.max(cx * CHUNK, Math.min(x, cx * CHUNK + CHUNK)), ny = Math.max(cy * CHUNK, Math.min(y, cy * CHUNK + CHUNK)); if (Math.hypot(nx - x, ny - y) > R) continue;
    const i = cy * FOG_W + cx; if (!(u[i >> 3] & (1 << (i & 7)))) { u[i >> 3] |= 1 << (i & 7); ch = true; } }
  return ch; }
export function initFog(s) { s.fog = ''; FOGC.set(s, { str: '', u: new Uint8Array(Math.ceil(FOG_W * FOG_H / 8)) });
  for (let y = HOME.y; y <= HOME.y + HOME.h; y += CHUNK / 2) for (let x = HOME.x; x <= HOME.x + HOME.w; x += CHUNK / 2) revealAt(s, [x, y], 1);
  revealAt(s, DEN, 300); const far = ROUTE.reduce((a, g) => (s.records?.clear?.[g.id] != null ? g.to : a), 0); for (let d = 0; d <= far; d += 10) revealAt(s, trailAt(d), VISION); // 舊檔：依清場紀錄補揭
  fogSave(s, fogBytes(s)); }
// 每拍（模擬層、無亂數）：巡山隊所在處揭霧
export function fogStep(s) { if (s.fog == null) initFog(s); const d = partyDist(s); if (d == null) return; if (revealAt(s, trailAt(d), VISION)) fogSave(s, fogBytes(s)); }
export const fogCount = (s) => { let n = 0; for (const b of fogBytes(s)) for (let k = 0; k < 8; k++) n += (b >> k) & 1; return n; };
export function fogBounds(s) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let cy = 0; cy < FOG_H; cy++) for (let cx = 0; cx < FOG_W; cx++) if (!fogged(s, cx, cy)) { x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy); }
  return { x0: Math.max(0, (x0 - 1) * CHUNK), y0: Math.max(0, (y0 - 1) * CHUNK), x1: Math.min(WORLD.w, (x1 + 2) * CHUNK), y1: Math.min(WORLD.h, (y1 + 2) * CHUNK) }; } // ＋一圈區塊
export const inVision = (s, p) => { const d = partyDist(s); if (d == null) return false; const q = trailAt(d); return Math.hypot(p[0] - q[0], p[1] - q[1]) <= VISION; };
// ---- v1.55c 四種風格走位（畫面）：清場繞去每個怪點；穩推走路中央；疾行抄直線；溜走貼另一側路邊 ----
export const STYLE_PATH = { clear: '繞打每一隻', steady: '只打擋路的', dash: '直線快走', slip: '貼邊閃過' };
const angAt = (d) => { const p = trailAt(Math.max(1, d)); return Math.atan2(p[1] - DEN[1], p[0] - DEN[0]); };
export function styledPos(d, style) { if (style === 'dash') { let a = 0, n = 0; for (let k = -60; k <= 60; k += 10) { a += angAt(d + k); n++; } a /= n; const r = Math.max(0, Math.min(TRAIL_END, d)) * PX; return [DEN[0] + Math.cos(a) * r, DEN[1] + Math.sin(a) * r]; }
  if (style === 'slip') return perp(d, 46 * Math.min(1, d / 15));
  if (style === 'clear') { const sp = SPOTS.filter((x) => !x.gate).reduce((b, x) => (Math.abs(x.d - d) < Math.abs(b.d - d) ? x : b), { d: 1e9 }), k = Math.max(0, 1 - Math.abs(sp.d - d) / 9); const p = trailAt(d); return sp.pos ? [p[0] + (sp.pos[0] - p[0]) * k, p[1] + (sp.pos[1] - p[1]) * k] : p; }
  return trailAt(d); }
export const partyStyledPos = (s) => { const d = partyDist(s); return d == null ? null : styledPos(d, s.exp.style); };
// ---- v1.55c 溜走留下的殘餘怪：回程經過未清段（模擬的「返程驚獸」）時，從該段閃過的怪點追出來 ----
export function leftovers(s, evadedSpots) { const X = s.exp; if (!X) return []; const hits = new Set(X.ret?.hits || []);
  return SPOTS.filter((sp) => evadedSpots.has(sp.i)).map((sp) => ({ ...sp, chasing: hits.has(ROUTE.find((g) => g.id === sp.ring).name) })); }
// ---- v1.55d 雲海：絕頂之上的無盡段不再往外延伸世界，改在一張循環「雲海圖」（1600×900 本地座標）上繞圈，每重繞一圈 ----
import { ENDLESS } from './data.mjs';
export const CLOUD_MAP = { w: 1600, h: 900, cx: 800, cy: 470, rx: 560, ry: 250 };
export function cloudAt(d) { if (d == null || d < TRAIL_END) return null; const u = d - TRAIL_END, k = Math.floor(u / ENDLESS.len) + 1; return { k, f: (u % ENDLESS.len) / ENDLESS.len, d }; }
// 圈上位置：f=0 從左下入口出發，順時針繞一圈回到入口＝下一重；邊緣加一點起伏，每重起伏不同（只看 k，決定性）
export function cloudPos(f, k = 1) { const a = Math.PI * 0.75 + f * Math.PI * 2, w = 1 + 0.08 * Math.sin(a * 3); // 起伏只看角度：一圈頭尾接得上，三重連續跑
  return [CLOUD_MAP.cx + Math.cos(a) * CLOUD_MAP.rx * w, CLOUD_MAP.cy + Math.sin(a) * CLOUD_MAP.ry * w]; }
// 每重的固定點：每 every 步一個遭遇點，段末守關
export const cloudSpots = (k) => [0.25, 0.5, 0.75].map((f, i) => ({ f, i, pos: cloudPos(f, k), gate: false })).concat([{ f: 0.97, i: 3, pos: cloudPos(0.97, k), gate: true }]);
export const partyCloud = (s) => cloudAt(partyDist(s));
// v1.55d 三段縮放（Songs of Syx 式 LOD）：近＝立繪小人；中＝圓點＋名字；遠＝只畫環色塊與族群圖示
export const ZOOMS = { near: 1.6, mid: 1, far: 0.3 };
export const lodOf = (z) => (z >= 1.15 ? 'near' : z >= 0.55 ? 'mid' : 'far');

// v1.6 區塊快取上限：LRU（Map 插入序＝使用序；命中就移到尾端，超量踢最舊）
export const CHUNK_CAP = 64;
export function lruGet(m, k, make, cap = CHUNK_CAP) { let v = m.get(k); if (v !== undefined) { m.delete(k); m.set(k, v); return v; } v = make(); m.set(k, v); while (m.size > cap) m.delete(m.keys().next().value); return v; }
