import { MAP_W, MAP_H } from './data.mjs';
import { nextRand } from './rng.mjs';

export const BLOCKING = new Set(['T', 'R', 'W', '#', 'B', 'F']);

function fill(g, x0, y0, x1, y1, ch) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch;
}

// 固定版型＋種子撒點。回傳字串陣列（每列一字串）。
export function buildMap(holder) {
  const g = Array.from({ length: MAP_H }, () => Array(MAP_W).fill('.'));
  // 西邊林地：越西越密。
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < 15; x++) {
    if (nextRand(holder) < 0.55 - x * 0.03) g[y][x] = 'T';
  }
  // 北邊石坡。
  for (let y = 1; y < 7; y++) for (let x = 20; x < 44; x++) {
    if (nextRand(holder) < 0.22) g[y][x] = 'R';
  }
  // 南邊莓叢。
  for (let y = 32; y < 38; y++) for (let x = 20; x < 36; x++) {
    if (nextRand(holder) < 0.16) g[y][x] = 'B';
  }
  // 東邊溪：微彎，寬 2。
  for (let y = 0; y < MAP_H; y++) {
    const sx = 50 + Math.round(Math.sin(y / 6) * 1.5);
    g[y][sx] = 'W';
    g[y][sx + 1] = 'W';
  }
  // 破道館：外牆 26..37 × 13..22，內部地板，南門，牆上有兩個破口。
  fill(g, 26, 13, 37, 22, '#');
  fill(g, 27, 14, 36, 21, '_');
  g[22][31] = '_'; g[22][32] = '_';          // 門
  g[16][26] = '_'; g[13][34] = '_';          // 破口
  // 院子與小路。
  fill(g, 27, 23, 36, 28, ':');
  for (let x = 37; x < MAP_W; x++) g[25][x] = g[25][x] === 'W' ? '=' : ':';
  for (let y = 25; y < 31; y++) g[y][60] = ':';
  for (let x = 60; x < MAP_W; x++) g[30][x] = ':';
  for (let y = 29; y < 33; y++) g[y][29] = ':';
  for (let x = 15; x < 27; x++) g[20][x] = ':';
  return g.map((r) => r.join(''));
}

export function tileAt(map, x, y) {
  if (y < 0 || y >= map.length || x < 0 || x >= map[y].length) return null;
  return map[y][x];
}

export function walkable(map, x, y) {
  const t = tileAt(map, x, y);
  return t !== null && !BLOCKING.has(t);
}

// 最近的可站格（給 POI 或物件用）。
export function nearestWalkable(map, x, y) {
  if (walkable(map, x, y)) return { x, y };
  for (let r = 1; r < 10; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (walkable(map, x + dx, y + dy)) return { x: x + dx, y: y + dy };
    }
  }
  return null;
}
