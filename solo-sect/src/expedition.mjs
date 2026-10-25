// v0.95 巡山遠征（ROADMAP §15）：背景模擬＋戰報；地圖只畫進度條。固定名單、決定性、不會死。
import { ENEMIES, INSIGHT, ROUTE, EXP, MOVES, DAY } from './data.mjs';
import { moveMul } from './arts.mjs';
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
// H：sim 內部工具 { rand, cancelTask, grow, think }
export function startExpedition(s, ids, opt = {}, H) {
  const c = canExpedition(s, ids); if (!c.ok) return c;
  const thr = EXP.thr.includes(opt.thr) ? opt.thr : EXP.thrDefault, target = Math.min(ROUTE_END, opt.target || ROUTE_END);
  const supplies = Math.min(Math.floor(s.res.food), ids.length * EXP.supplyPer); s.res.food -= supplies;
  for (const id of ids) { const d = s.ds.find((x) => x.id === id); H.cancelTask(s, d, '出發巡山'); d.order = null; d.away = true; d.path = []; d.reason = '巡山中'; }
  s.expN = (s.expN || 0) + 1;
  s.exp = { n: s.expN, team: [...ids], thr, target, supplies, dist: 0, phase: 'out', busy: 0, nextAt: ROUTE[0].every, kills: {}, escaped: {}, loot: {}, hurt: {}, reason: null, startT: s.t, fights: 0 };
  log(s, `巡山隊出發：${ids.map((id) => s.ds.find((x) => x.id === id).name).join('、')}（撤退線：氣血 ${thr * 100}%，乾糧 ${supplies}）`);
  return { ok: true };
}
const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
function lootRoll(s, o, table, H) { for (const [k, v] of Object.entries(table)) { if (v >= 1) add(o, k, v); else if (H.rand(s) < v) add(o, k, 1); } }
// 一場遭遇戰（批次，0.5 秒一步）；回傳耗時秒數
function fight(s, e, team, H) {
  const E = ENEMIES[e]; let hp = E.hp, t = 0, cd = E.cd, fled = false; const X = s.exp;
  for (const d of team) seeEnemy(s, e, 'fight', d); seeEnemy(s, e, 'see');
  const bonus = (s.codex[e]?.insight || 0) >= INSIGHT.dmgAt ? 1 + INSIGHT.dmg : 1;
  while (hp > 0 && t < 90) {
    const alive = team.filter((d) => d.hp > 0); if (!alive.length) break;
    t += 0.5; for (const d of alive) hp -= dpsOf(s, d) * 0.5 * bonus;
    if (hp > 0 && hp < E.hp * 0.35 && !fled) { fled = true; if (H.rand(s) < E.flee) { add(X.escaped, e, 1); seeEnemy(s, e, 'fled'); return t; } }
    cd -= 0.5; if (cd <= 0 && hp > 0) { cd = E.cd; const d = alive[Math.floor(H.rand(s) * alive.length)]; const def = 1 - Math.min(0.4, (d.skills.agility + d.skills.strength) / 400); d.hp = Math.max(0, d.hp - E.dmg * def); }
  }
  if (hp <= 0) { const alive = team.filter((d) => d.hp > 0); const k = alive[Math.floor(H.rand(s) * alive.length)]; add(X.kills, e, 1); seeEnemy(s, e, 'kill', k); lootRoll(s, X.loot, E.loot, H); for (const d of alive) H.grow(s, d, 'style', 3); }
  return t;
}
function pickEnemy(s, seg, H) { const tot = seg.roster.reduce((a, [, w]) => a + w, 0); let r = H.rand(s) * tot; for (const [k, w] of seg.roster) { r -= w; if (r < 0) return k; } return seg.roster[0][0]; }
function checkRetreat(s, team) {
  const X = s.exp;
  for (const d of team) if (d.hp <= 0) { d.hp = 10; return `${d.name}重傷倒地，眾人抬回`; }
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
    if (X.dist >= X.nextAt) { const seg = segAt(X.nextAt - 0.01); X.nextAt += seg.every; X.fights++; X.busy = fight(s, pickEnemy(s, seg, H), team, H) / 2; lootRoll(s, X.loot, seg.find, H); }
    const why = checkRetreat(s, team); if (why) { X.reason = why; X.phase = 'back'; X.backLeft = X.dist / EXP.back; log(s, `巡山隊在${segAt(X.dist).name}（${X.dist.toFixed(0)} 步）回頭：${why}`); }
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
  let sectRec = false; if (dist > (s.records.sect || 0)) { sectRec = true; s.records = { sect: dist, who: team.map((d) => d.name), n: X.n, t: s.t }; for (const d of s.ds) if (d.role !== 'laborer') H.think(s, d, 'recordSect'); }
  const rep = { n: X.n, team: team.map((d) => d.name), dist, seg: segAt(Math.max(0, dist - 0.01)).name, kills: X.kills, escaped: X.escaped, hurt, loot: X.loot, reason: X.reason, fights: X.fights, sectRec, personal: rec, day: Math.floor(s.t / DAY) + 1 };
  s.lastExp = rep; s.exp = null;
  log(s, `巡山戰報 #${rep.n}：走到${rep.seg} ${dist} 步｜${reportText(rep)}`);
  return rep;
}
export function reportText(r) {
  const nm = (o) => Object.entries(o).map(([k, v]) => `${ENEMIES[k].name}×${v}`).join('、') || '無';
  const RN = { food: '飯', hide: '獸皮', herb: '藥', wood: '木', coin: '香火錢', page1: '凡階殘頁', page2: '精階殘頁', gall: '熊膽' };
  return `擊倒 ${nm(r.kills)}；逃走 ${nm(r.escaped)}；傷 ${r.hurt.map(([n, l]) => `${n}${l}`).join('、') || '無'}；帶回 ${Object.entries(r.loot).map(([k, v]) => `${RN[k] || k}${v}`).join(' ') || '無'}；回頭原因：${r.reason}${r.sectRec ? '｜★ 本門新紀錄' : ''}`;
}
