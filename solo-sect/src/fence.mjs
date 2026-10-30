// loop2 M2：菜園木柵（輕量塔防第一步）。玩家主動花木頭築柵後才存在；沒築柵時一切照舊（不改既有數值與亂數順序）。
// 參考：RimWorld 的建築耐久＋修理工作（設計概念）；Sims 的「廣告」：柵欄受損時向弟子廣告「修柵」。
// 野豬到菜園先撞柵；山賊迎戰落敗時先破柵，柵還撐得住就搶不進院。耐久歸零才照舊損失。
import { log } from './util.mjs';

export const FENCE = {
  node: 'veg', cost: { wood: 6 }, max: 60,
  boarDmg: 12,                      // 一頭野豬撞一次
  bandit: { k: 0.15, min: 15 },     // 山賊落敗時對柵傷害＝max(min, 威脅點數×k)
  repair: { hp: 15, wood: 1 },      // 一次修柵：耗 1 木、回 15 耐久
  score: { base: 30, dmgK: 50, broken: 25 }, // 修柵分數＝base＋受損比例×dmgK（全毀再＋broken）
};
export const fenceOf = (s) => s.fence || null;
export const fenceUp = (s) => !!s.fence && s.fence.hp > 0;
export function canBuildFence(s) {
  if (s.fence) return { ok: false, why: '菜園已經有木柵了' };
  const w = FENCE.cost.wood; if ((s.res.wood || 0) < w) return { ok: false, why: `木頭不足（${s.res.wood || 0}/${w}）` };
  return { ok: true };
}
export function buildFence(s) {
  const c = canBuildFence(s); if (!c.ok) return c;
  s.res.wood -= FENCE.cost.wood; s.fence = { hp: FENCE.max, max: FENCE.max, hits: 0, broken: 0, repaired: 0, blocked: 0 };
  log(s, `菜園圍起了木柵（耐久 ${FENCE.max}）。`); return { ok: true };
}
// 受擊：回傳 { held }，held＝撞完柵還在（擋住了）
export function fenceHit(s, dmg, who) {
  const F = s.fence; if (!F || F.hp <= 0) return { held: false, none: true };
  F.hp = Math.max(0, F.hp - dmg); F.hits++;
  if (F.hp > 0) { F.blocked++; log(s, `${who}撞上菜園木柵（耐久 ${F.hp}/${F.max}），沒能闖進來。`); return { held: true }; }
  F.broken++; log(s, `${who}撞破了菜園木柵！`); return { held: false };
}
export const repairing = (s) => s.ds.some((d) => d.task?.act === 'repair');
// 修柵廣告：受損、有木頭、沒人正在修、受理者是成人且體力夠
export function repairScore(s, d) {
  const F = s.fence; if (!F || F.hp >= F.max || (s.res.wood || 0) < FENCE.repair.wood || repairing(s) || d.adult === false || d.needs.energy < 25) return 0;
  const S = FENCE.score; return S.base + (1 - F.hp / F.max) * S.dmgK + (F.hp <= 0 ? S.broken : 0);
}
export function repairDone(s, d) {
  const F = s.fence; if (!F || (s.res.wood || 0) < FENCE.repair.wood) return false;
  s.res.wood -= FENCE.repair.wood; F.hp = Math.min(F.max, F.hp + FENCE.repair.hp); F.repaired++;
  log(s, `${d.name}修好一段木柵（耐久 ${F.hp}/${F.max}）。`); return true;
}
export function fenceHtml(s) {
  const F = s.fence; if (!F) { const c = canBuildFence(s); return `<div class="fence"><b>菜園木柵</b>：還沒築 <button data-fence ${c.ok ? '' : 'disabled'}>築木柵（${FENCE.cost.wood} 木）</button>${c.ok ? '' : ` <span class="k">${c.why}</span>`}</div>`; }
  return `<div class="fence"><b>菜園木柵</b>：耐久 ${F.hp}/${F.max}${F.hp <= 0 ? '（已破）' : ''}・擋下 ${F.blocked} 次・被破 ${F.broken} 次・修補 ${F.repaired} 次</div>`;
}
