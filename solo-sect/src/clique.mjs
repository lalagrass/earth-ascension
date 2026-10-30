// loop20 好友圈成派：彼此好感都 ≥ CLQ.aff 的一群（≥2 人、每人至多一派）結成「同門小派」。
// 效果（新路徑另加一小筆，不改既有倍率）：①同派有人同時在做同一件事（練功／打坐／切磋）→ 技藝另加 bonus；②剿寨優先派同派的人同行。
// 只在 s.draw（人以群分）時生效；golden 不變。
import { aff } from './social.mjs';
import { log } from './util.mjs';
export const CLQ = { aff: 85, leave: 70, bonus: 0.1, acts: ['train', 'meditate', 'spar'] };
const pool = (s) => s.ds.filter((d) => !d.removed && d.role !== 'laborer' && d.adult !== false);
const ok = (s, g, th) => g.every((a, i) => g.every((b, j) => j <= i || aff(s, a, b) >= th));
// 每日：先檢查舊派（低於 leave 就散），再用貪婪法從好感最高的一對長出新派
export function cliqueDaily(s) {
  if (!s.draw) return; const ds = pool(s), byId = (id) => ds.find((d) => d.id === id); const old = s.cliques || [];
  const keep = []; for (const c of old) { const g = c.ids.map(byId).filter(Boolean); if (g.length >= 2 && ok(s, g, CLQ.leave)) keep.push({ ...c, ids: g.map((d) => d.id) }); else log(s, `【小派】${c.name}漸漸疏遠，散了。`); }
  const used = new Set(keep.flatMap((c) => c.ids)); const pairs = [];
  for (const a of ds) for (const b of ds) if (a.id < b.id && !used.has(a.id) && !used.has(b.id) && aff(s, a, b) >= CLQ.aff) pairs.push([aff(s, a, b), a, b]);
  pairs.sort((x, y) => y[0] - x[0]);
  for (const [, a, b] of pairs) { if (used.has(a.id) || used.has(b.id)) continue; const g = [a, b];
    for (const o of ds) if (!used.has(o.id) && !g.includes(o) && ok(s, [...g, o], CLQ.aff)) g.push(o);
    for (const d of g) used.add(d.id); const c = { ids: g.map((d) => d.id), name: `${g[0].name}一派`, day: s.day }; keep.push(c);
    log(s, `【小派】${g.map((d) => d.name).join('、')}意氣相投，結成「${c.name}」，從此同進同退。`); (s.cliqueN ??= 0); s.cliqueN++; }
  s.cliques = keep;
}
export const cliqueOf = (s, d) => (s.cliques || []).find((c) => c.ids.includes(d.id)) || null;
export const mates = (s, d) => { const c = cliqueOf(s, d); return c ? c.ids.filter((id) => id !== d.id) : []; };
// 活動完成時：同派有人正在做同一件事（或切磋對手即同派）→ 技藝另加 bonus
export function cliqueTrain(s, d, act, skill, grow) {
  if (!s.draw || !skill || !CLQ.acts.includes(act)) return false; const m = mates(s, d); if (!m.length) return false;
  const with_ = s.ds.some((o) => m.includes(o.id) && (o.task?.act === act || d.task?.partner === o.id)); if (!with_) return false;
  for (const [k, v] of Object.entries(skill)) grow(s, d, k, v * CLQ.bonus); s.cliqueBoost = (s.cliqueBoost || 0) + 1; return true;
}
