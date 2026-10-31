import { ROUTE, NODES, ENEMIES, RAID_EVERY, DAY, ENDLESS, CAMPS, INSIGHT, EXP, MOVES, EXP_STYLES as STYLES, STYLE_TRAIT, EVADE, TRAITS, ARTS as ARTS_ALL, HS, DAO } from './data.mjs';
import { log, affKey, resAdd } from './util.mjs';
import { addMem } from './bonds.mjs';
import { shieldHit, moveMul, effectTier, artTier as effectTierOf } from './arts.mjs';
import { mateBonus } from './economy.mjs';
import { addWexin, awaken } from './hero.mjs';
import { aff } from './social.mjs';
import { rivalGate, rivalWon } from './sect.mjs';
// ==== （原 world.mjs）====
// v1.55a 同圖延伸：世界座標、7 環、巢點與山徑、各環族群、獸襲下山（演出）、鏡頭邊界、256px 區塊
// 原則：權威模擬不看鏡頭；這裡只有 popStep 會寫狀態，而且不用亂數。
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
// v1.95 I-7 生態：上限＝基本上限×(巢被搗 ? 0.5 : 1)×(1−擊殺壓力)；回補＝遷入（巢在 1、巢毀 0.3）＋繁殖（n/cap·(1−n/cap)·4·br）每 regen 秒一隻的倍數；超過上限時每 regen 秒少一隻。
// 擊殺壓力：每隻 +kill，每日 ×decay，影響上限最多 killMax。巢：同一趟在該環擊倒 ≥denAt 隻→搗巢，上限減半 denDays 日，之後巢重築（清過不等於永久安全）。全程無亂數。
export const ECO2 = { immig: 1, immigNoDen: 0.5, br: 2, kill: 0.02, killMax: 0.3, decay: 0.85, denAt: 4, denDays: 5, denCut: 0.5 };
export const initPop = () => Object.fromEntries(Object.entries(POP).map(([k, p]) => [k, { n: p.start, t: 0, kp: 0, den: 0 }]));
const DAYS = DAY;
export const denDown = (s, k) => (s.pop?.[k]?.den || 0) > s.t;
export function capOf(s, k) { const e = s.pop?.[k], p = POP[k]; if (!e || !p) return 0; return Math.max(1, p.max * (denDown(s, k) ? ECO2.denCut : 1) * (1 - Math.min(ECO2.killMax, e.kp || 0))); }
export function popStep(s, dt) { const P = (s.pop ??= initPop()); for (const [k, p] of Object.entries(POP)) { const e = (P[k] ??= { n: p.start, t: 0, kp: 0, den: 0 }); e.kp = (e.kp || 0) * ECO2.decay ** (dt / DAYS);
  const cap = capOf(s, k), x = e.n / cap; let r;
  if (e.n > cap) r = -1; else if (e.n >= Math.floor(cap)) r = 0; else r = (denDown(s, k) ? ECO2.immigNoDen : ECO2.immig) + ECO2.br * 4 * x * (1 - x);
  if (!r || (r > 0) !== (e.t >= 0)) e.t = 0; if (!r) continue; e.t += (dt / p.regen) * r; // 方向改變時進度歸零
  while (e.t >= 1) { e.n++; e.t -= 1; } while (e.t <= -1 && e.n > 0) { e.n--; e.t += 1; } e.lo = Math.min(e.lo ?? 1, e.n / p.max); } }
export function popKill(s, id, n = 1) { const e = s.pop?.[id]; if (e) { e.n = Math.max(0, e.n - n); e.kp = (e.kp || 0) + ECO2.kill * n; e.lo = Math.min(e.lo ?? 1, e.n / (POP[id]?.max || 1)); } }
export function denRaze(s, id) { const e = s.pop?.[id]; if (!e || denDown(s, id)) return false; e.den = s.t + ECO2.denDays * DAYS; e.razed = (e.razed || 0) + 1; return true; }
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

// ==== （原 slice.mjs）====
// v0.98 可玩切片：漸進解鎖面板、第一章終點、存檔輪替（純函式，可在 Node 測試）
// 面板解鎖：開局只看到建造／弟子／紀事；前 10 分鐘內（1× 速）一定能派巡山
export const UNLOCKS = [
  { id: 'base', secs: ['build', 'ds'], when: () => true, msg: null },
  { id: 'arts', secs: ['arts'], when: (s) => s.t >= 120 || s.pace?.done.includes('trial'), msg: '武學圖：看看弟子練到哪一層' },
  { id: 'hunt', secs: ['hunt'], when: (s) => s.t >= 240, msg: '後山狩獵：野豬會下山拱菜，帶人去守點' },
  { id: 'exp', secs: ['exp', 'codex'], when: (s) => s.t >= 480 || s.pace?.trial === 'done', msg: '巡山遠征與敵人圖鑑：派 1–4 人上山，看能走多遠' },
  { id: 'social', secs: ['rel', 'recruit'], when: (s) => s.t >= 600 || (s.rep || 0) >= 5, msg: '人際與招收：名聲夠了就能收徒' },
  { id: 'econ', secs: ['ledger', 'labor', 'ranks'], when: (s) => s.t >= 900 || Object.values(s.fac).some((f) => f.site || f.stage > 0), msg: '收支、工寮與內外門：門派開始像個樣子' },
];
export const ALL_SECS = UNLOCKS.flatMap((u) => u.secs);
export function unlockStep(s) {
  s.unlock ??= [];
  for (const u of UNLOCKS) if (!s.unlock.includes(u.id) && u.when(s)) { s.unlock.push(u.id); if (u.msg) { log(s, `【新面板】${u.msg}`); s.newUnlock = u.id; } }
}
export const secOpen = (s, sec) => !s.unlock || UNLOCKS.some((u) => s.unlock.includes(u.id) && u.secs.includes(sec));
// 第一章「立足山門」：三個目標全達成 → 章節完成總結，可繼續玩
export const CHAPTER1 = { name: '第一章・立足山門', goals: [
  { id: 'gate', name: `巡山越過${ROUTE[1].gateName}（${ROUTE[1].to} 步）`, ok: (s) => (s.records?.sect || 0) >= ROUTE[1].to },
  { id: 'build', name: '設施累計升級 2 次', ok: (s) => Object.values(s.fac).reduce((a, f) => a + f.stage, 0) >= 2 },
  { id: 'people', name: '門下弟子 4 人以上', ok: (s) => s.ds.filter((d) => d.role !== 'laborer').length >= 4 },
] };
export function chapterStep(s) {
  if (s.chapter?.done) return;
  s.chapter ??= { done: false };
  if (!CHAPTER1.goals.every((g) => g.ok(s))) return;
  const day = Math.floor(s.t / 600) + 1, ds = s.ds.filter((d) => d.role !== 'laborer');
  s.chapter = { done: true, seen: false, t: Math.round(s.t), day, summary: { day, people: ds.map((d) => d.name), rep: s.rep, best: s.records.sect, exps: s.expN || 0, kills: Object.values(s.codex || {}).reduce((a, c) => a + c.kills, 0), qing: Object.values(s.records.qing || {}).reduce((a, b) => a + b, 0), coin: s.res.coin, food: s.res.food } };
  s.rep = (s.rep || 0) + 5; log(s, `【${CHAPTER1.name}】完成！第 ${day} 日，門下 ${ds.length} 人，巡山最遠 ${s.records.sect} 步。（名聲 +5，可繼續經營）`);
}
// 存檔輪替：autosave 寫入 3 格輪替（store：有 getItem/setItem 的物件）
export const AUTO = { keys: 3, prefix: 'solo-sect-auto-', every: 60 };
/* loop65：自動存檔是否到期。換局或讀檔後遊戲時間可能比上次存檔時間早（t < last），視為到期，避免新局要追上舊局時間才恢復自動存檔 */
export const autoDue = (t, last, every = AUTO.every) => t < last || t - last >= every;
export function autosave(store, str, meta) {
  const idx = ((+store.getItem(AUTO.prefix + 'i') || 0) + 1) % AUTO.keys;
  store.setItem(AUTO.prefix + idx, str); store.setItem(AUTO.prefix + idx + '-meta', JSON.stringify(meta)); store.setItem(AUTO.prefix + 'i', String(idx)); return idx;
}
export function autoList(store) {
  const out = []; for (let i = 0; i < AUTO.keys; i++) { const m = store.getItem(AUTO.prefix + i + '-meta'); if (m) out.push({ i, ...JSON.parse(m) }); }
  return out.sort((a, b) => b.at - a.at);
}
export const autoGet = (store, i) => store.getItem(AUTO.prefix + i);
// v1.5 測試/腳本用：直接開啟巡山解鎖（模擬層 canExpedition 已守解鎖）
export const openExp = (s) => { if (s.unlock && !s.unlock.includes('exp')) s.unlock.push('exp'); return s; };
// ---- v1.7 宿慧入存檔：存檔帶 legacy.suhui；開局取 localStorage、手動檔、自動檔三者最大；讀檔時同步回 localStorage ----
export const LEGACY = { key: 'solo-sect-suhui', save: 'solo-sect-save', max: 3 };
export const suhuiOf = (o) => Math.min(LEGACY.max, Math.max(0, +o?.legacy?.suhui || 0, +o?.gen?.suhui || 0, +o?.gen?.suhuiStart || 0));
const parseSuhui = (str) => { if (!str) return 0; try { return suhuiOf(JSON.parse(str)); } catch { return 0; } };
export function legacyBest(store) {
  let n = +store.getItem(LEGACY.key) || 0; n = Math.max(n, parseSuhui(store.getItem(LEGACY.save)));
  for (const a of autoList(store)) n = Math.max(n, a.suhui != null ? +a.suhui || 0 : parseSuhui(autoGet(store, a.i)));
  return Math.min(LEGACY.max, n);
}
export function syncLegacy(store, s) { const n = Math.max(+store.getItem(LEGACY.key) || 0, suhuiOf(s)); if (n > 0) store.setItem(LEGACY.key, String(Math.min(LEGACY.max, n))); return n; }

// ==== （原 expedition.mjs）====
// v0.95 巡山遠征（ROADMAP §15）：背景模擬＋戰報；地圖只畫進度條。固定名單、決定性、不會死。
// v1.7 相剋：a 剋 b → DAO.up；b 剋 a → DAO.down；其餘 1
export function daoOf(d) { let best = null, bx = -1; for (const [id, r] of Object.entries(d.arts || {})) { const a = ARTS_ALL.find((x) => x.id === id); const tag = a?.tags?.find((g) => DAO.tagOf[g]); if (!tag || a.effect) continue; const x = r?.xp || 0; if (x > bx) { bx = x; best = DAO.tagOf[tag]; } } return best || '歸真'; }
export function counterMul(a, b) { const R = DAO.ring, i = R.indexOf(a), j = R.indexOf(b); if (i < 0 || j < 0) return 1; if ((i + 1) % R.length === j) return DAO.up; if ((j + 1) % R.length === i) return DAO.down; return 1; }
export const ROUTE_END = ROUTE[ROUTE.length - 1].to;
// v1.0 路段：前七段固定，之後無盡（每 200 步一段、段末固定守關、每段 ×1.25）
export function routeSeg(i) {
  if (i < ROUTE.length) return ROUTE[i];
  const k = i - ROUTE.length + 1, L = ROUTE[ROUTE.length - 1], from = L.to + (k - 1) * ENDLESS.len;
  return { id: 'end' + k, name: `絕頂之上・第${k}重`, from, to: from + ENDLESS.len, every: 50, roster: ENDLESS.roster, find: ENDLESS.find, scale: (L.scale || 1) * ENDLESS.mul ** k, gate: ENDLESS.gate, gateName: `第${k}重無名高手`, endless: true };
}
export const segIndex = (x) => { let i = 0; while (x >= routeSeg(i).to && i < 500) i++; return i; };
export const segAt = (x) => routeSeg(segIndex(x));
export const peaceOf = (s, id) => (s.records?.qing?.[id] || 0) >= EXP.peaceQing;
export const raidMul = (s) => (peaceOf(s, 'foot') || peaceOf(s, 'wood') ? EXP.peaceRaid : 1);
export const campsOpen = (s) => CAMPS.filter((c) => s.camps?.[c.id]);
export const scoutOf = (team) => { const b = team.reduce((m, d) => (evadeScore(d) > (m ? evadeScore(m) : -1) ? d : m), null); return b && evadeScore(b) >= EXP.scoutAt ? b : null; };
// ---- 圖鑑 ----
export function seeEnemy(s, k, how, d) {
  const c = (s.codex[k] ??= { seen: 0, kills: 0, fled: 0, insight: 0 });
  if (how === 'see') c.seen++; if (how === 'kill') c.kills++; if (how === 'fled') c.fled++;
  const v = INSIGHT[how] || 0; c.insight += v; if (d) { d.insight ??= {}; d.insight[k] = (d.insight[k] || 0) + v; }
}
export const insightTier = (v) => { let t = null; for (const x of INSIGHT.tiers) if (v >= x[0]) t = x[1]; return t; };
export function codexRows(s) {
  return Object.entries(ENEMIES).map(([k, e]) => { const c = s.codex[k]; return c ? { k, name: e.name, kind: e.kind, weapon: insightTier(c.insight) ? e.weapon : '？', hp: c.insight >= 30 ? e.hp : '？', seen: c.seen, kills: c.kills, fled: c.fled, insight: c.insight, tier: insightTier(c.insight) || '初見' } : { k, name: '？？？', unknown: true }; });
}
// 出手力：最強招式每秒傷害（同狩獵的公式）
export function dpsOf(s, d) {
  let best = 0; for (const id of d.moves) { const mv = MOVES.find((m) => m.id === id); if (!mv) continue; const p = mv.dmg * (1 + d.skills[mv.skill] / 50) * moveMul(d, mv.id, s.t) * (mv.aoe ? 1.3 : 1) / mv.cd; if (p > best) best = p; }
  return best;
}
// v1.5 召回（A2）：隊伍從目前距離往回走，戰利品照拿；返程仍走 returnPlan（含驚獸）
export function recallExpedition(s) { const X = s.exp; if (!X || X.phase === 'back' || X.phase === 'done') return false; X.reason = '掌門傳令召回'; X.recalled = true; return true; }
export function canExpedition(s, ids) {
  if (s.exp) return { ok: false, why: '已有隊伍在外' };
  if (!secOpen(s, 'exp')) return { ok: false, why: '巡山還沒解鎖（第一天黃昏試煉後或第三天）' }; // v1.5：模擬層也守解鎖，章節不再第一天就記
  if (!ids.length || ids.length > EXP.maxTeam) return { ok: false, why: `派 1–${EXP.maxTeam} 人` };
  for (const id of ids) { const d = s.ds.find((x) => x.id === id); if (!d) return { ok: false, why: '查無此人' }; if (d.role === 'laborer') return { ok: false, why: `${d.name}是雇工` }; if (d.hp < EXP.minHp) return { ok: false, why: `${d.name}傷還沒好` }; if (s.hunt?.team.includes(id)) return { ok: false, why: `${d.name}正在狩獵` }; if ((d.restUntil || 0) > s.t) return { ok: false, why: `${d.name}剛巡山回來，還要歇 ${Math.ceil(d.restUntil - s.t)} 秒` }; }
  return { ok: true };
}
// ---- v0.97 巡山風格：從性格／價值觀／武學推出，附說明 ----
export function styleOf(d) {
  let sc = 0; const why = [];
  for (const p of d.personality || []) { const v = STYLE_TRAIT[p]; if (v) { sc += v; why.push(`${TRAITS[p]?.name || p}${v > 0 ? '+' : ''}${v}`); } }
  const V = d.values || {}; const vv = [['wu', '武道', 1], ['sect', '門派', 1], ['free', '自在', -2], ['fame', '名望', -1]];
  for (const [k, n, w] of vv) if ((V[k] || 0) >= 20) { sc += w; why.push(`重${n}${w > 0 ? '+' : ''}${w}`); }
  const st = effectTier(d, 'speed') + 1; if (st > 0) { sc -= 0.5 * st; why.push(`輕功${st}階−${0.5 * st}`); }
  const id = sc >= 3 ? 'clear' : sc >= 1 ? 'steady' : sc >= -1 ? 'dash' : 'slip';
  return { id, score: sc, why: why.join('、') || '無明顯傾向' };
}
const ORDER = ['clear', 'steady', 'dash', 'slip'];
export function teamStyle(team) {
  const n = {}; for (const d of team) { const k = styleOf(d).id; n[k] = (n[k] || 0) + 1; }
  const best = ORDER.reduce((b, k) => ((n[k] || 0) > (n[b] || 0) ? k : b), ORDER.find((k) => n[k]));
  return best;
}
// ---- v1.9 A9 因才派巡（ONI 優先度）：依「需要」＋「專長」排序，第二人起偏好跟隊上／上一趟不同的風格 ----
// 專長＝出手（dpsOf，佔 80 分）；需要＝多久沒巡山（每日 +5，上限 20）＋心情低想出門透氣（最多 10）；
// 第二人起：搭檔默契（上一趟同隊 +25、好感 /100×20）＋換個走法 +6。v1.9 長跑：沒有默契項時岳不群 30 日到頂 1/5（隊友輪來輪去），加了才回 ≥4/5
export const A9 = { minHp: 70, dps: 80, perDay: 5, idleCap: 20, mood: 10, diverse: 6, keep: 25, bond: 20 };
export function suggestTeam(s, n = 2) {
  const ok = s.ds.filter((d) => d.role !== 'laborer' && d.adult !== false && !d.away && d.hp > A9.minHp && !((d.restUntil || 0) > s.t) && !s.hunt?.team.includes(d.id));
  if (!ok.length) return { ids: [], why: [] }; const top = Math.max(...ok.map((d) => dpsOf(s, d))) || 1, last = s.lastExp?.style;
  const base = (d) => { const idle = Math.min(A9.idleCap, ((s.t - (d.lastExp ?? -DAY * 9)) / DAY) * A9.perDay), m = Math.max(0, (60 - d.mood) / 60) * A9.mood; return { sp: (dpsOf(s, d) / top) * A9.dps, idle, m }; };
  const pick = [], why = [], lastTeam = s.lastExp?.ids || [];
  while (pick.length < Math.min(n, ok.length)) {
    const used = new Set(pick.map((d) => styleOf(d).id)); if (last && pick.length) used.add(last);
    let best = null, bv = -1e9, bw = '';
    for (const d of ok) { if (pick.includes(d)) continue; const b = base(d), dv = pick.length && !used.has(styleOf(d).id) ? A9.diverse : 0, kp = pick.length && lastTeam.includes(d.id) && lastTeam.includes(pick[0].id) ? A9.keep : 0, bd = pick.length ? Math.max(0, aff(s, pick[0], d)) / 100 * A9.bond : 0, mt = pick.length ? mateBonus(s, pick[0], d) : 0, v = b.sp + b.idle + b.m + dv + kp + bd + mt;
      if (v > bv) { bv = v; best = d; bw = `${d.name}：專長 ${Math.round(b.sp)}・久未巡山 ${Math.round(b.idle)}${b.m >= 1 ? `・想出門 ${Math.round(b.m)}` : ''}${kp ? `・老搭檔 +${kp}` : ''}${bd >= 1 ? `・默契 ${Math.round(bd)}` : ''}${mt ? `・練功搭子 +${mt}` : ''}${dv ? `・換個走法（${STYLES[styleOf(d).id].name}）+${dv}` : ''}`; } }
    pick.push(best); why.push(bw);
  }
  return { ids: pick.map((d) => d.id), why };
}
export const evadeScore = (d) => d.skills.agility + Math.max(0, effectTier(d, 'speed') + 1) * EVADE.tierPts + ((d.personality || []).includes('lazy') ? EVADE.lazyBonus : 0);
const pclamp = (x) => Math.max(0.05, Math.min(0.95, x));
// H：sim 內部工具 { rand, cancelTask, grow, think }
export function startExpedition(s, ids, opt = {}, H) {
  const c = canExpedition(s, ids); if (!c.ok) return c;
  const thr = EXP.thr.includes(opt.thr) ? opt.thr : EXP.thrDefault, target = opt.target === 'inf' ? 1e9 : Math.max(50, opt.target || ROUTE_END);
  const camp = opt.from ? CAMPS.find((c) => c.id === opt.from && s.camps?.[c.id]) : null; if (opt.from && !camp) return { ok: false, why: '營地還沒設' };
  const carry = camp ? EXP.campCarry * ids.length : 0; if (s.res.food < carry) return { ok: false, why: `從營地出發要帶 ${carry} 份糧上山` }; resAdd(s, 'food', -carry);
  const want = opt.supplies == null ? ids.length * EXP.supplyPer : Math.max(0, Math.min(opt.supplies, ids.length * EXP.supplyMax));
  const supplies = Math.min(Math.floor(s.res.food), want); resAdd(s, 'food', -supplies);
  for (const id of ids) { const d = s.ds.find((x) => x.id === id); H.cancelTask(s, d, '出發巡山'); d.order = null; d.away = true; d.path = []; d.reason = '巡山中'; }
  s.expN = (s.expN || 0) + 1;
  const tm = ids.map((id) => s.ds.find((x) => x.id === id)), order = STYLES[opt.order] ? opt.order : null, style = order || teamStyle(tm);
  for (const d of tm) d.lastExp = s.t; // v1.9 A9：記上次巡山時刻（因才派巡的「需要」）
  if (order) for (const d of tm) if (styleOf(d).id !== order) { if (d.values) addWexin(s, d, '巡山令'); else H.think(s, d, 'forcedStyle'); d.mood = Math.max(0, d.mood + EXP.orderMood); }
  const patMax = Math.round(tm.reduce((a, d) => a + d.mood, 0) / tm.length * (order ? EXP.orderPatCap : 1)), sc = scoutOf(tm), from = camp ? ROUTE[camp.seg].to : 0;
  s.exp = { events: [], n: s.expN, team: [...ids], thr, target, supplies, dist: from, from, camp: camp?.name || null, phase: 'out', busy: 0, nextAt: from + routeSeg(camp ? camp.seg + 1 : 0).every, order, sta: EXP.sta, pat: patMax, patMax, scout: sc?.name || null, camps: [], kills: {}, escaped: {}, loot: {}, hurt: {}, reason: null, startT: s.t, fights: 0,
    style, styleWhy: tm.map((d) => { const o = styleOf(d); return `${d.name}${STYLES[o.id].name}（${o.why}）`; }), seg: {}, evaded: {}, chase: { n: 0, got: 0 }, gateI: camp ? camp.seg + 1 : 0, gates: [], gorgeT: null };
  log(s, `巡山隊出發：${ids.map((id) => s.ds.find((x) => x.id === id).name).join('、')}（${order ? '巡山令・' : ''}${STYLES[style].name}${camp ? `；自${camp.name}出發` : ''}${sc ? `；${sc.name}探路` : ''}；撤退線：氣血 ${thr * 100}%，乾糧 ${supplies}）`);
  return { ok: true };
}
const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
function lootRoll(s, o, table, H) { for (const [k, v] of Object.entries(table)) { if (v >= 1) add(o, k, v); else if (H.rand(s) < v) add(o, k, 1); } }
// 一場遭遇戰（批次，0.5 秒一步）；回傳耗時秒數
function fight(s, e, team, H, gate = false, scale = 1) {
  const E0 = ENEMIES[e], P = ROUTE[ROUTE.length - 1].scale || 1, ds = scale > P ? P * (scale / P) ** ENDLESS.dmgExp : scale, E = { ...E0, hp: E0.hp * scale, dmg: E0.dmg * ds }; let hp = E.hp, t = 0, cd = E.cd, fled = false; const X = s.exp;
  for (const d of team) seeEnemy(s, e, 'fight', d); seeEnemy(s, e, 'see');
  const bonus = (s.codex[e]?.insight || 0) >= INSIGHT.dmgAt ? 1 + INSIGHT.dmg : 1;
  while (hp > 0 && t < 90) {
    const alive = team.filter((d) => d.hp > 0); if (!alive.length) break;
    t += 0.5; const fs = X.scout && t <= EXP.scoutT ? 1 + EXP.scoutBonus : 1; for (const d of alive) { hp -= dpsOf(s, d) * 0.5 * bonus * fs * counterMul(daoOf(d), DAO.enemy[e]); if (d.dugu?.length) d.hp = Math.min(100, d.hp + HS.duguHeal); } // v1.2 九劍只攻不守：不格擋，但料敵機先回氣血 // v1.0 探路者先手 +20%
    if (gate && hp > E.hp * 0.4 && alive.some((d) => d.hp < 100 * EXP.gateBail)) { X.events.push(`見勢不妙，在${E.name}前及早撤退`); return { t, won: false, fled: false, bail: true }; } // v0.98 守關敵打不過：及早撤退
    if (!gate && hp > 0 && hp < E.hp * 0.35 && !fled) { fled = true; if (H.rand(s) < E.flee) { add(X.escaped, e, 1); seeEnemy(s, e, 'fled'); return { t, won: false, fled: true }; } }
    cd -= 0.5; if (cd <= 0 && hp > 0) { cd = E.cd; const d = alive[Math.floor(H.rand(s) * alive.length)]; if (d.dugu?.length && H.rand(s) < Math.min(0.6, 0.2 + (s.codex[e]?.insight || 0) / 200)) { d.hp = Math.min(100, d.hp + 2); continue; } const def = d.dugu?.length ? 1 : (1 - Math.min(0.4, (d.skills.agility + d.skills.strength) / 400)) * guardOf(d); d.hp = Math.max(0, d.hp - shieldHit(d, E.dmg * def * (d.takeMul || 1) * counterMul(DAO.enemy[e], daoOf(d)), s.t + t)); /* loop116 護體真氣 */ if (d.reflect) hp -= E.dmg * def * d.reflect; }
  }
  if (hp <= 0) { const alive = team.filter((d) => d.hp > 0); const k = alive[Math.floor(H.rand(s) * alive.length)]; add(X.kills, e, 1); seeEnemy(s, e, 'kill', k); lootRoll(s, X.loot, E.loot, H); for (const d of alive) H.grow(s, d, 'style', 3, 'fight'); }
  return { t, won: hp <= 0, fled: false };
}
// v1.1 招牌武學練到圓滿：護體（受傷 ×0.6）
export const guardOf = (d) => (ARTS_ALL.some((a) => a.classic && !a.layered && !a.forms && d.arts?.[a.id] && effectTierOf(d, a.id) >= EXP.classicTier) || (d.zixia || 0) >= 7 ? EXP.classicGuard : 1) * (1 - HS.zxGuard * (d.zixia || 0));
// v1.2 二度氣：無盡段每過一重，有招牌武學在身的人回一口真氣（體力回補，依比例）
export const secondWind = (team) => team.filter((d) => guardOf(d) < 0.95 || d.dugu?.length).length / Math.max(1, team.length);
// 遭遇：可繞就閃（隊伍取最差身法）；逃兵依風格追擊；記入該段清場率
function encounter(s, e, seg, team, H) {
  // v1.95：試過「環被打到 0 就沒有遭遇」，郭靖 30 日 1600 掉到 0–1/5（深谷小環常被清空，少了熊／寨主的歷練），故不採；族群只回饋上限與地圖
  const X = s.exp;  const sca = seg.scale || 1, E = { ...ENEMIES[e], hp: ENEMIES[e].hp * sca }, S = STYLES[X.style], sg = (X.seg[seg.id] ??= { enc: 0, kill: 0 }); sg.enc++; X.encN = (X.encN || 0) + 1;
  const dps = team.reduce((a, d) => a + dpsOf(s, d), 0), weak = dps * 20 < E.hp;
  if (S.evade === 'always' || (S.evade === 'weak' && weak)) {
    const ev = Math.min(...team.map(evadeScore)); seeEnemy(s, e, 'see');
    if (H.rand(s) < pclamp(0.5 + (ev - E.detect) / 100)) { add(X.evaded, e, 1); return 1; }
    X.events.push(`閃${E.name}失手`);
  }
  X.fights++; const r = fight(s, e, team, H, false, sca); let t = r.t; if (r.won) { sg.kill++; popKill(s, seg.id); }
  if (r.fled) { const stub = team.some((d) => (d.personality || []).includes('stubborn'));
    if (S.chase >= 1 || (S.chase > 0 && stub && H.rand(s) < S.chase)) {
      const ag = Math.max(...team.map((d) => d.skills.agility)); for (let k = 0; k < (S.chase >= 1 ? 2 : 1); k++) { X.chase.n++; t += EVADE.chaseTime;
        if (H.rand(s) < pclamp(0.5 + (ag - E.speed) / 100)) { X.chase.got++; X.escaped[e]--; if (!X.escaped[e]) delete X.escaped[e]; add(X.kills, e, 1); sg.kill++; popKill(s, seg.id); seeEnemy(s, e, 'kill', team[0]); lootRoll(s, X.loot, E.loot, H); break; } } } }
  if (sg.kill >= ECO2.denAt && denRaze(s, seg.id)) { (X.razed ??= []).push(seg.name); X.events.push(`搗毀${seg.name}獸巢`); log(s, `巡山隊搗毀了${seg.name}的獸巢：該區族群上限減半五日`); }
  return t;
}

function pickEnemy(s, seg, H) { const tot = seg.roster.reduce((a, [, w]) => a + w, 0); let r = H.rand(s) * tot; for (const [k, w] of seg.roster) { r -= w; if (r < 0) return k; } return seg.roster[0][0]; }
function checkRetreat(s, team) {
  const X = s.exp;
  for (const d of team) if (d.hp <= 0) { if (awaken(s, d)) { d.hp = 60; X.events.push(`${d.name}瀕死覺醒`); continue; } d.hp = 10; return `${d.name}重傷倒地，眾人抬回`; }
  for (const d of team) if (d.hp < X.thr * 100) { if (X.supplies > 0) { X.supplies--; d.hp = Math.min(100, d.hp + EXP.supplyHeal); } if (d.hp < X.thr * 100) return `${d.name}氣血低於 ${X.thr * 100}%`; }
  for (const d of team) if (d.mood < EXP.moodMin) return `${d.name}心情低落`;
  if (X.sta != null && X.sta <= 0) return '體力耗盡'; if (X.pat != null && X.pat <= 0) return '耐性磨光，不想再走了';
  if (X.dist >= X.target) return X.target === ROUTE_END ? `走完${ROUTE[ROUTE.length - 1].name}` : '到達目標距離';
  return null;
}
export function expStep(s, dt, H) {
  const X = s.exp; if (!X) return; const team = X.team.map((id) => s.ds.find((d) => d.id === id)).filter(Boolean);
  if (X.busy > 0) { X.busy -= dt; return; }
  if (X.phase === 'out') {
    const d0 = X.dist, f0 = X.fights, pm = peaceOf(s, segAt(X.dist).id) ? EXP.peaceSpeed : 1;
    X.dist = Math.min(X.target, X.dist + EXP.walk * dt * pm);
    X.dist = Math.min(X.target, X.dist + EXP.walk * dt * pm * (STYLES[X.style].speed - 1));
    X.sta = (X.sta ?? EXP.sta + Math.max(0, ...team.map((d) => d.staBonus || 0))) - (X.dist - d0) * EXP.staStep;
    if (X.gorgeT == null && !(X.from > 0) && X.dist >= ROUTE[3].from) X.gorgeT = s.t - X.startT;
    const G = rivalGate(s, routeSeg(X.gateI), X.gateI);
    if (G && X.dist >= G.to) { X.dist = G.to; X.gateI++; const r = fight(s, G.gate, team, H, true, G.scale || 1); X.encN = (X.encN || 0) + 1; X.busy = r.t / 2; X.fights++; const sg = (X.seg[G.id] ??= { enc: 0, kill: 0 }); sg.enc++;
      if (r.won) { sg.kill++; X.gates.push(G.gateName); rivalWon(s, G); const cp = CAMPS.find((c) => c.seg === X.gateI - 1); if (cp) campAt(s, X, cp, team); else if (G.endless || G.id === 'peak') { const w = secondWind(team); if (w > 0) { X.sta = Math.min(EXP.sta, X.sta + EXP.sta * HS.secondWind * w); X.pat = Math.min(X.patMax, X.pat + 10 * w); for (const d of team) if (d.hp > 0 && (guardOf(d) < 0.95 || d.dugu?.length)) d.hp = Math.min(100, d.hp + 100 * HS.windHp); X.events.push(`過了${G.gateName}，眾人回了一口真氣（體力 +${Math.round(HS.secondWind * w * 100)}%）`); } } } else if (r.bail) { X.reason = `被${G.gateName}擋在${G.name}（見勢不妙及早撤退）`; X.blocked = G.gateName; } else if (team.some((d) => d.hp <= 0 && awaken(s, d))) { for (const d of team) d.hp = Math.max(d.hp, 60); X.gateI--; X.events.push(`${team.find((d) => d.awakened)?.name || ''}瀕死覺醒`); } else { for (const d of team) if (d.hp <= 0) d.hp = 10; X.reason = `被${G.gateName}擋在${G.name}`; X.blocked = G.gateName; } }
    else if (X.dist >= X.nextAt) { const seg = segAt(X.nextAt - 0.01); X.nextAt += seg.every; X.busy = encounter(s, pickEnemy(s, seg, H), seg, team, H) / 2; lootRoll(s, X.loot, seg.find, H); }
    if (X.fights > f0) { const lazy = team.filter((d) => (d.personality || []).includes('lazy')).length; X.sta -= (X.fights - f0) * EXP.staFight; X.pat -= (X.fights - f0) * (EXP.patFight + lazy * EXP.patLazy); }
    const why = X.reason || checkRetreat(s, team); if (why) { X.reason = why; X.phase = 'back'; X.backLeft = X.dist / EXP.back; X.backPos = X.dist; X.ret = returnPlan(s, X); log(s, `巡山隊在${segAt(X.dist).name}（${X.dist.toFixed(0)} 步）回頭：${why}`); }
    return;
  }
  X.backLeft -= dt; X.backPos = Math.max(0, (X.backPos ?? X.dist) - EXP.back * dt); returnStep(s, X);
  if (X.backLeft <= 0) finishExpedition(s, team, H);
}
// ---- v1.45 返程驚獸（ADOPTION-PLAN A1，擁有人已核准數值）----
// 未清段＝這趟去程在該段有遭遇但沒全清（閃過、敵逃、守關沒過），且該段尚未平靖。身上沒戰利品就不會引獸。固定值、無亂數。
export const hasLoot = (X) => Object.values(X.loot || {}).some((v) => v > 0);
export function unclearedSegs(s, X) {
  const out = []; const top = segIndex(Math.max(0, X.dist - 0.01));
  for (let i = 0; i <= top; i++) { const g = routeSeg(i), v = X.seg?.[g.id]; if (v && v.enc > v.kill && !peaceOf(s, g.id)) out.push({ id: g.id, name: g.name, from: g.from, to: Math.min(g.to, X.dist) }); }
  return out.reverse(); // 回程先經過深處
}
export function returnPlan(s, X) { return { left: hasLoot(X) ? unclearedSegs(s, X) : [], hits: [], staLost: 0, lost: null }; }
export function returnStep(s, X) {
  const R = X.ret; if (!R) return;
  while (R.left.length && X.backPos <= R.left[0].to) {
    const g = R.left.shift(); X.sta = (X.sta ?? EXP.sta) - EXP.retSta; R.staLost += EXP.retSta; R.hits.push(g.name);
    X.events.push(`返程經過${g.name}，靈物散香驚動山獸，一路奔逃（耐力 −${EXP.retSta}）`);
    if (X.sta <= 0 && !R.lost) { R.lost = {}; for (const [k, v] of Object.entries(X.loot)) { const l = Math.floor(v * EXP.retLoss); if (l > 0) { X.loot[k] = v - l; R.lost[k] = l; } }
      X.events.push(`耐力見底，在${g.name}丟下一半戰利品`); log(s, `巡山隊返程在${g.name}被獸群追趕，耐力見底，丟下一半戰利品`); }
  }
}
// v1.45 巡山里程軸：每段 ✔ 已清／⚠ 未清（返程會引獸）／▶ 進行中／· 未到
export function milestones(s) {
  const X = s.exp; if (!X) return [];
  const top = segIndex(Math.max(0, X.dist - 0.01)), n = Math.max(ROUTE.length, top + 1), out = [];
  for (let i = 0; i < n; i++) { const g = routeSeg(i), v = X.seg?.[g.id];
    const st = i > top ? 'todo' : i === top && X.phase === 'out' ? 'now' : !v || v.enc === v.kill || peaceOf(s, g.id) ? 'clear' : 'open';
    out.push({ id: g.id, name: g.name, st, hit: !!X.ret?.hits.includes(g.name) }); }
  return out;
}
function campAt(s, X, cp, team) {
  s.camps ??= {}; if (!s.camps[cp.id]) { s.camps[cp.id] = true; log(s, `【營地】巡山隊在${ROUTE[cp.seg].name}盡頭設下${cp.name}，以後可從這裡出發`); }
  X.supplies = Math.max(X.supplies, team.length * EXP.supplyPer); X.sta = EXP.sta; X.pat = Math.min(X.patMax, X.pat + 20); X.camps.push(cp.name); X.events.push(`在${cp.name}歇腳補給`);
}
function finishExpedition(s, team, H) {
  const X = s.exp, dist = Math.round(X.dist);
  for (const [k, v] of Object.entries(X.loot)) resAdd(s, k, v);
  const hurt = []; for (const d of team) { d.away = false; d.task = null; d.path = []; d.at = 'gate'; d.pos = [...(H.gate || d.pos)]; d.reason = '巡山歸來';
    if (d.hp <= EXP.hurtHeavy) { hurt.push([d.name, '重傷']); H.think(s, d, 'expHurt'); } else if (d.hp <= EXP.hurtLight) hurt.push([d.name, '輕傷']); }
  const rec = []; for (const d of team) if (dist > (d.best || 0)) { if (d.best) { H.think(s, d, 'recordSelf'); rec.push(d.name); } d.best = dist; }
  let sectRec = false; if (dist > (s.records.sect || 0)) { sectRec = true; Object.assign(s.records, { sect: dist, who: team.map((d) => d.name), n: X.n, t: s.t }); for (const d of s.ds) if (d.role !== 'laborer') H.think(s, d, 'recordSect'); }
  const R = s.records, clear = {}, qing = []; R.clear ??= {}; R.qing ??= {};
  for (const g of [...ROUTE, ...Array.from({ length: Math.max(0, segIndex(X.dist) - ROUTE.length + 1) }, (_, k) => routeSeg(ROUTE.length + k))]) { const v = X.seg[g.id]; if (!v || !v.enc) continue; const c = v.kill / v.enc; clear[g.id] = c; if (c > (R.clear[g.id] || 0)) R.clear[g.id] = c; if (c >= 1) { qing.push(g.name); R.qing[g.id] = (R.qing[g.id] || 0) + 1; } }
  let fast = X.style === 'dash'; if (X.gorgeT != null && (R.fastGorge == null || X.gorgeT < R.fastGorge)) { R.fastGorge = Math.round(X.gorgeT); fast = true; }
  const cool = EXP.cool * (fast ? EXP.coolFast : 1); for (const d of team) d.restUntil = s.t + cool;
  const st = team.filter((d) => (d.personality || []).includes('stubborn')), lz = team.filter((d) => (d.personality || []).includes('lazy')), qu = [];
  for (const a of st) for (const b of lz) if (a !== b) { for (const [p, q] of [[a, b], [b, a]]) s.aff[affKey(p.id, q.id)] = (s.aff[affKey(p.id, q.id)] || 0) - EXP.quarrel; H.think(s, a, 'quarrel'); H.think(s, b, 'quarrel'); qu.push(`${a.name}嫌${b.name}偷懶，吵了一架`); }
  const rep0 = { ret: X.ret ? { hits: X.ret.hits, staLost: X.ret.staLost, lost: X.ret.lost } : null, style: X.style, styleWhy: X.styleWhy, evaded: X.evaded, chase: X.chase, clear, qing, gates: X.gates, blocked: X.blocked || null, time: Math.round(s.t - X.startT), order: X.order, sta: Math.max(0, Math.round(X.sta ?? 0)), pat: Math.max(0, Math.round(X.pat ?? 0)), patMax: X.patMax, scout: X.scout, camps: X.camps || [], from: X.camp, quarrel: qu, cool: Math.round(cool), fast };
  rep0.story = storyOf(team, rep0, X);
  const rep = { ...rep0, n: X.n, team: team.map((d) => d.name), ids: team.map((d) => d.id), dist, seg: segAt(Math.max(0, dist - 0.01)).name, kills: X.kills, escaped: X.escaped, hurt, out: outcomeOf(X), razed: X.razed || [], loot: X.loot, reason: X.reason, fights: X.fights, sectRec, personal: rec, day: Math.floor(s.t / DAY) + 1 };
  for (let i = 0; i < team.length; i++) for (let j = i + 1; j < team.length; j++) addMem(s, team[i], team[j], 'patrol', rep.seg); // v1.65 並肩巡山
  s.lastExp = rep; s.exp = null;
  log(s, `巡山戰報 #${rep.n}：走到${rep.seg} ${dist} 步｜${reportText(rep)}`);
  return rep;
}
// v1.95 戰報互斥欄位（patrol-defense BL-D07）：每次遭遇恰好一個結果；逃兵後被追到只算擊倒、不留在驅離
export function outcomeOf(X) { const kn = sum(X.kills), dr = sum(X.escaped), ev = sum(X.evaded), enc = X.encN || 0; return { enc, knock: kn, driven: dr, evaded: ev, other: Math.max(0, enc - kn - dr - ev) }; }
const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
function storyOf(team, r, X) {
  const who = team.map((d) => d.name).join('、'), E = (o) => Object.entries(o).map(([k, v]) => `${ENEMIES[k].name}${v}`).join('、');
  const parts = [`${who}以「${STYLES[r.style].name}」上山`];
  if (sum(r.evaded)) parts.push(`一路閃過${E(r.evaded)}`);
  if (r.ret?.hits?.length) parts.push(`回程帶著靈物經過${r.ret.hits.join('、')}，驚動山獸${r.ret.lost ? '，丟了一半戰利品' : '，咬牙撐了回來'}`);
  if (r.chase.n) parts.push(`追了 ${r.chase.n} 次逃兵，追到 ${r.chase.got}`);
  if (r.from) parts.push(`自${r.from}出發`); if (r.scout) parts.push(`${r.scout}探路搶先手`);
  if (r.gates.length) parts.push(`過了${r.gates.join('、')}`); if (r.camps?.length) parts.push(`在${r.camps.join('、')}補給`); if (r.quarrel?.length) parts.push(r.quarrel.join('、'));
  if (X.events.some((e) => e.includes('覺醒'))) parts.push(X.events.filter((e) => e.includes('覺醒')).join('、'));
  if (r.qing.length) parts.push(`${r.qing.join('、')}清場率 100%（清山）`);
  parts.push(r.blocked ? `在${segAt(Math.max(0, X.dist - 0.01)).name}被${r.blocked}攔下，打不過，退了回來` : `${X.reason}，回門`);
  return parts.join('，') + '。';
}
export function reportText(r) {
  const nm = (o) => Object.entries(o).map(([k, v]) => `${ENEMIES[k].name}×${v}`).join('、') || '無';
  const RN = { food: '飯', hide: '獸皮', herb: '藥', wood: '木', coin: '香火錢', page1: '凡階殘頁', page2: '精階殘頁', gall: '熊膽' };
  const O = r.out, oc = O ? `｜戰果（互斥）：遭遇 ${O.enc}＝擊倒 ${O.knock}・驅離 ${O.driven}・繞避 ${O.evaded}・其他 ${O.other}${r.razed?.length ? `；搗巢：${r.razed.join('、')}` : ''}` : '';
  return (oc ? oc.slice(1) + '｜' : '') + `擊倒 ${nm(r.kills)}；逃走 ${nm(r.escaped)}；傷 ${r.hurt.map(([n, l]) => `${n}${l}`).join('、') || '無'}；帶回 ${Object.entries(r.loot).map(([k, v]) => `${RN[k] || k}${v}`).join(' ') || '無'}；回頭原因：${r.reason}${r.sectRec ? '｜★ 本門新紀錄' : ''}${r.ret?.hits?.length ? `｜返程驚獸 ${r.ret.hits.length} 段（耐力 −${r.ret.staLost}${r.ret.lost ? `，丟下 ${Object.entries(r.ret.lost).map(([k, v]) => `${RN[k] || k}${v}`).join(' ')}` : ''}）` : ''}${r.patMax != null ? `｜體力 ${r.sta}・耐性 ${r.pat}/${r.patMax}${r.order ? '（巡山令）' : ''}・歇 ${r.cool} 秒${r.fast ? '（快腳）' : ''}` : ''}${r.style ? `｜${STYLES[r.style].name}・閃 ${sum(r.evaded)}・追 ${r.chase.got}/${r.chase.n}・清場 ${Object.entries(r.clear).map(([k, v]) => `${ROUTE.find((g) => g.id === k)?.name || k}${Math.round(v * 100)}%`).join(' ')}` : ''}`;
}
