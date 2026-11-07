// N62：先選實際要追的獵物或對手，再走原巡山路線；不另擲勝率。
import { CAMPS, ENEMIES, ROUTE } from './data.mjs';
import { clashOdds, combatMoves, moveStats, windOf } from './arts.mjs';
import { BODY_TIMING, FOE_ACTIONS } from './starter-combat.mjs';
import { practiceWindow } from './practice.mjs';
import { contactImpact } from './contact.mjs';

const foeKind = key => ({ boars: 'boar' }[key] || key);

function boutOdds(s, d, foe, E, attack) {
  const foeWind = practiceWindow(foe, attack.id, attack.wind).wind;
  const foeHit = clashOdds(s, foe, d, { move: attack.id, wind: foeWind }).hit;
  const foeRate = E.dmg * foeHit / (attack.wind + BODY_TIMING.recovery);
  let ownRate = 0;
  for (const move of combatMoves(d, 0)) {
    const wind = windOf(d, move.id, move.cd, s.t);
    const hit = clashOdds(s, d, foe, { move: move.id, wind }).hit;
    // 在隔離的預覽狀態走同一個受力式；不寫回真地圖的傷口、位置或 RNG。
    const preview = { t: s.t, fx: [] };
    const contact = contactImpact(preview, { id: d.id, pos: [0, 0] }, { k: foe.k, uid: foe.uid, pos: [0, 0] },
      { move, force: moveStats(d, move.id, wind).force, armor: moveStats(foe).armor });
    const rate = move.dmg * (1 + (d.skills?.[move.skill] || 0) / 50) * contact.damageFactor * hit / move.cd;
    ownRate = Math.max(ownRate, rate);
  }
  // 同尺估計互相耗盡 HP 的速率；比例自然在 [0,1]，不設勝率保底。
  const ownPressure = d.hp * ownRate, foePressure = E.hp * foeRate;
  return { p: ownPressure + foePressure > 0 ? ownPressure / (ownPressure + foePressure) : 0, receive: 1 - foeHit };
}

export function forayChoices(s, d, motive) {
  const rows = [];
  for (let index = 0; index < 4; index++) {
    const seg = ROUTE[index];
    if (index && !s.camps?.[CAMPS[0].id] && (d.best || 0) < seg.from - seg.every) continue;
    for (const [key] of seg.roster) {
      const E = ENEMIES[key], kind = foeKind(key), form = FOE_ACTIONS[kind];
      if (!form || (motive === 'food' && !(E.loot?.food > 0))) continue;
      const move = form.moves.find(m => !m.once && !m.requiresSurvived) || form.moves[0];
      const foe = { k: kind, uid: `track-${key}`, agi: E.speed || form.speed, practiceTier: E.practiceTier ?? -1 };
      const odds = boutOdds(s, d, foe, E, move);
      rows.push({ seg: seg.id, key, ...odds, target: seg.to - seg.every, from: index >= CAMPS[0].seg + 1 && s.camps?.[CAMPS[0].id] ? CAMPS[0].id : null,
        effort: E.hp * E.dmg, gap: Math.abs(odds.p - .5), index });
    }
  }
  return rows.sort((a, b) => (motive === 'food' ? b.p - a.p || a.effort - b.effort : a.gap - b.gap) || a.index - b.index || a.key.localeCompare(b.key));
}

export const forayChoice = (s, d, motive) => forayChoices(s, d, motive)[0] || null;
