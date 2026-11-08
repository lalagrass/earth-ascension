// N45：巡山前三段的真地圖交手。與守山／狩獵共用出手、截擊及應接時間式。
import { ENEMIES, ROUTE, SOURCES } from './data.mjs';
import { chooseCombatMove, combatMoves, windOf, interceptOpening, resolveSwing, postureRegen, fretStep, shieldHit, moveMul, cdMul, CLASH } from './arts.mjs';
import { BODY_TIMING, FOE_ACTIONS, foeAction } from './starter-combat.mjs';
import { movementSpeed, moveToward, distance, restoreSurvivor, rememberEscape, ringCapacity, attackTokenLimit } from './tactics.mjs';
import { practiceWindow } from './practice.mjs';
import { RING } from './combat-space.mjs';
import { pairedSwordArrival } from './twin-swords.mjs';

export const EXP_BOUT = { maxSeconds: 90, halfWidth: 150, halfHeight: 100, fleeAt: .35 };
const alive = (a) => a && a.hp > 0 && !a.gone;
const idOf = (a) => a.uid || a.id;
const closest = (a, rows) => rows.filter(alive).sort((x, y) => distance(a.pos, x.pos) - distance(a.pos, y.pos) || String(idOf(x)).localeCompare(String(idOf(y))))[0];

// 山腳以既有獸穴 SOURCE（主地圖上緣）作入口；林地從該環巢側靠近。
// 山腰以上另開場景，四邊均可有來敵：只在陌生遠段使用四方來源。
export function startMapBout(s, owner, key, seg, team, anchor, source, options = {}) {
  const near = seg.from < ROUTE[1].to, E = ENEMIES[key], n = options.count || (key === 'boars' ? Math.round(E.hp / ENEMIES.boar.hp) : 1);
  const left = near ? anchor[0] - EXP_BOUT.halfWidth : 0, top = near ? anchor[1] - EXP_BOUT.halfHeight : 0;
  const center = near ? anchor : [EXP_BOUT.halfWidth, EXP_BOUT.halfHeight];
  const edges = [[left, center[1]], [left + 2 * EXP_BOUT.halfWidth, center[1]], [center[0], top], [center[0], top + 2 * EXP_BOUT.halfHeight]];
  const entry = near ? source : edges[((owner.n || 0) + (owner.encN || 0)) % edges.length];
  // 守關者沿用同種敵人的逐招時間表；血量、傷害及戰報仍用守關資料。
  const foeKey = { boars: 'boar', wolfking: 'wolf', post: 'bandit' }[key] || key;
  team.forEach((d, i) => { d.pos = [center[0] - RING.step * .75 + i * RING.step / 2, center[1] + RING.step / 2 * (i % 2)]; d.swing = null; d.busyUntil = Math.max(d.busyUntil || 0, s.t); });
  const foes = Array.from({ length: n }, (_, i) => restoreSurvivor(s, foeKey, {
    uid: `exp${owner.n || 0}-${owner.encN || 0}-${i}`, k: foeKey, name: E.name, hp: (options.totalHp || E.hp * (seg.scale || 1)) / n, max: (options.totalHp || E.hp * (seg.scale || 1)) / n,
    pos: [entry[0] + i * RING.step / 2, entry[1] + i * RING.step / 2], cool: 0, energy: 100, weapon: foeKey === 'archer' ? 'arrow' : foeKey === 'bandit' ? 'blade' : null,
    agi: E.speed || FOE_ACTIONS[foeKey]?.speed || 20,
  }));
  owner.bout = { key, seg: seg.id, scale: seg.scale || 1, near, left, top, anchor: center, source: [...entry], started: s.t, elapsed: 0, foes, team: team.map((d) => d.id), exchanges: 0, strikes: [], fled: 0 };
  return owner.bout;
}

function applyStrike(s, B, atk, def, swing, H, fighters) {
  const result = resolveSwing(s, atk, def, () => H.rand(s), { move: swing.move, wind: swing.wind, opening: swing.opening });
  B.exchanges++; B.strikes.push({ at: +B.elapsed.toFixed(2), who: idOf(atk), target: idOf(def), move: swing.move, reaction: result.kind });
  if (result.counter) atk.hp = Math.max(0, atk.hp - result.counterDamage);
  if (result.kind !== 'hit') return;
  const force = swing.damage * (result.heavy ? CLASH.heavy : 1) * (result.contact?.damageFactor ?? 1) * (H.guardOf?.(def) ?? 1) * (def.takeMul ?? 1);
  def.hp = Math.max(0, def.hp - shieldHit(def, force, s.t));
  if (atk.k) atk.opened = true;
}

export function stepMapBout(s, owner, dt, H) {
  const B = owner?.bout; if (!B) return null;
  const team = B.team.map(id => s.ds.find(d => d.id === id)).filter(Boolean), foes = B.foes;
  B.elapsed += dt;
  // 先完成所有已起手的招，再按角色自己的冷卻排下一招；任何一人一次只能做一件事。
  for (const a of [...foes, ...team]) {
    if (!alive(a)) continue;
    postureRegen(s, a, dt); fretStep(s, a);
    if (a.k && owner === s.exp && !owner.pendingGate && !a.fleeAttempted && a.hp < a.max * EXP_BOUT.fleeAt) {
      a.fleeAttempted = true;
      if (H.rand(s) < (ENEMIES[B.key]?.flee || 0)) a.fleeing = true;
    }
    if (a.fleeing) {
      a.swing = null;
      moveToward(a, B.source, FOE_ACTIONS[a.k]?.speed || movementSpeed(a), dt);
      if (distance(a.pos, B.source) <= RING.step) { a.gone = true; B.fled++; }
      continue;
    }
    if (a.swing?.travel) { const runningAt = [...team, ...foes].find(x => idOf(x) === a.swing.target); if (alive(runningAt)) moveToward(a, runningAt.pos, a.k ? FOE_ACTIONS[a.k]?.speed || movementSpeed(a) : movementSpeed(a), dt); }
    if (a.swing && s.t + 1e-9 >= a.swing.at) {
      const swing = a.swing; a.swing = null;
      const target = [...team, ...foes].find(x => idOf(x) === swing.target);
      if (alive(target) && distance(a.pos, target.pos) <= swing.range * 1.3) applyStrike(s, B, a, target, swing, H, team);
    }
    if (!alive(a) || a.swing || (a.busyUntil || 0) > s.t || (a.cool || 0) > s.t) continue;
    const target = closest(a, a.k ? team : foes); if (!target) continue;
    if (a.k) {
      const source = SOURCES[FOE_ACTIONS[a.k]?.escapeSource || 'den'] || SOURCES.den;
      const limit = attackTokenLimit(source.organization ?? SOURCES.den.organization, ringCapacity(target, s));
      if (foes.filter(x => x !== a && x.swing?.target === idOf(target)).length >= limit) continue;
    }
    const dist = distance(a.pos, target.pos), pick = chooseCombatMove(s, a, target, () => H.rand(s), { distance: dist, contactAware: true });
    const move = pick?.move || (a.k ? foeAction(a, dist) : combatMoves(a).find(m => m.range >= dist));
    if (!move || dist > move.range) { moveToward(a, target.pos, a.k ? FOE_ACTIONS[a.k]?.speed || movementSpeed(a) : movementSpeed(a), dt); continue; }
    let wind = a.k ? practiceWindow(a, move.id, move.wind).wind + (pick?.seconds || 0) : windOf(a, move.id, move.cd, s.t) + (pick?.seconds || 0);
    if (!a.k) wind = pairedSwordArrival(s, a, move.id, target, team, s.t + wind) - s.t;
    const opening = interceptOpening(s, a, target, () => H.rand(s), { move: move.id, wind });
    const damage = a.k ? ENEMIES[B.key].dmg * B.scale : move.dmg * (1 + (a.skills?.[move.skill] || 0) / 50) * moveMul(a, move.id, s.t);
    if (opening.read) {
      B.exchanges++; B.strikes.push({ at: +B.elapsed.toFixed(2), who: idOf(a), target: idOf(target), move: move.id, reaction: opening.read.kind });
      if (opening.read.counter) a.hp = Math.max(0, a.hp - opening.read.counterDamage);
    } else a.swing = { mv: move.id, move: move.id, target: idOf(target), at: s.t + wind, wind, range: move.range, travel: !!move.travel, damage, opening: opening.opening };
    if (a.k) a.opened = true; // 一次性假衝／投石在起手就用掉，不能靠落空重刷。
    a.cool = Math.max(s.t + (move.cd || move.wind + BODY_TIMING.recovery) * (a.k ? 1 : cdMul(a, move.id, s.t)) + (pick?.seconds || 0), s.t + wind + BODY_TIMING.recovery);
  }
  const lost = !team.some(alive), cleared = !foes.some(alive), won = cleared && !B.fled, timedOut = B.elapsed >= EXP_BOUT.maxSeconds;
  if (!lost && !cleared && !timedOut) return null;
  const result = { t: B.elapsed, won, fled: cleared && !!B.fled, lost, timedOut, key: B.key, seg: B.seg, exchanges: B.exchanges };
  if (timedOut && !cleared) for (const m of foes.filter(alive)) rememberEscape(s, m);
  owner.bout = null;
  return result;
}
