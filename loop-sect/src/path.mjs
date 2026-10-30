import { walkable } from './map.mjs';

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

// 8 方向 A*，不切角。回傳格子序列（不含起點），到不了回 null。
export function findPath(map, sx, sy, tx, ty) {
  if (!walkable(map, tx, ty)) return null;
  if (sx === tx && sy === ty) return [];
  const W = map[0].length;
  const key = (x, y) => y * W + x;
  const h = (x, y) => {
    const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  const g = new Map([[key(sx, sy), 0]]);
  const came = new Map();
  const open = [[h(sx, sy), sx, sy]];
  const closed = new Set();
  while (open.length) {
    // 小地圖，線性取最小即可，且順序固定 → 決定論。
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, x, y] = open.splice(bi, 1)[0];
    const k = key(x, y);
    if (closed.has(k)) continue;
    closed.add(k);
    if (x === tx && y === ty) {
      const out = [];
      let c = k;
      while (c !== key(sx, sy)) {
        out.push({ x: c % W, y: Math.floor(c / W) });
        c = came.get(c);
      }
      return out.reverse();
    }
    for (const [dx, dy, cost] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!walkable(map, nx, ny)) continue;
      if (dx && dy && (!walkable(map, x + dx, y) || !walkable(map, x, y + dy))) continue;
      const nk = key(nx, ny);
      const ng = g.get(k) + cost;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        came.set(nk, k);
        open.push([ng + h(nx, ny), nx, ny]);
      }
    }
  }
  return null;
}
