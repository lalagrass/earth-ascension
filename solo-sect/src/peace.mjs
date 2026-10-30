// loop9 M9 遠征帶來太平＋防禦經濟收尾。只在 s.m9 開啟時生效（golden 不變）。
// ① 巡山掃清山腳或林邊（既有 peaceOf 條件）→ 山賊下次來犯延後；② 派隊偏好練功搭子；③ 柵缺料時弟子主動砍柴／採石。
import { EXP } from './data.mjs';
import { FENCE, lvOf } from './fence.mjs';
export const PEACE = {
  banditDelay: 2,     // 太平時山賊來犯再延後幾天
  mateK: 2, mateCap: 10, // 派隊：每次同修 +2 分，上限 10（既有默契分同量級）
  demandMul: 1.3,     // 缺料時砍柴／採石意願
  damagedAt: 0.8,    // 柵耐久低於八成才為修補備料
  demandExtra: 4,     // 料少於「底線＋這麼多」就算缺
};
const MAT_ACT = { wood: 'chop', stone: 'quarry' };
export const peaceful = (s) => ['foot', 'wood'].some((id) => (s.records?.qing?.[id] || 0) >= EXP.peaceQing);
export const peaceDelay = (s) => (s.m9 && peaceful(s) ? PEACE.banditDelay : 0);
export function mateBonus(s, a, b) { if (!s.m9 || !a || !b) return 0; return Math.min(PEACE.mateCap, ((a.mates?.[b.id] || 0) + (b.mates?.[a.id] || 0)) * PEACE.mateK); }
// 柵需要什麼料：修補用料；木柵且石不夠升級 → 也要石
export function fenceNeeds(s) {
  const F = s.fence; if (!s.m9 || !F) return [];
  const need = [], L = lvOf(F), lim = FENCE.floor + PEACE.demandExtra;
  if ((s.res[L.mat] || 0) < lim && F.hp < F.max * PEACE.damagedAt) need.push(L.mat);
  const up = FENCE.levels[(F.lv || 1) + 1]; if (up?.cost) for (const [m, c] of Object.entries(up.cost)) if ((s.res[m] || 0) < c && !need.includes(m)) need.push(m);
  return need;
}
export function demandBoost(s, d, out) {
  const need = fenceNeeds(s); if (!need.length) return;
  for (const m of need) for (const o of out) if (o.act === MAT_ACT[m]) { o.score *= PEACE.demandMul; o.why = `柵要用${m === 'wood' ? '木料' : '石料'}，倉裡不夠了`; }
}
