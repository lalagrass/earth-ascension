// SCENE-03：權威路線（含 296 最終接受巡山 LEAD／MAIN）＋視覺佈局 → geometry.json（只讀、不回寫）。並列出壓在任何路上的高景物。
// 用法（water-carry 目錄）：node design/scene03/source/dump-geometry.mjs
import { writeFileSync } from 'node:fs';
import { WATER_POINTS, SPRING_PLACE } from '../../../demo/water-layout.mjs';
import { HERB, SEATS, FUN, BOAR, GUARD, DRINK } from '../../../demo/routes.mjs';
import { ZONE, EXIT } from '../../../demo/palm.mjs';
import { STREAM_POLY, BRIDGE_DECK_POLY } from '../../../demo/assets/long-water/scenery.mjs';
import * as L from '../../../demo/scene/layout.mjs';
import { LEAD, MAIN } from '../../../demo/patrol-layout.mjs';
const paths = { water: WATER_POINTS, herb: HERB.points, seatHero: SEATS.hero.points, seatCousin: SEATS.cousin.points, funHero: FUN.hero.points, funCousin: FUN.cousin.points, guard: GUARD.points, drink: DRINK.points, boar: BOAR.points, exit: EXIT, patrolLead: LEAD, patrolMain: MAIN };
const near = (p, pts) => { let best = 1e9; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i]; const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy || 1))); best = Math.min(best, Math.hypot(ax + t * dx - p[0], ay + t * dy - p[1])); } return best; };
const warn = [];
for (const p of L.PROPS) for (const [k, pts] of Object.entries(paths)) { const d = near([p.x, p.y], pts); if (d < 16 && p.h > 24) warn.push(`${p.id}@${p.x},${p.y} 距 ${k} ${d.toFixed(1)}`); }
writeFileSync(new URL('../geometry.json', import.meta.url), JSON.stringify({ paths, spring: SPRING_PLACE, stream: STREAM_POLY, deck: BRIDGE_DECK_POLY, zone: ZONE, fence: BOAR.fence, bench: SEATS.bench, ...Object.fromEntries(['YARD_POLY', 'STREAM_UP', 'STREAM_DOWN', 'STREAM_OUT', 'SPRING_MOUTH', 'POOL', 'OLD_POND', 'FOREST', 'ROCKY', 'WASHES', 'DECOR_PATHS', 'WORLD', 'BAKE_SCALE'].map((k) => [k, L[k]])) }, null, 1));
console.log(warn.length ? warn.join('\n') : 'no prop on route');
