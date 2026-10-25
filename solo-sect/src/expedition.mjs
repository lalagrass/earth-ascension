// v0.95 巡山遠征（ROADMAP §15）：背景模擬＋戰報；地圖只畫進度條。固定名單、決定性、不會死。
import { ENEMIES, INSIGHT, ROUTE, EXP, MOVES, DAY, EXP_STYLES as STYLES, STYLE_TRAIT, EVADE, TRAITS } from './data.mjs';
import { moveMul, effectTier } from './arts.mjs';
import { awaken } from './hero.mjs';
import { log } from './util.mjs';
export const ROUTE_END = ROUTE[ROUTE.length - 1].to;
export const segAt = (x) => ROUTE.find((r) => x < r.to) || ROUTE[ROUTE.length - 1];
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
export function canExpedition(s, ids) {
  if (s.exp) return { ok: false, why: '已有隊伍在外' };
  if (!ids.length || ids.length > EXP.maxTeam) return { ok: false, why: `派 1–${EXP.maxTeam} 人` };
  for (const id of ids) { const d = s.ds.find((x) => x.id === id); if (!d) return { ok: false, why: '查無此人' }; if (d.role === 'laborer') return { ok: false, why: `${d.name}是雇工` }; if (d.hp < EXP.minHp) return { ok: false, why: `${d.name}傷還沒好` }; if (s.hunt?.team.includes(id)) return { ok: false, why: `${d.name}正在狩獵` }; }
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
export const evadeScore = (d) => d.skills.agility + Math.max(0, effectTier(d, 'speed') + 1) * EVADE.tierPts + ((d.personality || []).includes('lazy') ? EVADE.lazyBonus : 0);
const pclamp = (x) => Math.max(0.05, Math.min(0.95, x));
// H：sim 內部工具 { rand, cancelTask, grow, think }
export function startExpedition(s, ids, opt = {}, H) {
  const c = canExpedition(s, ids); if (!c.ok) return c;
  const thr = EXP.thr.includes(opt.thr) ? opt.thr : EXP.thrDefault, target = Math.min(ROUTE_END, opt.target || ROUTE_END);
  const supplies = Math.min(Math.floor(s.res.food), ids.length * EXP.supplyPer); s.res.food -= supplies;
  for (const id of ids) { const d = s.ds.find((x) => x.id === id); H.cancelTask(s, d, '出發巡山'); d.order = null; d.away = true; d.path = []; d.reason = '巡山中'; }
  s.expN = (s.expN || 0) + 1;
  const tm = ids.map((id) => s.ds.find((x) => x.id === id)), style = teamStyle(tm);
  s.exp = { events: [], n: s.expN, team: [...ids], thr, target, supplies, dist: 0, phase: 'out', busy: 0, nextAt: ROUTE[0].every, kills: {}, escaped: {}, loot: {}, hurt: {}, reason: null, startT: s.t, fights: 0,
    style, styleWhy: tm.map((d) => { const o = styleOf(d); return `${d.name}${STYLES[o.id].name}（${o.why}）`; }), seg: {}, evaded: {}, chase: { n: 0, got: 0 }, gateI: 0, gates: [], gorgeT: null };
  log(s, `巡山隊出發：${ids.map((id) => s.ds.find((x) => x.id === id).name).join('、')}（${STYLES[style].name}；撤退線：氣血 ${thr * 100}%，乾糧 ${supplies}）`);
  return { ok: true };
}
const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
function lootRoll(s, o, table, H) { for (const [k, v] of Object.entries(table)) { if (v >= 1) add(o, k, v); else if (H.rand(s) < v) add(o, k, 1); } }
// 一場遭遇戰（批次，0.5 秒一步）；回傳耗時秒數
function fight(s, e, team, H, gate = false) {
  const E = ENEMIES[e]; let hp = E.hp, t = 0, cd = E.cd, fled = false; const X = s.exp;
  for (const d of team) seeEnemy(s, e, 'fight', d); seeEnemy(s, e, 'see');
  const bonus = (s.codex[e]?.insight || 0) >= INSIGHT.dmgAt ? 1 + INSIGHT.dmg : 1;
  while (hp > 0 && t < 90) {
    const alive = team.filter((d) => d.hp > 0); if (!alive.length) break;
    t += 0.5; for (const d of alive) hp -= dpsOf(s, d) * 0.5 * bonus;
    if (!gate && hp > 0 && hp < E.hp * 0.35 && !fled) { fled = true; if (H.rand(s) < E.flee) { add(X.escaped, e, 1); seeEnemy(s, e, 'fled'); return { t, won: false, fled: true }; } }
    cd -= 0.5; if (cd <= 0 && hp > 0) { cd = E.cd; const d = alive[Math.floor(H.rand(s) * alive.length)]; const def = 1 - Math.min(0.4, (d.skills.agility + d.skills.strength) / 400); d.hp = Math.max(0, d.hp - E.dmg * def); }
  }
  if (hp <= 0) { const alive = team.filter((d) => d.hp > 0); const k = alive[Math.floor(H.rand(s) * alive.length)]; add(X.kills, e, 1); seeEnemy(s, e, 'kill', k); lootRoll(s, X.loot, E.loot, H); for (const d of alive) H.grow(s, d, 'style', 3); }
  return { t, won: hp <= 0, fled: false };
}
// 遭遇：可繞就閃（隊伍取最差身法）；逃兵依風格追擊；記入該段清場率
function encounter(s, e, seg, team, H) {
  const X = s.exp, E = ENEMIES[e], S = STYLES[X.style], sg = (X.seg[seg.id] ??= { enc: 0, kill: 0 }); sg.enc++;
  const dps = team.reduce((a, d) => a + dpsOf(s, d), 0), weak = dps * 20 < E.hp;
  if (S.evade === 'always' || (S.evade === 'weak' && weak)) {
    const ev = Math.min(...team.map(evadeScore)); seeEnemy(s, e, 'see');
    if (H.rand(s) < pclamp(0.5 + (ev - E.detect) / 100)) { add(X.evaded, e, 1); return 1; }
    X.events.push(`閃${E.name}失手`);
  }
  X.fights++; const r = fight(s, e, team, H); let t = r.t; if (r.won) sg.kill++;
  if (r.fled) { const stub = team.some((d) => (d.personality || []).includes('stubborn'));
    if (S.chase >= 1 || (S.chase > 0 && stub && H.rand(s) < S.chase)) {
      const ag = Math.max(...team.map((d) => d.skills.agility)); for (let k = 0; k < (S.chase >= 1 ? 2 : 1); k++) { X.chase.n++; t += EVADE.chaseTime;
        if (H.rand(s) < pclamp(0.5 + (ag - E.speed) / 100)) { X.chase.got++; X.escaped[e]--; if (!X.escaped[e]) delete X.escaped[e]; add(X.kills, e, 1); sg.kill++; seeEnemy(s, e, 'kill', team[0]); lootRoll(s, X.loot, E.loot, H); break; } } } }
  return t;
}
function pickEnemy(s, seg, H) { const tot = seg.roster.reduce((a, [, w]) => a + w, 0); let r = H.rand(s) * tot; for (const [k, w] of seg.roster) { r -= w; if (r < 0) return k; } return seg.roster[0][0]; }
function checkRetreat(s, team) {
  const X = s.exp;
  for (const d of team) if (d.hp <= 0) { if (awaken(s, d)) { d.hp = 60; X.events.push(`${d.name}瀕死覺醒`); continue; } d.hp = 10; return `${d.name}重傷倒地，眾人抬回`; }
  for (const d of team) if (d.hp < X.thr * 100) { if (X.supplies > 0) { X.supplies--; d.hp = Math.min(100, d.hp + EXP.supplyHeal); } if (d.hp < X.thr * 100) return `${d.name}氣血低於 ${X.thr * 100}%`; }
  for (const d of team) if (d.mood < EXP.moodMin) return `${d.name}心情低落`;
  if (X.dist >= X.target) return X.target >= ROUTE_END ? `走完前四段（${ROUTE[ROUTE.length - 1].name}盡頭）` : '到達目標距離';
  return null;
}
export function expStep(s, dt, H) {
  const X = s.exp; if (!X) return; const team = X.team.map((id) => s.ds.find((d) => d.id === id)).filter(Boolean);
  if (X.busy > 0) { X.busy -= dt; return; }
  if (X.phase === 'out') {
    X.dist = Math.min(X.target, X.dist + EXP.walk * dt);
    X.dist = Math.min(X.target, X.dist + EXP.walk * dt * (STYLES[X.style].speed - 1));
    if (X.gorgeT == null && X.dist >= ROUTE[ROUTE.length - 1].from) X.gorgeT = s.t - X.startT;
    const G = ROUTE[X.gateI];
    if (G && X.dist >= G.to) { X.dist = G.to; X.gateI++; const r = fight(s, G.gate, team, H, true); X.busy = r.t / 2; X.fights++; const sg = (X.seg[G.id] ??= { enc: 0, kill: 0 }); sg.enc++;
      if (r.won) { sg.kill++; X.gates.push(G.gateName); } else if (team.some((d) => d.hp <= 0 && awaken(s, d))) { for (const d of team) d.hp = Math.max(d.hp, 60); X.gateI--; X.events.push(`${team.find((d) => d.awakened)?.name || ''}瀕死覺醒`); } else { for (const d of team) if (d.hp <= 0) d.hp = 10; X.reason = `被${G.gateName}擋在${G.name}`; X.blocked = G.gateName; } }
    else if (X.dist >= X.nextAt) { const seg = segAt(X.nextAt - 0.01); X.nextAt += seg.every; X.busy = encounter(s, pickEnemy(s, seg, H), seg, team, H) / 2; lootRoll(s, X.loot, seg.find, H); }
    const why = X.reason || checkRetreat(s, team); if (why) { X.reason = why; X.phase = 'back'; X.backLeft = X.dist / EXP.back; log(s, `巡山隊在${segAt(X.dist).name}（${X.dist.toFixed(0)} 步）回頭：${why}`); }
    return;
  }
  X.backLeft -= dt; if (X.backLeft <= 0) finishExpedition(s, team, H);
}
function finishExpedition(s, team, H) {
  const X = s.exp, dist = Math.round(X.dist);
  for (const [k, v] of Object.entries(X.loot)) s.res[k] = (s.res[k] || 0) + v;
  const hurt = []; for (const d of team) { d.away = false; d.task = null; d.path = []; d.at = 'gate'; d.pos = [...(H.gate || d.pos)]; d.reason = '巡山歸來';
    if (d.hp <= EXP.hurtHeavy) { hurt.push([d.name, '重傷']); H.think(s, d, 'expHurt'); } else if (d.hp <= EXP.hurtLight) hurt.push([d.name, '輕傷']); }
  const rec = []; for (const d of team) if (dist > (d.best || 0)) { if (d.best) { H.think(s, d, 'recordSelf'); rec.push(d.name); } d.best = dist; }
  let sectRec = false; if (dist > (s.records.sect || 0)) { sectRec = true; Object.assign(s.records, { sect: dist, who: team.map((d) => d.name), n: X.n, t: s.t }); for (const d of s.ds) if (d.role !== 'laborer') H.think(s, d, 'recordSect'); }
  const R = s.records, clear = {}, qing = []; R.clear ??= {}; R.qing ??= {};
  for (const g of ROUTE) { const v = X.seg[g.id]; if (!v || !v.enc) continue; const c = v.kill / v.enc; clear[g.id] = c; if (c > (R.clear[g.id] || 0)) R.clear[g.id] = c; if (c >= 1) { qing.push(g.name); R.qing[g.id] = (R.qing[g.id] || 0) + 1; } }
  if (X.gorgeT != null && (R.fastGorge == null || X.gorgeT < R.fastGorge)) R.fastGorge = Math.round(X.gorgeT);
  const rep0 = { style: X.style, styleWhy: X.styleWhy, evaded: X.evaded, chase: X.chase, clear, qing, gates: X.gates, blocked: X.blocked || null, time: Math.round(s.t - X.startT) };
  rep0.story = storyOf(team, rep0, X);
  const rep = { ...rep0, n: X.n, team: team.map((d) => d.name), dist, seg: segAt(Math.max(0, dist - 0.01)).name, kills: X.kills, escaped: X.escaped, hurt, loot: X.loot, reason: X.reason, fights: X.fights, sectRec, personal: rec, day: Math.floor(s.t / DAY) + 1 };
  s.lastExp = rep; s.exp = null;
  log(s, `巡山戰報 #${rep.n}：走到${rep.seg} ${dist} 步｜${reportText(rep)}`);
  return rep;
}
const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
function storyOf(team, r, X) {
  const who = team.map((d) => d.name).join('、'), E = (o) => Object.entries(o).map(([k, v]) => `${ENEMIES[k].name}${v}`).join('、');
  const parts = [`${who}以「${STYLES[r.style].name}」上山`];
  if (sum(r.evaded)) parts.push(`一路閃過${E(r.evaded)}`);
  if (r.chase.n) parts.push(`追了 ${r.chase.n} 次逃兵，追到 ${r.chase.got}`);
  if (r.gates.length) parts.push(`過了${r.gates.join('、')}`);
  if (X.events.some((e) => e.includes('覺醒'))) parts.push(X.events.filter((e) => e.includes('覺醒')).join('、'));
  if (r.qing.length) parts.push(`${r.qing.join('、')}清場率 100%（清山）`);
  parts.push(r.blocked ? `在${segAt(Math.max(0, X.dist - 0.01)).name}被${r.blocked}攔下，打不過，退了回來` : `${X.reason}，回門`);
  return parts.join('，') + '。';
}
export function reportText(r) {
  const nm = (o) => Object.entries(o).map(([k, v]) => `${ENEMIES[k].name}×${v}`).join('、') || '無';
  const RN = { food: '飯', hide: '獸皮', herb: '藥', wood: '木', coin: '香火錢', page1: '凡階殘頁', page2: '精階殘頁', gall: '熊膽' };
  return `擊倒 ${nm(r.kills)}；逃走 ${nm(r.escaped)}；傷 ${r.hurt.map(([n, l]) => `${n}${l}`).join('、') || '無'}；帶回 ${Object.entries(r.loot).map(([k, v]) => `${RN[k] || k}${v}`).join(' ') || '無'}；回頭原因：${r.reason}${r.sectRec ? '｜★ 本門新紀錄' : ''}${r.style ? `｜${STYLES[r.style].name}・閃 ${sum(r.evaded)}・追 ${r.chase.got}/${r.chase.n}・清場 ${Object.entries(r.clear).map(([k, v]) => `${ROUTE.find((g) => g.id === k).name}${Math.round(v * 100)}%`).join(' ')}` : ''}`;
}
