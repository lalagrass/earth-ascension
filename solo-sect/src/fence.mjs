// loop2 M2：菜園木柵（輕量塔防第一步）。玩家主動花木頭築柵後才存在；沒築柵時一切照舊（不改既有數值與亂數順序）。
// 參考：RimWorld 的建築耐久＋修理工作（設計概念）；Sims 的「廣告」：柵欄受損時向弟子廣告「修柵」。
// 野豬到菜園先撞柵；山賊迎戰落敗時先破柵，柵還撐得住就搶不進院。耐久歸零才照舊損失。
import { log } from './util.mjs';

export const FENCE = {
  node: 'veg', cost: { wood: 6 }, max: 60,
  boarDmg: 12,                      // 一頭野豬撞一次
  boarRams: 2,                      // loop4：每次下山最多連撞 2 下（長跑比較 3 下＝等於沒柵），柵破就闖進去拱菜（不再「有柵就全擋」）
  warnAt: 0.5,                      // loop4：耐久跌破一半才記一次日誌（防洗版）；修回一半以上重置
  floor: 4,                         // loop4：修柵後倉裡至少留這麼多料，不和建造搶光
  levels: [null, { name: '木柵', max: 60, mat: 'wood', hp: 15 }, { name: '石牆', max: 150, mat: 'stone', hp: 25, cost: { stone: 12 } }],
  bandit: { k: 0.15, min: 15 },     // 山賊落敗時對柵傷害＝max(min, 威脅點數×k)
  repair: { hp: 15, wood: 1 },      // 一次修柵：耗 1 木、回 15 耐久（石牆見 levels：耗 1 石、回 25）
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
  s.res.wood -= FENCE.cost.wood; placeFence(s); return { ok: true };
}
// 受擊：回傳 { held }，held＝撞完柵還在（擋住了）
export function fenceHit(s, dmg, who, quiet = false) {
  const F = s.fence; if (!F || F.hp <= 0) return { held: false, none: true };
  F.hp = Math.max(0, F.hp - dmg); F.hits++;
  if (F.hp > 0) { if (!quiet) F.blocked++; if (!quiet) log(s, `${who}撞上菜園木柵（耐久 ${F.hp}/${F.max}），沒能闖進來。`); return { held: true }; }
  F.broken++; log(s, `${who}撞破了菜園木柵！`); return { held: false };
}
export const lvOf = (F) => FENCE.levels[F?.lv || 1];
export const fenceName = (s) => lvOf(s.fence).name;
export function canUpgradeFence(s) {
  const F = s.fence; if (!F) return { ok: false, why: '先築木柵' };
  const nx = FENCE.levels[(F.lv || 1) + 1]; if (!nx) return { ok: false, why: '已是最高等級' };
  for (const [k, v] of Object.entries(nx.cost)) if ((s.res[k] || 0) < v) return { ok: false, why: `${k === 'stone' ? '石' : '木'}不足（${s.res[k] || 0}/${v}）` };
  return { ok: true, next: nx };
}
export function upgradeFence(s) {
  const c = canUpgradeFence(s); if (!c.ok) return c; const F = s.fence, nx = c.next;
  for (const [k, v] of Object.entries(nx.cost)) s.res[k] -= v;
  raiseFence(s, nx); return { ok: true };
}
// 野豬連撞：回傳 true＝擋住；柵破則回 false（讓野豬照舊進菜園）
export function boarRam(s) {
  for (let i = 0; i < FENCE.boarRams; i++) if (!fenceHit(s, FENCE.boarDmg, '野豬', true).held) return false;
  const F = s.fence; F.blocked++;
  if (!F.warned && F.hp < F.max * FENCE.warnAt) { F.warned = true; log(s, `野豬連日撞柵，${lvOf(F).name}只剩 ${F.hp}/${F.max}，該修了。`); }
  return true;
}
export const repairing = (s) => s.ds.some((d) => d.task?.act === 'repair');
// 修柵廣告：受損、有木頭、沒人正在修、受理者是成人且體力夠
export function repairScore(s, d) {
  const F = s.fence, L = lvOf(F); if (!F || F.hp >= F.max || (s.res[L.mat] || 0) < 1 + FENCE.floor || repairing(s) || d.adult === false || d.needs.energy < 25) return 0;
  const S = FENCE.score; return S.base + (1 - F.hp / F.max) * S.dmgK + (F.hp <= 0 ? S.broken : 0);
}
export function repairDone(s, d) {
  const F = s.fence, L = lvOf(F); if (!F || (s.res[L.mat] || 0) < 1) return false;
  s.res[L.mat] -= 1; F.hp = Math.min(F.max, F.hp + L.hp); F.repaired++; if (F.hp >= F.max * FENCE.warnAt) F.warned = false;
  if (F.hp >= F.max) log(s, `${d.name}把${L.name}修補完好（${F.hp}/${F.max}）。`); return true; // loop4：只在修滿時記日誌
}
export function fenceHtml(s) {
  const F = s.fence, v = fenceSite(s), prog = v ? `<span class="k">工地：${v.need.wood ? `木 ${v.delivered.wood}/${v.need.wood} ` : ''}${v.need.stone ? `石 ${v.delivered.stone}/${v.need.stone} ` : ''}工時 ${Math.floor(v.work)}/${v.workNeed}</span>` : '';
  if (!F) return `<div class="fence"><b>菜園木柵</b>：還沒築 ${v ? prog : `<button data-fence>立藍圖：築木柵（${FENCE.cost.wood} 木，弟子搬料施工）</button>`}</div>`;
  const nx = FENCE.levels[(F.lv || 1) + 1];
  return `<div class="fence"><b>菜園${lvOf(F).name}</b>${v ? ' ' + prog : nx ? ` <button data-fence-up>立藍圖：加砌${nx.name}（${nx.cost.stone} 石）</button>` : ''}：耐久 ${F.hp}/${F.max}${F.hp <= 0 ? '（已破）' : ''}・擋下 ${F.blocked} 次・被破 ${F.broken} 次・修補 ${F.repaired} 次</div>`;
}

// ---- loop11：築柵／加砌改走既有工地搬運流程（藍圖→弟子從院倉搬料到菜園→施工）。只限柵牆。 ----
function placeFence(s) { s.fence = { lv: 1, hp: FENCE.max, max: FENCE.max, hits: 0, broken: 0, repaired: 0, blocked: 0 }; log(s, `菜園圍起了木柵（耐久 ${FENCE.max}）。`); }
function raiseFence(s, nx) { const F = s.fence; F.lv = (F.lv || 1) + 1; F.hp = Math.min(nx.max, F.hp + (nx.max - F.max)); F.max = nx.max; F.warned = false; log(s, `菜園木柵加砌成${nx.name}（耐久 ${F.hp}/${F.max}）。`); }
export const FENCE_SITE = { work: { build: 12, up: 20 } };
export const FENCE_FAC = { id: 'fence', name: '菜園柵', node: FENCE.node, stages: [{ name: '菜園柵', offers: [] }] };
export const fenceSite = (s) => s.fac?.fence?.site || null;
export function canStartFenceSite(s) {
  if (fenceSite(s)) return { ok: false, why: '柵牆工地施工中' };
  if (!s.fence) return { ok: true, kind: 'build', cost: { wood: FENCE.cost.wood, stone: 0 } };
  const nx = FENCE.levels[(s.fence.lv || 1) + 1]; if (!nx) return { ok: false, why: '已是最高等級' };
  return { ok: true, kind: 'up', cost: { wood: nx.cost.wood || 0, stone: nx.cost.stone || 0 }, next: nx };
}
export function startFenceSite(s) {
  const c = canStartFenceSite(s); if (!c.ok) return c;
  s.fac.fence = { stage: 0, site: { need: { ...c.cost }, delivered: { wood: 0, stone: 0 }, reserved: { wood: 0, stone: 0 }, work: 0, workNeed: FENCE_SITE.work[c.kind], paused: false, kind: c.kind } };
  log(s, `立藍圖：${c.kind === 'build' ? '菜園木柵' : '加砌' + c.next.name}（收集包：${c.cost.wood ? `木 ${c.cost.wood}` : ''}${c.cost.stone ? `石 ${c.cost.stone}` : ''}；工時 ${FENCE_SITE.work[c.kind]}s）`);
  return { ok: true };
}
export function finishFenceSite(s) {
  const v = fenceSite(s); if (!v) return false;
  if (v.kind === 'build' && !s.fence) placeFence(s); else if (v.kind === 'up' && s.fence) { const nx = FENCE.levels[(s.fence.lv || 1) + 1]; if (nx) raiseFence(s, nx); }
  s.fac.fence.site = null; return true; // 保留空殼：其他施工者回查 s.fac.fence.site 時不出錯
}
