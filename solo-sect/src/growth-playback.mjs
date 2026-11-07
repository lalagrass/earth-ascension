// 純顯示轉接：只讀N33手熟、既有身體／需求，不產生或回寫成長。
import { handUses, practiceResidual, practiceWindow, familiarUses, familiarReaction } from './practice.mjs';
import { bodyMove, FOE_ACTIONS } from './starter-combat.mjs';
import { opponents } from './tactics.mjs';

export const PLAYBACK = Object.freeze({ pause: .5, uprightHip: 17, deepHipRatio: .5, tilt: 30, sway: 4, bodyScale: 10, legacyStart: .5 });
export function playbackParams(d, art=null, timing={}) {
  const move=art?.tech || (d?.bare?'bodyPunch':d?.moves?.[0]) || 'bodyPunch';
  const start=bodyMove(move)?.wind || PLAYBACK.legacyStart;
  const window=practiceWindow(d,move,start,{tier:timing.tier||0,skill:bodyMove(move)?.skill==='strength'?'strength':'agility'});
  const wind=timing.wind??window.wind;
  const residual=practiceResidual(handUses(d,move));
  const stance=practiceResidual(handUses(d,'bodyPush'));
  const agility=d?.skills?.agility||0;
  const pause=PLAYBACK.pause*residual;
  return {move,wind,pause,formSeconds:4*wind+pause,
    hipHeight:PLAYBACK.uprightHip*(PLAYBACK.deepHipRatio+(1-PLAYBACK.deepHipRatio)*stance),
    sway:PLAYBACK.sway*stance/(1+agility/PLAYBACK.bodyScale),
    chopPause:PLAYBACK.pause*practiceResidual(handUses(d,'work:chop')),
    waterTilt:PLAYBACK.tilt*practiceResidual(handUses(d,'work:water'))/(1+agility/PLAYBACK.bodyScale)};
}

export function ergonomicFrame(d, s = {}, view = {}) {
  const p = view.playback || playbackParams(d, view.art, view.timing || {});
  const strength = d?.skills?.strength || 0;
  const agility = d?.skills?.agility || 0;
  const move = view.move || p.move || 'bodyPunch';
  const residual = practiceResidual(handUses(d, move));
  const stance = practiceResidual(handUses(d, 'bodyPush'));

  // 1. Somatotype & Build Profile
  const isFatWeak = agility < 15 && strength < 15;
  const isSlenderWeak = strength < 10;
  const isMasterFit = strength >= 30 && agility >= 30;

  const shoulderDelta = isMasterFit ? 2 : (isSlenderWeak ? -2 : 0);
  const waistDelta = isFatWeak ? 4 : (isMasterFit ? -2 : 0);
  const fatRatio = isFatWeak ? Math.max(0.1, (30 - strength - agility) / 30) : 0;
  const breathRate = isFatWeak ? 1.6 : (d?.needs?.energy != null && d.needs.energy < 40 ? 1.4 : 1.0);
  const fatigue = Math.max(0, 1 - (d?.needs?.energy ?? 100) / 100);
  const sweatLevel = isFatWeak ? Math.min(1, fatigue + 0.35) : fatigue;

  const buildProfile = {
    shoulderDelta,
    waistDelta,
    fatRatio,
    breathRate,
    sweatLevel
  };

  // 2. Joint Spring Dynamics & COM Offset
  const clock = view.clock ?? s?.t ?? 0;
  const poses = view.poses || (view.frame ? view.frame.poses : null);
  const formName = view.formName || (view.frame ? view.frame.formName : null) || view.key;
  const isSingleLeg = (formName === '白鶴亮翅') ||
    (poses && (poses.includes('wing') || poses.includes('doubleUp') || poses.includes('leftKick') || poses.includes('rightKick'))) ||
    (view.key === 'wing') ||
    (view.oneLeg === true);

  const isWater = (view.work === 'water' || d?.task?.act === 'water' || view.action === 'water' || d?.task?.pose === 'water' || !!d?.carry?.water);
  const isChop = (view.work === 'chop' || d?.task?.act === 'chop' || view.action === 'chop');

  let comOffset = 0;
  if (isSingleLeg) {
    const stability = (0.25 + 0.75 * stance) / (1 + agility / 25);
    comOffset = 0.95 * stability;
  } else if (isWater) {
    const stepPhase = Math.sin(clock * 4);
    comOffset = (p.waterTilt / 30) * stepPhase * ((0.3 + 0.7 * stance) / (1 + agility / 30));
  } else {
    const baseLean = (view.lean || 0) / 10;
    comOffset = baseLean * (0.4 + 0.6 * stance) / (1 + agility / 30);
  }
  comOffset = Math.max(-1, Math.min(1, comOffset));
  const isStumbling = Math.abs(comOffset) > 0.75;

  const overshoot = residual > 0.5 || strength < 15;
  const wobblePx = residual > 0.25 ? Math.min(3.5, 3.5 * residual) : 0;
  const hitstopAlpha = residual < 0.25 ? Math.min(1, (0.25 - residual) / 0.25) : 0;

  const jointSpring = {
    overshoot,
    wobblePx,
    hitstopAlpha,
    comOffset,
    isStumbling
  };

  // 3. Labor Detail
  const strFactor = Math.max(0, Math.min(1, (strength || 10) / 40));
  const poleBend = 6 * (1 - 0.5 * strFactor);
  const isFootfall = view.isFootfall ?? (Math.abs(Math.sin(clock * 4)) >= 0.7);
  const waterSplash = isWater && (p.waterTilt > 18) && isFootfall;

  const chopResidual = practiceResidual(handUses(d, 'work:chop'));
  const isImpact = view.isImpact ?? (view.u == null || (view.u >= 0.5 && view.u <= 0.85));
  const chopOffset = isChop && chopResidual > 0.7 ? (chopResidual - 0.7) * 12 : 0;
  const isAxeStuck = isChop && (chopResidual > 0.7) && isImpact;
  const woodSplit = isChop && (chopResidual <= 0.7) && isImpact;

  const laborDetail = {
    poleBend,
    waterSplash,
    chopOffset,
    isAxeStuck,
    woodSplit
  };

  // 4. Combat Detail
  let opponent = view.opponent || null;
  if (!opponent && s && d) {
    const opps = opponents(s, d);
    if (opps && opps.length) opponent = opps[0];
  }

  // Micro shiver:
  let microShiverPx = 0;
  const contact = view.contact || null;
  const depth = view.depth ?? contact?.depth;
  const blocked = view.blocked ?? contact?.blocked ?? (d?.ring && !d.ring.intercept && s?.t && (s.t - d.ring.t < 1.5));
  const shallowOrBlocked = (blocked === true) || (depth !== undefined && depth < 0) || (contact && !contact.injured);
  if (shallowOrBlocked) {
    microShiverPx = 3.0;
  }

  // Dodge tier:
  let dodgeTier = 'sideStep';
  const L = view.L ?? (view.opponents ? view.opponents.length * 0.33 : (s ? opponents(s, d).length * 0.33 : 0));
  if (L >= 0.8) {
    dodgeTier = 'scramble';
  } else if (view.dodgeTier) {
    dodgeTier = view.dodgeTier;
  } else if (view.usedRatio !== undefined) {
    dodgeTier = view.usedRatio < 0.4 ? 'headSlip' : 'sideStep';
  } else if (opponent) {
    const foeWind = opponent?.swing?.wind || FOE_ACTIONS[opponent?.k]?.moves?.[0]?.wind || 0.45;
    const reaction = familiarReaction(d, opponent, opponent?.swing?.mv || 'bodyPunch', s?.codex || {});
    const usedRatio = reaction / (foeWind || 0.45);
    if (usedRatio < 0.4 || (agility >= 25 && familiarUses(d, opponent, opponent?.swing?.mv || 'bodyPunch', s?.codex || {}) >= 3)) {
      dodgeTier = 'headSlip';
    } else {
      dodgeTier = 'sideStep';
    }
  } else if (agility >= 25) {
    dodgeTier = 'headSlip';
  }

  const combatDetail = {
    dodgeTier,
    microShiverPx,
    opponent
  };

  return {
    buildProfile,
    jointSpring,
    laborDetail,
    combatDetail,
    playback: p
  };
}
