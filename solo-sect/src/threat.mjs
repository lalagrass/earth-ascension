import { log, seedMix, resAdd, recordDeed, tallyAct } from './util.mjs';
import { NODES, EDGES, DAY, FACILITIES } from './data.mjs';
import { dpsBonus, guardHurt } from './arts.mjs';
import { power } from './jianghu.mjs';
import { valorAdd, valorThreatMul, valorHtml, VALOR } from './sect.mjs';
import { peaceDelay } from './economy.mjs';
import { mates } from './bonds.mjs';
import { cancelTask } from './core.mjs';
// ==== （原 raidkind.mjs）====
// loop17 山賊多樣：只在 s.m9（江湖規則「太平與備料」）時抽類型；舊局／golden 無 kind＝原樣。
// 期望點數 ≈ 原值（0.5×0.8+0.3×1.25+0.2×1.0=0.975），夜襲不能付錢、敗了只偷不傷人 → 不推高重傷。
export const RAID_KINDS = {
  liukou: { name: '流寇', w: 0.5, pts: 0.8, demand: 0.8, steal: 1, winHurt: 0.5, loseHurt: true, desc: '烏合之眾，好打發' },
  hanfei: { name: '悍匪', w: 0.3, pts: 1.25, demand: 1.3, steal: 1.2, winHurt: 1, loseHurt: true, desc: '亡命之徒，下手狠' },
  yexi: { name: '夜襲', w: 0.2, pts: 1, demand: 0, steal: 0.6, winHurt: 0.5, loseHurt: false, noPay: true, desc: '趁夜摸進來偷，不談價；只偷不傷人' },
};
export function pickKind(r) { let a = 0; for (const [id, k] of Object.entries(RAID_KINDS)) { a += k.w; if (r < a) return id; } return 'liukou'; }
export const kindOf = (id) => (id && RAID_KINDS[id]) || null;
// loop18 波次：第一波被打退後，有機率重整再來第二波（不談價、只能迎戰），點數×k；只在有類型（s.m9）時。
export const WAVE = { p: { liukou: 0.8, hanfei: 1, yexi: 0.5 }, k: 1.8, gap: 60 };

// ==== （原 fence.mjs）====
// loop2 M2：菜園木柵（輕量塔防第一步）。玩家主動花木頭築柵後才存在；沒築柵時一切照舊（不改既有數值與亂數順序）。
// 參考：RimWorld 的建築耐久＋修理工作（設計概念）；Sims 的「廣告」：柵欄受損時向弟子廣告「修柵」。
// 野豬到菜園先撞柵；山賊迎戰落敗時先破柵，柵還撐得住就搶不進院。耐久歸零才照舊損失。

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
  const S = FENCE.score, X = s.threat, rk = s.rumor && s.steward && X && !X.pending && X.rumorFor != null && X.rumorFor === X.next ? 1.5 : 1; /* loop119 傳聞時執事優先修柵 */ return (S.base + (1 - F.hp / F.max) * S.dmgK + (F.hp <= 0 ? S.broken : 0)) * rk;
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

// ==== （原 band.mjs）====
// loop3 M3：山賊上地圖（輕量塔防）。只有築了木柵時才走這條；沒築柵仍是原本的一次勝率公式。
// 山賊從山門沿既有山路（NODES/EDGES）走到菜園木柵，圍柵每 hitEvery 秒撞一次；在院成人自主「守柵迎敵」，
// 在柵邊時依武功對山賊造成傷害。山賊血量＝威脅點數；打光＝打退，柵破＝照舊被搶、一人重傷（不死人）。
// 參考：塔防波次沿路徑前進、RimWorld 襲擊者攻擊建築（設計概念），不引任何套件。

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

// ==== （原 threat.mjs）====
// v1.9 I-6 財富襲擊＋山賊勒索（ROADMAP-NEXT I-6；RimWorld 財富點數、Going Medieval 人數寬限、Songs of Syx／Kenshi 勒索可付錢）
// 威脅點數＝財富（錢＋存糧＋丹藥＋藥＋建築階數）÷div × 天數係數，封頂；全派（含雜工）<8 人時為 0（不來）。
// 山賊上門先勒索：付錢了事，或迎戰（勝率＝守方戰力／(戰力＋點數)）。只會重傷（氣血壓到 15），不會死人。
// 玩家在收支區按鈕選；半日內沒選就由執事比較勒索金與迎戰預期損失自動決定（長跑與無人值守都走這條）。

export const RAID = { minPop: 8, minPopRules: 4, // loop12：開了「太平與備料」（江湖規則）的新局，山賊門檻降為 4 人＝開局人數，第 8 日起就會來
  first: 8, every: 6, jitter: 2, w: { coin: 1, food: 1, pill: 8, herb: 1, stage: 25 }, div: 2, dayK: 30, dayMax: 2, cap: 900,
  logAfter: 30, logK: 0.2, hurtCool: 2, // v2.1：第 30 日後天數係數改對數；山門重傷後下次上門再晚 hurtCool 日
  demand: { base: 20, k: 0.6, coinMax: 0.35, min: 10 }, wait: DAY / 2, hurtCost: 80, hurtHp: 15, winHurt: 0.4, steal: { coin: 0.15, food: 0.2 }, rep: 3 };
export function T(s) { return (s.threat ??= { next: RAID.first, n: 0, paid: 0, fought: 0, won: 0, homeHurt: 0, deaths: 0, pending: null, rng: 0, hist: [] }); }
const R = (s) => { const X = T(s); X.rng = ((X.rng || seedMix(s.seed || 1, 7477)) * 16807) % 2147483647; return X.rng / 2147483647; };
export const headcount = (s) => s.ds.filter((d) => !d.removed).length;
export function wealth(s) { const W = RAID.w, r = s.res; return Math.max(0, r.coin || 0) * W.coin + (r.food || 0) * W.food + (r.pill || 0) * W.pill + (r.herb || 0) * W.herb + FACILITIES.reduce((a, f) => a + (s.fac[f.id]?.stage || 0), 0) * W.stage; }
const linMul = (day) => Math.min(RAID.dayMax, 0.5 + day / RAID.dayK);
// 第 logAfter 日以前與舊線性相同；之後從當天的值接著以對數成長，不再爬到 dayMax。
export const dayMul = (s) => { const d = s.day || 0; if (d <= RAID.logAfter) return linMul(d); return Math.min(RAID.dayMax, linMul(RAID.logAfter) + Math.log(1 + (d - RAID.logAfter) / RAID.logAfter) * RAID.logK); };
export const minPopOf = (s) => (s.m9 ? RAID.minPopRules : RAID.minPop);
export function points(s) { if (headcount(s) < minPopOf(s)) return 0; return Math.min(RAID.cap, Math.round(wealth(s) / RAID.div * dayMul(s) * valorThreatMul(s) * (T(s).taiping ? BOSS.peaceMul : 1))); }
export const defense = (s) => power(s);
export const winP = (s, pts) => { const d = defense(s); return Math.max(0.1, Math.min(0.9, d / (d + pts))); };
export const demandOf = (s, pts) => Math.max(RAID.demand.min, Math.round(Math.min(Math.max(0, s.res.coin) * RAID.demand.coinMax, RAID.demand.base + pts * RAID.demand.k)));
// 自動決定：比較「勒索金」與「迎戰的預期損失」＝(1−勝率)×(被搶的錢＋糧＋一人重傷折 hurtCost)；勒索金較小且付得起才付
export const fightLoss = (s, p) => (1 - p) * (Math.max(0, s.res.coin) * RAID.steal.coin + (s.res.food || 0) * RAID.steal.food + RAID.hurtCost);
// loop4：有柵時執事先估「守方打光山賊」是否快過「山賊撞破柵」，快就迎戰；否則照舊比較
export function fenceHolds(s, pts) { if (!fenceUp(s)) return false; const dps = s.ds.filter(canDefend).reduce((a, d) => a + defenderDps(d), 0); if (dps <= 0) return false;
  const fd = Math.max(BAND.fenceDmg.min, Math.round(pts * BAND.fenceDmg.k)) / BAND.hitEvery; return pts / dps < s.fence.hp / fd; }
export const raidAuto = (s) => { const P = T(s).pending; if (P?.noPay) return 1; if (P && fenceHolds(s, P.pts)) return 1; return P && s.res.coin >= P.demand && P.demand < fightLoss(s, P.p) ? 0 : 1; };
// 每日一次（sim 換日時呼叫）：到期就看點數，>0 才上門
// loop119 傳聞預警：寨匪來前 RUMOR.lead 日內寫一條茶攤傳聞；不用亂數（不改寨匪結果）。只說「約幾日」，不說點數與種類
export const RUMOR = { lead: 2, fenceK: 1.5 };
export const rumorDays = (s) => { const X = T(s); return s.rumor && !X.pending && X.rumorFor != null && X.rumorFor === X.next ? Math.max(1, X.next - (s.day || 0)) : 0; };
function rumorDaily(s) {
  const X = T(s); if (!s.rumor || X.pending || X.rumorFor === X.next) return; const left = X.next - (s.day || 0);
  if (left > RUMOR.lead || left < 1 || points(s) <= 0) return; X.rumorFor = X.next;
  log(s, `【傳聞】山下茶攤有人說，有夥山賊在打聽本門的家底，怕是${left <= 1 ? '這一兩日' : `約 ${left} 日內`}就會上山。`);
  if (s.exp && s.exp.phase !== 'back' && s.exp.phase !== 'done') log(s, '【傳聞】遠行的弟子若想回山守門，可以下令召回。');
}
// M2（loop147）山賊餘黨反撲：剿寨後 BOSS.after 日殺回（前一日傳聞）；撐過＝山道永享太平
export const BOSS = { after: 3, k: 1.4, min: 8, peaceMul: 0.4, peaceGap: 3, valor: 10 };
function bossDaily(s) {
  const X = T(s), B = X.boss; if (!B || B.state !== 'wait') return;
  const day = s.day || 0;
  if (day === B.day - 1 && !B.rumored) { B.rumored = true; log(s, '【傳聞】山腳獵戶說，被剿散的山寨餘黨聚在後山，揚言明日就要殺回來報仇！'); }
  if (day < B.day) return;
  if (X.pending || s.band) { B.day = day + 1; return; } // 撞上別的山賊就順延一日
  const pts = Math.max(BOSS.min, Math.round(points(s) * BOSS.k)), p = winP(s, pts);
  B.state = 'on'; X.n++;
  X.pending = { n: X.n, pts, demand: 0, p: +p.toFixed(2), at: s.t, until: s.t + RAID.wait / 4, day, noPay: true, boss: true };
  log(s, `【餘黨反撲】山寨餘黨的頭目帶人殺回山門（威脅 ${pts}），不談價錢！迎戰勝算約 ${Math.round(p * 100)}%。`);
}
export function bossEnd(s, src, win, defs = []) {
  if (!src?.boss) return; const X = T(s), B = X.boss; if (B) B.state = win ? 'won' : 'lost';
  if (win) { X.taiping = true; valorAdd(s, BOSS.valor); for (const d of defs) recordDeed(s, d, 'boss');
    recordDeed(s, null, 'taiping', { chron: `擊退山寨餘黨反撲${defs.length ? `（${defs.map((d) => d.name).join('、')}守門）` : ''}，山道永享太平` });
    log(s, `【山道永享太平】餘黨頭目授首，山路從此太平：山賊再難成氣候（威脅大減），武名 +${BOSS.valor}。`); }
  else { recordDeed(s, null, 'bossLost', { chron: '山寨餘黨反撲得手，山門受挫' }); log(s, '【餘黨反撲】這回沒擋住；若再剿寨，餘黨恐怕還會再來。'); }
}
export function threatDaily(s) {
  if (s.v22) bossDaily(s);
  rumorDaily(s);
  const X = T(s); if (X.pending || (s.day || 0) < X.next) return null;
  X.next = s.day + RAID.every + Math.floor(R(s) * (2 * RAID.jitter + 1)) - RAID.jitter;
  if (X.taiping) X.next += BOSS.peaceGap; if (s.m9) X.next += peaceDelay(s); // loop9 巡山太平→山賊延後
  let pts = points(s); if (pts <= 0) return null;
  const kind = s.m9 ? pickKind(R(s)) : null, K = kindOf(kind); if (K) pts = Math.max(1, Math.round(pts * K.pts)); // loop17 類型
  X.n++; const demand = K ? Math.round(demandOf(s, pts) * K.demand) : demandOf(s, pts), p = winP(s, pts);
  X.pending = { n: X.n, pts, demand, p: +p.toFixed(2), at: s.t, until: s.t + RAID.wait, day: s.day, ...(kind ? { kind } : {}), ...(K?.noPay ? { noPay: true } : {}) };
  if (K?.noPay) { log(s, `【${K.name}】一夥山賊（威脅 ${pts}）趁夜摸上山來，不談價錢！迎戰勝算約 ${Math.round(p * 100)}%。`); return X.pending; }
  log(s, `${K ? `【${K.name}】` : ''}【山賊勒索】一夥山賊盯上本門的家底（威脅 ${pts}）：「留下 ${demand} 兩香火錢，保你們平安。」迎戰勝算約 ${Math.round(p * 100)}%（半日內不決定就由執事代為處置）`);
  return X.pending;
}
// loop18：打贏第一波後排第二波
function nextWave(s, src, win) { const X = T(s); if (!win || !src.kind || src.wave) return; if (R(s) >= (WAVE.p[src.kind] || 0)) return;
  X.wave = { at: s.t + WAVE.gap, pts: Math.max(1, Math.round(src.pts * WAVE.k)), kind: src.kind, n: src.n, day: src.day }; log(s, `【${kindOf(src.kind).name}】山賊退到山腳重整，揚言還要再殺上來！`); }
function waveStep(s) { const X = T(s), W = X.wave; if (!W || s.t < W.at || X.pending || s.band) return; X.wave = null; const p = winP(s, W.pts);
  X.pending = { n: W.n, pts: W.pts, demand: 0, p: +p.toFixed(2), at: s.t, until: s.t + RAID.wait / 4, day: W.day, kind: W.kind, noPay: true, wave: 2 }; log(s, `【第二波】${kindOf(W.kind).name}重整殺回（威脅 ${W.pts}），不談價錢！迎戰勝算約 ${Math.round(p * 100)}%。`); }
export function threatStep(s, H) { waveStep(s); const P = T(s).pending; if (P && s.t >= P.until) raidResolve(s, raidAuto(s), H, true); }
function hurtOne(s, H) {
  const c = s.ds.filter((d) => d.role !== 'laborer' && d.adult !== false && !d.away && d.hp > RAID.hurtHp && !(d.shelter > s.t)); // 孩子不上陣；loop149 躲進屋的不算
  if (!c.length) return null; // loop32：守門原本被併進註解，無人可傷時會當掉
  const d = c[Math.floor(R(s) * c.length)]; const hh = guardHurt(d, RAID.hurtHp); d.hp = Math.min(d.hp, hh); if (hh > RAID.hurtHp) log(s, `${d.name}護體真氣擋下重擊，傷勢輕了些`); /* loop117 */ d.raidHurt = (d.raidHurt || 0) + 1; const X = T(s); X.homeHurt++; X.next = (X.next || s.day || 0) + RAID.hurtCool; H?.think?.(s, d, 'raidHurt'); return d;
}
// i：0 付錢、1 迎戰；付不起就只能迎戰
function raidLose(s, H, who) { const K = kindOf(T(s).cur), m = K?.steal ?? 1; const c = Math.floor(Math.max(0, s.res.coin) * RAID.steal.coin * m), f = Math.floor((s.res.food || 0) * RAID.steal.food * m); if (c) resAdd(s, 'coin', -c); if (f) resAdd(s, 'food', -f); const hurt = K && !K.loseHurt ? null : hurtOne(s, H); log(s, `${who}迎戰山賊——敗了：被搶走 ${c} 錢、${f} 飯${hurt ? `，${hurt.name}重傷` : ''}（不會死人）。`); return hurt; }
// loop3：地圖上的山賊；每 tick 呼叫。守柵者＝task.act 'defend' 且已在柵邊動手
export function bandStep(s, dt, H) {
  const b = s.band; if (!b) return; const X = T(s); if (b.kind || X.cur) X.cur = b.kind;
  if (b.state === 'go') { if (bandWalk(b, dt)) { b.state = 'siege'; log(s, '山賊圍住了菜園木柵，開始撞柵！'); } return; }
  const defs = s.ds.filter((d) => d.task?.act === 'defend' && d.task.phase === 'do');
  const dmg = defs.reduce((a, d) => a + defenderDps(d), 0) * dt; b.hp -= dmg; b.defDealt += dmg;
  if (b.hp <= 0) { s.band = null; X.won++; valorAdd(s, VALOR.win); s.rep = (s.rep || 0) + RAID.rep; log(s, `守柵迎敵——${defs.map((d) => d.name).join('、') || '眾人'}把山賊打退了！名聲 +${RAID.rep}。`); X.hist.push({ ...(X.cur ? { kind: X.cur } : {}), ...(b.wave ? { wave: 2 } : {}), n: b.n, day: b.day, pts: b.pts, fight: 'win', hurt: null, map: true, fence: s.fence?.hp ?? 0 }); if (s.v22) { for (const d of defs) recordDeed(s, d, 'defend'); recordDeed(s, null, 'raid', b.boss ? {} : { chron: `守柵打退山賊（${defs.map((d) => d.name).join('、') || '眾人'}）` }); } bossEnd(s, b, true, defs); nextWave(s, b, true); return; }
  b.clock += dt; if (b.clock < BAND.hitEvery) return; b.clock -= BAND.hitEvery;
  const fd = Math.max(BAND.fenceDmg.min, Math.round(b.pts * BAND.fenceDmg.k)); b.fenceDealt += fd;
  if (fenceHit(s, fd, '山賊', true).held) return;
  if (s.v22) shelterOnBreak(s, H);
  // loop14（方案 A）：柵破不再直接判敗，改回原勝率公式 winP 擲骰（與無柵同規則）
  s.band = null; const win = R(s) < winP(s, Math.max(1, b.hp)); let hurt = null; /* 用剩餘山賊戰力（守柵已削弱的部分算數） */
  if (win) { X.won++; valorAdd(s, VALOR.win); s.rep = (s.rep || 0) + RAID.rep; if (R(s) < RAID.winHurt * (kindOf(X.cur)?.winHurt ?? 1)) hurt = hurtOne(s, H); log(s, `木柵被撞破，眾人短兵相接——打退了山賊！名聲 +${RAID.rep}${hurt ? `；${hurt.name}重傷` : ''}。`); }
  else hurt = raidLose(s, H, '木柵被撞破，');
  bossEnd(s, b, win, s.ds.filter((d) => d.task?.act === 'defend'));
  X.hist.push({ ...(X.cur ? { kind: X.cur } : {}), ...(b.wave ? { wave: 2 } : {}), n: b.n, day: b.day, pts: b.pts, fight: win ? 'win' : 'lose', hurt: hurt?.id || null, map: true, broke: true }); nextWave(s, b, win);
}
// M3（loop149）柵破避難：膽小（多慮／溫和且不膽大）或真氣＋氣血都低的弟子躲進大廳／院倉，不被選為重傷者
export const SHELTER = { hpLow: 50, qiLow: 25, dur: 4 };
export const timid = (d) => (d.personality || []).includes('worrier') || ((d.personality || []).includes('gentle') && !(d.personality || []).includes('brave'));
export function shelterOnBreak(s, H) {
  const who = s.ds.filter((d) => !d.away && d.task?.act !== 'defend' && (timid(d) || (d.hp < SHELTER.hpLow && (d.qi ?? 0) < SHELTER.qiLow)));
  let i = 0; for (const d of who) { if (d.task && d.task.act !== 'shelter') cancelTask(s, d, '柵破避難'); d.shelter = s.t + SHELTER.dur; d.shelterAt = i++ % 2 ? 'court' : 'hall'; H?.think?.(s, d, 'sheltered'); }
  if (who.length) log(s, `木柵一破，${who.map((d) => d.name).join('、')}躲進大廳和院倉避風頭。`);
  return who;
}
export function raidResolve(s, i, H, auto = false) {
  const X = T(s), P = X.pending; if (!P) return { ok: false, why: '沒有山賊上門' };
  X.pending = null; const who = auto ? '執事代為決定：' : ''; if (P.kind || X.cur) X.cur = P.kind;
  if (i === 0 && !P.noPay && s.res.coin >= P.demand) { resAdd(s, 'coin', -P.demand); X.paid++; valorAdd(s, VALOR.pay); X.hist.push({ ...(X.cur ? { kind: X.cur } : {}), n: P.n, day: P.day, pts: P.pts, pay: P.demand }); log(s, `${who}付了 ${P.demand} 兩，山賊點完錢下山去了。`); return { ok: true, paid: P.demand }; }
  if (fenceUp(s)) { X.fought++; valorAdd(s, VALOR.fight); s.band = newBand(P, FENCE.node); if (P.kind) s.band.kind = P.kind; if (P.wave) s.band.wave = P.wave; if (P.boss) s.band.boss = true; log(s, `${who}決定迎戰：${P.n > 0 ? '' : ''}一夥山賊（${P.pts}）從山門朝菜園木柵殺來！`); return { ok: true, band: true }; } // loop3：有柵改上地圖
  X.fought++; valorAdd(s, VALOR.fight); const win = R(s) < P.p; let hurt = null;
  if (win) { X.won++; valorAdd(s, VALOR.win); s.rep = (s.rep || 0) + RAID.rep; if (R(s) < RAID.winHurt * (kindOf(X.cur)?.winHurt ?? 1)) hurt = hurtOne(s, H); log(s, `${who}迎戰山賊——打退了！名聲 +${RAID.rep}${hurt ? `；${hurt.name}重傷` : ''}。`); }
  else hurt = raidLose(s, H, who);
  bossEnd(s, P, win, []);
  X.hist.push({ ...(X.cur ? { kind: X.cur } : {}), ...(P.wave ? { wave: 2 } : {}), n: P.n, day: P.day, pts: P.pts, fight: win ? 'win' : 'lose', hurt: hurt?.id || null}); nextWave(s, P, win); return { ok: true, win, hurt: hurt?.id || null };
}
export function threatHtml(s) {
  const X = T(s), P = X.pending, pts = points(s), n = headcount(s);
  const head = `<div class="threat" data-threat><b>山賊</b>：${s.band ? `【${s.band.state === 'go' ? '正沿山路逼近' : '正在撞柵'}，山賊 ${Math.max(0, Math.round(s.band.hp))}/${s.band.max}】` : ''}${n < minPopOf(s) ? `門裡才 ${n} 人，山賊還看不上（${minPopOf(s)} 人起）` /* loop125：顯示用實際門檻 */ : `家底 ${Math.round(wealth(s))}，威脅 ${pts}（戰力 ${Math.round(defense(s))}）${s.rumor ? (rumorDays(s) ? `；傳聞約 ${rumorDays(s)} 日內來犯` : '；暫無風聲') : `；下次約第 ${X.next} 日`}`}・來過 ${X.n} 次（付錢 ${X.paid}／迎戰 ${X.fought}，勝 ${X.won}）・山門重傷 ${X.homeHurt}${valorHtml(s)}`;
  if (!P) return head + '</div>' + fenceHtml(s);
  return `${head}<div class="raid-ask" data-raid-ask>${kindOf(P.kind) ? `【${kindOf(P.kind).name}】${kindOf(P.kind).desc}；` : ''}${P.noPay ? '不談價錢：' : `山賊要 ${P.demand} 兩：<button data-raid="0" ${s.res.coin < P.demand ? 'disabled' : ''}>付錢了事</button>`} <button data-raid="1">迎戰（勝算 ${Math.round(P.p * 100)}%）</button></div></div>${fenceHtml(s)}`;
}

// ==== （原 lair.mjs）====
// loop19 遠征剿寨：山賊來過幾次後，執事查出山寨所在；有閒人、糧夠時自主組隊出山剿寨。
// 剿成→山賊很久不來（下次來犯延後 peaceDays）；剿敗→一人重傷、空手而回。只在 s.m9 生效（golden 不變）。
export const LAIR = { after: 3, team: 2, supply: 2, dur: DAY / 2, k: 1.0, peaceDays: 10, minHp: 60, winHurt: 0.3, cool: 5 };
const RL = (s) => { const L = s.lair; L.rng = ((L.rng || seedMix(s.seed || 1, 4219)) * 16807) % 2147483647; return L.rng / 2147483647; };
const okD = (s, d) => d.role !== 'laborer' && d.adult !== false && !d.away && d.hp > LAIR.minHp && !d.order && !s.hunt?.team?.includes(d.id);
const sumPow = (s, team) => power({ ...s, ds: team });
// loop29（選用 s.lairpow）：寨子點數＝門派最強 top 人戰力×k，不再隨財富漲；預估 隊伍≈top3 的 2/3 → p≈.6
export const LAIRP = { top: 3, k: 0.45 };
export const lairOf = (s) => s.lair || null;
// 每日呼叫：條件齊就出發
export function lairDaily(s, H) {
  if (!s.m9) return null; const X = T(s); if ((X.n || 0) < LAIR.after) return null;
  const L = (s.lair ??= { found: s.day, n: 0, won: 0, next: 0, trip: null }); if (L.found === s.day && L.n === 0 && !L.logged) { L.logged = true; log(s, '【山寨】執事打聽到山賊在後山落草的寨子了，人手夠時就去剿。'); }
  if (L.trip || s.day < L.next || X.pending || s.band || X.wave || s.exp) return null;
  const need = LAIR.team * LAIR.supply; if ((s.res.food || 0) < need + 4) return null;
  const c = s.ds.filter((d) => okD(s, d)).sort((a, b) => sumPow(s, [b]) - sumPow(s, [a])); if (c.length < LAIR.team + 1) return null; // 至少留一人看家
  let team = c.slice(0, LAIR.team); if (s.draw) { const lead = c[0], m = mates(s, lead).map((id) => c.find((d) => d.id === id)).filter(Boolean); if (m.length) team = [lead, ...m].slice(0, LAIR.team); } /* loop20 同派同行 */ const pts = s.lairpow ? Math.max(1, Math.round(sumPow(s, c.slice(0, LAIRP.top)) * LAIRP.k)) : Math.max(1, Math.round(points(s) * LAIR.k)); /* loop29 寨強看戰力（選用） */ if (pts <= 0) return null; const pow = sumPow(s, team);
  resAdd(s, 'food', -need); for (const d of team) { H?.cancelTask?.(s, d, '出山剿寨'); d.away = true; d.path = []; d.reason = '出山剿寨'; }
  L.trip = { ids: team.map((d) => d.id), pts, back: s.t + LAIR.dur, pow }; L.n++;
  log(s, `【剿寨】${team.map((d) => d.name).join('、')}帶 ${need} 份糧出山剿寨（寨中約 ${pts} 點）。`); return L.trip;
}
// 每 tick：到時間就回來結算
export function lairStep(s, H) {
  const L = s.lair, tr = L?.trip; if (!tr || s.t < tr.back) return; L.trip = null;
  const team = tr.ids.map((id) => s.ds.find((d) => d.id === id)).filter(Boolean); for (const d of team) { d.away = false; d.reason = '剿寨歸來'; if (H?.gate) d.pos = [...H.gate]; }
  const p = Math.max(0.1, Math.min(0.9, tr.pow / (tr.pow + tr.pts))), win = RL(s) < p; let hurt = null;
  if (!win || RL(s) < LAIR.winHurt) { { hurt = team[Math.floor(RL(s) * team.length)]; if (hurt) { hurt.hp = Math.min(hurt.hp, guardHurt(hurt, RAID.hurtHp)); /* loop117 */ hurt.raidHurt = (hurt.raidHurt || 0) + 1; T(s).homeHurt++; H?.think?.(s, hurt, 'raidHurt'); } } }
  const X = T(s); if (win) { L.won++; X.next = Math.max(X.next || 0, s.day) + LAIR.peaceDays; s.rep = (s.rep || 0) + RAID.rep * 2; L.next = X.next; if (s.v22) { for (const d of team) { tallyAct(d, 'lair', LAIR.dur / 4); recordDeed(s, d, 'lair'); } recordDeed(s, null, 'lair', { chron: `${team.map((d) => d.name).join('、')}大破後山山寨` }); if (!X.taiping && X.boss?.state !== 'wait' && X.boss?.state !== 'on') X.boss = { day: s.day + BOSS.after, state: 'wait' }; } log(s, `【剿寨】大破山寨！山賊作鳥獸散，至少 ${LAIR.peaceDays} 日不敢來犯。名聲 +${RAID.rep * 2}${hurt ? `；${hurt.name}重傷` : ''}。`); }
  else { L.next = s.day + LAIR.cool; log(s, `【剿寨】寨子太硬，攻不下來${hurt ? `，${hurt.name}重傷` : ''}，只好先撤回。`); }
  (L.hist ??= []).push({ day: s.day, pts: tr.pts, p: +p.toFixed(2), win, hurt: hurt?.id || null });
}
