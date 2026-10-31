// loop3 M3：山賊上地圖（輕量塔防）。只有築了木柵時才走這條；沒築柵仍是原本的一次勝率公式。
// 山賊從山門沿既有山路（NODES/EDGES）走到菜園木柵，圍柵每 hitEvery 秒撞一次；在院成人自主「守柵迎敵」，
// 在柵邊時依武功對山賊造成傷害。山賊血量＝威脅點數；打光＝打退，柵破＝照舊被搶、一人重傷（不死人）。
// 參考：塔防波次沿路徑前進、RimWorld 襲擊者攻擊建築（設計概念），不引任何套件。
import { NODES, EDGES } from './data.mjs';
import { dpsBonus } from './neigong.mjs';

export const BAND = { from: 'gate', speed: 38, hitEvery: 2, fenceDmg: { k: 0.04, min: 3 }, dps: { base: 1, per: 30 }, defendScore: 500, hpMin: 40, energyMin: 20 };
export function nodePath(a, b) { // BFS，只走既有邊
  const adj = {}; for (const [x, y] of EDGES) { (adj[x] ||= []).push(y); (adj[y] ||= []).push(x); }
  const prev = { [a]: null }, q = [a]; while (q.length) { const n = q.shift(); if (n === b) break; for (const m of adj[n] || []) if (!(m in prev)) { prev[m] = n; q.push(m); } }
  if (!(b in prev)) return []; const out = []; for (let n = b; n != null; n = prev[n]) out.unshift(n); return out;
}
export function newBand(P, to) { const path = nodePath(BAND.from, to); return { n: P.n, pts: P.pts, day: P.day, hp: P.pts, max: P.pts, pos: [...NODES[BAND.from]], path: path.slice(1), state: 'go', clock: 0, fenceDealt: 0, defDealt: 0 }; }
export const defenderDps = (d) => BAND.dps.base + ((d.skills.palm || 0) + (d.skills.leg || 0) + (d.skills.strength || 0)) / BAND.dps.per + dpsBonus(d); // loop117 護體真氣
export const canDefend = (d) => d.adult !== false && !d.away && d.role !== 'laborer' && d.hp >= BAND.hpMin && d.needs.energy >= BAND.energyMin;
// 走一步：回傳是否到達
export function bandWalk(b, dt) {
  let left = BAND.speed * dt;
  while (left > 0 && b.path.length) { const t = NODES[b.path[0]], dx = t[0] - b.pos[0], dy = t[1] - b.pos[1], L = Math.hypot(dx, dy);
    if (L <= left) { b.pos = [...t]; b.path.shift(); left -= L; } else { b.pos[0] += dx * left / L; b.pos[1] += dy * left / L; left = 0; } }
  return !b.path.length;
}
