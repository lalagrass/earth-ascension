import { log, seedMix, resAdd, recordDeed, tallyAct } from './util.mjs';
import { NODES, EDGES, DAY, FACILITIES, MOVES, ARTS } from './data.mjs';
import { noteFret, interceptOpening, breakWindup, taijiReturn, zjHas, zjMark, zjIntercept, ZJ, partHit, resolveSwing, postureOf, postureRegen, postureHit, handleTake, topTierOf, windFrac, CLASH, perfectDodge, witchK, lightCross, WITCH } from './arts.mjs';
import { qiInjuryFight28, qiInjuryAdd28, innerDrive28, mainOuter28, CHAMP28, dpsBonus, guardHurt, SPEC, zhenK, hasPoison, artById, artTier, isSwordArt, bestSpec } from './arts.mjs';
import { power } from './jianghu.mjs';
import { valorAdd, valorThreatMul, valorHtml, VALOR, def24Of } from './sect.mjs';
import { peaceDelay } from './economy.mjs';
import { mates } from './bonds.mjs';
import { cancelTask } from './core.mjs';
import { dpsOf } from './world.mjs';
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
  const S = FENCE.score, X = s.threat, rk = s.steward && X && !X.pending && X.rumorFor != null && X.rumorFor === X.next ? 1.5 : 1; /* loop119 傳聞時執事優先修柵 */ return (S.base + (1 - F.hp / F.max) * S.dmgK + (F.hp <= 0 ? S.broken : 0)) * rk;
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
export function newBand(P, to) { const path = nodePath(BAND.from, to); return { n: P.n, pts: P.pts, day: P.day, hp: P.pts, max: P.pts, pos: [...NODES[BAND.from]], path: path.slice(1), state: 'go', clock: 0, fenceDealt: 0, defDealt: 0, members: bandMembers(P.pts) }; }
/* #419 N15 山賊拆成個人：人數照威脅點數（每 BAND_MEMBER.pts 一人，2–8 人），每人血量＝點數／人數，加總恰等於點數（威脅公式不變）。
   守柵的總傷害照舊算在整夥上，再從最前面的人扣起，所以打退時間與勝負不變。 */
export const BAND_MEMBER = { pts: 40, min: 2, max: 8, ring: 4, gap: 16, outer: 64 };
export function bandMembers(pts) {
  const n = Math.max(BAND_MEMBER.min, Math.min(BAND_MEMBER.max, Math.round(pts / BAND_MEMBER.pts))), each = pts / n, out = [];
  for (let i = 0; i < n; i++) out.push({ i, uid: `bd${i}`, k: 'bandit', hp: each, max: each, pos: null, cool: BAND_CLASH.cd * (0.3 + 0.15 * i), agi: BAND_CLASH.agi[i % BAND_CLASH.agi.length] });
  return out;
}
/* #424 N18：成員各自有血量；整夥 b.hp 永遠是活著的人血量加總。舊存檔（只有 b.hp）照比例分回每人。 */
export function syncMembers(b) {
  if (!b.members) b.members = bandMembers(b.max);
  for (const m of b.members) { m.uid ??= `bd${m.i}`; m.k ??= 'bandit'; }
  const sum = b.members.reduce((a, m) => a + Math.max(0, m.hp), 0);
  if (Math.abs(sum - Math.max(0, b.hp)) > 1e-6) { let rest = Math.max(0, b.hp); for (let i = b.members.length - 1; i >= 0; i--) { const m = b.members[i]; m.hp = Math.min(m.max, rest); rest -= m.hp; } }
  return b.members;
}
const bandSum = (b) => b.members.reduce((a, m) => a + Math.max(0, m.hp), 0);
/* #424 N18 山賊逐一交手：守柵者對自己圈內的人出招（前搖、接法照 N14）；柵在時山賊只撞柵，柵破了才進院和守柵者交手（應接照 N15）。
   cd：一招間隔（守柵者照 defenderDps×cd 出傷害，總輸出與舊版相同，只是會被閃、被招架）；dmg：山賊一招打守柵者的氣血；yardMax：院內纏鬥最久幾秒，過了照舊擲勝率。 */
export const BAND_CLASH = { agi: [20, 30, 45, 55] /* 山賊的身法（輪流），#425 輕功交錯用 */, cd: 1.5, monCd: 2.5, dmg: { base: 4, per: 0.05 }, yardMax: 40, fleeSpeed: 60, sub: 0.5 };
function bandHit(s, b, m, dmg, who) {
  if (who) noteFret(s, who, 'strike');
  const spill = Math.max(0, dmg - m.hp); m.hp = Math.max(0, m.hp - dmg); if (m.hp > 0) return;
  if (spill > 0) { const nx = b.members.filter((x) => x.hp > 0).sort((x, y) => (y.foe === m.foe) - (x.foe === m.foe) || x.hp - y.hp)[0]; if (nx) bandHit(s, b, nx, spill, who); } /* 一招打倒還有餘力，順勢打到旁邊的人（總輸出與舊版相同） */
  m.state = 'down'; m.downT = s.t; m.path = nodePath(FENCE.node, BAND.from).slice(1); (s.fx ||= []).push({ kind: 'clash', word: '退', color: '#c9b37a', pos: [...(m.pos || b.pos)], ttl: 1 });
  b.downN = (b.downN || 0) + 1; if (who) log(s, `${who.name}擊退一名山賊（${b.downN}/${b.members.length}）`);
}
function bandClash(s, b, defs, dt) {
  const fight = defs.filter((d) => d.hp >= BAND.hpMin && d.pos), live = () => b.members.filter((m) => m.hp > 0);
  for (const d of fight) { postureRegen(s, d, dt); d.bcool = (d.bcool ?? 0) - dt; /* 冷卻含前搖（收招＝冷卻剩下的時間） */
    if (d.bswing) { if (s.t + 1e-9 < d.bswing.at) continue; const w = d.bswing; d.bswing = null; const m = b.members.find((x) => x.uid === w.tgt && x.hp > 0); if (!m) continue;
      const r = resolveSwing(s, d, m, () => R(s), { depth: topTierOf(d) + 1, move: w.mv, wind: w.wind, map: true }); (b.cl ??= {})[r.kind] = (b.cl[r.kind] || 0) + 1;
      if (r.kind === 'hit') { breakWindup(s, d, m, w.mv, w.wind); bandHit(s, b, m, w.dmg * (r.heavy ? CLASH.heavy : 1), d); } else (s.fx ||= []).push({ kind: 'clash', word: r.kind === 'dodge' ? '閃' : r.kind === 'parry' ? '架' : '破', color: '#ddd', pos: [...(m.pos || b.pos)], ttl: 0.6 });
      continue; }
    if (d.bcool > 0) continue;
    const mine = live().filter((m) => m.ring === 1 && m.foe === d.id), tgt = (mine.length ? mine : live()).sort((x, y) => x.hp - y.hp)[0]; if (!tgt) break;
    const wind = BAND_CLASH.cd * windFrac(topTierOf(d)); d.bcool = BAND_CLASH.cd;
    d.bswing = { mv: mainOuter28(d)?.id, tgt: tgt.uid, at: s.t + wind, wind, dmg: defenderDps(d, s) * def24Of(s) * BAND_CLASH.cd };
    (s.fx ||= []).push({ kind: 'warn', from: [...d.pos], to: [...(tgt.pos || b.pos)], r: 30, dur: wind, ttl: wind, t0: s.t });
  }
  if (b.state !== 'yard') return;
  for (const m of live()) { postureRegen(s, m, dt); const d = fight.find((x) => x.id === m.foe) || fight[0]; if (!d) break;
    const wk = witchK(s, m.pos), mdt = dt * wk; if (m.swing && wk < 1) m.swing.at += dt - mdt; /* #425 林克時間圈內的山賊放慢 */ m.cool = (m.cool ?? 0) - mdt;
    if (m.swing && d.bswing && !m.swing.x && d.bswing.tgt === m.uid && lightCross(d.skills?.agility || 0, m.agi || 0, m.swing.at, d.bswing.at, () => R(s))) { /* #425 輕功交錯：兩人同時突進、互相穿過 */
      m.swing = null; d.bswing = null; postureHit(s, m, WITCH.crossDrop); postureHit(s, d, WITCH.crossDrop); b.cross = (b.cross || 0) + 1; s.crossN = (s.crossN || 0) + 1;
      (s.fx ||= []).push({ kind: 'cross', pos: [(m.pos[0] + d.pos[0]) / 2, (m.pos[1] + d.pos[1]) / 2], ttl: 0.6 }); if (b.cross === 1) log(s, `【輕功交錯】${d.name}和一名山賊同時突進，擦身而過，火花一閃，兩人都退了半步`); continue; }
    if (m.swing) { if (s.t + 1e-9 < m.swing.at) continue; const w = m.swing; m.swing = null; handleTake(s, d);
      const r = resolveSwing(s, m, d, () => R(s), { depth: 2, wind: w.wind, opening: w.opening }); (b.cl ??= {})['m' + r.kind] = (b.cl['m' + r.kind] || 0) + 1;
      if (r.kind === 'dodge' && perfectDodge(s, d, () => R(s), { depth: 2, damage: BAND_CLASH.dmg.base + m.max * BAND_CLASH.dmg.per })) b.witch = (b.witch || 0) + 1;
      if (r.kind === 'read') bandHit(s, b, m, r.counter, d);
      if (r.kind === 'hit') { breakWindup(s, m, d, null, w.wind); let incoming = (BAND_CLASH.dmg.base + m.max * BAND_CLASH.dmg.per) * (r.heavy ? CLASH.heavy : 1);
        if (zjHas(d, 'taiji') || zjHas(d, 'taijiSword')) { const share = taijiReturn(m, null, w.wind); bandHit(s, b, m, incoming * share, d); incoming *= 1 - share; zjMark(s, d, zjHas(d, 'taiji') ? 'taiji' : 'taijiSword'); }
        if (zjHas(d, 'jiuyang')) { postureHit(s, m, ZJ.jiuyang.shock); zjMark(s, d, 'jiuyang'); }
        d.hp = Math.max(1, d.hp - incoming); (s.fx ||= []).push({ kind: 'bite', pos: [...d.pos], ttl: 0.4 }); partHit(s, d, r, { attack: m, rnd: () => R(s) }); }
      continue; }
    if (m.cool > 0 || m.ring !== 1) continue;
    if (zjIntercept(s, m, fight)) { m.cool = BAND_CLASH.monCd; continue; }
    const wind = BAND_CLASH.monCd * CLASH.monWind, start = interceptOpening(s, m, d, () => R(s), { depth: 2, wind }); m.cool = BAND_CLASH.monCd;
    if (start.read?.kind === 'read') { bandHit(s, b, m, start.read.counter, d); (b.cl ??= {}).mread = (b.cl.mread || 0) + 1; continue; }
    m.swing = { at: s.t + wind, wind, opening: start.opening };
    (s.fx ||= []).push({ kind: 'warn', from: [...(m.pos || b.pos)], to: [...d.pos], r: 26, dur: wind, ttl: wind, t0: s.t });
  }
}
/* 倒地的人沿山門那條路退走，走到盡頭就不畫了 */
function fleeStep(b, dt) { for (const m of b.members) { if (m.state !== 'down' || !m.pos) continue; let left = BAND_CLASH.fleeSpeed * dt; while (left > 0 && m.path?.length) { const t = NODES[m.path[0]], dx = t[0] - m.pos[0], dy = t[1] - m.pos[1], L = Math.hypot(dx, dy); if (L <= left) { m.pos = [...t]; m.path.shift(); left -= L; } else { m.pos[0] += dx * left / L; m.pos[1] += dy * left / L; left = 0; } } if (!m.path?.length) m.state = 'gone'; } }
/* 站位（只影響畫面）：行軍時排成一列；圍柵時每個守柵者身邊最多 ring 人，其餘在外圈繞。 */
function placeMembers(s, b, defs) {
  const live = syncMembers(b).filter((m) => m.hp > 0), c = b.pos;
  if (b.state === 'go' || !defs.length) { live.forEach((m, k) => { m.pos = [c[0] + ((k % 3) - 1) * BAND_MEMBER.gap, c[1] + Math.floor(k / 3) * 8 + (k % 3 === 1 ? 6 : 0)]; m.ring = 0; }); return; }
  live.forEach((m, k) => { if (k < BAND_MEMBER.ring * defs.length) { const d = defs[k % defs.length], a = Math.PI * (0.25 + 0.5 * Math.floor(k / defs.length)), r = b.state === 'yard' ? 22 : 34; m.pos = [d.pos[0] + Math.cos(a) * r, d.pos[1] - Math.sin(a) * r * 0.55]; m.ring = 1; m.foe = d.id; }
    else { const a = s.t * 0.6 + k; m.pos = [c[0] + Math.cos(a) * BAND_MEMBER.outer, c[1] + Math.sin(a) * BAND_MEMBER.outer * 0.5]; m.ring = 2; m.foe = null; } });
}
export const defenderDps = (d, s = { t: 0 }) => dpsOf(s, d, 'bandit');
export const canDefend = (d) => d.adult !== false && !d.away && (d.role !== 'laborer' || !!(d.hidden?.shown)) && /* loop155 隱世高人仍是幫工，但可守柵 */ d.hp >= BAND.hpMin && d.needs.energy >= BAND.energyMin;
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
  wealthRatio: 1, combatK: 0.02, /* #431：威脅戰力改讀同源 dpsOf 後，原守柵值約 6–9 而招式 DPS 可達數百；按同一量尺重校戰力權重，不改任何門派勝率 */
  adaptMin: 0.6, adaptMax: 1.2, adaptDropLoss: 0.15, adaptDropHurt: 0.10, adaptRecover: 0.05,
  logAfter: 30, logK: 0.2, hurtCool: 2, // v2.1：第 30 日後天數係數改對數；山門重傷後下次上門再晚 hurtCool 日
  demand: { base: 20, k: 0.6, coinMax: 0.35, min: 10 }, wait: DAY / 2, hurtCost: 80, hurtHp: 15, winHurt: 0.4, steal: { coin: 0.15, food: 0.2 }, rep: 3 };
export function T(s) { return (s.threat ??= { next: RAID.first, n: 0, paid: 0, fought: 0, won: 0, homeHurt: 0, deaths: 0, pending: null, rng: 0, hist: [], adapt: 1 }); }
const R = (s) => { const X = T(s); X.rng = ((X.rng || seedMix(s.seed || 1, 7477)) * 16807) % 2147483647; return X.rng / 2147483647; };
export const headcount = (s) => s.ds.filter((d) => !d.removed).length;
export function wealth(s) { const W = RAID.w, r = s.res; return Math.max(0, r.coin || 0) * W.coin + (r.food || 0) * W.food + (r.pill || 0) * W.pill + (r.herb || 0) * W.herb + FACILITIES.reduce((a, f) => a + (s.fac[f.id]?.stage || 0), 0) * W.stage; }
const linMul = (day) => Math.min(RAID.dayMax, 0.5 + day / RAID.dayK);
// 第 logAfter 日以前與舊線性相同；之後從當天的值接著以對數成長，不再爬到 dayMax。
export const dayMul = (s) => { const d = s.day || 0; if (d <= RAID.logAfter) return linMul(d); return Math.min(RAID.dayMax, linMul(RAID.logAfter) + Math.log(1 + (d - RAID.logAfter) / RAID.logAfter) * RAID.logK); };
export const minPopOf = (s) => (RAID.minPopRules);

/* 名功（secret＋classic，非合參）最高火候；沒有名功回 -1。沒有名功的門派威脅＝base 的家底項。 */
const FAMOUS_IDS = ARTS.filter((a) => a.secret && a.classic && !a.derived).map((a) => a.id);
export function famousTop(d) { let m = -1; for (const id of FAMOUS_IDS) if (d.arts?.[id]) m = Math.max(m, artTier(d, id)); return m; }
/* #412 N9：威脅來源解析（家底項與戰力項佔比） */
export function threatBreakdown(s) {
  const wTerm = (wealth(s) / RAID.div) * (RAID.wealthRatio ?? 0.6);
  const defs = s.ds.filter(canDefend);
  const cTerm = defs.reduce((a, d) => a + (famousTop(d) >= 2 ? defenderDps(d, s) * (famousTop(d) - 1) : 0), 0) * (RAID.combatK ?? 0.85);
  const tot = wTerm + cTerm;
  if (tot <= 0) return { wPct: 50, cPct: 50, wTerm: 0, cTerm: 0, text: '家底 50％、高手 50％' };
  const wPct = Math.round((wTerm / tot) * 100);
  const cPct = 100 - wPct;
  return { wPct, cPct, wTerm, cTerm, text: `家底 ${wPct}％、高手 ${cPct}％` };
}

export function points(s) {
  if (headcount(s) < minPopOf(s)) return 0;
  const X = T(s);
  const adapt = Math.max(RAID.adaptMin, Math.min(RAID.adaptMax, X.adapt ?? 1));
  const bd = threatBreakdown(s);
  const baseTerm = bd.wTerm + bd.cTerm;
  const daysAndValor = dayMul(s) * valorThreatMul(s) * (X.taiping ? BOSS.peaceMul : 1);
  return Math.min(RAID.cap, Math.round(baseTerm * daysAndValor * adapt));
}
export const defense = (s) => power(s) * def24Of(s); /* loop176 武當紫霄宮 */
export const winP = (s, pts) => { const d = defense(s), open = Math.max(0.1, Math.min(0.9, d / (d + pts))); const ready = s.ds.some(canDefend); const fence = fenceUp(s) && ready ? 0.1 + 0.8 * Math.min(1, s.fence.hp / Math.max(1, s.fence.max || 60)) : 0; return Math.max(open, fence); };
export const demandOf = (s, pts) => Math.max(RAID.demand.min, Math.round(Math.min(Math.max(0, s.res.coin) * RAID.demand.coinMax, RAID.demand.base + pts * RAID.demand.k)));
// 自動決定：比較「勒索金」與「迎戰的預期損失」＝(1−勝率)×(被搶的錢＋糧＋一人重傷折 hurtCost)；勒索金較小且付得起才付
export const fightLoss = (s, p) => (1 - p) * (Math.max(0, s.res.coin) * RAID.steal.coin + (s.res.food || 0) * RAID.steal.food + RAID.hurtCost);
// loop4：有柵時執事先估「守方打光山賊」是否快過「山賊撞破柵」，快就迎戰；否則照舊比較
export function fenceHolds(s, pts) { if (!fenceUp(s)) return false; const dps = s.ds.filter(canDefend).reduce((a, d) => a + defenderDps(d, s), 0) * def24Of(s); /* loop183 */ if (dps <= 0) return false;
  const fd = Math.max(BAND.fenceDmg.min, Math.round(pts * BAND.fenceDmg.k)) / BAND.hitEvery; return pts / dps < s.fence.hp / fd; }
export const raidAuto = (s) => { const P = T(s).pending; if (P?.noPay) return 1; if (P && fenceHolds(s, P.pts)) return 1; return P && s.res.coin >= P.demand && P.demand < fightLoss(s, P.p) ? 0 : 1; };
// 每日一次（sim 換日時呼叫）：到期就看點數，>0 才上門
// loop119 傳聞預警：寨匪來前 RUMOR.lead 日內寫一條茶攤傳聞；不用亂數（不改寨匪結果）。只說「約幾日」，不說點數與種類
export const RUMOR = { lead: 2, fenceK: 1.5 };
export const rumorDays = (s) => { const X = T(s); return !X.pending && X.rumorFor != null && X.rumorFor === X.next ? Math.max(1, X.next - (s.day || 0)) : 0; };
function rumorDaily(s) {
  const X = T(s); if (X.pending || X.rumorFor === X.next) return; const left = X.next - (s.day || 0);
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
  bossDaily(s);
  rumorDaily(s);
  const X = T(s);
  if (X.adapt == null) X.adapt = 1;
  else if (X.adapt < 1) X.adapt = Math.min(1, +(X.adapt + (RAID.adaptRecover ?? 0.05)).toFixed(2));
  else if (X.adapt > 1) X.adapt = Math.max(1, +(X.adapt - (RAID.adaptRecover ?? 0.05)).toFixed(2));
  if (X.pending || (s.day || 0) < X.next) return null;
  X.next = s.day + RAID.every + Math.floor(R(s) * (2 * RAID.jitter + 1)) - RAID.jitter;
  if (X.taiping) X.next += BOSS.peaceGap; X.next += peaceDelay(s); // loop9 巡山太平→山賊延後
  let pts = points(s); if (pts <= 0) return null;
  const kind = pickKind(R(s)), K = kindOf(kind); if (K) pts = Math.max(1, Math.round(pts * K.pts)); // loop17 類型
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
  const c = s.ds.filter((d) => d.role !== 'laborer' && d.adult !== false && !d.away && d.hp > RAID.hurtHp && !(d.shelter > s.t)); // 孩子不上陣；loop148 躲進屋的不算
  if (!c.length) return null; // loop32：守門原本被併進註解，無人可傷時會當掉
  const d = c[Math.floor(R(s) * c.length)]; const hh = guardHurt(d, RAID.hurtHp); d.hp = Math.min(d.hp, hh); if (hh > RAID.hurtHp) log(s, `${d.name}護體真氣擋下重擊，傷勢輕了些`); /* loop117 */ d.raidHurt = (d.raidHurt || 0) + 1; const X = T(s); X.homeHurt++; X.next = (X.next || s.day || 0) + RAID.hurtCool;
  X.adapt = Math.max(RAID.adaptMin, +((X.adapt ?? 1) - (RAID.adaptDropHurt ?? 0.10)).toFixed(2));
  H?.think?.(s, d, 'raidHurt'); return d;
}
// i：0 付錢、1 迎戰；付不起就只能迎戰
function raidLose(s, H, who) {
  const X = T(s);
  X.adapt = Math.max(RAID.adaptMin, +((X.adapt ?? 1) - (RAID.adaptDropLoss ?? 0.15)).toFixed(2));
  const K = kindOf(X.cur), m = K?.steal ?? 1; const c = Math.floor(Math.max(0, s.res.coin) * RAID.steal.coin * m), f = Math.floor((s.res.food || 0) * RAID.steal.food * m); if (c) resAdd(s, 'coin', -c); if (f) resAdd(s, 'food', -f); const hurt = K && !K.loseHurt ? null : hurtOne(s, H); log(s, `${who}迎戰山賊——敗了：被搶走 ${c} 錢、${f} 飯${hurt ? `，${hurt.name}重傷` : ''}（不會死人）。`); return hurt;
}
// loop3：地圖上的山賊；每 tick 呼叫。守柵者＝task.act 'defend' 且已在柵邊動手
export function bandStep(s, dt, H) {
  const b = s.band; if (!b) return; const X = T(s); if (b.kind || X.cur) X.cur = b.kind;
  if (b.state === 'go') { if (bandWalk(b, dt)) { b.state = fenceUp(s) ? 'siege' : 'yard'; b.yardT = 0; log(s, b.state === 'siege' ? '山賊圍住了菜園木柵，開始撞柵！' : '山賊從山門闖進院裡，和守門弟子交手！'); } placeMembers(s, b, []); return; }
  const defs = s.ds.filter((d) => d.task?.act === 'defend' && d.task.phase === 'do');
  if (hasPoison(s, defs)) b.psn = s.t + SPEC.poisonT; /* loop151 毒術：守柵者中有毒術者，山賊中毒 */
  syncMembers(b); const hp0 = bandSum(b);
  for (let left = dt; left > 1e-9; left -= BAND_CLASH.sub) { const st = Math.min(BAND_CLASH.sub, left); placeMembers(s, b, defs.filter((d) => d.hp >= BAND.hpMin)); bandClash(s, b, defs, st); fleeStep(b, st); } /* #424 N18 逐一交手（loop183 紫霄宮守柵在 bandClash 的傷害裡） */
  if (b.psn > s.t) { const f = b.members.find((m) => m.hp > 0); if (f) bandHit(s, b, f, SPEC.poisonDps * (s.psnK24 || 1) * dt, null); }
  b.hp = bandSum(b); b.defDealt += hp0 - b.hp;
  if (b.state === 'yard') { b.yardT = (b.yardT || 0) + dt; const fit = defs.some((d) => d.hp >= BAND.hpMin), ready = s.ds.some(canDefend);
    if (b.hp > 0 && b.yardT < BAND_CLASH.yardMax && (fit || ready)) return;
    s.band = null; const win = b.hp <= 0 || (!ready && R(s) < winP(s, Math.max(1, b.hp))); let hurt = null; qiInjuryFight28(s, defs, log);
    if (win) { X.won++; valorAdd(s, VALOR.win); s.rep = (s.rep || 0) + RAID.rep; if (R(s) < RAID.winHurt * (kindOf(X.cur)?.winHurt ?? 1)) hurt = hurtOne(s, H); log(s, `眾人在院裡和山賊一個個交手——打退了山賊！名聲 +${RAID.rep}${hurt ? `；${hurt.name}重傷` : ''}。`); }
    else hurt = raidLose(s, H, '院內交手，');
    bossEnd(s, b, win, defs); X.hist.push({ ...(X.cur ? { kind: X.cur } : {}), ...(b.wave ? { wave: 2 } : {}), n: b.n, day: b.day, pts: b.pts, fight: win ? 'win' : 'lose', hurt: hurt?.id || null, map: true, broke: !!s.fence }); nextWave(s, b, win); return; }
  if (b.hp <= 0) { qiInjuryFight28(s, defs, log); /* loop186 守柵實戰 */ s.band = null; X.won++; valorAdd(s, VALOR.win); s.rep = (s.rep || 0) + RAID.rep; log(s, `守柵迎敵——${defs.map((d) => d.name).join('、') || '眾人'}把山賊打退了！名聲 +${RAID.rep}。`); X.hist.push({ ...(X.cur ? { kind: X.cur } : {}), ...(b.wave ? { wave: 2 } : {}), n: b.n, day: b.day, pts: b.pts, fight: 'win', hurt: null, map: true, fence: s.fence?.hp ?? 0 }); for (const d of defs) recordDeed(s, d, 'defend'); recordDeed(s, null, 'raid', b.boss ? {} : { chron: `守柵打退山賊（${defs.map((d) => d.name).join('、') || '眾人'}）` }); bossEnd(s, b, true, defs); nextWave(s, b, true); return; }
  b.clock += dt; if (b.clock < BAND.hitEvery) return; b.clock -= BAND.hitEvery;
  const fd0 = Math.max(BAND.fenceDmg.min, Math.round(b.pts * BAND.fenceDmg.k)), fd = Math.max(1, Math.round(fd0 * (1 - SPEC.zhenMit * zhenK(s)) * (b.psn > s.t ? 1 - SPEC.poisonWeak : 1))); b.fenceDealt += fd; /* loop151 陣法護柵 */
  if (fenceHit(s, fd, '山賊', true).held) return;
  shelterOnBreak(s, H);
  /* #424 N18：柵破了山賊進院，守柵者還站得住就一個個交手（上面 yard 分支結算）；沒人守才照舊擲勝率 */
  if (defs.some((d) => d.hp >= BAND.hpMin)) { b.state = 'yard'; b.yardT = 0; log(s, '山賊衝進菜園，和守柵的人短兵相接！'); return; }
  // loop14（方案 A）：柵破不再直接判敗，改回原勝率公式 winP 擲骰（與無柵同規則）
  s.band = null; const win = R(s) < winP(s, Math.max(1, b.hp)); let hurt = null; qiInjuryFight28(s, s.ds.filter((d) => d.task?.act === 'defend'), log); /* loop186 */ /* 用剩餘山賊戰力（守柵已削弱的部分算數） */
  if (win) { X.won++; valorAdd(s, VALOR.win); s.rep = (s.rep || 0) + RAID.rep; if (R(s) < RAID.winHurt * (kindOf(X.cur)?.winHurt ?? 1)) hurt = hurtOne(s, H); log(s, `木柵被撞破，眾人短兵相接——打退了山賊！名聲 +${RAID.rep}${hurt ? `；${hurt.name}重傷` : ''}。`); }
  else hurt = raidLose(s, H, '木柵被撞破，');
  bossEnd(s, b, win, s.ds.filter((d) => d.task?.act === 'defend'));
  X.hist.push({ ...(X.cur ? { kind: X.cur } : {}), ...(b.wave ? { wave: 2 } : {}), n: b.n, day: b.day, pts: b.pts, fight: win ? 'win' : 'lose', hurt: hurt?.id || null, map: true, broke: true }); nextWave(s, b, win);
}
// M3（loop148）柵破避難：膽小（多慮／溫和且不膽大）或真氣＋氣血都低的弟子躲進大廳／院倉，不被選為重傷者
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
  if (s.ds.some(canDefend)) { X.fought++; valorAdd(s, VALOR.fight); s.band = newBand(P, FENCE.node); if (P.kind) s.band.kind = P.kind; if (P.wave) s.band.wave = P.wave; if (P.boss) s.band.boss = true; log(s, `${who}決定迎戰：一夥山賊（${P.pts}）從山門朝${fenceUp(s) ? '菜園木柵' : '院裡'}殺來！`); return { ok: true, band: true }; }
  X.fought++; valorAdd(s, VALOR.fight); const win = R(s) < P.p; let hurt = null; qiInjuryFight28(s, s.ds.filter(canDefend), log); /* loop186 迎戰實戰 */
  if (win) { X.won++; valorAdd(s, VALOR.win); s.rep = (s.rep || 0) + RAID.rep; if (R(s) < RAID.winHurt * (kindOf(X.cur)?.winHurt ?? 1)) hurt = hurtOne(s, H); log(s, `${who}迎戰山賊——打退了！名聲 +${RAID.rep}${hurt ? `；${hurt.name}重傷` : ''}。`); }
  else hurt = raidLose(s, H, who);
  bossEnd(s, P, win, []);
  X.hist.push({ ...(X.cur ? { kind: X.cur } : {}), ...(P.wave ? { wave: 2 } : {}), n: P.n, day: P.day, pts: P.pts, fight: win ? 'win' : 'lose', hurt: hurt?.id || null}); nextWave(s, P, win); return { ok: true, win, hurt: hurt?.id || null };
}
/* loop148 v2.25（決定 142）：探明山寨後在山賊欄多一行狀態。只用玩家已在日誌看過的事：是否出征中、破寨／失手次數、是否已太平。 */
export function lairLine(s) {
  const L = s.lair; if (!L) return ''; const X = T(s), lost = Math.max(0, (L.n || 0) - (L.won || 0));
  const st = L.trip ? '正在攻寨中' : X.taiping ? `已破 ${L.won} 次，山道永享太平` : [L.won ? `已破 ${L.won} 次` : '', lost ? `失手 ${lost} 次` : '', '待精銳與存糧齊備時出擊'].filter(Boolean).join('，');
  return `<div class="k" data-lair>・後山山寨：已探明（${st}）</div>`;
}
export function threatHtml(s) {
  const X = T(s), P = X.pending, pts = points(s), n = headcount(s);
  const bd = threatBreakdown(s);
  const head = `<div class="threat" data-threat><b>山賊</b>：${s.band ? `【${s.band.state === 'go' ? '正沿山路逼近' : '正在撞柵'}，山賊 ${Math.max(0, Math.round(s.band.hp))}/${s.band.max}】` : ''}${n < minPopOf(s) ? `門裡才 ${n} 人，山賊還看不上（${minPopOf(s)} 人起）` /* loop125：顯示用實際門檻 */ : `家底 ${Math.round(wealth(s))}，威脅 ${pts}（${bd.text}・戰力 ${Math.round(defense(s))}）${(rumorDays(s) ? `；傳聞約 ${rumorDays(s)} 日內來犯` : '；暫無風聲')}`}・來過 ${X.n} 次（付錢 ${X.paid}／迎戰 ${X.fought}，勝 ${X.won}）・山門重傷 ${X.homeHurt}${valorHtml(s)}`;
  const lr = lairLine(s) + crusadeHtml27(s); /* loop179 */
  if (!P) return head + lr + '</div>' + fenceHtml(s);
  return `${head}${lr}<div class="raid-ask" data-raid-ask>${kindOf(P.kind) ? `【${kindOf(P.kind).name}】${kindOf(P.kind).desc}；` : ''}${P.noPay ? '不談價錢：' : `山賊要 ${P.demand} 兩：<button data-raid="0" ${s.res.coin < P.demand ? 'disabled' : ''}>付錢了事</button>`} <button data-raid="1">迎戰（勝算 ${Math.round(P.p * 100)}%）</button></div></div>${fenceHtml(s)}`;
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
   const X = T(s); if ((X.n || 0) < LAIR.after) return null;
  const L = (s.lair ??= { found: s.day, n: 0, won: 0, next: 0, trip: null }); if (L.found === s.day && L.n === 0 && !L.logged) { L.logged = true; log(s, '【山寨】執事打聽到山賊在後山落草的寨子了，人手夠時就去剿。'); }
  if (L.trip || s.day < L.next || X.pending || s.band || X.wave || s.exp) return null;
  const need = LAIR.team * LAIR.supply; if ((s.res.food || 0) < need + 4) return null;
  const c = s.ds.filter((d) => okD(s, d)).sort((a, b) => sumPow(s, [b]) - sumPow(s, [a])); if (c.length < LAIR.team + 1) return null; // 至少留一人看家
  let team = c.slice(0, LAIR.team); { const lead = c[0], m = mates(s, lead).map((id) => c.find((d) => d.id === id)).filter(Boolean); if (m.length) team = [lead, ...m].slice(0, LAIR.team); } /* loop20 同派同行 */ const pts = Math.max(1, Math.round(sumPow(s, c.slice(0, LAIRP.top)) * LAIRP.k)); /* loop29 寨強看戰力（選用） */ if (pts <= 0) return null; const pow = sumPow(s, team);
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
  const X = T(s); if (win) { L.won++; X.next = Math.max(X.next || 0, s.day) + LAIR.peaceDays; s.rep = (s.rep || 0) + RAID.rep * 2; L.next = X.next; for (const d of team) { tallyAct(d, 'lair', LAIR.dur / 4); recordDeed(s, d, 'lair'); } recordDeed(s, null, 'lair', { chron: `${team.map((d) => d.name).join('、')}大破後山山寨` }); if (!X.taiping && X.boss?.state !== 'wait' && X.boss?.state !== 'on') X.boss = { day: s.day + BOSS.after, state: 'wait' }; log(s, `【剿寨】大破山寨！山賊作鳥獸散，至少 ${LAIR.peaceDays} 日不敢來犯。名聲 +${RAID.rep * 2}${hurt ? `；${hurt.name}重傷` : ''}。`); }
  else { L.next = s.day + LAIR.cool; log(s, `【剿寨】寨子太硬，攻不下來${hurt ? `，${hurt.name}重傷` : ''}，只好先撤回。`); }
  (L.hist ??= []).push({ day: s.day, pts: tr.pts, p: +p.toFixed(2), win, hurt: hurt?.id || null });
}

// ==== loop177 v2.7 Batch 1：正邪波次人海引擎。亂數一律用 FNV 雜湊（hh27），不碰山賊 R(s)／山寨 RL(s) 亂數流 ====
export const hh27 = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
/* 正邪鏡像：本門為明教／星宿 → 六大派聯軍；其餘 → 黑木崖魔教。n＝每波人數（割草數上限） */
export const MOJIAO27 = {
  mojiao: { name: '黑木崖魔教', unit: '教眾', waves: [{ name: '魔教外圍教眾', n: 80 }, { name: '風雷堂百人刀陣', n: 100 }, { name: '魔教十長老', n: 10 }, { name: '光明右使與黑木崖護法', n: 3 }] },
  zhengpai: { name: '六大派圍剿聯軍', unit: '敵眾', waves: [{ name: '五嶽外門弟子潮', n: 80 }, { name: '少林羅漢刀棍陣', n: 108 }, { name: '崑崙崆峒長老', n: 10 }, { name: '嵩山十三太保', n: 13 }] },
  mirror: ['mingjiao', 'xingxiu'] };
export const foe27 = (s) => MOJIAO27[MOJIAO27.mirror.includes(s.sect?.id) ? 'zhengpai' : 'mojiao'];
/* 調參：aoe 1.45 起、每多一項條件 +0.2、上限 1.85；第 3 波起（長老／護法非人海）只取一半增幅。菁英 ≤6 人 ×1.2；合圍 ≥7 人每人 +5%、上限 +50% */
export const WAVE27 = { aoeMove: 50, aoeBase: 1.45, aoeStep: 0.2, aoeMax: 1.85, lateK: 0.5, eliteMax: 8, /* loop183 v2.8 孤峰死戰 ≤6→≤8 */ elite: 1.2, swarmFrom: 7, swarmStep: 0.05, swarmMax: 0.5,
  tire: 0.88, heal: 0.08, healSpec: 30, healArts: ['linjiZhuang', 'jiuyang', 'emeiJiuyang', 'zixia', 'wudangJiuyang'], fence: 0.08, fenceLv: 0.04, pMin: 0.1, pMax: 0.95, hurtWin: 0.3, hurtHp: 45,
  eliteArts: ['zixia', 'dugu', 'taijiSword', 'huifengSword', 'xianglong', 'jiuyang'] };
const hasAoe27 = (d) => (d.moves || []).some((id) => (MOVES.find((m) => m.id === id)?.aoe || 0) >= WAVE27.aoeMove);
const eliteArt27 = (d) => Object.keys(d.arts || {}).some((id) => WAVE27.eliteArts.includes(id) || artById(id)?.chiefOnly24);
const bigSword27 = (d) => Object.keys(d.arts || {}).some((id) => isSwordArt(id) && (artById(id)?.grade || 0) >= 3 && artTier(d, id) >= 0);
export function aoeCleaveMul(d, w = 0) {
  const q = (hasAoe27(d) ? 1 : 0) + (eliteArt27(d) ? 1 : 0) + (bigSword27(d) ? 1 : 0), o = mainOuter28(d), add = (d.champ28 || (o && innerDrive28(d, o).tier === 1)) ? CHAMP28.aoe : 0; /* loop183 本門正宗催動或當屆大比首徒 +0.25 */
  if (!q) return 1 + add; const m = Math.min(WAVE27.aoeMax, WAVE27.aoeBase + WAVE27.aoeStep * (q - 1)); return (w >= 2 ? 1 + (m - 1) * WAVE27.lateK : m) + add;
}
export const crowdSwarmMul = (team) => { const n = team.length; return n < WAVE27.swarmFrom ? 1 : 1 + Math.min(WAVE27.swarmMax, WAVE27.swarmStep * (n - WAVE27.swarmFrom + 1)); };
export const eliteMul27 = (s) => (s.ds.filter((d) => d.role !== 'laborer' && d.adult !== false && !d.removed).length <= WAVE27.eliteMax ? WAVE27.elite : 1);
/* 單人戰力：同 jianghu.power 的單人算法（隱世幫工、出征中的人也算） */
export const pow27 = (s, d) => power({ ...s, ds: [{ ...d, role: d.role === 'laborer' ? 'inner' : d.role, away: false }] });
export function wavePower27(s, team, w = 0) {
  const parts = team.map((d) => [d, pow27(s, d) * aoeCleaveMul(d, w)]), k = crowdSwarmMul(team) * eliteMul27(s);
  return { pow: parts.reduce((a, [, p]) => a + p, 0) * k, parts, k };
}
/* 連戰：spec＝{ key, waves:[{name,n,E}], home }。逐波 p＝P²/(P²+E²)（夾 0.1–0.95），P 乘疲勞；勝波人數依戰力×割草倍率分給 kills；敗波只算 p×一半 */
export function waveBattle27(s, team, spec) {
  const kills = new Map(team.map((d) => [d.id, 0])); let tire = 1, won = 0, healed = 0; const heal = team.some((d) => (bestSpec(s, 'yishu', [d]) >= WAVE27.healSpec) || WAVE27.healArts.some((id) => d.arts?.[id]));
  const out = { waves: [], n: team.length }; for (const d of team) { const w = qiInjuryAdd28(s, d); if (w) log(s, `【經脈暗傷】${d.name}強以異種內息催動他派武學《${w.name}》，真氣逆行，經脈隱隱作痛！`); } /* loop181 參戰亦累積逆催內傷 */
  for (let w = 0; w < spec.waves.length; w++) {
    const W = spec.waves[w], P0 = wavePower27(s, team, w), P = P0.pow * tire * (spec.home ? def24Of(s) : 1); /* loop183 紫霄宮守禦也護圍山 */ let E = W.E;
    if (spec.home) { if (fenceUp(s)) E *= 1 - WAVE27.fence - WAVE27.fenceLv * ((s.fence.lv || 1) - 1); E *= 1 - SPEC.zhenMit * zhenK(s, team); }
    const p = Math.max(WAVE27.pMin, Math.min(WAVE27.pMax, P * P / (P * P + E * E))), win = hh27(`${s.seed}:${spec.key}:${w}`) < p;
    const tot = win ? W.n : Math.floor(W.n * p * 0.5), sum = P0.parts.reduce((a, [, x]) => a + x, 0) || 1;
    const share = P0.parts.map(([d, x]) => [d, (tot * x) / sum]); let given = 0; for (const [d, x] of share) { const k2 = Math.floor(x); kills.set(d.id, kills.get(d.id) + k2); given += k2; }
    for (const [d] of [...share].sort((a, b) => (b[1] % 1) - (a[1] % 1)).slice(0, tot - given)) kills.set(d.id, kills.get(d.id) + 1);
    out.waves.push({ name: W.name, E: Math.round(E), P: Math.round(P), p: +p.toFixed(2), win, kills: tot });
    if (!win) break; won++; tire *= WAVE27.tire; if (heal && w < spec.waves.length - 1) { tire = Math.min(1, tire + WAVE27.heal); healed++; }
  }
  out.won = won; out.win = won === spec.waves.length; out.healed = healed; out.kills = Object.fromEntries(kills); out.total = [...kills.values()].reduce((a, b) => a + b, 0);
  const mvp = team.reduce((m, d) => (!m || kills.get(d.id) > kills.get(m.id) ? d : m), null); out.mvp = mvp && kills.get(mvp.id) > 0 ? mvp : null;
  return out;
}
// ==== loop178 v2.7 Batch 2：魔教大軍圍山（第 18 日前鋒三波、第 27 日十長老四波）；前一日茶攤預警；全派 canDefend（含已揭露隱世幫工）不限人數迎戰 ====
/* E＝各波敵勢，以 loop177 量測（bot 局第 18 日單人戰力合計 ≈2300、第 27 日 ≈3400，合圍 ×1.5）定錨，目標整場勝率約六成 */
export const SIEGE27 = { days: { 18: { title: '魔教前鋒叩關', E: [900, 1300, 1700] }, 27: { title: '魔教十長老圍山', E: [1000, 1330, 1750, 2140] } /* loop183 v2.8 約 −12%；loop188 v2.9 再 −5% */ },
  win: { coin: 50, lingshi: 1, valor: 12, rep: 12, mood: 10 }, loseRep: 3, fenceK: 0.3 };
const NUM27 = ['一', '二', '三', '四'];
export const s27 = (s) => (s.v27n ??= { siege: {}, crusade: [] });
export function siegeTeam27(s) { return s.ds.filter((d) => !d.removed && canDefend(d)); }
export function mojiaoSiege27(s, day) {
  const C = SIEGE27.days[day], F = foe27(s), team = siegeTeam27(s), N = s27(s); if (!C || N.siege[day]) return null;
  if (!team.length) { N.siege[day] = { n: 0, win: false, won: 0, total: 0 }; log(s, `【${C.title}】${F.name}殺到山門，門內竟無人能戰，只得緊閉山門任其叫罵一番退去。`); return N.siege[day]; }
  const waves = C.E.map((E, i) => ({ ...F.waves[i], E })), r = waveBattle27(s, team, { key: `siege27:${day}`, waves, home: true }), mvp = r.mvp, mk = mvp ? r.kills[mvp.id] : 0;
  N.siege[day] = { n: team.length, win: r.win, won: r.won, total: r.total, mvp: mvp?.name || null, mvpKills: mk, healed: r.healed };
  if (r.win) { const W = SIEGE27.win; resAdd(s, 'coin', W.coin); resAdd(s, 'lingshi', W.lingshi); valorAdd(s, W.valor); s.rep = (s.rep || 0) + W.rep; for (const d of s.ds) d.mood = Math.min(100, (d.mood || 0) + W.mood);
    const txt = `【${C.title}】全派 ${team.length} 人迎戰，${mvp ? `${mvp.name}${aoeCleaveMul(mvp, 0) > 1 ? '劍氣縱橫' : '奮勇當先'}連斬 ${mk} 名${F.unit}，` : ''}連破${F.name}${NUM27[waves.length - 1]}波人海！`;
    log(s, `${txt}賞銀 +${W.coin}、靈石 +${W.lingshi}、名聲 +${W.rep}、武名 +${W.valor}，全派心情 +${W.mood}。`);
    if (mvp) recordDeed(s, mvp, 'siege', { kills: mk, chron: `${C.title}：全派 ${team.length} 人擊退${F.name}，${mvp.name}斬敵 ${mk}` }); else recordDeed(s, null, 'siege', { chron: `${C.title}：全派擊退${F.name}` });
    return N.siege[day]; }
  const rep = SIEGE27.loseRep * r.won; s.rep = (s.rep || 0) + rep; if (fenceUp(s)) fenceHit(s, Math.max(1, Math.round(s.fence.max * SIEGE27.fenceK)), F.name, true);
  const hurt = team[Math.floor(hh27(`${s.seed}:siege27hurt:${day}`) * team.length)]; if (hurt) { hurt.hp = Math.min(hurt.hp, WAVE27.hurtHp); hurt.raidHurt = (hurt.raidHurt || 0) + 1; }
  log(s, `【${C.title}】全派 ${team.length} 人迎戰，${r.won ? `擋下前 ${r.won} 波，` : ''}第${NUM27[r.won]}波「${waves[r.won].name}」沒能撐住，只得退守內院。${rep ? `名聲 +${rep}；` : ''}${fenceUp(s) || s.fence ? '柵欄受損；' : ''}${hurt ? `${hurt.name}輕傷` : ''}（無人身亡）。`);
  recordDeed(s, null, 'siegeLost', { chron: `${C.title}：${F.name}攻破第 ${r.won + 1} 波防線` }); return N.siege[day];
}
export function siegeDaily27(s) {
   const day = s.day || 0, N = s27(s);
  const nx = SIEGE27.days[day + 1]; if (nx && !N['r' + (day + 1)]) { N['r' + (day + 1)] = 1; log(s, `【傳聞】山下茶攤有人說，${foe27(s).name}的人馬已在山腳集結，怕是明日就要殺上山來（${nx.title}）！`); }
  return SIEGE27.days[day] ? mojiaoSiege27(s, day) : null;
}
// ==== loop179 v2.7 Batch 3：全派傾巢討伐魔教分舵（不限人數，只留 1 人看門）；第 12 日起、名聲 ≥15、冷卻 8 日 ====
/* E 以出發日縮放：E×(1+(日−12)/CRU27.dayK)。auto：執事在 13–14、22–23 日、存糧 ≥14、預估全勝率 ≥ autoP 時自動出兵 */
export const CRU27 = { day: 12, rep: 15, cool: 8, foodMax: 8, dur: DAY / 2, minHp: 60, minTeam: 2, E: [400, 600, 780, 1000], dayK: 20, autoDays: [13, 14, 22, 23], autoFood: 14, autoSpare: 2, autoP: 0.5,
  waves: ['分舵外哨嘍囉群', '百人堂口', '護法刀陣', '分舵主'], n: [60, 100, 12, 1], win: { coin: 55, lingshi: 1, page2: 1, rep: 15 }, loseRep: 2 };
const cruOk = (s, d) => d.role !== 'laborer' && d.adult !== false && !d.away && !d.removed && d.hp > CRU27.minHp && !d.order && !s.hunt?.team?.includes(d.id);
export function crusadeTeam27(s) { const c = s.ds.filter((d) => cruOk(s, d)).sort((a, b) => pow27(s, b) - pow27(s, a)); return c.slice(0, Math.max(0, c.length - 1)); /* 最弱的一人留守山門 */ }
export function canCrusade27(s) {
   const N = s27(s), day = s.day || 0;
  if (day < CRU27.day) return { ok: false, why: `第 ${CRU27.day} 日起才打聽得到分舵所在` };
  if ((s.rep || 0) < CRU27.rep) return { ok: false, why: `名聲不足（${Math.floor(s.rep || 0)}/${CRU27.rep}）` };
  if (N.cru) return { ok: false, why: '弟子正在討伐途中' }; if (day < (N.cNext || 0)) return { ok: false, why: `剛討伐過，第 ${N.cNext} 日後再議` };
  if (s.exp || s.lair?.trip || T(s).pending || s.band) return { ok: false, why: '門內另有要事（出征／剿寨／山賊）' };
  const team = crusadeTeam27(s); if (team.length < CRU27.minTeam) return { ok: false, why: '可出動的健康弟子不足' };
  const food = Math.min(CRU27.foodMax, team.length); if ((s.res.food || 0) < food) return { ok: false, why: `存糧不足（${Math.floor(s.res.food || 0)}/${food}）` };
  return { ok: true, team, food };
}
const cruWaves27 = (s, day) => CRU27.E.map((E, i) => ({ name: CRU27.waves[i], n: CRU27.n[i], E: Math.round(E * (1 + Math.max(0, day - CRU27.day) / CRU27.dayK)) }));
/* 執事用的預估全勝率（不擲骰）：各波 p 連乘，含疲勞 */
export function crusadeOdds27(s, team = crusadeTeam27(s)) { let pr = 1, tire = 1; cruWaves27(s, s.day || 0).forEach((W, w) => { const P = wavePower27(s, team, w).pow * tire; pr *= Math.max(WAVE27.pMin, Math.min(WAVE27.pMax, P * P / (P * P + W.E * W.E))); tire *= WAVE27.tire; }); return pr; }
export function startCrusade27(s, H, auto = false) {
  const c = canCrusade27(s); if (!c.ok) return c; const N = s27(s); resAdd(s, 'food', -c.food);
  for (const d of c.team) { H?.cancelTask?.(s, d, '傾巢討伐'); d.away = true; d.path = []; d.reason = '討伐魔教分舵'; }
  N.cru = { ids: c.team.map((d) => d.id), back: s.t + CRU27.dur, day: s.day, auto: !!auto }; N.cNext = (s.day || 0) + CRU27.cool;
  log(s, `【傾巢討伐】${auto ? '執事調度：' : ''}全派 ${c.team.length} 人帶 ${c.food} 份糧下山，討伐${foe27(s).name}分舵（${c.team.map((d) => d.name).join('、')}），留人看守山門。`);
  return { ok: true, n: c.team.length };
}
export function crusadeStep27(s, H) {
  const N = s.v27n, C = N?.cru; if (!C || s.t < C.back) return null; N.cru = null;
  const team = C.ids.map((id) => s.ds.find((d) => d.id === id)).filter(Boolean); for (const d of team) { d.away = false; d.reason = '討伐歸來'; if (H?.gate) d.pos = [...H.gate]; }
  const F = foe27(s), r = waveBattle27(s, team, { key: `crusade27:${C.day}`, waves: cruWaves27(s, C.day) }), mvp = r.mvp, mk = mvp ? r.kills[mvp.id] : 0;
  const rec = { day: C.day, n: team.length, win: r.win, won: r.won, total: r.total, auto: C.auto, mvp: mvp?.name || null, mk }; N.crusade.push(rec);
  if (r.win) { const W = CRU27.win; resAdd(s, 'coin', W.coin); resAdd(s, 'lingshi', W.lingshi); resAdd(s, 'page2', W.page2); s.rep = (s.rep || 0) + W.rep;
    for (const d of team) { tallyAct(d, 'lair', CRU27.dur / 4); recordDeed(s, d, 'crusade', { kills: r.kills[d.id] || 0 }); }
    if (mvp) recordDeed(s, mvp, 'crusadeMvp', { kills: mk });
    recordDeed(s, null, 'crusade', { chron: `全派 ${team.length} 人傾巢討伐${F.name}分舵，連破四波${mvp ? `，${mvp.name}斬敵 ${mk}` : ''}` });
    log(s, `【傾巢討伐】全派 ${team.length} 人連闖分舵四波，${mvp ? `${mvp.name}${aoeCleaveMul(mvp, 0) > 1 ? '橫掃千軍' : '身先士卒'}斬敵 ${mk}，` : ''}大破${F.name}分舵！奪回銀兩 +${W.coin}、靈石 +${W.lingshi}、精階殘頁 +${W.page2}，名聲 +${W.rep}。`); return rec; }
  const rep = CRU27.loseRep * r.won; s.rep = (s.rep || 0) + rep; const hurt = team[Math.floor(hh27(`${s.seed}:crusade27hurt:${C.day}`) * team.length)]; if (hurt) { hurt.hp = Math.min(hurt.hp, WAVE27.hurtHp); hurt.raidHurt = (hurt.raidHurt || 0) + 1; }
  log(s, `【傾巢討伐】闖過 ${r.won} 波後在「${CRU27.waves[r.won]}」受阻，只得收兵回山${rep ? `（名聲 +${rep}）` : ''}${hurt ? `；${hurt.name}輕傷` : ''}，無人身亡。`); return rec;
}
export function crusadeDaily27(s, H) {
  if (!CRU27.autoDays.includes(s.day || 0)) return null;
  const c = canCrusade27(s); if (!c.ok || (s.res.food || 0) < Math.min(CRU27.autoFood, c.food + CRU27.autoSpare) /* 決定 224：規格 14 在 bot 局幾乎達不到 */ || crusadeOdds27(s, c.team) < CRU27.autoP) return null; return startCrusade27(s, H, true);
}
export function crusadeHtml27(s) {
  if ((s.day || 0) < CRU27.day) return ''; const C = s.v27n?.cru, c = C ? null : canCrusade27(s);
  return `<div class="k" data-crusade27-row>・魔教分舵：${C ? `全派 ${C.ids.length} 人討伐途中` : c.ok ? `<button data-crusade27>全派傾巢：討伐魔教分舵（出動 ${c.team.length} 人）</button>` : c.why}</div>`;
}
