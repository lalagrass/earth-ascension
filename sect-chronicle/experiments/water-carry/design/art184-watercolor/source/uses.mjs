// 匯出每張素材在 layout 裡的最大顯示尺寸（h 或 w），給 prep.py 決定縮圖大小。用法（water-carry 目錄）：node design/art184-watercolor/source/uses.mjs
import { writeFileSync } from 'node:fs';
import * as L from '../../../demo/scene/layout.mjs';
const m = {};
for (const p of [...L.PROPS, ...L.DECALS, ...L.NPCS.map((n) => ({ id: n.img, h: n.h }))]) { const o = m[p.id] || { h: 0, w: 0 }; m[p.id] = { h: Math.max(o.h, p.w ? 0 : p.h), w: Math.max(o.w, p.w || 0) }; }
writeFileSync(new URL('../uses.json', import.meta.url), JSON.stringify(m));
