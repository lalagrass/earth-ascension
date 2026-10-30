import { addMem } from './bonds.mjs';
import { mateBonus } from './peace.mjs';
import { secOpen } from './slice.mjs';
// v0.95 巡山遠征（ROADMAP §15）：背景模擬＋戰報；地圖只畫進度條。固定名單、決定性、不會死。
import { ENDLESS, CAMPS } from './data.mjs';
import { addWexin } from './hero.mjs';
import { affKey } from './util.mjs';
import { aff } from './social.mjs';
import { popKill, denRaze, ECO2 } from './world.mjs';
import { ENEMIES, INSIGHT, ROUTE, EXP, MOVES, DAY, EXP_STYLES as STYLES, STYLE_TRAIT, EVADE, TRAITS } from './data.mjs';
import { moveMul, effectTier, artTier as effectTierOf } from './arts.mjs';
import { ARTS as ARTS_ALL, HS } from './data.mjs';
import { awaken } from './hero.mjs';
import { log, resAdd } from './util.mjs';
import { DAO } from './data.mjs';
// v1.7 相剋：a 剋 b → DAO.up；b 剋 a → DAO.down；其餘 1
export function daoOf(d) { let best = null, bx = -1; for (const [id, r] of Object.entries(d.arts || {})) { const a = ARTS_ALL.find((x) => x.id === id); const tag = a?.tags?.find((g) => DAO.tagOf[g]); if (!tag || a.effect) continue; const x = r?.xp || 0; if (x > bx) { bx = x; best = DAO.tagOf[tag]; } } return best || '歸真'; }
export function counterMul(a, b) { const R = DAO.ring, i = R.indexOf(a), j = R.indexOf(b); if (i < 0 || j < 0) return 1; if ((i + 1) % R.length === j) return DAO.up; if ((j + 1) % R.length === i) return DAO.down; return 1; }
import { rivalGate, rivalWon } from './sect.mjs';
export const ROUTE_END = ROUTE[ROUTE.length - 1].to;
// v1.0 路段：前七段固定，之後無盡（每 200 步一段、段末固定守關、每段 ×1.25）
export function routeSeg(i) {
  if (i < ROUTE.length) return ROUTE[i];
  const k = i - ROUTE.length + 1, L = ROUTE[ROUTE.length - 1], from = L.to + (k - 1) * ENDLESS.len;
  return { id: 'end' + k, name: `絕頂之上・第${k}重`, from, to: from + ENDLESS.len, every: 50, roster: ENDLESS.roster, find: ENDLESS.find, scale: (L.scale || 1) * ENDLESS.mul ** k, gate: ENDLESS.gate, gateName: `第${k}重無名高手`, endless: true };
}
export const segIndex = (x) => { let i = 0; while (x >= routeSeg(i).to && i < 500) i++; return i; };
export const segAt = (x) => routeSeg(segIndex(x));
export const peaceOf = (s, id) => (s.records?.qing?.[id] || 0) >= EXP.peaceQing;
export const raidMul = (s) => (peaceOf(s, 'foot') || peaceOf(s, 'wood') ? EXP.peaceRaid : 1);
export const campsOpen = (s) => CAMPS.filter((c) => s.camps?.[c.id]);
export const scoutOf = (team) => { const b = team.reduce((m, d) => (evadeScore(d) > (m ? evadeScore(m) : -1) ? d : m), null); return b && evadeScore(b) >= EXP.scoutAt ? b : null; };
// ---- 圖鑑 ----
export function seeEnemy(s, k, how, d) {
  const c = (s.codex[k] ??= { seen: 0, kills: 0, fled: 0, insight: 0 });
  if (how === 'see') c.seen++; if (how === 'kill') c.kills++; if (how === 'fled') c.fled++;
  const v = INSIGHT[how] || 0; c.insight += v; if (d) { d.insight ??= {}; d.insight[k] = (d.insight[k] || 0) + v; }
}
export const insightTier = (v) => { let t = null; for (const x of INSIGHT.tiers) if (v >= x[0]) t = x[1]; return t; };
export function codexRows(s) {
  return Object.entries(ENEMIES).map(([k, e]) => { const c = s.codex[k]; return c ? { k, name: e.name, kind: e.kind, weapon: insightTier(c.insight) ? e.weapon : '？', hp: c.insight >= 30 ? e.hp : '？', seen: c.seen, kills: c.kills, fled: c.fled, insight: c.insight, tier: insightTier(c.insight) || '初見' } : { k, name: '？？？', unknown: true }; });
}
// 出手力：最強招式每秒傷害（同狩獵的公式）
export function dpsOf(s, d) {
  let best = 0; for (const id of d.moves) { const mv = MOVES.find((m) => m.id === id); if (!mv) continue; const p = mv.dmg * (1 + d.skills[mv.skill] / 50) * moveMul(d, mv.id, s.t) * (mv.aoe ? 1.3 : 1) / mv.cd; if (p > best) best = p; }
  return best;
}
// v1.5 召回（A2）：隊伍從目前距離往回走，戰利品照拿；返程仍走 returnPlan（含驚獸）
export function recallExpedition(s) { const X = s.exp; if (!X || X.phase === 'back' || X.phase === 'done') return false; X.reason = '掌門傳令召回'; X.recalled = true; return true; }
export function canExpedition(s, ids) {
  if (s.exp) return { ok: false, why: '已有隊伍在外' };
  if (!secOpen(s, 'exp')) return { ok: false, why: '巡山還沒解鎖（第一天黃昏試煉後或第三天）' }; // v1.5：模擬層也守解鎖，章節不再第一天就記
  if (!ids.length || ids.length > EXP.maxTeam) return { ok: false, why: `派 1–${EXP.maxTeam} 人` };
  for (const id of ids) { const d = s.ds.find((x) => x.id === id); if (!d) return { ok: false, why: '查無此人' }; if (d.role === 'laborer') return { ok: false, why: `${d.name}是雇工` }; if (d.hp < EXP.minHp) return { ok: false, why: `${d.name}傷還沒好` }; if (s.hunt?.team.includes(id)) return { ok: false, why: `${d.name}正在狩獵` }; if ((d.restUntil || 0) > s.t) return { ok: false, why: `${d.name}剛巡山回來，還要歇 ${Math.ceil(d.restUntil - s.t)} 秒` }; }
  return { ok: true };
}
// ---- v0.97 巡山風格：從性格／價值觀／武學推出，附說明 ----
export function styleOf(d) {
  let sc = 0; const why = [];
  for (const p of d.personality || []) { const v = STYLE_TRAIT[p]; if (v) { sc += v; why.push(`${TRAITS[p]?.name || p}${v > 0 ? '+' : ''}${v}`); } }
  const V = d.values || {}; const vv = [['wu', '武道', 1], ['sect', '門派', 1], ['free', '自在', -2], ['fame', '名望', -1]];
  for (const [k, n, w] of vv) if ((V[k] || 0) >= 20) { sc += w; why.push(`重${n}${w > 0 ? '+' : ''}${w}`); }
  const st = effectTier(d, 'speed') + 1; if (st > 0) { sc -= 0.5 * st; why.push(`輕功${st}階−${0.5 * st}`); }
  const id = sc >= 3 ? 'clear' : sc >= 1 ? 'steady' : sc >= -1 ? 'dash' : 'slip';
  return { id, score: sc, why: why.join('、') || '無明顯傾向' };
}
const ORDER = ['clear', 'steady', 'dash', 'slip'];
export function teamStyle(team) {
  const n = {}; for (const d of team) { const k = styleOf(d).id; n[k] = (n[k] || 0) + 1; }
  const best = ORDER.reduce((b, k) => ((n[k] || 0) > (n[b] || 0) ? k : b), ORDER.find((k) => n[k]));
  return best;
}
// ---- v1.9 A9 因才派巡（ONI 優先度）：依「需要」＋「專長」排序，第二人起偏好跟隊上／上一趟不同的風格 ----
// 專長＝出手（dpsOf，佔 80 分）；需要＝多久沒巡山（每日 +5，上限 20）＋心情低想出門透氣（最多 10）；
// 第二人起：搭檔默契（上一趟同隊 +25、好感 /100×20）＋換個走法 +6。v1.9 長跑：沒有默契項時岳不群 30 日到頂 1/5（隊友輪來輪去），加了才回 ≥4/5
export const A9 = { minHp: 70, dps: 80, perDay: 5, idleCap: 20, mood: 10, diverse: 6, keep: 25, bond: 20 };
export function suggestTeam(s, n = 2) {
  const ok = s.ds.filter((d) => d.role !== 'laborer' && d.adult !== false && !d.away && d.hp > A9.minHp && !((d.restUntil || 0) > s.t) && !s.hunt?.team.includes(d.id));
  if (!ok.length) return { ids: [], why: [] }; const top = Math.max(...ok.map((d) => dpsOf(s, d))) || 1, last = s.lastExp?.style;
  const base = (d) => { const idle = Math.min(A9.idleCap, ((s.t - (d.lastExp ?? -DAY * 9)) / DAY) * A9.perDay), m = Math.max(0, (60 - d.mood) / 60) * A9.mood; return { sp: (dpsOf(s, d) / top) * A9.dps, idle, m }; };
  const pick = [], why = [], lastTeam = s.lastExp?.ids || [];
  while (pick.length < Math.min(n, ok.length)) {
    const used = new Set(pick.map((d) => styleOf(d).id)); if (last && pick.length) used.add(last);
    let best = null, bv = -1e9, bw = '';
    for (const d of ok) { if (pick.includes(d)) continue; const b = base(d), dv = pick.length && !used.has(styleOf(d).id) ? A9.diverse : 0, kp = pick.length && lastTeam.includes(d.id) && lastTeam.includes(pick[0].id) ? A9.keep : 0, bd = pick.length ? Math.max(0, aff(s, pick[0], d)) / 100 * A9.bond : 0, mt = pick.length ? mateBonus(s, pick[0], d) : 0, v = b.sp + b.idle + b.m + dv + kp + bd + mt;
      if (v > bv) { bv = v; best = d; bw = `${d.name}：專長 ${Math.round(b.sp)}・久未巡山 ${Math.round(b.idle)}${b.m >= 1 ? `・想出門 ${Math.round(b.m)}` : ''}${kp ? `・老搭檔 +${kp}` : ''}${bd >= 1 ? `・默契 ${Math.round(bd)}` : ''}${mt ? `・練功搭子 +${mt}` : ''}${dv ? `・換個走法（${STYLES[styleOf(d).id].name}）+${dv}` : ''}`; } }
    pick.push(best); why.push(bw);
  }
  return { ids: pick.map((d) => d.id), why };
}
export const evadeScore = (d) => d.skills.agility + Math.max(0, effectTier(d, 'speed') + 1) * EVADE.tierPts + ((d.personality || []).includes('lazy') ? EVADE.lazyBonus : 0);
const pclamp = (x) => Math.max(0.05, Math.min(0.95, x));
// H：sim 內部工具 { rand, cancelTask, grow, think }
export function startExpedition(s, ids, opt = {}, H) {
  const c = canExpedition(s, ids); if (!c.ok) return c;
  const thr = EXP.thr.includes(opt.thr) ? opt.thr : EXP.thrDefault, target = opt.target === 'inf' ? 1e9 : Math.max(50, opt.target || ROUTE_END);
  const camp = opt.from ? CAMPS.find((c) => c.id === opt.from && s.camps?.[c.id]) : null; if (opt.from && !camp) return { ok: false, why: '營地還沒設' };
  const carry = camp ? EXP.campCarry * ids.length : 0; if (s.res.food < carry) return { ok: false, why: `從營地出發要帶 ${carry} 份糧上山` }; resAdd(s, 'food', -carry);
  const want = opt.supplies == null ? ids.length * EXP.supplyPer : Math.max(0, Math.min(opt.supplies, ids.length * EXP.supplyMax));
  const supplies = Math.min(Math.floor(s.res.food), want); resAdd(s, 'food', -supplies);
  for (const id of ids) { const d = s.ds.find((x) => x.id === id); H.cancelTask(s, d, '出發巡山'); d.order = null; d.away = true; d.path = []; d.reason = '巡山中'; }
  s.expN = (s.expN || 0) + 1;
  const tm = ids.map((id) => s.ds.find((x) => x.id === id)), order = STYLES[opt.order] ? opt.order : null, style = order || teamStyle(tm);
  for (const d of tm) d.lastExp = s.t; // v1.9 A9：記上次巡山時刻（因才派巡的「需要」）
  if (order) for (const d of tm) if (styleOf(d).id !== order) { if (d.values) addWexin(s, d, '巡山令'); else H.think(s, d, 'forcedStyle'); d.mood = Math.max(0, d.mood + EXP.orderMood); }
  const patMax = Math.round(tm.reduce((a, d) => a + d.mood, 0) / tm.length * (order ? EXP.orderPatCap : 1)), sc = scoutOf(tm), from = camp ? ROUTE[camp.seg].to : 0;
  s.exp = { events: [], n: s.expN, team: [...ids], thr, target, supplies, dist: from, from, camp: camp?.name || null, phase: 'out', busy: 0, nextAt: from + routeSeg(camp ? camp.seg + 1 : 0).every, order, sta: EXP.sta, pat: patMax, patMax, scout: sc?.name || null, camps: [], kills: {}, escaped: {}, loot: {}, hurt: {}, reason: null, startT: s.t, fights: 0,
    style, styleWhy: tm.map((d) => { const o = styleOf(d); return `${d.name}${STYLES[o.id].name}（${o.why}）`; }), seg: {}, evaded: {}, chase: { n: 0, got: 0 }, gateI: camp ? camp.seg + 1 : 0, gates: [], gorgeT: null };
  log(s, `巡山隊出發：${ids.map((id) => s.ds.find((x) => x.id === id).name).join('、')}（${order ? '巡山令・' : ''}${STYLES[style].name}${camp ? `；自${camp.name}出發` : ''}${sc ? `；${sc.name}探路` : ''}；撤退線：氣血 ${thr * 100}%，乾糧 ${supplies}）`);
  return { ok: true };
}
const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
function lootRoll(s, o, table, H) { for (const [k, v] of Object.entries(table)) { if (v >= 1) add(o, k, v); else if (H.rand(s) < v) add(o, k, 1); } }
// 一場遭遇戰（批次，0.5 秒一步）；回傳耗時秒數
function fight(s, e, team, H, gate = false, scale = 1) {
  const E0 = ENEMIES[e], P = ROUTE[ROUTE.length - 1].scale || 1, ds = scale > P ? P * (scale / P) ** ENDLESS.dmgExp : scale, E = { ...E0, hp: E0.hp * scale, dmg: E0.dmg * ds }; let hp = E.hp, t = 0, cd = E.cd, fled = false; const X = s.exp;
  for (const d of team) seeEnemy(s, e, 'fight', d); seeEnemy(s, e, 'see');
  const bonus = (s.codex[e]?.insight || 0) >= INSIGHT.dmgAt ? 1 + INSIGHT.dmg : 1;
  while (hp > 0 && t < 90) {
    const alive = team.filter((d) => d.hp > 0); if (!alive.length) break;
    t += 0.5; const fs = X.scout && t <= EXP.scoutT ? 1 + EXP.scoutBonus : 1; for (const d of alive) { hp -= dpsOf(s, d) * 0.5 * bonus * fs * counterMul(daoOf(d), DAO.enemy[e]); if (d.dugu?.length) d.hp = Math.min(100, d.hp + HS.duguHeal); } // v1.2 九劍只攻不守：不格擋，但料敵機先回氣血 // v1.0 探路者先手 +20%
    if (gate && hp > E.hp * 0.4 && alive.some((d) => d.hp < 100 * EXP.gateBail)) { X.events.push(`見勢不妙，在${E.name}前及早撤退`); return { t, won: false, fled: false, bail: true }; } // v0.98 守關敵打不過：及早撤退
    if (!gate && hp > 0 && hp < E.hp * 0.35 && !fled) { fled = true; if (H.rand(s) < E.flee) { add(X.escaped, e, 1); seeEnemy(s, e, 'fled'); return { t, won: false, fled: true }; } }
    cd -= 0.5; if (cd <= 0 && hp > 0) { cd = E.cd; const d = alive[Math.floor(H.rand(s) * alive.length)]; if (d.dugu?.length && H.rand(s) < Math.min(0.6, 0.2 + (s.codex[e]?.insight || 0) / 200)) { d.hp = Math.min(100, d.hp + 2); continue; } const def = d.dugu?.length ? 1 : (1 - Math.min(0.4, (d.skills.agility + d.skills.strength) / 400)) * guardOf(d); d.hp = Math.max(0, d.hp - E.dmg * def * (d.takeMul || 1) * counterMul(DAO.enemy[e], daoOf(d))); if (d.reflect) hp -= E.dmg * def * d.reflect; }
  }
  if (hp <= 0) { const alive = team.filter((d) => d.hp > 0); const k = alive[Math.floor(H.rand(s) * alive.length)]; add(X.kills, e, 1); seeEnemy(s, e, 'kill', k); lootRoll(s, X.loot, E.loot, H); for (const d of alive) H.grow(s, d, 'style', 3); }
  return { t, won: hp <= 0, fled: false };
}
// v1.1 招牌武學練到圓滿：護體（受傷 ×0.6）
export const guardOf = (d) => (ARTS_ALL.some((a) => a.classic && !a.layered && !a.forms && d.arts?.[a.id] && effectTierOf(d, a.id) >= EXP.classicTier) || (d.zixia || 0) >= 7 ? EXP.classicGuard : 1) * (1 - HS.zxGuard * (d.zixia || 0));
// v1.2 二度氣：無盡段每過一重，有招牌武學在身的人回一口真氣（體力回補，依比例）
export const secondWind = (team) => team.filter((d) => guardOf(d) < 0.95 || d.dugu?.length).length / Math.max(1, team.length);
// 遭遇：可繞就閃（隊伍取最差身法）；逃兵依風格追擊；記入該段清場率
function encounter(s, e, seg, team, H) {
  // v1.95：試過「環被打到 0 就沒有遭遇」，郭靖 30 日 1600 掉到 0–1/5（深谷小環常被清空，少了熊／寨主的歷練），故不採；族群只回饋上限與地圖
  const X = s.exp;  const sca = seg.scale || 1, E = { ...ENEMIES[e], hp: ENEMIES[e].hp * sca }, S = STYLES[X.style], sg = (X.seg[seg.id] ??= { enc: 0, kill: 0 }); sg.enc++; X.encN = (X.encN || 0) + 1;
  const dps = team.reduce((a, d) => a + dpsOf(s, d), 0), weak = dps * 20 < E.hp;
  if (S.evade === 'always' || (S.evade === 'weak' && weak)) {
    const ev = Math.min(...team.map(evadeScore)); seeEnemy(s, e, 'see');
    if (H.rand(s) < pclamp(0.5 + (ev - E.detect) / 100)) { add(X.evaded, e, 1); return 1; }
    X.events.push(`閃${E.name}失手`);
  }
  X.fights++; const r = fight(s, e, team, H, false, sca); let t = r.t; if (r.won) { sg.kill++; popKill(s, seg.id); }
  if (r.fled) { const stub = team.some((d) => (d.personality || []).includes('stubborn'));
    if (S.chase >= 1 || (S.chase > 0 && stub && H.rand(s) < S.chase)) {
      const ag = Math.max(...team.map((d) => d.skills.agility)); for (let k = 0; k < (S.chase >= 1 ? 2 : 1); k++) { X.chase.n++; t += EVADE.chaseTime;
        if (H.rand(s) < pclamp(0.5 + (ag - E.speed) / 100)) { X.chase.got++; X.escaped[e]--; if (!X.escaped[e]) delete X.escaped[e]; add(X.kills, e, 1); sg.kill++; popKill(s, seg.id); seeEnemy(s, e, 'kill', team[0]); lootRoll(s, X.loot, E.loot, H); break; } } } }
  if (sg.kill >= ECO2.denAt && denRaze(s, seg.id)) { (X.razed ??= []).push(seg.name); X.events.push(`搗毀${seg.name}獸巢`); log(s, `巡山隊搗毀了${seg.name}的獸巢：該區族群上限減半五日`); }
  return t;
}

function pickEnemy(s, seg, H) { const tot = seg.roster.reduce((a, [, w]) => a + w, 0); let r = H.rand(s) * tot; for (const [k, w] of seg.roster) { r -= w; if (r < 0) return k; } return seg.roster[0][0]; }
function checkRetreat(s, team) {
  const X = s.exp;
  for (const d of team) if (d.hp <= 0) { if (awaken(s, d)) { d.hp = 60; X.events.push(`${d.name}瀕死覺醒`); continue; } d.hp = 10; return `${d.name}重傷倒地，眾人抬回`; }
  for (const d of team) if (d.hp < X.thr * 100) { if (X.supplies > 0) { X.supplies--; d.hp = Math.min(100, d.hp + EXP.supplyHeal); } if (d.hp < X.thr * 100) return `${d.name}氣血低於 ${X.thr * 100}%`; }
  for (const d of team) if (d.mood < EXP.moodMin) return `${d.name}心情低落`;
  if (X.sta != null && X.sta <= 0) return '體力耗盡'; if (X.pat != null && X.pat <= 0) return '耐性磨光，不想再走了';
  if (X.dist >= X.target) return X.target === ROUTE_END ? `走完${ROUTE[ROUTE.length - 1].name}` : '到達目標距離';
  return null;
}
export function expStep(s, dt, H) {
  const X = s.exp; if (!X) return; const team = X.team.map((id) => s.ds.find((d) => d.id === id)).filter(Boolean);
  if (X.busy > 0) { X.busy -= dt; return; }
  if (X.phase === 'out') {
    const d0 = X.dist, f0 = X.fights, pm = peaceOf(s, segAt(X.dist).id) ? EXP.peaceSpeed : 1;
    X.dist = Math.min(X.target, X.dist + EXP.walk * dt * pm);
    X.dist = Math.min(X.target, X.dist + EXP.walk * dt * pm * (STYLES[X.style].speed - 1));
    X.sta = (X.sta ?? EXP.sta + Math.max(0, ...team.map((d) => d.staBonus || 0))) - (X.dist - d0) * EXP.staStep;
    if (X.gorgeT == null && !(X.from > 0) && X.dist >= ROUTE[3].from) X.gorgeT = s.t - X.startT;
    const G = rivalGate(s, routeSeg(X.gateI), X.gateI);
    if (G && X.dist >= G.to) { X.dist = G.to; X.gateI++; const r = fight(s, G.gate, team, H, true, G.scale || 1); X.encN = (X.encN || 0) + 1; X.busy = r.t / 2; X.fights++; const sg = (X.seg[G.id] ??= { enc: 0, kill: 0 }); sg.enc++;
      if (r.won) { sg.kill++; X.gates.push(G.gateName); rivalWon(s, G); const cp = CAMPS.find((c) => c.seg === X.gateI - 1); if (cp) campAt(s, X, cp, team); else if (G.endless || G.id === 'peak') { const w = secondWind(team); if (w > 0) { X.sta = Math.min(EXP.sta, X.sta + EXP.sta * HS.secondWind * w); X.pat = Math.min(X.patMax, X.pat + 10 * w); for (const d of team) if (d.hp > 0 && (guardOf(d) < 0.95 || d.dugu?.length)) d.hp = Math.min(100, d.hp + 100 * HS.windHp); X.events.push(`過了${G.gateName}，眾人回了一口真氣（體力 +${Math.round(HS.secondWind * w * 100)}%）`); } } } else if (r.bail) { X.reason = `被${G.gateName}擋在${G.name}（見勢不妙及早撤退）`; X.blocked = G.gateName; } else if (team.some((d) => d.hp <= 0 && awaken(s, d))) { for (const d of team) d.hp = Math.max(d.hp, 60); X.gateI--; X.events.push(`${team.find((d) => d.awakened)?.name || ''}瀕死覺醒`); } else { for (const d of team) if (d.hp <= 0) d.hp = 10; X.reason = `被${G.gateName}擋在${G.name}`; X.blocked = G.gateName; } }
    else if (X.dist >= X.nextAt) { const seg = segAt(X.nextAt - 0.01); X.nextAt += seg.every; X.busy = encounter(s, pickEnemy(s, seg, H), seg, team, H) / 2; lootRoll(s, X.loot, seg.find, H); }
    if (X.fights > f0) { const lazy = team.filter((d) => (d.personality || []).includes('lazy')).length; X.sta -= (X.fights - f0) * EXP.staFight; X.pat -= (X.fights - f0) * (EXP.patFight + lazy * EXP.patLazy); }
    const why = X.reason || checkRetreat(s, team); if (why) { X.reason = why; X.phase = 'back'; X.backLeft = X.dist / EXP.back; X.backPos = X.dist; X.ret = returnPlan(s, X); log(s, `巡山隊在${segAt(X.dist).name}（${X.dist.toFixed(0)} 步）回頭：${why}`); }
    return;
  }
  X.backLeft -= dt; X.backPos = Math.max(0, (X.backPos ?? X.dist) - EXP.back * dt); returnStep(s, X);
  if (X.backLeft <= 0) finishExpedition(s, team, H);
}
// ---- v1.45 返程驚獸（ADOPTION-PLAN A1，擁有人已核准數值）----
// 未清段＝這趟去程在該段有遭遇但沒全清（閃過、敵逃、守關沒過），且該段尚未平靖。身上沒戰利品就不會引獸。固定值、無亂數。
export const hasLoot = (X) => Object.values(X.loot || {}).some((v) => v > 0);
export function unclearedSegs(s, X) {
  const out = []; const top = segIndex(Math.max(0, X.dist - 0.01));
  for (let i = 0; i <= top; i++) { const g = routeSeg(i), v = X.seg?.[g.id]; if (v && v.enc > v.kill && !peaceOf(s, g.id)) out.push({ id: g.id, name: g.name, from: g.from, to: Math.min(g.to, X.dist) }); }
  return out.reverse(); // 回程先經過深處
}
export function returnPlan(s, X) { return { left: hasLoot(X) ? unclearedSegs(s, X) : [], hits: [], staLost: 0, lost: null }; }
export function returnStep(s, X) {
  const R = X.ret; if (!R) return;
  while (R.left.length && X.backPos <= R.left[0].to) {
    const g = R.left.shift(); X.sta = (X.sta ?? EXP.sta) - EXP.retSta; R.staLost += EXP.retSta; R.hits.push(g.name);
    X.events.push(`返程經過${g.name}，靈物散香驚動山獸，一路奔逃（耐力 −${EXP.retSta}）`);
    if (X.sta <= 0 && !R.lost) { R.lost = {}; for (const [k, v] of Object.entries(X.loot)) { const l = Math.floor(v * EXP.retLoss); if (l > 0) { X.loot[k] = v - l; R.lost[k] = l; } }
      X.events.push(`耐力見底，在${g.name}丟下一半戰利品`); log(s, `巡山隊返程在${g.name}被獸群追趕，耐力見底，丟下一半戰利品`); }
  }
}
// v1.45 巡山里程軸：每段 ✔ 已清／⚠ 未清（返程會引獸）／▶ 進行中／· 未到
export function milestones(s) {
  const X = s.exp; if (!X) return [];
  const top = segIndex(Math.max(0, X.dist - 0.01)), n = Math.max(ROUTE.length, top + 1), out = [];
  for (let i = 0; i < n; i++) { const g = routeSeg(i), v = X.seg?.[g.id];
    const st = i > top ? 'todo' : i === top && X.phase === 'out' ? 'now' : !v || v.enc === v.kill || peaceOf(s, g.id) ? 'clear' : 'open';
    out.push({ id: g.id, name: g.name, st, hit: !!X.ret?.hits.includes(g.name) }); }
  return out;
}
function campAt(s, X, cp, team) {
  s.camps ??= {}; if (!s.camps[cp.id]) { s.camps[cp.id] = true; log(s, `【營地】巡山隊在${ROUTE[cp.seg].name}盡頭設下${cp.name}，以後可從這裡出發`); }
  X.supplies = Math.max(X.supplies, team.length * EXP.supplyPer); X.sta = EXP.sta; X.pat = Math.min(X.patMax, X.pat + 20); X.camps.push(cp.name); X.events.push(`在${cp.name}歇腳補給`);
}
function finishExpedition(s, team, H) {
  const X = s.exp, dist = Math.round(X.dist);
  for (const [k, v] of Object.entries(X.loot)) resAdd(s, k, v);
  const hurt = []; for (const d of team) { d.away = false; d.task = null; d.path = []; d.at = 'gate'; d.pos = [...(H.gate || d.pos)]; d.reason = '巡山歸來';
    if (d.hp <= EXP.hurtHeavy) { hurt.push([d.name, '重傷']); H.think(s, d, 'expHurt'); } else if (d.hp <= EXP.hurtLight) hurt.push([d.name, '輕傷']); }
  const rec = []; for (const d of team) if (dist > (d.best || 0)) { if (d.best) { H.think(s, d, 'recordSelf'); rec.push(d.name); } d.best = dist; }
  let sectRec = false; if (dist > (s.records.sect || 0)) { sectRec = true; Object.assign(s.records, { sect: dist, who: team.map((d) => d.name), n: X.n, t: s.t }); for (const d of s.ds) if (d.role !== 'laborer') H.think(s, d, 'recordSect'); }
  const R = s.records, clear = {}, qing = []; R.clear ??= {}; R.qing ??= {};
  for (const g of [...ROUTE, ...Array.from({ length: Math.max(0, segIndex(X.dist) - ROUTE.length + 1) }, (_, k) => routeSeg(ROUTE.length + k))]) { const v = X.seg[g.id]; if (!v || !v.enc) continue; const c = v.kill / v.enc; clear[g.id] = c; if (c > (R.clear[g.id] || 0)) R.clear[g.id] = c; if (c >= 1) { qing.push(g.name); R.qing[g.id] = (R.qing[g.id] || 0) + 1; } }
  let fast = X.style === 'dash'; if (X.gorgeT != null && (R.fastGorge == null || X.gorgeT < R.fastGorge)) { R.fastGorge = Math.round(X.gorgeT); fast = true; }
  const cool = EXP.cool * (fast ? EXP.coolFast : 1); for (const d of team) d.restUntil = s.t + cool;
  const st = team.filter((d) => (d.personality || []).includes('stubborn')), lz = team.filter((d) => (d.personality || []).includes('lazy')), qu = [];
  for (const a of st) for (const b of lz) if (a !== b) { for (const [p, q] of [[a, b], [b, a]]) s.aff[affKey(p.id, q.id)] = (s.aff[affKey(p.id, q.id)] || 0) - EXP.quarrel; H.think(s, a, 'quarrel'); H.think(s, b, 'quarrel'); qu.push(`${a.name}嫌${b.name}偷懶，吵了一架`); }
  const rep0 = { ret: X.ret ? { hits: X.ret.hits, staLost: X.ret.staLost, lost: X.ret.lost } : null, style: X.style, styleWhy: X.styleWhy, evaded: X.evaded, chase: X.chase, clear, qing, gates: X.gates, blocked: X.blocked || null, time: Math.round(s.t - X.startT), order: X.order, sta: Math.max(0, Math.round(X.sta ?? 0)), pat: Math.max(0, Math.round(X.pat ?? 0)), patMax: X.patMax, scout: X.scout, camps: X.camps || [], from: X.camp, quarrel: qu, cool: Math.round(cool), fast };
  rep0.story = storyOf(team, rep0, X);
  const rep = { ...rep0, n: X.n, team: team.map((d) => d.name), ids: team.map((d) => d.id), dist, seg: segAt(Math.max(0, dist - 0.01)).name, kills: X.kills, escaped: X.escaped, hurt, out: outcomeOf(X), razed: X.razed || [], loot: X.loot, reason: X.reason, fights: X.fights, sectRec, personal: rec, day: Math.floor(s.t / DAY) + 1 };
  for (let i = 0; i < team.length; i++) for (let j = i + 1; j < team.length; j++) addMem(s, team[i], team[j], 'patrol', rep.seg); // v1.65 並肩巡山
  s.lastExp = rep; s.exp = null;
  log(s, `巡山戰報 #${rep.n}：走到${rep.seg} ${dist} 步｜${reportText(rep)}`);
  return rep;
}
// v1.95 戰報互斥欄位（patrol-defense BL-D07）：每次遭遇恰好一個結果；逃兵後被追到只算擊倒、不留在驅離
export function outcomeOf(X) { const kn = sum(X.kills), dr = sum(X.escaped), ev = sum(X.evaded), enc = X.encN || 0; return { enc, knock: kn, driven: dr, evaded: ev, other: Math.max(0, enc - kn - dr - ev) }; }
const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
function storyOf(team, r, X) {
  const who = team.map((d) => d.name).join('、'), E = (o) => Object.entries(o).map(([k, v]) => `${ENEMIES[k].name}${v}`).join('、');
  const parts = [`${who}以「${STYLES[r.style].name}」上山`];
  if (sum(r.evaded)) parts.push(`一路閃過${E(r.evaded)}`);
  if (r.ret?.hits?.length) parts.push(`回程帶著靈物經過${r.ret.hits.join('、')}，驚動山獸${r.ret.lost ? '，丟了一半戰利品' : '，咬牙撐了回來'}`);
  if (r.chase.n) parts.push(`追了 ${r.chase.n} 次逃兵，追到 ${r.chase.got}`);
  if (r.from) parts.push(`自${r.from}出發`); if (r.scout) parts.push(`${r.scout}探路搶先手`);
  if (r.gates.length) parts.push(`過了${r.gates.join('、')}`); if (r.camps?.length) parts.push(`在${r.camps.join('、')}補給`); if (r.quarrel?.length) parts.push(r.quarrel.join('、'));
  if (X.events.some((e) => e.includes('覺醒'))) parts.push(X.events.filter((e) => e.includes('覺醒')).join('、'));
  if (r.qing.length) parts.push(`${r.qing.join('、')}清場率 100%（清山）`);
  parts.push(r.blocked ? `在${segAt(Math.max(0, X.dist - 0.01)).name}被${r.blocked}攔下，打不過，退了回來` : `${X.reason}，回門`);
  return parts.join('，') + '。';
}
export function reportText(r) {
  const nm = (o) => Object.entries(o).map(([k, v]) => `${ENEMIES[k].name}×${v}`).join('、') || '無';
  const RN = { food: '飯', hide: '獸皮', herb: '藥', wood: '木', coin: '香火錢', page1: '凡階殘頁', page2: '精階殘頁', gall: '熊膽' };
  const O = r.out, oc = O ? `｜戰果（互斥）：遭遇 ${O.enc}＝擊倒 ${O.knock}・驅離 ${O.driven}・繞避 ${O.evaded}・其他 ${O.other}${r.razed?.length ? `；搗巢：${r.razed.join('、')}` : ''}` : '';
  return (oc ? oc.slice(1) + '｜' : '') + `擊倒 ${nm(r.kills)}；逃走 ${nm(r.escaped)}；傷 ${r.hurt.map(([n, l]) => `${n}${l}`).join('、') || '無'}；帶回 ${Object.entries(r.loot).map(([k, v]) => `${RN[k] || k}${v}`).join(' ') || '無'}；回頭原因：${r.reason}${r.sectRec ? '｜★ 本門新紀錄' : ''}${r.ret?.hits?.length ? `｜返程驚獸 ${r.ret.hits.length} 段（耐力 −${r.ret.staLost}${r.ret.lost ? `，丟下 ${Object.entries(r.ret.lost).map(([k, v]) => `${RN[k] || k}${v}`).join(' ')}` : ''}）` : ''}${r.patMax != null ? `｜體力 ${r.sta}・耐性 ${r.pat}/${r.patMax}${r.order ? '（巡山令）' : ''}・歇 ${r.cool} 秒${r.fast ? '（快腳）' : ''}` : ''}${r.style ? `｜${STYLES[r.style].name}・閃 ${sum(r.evaded)}・追 ${r.chase.got}/${r.chase.n}・清場 ${Object.entries(r.clear).map(([k, v]) => `${ROUTE.find((g) => g.id === k)?.name || k}${Math.round(v * 100)}%`).join(' ')}` : ''}`;
}
