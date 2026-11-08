import { ARTS, CLIFFS, NODES } from './data.mjs';
import { artTier } from './arts.mjs';
import { BODY_MECHANICS, bodyOf } from './contact.mjs';
import { pixelsToMeters, zhangToMeters } from './time-scale.mjs';

const ENTRY_ENERGY = 80; // 推導：hero.mjs、sim.mjs 與 family.mjs 共用的開局精力；入門者按開局狀態校準。

// R6 #523：爆發力／體重、步法火候、當前耐力共同決定路線與連續借力高度。
// 以本人未練時的力量／標準體重作基準；分級 1／2／3 是規格指定的易／中／難。
export function climbAbility(d) {
  if (!d) return { grade: 0, reachZhang: 0, effort: 0 };
  const stepTier = ARTS.filter(a => a.school === 'step' && d.arts?.[a.id])
    .reduce((best, a) => Math.max(best, artTier(d, a.id)), -1);
  const base = d.bodyBase?.strength || d.skills?.strength || 0;
  const powerWeight = (d.skills?.strength || 0) / bodyOf(d).mass;
  const basePowerWeight = base / BODY_MECHANICS.mass;
  const stamina = Math.max(0, (d.needs?.energy || 0) / ENTRY_ENERGY);
  const effort = stepTier < 0 || !basePowerWeight ? 0 : powerWeight / basePowerWeight * (stepTier + 1) * stamina;
  return { grade: Math.min(3, stepTier + 1, Math.floor(effort)), reachZhang: CLIFFS.cliff1.heightZhang * effort, effort };
}

export function canClimbCliff(d, cliffId, route = 'detour') {
  const cliff = CLIFFS[cliffId]; if (!cliff || !d) return false;
  if (cliff.detour && route === 'direct') return false; // 頂端光壁無落腳點，任何體能都不能直上。
  const ability = climbAbility(d);
  // 路線級表示最難一段的技術；總高另驗能否持續借力到頂，兩者不可互代。
  return ability.grade >= cliff.routeGrade && ability.reachZhang >= cliff.heightZhang;
}

export const canLeapCliff = (d, cliffId) => canClimbCliff(d, cliffId);

// R1 推導：俯視圖水平畫素與崖高的丈都先換公尺，斜坡按直角三角形折算。
export function cliffSlopeFactor(from, to) {
  const a = NODES[from], b = NODES[to]; if (!a || !b) return 1;
  const heightOf = id => id === CLIFFS.cliff3.detour
    ? (CLIFFS.cliff2.heightZhang + CLIFFS.cliff3.heightZhang) / 2
    : (CLIFFS[id]?.heightZhang || 0);
  const rise = zhangToMeters(Math.max(0, heightOf(to) - heightOf(from)));
  if (!rise) return 1;
  const run = pixelsToMeters(Math.hypot(b[0] - a[0], b[1] - a[1]));
  return run ? run / Math.hypot(run, rise) : 1;
}

export const CLIFF_ACT_NODE = Object.freeze(Object.fromEntries(Object.entries(CLIFFS).flatMap(([id, cliff]) => cliff.acts.map(act => [act, id]))));
