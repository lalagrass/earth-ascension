// SG-PATROL-01 PF1：西坡巡山路與林鼠的唯一純幾何來源（模型取樣、畫面描線、存檔相容識別共用）。不碰 Pixi／DOM／時鐘。
// 世界仍 1600×1350；院中端點、水路、採藥路、院內清理區／三鼠／西出口、野豬獸路與防守點都不改。
import { HOME } from './palm.mjs';

// 前導路：HOME → 院西通道（同清鼠 GATE 兩點）→ 沿院坪南緣往西 → 繞過竹護欄東南端點（720,480）的南側 → S0。
export const LEAD = Object.freeze([HOME, [930, 522], [905, 530], [820, 552], [756, 548], [722, 524], [698, 512]].map((p) => Object.freeze(p)));
// 主路：S0 柵欄外巡山口 → S1 竹坡 → S2 石坳 → S3 林緣。在西坡 x 100–620、y 300–850 內順坡彎行，不蛇行湊數。
export const MAIN = Object.freeze([[698, 512], [612, 548], [536, 596], [470, 640], [408, 700], [356, 752], [292, 776], [226, 744], [178, 690], [140, 626], [126, 560], [150, 500]].map((p) => Object.freeze(p)));
export const WAYPOINTS = Object.freeze([
  Object.freeze({ id: 'S0', label: '巡山口', node: 0 }),
  Object.freeze({ id: 'S1', label: '竹坡', node: 3 }),
  Object.freeze({ id: 'S2', label: '石坳', node: 6 }),
  Object.freeze({ id: 'S3', label: '林緣', node: 11 }),
]);
// 林鼠：三隻（兩普通、一警覺），各在主路旁、有自己的逃路；林地有效區＝主路兩側 FOREST_BAND 走廊（inForest），不用院內 ZONE／EXIT。
export const FOREST_RATS = Object.freeze([
  Object.freeze({ id: 'patrol-rat-1', x: 560, y: 600, kind: 'normal', exit: [[590, 650], [620, 720]] }),
  Object.freeze({ id: 'patrol-rat-2', x: 330, y: 790, kind: 'normal', exit: [[330, 840], [320, 900]] }),
  Object.freeze({ id: 'patrol-rat-3', x: 168, y: 600, kind: 'alert', exit: [[240, 600], [300, 590]] }),
]);
// PF2 已批示意值：察覺 180；離路追擊上限（任一先到）；耗能（/秒）與最低出發、返程保底。
export const PATROL = Object.freeze({
  sense: 180, offMain: 60, offStart: 80, chaseTicks: 180,
  depart: 40, reserve: 8, walkPerSec: 0.8, actPerSec: 0.2, observeTicks: 60,
  boarNear: 120, shoutRange: 60, band: 90,
});

const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const polyLength = (pts) => pts.slice(1).reduce((n, p, i) => n + len(pts[i], p), 0);
export const LEAD_LENGTH = polyLength(LEAD);
export const MAIN_LENGTH = polyLength(MAIN);
// 主路每節點自 S0 起的累積距離。
export const MAIN_AT = Object.freeze(MAIN.reduce((a, p, i) => (i ? [...a, a[i - 1] + len(MAIN[i - 1], p)] : [0]), []));
// 點投影到主路：回傳 { d：沿主路距 S0、off：到主路距離、seg：段索引 }。
export function project(x, y) {
  let best = { d: 0, off: Infinity, seg: 0 };
  for (let i = 0; i < MAIN.length - 1; i++) {
    const [ax, ay] = MAIN[i], [bx, by] = MAIN[i + 1], L2 = (bx - ax) ** 2 + (by - ay) ** 2;
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2));
    const px = ax + (bx - ax) * t, py = ay + (by - ay) * t, off = Math.hypot(x - px, y - py);
    if (off < best.off - 1e-9) best = { d: MAIN_AT[i] + t * Math.sqrt(L2), off, seg: i };
  }
  return best;
}
// 相容識別：任何節點／林鼠／數值改動都換 id，舊 v2 檔不套到新幾何。
export const PATROL_GEO_ID = `patrol01:${[...LEAD, ...MAIN].flat().join(',')}|${FOREST_RATS.map((r) => `${r.id}@${r.x},${r.y}`).join(';')}|${MAIN_LENGTH.toFixed(1)}`;
// 林鼠有效區：在主路走廊內（離主路 ≤ band，邊界算區內）。
export const inForest = (x, y) => project(x, y).off <= PATROL.band + 1e-9;
