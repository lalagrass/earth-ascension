// soak 用的不變量與統計。每個 milestone 在這裡加自己的檢查。
import { companionsFor } from '../src/sim.mjs';
import { walkable } from '../src/map.mjs';
import { speedOf } from '../src/person.mjs';
import { TEMPLATES } from '../src/data.mjs';

const STUCK_TICKS = 720; // 半日

export function rosterFor(seed) {
  const t = TEMPLATES[seed % TEMPLATES.length].id;
  return [{ template: t, name: '主角', protagonist: true }, ...companionsFor(seed, t)];
}

const fail = (ctx, s, msg) => ctx.failures.push(`tick ${s.tick} ${msg}`);

export const invariants = [
  // A6：數值有限、位移不超速、站在可站格。
  (s, ctx) => {
    for (const p of s.people) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) fail(ctx, s, `${p.name} 座標非數`);
      const q = ctx.prev.get(p.id);
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d > speedOf(p) + 1e-9) fail(ctx, s, `${p.name} 瞬移 ${d.toFixed(3)}`);
      if (!walkable(s.map, Math.round(p.x), Math.round(p.y))) fail(ctx, s, `${p.name} 站在擋路格`);
      if (d > 0 || p.wait > 0) ctx.lastMove.set(p.id, s.tick);
      if (s.tick - (ctx.lastMove.get(p.id) ?? 0) > STUCK_TICKS) fail(ctx, s, `${p.name} 卡住超過半日`);
    }
  },
];

export const samplers = [
  // A7：每人與最近他人的距離，依外向／內向分組累加。
  (s, ctx) => {
    for (const p of s.people) {
      let near = Infinity;
      for (const o of s.people) if (o !== p) near = Math.min(near, Math.hypot(o.x - p.x, o.y - p.y));
      const k = p.axes.E > 0 ? 'E' : 'I';
      const g = (ctx.samples[k] ??= { n: 0, sum: 0 });
      g.n++; g.sum += near;
    }
  },
];

export function summarize(s) {
  return s.people.map((p) => `${p.name}(${p.type}) 去過${Object.keys(p.visits).length}處`).join(' ');
}

export function judge(pooled) {
  const lines = [];
  const failures = [];
  const avg = (k) => (pooled[k] ? pooled[k].sum / pooled[k].n : NaN);
  const e = avg('E'), i = avg('I');
  lines.push(`A7 平均離最近他人距離：外向 ${e.toFixed(2)} 格，內向 ${i.toFixed(2)} 格`);
  if (!(e < i)) failures.push('A7 外向者沒有比內向者更靠近別人');
  return { lines, failures };
}
